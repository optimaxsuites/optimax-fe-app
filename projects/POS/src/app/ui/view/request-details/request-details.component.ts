import { Component, OnInit } from '@angular/core';
import { CustomerDTO, Refund, SelectedRequest } from '../../models/interface';
import { Router, ActivatedRoute } from '@angular/router';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { CustomerService } from '../../service/customer.service';
import { PosServiceService } from '../../service/pos-service.service';
import { forkJoin, of } from 'rxjs';
import { Location } from '@angular/common';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-request-details',
  templateUrl: './request-details.component.html',
  styleUrl: './request-details.component.scss'
})
export class RequestDetailsComponent implements OnInit {
  navigationState: any;
  customer: CustomerDTO = {} as CustomerDTO;
  enrichedReturnItems: any[] = [];
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public navigationLink: NavigationLinksService,
    private customerService: CustomerService,
    private posService: PosServiceService,
    private location: Location
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras.state as any;
    
    if (this.navigationState && this.navigationState.selectedRequest) {
      this.navigationState = this.navigationState.selectedRequest;
    }
  }

  ngOnInit() {
    console.log('Current navigation state:', this.navigationState);
    this.loadCustomerData();
    this.loadProductDetails();
  }

  goBack() {
     this.location.back();

  }

  loadCustomerData() {
    if (this.navigationState) {
      this.customer = {
        name: this.navigationState.name || this.navigationState.customerName || 'N/A',
        email: this.navigationState.email || this.navigationState.emailAddress || 'N/A',
        phoneNumber: this.navigationState.phoneNumber || 'N/A'
      } as CustomerDTO;
    }

    if (this.navigationState?.royaltyAccountId) {
      this.customerService.getCustomerById(this.navigationState.royaltyAccountId).subscribe({
        next: (value) => {
          if (value) {
            this.customer = value;
          }
        },
        error: (err) => {
          console.error('Error fetching customer:', err);
        }
      });
    }
  }

  loadProductDetails() {
    if (!this.navigationState?.returnItems || !Array.isArray(this.navigationState.returnItems)) {
      this.enrichedReturnItems = [];
      return;
    }

    // Create observables to fetch product details for each return item
    const productRequests = this.navigationState.returnItems.map((returnItem: any) => {
      if (!returnItem.productId) {
        return of({
          ...returnItem,
          product: null,
          productVariant: null
        });
      }

      return this.posService.getProductById(returnItem.productId).pipe(
        map((product: any) => {
          // Find the specific variant if variantId exists
          let productVariant = null;
          if (returnItem.variantId && product.productVariants) {
            productVariant = product.productVariants.find(
              (variant: any) => variant.id === returnItem.variantId
            );
          }

          return {
            ...returnItem,
            product: product,
            productVariant: productVariant
          };
        }),
        catchError((error) => {
          console.error(`Error fetching product ${returnItem.productId}:`, error);
          return of({
            ...returnItem,
            product: null,
            productVariant: null
          });
        })
      );
    });

   
   forkJoin(productRequests).subscribe({
  next: (enrichedItems) => {
    this.enrichedReturnItems = enrichedItems as any[];
    console.log('Enriched return items:', this.enrichedReturnItems);
  },
  error: (error) => {
    console.error('Error loading product details:', error);
    this.enrichedReturnItems = this.navigationState.returnItems || [];
  }
});
  }

  formatDate(dateInput: any): string {
    if (!dateInput) return 'N/A';
    
    let date: Date;
    
    if (Array.isArray(dateInput) && dateInput.length >= 3) {
      const [year, month, day, hour, minute, second] = dateInput;
      date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    } 
    else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      date = new Date(dateInput);
    } 
    else if (dateInput instanceof Date) {
      date = dateInput;
    } 
    else {
      return 'N/A';
    }
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return date.toLocaleString();
  }

  getOrderDate(): string {
    const possibleDateFields = [
      this.navigationState?.createdAt,
      this.navigationState?.timestamp,
      this.navigationState?.orderDate,
      this.navigationState?.requestDate,
      this.navigationState?.date,
      this.navigationState?.order?.createdDate
    ];

    for (const dateField of possibleDateFields) {
      if (dateField) {
        const formatted = this.formatDate(dateField);
        if (formatted !== 'N/A') {
          return formatted;
        }
      }
    }
    
    return 'N/A';
  }

  getRefundStatus(): string {
    return this.navigationState?.refundStatus || 
           this.navigationState?.status || 
           'Pending';
  }

  getReason(): string {
    return this.navigationState?.reason || 
           this.navigationState?.refundReason || 
           'N/A';
  }

  getCashierComment(): string {
    return this.navigationState?.cashierComment || 
           this.navigationState?.comment || 
           'No comment provided';
  }

  getReturnItems(): any[] {
    return this.enrichedReturnItems;
  }

  getTotalRefundableAmount(): number {
    if (this.navigationState?.refundableAmount !== undefined) {
      return parseFloat(this.navigationState.refundableAmount) || 0;
    }

    // Calculate from enriched return items
    return this.enrichedReturnItems.reduce((total: number, item: any) => {
      return total + (parseFloat(item.totalPricePaid) || 0);
    }, 0);
  }

  getItemName(item: any): string {
    if (item?.product?.name) {
      return item.product.name;
    }
    
    if (item?.productId) {
      return `Product ID: ${item.productId}`;
    }
    
    return 'Unknown Product';
  }

  getItemNameWithVariant(item: any): string {
    const baseName = this.getItemName(item);
    
    if (item?.productVariant?.name) {
      return `${baseName} - ${item.productVariant.name}`;
    }
    
    return baseName;
  }

  getItemPrice(item: any): number {
    // Check variant price first (variants override base product price)
    if (item?.productVariant?.price !== undefined) {
      return parseFloat(item.productVariant.price) || 0;
    }
    
    // Then check product selling price
    if (item?.product?.sellingPrice !== undefined) {
      return parseFloat(item.product.sellingPrice) || 0;
    }
    
    // Calculate from total if available
    if (item?.totalPricePaid !== undefined && item?.quantity > 0) {
      return parseFloat(item.totalPricePaid) / item.quantity;
    }
    
    return 0;
  }

  getItemQuantity(item: any): number {
    return parseInt(item?.quantity) || 0;
  }

  getItemDiscount(item: any): number {
    // For now, return 0 since discount info isn't in the API response
    // You might need to calculate this based on the difference between
    // original price and actual paid price if that data becomes available
    return 0;
  }

  getItemTotal(item: any): number {
    // Use the actual amount paid for this item
    if (item?.totalPricePaid !== undefined) {
      return parseFloat(item.totalPricePaid) || 0;
    }
    
    // Fallback calculation
    const price = this.getItemPrice(item);
    const quantity = this.getItemQuantity(item);
    const discount = this.getItemDiscount(item);
    
    return Math.max(0, (price * quantity) - discount);
  }
}