import { Component } from '@angular/core';
import { Navigation, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NavigationState } from '../../models/interface';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import JsBarcode from 'jsbarcode';
@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent {
  navigationState: NavigationState;
  receiptID: string = Math.floor(100000 + Math.random() * 900000).toString(); 
  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService
  ) //  private messageService: MessageService
  {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras.state as NavigationState;
    if (!this.navigationState) {
      const viewedState = localStorage.getItem('viewedState');
      if (viewedState) {
        this.navigationState = JSON.parse(viewedState);
      }
    } else {
      localStorage.setItem('viewedState', JSON.stringify(this.navigationState));
    }
  }

  reOpenCart() {
    const order = this.navigationState.order;
    const checkoutLink = this.navigationLink.getLink('checkoutLink');
    this.router.navigate([checkoutLink], { state: { order } });
  }

printReciept() {
  const printWindow = window.open('', '', 'height=500,width=800');
  
  if (printWindow) {
  const content = document.getElementById('receipt-container')?.outerHTML;

  if (content) {
    printWindow.document.write('<html><head><title>Receipt</title>');
    printWindow.document.write('<style>table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #ddd;  text-align: center; } .receipt-header {text-align: center;}</style>'); // Add basic styles for the table
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);  
    printWindow.document.write('</body></html>');
    printWindow.document.close(); 
    printWindow.print();  
  }
}
}

ngAfterViewInit() {
  JsBarcode("#barcode", this.receiptID, {
    format: "CODE128",
    displayValue: false, 
    width: 2,
    height: 40
  });
}

}
