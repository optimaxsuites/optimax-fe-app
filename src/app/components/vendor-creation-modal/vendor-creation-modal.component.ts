import { Component, Inject, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendor-creation-modal',
  templateUrl: './vendor-creation-modal.component.html',
  styleUrl: './vendor-creation-modal.component.scss'
})


export class VendorCreationModalComponent implements OnInit  {

  ngOnInit(): void {
      // this.showCategoryForm()
  }

  constructor(
    private dataService: DataService, private router: Router){}

    isCategoryFormVisible: boolean = true; 
    isIndividualFormVisible: boolean = false;

    showIndividualForm() {
      this.isCategoryFormVisible = false;
      this.isIndividualFormVisible = true;
    }
  
    showCategoryForm() {
      this.isCategoryFormVisible = true;
      this.isIndividualFormVisible = false;
    }

    navigateToVendorCreation() {
      this.router.navigateByUrl('/crm/vendorCreation'); // Adjust the route path as per your application setup
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

      this.dataService.saveVCatData(vendorData);
     
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
     
        this.dataService.saveIndividualVendorData(individualVendorData);
      }
      this.clearVendorInput();
      // this.dialogRef.close();
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

 




}

  // openDialog(type: string, vendor?: any, category?: any) {
  //   const dialogRef = this.dialog.open(VendorCreationModalComponent, {
  //     data: {
  //       formType: type,
  //       iVenList: vendor || {} ,
  //       vCatList: category || {} ,
        
  //     },
  //   });
  //   // console.log(category)
  // }