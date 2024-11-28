import { Component } from '@angular/core';
import { VendorQuoteListComponent } from './vendor-quote-list/vendor-quote-list.component';
import { VendorRfqListComponent } from './vendor-rfq-list/vendor-rfq-list.component';
import { TabConfig } from '../../sharedComponent/service/interface/data';

@Component({
  selector: 'app-vendor-page',
  templateUrl: './vendor-page.component.html',
  styleUrl: './vendor-page.component.scss'
})
export class VendorPageComponent {
  tabsConfig: TabConfig[] = [
    { name: 'RFQ', component: VendorRfqListComponent },
    { name: 'Quotation', component: VendorQuoteListComponent },
    // { 
    //   name: 'LPO', 
    //   component: null, 
    //   hasDropdown: true,
    //   dropdownOptions: [
    //     { label: 'Incoming', action: 'incoming', component: IncomingComponent},
    //     { label: 'Outgoing', action: 'outgoing',  component: OutgoingComponent}
    //   ]
    // },
    // { name: 'Proforma Invoice', component: ProformaInvoiceComponent },
    // { name: 'Invoice', component: InvoiceComponent },
    // { name: 'Dispatch Note', component: DispatchNoteComponent }
  ];
}
