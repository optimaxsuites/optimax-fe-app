import { Component } from '@angular/core';
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

  constructor(private route: ActivatedRoute, private marketplaceService: MarketplaceService, private subscriptionService: SubscriptionService, private messageService: MessageService, private router: Router, private menuService: MenuItemsService) {}

  ngOnInit() {
    const moduleId = this.route.snapshot.paramMap.get('id');
    const planId = this.route.snapshot.queryParamMap.get('plan');

    this.email = sessionStorage.getItem('email')

    this.marketplaceService.getAppById(moduleId).subscribe({
      next: (data) => {
       this.module = data
       this.selectedPlan = this.module.subscriptionPlans.find((p: any) => p.id == planId);

      },
      error(err) {
        console.error(err)
      },
    })


    this.menuService.getAllModules()

  }

  selectPlan(plan: any) {
    this.selectedPlan = plan;
  }

proceedToPay() {
  console.log('Paying for:', this.selectedPlan, this.isYearly ? 'Yearly' : 'Monthly');

  const amount = !this.isYearly
    ? this.selectedPlan.monthlyPrice
    : this.selectedPlan.yearlyPrice 

  const order = {
    moduleId: this.module.id,
    email: this.email,
    planId: this.selectedPlan.id,
    status: "ACTIVE",
    paymentStatus: "PENDING",
    amount: amount,
    currency: "NGN",
    // paymentId: 0,
    duration: this.isYearly ? 12 : 1
  };


  this.subscriptionService.createOrderRecord(order).subscribe({
    next: (orderResponse) => {
      console.log('Order created:', orderResponse);

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

              const updatedPayment = {
                ...paymentResponse,
                status: response.status === 'success' ? 'SUCCESS' : 'FAILED'
              };

              const updatedOrder = {
                ...orderResponse,
                status: response.status === 'success' ? 'PAID' : 'FAILED',
                paymentId: paymentResponse.id
              }

              this.subscriptionService.createPaymentRecord(updatedPayment).subscribe({
                next: (updateRes) => console.log('Payment updated:', updateRes),
                error: (err) => console.error('Error updating payment:', err)
              });

              this.subscriptionService.createOrderRecord(updatedOrder).subscribe({
                next: (updateRes) => console.log('order updated:', updateRes),
                error: (err) => console.error('Error updating payment:', err)
              });

              if(response.status === 'success'){
              //  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Payment successful!', life: 3000, key:"tf" });
               this.unlockModule()

              }else {
               this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Payment failed!', life: 3000, key:"tf" });
              }

            },
            onClose: () => {
              alert('Transaction was not completed, window closed.');
               const updatedOrder = {
                ...orderResponse,
                status: 'CANCELED',
                paymentId: paymentResponse.id
              }
            

               this.subscriptionService.createOrderRecord(updatedOrder).subscribe({
                next: (updateRes) => console.log('order updated:', updateRes),
                error: (err) => console.error('Error updating payment:', err)
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


 async unlockModule() {
  const moduleInMenu: any = this.menuitems.filter((menuItem) => menuItem.code !== this.module.name)
    const newApp = {
      id: 0,
      name: this.module.name,
      title: moduleInMenu.label,
      description: this.module.description,
      shortDescription: moduleInMenu.description
    };
  
    this.marketplaceService.registerApp(newApp).subscribe({
      next: async (data) => {
        console.log('✅ Module registered:', data);
  
        const submenuApps = (moduleInMenu.submenu || []).map((item: any) => ({
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

  async completeInstallation() {
  await this.menuService.getRegisterApps()
    this.messageService.add({
      severity: 'success',
      summary: 'Payment successful',
      detail: `${this.module.label} has been installed successfully`,
      key: 'tf',
      life: 3000
    });

    this.router.navigate(['/admin/marketplace/8612bffd-4cbe-41a7-bbb7-19c3655b121b'])
    
  }
  
}
