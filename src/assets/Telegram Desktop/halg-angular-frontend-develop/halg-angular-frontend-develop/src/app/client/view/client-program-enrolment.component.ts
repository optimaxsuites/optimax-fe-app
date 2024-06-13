import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {MessageService, MenuItem,LazyLoadEvent, ConfirmationService, ConfirmEventType} from 'primeng/api';
import { AssessmentQuestions, AssessmentResponses, AssessmentType } from 'src/app/administration/domain/assessments.data';
import { FormAttr } from 'src/app/administration/domain/formbuilder.data';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { ClientExtendedInfo } from '../domain/client.portal.data';
import { ClientPortalService } from '../service/client.portal.service';
import { ManageClientService } from '../service/manage.client.service';
declare var require: any;


@Component({
  selector: 'app-client-program-enrolment',
  templateUrl: 'client-program-enrolment.component.html',
  styleUrls: ['./client-program-enrolment.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers:[MessageService,ConfirmationService]
})
export class ClientProgramEnrolmentComponent implements OnInit {
  customServiceForm: any;
  enrolmentPrograms = {} as FormAttr[];
  assessmentTypeMap: AssessmentType[];
  selectedAssessmentType: AssessmentType;
  assessmentQuestions: AssessmentQuestions[];
  assessmentQuestionMap = { assessmentType: {} } as unknown as AssessmentQuestions[];
  selectedAssessmentQuestion: AssessmentQuestions;
  created_date: Date;
  fsdi: string = 'Hiv_Risk_Assesment';

  clientservices: any;


  viewedClient: ClientExtendedInfo;
  formRendered: boolean = false;
  selectedProgram = {} as FormAttr;
  dateOfEnrolment: Date = new Date();

  hts_registration_track_order: any[] = [];

  constructor(private messageService: MessageService,
    private manageclientService:ManageClientService,
    private metadataConfigService: MetadataConfigService,
    private confirmationService: ConfirmationService,
    private clientPortalService:ClientPortalService) { }

  ngOnInit(): void {
    
    this.hts_registration_track_order = [
      {order: 1, fsdi: 'Hiv_Risk_Assesment',name: 'HIV Risk Assessment',status: false},
      {order: 2, fsdi: 'Hiv_Recency_Testing',name: 'HIV Recency Testing',status: false},
      {order: 3, fsdi: 'HTS_Intake_Form',name: 'HTS Intake',status: false},
      {order: 4, fsdi: 'Referral_forms',name: 'ART Services',status: false},
    ];

   
  this.viewedClient = this.clientPortalService.selectedClients;
  
  this.clientServicesEnrolledIn();
  
    if (!this.clientservices) {
      this.clientRegistrationForm();
    }

    this.clientservices = this.manageclientService;
    
    this.getProgramStagesClientEnrolled();

  }

  preHIVAssessmentDialog: boolean = false;
  postHIVAssessmentDialog: boolean = false;
  assessmentType:any = {};

  showHIVAssessment(prepost: string){
  this.assessmentQuestions = [];
   this.assessmentTypeMap = [];
    if(prepost == 'pre'){

       this._assessmentTypeMap.filter(p => {
         if(p.flag === 'Pre'){
       this.assessmentType.name= p.name;
       this.assessmentType.description= p.description;
       this.assessmentType.code = p.code;
       this.assessmentType.flag =p.flag;
       this.assessmentType.assessment_type_id= p.assessment_type_id;
       this.assessmentType.created_by = p.created_by;
       this.assessmentType.created_date = p.created_date;

       this.assessmentTypeMap.push(this.assessmentType);
       this.assessmentType = {};
      }

    });

    this.preHIVAssessmentDialog=true;
    }
    else if(prepost == 'post'){
      this._assessmentTypeMap.filter(p => {
        if(p.flag === 'Post'){
      this.assessmentType.name= p.name;
      this.assessmentType.description= p.description;
      this.assessmentType.code = p.code;
      this.assessmentType.flag =p.flag;
      this.assessmentType.assessment_type_id= p.assessment_type_id;
      this.assessmentType.created_by = p.created_by;
      this.assessmentType.created_date = p.created_date;

      this.assessmentTypeMap.push(this.assessmentType);
      this.assessmentType = {};
     }

   });
      this.postHIVAssessmentDialog=true;
    }

  }

  assessmentQuestion: AssessmentQuestions;
  //_assessmentResponses: AssessmentResponses;
  _assessmentQuestion: any;
  onAssessmentSelection(assType: string){

    this._assessmentQuestion = {};
    this.rsp = 0;
    this.assessmentQuestions = [];
    if(this.assessmentResponses.length > 0){ //check if client have previously been assessed
    this.assessmentResponses.filter(p=> { //Dami you need to get back to this...
      if (p.assessmentQuestions.assessment_type_id === this.selectedAssessmentType.assessment_type_id){
       if(p.assessmentQuestions.assessmentType.flag === assType){
        this._assessmentQuestion.assessmentResponseCallBackId = p.assessment_response_id;
        this._assessmentQuestion.assessment_question_id = p.assessment_question_id;
        this._assessmentQuestion.assessment_type_id = p.assessmentQuestions.assessment_type_id;
        this._assessmentQuestion.name = p.assessmentQuestions.name;
        this._assessmentQuestion.default_response = p.value == 0 ? false : true;
        this.assessmentQuestions.push(this._assessmentQuestion);
        this._assessmentQuestion = {};
      }
    }
      })
      this.calculateResponses();
    }



      if(this.assessmentResponses.length === 0){//if client not previously assessed load defaults questions
      this.assessmentQuestionMap.filter(p => {
        if (p.assessment_type_id === this.selectedAssessmentType.assessment_type_id){
          if(p.assessmentType.flag === assType){
          this.assessmentQuestions.push(p);
          }
        }
      })
      }

  }

   /*onPostAssessmentSelection(){
    this.rsp = 0;
    this.assessmentQuestions = [];
    this.assessmentQuestionMap.filter(p=> {
      if (p.assessment_type_id === this.selectedAssessmentType.assessment_type_id){
        this.assessmentQuestions.push(p);

      }
      })
  }*/

  rsp: number;
  calculateResponses(){
    this.rsp = 0;
    this.assessmentQuestions.forEach(p=> {
      if(p.default_response){
        this.rsp = this.rsp+1;
      }
    });
  }

  /*calculatePostResponses(){
     this.rsp = 0;
    this.assessmentQuestions.forEach(p=> {

      if(p.default_response){
        this.rsp = this.rsp+1;
      }
    });
  }*/

  assessmentResponse = {} as AssessmentResponses;
  assessmentResponses: AssessmentResponses[] = [];


  saveResponses(){
    if(this.assessmentQuestions.length > 0){
      this.assessmentResponses = [];
      this.assessmentQuestions.forEach(p=>{
        this.assessmentResponse.assessment_response_id=p.assessmentResponseCallBackId;
        this.assessmentResponse.client_unique_identifier = this.viewedClient.hospitalNum;
        this.assessmentResponse.assessment_question_id = p.assessment_question_id;
        this.assessmentResponse.value = p.default_response ? 1 : 0;
        this.assessmentResponse.created_by = +sessionStorage.getItem('userid');
        this.assessmentResponse.created_date = Date.now();

        this.assessmentResponses.push(this.assessmentResponse);
        this.assessmentResponse = {} as AssessmentResponses;

      })


   // console.log(JSON.stringify(this.assessmentResponses));
    this.manageclientService.createUpdateAssessmentResponses(this.assessmentResponses)
    .subscribe(
      data => {
        this.addSuccess("Success.","Assessment submitted successfully.");
  },
  error => {
    this.addError("Unsuccessful.","Assessment could not be submitted successfully.");
    });
  }
  else{
    this.addError("Unsuccessful.","You must make at least one selection.");
  }


  }



  savePostResponses(){
    if(this.assessmentQuestions.length > 0){
      this.assessmentResponses = [];
      this.assessmentQuestions.forEach(p=>{
        this.assessmentResponse.client_unique_identifier = this.viewedClient.hospitalNum;
        this.assessmentResponse.assessment_question_id = p.assessment_question_id;
        this.assessmentResponse.value = p.default_response ? 1 : 0;
        this.assessmentResponse.created_by = +sessionStorage.getItem('userid');
        this.assessmentResponse.created_date = Date.now();

        this.assessmentResponses.push(this.assessmentResponse);
        this.assessmentResponse = {} as AssessmentResponses;

      })



    this.manageclientService.createUpdateAssessmentResponses(this.assessmentResponses)
    .subscribe(
      data => {
        this.addSuccess("Success.","Assessment submitted successfully.");
  },
  error => {
    this.addError("Unsuccessful.","Assessment could not be submitted successfully.");
    });
  }
  else{
    this.addError("Unsuccessful.","You must make at least one selection.");
  }


  }
  position: string;
confirmSaveAssessment(position: string){
  this.position = position;
  this.confirmationService.confirm({
    message: 'Do you want to submit the responses for <b>'+this.selectedAssessmentType.name+'?',
    header: 'Submit Assessment',
    icon: 'pi pi-info-circle',
    accept: () => {
      this.saveResponses();
    },
    reject: () => {
      this.addSuccess("Cancelled.","Action cancelled or suspended.");
    },
    key: "positionDialog"
});
}

confirmSavePostAssessment(position: string){
  this.position = position;
  this.confirmationService.confirm({
    message: 'Do you want to submit the responses for <b>'+this.selectedAssessmentType.name+'?',
    header: 'Submit Assessment',
    icon: 'pi pi-info-circle',
    accept: () => {
      this.saveResponses();
    },
    reject: () => {
      this.addSuccess("Cancelled.","Action cancelled or suspended.");
    },
    key: "positionDialog"
});
}
_assessmentTypeMap: AssessmentType[];

programStages: any[] = [];
programStagesForm: any[] = [];
protected clientRegistrationForm(){
  this.programStages =[];

  this.metadataConfigService.getProgramsList().subscribe((p) => { 
    this.programStages = p;
    this.programStages.filter(t=> {
    this.programStagesForm = t.programstages;
    this.clientServicesEnrolledIn();
    this.jsonv(this.fsdi);
   })
  });

  

}

programStagesEnrolled: any[] = [];
 getProgramStagesClientEnrolled(){
 this.clientPortalService.getClientClinicalProgramsByClientId(this.viewedClient.hospitalNum)
 .subscribe(data => {
   this.programStagesEnrolled = data;
  });
}

enrolled: boolean = false;
HTSProgramEnrolledStatus(fsdi){
  if(this.programStagesEnrolled){
    this.programStagesEnrolled.forEach(p=> {
      if(p.programstages.form_stage_db_identifier === fsdi){
        this.enrolled=true;
        console.log("Got here "+fsdi+" "+this.enrolled);
      }
      else{
        this.enrolled=false;
      }
    })
  }
  
}

_p = {};
pp(fsdi){
  if(this.programStagesEnrolled){
   //this.hts_registration_track_order.forEach(p=> {
     this.programStagesEnrolled.forEach(t=> {
      if(t.programstages.form_stage_db_identifier == fsdi){
        this.enrolled = true;
       //console.log("got here "+t.programstages.form_stage_db_identifier+" "+ p.fsdi);
      }
      else{
        this.enrolled = false;
      }
       
     })
 //  })
  }
}



protected loadConfigMetadata(){
  this.programStages =[];
 this.metadataConfigService.getAssessmentTypeList().subscribe(p => {this._assessmentTypeMap = p});
 this.metadataConfigService.getAssessmentQuestionList().subscribe(p => {this.assessmentQuestionMap = p});
 //this.loadAssessmentResponsesByClientID(this.viewedClient.hospitalNum);

}

json;
ptitle;
jsonv(fsdi){
  if(this.programStagesForm){
    this.programStagesForm.find(p => {
      if(p.form_stage_db_identifier === fsdi){
        this.json = p.programstageform.json;
        this.ptitle = p.name;
        this.customServiceForm = JSON.parse(this.json);
        this.formRendered = true;
      }
    })
  }
  
}

HTSForm: any = {};
htsactivitytracker_id: number = 0;
clientServicesEnrolledIn() {
  this.clientPortalService.getHTSActivityTrackerByClientId(this.viewedClient.hospitalNum)
  .subscribe(data => {this.HTSForm = data;
    if(this.HTSForm){
    this.fsdi = this.HTSForm.form_stage_db_identifier;
    
    }
    });
}

getNextHTSForm(fsdi){
  for (let j=0; j<this.hts_registration_track_order.length; j++ ){
    if(this.hts_registration_track_order[j].fsdi === fsdi){
      this.fsdi = this.hts_registration_track_order[j+1].fsdi;
     // break;
    } 
}
}
createNextHTSActivity(data){
this.clientPortalService.NextHTSActivity(data).subscribe(
  (data) =>{
    this.addSuccess('Success', 'HTS tracker activity set successfully, it will be directed to the next form...');
    
   setTimeout(() => {
    this.clientRegistrationForm();
      this.jsonv(this.fsdi);
      this.HTSProgramEnrolledStatus(this.cfsdi)
    },2000)
  },
  (error) => {
    console.error(error);
    if (error.toString() == '502') {
      this.addError(
        'Backend Error!',
        'There is a technical error preventing this action. The error code is ' +
          error
      );
    } else {
      this.addError('Unsuccessful.', 'Failed to add new HTS Tracker. ' + error);
      //  console.error(error);
    }
  }
)
}
 dtx: any = {}
 cfsdi;
onSubmit(event) {
  
  event.data.client_unique_identifier = this.viewedClient.hospitalNum;
  event.data.created_date = new Date(this.dateOfEnrolment);
  //event.data.created_date = new Date();
  event.data.created_by = +sessionStorage.getItem('userid');
  event.data.formName = this.fsdi;
  this.cfsdi = this.fsdi;
  this.manageclientService.createGenericInstance(event.data).subscribe(
    (data) => {
      this.getNextHTSForm(this.fsdi);

      //setting HTS next activity...
      this.dtx.form_stage_db_identifier = this.fsdi
      this.dtx.created_date = new Date(this.dateOfEnrolment);
      this.dtx.created_by = +sessionStorage.getItem('userid');
      this.dtx.client_unique_identifier = this.viewedClient.hospitalNum;
      this.dtx.htsactivitytracker_id = this.HTSForm.htsactivitytracker_id;

      this.createNextHTSActivity(this.dtx);
      
    },
    (error) => {
      console.error(error);
      if (error.toString() == '502') {
        this.addError(
          'Backend Error!',
          'There is a technical error preventing this action. The error code is ' +
            error
        );
      } else {
        this.addError('Unsuccessful.', 'Failed to add new client. ' + error);
        //  console.error(error);
      }
    }
  );
}

confirmBeforeAdding(event) {
  this.confirmationService.confirm({
    message: 'Are you sure that you want to add this record?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      this.onSubmit(event);
      // this.messageService.add({severity:'info', summary:'Confirmed', detail:'Deleted successfully'});
    },
    reject: (type) => {
      switch (type) {
        case ConfirmEventType.REJECT:
          this.messageService.add({
            severity: 'error',
            summary: 'Rejected',
            detail: 'You have rejected this request',
          });
          break;
        case ConfirmEventType.CANCEL:
          this.messageService.add({
            severity: 'warn',
            summary: 'Cancelled',
            detail: 'You have cancelled this request',
          });
          break;
      }
    },
  });
}

assessmentAnsweredResponses: any;
loadAssessmentResponsesByClientID(clientId: string){

this.assessmentAnsweredResponses = {};
this.manageclientService.getAssessmentResponses(clientId).subscribe(p => {
  this.assessmentResponses = p;
})

}

loadForm(){
  if(this.selectedProgram.name && this.dateOfEnrolment){
  this.customServiceForm = require('./'+this.selectedProgram.json);
  this.formRendered = true;
  }
}



addSuccess(title:string,message:string) {
  this.messageService.add({severity:'success', summary:title, detail:message});
}
addError(title:string,message:string) {
  this.messageService.add({severity:'error', summary:title, detail:message});
}

}
