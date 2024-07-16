import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-cash-payment',
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss'
})
export class CashPaymentComponent {
  navigationState: { cart: any; };

  constructor(
    private router: Router, 
     public navigationLink: NavigationLinksService
     ) {
  
       const navigation = this.router.getCurrentNavigation();
      this.navigationState = navigation?.extras.state as { cart: any };
      console.log(this.navigationState)
    
      }

}
