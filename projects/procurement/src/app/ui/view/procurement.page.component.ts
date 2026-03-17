import { Component } from '@angular/core';
import { TabConfig } from '../sharedComponent/service/interface/data';
import { RfqComponent } from './vendor-portal/rfq/rfq.component';
import { QuotationComponent } from './quotation/quotation.component';
import { ProformaInvoiceComponent } from './proforma-invoice/proforma-invoice.component';
import { InvoiceComponent } from './invoice/invoice.component';
import { DispatchNoteComponent } from './dispatch-note/dispatch-note.component';
import { IncomingComponent } from './lpo/incoming/incoming.component';
import { OutgoingComponent } from './lpo/outgoing/outgoing.component';
import { PurchaseReqManagementComponent } from './purchase-req-management/purchase-req-management.component';
import { PrApprovalInboxComponent } from './purchase-req-management/pr-approval-inbox/pr-approval-inbox.component';
import { VendorListComponent } from './vendor-management/vendor-list/vendor-list.component';
import { VendorApprovalComponent } from './vendor-management/vendor-approval/vendor-approval.component';

@Component({
  selector: 'app-procurement.page',
  templateUrl: './procurement.page.component.html',
  styleUrl: './procurement.page.component.scss'
})
export class ProcurementPageComponent {
  tabsConfig: TabConfig[] = [


  { icon: 'pi pi-list', name: 'PR List',  component: PurchaseReqManagementComponent },
  { icon: 'pi pi-check-circle', name: 'PR Approval',  component: PrApprovalInboxComponent },





    // {
    //   name: 'LPO',
    //   component: null,
    //   hasDropdown: true,
    //   dropdownOptions: [
    //     { label: 'Incoming', action: 'incoming', component: IncomingComponent },
    //     { label: 'Outgoing', action: 'outgoing', component: OutgoingComponent }
    //   ]
    // },
    // { name: 'Proforma Invoice', component: ProformaInvoiceComponent },
    // { name: 'Invoice', component: InvoiceComponent },
    // { name: 'Dispatch Note', component: DispatchNoteComponent }
  ];
}
