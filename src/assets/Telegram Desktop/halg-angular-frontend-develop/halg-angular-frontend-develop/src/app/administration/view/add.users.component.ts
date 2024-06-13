import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { UserData, UserInformation } from '../domain/users.data';
import {ManageUsersService} from '../service/manage.users.service';
import { UserRoleData } from '../domain/user.role.data';
import { HeirarchyUnitsData } from '../../administration/domain/heirarchyunits.data';
import { ImplementingPartnersData } from '../domain/implementing-partners.data';


import { Location } from '@angular/common';
import {MessageService, TreeNode } from 'primeng/api';
import {SelectItem} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MetadataConfigService } from '../../administration/service/metadata-config.service';
import { ClientPortalService } from 'src/app/client/service/client.portal.service';




@Component({
  selector: 'app-manage-users',
  templateUrl: './add.users.component.html',
  styleUrls:['./add.users.component.scss'],
  providers: [MessageService]
})
export class ManageUsersComponent implements OnInit {

  userRoleMap: UserRoleData[];
  selectedUserRole: UserRoleData;

  implementingPartnersMap: ImplementingPartnersData[];
  selectedImplementingPartners: ImplementingPartnersData;

  userInformation = {} as any;
  usercreatedata = {} as UserData;
  userinfodata = {} as UserInformation;
  userStatus: string;

  userDevice: SelectItem[];
  selectedRoles: SelectItem[];

  heirarchyunitsMap: HeirarchyUnitsData[]=[];
  heirarchyunitsTree:any[];
  selectedHeirarchyUnit: HeirarchyUnitsData;
  loading: boolean = false;
  dest: string='';


  constructor(private router: Router,private messageService: MessageService,private location: Location,private manageuserService:ManageUsersService,
    private metadataConfigService: MetadataConfigService,
    private clientPortalService: ClientPortalService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Access Control Management', routerLink: ['/setting'] },
      { label: 'Add User', routerLink: ['/addUser'] }    ]);

  }

  ngOnInit() {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
        this.router.navigate(['']);
      }
      else{
        this.loadConfigMetadata();
      }

  }

 protected loadConfigMetadata(){

  this.metadataConfigService.getUserRoleList().subscribe(p => {this.userRoleMap = p});
  this.metadataConfigService.getHeirarchyUnitsListById(1).subscribe(p => {this.heirarchyunitsMap = p});
  this.metadataConfigService.getImplementingPartnersList().subscribe(p => {this.implementingPartnersMap = p});

}


facilityDialog: boolean;
    loadHeirarchyUnits(heirarchyid: number,dest: string){
      this.facilityDialog=true;
      if(this.dest != dest){
        this.roots=[];
        this.heirarchyunitsMap = [];
        this.dest = dest;
      }
      if(this.heirarchyunitsMap.length === 0){
      setTimeout(() => {
        this.loading=true;
      this.metadataConfigService.getHeirarchyUnitsListById(heirarchyid).subscribe(p => {
        this.heirarchyunitsMap = p;
        this.buildHeirarchyTree(this.heirarchyunitsMap);
        this.loading=false;
      },
        error=>{
          this.addError("Failure","Poor network connectivity detected. Try again.");
          this.loading=false;
        }
      );

      },1000);
    }
    }

    _state_of_origin: string;
    onNodeSelect(event){
      console.log("Got here as "+event.node.parent.parent.parent.code);
      if(this.dest == 'fac'){
        this.userInformation.state_code = event.node.parent.parent.parent.code;
        this.userInformation.oss_code = event.node.parent.parent.code;
        this.userInformation.lga_code = event.node.parent.code;
      }
      this._state_of_origin = event.node.parent.name;
    }

    heirarchyOnSet(): void{
      //You can add as many dest... src
      if(this.dest === 'fac'){
      this.userinfodata.operational_unit_id = +this.selectedHeirarchyUnit.heirarchyunitid;
      this.userInformation.facility_name = this.selectedHeirarchyUnit.name;
      this.userInformation.facility_code = this.selectedHeirarchyUnit.code;



      }
      if(this.dest === 'nat'){
        this.userInformation.nationality_id = +this.selectedHeirarchyUnit.heirarchyunitid;
        this.userInformation.nationality_name = this.selectedHeirarchyUnit.name;
        this.userInformation.nationality_code = this.selectedHeirarchyUnit.code;
        }
        if(this.dest === 'lga'){
          this.userInformation.lga_id = +this.selectedHeirarchyUnit.heirarchyunitid;
          this.userInformation.lga_of_origin = this.selectedHeirarchyUnit.name;
          this.userInformation.lga_code = this.selectedHeirarchyUnit.code;
          this.userInformation.state_of_origin = this._state_of_origin;
          }

      this.facilityDialog = false;
      //console.log(event.event.node.parent.name);

     }




      //This will be put int util soon
 roots: TreeNode[] = [];
 private buildHeirarchyTree(list) {
  this.roots = [];
  var map = {}, node, i;

  for (i = 0; i < list.length; i += 1) {
    map[list[i].heirarchyunitid] = i; // initialize the map
    list[i].children = []; // initialize the children
  }

  for (i = 0; i < list.length; i += 1) {
    node = list[i];
    if (node.parentid !== 0) {
      list[map[node.parentid]].children.push(node);
    } else {
      this.roots.push(node);
    }
  }
  return this.roots;
}



addUser(){
this.usercreatedata.created_date =  Date.now();
this.usercreatedata.created_by = +sessionStorage.getItem('userid');
if(this.usercreatedata){
  this.userinfodata.user_role_id = this.selectedUserRole.user_role_id;
  this.userinfodata.implementing_partner_id = this.selectedImplementingPartners.implementing_partner_id;
  this.usercreatedata.usersinformation = this.userinfodata;
  
  console.log("Got here as "+JSON.stringify(this.usercreatedata));
this.manageuserService.createUpdateUser(this.usercreatedata)
.subscribe(
data => {
  //this.addUserInformation();
  this.addSuccess("Success.","User "+data.username+' created successfully.');
},
error => {
this.addError("Unsuccessful.","Could not create user.");
}

);
}
}

/*addUserInformation(){
  this.usercreatedata.created_date =  Date.now();
  this.userinfodata.implementing_partner_id = this.selectedImplementingPartners.implementing_partners_id;
  this.manageuserService.createUpdateUser(this.userinfodata);
  }*/

goBack(){
this.location.back();
}

addSuccess(title:string,message:string) {
  this.messageService.add({severity:'success', summary:title, detail:message});
}
addError(title:string,message:string) {
  this.messageService.add({severity:'error', summary:title, detail:message});
}

}
