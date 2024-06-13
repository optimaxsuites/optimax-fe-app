import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { UserData, UserInformation } from '../domain/users.data';
import {ManageUsersService} from '../service/manage.users.service';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ImplementingPartnersData } from '../domain/implementing-partners.data';
import { UserRoleData } from '../domain/user.role.data';
import { MetadataConfigService } from '../../administration/service/metadata-config.service';

import {MessageService} from 'primeng/api';


@Component({
  selector: 'app-userlist',
  templateUrl: './userlist.component.html',
  styleUrls: ['./userlist.component.scss'],
  providers: [MessageService]
})
export class UserlistComponent implements OnInit {

  userRoleMap: UserRoleData[];
  selectedUserRole: UserRoleData;

  implementingPartnersMap: ImplementingPartnersData[];
  selectedImplementingPartners: ImplementingPartnersData;

  userList:any;
  userInformation: any;
  selectedUser: UserData;
  selectedUserInfo: UserInformation;
  userDialog: boolean;


  constructor(private messageService: MessageService,private router: Router,private location: Location,
    private metadataConfigService: MetadataConfigService, private manageuserService:ManageUsersService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Access Control Management', routerLink: ['/setting'] },
      { label: 'Add User', routerLink: ['/userlist'] }    ]);
   }

  ngOnInit() {
    this.UserList();
    this.loadConfigMetadata();



  }


  protected loadConfigMetadata(){

    this.metadataConfigService.getUserRoleList().subscribe(p => {this.userRoleMap = p});
     this.metadataConfigService.getImplementingPartnersList().subscribe(p => {this.implementingPartnersMap = p});

  }



  UserList():void{
    this.manageuserService.getUsers().subscribe(data => {
      this.userList = data;
      console.log("user data is:", this.userList)
    }
    );
    }

    goToAddUser(){
      this.router.navigate(['addUser']);
    }
    goBack(){
      this.location.back();
    }

    editUser(user: UserData){
     this.selectedUser = {...user};
     this.userDialog=true;
    }
    updateUser(){
      console.log(JSON.stringify(this.selectedUser));
      this.manageuserService.createUpdateUser(this.selectedUser).subscribe(
        () => {
          this.addSuccess("Success!","User information updated successfully.");
          this.UserList();
          this.userDialog = false;
      },
      () => {
        this.addError("Failed!","Could not update user information.");
        this.userDialog = false;
      });

    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideUserDialog(){
      this.userDialog = false;
    }
}
