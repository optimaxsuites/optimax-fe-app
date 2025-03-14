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
  const content = document.getElementById('receipt-container')?.outerHTML;
  
  if (content) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
        <head>
          <title>Receipt</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
              #receipt-container { width: 100%; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
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
