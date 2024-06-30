import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-vendor-individual',
  templateUrl: './vendor-individual.component.html',
  styleUrl: './vendor-individual.component.scss'
})


export class VendorIndividualComponent implements OnInit {
  vCatList: any[] = [];
  individualVendorList: any[] = [];
  checkboxState: { [key: string]: boolean } = {};
  formSection: boolean = false ;
  tableSection: boolean = true;
  selectedVendorType: string = '';
  companyForm: boolean = false;
onVendorTypeChange(event: Event) {
  this.companyForm = (this.selectedVendorType !== 'individual');
  // this.selectedVendorType = (event.target as HTMLSelectElement).value;
}

  individualVendor: {individualVendorName: string, 
    individualVendorCompany: string, individualVendorContactPerson: string, individualVendorNumber: string,individualVendorPosition: string,individualVendorIndustry: string, individualVendorWebsite: string, individualVendorEmail: string, individualVendorAddress: string,individualVendorCountry: string,individualVendorState: string, individualVendorCity: string, individualVendorPostalCode: string, individualVendorCACNum: string, individualVendorTINNum: string, individualVendorBVN: string, individualVendorAcctNum: string, individualVendorAcctName: string, id: string
  } = {individualVendorName: '', individualVendorCompany: '', individualVendorContactPerson: '', individualVendorEmail: '', individualVendorNumber: '',individualVendorPosition: '',individualVendorIndustry: '', individualVendorWebsite: '',individualVendorAddress: '',individualVendorCountry: '',individualVendorState: '', individualVendorCity: '', individualVendorPostalCode: '', individualVendorCACNum: '', individualVendorTINNum: '', individualVendorBVN: null || '', individualVendorAcctNum: '', individualVendorAcctName: '',  id: null || '' }
  

  constructor(
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
  ) {}

  ngOnInit() {
    
    this.dataService.vCatList$.subscribe((vCatList) => {
      this.vCatList = vCatList;
      this.cdr.detectChanges();
    });

    const storedVCatList = localStorage.getItem('vCatList');
    if (storedVCatList) {
      this.vCatList = JSON.parse(storedVCatList);
    } else {
      this.vCatList = [];
    }

    this.dataService.individualVendorList$.subscribe((individualVendorList) => {
      this.individualVendorList = individualVendorList;
      this.cdr.detectChanges();
    });

    const storedIndividualVendorList = localStorage.getItem(
      'individualVendorList'
    );
    if (storedIndividualVendorList) {
      this.individualVendorList = JSON.parse(storedIndividualVendorList);
    } else {
      this.individualVendorList = [];
    }
  }

 
  toggleSections(): void {
    this.formSection = false;
    this.tableSection = true;
  }

  openForm(){
    this.formSection = true
    this.tableSection = false
  }

  saveVendor() {
    if (this.individualVendor) {
      const individualVendorData = {
        individualVendorName: this.individualVendor.individualVendorName, individualVendorCompany: this.individualVendor.individualVendorCompany, individualVendorContactPerson: this.individualVendor.individualVendorContactPerson, individualVendorEmail: this.individualVendor.individualVendorEmail, individualVendorNumber: this.individualVendor.individualVendorNumber,individualVendorPosition: this.individualVendor.individualVendorPosition,individualVendorIndustry: this.individualVendor.individualVendorIndustry, individualVendorWebsite: this.individualVendor.individualVendorWebsite,individualVendorAddress: this.individualVendor.individualVendorAddress,individualVendorCountry: this.individualVendor.individualVendorCountry,individualVendorState: this.individualVendor.individualVendorState, individualVendorCity: this.individualVendor.individualVendorCity, individualVendorPostalCode: this.individualVendor.individualVendorPostalCode, individualVendorCACNum: this.individualVendor.individualVendorCACNum, individualVendorTINNum: this.individualVendor.individualVendorTINNum, individualVendorBVN: null || this.individualVendor.individualVendorBVN, individualVendorAcctNum: this.individualVendor.individualVendorAcctNum, individualVendorAcctName: this.individualVendor.individualVendorAcctName
        
      };
      console.log(individualVendorData);
      this.dataService.saveIndividualVendorData(individualVendorData);

      // if (this.iVenList.id) {
      //   this.dataService.updateIndividualVendorData(
      //     this.iVenList.id,
      //     individualVendorData
      //   );
      // } else {
      //   this.dataService.saveIndividualVendorData(individualVendorData);
      // }
      this.clearVendorInput();
    }
  }

  clearVendorInput() {
   this.individualVendor.individualVendorAcctName = ''

this.individualVendor.individualVendorEmail= ''








  }

 

  toggleCheckbox(id: string) {
    this.checkboxState[id] = !this.checkboxState[id];
  }
}
