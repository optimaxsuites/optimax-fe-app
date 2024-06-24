import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { MatDialog } from '@angular/material/dialog';
import { VendorManagementComponent } from '../vendorMangement/vendorManagement';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendor-list',
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss',
})
export class VendorListComponent implements OnInit {
  vCatList: any[] = [];
  individualVendorList: any[] = [];
  checkboxState: { [key: string]: boolean } = {};

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

  deleteVendor(id: string) {
    this.dataService.deleteVendor(id);
  }

  openDialog(type: string, vendor?: any) {
    const dialogRef = this.dialog.open(VendorManagementComponent, {
      data: {
        formType: type,
        iVenList: vendor || {},
      },
    });
  }

  toggleCheckbox(id: string) {
    this.checkboxState[id] = !this.checkboxState[id];
  }
}
