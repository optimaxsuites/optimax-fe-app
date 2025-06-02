import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductData } from '../../models/interface';

@Component({
  selector: 'app-all-payments-modal',
  templateUrl: './all-payments-modal.component.html',
  styleUrl: './all-payments-modal.component.scss',
})
export class AllPaymentsModalComponent {
  @Input() isModalOpen = false;
  @Output() isModalOpenChange = new EventEmitter<typeof this.isModalOpen>();
  @Output() cashPayment = new EventEmitter<void>()
  @Input() cartItem: ProductData[] = []

  @Output() selectedPayments = new EventEmitter<string[]>(); 

  selectedPaymentsToGo: string[] = [];


  paymentOptions = [
    { label: 'Credit/Debit Card', value: 'card', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFkT4bdkUrztzXha598tvVXUllrxOXaeRGVw&s' },
    { label: 'Mobile Payment', value: 'mobile', image: 'https://png.pngtree.com/element_our/png/20181114/mobile-banking-flat-icon-png_238400.jpg'},
    { label: 'Cash', value: 'cash', image: 'https://cdn-icons-png.flaticon.com/512/1087/1087099.png' },
    { label: 'Loyalty', value: 'loyalty', image: 'https://cdn-icons-png.flaticon.com/512/1440/1440505.png' }

  ];

  ngOnInit(){
    console.log(this.cartItem)
  }
  closeModal() {
    this.isModalOpen = false;
    this.isModalOpenChange.emit(this.isModalOpen);
  }

  proceedCashPayment(){
    const transactionDetail = {
        id: 0,
        totalAmount: 0,
        transactionDate: "2025-04-23T10:22:26.213Z",
        status: "PENDING",
        order: [
          {
            id: 0,
            orderNumber: "string",
            orderStatus: "PAID",
            updatedAt: "2025-04-23T10:22:26.213Z",
            totalAmount: "52.08",
            quantity: 0,
            customerId: 0,
            branchId: 0,
            discountId: 0,
            paymentId: 0,
            cashier: 0,
            orderItems: [
              {
                id: 0,
                totalPrice: 0,
                quantity: 0,
                productId: 0,
                productVariantId: 0,
                orderId: 0
              }
            ]
          }
        ],
        paymentBreakdown: [
          {
            id: 0,
            amountPaid: 0,
            transactionRefernce: "string",
            paymentId: 0
          }
  ]
    }
    this.cashPayment.emit()
  }

  togglePayment(paymentType: string) {
    if (this.selectedPaymentsToGo.includes(paymentType)) {
      this.selectedPaymentsToGo = this.selectedPaymentsToGo.filter(p => p !== paymentType);
    } else {
      this.selectedPaymentsToGo.push(paymentType);
    }
  }

  confirmPayment() {
    if(this.selectedPaymentsToGo.length === 0){
      return
    }

    this.selectedPayments.emit(this.selectedPaymentsToGo); 
    this.closeModal; 
  }

}


// {
//   "id": 0,
//   "totalAmount": 0,
//   "transactionDate": "2025-04-23T10:22:26.213Z",
//   "status": "PENDING",
//   "order": [
//     {
//       "id": 0,
//       "orderNumber": "string",
//       "orderStatus": "PAID",
//       "updatedAt": "2025-04-23T10:22:26.213Z",
//       "totalAmount": "52.08",
//       "quantity": 0,
//       "customerId": 0,
//       "branchId": 0,
//       "discountId": 0,
//       "paymentId": 0,
//       "cashier": 0,
//       "orderItems": [
//         {
//           "id": 0,
//           "totalPrice": 0,
//           "quantity": 0,
//           "productId": 0,
//           "productVariantId": 0,
//           "orderId": 0
//         }
//       ]
//     }
//   ],
//   "paymentBreakdown": [
//     {
//       "id": 0,
//       "amountPaid": 0,
//       "transactionRefernce": "string",
//       "paymentId": 0
//     }
//   ]
// }

// {
//   "id": 208,
//   "name": "Chicken Penne Vodka Pasta",
//   "code": "penne7768",
//   "description": "Chicken Penne Vodka Pasta",
//   "sku": "j5ny-34462",
//   "weight": 45,
//   "purchasePrice": "56777.00",
//   "sellingPrice": "76555.00",
//   "createdDate": [
//     2025,
//     4,
//     18,
//     7,
//     21,
//     45,
//     469000000
//   ],
//   "createdBy": "ayaobasheba",
//   "partNumber": "penne",
//   "quantity": 67,
//   "reorderThreshold": 45,
//   "measurementUnit": "BOX",
//   "discount": {
//     "id": 4,
//     "name": "Black Friday",
//     "value": 50,
//     "startDate": null,
//     "endDate": null,
//     "minQuantity": null,
//     "discountType": null
//   },
//   "productCategory": {
//     "id": 20,
//     "name": "Main meal",
//     "code": "main meal",
//     "description": "the primary dishes of the restaurant."
//   },
//   "productImages": [
//     {
//       "id": 156,
//       "name": "penne-pasta-600x600.webp",
//       "imgNo": "d436DFX5PB5"
//     }
//   ],
//   "variants": [],
//   "supplier": {
//     "id": 4,
//     "name": "Fanta",
//     "contactPerson": "Frank",
//     "phoneNumber": "08056564545",
//     "email": "fanta@fanta.com",
//     "address": "789, fanta street"
//   },
//   "tax": {
//     "id": 1,
//     "name": "Federal tax",
//     "rate": 5
//   },
//   "branch": {
//     "id": 1,
//     "name": "headquarters",
//     "description": "headquarters",
//     "address": "headquater",
//     "phoneNo": 8167565345
//   },
//   "bundleItems": null,
//   "isBundle": false,
//   "imageUrl$": "blob:http://localhost:4200/82d8b54f-90e5-4f06-8007-9d23bc9a047f",
//   "count": 3,
//   "cartPriceTotal": "229665",
//   "selectedVariants": []
// }