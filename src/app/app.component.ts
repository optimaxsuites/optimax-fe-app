import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { MenuItemsService } from './ui/shared/service/menue-items/menu-items.service';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import { CheckoutService } from 'projects/POS/src/app/ui/service/checkout.service';
import { OfflineService } from 'projects/POS/src/app/ui/service/offline.service';

declare global {
  interface Window {
  electronAPI: {
  sendMessage:
    (message : string) => void;
  }
  }
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./app.component.scss']
})


export class AppComponent {
  sendMessage() { window.electronAPI.sendMessage("Hello from Angular!"); }
  title = 'ERP-FE';
  sidebarVisible2: boolean = false;
  syncInProgress = false; 
  screenWidth: number;
  isLoading = false
    private _isOffline = new BehaviorSubject<boolean>(!navigator.onLine);
    isOffline$: Observable<boolean> = this._isOffline.asObservable();

  // Ensure this property exists and is initialized
  clockedInTime: string | null = null;

  constructor(private menuItemService: MenuItemsService, private router: Router, private checkoutService: CheckoutService, private offlineService: OfflineService) {
    window.addEventListener('online', () => this._isOffline.next(false));
    window.addEventListener('offline', () => this._isOffline.next(true));
    this.screenWidth = window.innerWidth;
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isLoading = true;
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.isLoading = false;
      }
    });
    window.addEventListener("online", () => this.syncOfflinePayments())

  }

  

  NgOnInit(){
    // this.menuItemService.loadUnlockedModules()
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = window.innerWidth;
    console.log('Screen width:', this.screenWidth);
    // Apply logic based on screen width
  }

  private async syncOfflinePayments() {
    console.log("🌐 You are now online, preparing to sync...");
    this.syncInProgress = true;
  
    await new Promise((resolve) => setTimeout(resolve, 3000));
  
    const pendingPayments = await firstValueFrom(this.offlineService.getPendingPayments());
    if (!pendingPayments.length) return;
  
    console.log("🔄 Syncing offline payments:", pendingPayments);

    const OUT_OF_STOCK_ERROR_MESSAGE = "Insuffient order to service your request..."; 
  
    for (const payment of pendingPayments) {
      const now = new Date().toISOString();
      const onlinePaymentPayload = {
        id: payment.id,
        totalAmount: payment.totalAmount,
        transactionDate: payment.transactionDate,
        status: payment.status,
      };
  
      this.checkoutService.makePayment(onlinePaymentPayload).subscribe({
        next: (paymentId) => {
          let breakdownCount = 0;
  
          for (const breakdown of payment.breakdowns) {
            breakdown.paymentId = paymentId;
            this.checkoutService.savePaymentBreakdown(breakdown).subscribe({
              next: () => {
                breakdownCount++;
                if (breakdownCount === payment.breakdowns.length) {
                  payment.order.paymentId = paymentId;
                  this.checkoutService.saveOrder(payment.order).subscribe({
                    next: async () => {
                      console.log("✅ Offline payment synced:", payment);
  
                      await this.offlineService.removePendingPayment(payment.__dbKey);
  
                     
                    },
                    error: async (err) => {
                      console.log(err)
                                        // **ERROR PATH: Check for Out-of-Stock Failure**
                                        const errorMessage = typeof err === 'string' ? err : err.message || JSON.stringify(err);

                                        if (errorMessage.includes(OUT_OF_STOCK_ERROR_MESSAGE)) {
                                            console.warn(`⚠️ Sync failed for order ${payment.order.orderNumber}: Out of Stock conflict. Flagging for manual resync.`);
                                            
                                            // Flag the local record for manual inspection/resync
                                            const flaggedPayment = {
                                                ...payment,
                                                syncFailed: true,
                                                failureReason: `One or more items were out of stock during sync. Resolve inventory before retrying.`,
                                                // Include the primary key to ensure the update hits the right record
                                                __dbKey: payment.__dbKey 
                                            };
                                            
                                            // Use update to save the flagged state and keep the record
                                            await lastValueFrom(this.offlineService.updatePendingPayment(flaggedPayment)); 
                                            
                                        } else {
                                            console.error(`❌ Failed to sync order ${payment.order.orderNumber} due to unhandled error:`, err);
                                        }
                                    },
                  });
                }
              },
              error: (err) =>
                console.error("❌ Failed to sync payment breakdown:", err),
            });
          }
        },
        error: (err) => console.error("❌ Failed to sync payment:", err),
      });
    }

    this.syncInProgress = false;

  
    // this.offlineService.clearPendingPayments()
  }

  // This method should correctly capture the event emitted by ClockInClockOutComponent
  // onClockInTime(time: string | null) {
  //   console.log("Received clock-in time:", time);
  //   this.clockedInTime = time; // Assign the emitted clock-in time
  // }
}
