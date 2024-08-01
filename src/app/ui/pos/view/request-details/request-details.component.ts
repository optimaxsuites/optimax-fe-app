import { Component } from '@angular/core';
import {  Refund, SelectedRequest, } from '../../models/interface';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-request-details',
  templateUrl: './request-details.component.html',
  styleUrl: './request-details.component.scss'
})
export class RequestDetailsComponent {
  navigationState: SelectedRequest;
  constructor(
    private router: Router, 
     public navigationLink: NavigationLinksService,
     ) {
  
       const navigation = this.router.getCurrentNavigation();
        this.navigationState = navigation?.extras.state as SelectedRequest;
        if (this.navigationState) {
          const refundRequests = JSON.parse(localStorage.getItem('refundRequests') || '[]');
          const viewedRequest = refundRequests.find((item: any) => item.orderId === this.navigationState.selectedRequest.orderId);
          if (viewedRequest) {
            this.navigationState = viewedRequest;
          }
        } 
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
