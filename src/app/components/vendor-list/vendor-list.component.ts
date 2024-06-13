import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { MatDialog } from '@angular/material/dialog';
import { VendorCategoryCreationModalComponent } from '../vendor-category-creation-modal/vendor-category-creation-modal.component';

@Component({
  selector: 'app-vendor-list',
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss',
})
export class VendorListComponent implements OnInit {
  vCatList: any[] = [];

  constructor(
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog
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
      this.vCatList = []; // Initialize with an empty array if no data is found
    }
  }

  openDialog() {
    this.dialog.open(VendorCategoryCreationModalComponent);
  }
}
