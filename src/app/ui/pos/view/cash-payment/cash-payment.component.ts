import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { NavigationState } from '../../models/interface';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-cash-payment',
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss',
  providers: [MessageService]
})
export class CashPaymentComponent {
  navigationState: NavigationState

  priceOptions: any[] =[]
  priceValue = 0.00
  orders: any;
  changeOffered: number = 0.00;
  changeOfferedModal: boolean = false
  constructor(
    private router: Router, 
     public navigationLink: NavigationLinksService,
     private messageService: MessageService
     ) {
  
       const navigation = this.router.getCurrentNavigation();
        this.navigationState = navigation?.extras.state as NavigationState;
        if (!this.navigationState) {
          const savedState = localStorage.getItem('navigationState');
          if (savedState) {
            this.navigationState = JSON.parse(savedState);
          }
        } else {
          localStorage.setItem('navigationState', JSON.stringify(this.navigationState));
        }
    
        this.initializePriceOptions();
        }

      initializePriceOptions() {
        this.priceOptions = [
          { label: 'Exact', value: this.navigationState?.cart?.total || 0 },
          { label: '100', value: 100 },
          { label: '200', value: 200 }
        ];
      }
      processCashPayment() {
        if(this.priceValue < this.navigationState?.cart?.total )  {
          console.log(this.priceValue)
          this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'Wrong amount tendered', key: 'tl', life: 3000 });
        } else{
          this.saveCurrentCartItem()
          const order: any[] = []
          const checkoutLink = this.navigationLink.getLink("checkoutLink")
          this.router.navigate([checkoutLink], { state: { order } });
        }       
    }

    saveCurrentCartItem() {
      const paidCart = {
        name: "fulfilled",
        cart: this.navigationState?.cart?.cartItems.map(item => ({ ...item })),
        cartDiscount: this.navigationState?.cart?.discount,
        tax: this.navigationState?.cart?.tax,
        subtotal: this.navigationState?.cart?.subtotal,
        state: 'Paid',
        total: this.navigationState?.cart?.total,
        paymentMethod: "cash",
        priceTender: this.priceValue,
        changeOffered: (this.priceValue - this.navigationState?.cart?.total),
        timestamp: new Date().toLocaleString()
      };
      const savedItems = localStorage.getItem("savedItems");
      this.orders = savedItems ? JSON.parse(savedItems) : [];
    
      this.orders.push(paidCart);
      localStorage.setItem("savedItems", JSON.stringify(this.orders));
    }
}
