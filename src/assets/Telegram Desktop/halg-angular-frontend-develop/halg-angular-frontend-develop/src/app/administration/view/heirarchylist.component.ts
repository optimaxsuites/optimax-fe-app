import { Component, OnInit } from '@angular/core';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
import { HeirarchyData, HeirarchyDataCreate } from '../domain/heirarchy.data';
import { ManageHeirarchyService } from '../service/manage.heirarchy.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MessageService, Message } from 'primeng/api';

@Component({
  selector: 'app-heirarchylist',
  templateUrl: './heirarchylist.component.html',
  styleUrls: ['./heirarchylist.component.scss'],
  providers: [MessageService]
})
export class HeirarchylistComponent implements OnInit {
  heirarchyList: any;
  selectedHeirarchy: HeirarchyData;
  heirarchyDialog: boolean;

  constructor(private messageService: MessageService, private router: Router, private location: Location, private manageheirarchyservice: ManageHeirarchyService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Meta-data', routerLink: ['/metadatalist'] },
      { label: 'Heirarchy', routerLink: ['/heirarchylist'] }]);
  }


  ngOnInit(): void {
    this.HeirarchyList();
  }
  HeirarchyList(): void {
    this.manageheirarchyservice.getHierarchy().subscribe(data => {
      this.heirarchyList = data;
      console.log(data);
    }
    );
  }
  goToAddHeirarchy() {
    this.router.navigate(['addHeirarchy']);
  }
  goBack() {
    this.location.back();
  }
  editHeirarchy(heirarchy: HeirarchyData) {
    this.selectedHeirarchy = { ...heirarchy };
    this.heirarchyDialog = true;
  }
  updateHeirarchy() {
    this.manageheirarchyservice.createHierarchy(this.selectedHeirarchy).subscribe(
      () => {
        this.addSuccess("Success!", "Heirarchy information updated successfully.");

      },
      () => {
        this.addError("Failed!", "Heirarchy creation failed.");
        this.heirarchyDialog = false;
      });
  }

  addSuccess(title: string, message: string) {
    this.messageService.add({ severity: 'success', summary: title, detail: message });


  }
  addError(title: string, message: string) {
    this.messageService.add({ severity: 'error', summary: title, detail: message });

  }

  hideHeirarchyDialog() {
    this.heirarchyDialog = false;
  }


}
