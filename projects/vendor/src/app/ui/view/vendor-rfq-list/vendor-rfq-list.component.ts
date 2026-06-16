import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
// import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { RfqServiceService } from '../../service/rfq-service/rfq-service.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-vendor-rfq-list',
  templateUrl: './vendor-rfq-list.component.html',
  styleUrl: './vendor-rfq-list.component.scss'
})
export class VendorRfqListComponent {
  showPro1: boolean = true;
  // rfqTableData: any[] = []
  rfqTableData = [
    {
      id: 1,
      qNo: 'RFQ-001',
      projectTitle: 'Building Construction',
      qDate: '2024-09-01',
      qDueDate: '2024-09-10',
      preparedBy: 'John Doe',
      status: 'Pending',
      items:[
        {
          name: 'Laptop',
          partNo: 'LPT-001',
          unit: 2,
          serialNo: 'SN-12345',
          amount: 250000,
          taxRate: 7.5,
          tax: 18750,
          total: 268750,
          des: 'High-performance laptop for business use'
        },
        {
          name: 'Office Chair',
          partNo: 'CH-002',
          unit: 5,
          serialNo: 'SN-54321',
          amount: 15000,
          taxRate: 7.5,
          tax: 1125,
          total: 16125,
          des: 'Ergonomic office chair with adjustable height'
        },
      ]
    },
    {
      id: 2,
      qNo: 'RFQ-002',
      projectTitle: 'Road Maintenance',
      qDate: '2024-09-05',
      qDueDate: '2024-09-15',
      preparedBy: 'Jane Smith',
      status: 'Approved',
      items:[
        {
          name: 'Projector',
          partNo: 'PRJ-003',
          unit: 1,
          serialNo: 'SN-98765',
          amount: 120000,
          taxRate: 7.5,
          tax: 9000,
          total: 129000,
          des: 'HD projector for conference rooms'
        },
        {
          name: 'Printer',
          partNo: 'PRT-004',
          unit: 3,
          serialNo: 'SN-24680',
          amount: 45000,
          taxRate: 7.5,
          tax: 3375,
          total: 48375,
          des: 'Laser printer with automatic duplex printing'
        }
      ]
    },
    {
      id: 3,
      qNo: 'RFQ-003',
      projectTitle: 'Bridge Design',
      qDate: '2024-09-07',
      qDueDate: '2024-09-20',
      preparedBy: 'Michael Johnson',
      status: 'Rejected',
      items: [
        {
          name: 'Conference Table',
          partNo: 'TB-005',
          unit: 1,
          serialNo: 'SN-13579',
          amount: 80000,
          taxRate: 7.5,
          tax: 6000,
          total: 86000,
          des: 'Large conference table seating 10 people'
        }
      ]
    }
  ];
  selectedItems: any[] = [];

  selectedRfq: any = null;


  constructor (
    private router: Router,
    private navigationLink: NavigationLinksService,
    private rfqService: RfqServiceService
  ){}

  getSeverity(status: string) {
    switch (status) {
        case "active":
            return "success";
        case "pending":
            return "warning";
        case "inactive":
            return "danger";
        default:
            return undefined; // or another default value
    }
  }

  addRfq() {
    const rfqFormLink = this.navigationLink.getLink('rfqFormLink')
    this.router.navigate([rfqFormLink]);
  }

  editRfq(id: string) {
    const rfqFormLink = this.navigationLink.getLink('rfqFormLink');
    this.router.navigate([`${rfqFormLink}/${id}`]);
  }

  deleteItem(item: any) {
  }

  viewItem(item: any) {
    console.log('View item:', item);
  }

  // showMenu(event: Event, item: any, overlayPanel: OverlayPanel) {
  //   const target = event.target as HTMLElement;
    
  //   if (target) {
  //     overlayPanel.toggle(event);
  //   }
  // }

  editItem(item: any) {
    console.log('Editing item:', item);
    // Implement edit logic
  }

  duplicateItem(item: any) {
    console.log('Duplicating item:', item);
    // Implement duplicate logic
  }

  archiveItem(item: any) {
    console.log('Archiving item:', item);
    // Implement archive logic
  }



showForm: boolean = false;
tableShow: boolean = true;
  show(item: any){
    this.showForm = true;
    this.tableShow = false
    this.selectedRfq = item;
    console.log('Convert to quote item:', item);
  }

  btnBack(){
    this.showForm = false;
    this.tableShow = true
  }
}
