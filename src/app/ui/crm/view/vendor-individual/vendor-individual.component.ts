import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormGroup } from '@angular/forms';
import { DataService } from '../../service/data.service';

@Component({
  selector: 'app-vendor-individual',
  templateUrl: './vendor-individual.component.html',
  styleUrl: './vendor-individual.component.scss',
})
export class VendorIndividualComponent implements OnInit {
  constructor(
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog
  ) {}

  individualVendorForm?: FormGroup;
  vCatList: any[] = [];
  individualVendorList: any[] = [];
  iVenList: any[] = [];
  checkboxState: { [key: string]: boolean } = {};
  formSection: boolean = false;
  tableSection: boolean = true;
  vendorDetails: boolean = false;
  selectedVendorType: string = '';
  selectedCategory: string = '';
  selectedVendor: any;
  companyForm: boolean = false;
  onVendorTypeChange(event: Event) {
    this.selectedVendorType = (event.target as HTMLSelectElement).value;
    this.companyForm = this.selectedVendorType !== 'individual';
  }

  onCategoryChange(event: Event) {
    this.selectedCategory;
  }

  individualVendor: {
    individualVendorName: string;
    individualVendorContactPerson: string;
    individualVendorNumber: string;
    individualVendorPosition: string;
    individualVendorIndustry: string;
    individualVendorWebsite: string;
    individualVendorEmail: string;
    individualVendorAddress: string;
    individualVendorStreetAddress: string;
    individualVendorCountry: string;
    individualVendorState: string;
    individualVendorCity: string;
    individualVendorPostalCode: string;
    individualVendorCACNum: string;
    individualVendorTINNum: string;
    individualVendorBVN: string;
    individualVendorJobPosition: string;
    individualVendorAcctNum: string;
    // individualVendorCategory: string;
    individualVendorAcctName: string;
    id: string;
  } = {
    individualVendorName: '',
    individualVendorContactPerson: '',
    individualVendorEmail: '',
    individualVendorNumber: '',
    individualVendorJobPosition: '',
    individualVendorPosition: '',
    individualVendorIndustry: '',
    individualVendorWebsite: '',
    individualVendorAddress: '',
    individualVendorStreetAddress: '',
    individualVendorCountry: '',
    individualVendorState: '',
    individualVendorCity: '',
    individualVendorPostalCode: '',
    individualVendorCACNum: '',
    individualVendorTINNum: '',
    individualVendorBVN: '',
    // individualVendorCategory: '',
    individualVendorAcctNum: '',
    individualVendorAcctName: '',
    id: null || '',
  };

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

  @HostListener('document:keydown.escape', ['$event']) // Listen for Escape key
  handleEscapeKey(event: KeyboardEvent) {
    this.toggleSections();
    this.vendorDetails = false;
  }

  toggleSections(): void {
    this.formSection = false;
    this.tableSection = true;
  }

  openForm() {
    this.dataService.changeLabel('Vendor Creation');
    this.formSection = true;
    this.tableSection = false;
  }

  saveVendor() {
    if (this.individualVendor) {
      const individualVendorData = {
        individualVendorName: this.individualVendor.individualVendorName,
        individualVendorContactPerson:
          this.individualVendor.individualVendorContactPerson,
        individualVendorEmail: this.individualVendor.individualVendorEmail,
        individualVendorNumber: this.individualVendor.individualVendorNumber,
        individualVendorPosition:
          this.individualVendor.individualVendorPosition,
        individualVendorIndustry:
          this.individualVendor.individualVendorIndustry,
        individualVendorWebsite: this.individualVendor.individualVendorWebsite,
        individualVendorStreetAddress:
          this.individualVendor.individualVendorStreetAddress,
        // individualVendorCategory: this.individualVendor.individualVendorCategory,
        individualVendorAddress: this.individualVendor.individualVendorAddress,
        individualVendorJobPosition:
          this.individualVendor.individualVendorJobPosition,
        individualVendorCountry: this.individualVendor.individualVendorCountry,
        individualVendorState: this.individualVendor.individualVendorState,
        individualVendorCity: this.individualVendor.individualVendorCity,
        individualVendorPostalCode:
          this.individualVendor.individualVendorPostalCode,
        individualVendorCACNum: this.individualVendor.individualVendorCACNum,
        individualVendorTINNum: this.individualVendor.individualVendorTINNum,
        individualVendorBVN: this.individualVendor.individualVendorBVN || '',
        individualVendorAcctNum: this.individualVendor.individualVendorAcctNum,
        individualVendorAcctName:
          this.individualVendor.individualVendorAcctName,
        vendorType: this.selectedVendorType,
        categoryType: this.selectedCategory,
      };
      // this.dataService.saveIndividualVendorData(individualVendorData);
      console.log(individualVendorData);

      if (this.individualVendor.id) {
        this.dataService.updateIndividualVendorData(
          this.individualVendor.id,
          individualVendorData
        );
      } else {
        this.dataService.saveIndividualVendorData(individualVendorData);
      }
      this.toggleSections();
      this.clearVendorInput();
    }
  }

  preventFormSubmit(event: KeyboardEvent) {
    event.preventDefault(); // Prevent default form submission on Enter key
  }

  clearVendorInput() {
    (this.individualVendor.individualVendorName = ''),
      (this.individualVendor.individualVendorContactPerson = '');
    (this.individualVendor.individualVendorEmail = ''),
      (this.individualVendor.individualVendorNumber = ''),
      (this.individualVendor.individualVendorPosition = '');
    this.individualVendor.individualVendorIndustry = '';
    this.individualVendor.individualVendorWebsite = '';
    this.individualVendor.individualVendorStreetAddress = '';
    // this.individualVendor.individualVendorCategory;
    this.individualVendor.individualVendorAddress = '';
    this.individualVendor.individualVendorJobPosition = '';
    this.individualVendor.individualVendorCountry = '';
    (this.individualVendor.individualVendorState = ''),
      (this.individualVendor.individualVendorCity = ''),
      (this.individualVendor.individualVendorPostalCode = '');
    (this.individualVendor.individualVendorCACNum = ''),
      this.individualVendor.individualVendorTINNum,
      this.individualVendor.individualVendorBVN || null;
    this.individualVendor.individualVendorAcctNum = '';
    this.individualVendor.individualVendorAcctName = '';
    this.selectedCategory = '';
    this.selectedVendorType = '';
  }

  editVendor(vendor: any) {
    this.formSection = true;
    this.tableSection = false;
    this.individualVendor = {
      individualVendorName: vendor.individualVendorName,
      individualVendorContactPerson: vendor.individualVendorContactPerson,
      individualVendorEmail: vendor.individualVendorEmail,
      individualVendorNumber: vendor.individualVendorNumber,
      individualVendorPosition: vendor.individualVendorPosition,
      individualVendorIndustry: vendor.individualVendorIndustry,
      individualVendorWebsite: vendor.individualVendorWebsite,
      individualVendorStreetAddress: vendor.individualVendorStreetAddress,
      individualVendorAddress: vendor.individualVendorAddress,
      individualVendorJobPosition: vendor.individualVendorJobPosition,
      individualVendorCountry: vendor.individualVendorCountry,
      individualVendorState: vendor.individualVendorState,
      individualVendorCity: vendor.individualVendorCity,
      individualVendorPostalCode: vendor.individualVendorPostalCode,
      individualVendorCACNum: vendor.individualVendorCACNum,
      individualVendorTINNum: vendor.individualVendorTINNum,
      individualVendorBVN: vendor.individualVendorBVN || '',
      individualVendorAcctNum: vendor.individualVendorAcctNum,
      individualVendorAcctName: vendor.individualVendorAcctName,
      id: vendor.id,
    };

    // console.log('clicked', category);
  }

  deleteVendor(id: string) {
    this.dataService.deleteVendor(id);
  }

  toggleCheckbox(id: string) {
    this.checkboxState[id] = !this.checkboxState[id];
  }

  // viewVendor(vendor: string) {
  //   this.dataService.viewVendor(vendor);
  // }

  viewVendor(vendor: string) {
    this.dataService.changeLabel('Vendor Details');
    this.selectedVendor = vendor;
    this.tableSection = false;
    this.vendorDetails = true;
  }

  // viewVendorDetails() {
  //   // this.dataService.changeLabel('Vendor Details');
  //   // Your existing logic to view vendor details
  // }

  // createNewVendor() {
  //   this.dataService.changeLabel('Vendor Creation');
  //   // Your existing logic to create a new vendor
  // }
}
