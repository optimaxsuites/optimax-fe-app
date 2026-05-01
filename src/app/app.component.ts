import { Component, computed, HostListener, signal, ViewEncapsulation, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { MenuItemsService } from './ui/shared/service/menue-items/menu-items.service';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { firstValueFrom, lastValueFrom, Observable, BehaviorSubject } from 'rxjs';
import { CheckoutService } from 'projects/POS/src/app/ui/service/checkout.service';
import { OfflineService } from 'projects/POS/src/app/ui/service/offline.service';
import { TOUR_STEPS, TourStep } from './ui/onboarding/tour-guide';
import { AuthenticationService } from './ui/auth/service/authentication.service';
import { TenantService } from './ui/tenants/service/tenant.service';

// damilola worked on this: root app boot/login session flow adjustments around the full application shell.
declare global {
  interface Window {
    electronAPI: {
      sendMessage: (message: string) => void;
    };
  }
}

type AppView = 'dashboard' | 'marketplace' | 'sales' | string;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ERP-FE';
  sidebarVisible2 = false;
  syncInProgress = false;
  syncMessage = '';
  ellipsisInterval: any = null;
  screenWidth: number;
  isLoading = false;

  private _isOffline = new BehaviorSubject<boolean>(!navigator.onLine);
  isOffline$: Observable<boolean> = this._isOffline.asObservable();
  
  // Ensure this property exists and is initialized
  clockedInTime: string | null = null;

  currentView = signal<AppView>('dashboard');

  // Tour State
  showTour = signal(false);
  currentStep = signal(0);
  tourSteps = TOUR_STEPS;

  // Computed Properties
  currentTourStepData = computed(() => this.tourSteps[this.currentStep()]);

  // Determines the Guide's position based on the current highlighted element
  guidePosition = computed(() => {
    if (!this.showTour()) return { left: 0, top: 0 };
    const step = this.currentTourStepData();
    if (!step) return { left: 0, top: 0 };
    return this.calculateGuidePosition(step);
  });

  constructor(
    private menuItemService: MenuItemsService,
    private router: Router,
    private checkoutService: CheckoutService,
    private offlineService: OfflineService,
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute
  ) {
    // Keep a single online/offline listener. Update the BehaviorSubject so consumers can react.
    window.addEventListener('online', () => this._isOffline.next(false));
    window.addEventListener('offline', () => this._isOffline.next(true));
    
    // this.cdr.detectChanges()
    // Listen router events to show a loading indicator
    this.screenWidth = window.innerWidth;
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isLoading = true;
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.isLoading = false;
      }
    });

    // When we go online, trigger offline sync once
    window.addEventListener('online', () => this.syncOfflinePayments());

    this.router.events.subscribe(e => {
  });
  }

  // Angular lifecycle hook must be lowercase
  ngOnInit(): void {
    this.checkEligibility();
    this.checkOnboardingStatus();
   const originalNavigate = this.router.navigate.bind(this.router);
    const originalNavigateByUrl = this.router.navigateByUrl.bind(this.router);

    this.router.navigate = (commands: any[], extras?: any) => {
      console.trace('🚨 router.navigate called with:', commands, extras);
      return originalNavigate(commands, extras);
    };

    this.router.navigateByUrl = (url: any, extras?: any) => {
      console.trace('🚨 router.navigateByUrl called with:', url, extras);
      return originalNavigateByUrl(url, extras);
    };
    // this.tenantService.loadFullTenants(); 

  }

  @HostListener('window:resize', ['$event'])
  onResize(_event: Event) {
    this.screenWidth = window.innerWidth;
    // You can react to changes here
  }

  checkEligibility(){

      // Check if URL contains a token at all
      const urlParams = new URLSearchParams(window.location.search);
      console.log(window.location)
      console.log(urlParams)
      const hasToken = urlParams.has('token');
      console.log(hasToken)

      // If token exists → skip redirect and skip tenant validation
      if (hasToken) {
        console.log('Token found in URL — skipping domain check.');
        return;
      }

      const host = window.location.hostname;
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

      let tenantId = 'optimax'; 
      if (!isLocalhost) {
        const parts = host.split('.');
        tenantId = parts[0] || 'doesntexist';
      }

      console.log(tenantId);

      this.authenticationService.checkIfDomainExists(tenantId).subscribe({
        next: (data) => {
          console.log('Tenant exists:', data);
          if (!data) {
            window.location.replace('https://www.optimaxsuites.com/get-started');
          }
        },
        error: (err) => {
          console.error('Tenant does not exist or error occurred:', err);
        }
  });

  }

  sendMessage() {
    // Safe check for electronAPI
    if (typeof window !== 'undefined' && (window as any).electronAPI?.sendMessage) {
      window.electronAPI.sendMessage('Hello from Angular!');
    }
  }

  private async syncOfflinePayments() {
    console.log('🌐 You are now online, preparing to sync...');
    this.syncInProgress = true;
    this.startEllipsisAnimation('🌐 Syncing offline data');

    // small delay so UI can update
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const pendingPayments: any[] = await firstValueFrom(this.offlineService.getPendingPayments());

      if (!pendingPayments || !pendingPayments.length) {
        this.stopEllipsisAnimation('✅ Nothing to sync. All caught up!', true);
        this.syncInProgress = false;
        return;
      }

      console.log('🔄 Syncing offline payments:', pendingPayments);

      const OUT_OF_STOCK_ERROR_MESSAGE = 'Insuffient order to service your request...';

      // Iterate synchronously to keep ordering and error handling simpler
      for (const payment of pendingPayments) {
        const onlinePaymentPayload = {
          id: payment.id,
          totalAmount: payment.totalAmount,
          transactionDate: payment.transactionDate,
          status: payment.status,
        };

        // Use a promise wrapper so we can await each call sequentially
        await new Promise<void>((resolvePayment) => {
          this.checkoutService.makePayment(onlinePaymentPayload).subscribe({
            next: (paymentId: any) => {
              let breakdownCount = 0;

              if (!payment.breakdowns || !payment.breakdowns.length) {
                // If there are no breakdowns, still save the order
                payment.order.paymentId = paymentId;
                this.checkoutService.saveOrder(payment.order).subscribe({
                  next: async () => {
                    console.log('✅ Offline payment synced (no breakdowns):', payment);
                    await this.offlineService.removePendingPayment(payment.order.orderNumber);
                    resolvePayment();
                  },
                  error: async (err) => {
                    console.error('❌ Failed to save order:', err);
                    resolvePayment();
                  },
                });
                return;
              }

              for (const breakdown of payment.breakdowns) {
                breakdown.paymentId = paymentId;
                this.checkoutService.savePaymentBreakdown(breakdown).subscribe({
                  next: () => {
                    breakdownCount++;
                    if (breakdownCount === payment.breakdowns.length) {
                      payment.order.paymentId = paymentId;
                      this.checkoutService.saveOrder(payment.order).subscribe({
                        next: async () => {
                          console.log('✅ Offline payment synced:', payment);
                          await this.offlineService.removePendingPayment(payment.order.orderNumber);
                          resolvePayment();
                        },
                        error: async (err) => {
                          console.error(err);
                          const errorMessage = typeof err === 'string' ? err : err?.message || JSON.stringify(err);

                          if (errorMessage.includes(OUT_OF_STOCK_ERROR_MESSAGE)) {
                            console.warn(`⚠️ Sync failed for order ${payment.order.orderNumber}: Out of Stock conflict.`);

                            const flaggedPayment = {
                              ...payment,
                              syncFailed: true,
                              failureReason: 'One or more items were out of stock during sync. Resolve inventory before retrying.',
                              __dbKey: payment.__dbKey,
                            };

                            // Persist flagged state
                            await lastValueFrom(this.offlineService.updatePendingPayment(flaggedPayment));
                          } else {
                            console.error(`❌ Failed to sync order ${payment.order.orderNumber} due to unhandled error:`, err);
                          }

                          resolvePayment();
                        },
                      });
                    }
                  },
                  error: (err) => {
                    console.error('❌ Failed to sync payment breakdown:', err);
                  },
                });
              }
            },
            error: (err) => {
              console.error('❌ Failed to sync payment:', err);
              resolvePayment();
            },
          });
        });
      }

      this.stopEllipsisAnimation('✅ All offline payments processed (see logs).', true);
    } catch (err) {
      console.error(err);
      this.stopEllipsisAnimation('❌ Sync failed. Check logs.', true);
    } finally {
      this.syncInProgress = false;
    }
  }

  private startEllipsisAnimation(baseMessage: string) {
    let dots = 0;
    this.syncMessage = baseMessage;

    if (this.ellipsisInterval) {
      clearInterval(this.ellipsisInterval);
    }

    this.ellipsisInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      this.syncMessage = baseMessage + '.'.repeat(dots);
    }, 500);
  }

  private stopEllipsisAnimation(finalMessage: string, autoClear = false) {
    if (this.ellipsisInterval) {
      clearInterval(this.ellipsisInterval);
      this.ellipsisInterval = null;
    }
    this.syncMessage = finalMessage;

    if (autoClear) {
      setTimeout(() => {
        this.syncMessage = '';
      }, 3000);
    }
  }

  private checkOnboardingStatus(): void {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('isOnboarded') !== 'true') {
      this.showTour.set(true);
      // Give the DOM a moment to render before positioning the guide
      setTimeout(() => {
        this.currentStep.set(0);
        // guard against missing step data
        const step = this.currentTourStepData();
        if (step && step.view) {
          this.goToView(step.view as AppView);
        }
      }, 0);
    } else {
      this.showTour.set(false);
    }
  }

  goToView(view: AppView): void {
    this.currentView.set(view);
    // Recalculate position after view change by touching the computed
    setTimeout(() => {
      void this.guidePosition();
    }, 50);
  }

  nextStep(): void {
    if (this.currentStep() < this.tourSteps.length - 1) {
      this.currentStep.update((c) => c + 1);

      // Check if the new step requires navigating to a new view
      const nextView = this.currentTourStepData()?.view as AppView | undefined;
      if (nextView && nextView !== this.currentView()) {
        this.goToView(nextView);
      } else {
        // Force recalculation if staying on the same view
        setTimeout(() => void this.guidePosition(), 0);
      }
    } else {
      this.completeTour();
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((c) => c - 1);

      const prevView = this.currentTourStepData()?.view as AppView | undefined;
      if (prevView && prevView !== this.currentView()) {
        this.goToView(prevView);
      } else {
        setTimeout(() => void this.guidePosition(), 0);
      }
    }
  }

  completeTour(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('isOnboarded', 'true');
    }
    this.showTour.set(false);
    this.currentStep.set(0);
    this.goToView('dashboard'); // Return user to a default safe view
  }

  /**
   * Helper to check whether an element should be highlighted for the current step.
   * Computed signals cannot accept runtime arguments, so this is a regular method used from templates.
   */
  isElementHighlighted(elementId: string | null): boolean {
    if (!this.showTour()) return false;
    const currentStep = this.currentTourStepData();
    if (!currentStep) return false;
    return !!elementId && currentStep.elementId === elementId && currentStep.view === this.currentView();
  }

  /**
   * Calculates the position of the tour guide relative to the highlighted element.
   */
  private calculateGuidePosition(step: TourStep | undefined): { left: number; top: number } {
    if (!step || !step.elementId) return { left: 200, top: 200 };

    const targetElement = document.getElementById(step.elementId);
    if (!targetElement) return { left: 200, top: 200 }; // Fallback

    const rect = targetElement.getBoundingClientRect();
    let left = 0;
    let top = 0;

    switch (step.position) {
      case 'top-center':
        left = rect.left + rect.width / 2 - 150; // Adjust so the guide centers visually
        top = rect.top - 50;
        break;
      case 'bottom-center':
        left = rect.left + rect.width / 2 - 150;
        top = rect.bottom + 10;
        break;
      case 'top-right':
        left = rect.right + 10;
        top = rect.top + 10;
        break;
      case 'bottom-left':
        left = rect.left - 300 - 100;
        top = rect.bottom + 10;
        break;
      default:
        left = rect.left + 50;
        top = rect.top + 50;
    }
    return { left, top };
  }
}
