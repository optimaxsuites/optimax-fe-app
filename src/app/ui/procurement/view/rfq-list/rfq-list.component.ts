import { Component, ComponentRef, ViewChild, ViewContainerRef } from '@angular/core';
import { RfqFormComponent } from '../rfq-form/rfq-form.component';
import { RfqDTO, RfqItemDTO } from '../../domain/procurement.dto';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { RfqServiceService } from '../../service/rfq-service/rfq-service.service';

@Component({
  selector: 'app-rfq-list',
  templateUrl: './rfq-list.component.html',
  styleUrl: './rfq-list.component.scss'
})
export class RfqListComponent {

  showPro1: boolean = true;
  rfqTableData: RfqDTO[] = []
  selectedItems: RfqDTO[] = [];

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

  deleteItem(item: RfqItemDTO) {
  }

  viewItem(item: RfqItemDTO) {
    console.log('View item:', item);
  }
  



  ngOnInit() {
    this.loadTableData();
  }

  loadTableData() {
    this.rfqService.getAllRfqs().subscribe((data: RfqDTO[]) => {
      this.rfqTableData = data;
    });
  }

  onRfqFormSaved() {
    // Reload the table data after the form is saved
    this.loadTableData();
  }
}
