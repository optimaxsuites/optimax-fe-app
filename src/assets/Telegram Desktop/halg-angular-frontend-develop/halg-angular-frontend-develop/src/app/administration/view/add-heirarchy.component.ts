import { Component, OnInit } from '@angular/core';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
import { HeirarchyData } from '../domain/heirarchy.data';
import { ManageHeirarchyService } from '../service/manage.heirarchy.service';
import { HeirarchylistComponent } from '../view/heirarchylist.component';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-add-heirarchy',
  templateUrl: './add-heirarchy.component.html',
  styleUrls: ['./add-heirarchy.component.scss'],
  providers: [MessageService]
})
export class AddHeirarchyComponent implements OnInit {

  heirarchy = {} as HeirarchyData;

  constructor(private messageService: MessageService, private router: Router, private location: Location, private manageheirarchyservice: ManageHeirarchyService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'METADATA', routerLink: ['/metadatalist'] },
      { label: 'HEIRARCHY', routerLink: ['/heirarchylist'] }]);
    }

  ngOnInit(): void {
    /*if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
      this.router.navigate(['']);
    }*/
  }


  addHeirarchy() {
    this.heirarchy.created_by = +sessionStorage.getItem('userid');
    //this.heirarchy.created_date = new Date();
    this.manageheirarchyservice.createHierarchy(this.heirarchy).subscribe(
      data => {
        this.addSuccess("Success!", "Heirarchy added successfully.");
      },
      error => {
        this.addError("Failed!", "Could not add heirarchy.");
      }

    );
  }

  goBack() {
    this.location.back();
  }

  addSuccess(title: string, message: string) {
    this.messageService.add({ severity: 'success', summary: title, detail: message });


  }
  addError(title: string, message: string) {
    this.messageService.add({ severity: 'error', summary: title, detail: message });

  }

}
