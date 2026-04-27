import { Component } from '@angular/core';
import { TabConfig } from '../../sharedComponent/service/interface/data';
import { VendorListComponent } from '../vendor-management/vendor-list/vendor-list.component';
import { VendorApprovalComponent } from '../vendor-management/vendor-approval/vendor-approval.component';
import { ApprovedVendorComponent } from '../vendor-management/approved-vendor/approved-vendor.component';
import { RejectedVendorComponent } from '../vendor-management/rejected-vendor/rejected-vendor.component';

@Component({
  selector: 'app-vendor-page',
  templateUrl: './vendor-page.component.html',
  styleUrl: './vendor-page.component.scss'
})
export class VendorPageComponent {
  // tabsConfig: TabConfig[] = [
  // { name: 'Vendor List',  component: VendorListComponent },
  // { name: 'Pending Approval',  component: VendorApprovalComponent },
  //   { name: 'Approved Vendor',  component: ApprovedVendorComponent },
  //     { name: 'Rejected Vendor',  component: RejectedVendorComponent },
  //   // { 
  //   //   name: 'LPO', 
  //   //   component: null, 
  //   //   hasDropdown: true,
  //   //   dropdownOptions: [
  //   //     { label: 'Incoming', action: 'incoming', component: IncomingComponent},
  //   //     { label: 'Outgoing', action: 'outgoing',  component: OutgoingComponent}
  //   //   ]
  //   // },
  //   // { name: 'Proforma Invoice', component: ProformaInvoiceComponent },
  //   // { name: 'Invoice', component: InvoiceComponent },
  //   // { name: 'Dispatch Note', component: DispatchNoteComponent }
  // ];



      tabOptions = [
      { label: 'Vendor List', value: 'Vendor List' },
      { label: 'Pending Approval', value: 'Pending Approval' },
      { label: 'Approved Vendor', value: 'Approved Vendor' },
      { label: 'Rejected Vendor', value: 'Rejected Vendor' },
    ];
  
    selectedTab: string = 'Vendor List';

      onTabChange(event: Event) {
    // Update content based on selected tab
    console.log('Selected Tab: ', event);
  }
}
