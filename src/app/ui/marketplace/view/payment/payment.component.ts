import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketplaceService } from '../../service/marketplace.service';
import { SubscriptionService } from '../../service/subscription.service';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { MenuService } from 'projects/hr/src/app/ui/service/menu.service';
import { MenuItemsService } from 'projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service';

declare var PaystackPop: any;

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent {
 module: any;
  selectedPlan: any;
  isYearly = false;
  email: string | null = ''
  menuitems: any[] = []
  renewOrderId: number | null = null;
  renewalAction: 'renew' | 'change-plan' | 'new' = 'new';
  renewOrder: any = null;

  constructor(private route: ActivatedRoute, private marketplaceService: MarketplaceService, private subscriptionService: SubscriptionService, private messageService: MessageService, private router: Router, private menuService: MenuItemsService,     private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const moduleId = this.route.snapshot.paramMap.get('id');
    const planId = this.route.snapshot.queryParamMap.get('plan');
    const action = this.route.snapshot.queryParamMap.get('action') as 'renew' | 'change-plan' | null;

    this.renewOrderId = this.route.snapshot.queryParamMap.get('order') ? Number(this.route.snapshot.queryParamMap.get('order')) : null;
    
    if (action === 'renew' || action === 'change-plan') {
      this.renewalAction = action;
    }

    this.email = sessionStorage.getItem('email')

    this.marketplaceService.getAppById(moduleId).subscribe({
      next: (data) => {
       this.module = data
       this.selectedPlan = this.module.subscriptionPlans.find((p: any) => p.id == planId);
          this.cdr.markForCheck();

      },
      error(err) {
        console.error(err)
      },
    })


    this.menuitems = this.menuService.getAllModules()

    if (this.renewalAction !== 'new' && this.renewOrderId) {
      this.subscriptionService.getOrderRecordById(this.renewOrderId).subscribe({
        next: (orderData: any) => {
         console.log('Order data for renewal/plan change:', orderData);
         this.renewOrder = orderData
        },
        error(err: any) {
          console.error('Error fetching order data:', err);
        },
      })
    }

  }

  selectPlan(plan: any) {
    this.selectedPlan = plan;
  }

proceedToPay() {
  if (this.renewalAction === 'renew') {
    this.processRenewal();
    return;
  }

  if (this.renewalAction === 'change-plan') {
    this.processChangePlan();
    return;
  }

  // Default: New Purchase
  this.processNewPurchase();


}

// --- 1. NEW PURCHASE LOGIC ---
processNewPurchase() {
    console.log('Paying for new subscription:', this.selectedPlan, this.isYearly ? 'Yearly' : 'Monthly');

    const amount = !this.isYearly
      ? this.selectedPlan.monthlyPrice
      : this.selectedPlan.yearlyPrice 

    const now = new Date();
    const startDate = now.toISOString();
    const endDate = this.calculateNewEndDate(now, this.isYearly);


    const order = {
      moduleId: this.module.id,
      email: this.email,
      planId: this.selectedPlan.id,
      status: "INITIATED", 
      paymentStatus: "PENDING",
      amount: amount,
      currency: "NGN",
      duration: this.isYearly ? 12 : 1,
      startDate,
      endDate
    };


    this.subscriptionService.createOrderRecord(order).subscribe({
      next: (orderResponse) => {
        console.log('New Order created:', orderResponse);

        // Create Payment record
        const paymentRef = '' + Math.floor(Math.random() * 1000000000 + 1);
        const payment = {
          orderId: orderResponse.id,
          transactionRef: paymentRef,
          status: "INITIATED",
          amount: amount
        };

        this.subscriptionService.createPaymentRecord(payment).subscribe({
          next: (paymentResponse) => {
            console.log('Payment record created:', paymentResponse);

            // Trigger Paystack
            const handler = PaystackPop.setup({
              key: 'pk_test_4bb9516e2618286cf962ee0f14e9b043b4e05f16',
              email: this.email,
              amount: amount * 100, // cause: paystack expects amount in kobo
              currency: 'NGN',
              ref: paymentRef,
              callback: (response: any) => {
                console.log('Payment complete!', response);

                const success = response.status === 'success';
                
                const updatedPayment = {
                  ...paymentResponse,
                  status: success ? 'SUCCESS' : 'FAILED'
                };

                const updatedOrder = {
                  ...orderResponse,
                  moduleId: this.module.id,
                  planId: this.selectedPlan.id,
                  status: success ? 'ACTIVE' : 'FAILED', 
                  paymentStatus: success ? 'PAID' : 'FAILED',
                  paymentId: paymentResponse.id
                }

                // Update Payment Record
                this.subscriptionService.createPaymentRecord(updatedPayment).subscribe({
                  next: (updateRes) => console.log('Payment updated:', updateRes),
                  error: (err) => console.error('Error updating payment:', err)
                });

                // Update Order Record (Final status)
                this.subscriptionService.createOrderRecord(updatedOrder).subscribe({
                  next: (updateRes) => console.log('Order updated:', updateRes),
                  error: (err) => console.error('Error updating order (new purchase final status):', err)
                });

                if(success){
                  console.log("success", success)
                 this.unlockModule()
                }else {
                 this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Payment failed!', life: 3000, key:"tf" });
                }

              },
              onClose: () => {
                // IMPORTANT: Change alert to use MessageService or a custom UI element
                console.warn('Transaction was not completed, window closed.');
                 
                // Update Order to CANCELED status
                const updatedOrder = {
                  ...orderResponse,
                  moduleId: this.module.id,
                  planId: this.selectedPlan.id,
                  status: 'CANCELED',
                  paymentStatus: 'CANCELED',
                  paymentId: paymentResponse.id
                }
              
                 this.subscriptionService.createOrderRecord(updatedOrder).subscribe({
                  next: (updateRes) => console.log('order updated:', updateRes),
                  error: (err) => console.error('Error updating order (new purchase canceled):', err)
                });

                 this.messageService.add({ severity: 'warn', summary: 'Cancelled', detail: 'Payment Canceled!', life: 3000, key: "tf" });

              }
            });

            handler.openIframe();
          },
          error: (err) => {
            console.error('Error creating payment record:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error creating order record:', err);
      }
    });
  }


  // --- 2. RENEWAL (Same Plan) LOGIC ---
  processRenewal() {
    console.log(this.renewOrder, this.selectedPlan)
    if (!this.renewOrder || this.renewOrder.plan.id != this.selectedPlan.id) {
      console.error('Renewal failed: Order not found or plan changed unexpectedly.');
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid renewal request.', life: 3000, key: "tf" });
      return;
    }

    const amount = !this.isYearly
      ? this.selectedPlan.monthlyPrice
      : this.selectedPlan.yearlyPrice 

    // The new end date should be calculated from the current order's end date (or today if it's already expired)
    const baseDate = new Date(this.renewOrder.endDate) > new Date() 
      ? this.renewOrder.endDate 
      : new Date().toISOString(); 
    
    const newEndDate = this.calculateNewEndDate(baseDate, this.isYearly);

    console.log(`Processing renewal for Order ID: ${this.renewOrder.id}. Extending end date from ${this.renewOrder.endDate} to ${newEndDate}`);
    
    //  Create PENDING Payment record linked to the EXISTING Order ID
    const paymentRef = '' + Math.floor(Math.random() * 1000000000 + 1);
    const payment = {
      orderId: this.renewOrder.id, 
      transactionRef: paymentRef,
      status: "INITIATED",
      amount: amount
    };

    this.subscriptionService.createPaymentRecord(payment).subscribe({
      next: (paymentResponse) => {
        console.log('Payment record created for renewal:', paymentResponse);

        // 2. Trigger Paystack
        const handler = PaystackPop.setup({
          key: 'pk_test_4bb9516e2618286cf962ee0f14e9b043b4e05f16',
          email: this.email,
          amount: amount * 100, 
          currency: 'NGN',
          ref: paymentRef,
          callback: (response: any) => {
            console.log('Renewal Payment complete!', response);

            const success = response.status === 'success';
            
            const updatedPayment = {
              ...paymentResponse,
              status: success ? 'SUCCESS' : 'FAILED'
            };

            // Only update the END DATE of the existing order on success
            const updatedOrder = {
              id: this.renewOrder.id, 
              moduleId: this.module.id,
              email: this.renewOrder.email,
              planId: this.renewOrder.plan.id || this.selectedPlan.id,
              amount: this.renewOrder.amount,
              currency: "NGN",
              duration: this.isYearly ? 12 : 1,
              startDate: this.renewOrder.startDate,
              endDate: success ? newEndDate : this.renewOrder.endDate, 
              status: success ? 'ACTIVE' : this.renewOrder.status, 
              paymentStatus: success ? 'PAID' : 'FAILED',
            }

            // Update Payment Record
            this.subscriptionService.createPaymentRecord(updatedPayment).subscribe({
              next: (updateRes) => console.log('Payment updated:', updateRes),
              error: (err) => console.error('Error updating payment:', err)
            });

            // Update Order Record (Date Extension)
            this.subscriptionService.createOrderRecord(updatedOrder).subscribe({
              next: (updateRes) => console.log('Order updated (Renewal):', updateRes),
              error: (err) => console.error('Error updating order (Renewal):', err)
            });

            if(success){
             this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Subscription renewed successfully!', life: 3000, key:"tf" });
             this.reUnlockModule(15)
             // No need to unlock module, it's already unlocked
             this.router.navigate(['/admin/marketplace/8612bffd-4cbe-41a7-bbb7-19c3655b121b'])
            }else {
             this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Renewal payment failed!', life: 3000, key:"tf" });
            }

          },
          onClose: () => {
             console.warn('Transaction was not completed, window closed.');
             // Do nothing to the existing subscription order if payment is canceled on close
             this.messageService.add({ severity: 'warn', summary: 'Cancelled', detail: 'Payment Canceled! Existing subscription remains.', life: 3000, key: "tf" });
          }
        });

        handler.openIframe();
      },
      error: (err) => {
        console.error('Error creating payment record for renewal:', err);
      }
    });
  }

  // --- 3. CHANGE PLAN LOGIC ---
  processChangePlan() {
    if (!this.renewOrder || this.renewOrder.planId == this.selectedPlan.id) {
      console.error('Plan Change failed: Order not found or plan is the same.');
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid plan change request.', life: 3000, key: "tf" });
      return;
    }

    const amount = !this.isYearly
      ? this.selectedPlan.monthlyPrice
      : this.selectedPlan.yearlyPrice 

    // Retire the old order (Backend update)
    const retiredOrder = {
      id: this.renewOrder.id,
      moduleId: this.module.id,
      email: this.renewOrder.email,
      planId: this.renewOrder.plan.id || this.selectedPlan.id,
      amount: this.renewOrder.amount,
      currency: "NGN",
      duration: this.isYearly ? 12 : 1,
      startDate: this.renewOrder.startDate,
      paymentStatus: this.renewOrder.paymentStatus,
      status: "EXPIRED", 
      endDate: new Date().toISOString() // Set end date to NOW
    };

    // Calculate start date for the NEW order: it starts immediately after the OLD order expires
    const newStartDate = new Date().toISOString(); 
    const newEndDate = this.calculateNewEndDate(new Date(), this.isYearly);


    // 1. Create the NEW subscription order 
    const newOrder = {
      moduleId: this.module.id,
      email: this.email,
      planId: this.selectedPlan.id,
      status: "INITIATED", 
      paymentStatus: "PENDING",
      amount: amount,
      currency: "NGN",
      duration: this.isYearly ? 12 : 1,
      startDate: newStartDate,
      endDate: newEndDate
    };

    // We chain the retirement of the old order and creation of the new one
    this.subscriptionService.createOrderRecord(retiredOrder).subscribe({
      next: (retiredRes) => {
        console.log(`Old Order ${this.renewOrder.id} retired.`);

        this.subscriptionService.createOrderRecord(newOrder).subscribe({
          next: (newOrderResponse) => {
            console.log('New Order created for plan change:', newOrderResponse);
            this.handlePaymentFlow(newOrderResponse, amount); // Proceed to payment for the NEW order
          },
          error: (err) => console.error('Error creating new order for plan change:', err)
        });
      },
      error: (err) => console.error('Error retiring old order:', err)
    });
  }

  // Helper function to handle payment flow for new purchases and plan changes
  handlePaymentFlow(orderResponse: any, amount: number) {
    console.log(orderResponse)
    // This is the same logic as your original processNewPurchase payment block
    const paymentRef = '' + Math.floor(Math.random() * 1000000000 + 1);
    const payment = {
      orderId: orderResponse.id,
      transactionRef: paymentRef,
      status: "INITIATED",
      amount: amount
    };

    console.log(this.module)

    this.subscriptionService.createPaymentRecord(payment).subscribe({
        next: (paymentResponse) => {
          console.log('Payment record created:', paymentResponse);

          const handler = PaystackPop.setup({
            key: 'pk_test_4bb9516e2618286cf962ee0f14e9b043b4e05f16',
            email: this.email,
            amount: amount * 100, 
            currency: 'NGN',
            ref: paymentRef,
            callback: (response: any) => {
              const success = response.status === 'success';
              
              const updatedPayment = { ...paymentResponse, status: success ? 'SUCCESS' : 'FAILED' };
              const updatedOrder = {
                ...orderResponse,
                moduleId: this.module.id,
                planId: this.selectedPlan.id,
                status: success ? 'ACTIVE' : 'FAILED', 
                paymentStatus: success ? 'PAID' : 'FAILED',
                paymentId: paymentResponse.id
              }

              this.subscriptionService.createPaymentRecord(updatedPayment).subscribe({ /* update payment */ });
              this.subscriptionService.createOrderRecord(updatedOrder).subscribe({ /* update order */ });

              if(success ){

                // if(this.renewalAction === 'new') {
                //   this.unlockModule()
                // } else {
                  this.messageService.add({
                    severity: 'success',
                    summary: 'Payment successful',
                    detail: `${this.module.name} has been installed successfully`,
                    key: 'tf',
                    life: 3000
                  });
              
                  this.router.navigate(['/admin/marketplace/8612bffd-4cbe-41a7-bbb7-19c3655b121b'])
                // }
              }else {
               this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Payment failed!', life: 3000, key:"tf" });
              }
            },
            onClose: () => {
               // Handle cancellation/closure
               const updatedOrder = {
                
                  ...orderResponse,
                  moduleId: this.module.id,
                  planId: this.selectedPlan.id,
                  status: 'CANCELED',
                  paymentStatus: 'CANCELED',
                  paymentId: paymentResponse.id
                }
               this.subscriptionService.createOrderRecord(updatedOrder).subscribe({ /* update order */ });
               this.messageService.add({ severity: 'warn', summary: 'Cancelled', detail: 'Payment Canceled!', life: 3000, key: "tf" });
            }
          });

          handler.openIframe();
        },
        error: (err) => console.error('Error creating payment record:', err)
    });
  }


private calculateNewEndDate(baseDate: string | Date, isYearly: boolean): string {
  const base = new Date(baseDate);
  const newDate = new Date(base);
  
  if (isYearly) {
    newDate.setFullYear(newDate.getFullYear() + 1); 
  } else {
    newDate.setMonth(newDate.getMonth() + 1);
  }

  return newDate.toISOString();
}

 async unlockModule() {
  console.log("got here - unlockModule")
  const moduleInMenu: any = this.menuitems.filter((menuItem) => menuItem.code === this.module.name)
  console.log(this.module)
  console.log(this.menuitems)

  console.log(moduleInMenu)

  const mainModule = moduleInMenu[0];
    const newApp = {
      id: 0,
      name: this.module.name,
      title: mainModule.label,
      description: this.module.description,
      shortDescription: mainModule.description
    };
  
    this.marketplaceService.registerApp(newApp).subscribe({
      next: async (data) => {
        console.log('✅ Module registered:', data);

        const rawSubmenu = mainModule.submenu || [];
        
        const registrableSubmenu = rawSubmenu.filter((item: any) => 
            item.doNotRegisterAsPermission !== true
        );
        
        const submenuApps = registrableSubmenu.map((item: any) => ({
          id: 0,
          appName: item.label,
          appCode: item.code,
          description: item.code, 
          moduleId: data.id
        }));
  
        if (submenuApps.length === 0) {
          await this.completeInstallation();
          return;
        }
  
        const submenuRequests = submenuApps.map((app: any) =>
          this.marketplaceService.registerSubApp(app)
        );
  
        forkJoin(submenuRequests).subscribe({
          next: (results) => {
            console.log('✅ All submenu apps registered:', results);
            this.completeInstallation();
          },
          error: (error) => {
            console.error('❌ Error registering submenu apps:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to install one or more submenu apps.',
              key: 'tf',
              life: 3000
            });
          }
        });
      },
      error: (err) => {
        console.log(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: "Failed to install app.",
          key: 'tf',
          life: 3000
        });
    //  this.loading = false
    //  this.visible = false

      }
    });
  }

   async reUnlockModule(id: number) {
  console.log("got here - unlockModule")
  const moduleInMenu: any = this.menuitems.filter((menuItem) => menuItem.code === this.module.name)
  console.log(this.module)
  console.log(this.menuitems)

  console.log(moduleInMenu)

  const mainModule = moduleInMenu[0];
    const app = {
      id: id,
      name: this.module.name,
      title: mainModule.label,
      description: this.module.description,
      shortDescription: mainModule.description
    };
  
    this.marketplaceService.registerApp(app).subscribe({
      next: async (data) => {
        console.log('✅ Module registered:', data);

        const rawSubmenu = mainModule.submenu || [];
        
        const registrableSubmenu = rawSubmenu.filter((item: any) => 
            item.doNotRegisterAsPermission !== true
        );
        
        const submenuApps = registrableSubmenu.map((item: any) => ({
          id: 0,
          appName: item.label,
          appCode: item.code,
          description: item.code, 
          moduleId: data.id
        }));
  
        if (submenuApps.length === 0) {
          await this.completeInstallation();
          return;
        }
  
        const submenuRequests = submenuApps.map((app: any) =>
          this.marketplaceService.registerSubApp(app)
        );
  
        forkJoin(submenuRequests).subscribe({
          next: (results) => {
            console.log('✅ All submenu apps registered:', results);
            this.completeInstallation();
          },
          error: (error) => {
            console.error('❌ Error registering submenu apps:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to install one or more submenu apps.',
              key: 'tf',
              life: 3000
            });
          }
        });
      },
      error: (err) => {
        console.log(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: "Failed to install app.",
          key: 'tf',
          life: 3000
        });
    //  this.loading = false
    //  this.visible = false

      }
    });
  }
  loadPlanLimits(){
    this.subscriptionService.restoreLimitsFromCache();

    this.subscriptionService.loadAllModulePlanLimits().subscribe({
      next: () => console.log('All module plan limits loaded'),
      error: (err) => console.error('Error loading limits', err)
    });
  }
  async completeInstallation() {
    this.loadPlanLimits()
  await this.menuService.getRegisterApps()
    this.messageService.add({
      severity: 'success',
      summary: 'Payment successful',
      detail: `${this.module.name} has been installed successfully`,
      key: 'tf',
      life: 3000
    });

    this.router.navigate(['/admin/marketplace/8612bffd-4cbe-41a7-bbb7-19c3655b121b'])
    
  }
  
}
