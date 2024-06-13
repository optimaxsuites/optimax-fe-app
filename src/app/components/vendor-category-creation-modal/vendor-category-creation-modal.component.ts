import { Component } from '@angular/core';
import { DataService } from '../../data.service';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-vendor-category-creation-modal',
  templateUrl: './vendor-category-creation-modal.component.html',
  styleUrl: './vendor-category-creation-modal.component.scss',
})
export class VendorCategoryCreationModalComponent {
  constructor(
    private dataService: DataService,
    private router: Router,
    public dialogRef: MatDialogRef<VendorCategoryCreationModalComponent>
  ) {}

  category: string = '';
  // dateCreated: any = '';
  saveCategory() {
    if (this.category ) {
      const vendorData = {
        category: this.category,
        // dateCreated: this.dateCreated,
      };
      console.log(vendorData);

      this.dataService.saveVCatData(vendorData);
      this.clearVendorInput();
      this.dialogRef.close();
      // this.router.navigate(['/crm']);
    }
  }

  clearVendorInput() {
    this.category = '';
    // this.dateCreated = '';
  }
}
