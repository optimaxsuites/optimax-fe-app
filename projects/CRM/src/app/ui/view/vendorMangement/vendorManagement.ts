import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { DataService } from '../../service/data.service';

@Component({
  selector: 'app-vendor-category-creation-modal',
  templateUrl: './vendorManagement.component.html',
  styleUrl: './vendorManagement.component.scss',
})
export class VendorManagementComponent implements OnInit {
  formType: string;
  // formType: 'individual' | 'category' = 'category';
  iVenList: any;
  vCatList: any;
  category: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dataService: DataService,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<VendorManagementComponent>
  ) {
    this.formType = data.formType;
    this.iVenList = data.iVenList || {};
    this.vCatList = data.vCatList || {};
   
}

  ngOnInit() {
    
    console.log('Dialog Data:', this.data); // Check what data is received
    this.formType = this.data.formType;
    this.iVenList = this.data.iVenList;
    this.vCatList = this.data.vCatList;
    if (
      this.formType === 'individual' &&
      Object.keys(this.iVenList).length > 0
    ) {
    
      this.vendorName = this.iVenList.vendorName;
      this.vendorCACNum = this.iVenList.vendorCACNum;
      this.vendorAddress = this.iVenList.vendorAddress;
      this.vendorPhoneNumber = this.iVenList.vendorPhoneNumber;
      this.vendorEmail = this.iVenList.vendorEmail;
      this.vendorServices = this.iVenList.vendorServices;
    } else if(
      this.formType === 'category' &&
      Object.keys(this.vCatList).length > 0)
     {
    
  this.categoryName = this.vCatList.categoryName;
      this.categoryCode = this.vCatList.categoryCode;
      this.categoryDesc = this.vCatList.categoryDesc;
  }
  }

  categoryName: string = '';
  categoryCode: string = '';
  categoryDesc: string = '';
  vendorName: string = '';
  vendorCACNum: string = '';
  vendorAddress: string = '';
  vendorPhoneNumber: number = 0;
  vendorEmail: string = '';
  vendorServices: string = '';

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault(); 
      event.stopPropagation();
      this.saveCategory();
    }
  }

  saveCategory() {
    if (this.categoryName && this.categoryCode && this.categoryDesc) {
      const vendorData = {
        categoryName: this.categoryName,        
        categoryCode: this.categoryCode,
        categoryDesc: this.categoryDesc,
      };
      console.log(vendorData);

      // this.dataService.saveVCatData(vendorData);
      if (this.vCatList.id) {
        this.dataService.updateVendorCategoryData(
          this.vCatList.id,
          vendorData
        )
      } else {
        this.dataService.saveVCatData(vendorData);
      }
      this.clearVendorInput();
      this.dialogRef.close();
    }
  }

  saveVendor() {
    if (
      this.vendorAddress &&
      this.vendorCACNum &&
      this.vendorEmail &&
      this.vendorName &&
      this.vendorPhoneNumber &&
      this.vendorServices
    ) {
      const individualVendorData = {
        vendorAddress: this.vendorAddress,
        vendorCACNum: this.vendorCACNum,
        vendorEmail: this.vendorEmail,
        vendorPhoneNumber: this.vendorPhoneNumber,
        vendorName: this.vendorName,
        vendorServices: this.vendorServices,
      };
      console.log(individualVendorData);
      if (this.iVenList.id) {
        this.dataService.updateIndividualVendorData(
          this.iVenList.id,
          individualVendorData
        );
      } else {
        this.dataService.saveIndividualVendorData(individualVendorData);
      }
      this.clearVendorInput();
      this.dialogRef.close();
    }
  }

  clearVendorInput() {
    this.categoryName = '';
    this.categoryCode = '';
    this.categoryDesc = '';
    this.vendorAddress = '';
    this.vendorCACNum = '';
    this.vendorEmail = '';
    this.vendorName = '';
    this.vendorPhoneNumber = 0;
    this.vendorServices;
  }

 

  // openDialog(type: string, vendor?: any, category?: any) {
  //   const dialogRef = this.dialog.open(VendorManagementComponent, {
  //     data: {
  //       formType: type,
  //       iVenList: vendor || {} ,
  //       vCatList: category || {} ,
        
  //     },
  //   });
  //   // console.log(category)
  // }

  toggleForm(type: 'individual' | 'category') {
    this.formType = type;
    // Reset form fields if needed
    // this.resetFormFields();
  }
}
