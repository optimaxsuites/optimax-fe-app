import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { MatDialog } from '@angular/material/dialog';
import { VendorManagementComponent } from '../vendorMangement/vendorManagement';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendor-category',
  templateUrl: './vendor-category.component.html',
  styleUrl: './vendor-category.component.scss'
})


export class VendorCategoryComponent implements OnInit {
  vCatList: any[] = [];
  individualVendorList: any[] = [];
  checkboxState: { [key: string]: boolean } = {};
  isVendorList: boolean = false;

  constructor(
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    private router: Router
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

  editVendor(vendor: any) {
    this.openDialog('individual', vendor);
    // console.log('clicked', vendor);
  }

  editCategory(category: any) {
    this.openDialog('category', {}, category);
    console.log('clicked', category);
  }

  deleteVCategory(id: string) {
    this.dataService.deleteVCategory(id);
  }

  deleteVendor(id: string) {
    this.dataService.deleteVendor(id);
  }

  openDialog(type: string, vendor?: any, category?: any) {
    const dialogRef = this.dialog.open(VendorManagementComponent, {
      data: {
        formType: type,
        vCatList: category || {},
        iVenList: vendor || {},
      },
    });
  }

  toggleCheckbox(id: string) {
    this.checkboxState[id] = !this.checkboxState[id];
  }
}
