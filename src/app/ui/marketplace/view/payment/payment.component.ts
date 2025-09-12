import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MarketplaceService } from '../../service/marketplace.service';

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

  constructor(private route: ActivatedRoute, private marketplaceService: MarketplaceService) {}

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



  }

  selectPlan(plan: any) {
    this.selectedPlan = plan;
  }

  proceedToPay() {
    console.log('Paying for:', this.selectedPlan, this.isYearly ? 'Yearly' : 'Monthly');

    const amount = !this.isYearly
      ? this.selectedPlan.price
      : this.selectedPlan.price * 11;

      console.log(amount)
      console.log(      'email', this.email)


    const handler = PaystackPop.setup({
      key: 'pk_test_4bb9516e2618286cf962ee0f14e9b043b4e05f16',
      email: this.email,
      amount: parseInt(amount) * 100, 
      currency: 'NGN',
      ref: '' + Math.floor(Math.random() * 1000000000 + 1),
      callback: (response: any) => {
        console.log('Payment complete!', response);
      // this.router.navigate(['/activation']);

      },
      onClose: () => {
        alert('Transaction was not completed, window closed.');
      }
    });

    handler.openIframe();
  }

  
}
