import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { DispensingPatternData } from '../domain/dispensingpattern.data';
import {ManageDispensingPatternService} from '../service/manage.dispensingpattern';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-dispensingpatternlist',
  templateUrl: './dispensingpattern.component.html',

  
  providers: [MessageService]
})
export class DispensingPatternComponent  implements OnInit {

  dispensingPatterncreatedata = {} as DispensingPatternData;
  dispensingPatternList:any;
  selecteddispensingPattern: DispensingPatternData;
  dispensingPatternDialog: boolean;
  dispensingPatternEditDialog: boolean;
  dispensingPatternImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private managedispensingpatternService:ManageDispensingPatternService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Dispensing Pattern', routerLink: ['/dispensingpatternlist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } 
   this.DispensingPatternList();
 }

 adddispensingPattern(){
  
  this.dispensingPatterncreatedata.created_by = +sessionStorage.getItem("userid");
  this.dispensingPatterncreatedata.created_date= Date.now();
  this.managedispensingpatternService.createDispensingPattern([this.dispensingPatterncreatedata]).subscribe(
    data => {
      this.addSuccess("Success!","Dispensing Pattern added successfully.");
      this.DispensingPatternList();
     
  },
  error => {
  this.addError("Failed!","Could not add Dispensing Pattern.");
  }

  );
  }

  DispensingPatternList():void{
    this.managedispensingpatternService.getDispensingPattern().subscribe(data => {
      this.dispensingPatternList = data;
      
    }
    );
    }

    goToAdddispensingPattern(dispensingpattern: DispensingPatternData){
      this.dispensingPatterncreatedata = {} as DispensingPatternData;
      this.dispensingPatternDialog=true;
    }


    importdispensingPattern(dispensingpattern: DispensingPatternData){
      this.router.navigate(['importdispensingPattern']);
      this.dispensingPatternDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editdispensingPattern(dispensingpattern: DispensingPatternData){
      this.dispensingPatterncreatedata = {...dispensingpattern};
      this.dispensingPatternDialog=true;
     }

     updatedispensingPattern(){
      this.managedispensingpatternService.createDispensingPattern(this.selecteddispensingPattern).subscribe(
        () => {
          this.addSuccess("Success!","Dispensing Pattern information updated successfully.");

       },
       () => {
       this.addError("Failed!","Dispensing Pattern creation failed.");
       this.dispensingPatternDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hidedispensingPatternDialog(){
      this.dispensingPatternDialog = false;
    }

    hidedispensingPatternEditDialog(){
      this.dispensingPatternEditDialog = false;
    }

}




