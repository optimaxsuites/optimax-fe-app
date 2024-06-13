import { Component, OnInit } from '@angular/core';
import { ClinicalStagesData } from 'src/app/administration/domain/clinicalstage.data';
import { MedicationLineRegimen, RegimenCombo, ARVDosage } from 'src/app/administration/domain/drug.data';
import { FunctionalStatusData } from 'src/app/administration/domain/functionalstatus.data';
import { StatusData } from 'src/app/administration/domain/status.data';
import { ClientExtendedInfo, ClientVisit } from 'src/app/client/domain/client.portal.data';
import { ManageDrugService } from 'src/app/administration/service/manage.drug.service';
import { ManageDispensingPatternService } from 'src/app/administration/service/manage.dispensingpattern';
import { PharmacyData } from '../domain/pharmacy.data';

@Component({
  selector: 'app-pharmacy-arvrefill',
  templateUrl: './pharmacy-arvrefill.component.html',
  styleUrls: ['./pharmacy-arvrefill.component.scss']
})
export class PharmacyARVRefillComponent implements OnInit {
  maxDate: Date;
  minDate: string;
  curYear: string;

    medLineMap:MedicationLineRegimen[];
    regimenMap = {} as RegimenCombo[];
    dosageMap: ARVDosage[];
    selectedMedLine: MedicationLineRegimen;
    selectedRegimenCombo: RegimenCombo;
    selectedDosage: ARVDosage;
    arvDrugDispenseList: any;
    arvdispensecreatedata =  {} as any;
    selectedARVDrug = {} as any;
    viewedClient: ClientExtendedInfo;
    
  swithClientExtInfo: boolean = true;
clientExtInfoLazy: ClientExtendedInfo[];
clientExtInfo: ClientExtendedInfo[]=[];
  pharmarcyInfo: PharmacyData[];
  selectedPharmacys: PharmacyData;
  loading: boolean;
  totalRecords: number;
  cols: any[];
regperiodmap: any;
selectedRegDays: any;
client_unique_identifier:any;






    clinicvisit = {} as ClientVisit;
    
    selectedClinicalStage = {} as any;
    clinicalStagesMap: ClinicalStagesData[] = [];
    functionalStatusMap: FunctionalStatusData[]=[];
    selectedFunctionalStatus = {} as any;
    selectedTBStatus = {} as any;
    tBStatusMap: StatusData[]=[];
    pregnancyStatusMap: any[]=[];
  clientPortalService: any;
  arvdispensedialog: boolean;
  messageService: any;

  constructor( 
    private manageDrugService:ManageDrugService,private managedispensingpatternService:ManageDispensingPatternService

  ) { }

  ngOnInit(): void {
    this.viewedClient = this.clientPortalService.selectedClients;
    this.maxDate = new Date();
    this.curYear = new Date().getFullYear().toString();
    this.manageDrugService.getMedicationLine().subscribe(data => {this.medLineMap = data});
        this.managedispensingpatternService.getDispensingPattern().subscribe(data => {this.dosageMap = data});
        this.manageDrugService.getARVDrugDispenseByClient(this.viewedClient.hospitalNum).subscribe(data => {this.arvDrugDispenseList = data})
  }

  arvdispensecreatedatas: any[]=[];
    arvpickupdate: Date;
    AddARVToReview(){
        if(!this.arvdispensecreatedata.next_arv_pick_up_date && !this.arvdispensecreatedata.regimen){
            this.addError("Missing fields ","All fields are required...");
        }
        else{
        this.arvdispensecreatedata.created_by = +sessionStorage.getItem("userid");
        this.arvdispensecreatedata.created_date = new Date();
        this.arvdispensecreatedata.client_unique_identifier = this.viewedClient.hospitalNum;
        this.arvdispensecreatedata.arv_dispense_date = this.arvpickupdate;
        this.arvdispensecreatedata.medicationline = this.selectedMedLine.name;
        this.arvdispensecreatedata.regimen = this.selectedRegimenCombo.name;
        this.arvdispensecreatedata.regimencombo_id = this.selectedRegimenCombo.regimencombo_id;
        this.arvdispensecreatedata.dosage = this.selectedDosage.name;
        this.arvdispensecreatedata.dosage_duration_id = this.selectedDosage.drugdispensepattern_id;
        this.arvdispensecreatedata.arv_next_appointment_date = this.arvdispensecreatedata.next_arv_pick_up_date;
        this.arvdispensecreatedatas.push(this.arvdispensecreatedata);
        this.arvdispensecreatedata = {} as any;
        }
   
    }
    SaveARVDrugDispense(saveclear){
      if(saveclear==='clear'){
          this.arvdispensecreatedatas = [];
      }
      if(saveclear==='save'){
          if(this.arvdispensecreatedatas){
      this.manageDrugService.createARVDrugDispense(this.arvdispensecreatedatas).subscribe(
          () => {
            this.addSuccess("Success!","ARV Drug(s) dispensed  successfully.");
            this.manageDrugService.getARVDrugDispenseByClient(this.viewedClient.hospitalNum).subscribe(data => {this.arvDrugDispenseList = data});
         },
         () => {
         this.addError("Failed!","ARV Drug(s) dispensed unsuccessfully");
       });
  }}
 
  }
  onMedLineChange(){

    this.regimenMap = [];
    this.medLineMap.filter(p => {
      if(p.medicationline_id === this.selectedMedLine.medicationline_id){
        this.regimenMap = p.regimen;
      }
    })

}

goToAddDialog(dialog: string) {
  if (dialog === 'arvdrug') {
    this.arvdispensedialog = true;
}
}

addSuccess(title: string, message: string) {
  this.messageService.add({ severity: 'success', summary: title, detail: message });
}
addError(title: string, message: string) {
  this.messageService.add({ severity: 'error', summary: title, detail: message });
}

}
