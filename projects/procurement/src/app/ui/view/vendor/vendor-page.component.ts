import { Component } from '@angular/core';
import { TabConfig } from '../../sharedComponent/service/interface/data';
import { VendorListComponent } from '../vendor-management/vendor-list/vendor-list.component';
import { VendorApprovalComponent } from '../vendor-management/vendor-approval/vendor-approval.component';

@Component({
  selector: 'app-vendor-page',
  templateUrl: './vendor-page.component.html',
  styleUrl: './vendor-page.component.scss'
})
export class VendorPageComponent {
  tabsConfig: TabConfig[] = [
  { name: 'Vendor List',  component: VendorListComponent },
  { name: 'Vendor Approval',  component: VendorApprovalComponent },
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
