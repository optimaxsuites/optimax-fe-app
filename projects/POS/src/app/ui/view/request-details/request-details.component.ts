import { Component, OnInit } from '@angular/core';
import {  CustomerDTO, Refund, SelectedRequest, } from '../../models/interface';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { OrderService } from '../../service/order.service';
import { PosServiceService } from '../../service/pos-service.service';
import { CustomerService } from '../../service/customer.service';

@Component({
  selector: 'app-request-details',
  templateUrl: './request-details.component.html',
  styleUrl: './request-details.component.scss'
})
export class RequestDetailsComponent{
  navigationState: SelectedRequest;
  customer: CustomerDTO = {} as CustomerDTO
  constructor(
    private router: Router, 
     public navigationLink: NavigationLinksService,
     private customerService: CustomerService
     ) {
  
      const navigation = this.router.getCurrentNavigation();
      this.navigationState = navigation?.extras.state as SelectedRequest;
     console.log(this.navigationState)
    
      if (this.navigationState) {
    
          this.navigationState = this.navigationState.selectedRequest
        
     console.log(this.navigationState)
        }

}

ngOnInit(){
this.customerService.getCustomerById(this.navigationState.royaltyAccountId).subscribe({
 next: (value) => {
  this.customer = value;

 }
})
}

        calculateTotalAmount() {
          let totalAmount = 0;
        
          this.navigationState.selectedItems.forEach((item: any) => {
            let finalPrice = item.cartPriceTotal;
        
            if (item.discount !== "0" ) {
              finalPrice -= item.discountValue;
            } 
        
            totalAmount += finalPrice;
          });
          return totalAmount;
        }

}
