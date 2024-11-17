import { Component } from '@angular/core';
import { RfqServiceService } from '../../service/rfq-service/rfq-service.service';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-rfq-category-list',
  templateUrl: './rfq-category-list.component.html',
  styleUrl: './rfq-category-list.component.scss'
})
export class RfqCategoryListComponent {
  rfqCategoryData: any[] = [];
  rfqCategoryInfo: any = {}
  selectedItems: any[] = [];

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

  addCategory: boolean = false;
  createCategory() {

    this.addCategory = !this.addCategory;
    // const rfqFormLink = this.navigationLink.getLink('rfqFormLink')
    // this.router.navigate([rfqFormLink]);
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
  



  ngOnInit() {
    this.loadTableData();
  }

  loadTableData() {
    this.rfqService.getAllRfqs().subscribe((data: any[]) => {
      this.rfqCategoryData = data;
    });
  }

  onRfqFormSaved() {
    // Reload the table data after the form is saved
    this.loadTableData();
  }
}
