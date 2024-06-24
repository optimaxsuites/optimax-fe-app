import { Component, Inject } from '@angular/core';
import { DataService } from '../../data.service';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-vendor-category-creation-modal',
  templateUrl: './vendorManagement.component.html',
  styleUrl: './vendorManagement.component.scss',
})
export class VendorManagementComponent {
  formType: string;
  iVenList: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dataService: DataService,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<VendorManagementComponent>
  ) {
    this.formType = data.formType;
    this.iVenList = data.iVenList || {};
    if (
      this.formType === 'individual' &&
      Object.keys(this.iVenList).length > 0
    ) {
      this.vendorName = data.iVenList.vendorName;
      this.vendorCACNum = data.iVenList.vendorCACNum;
      this.vendorAddress = data.iVenList.vendorAddress;
      this.vendorPhoneNumber = data.iVenList.vendorPhoneNumber;
      this.vendorEmail = data.iVenList.vendorEmail;
      this.vendorServices = data.iVenList.vendorServices;
    }
  }

  ngOnInit() {
    console.log('Dialog Data:', this.data); // Check what data is received
    this.formType = this.data.formType;
    this.iVenList = this.data.iVenList;
  }

  category: string = '';
  vendorName: string = '';
  vendorCACNum: string = '';
  vendorAddress: string = '';
  vendorPhoneNumber: number = 0;
  vendorEmail: string = '';
  vendorServices: string = '';

  saveCategory() {
    if (this.category) {
      const vendorData = {
        category: this.category,
      };
      console.log(vendorData);

      this.dataService.saveVCatData(vendorData);
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
    this.category = '';
    this.vendorAddress = '';
    this.vendorCACNum = '';
    this.vendorEmail = '';
    this.vendorName = '';
    this.vendorPhoneNumber = 0;
    this.vendorServices;
  }

  openDialog(type: string, vendor?: any) {
    const dialogRef = this.dialog.open(VendorManagementComponent, {
      data: {
        formType: type,
        iVenList: vendor || {},
      },
    });
  }
}
