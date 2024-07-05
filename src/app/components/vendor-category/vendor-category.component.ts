import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { DataService } from '../../data.service';
import { MatDialog } from '@angular/material/dialog';
import { v4 as generateUniqueId } from 'uuid';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendor-category',
  templateUrl: './vendor-category.component.html',
  styleUrl: './vendor-category.component.scss',
})
export class VendorCategoryComponent implements OnInit {
  vCatList: any[] = [];
  individualVendorList: any[] = [];
  checkboxState: { [key: string]: boolean } = {};

  categoryGroup: {
    categoryName: string;
    categoryCode: string;
    categoryDesc: string;
    id: string;
  } = { categoryName: '', categoryCode: '', categoryDesc: '', id: null || '' };
  isVendorList: boolean = false;
  formSection: boolean = false;
  tableSection: boolean = true;

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

  saveCategory() {
    if (this.categoryGroup) {
      const vendorData = {
        categoryName: this.categoryGroup.categoryName,
        categoryCode: this.categoryGroup.categoryCode,
        categoryDesc: this.categoryGroup.categoryDesc,
      };
      console.log('clicked', vendorData);

      // this.dataService.saveVCatData(vendorData);
      if (this.categoryGroup.id) {
        this.dataService.updateVendorCategoryData(
          this.categoryGroup.id,
          vendorData
        );
      } else {
        this.dataService.saveVCatData(vendorData);
      }
    }
    this.clearInput();
    this.toggleSections();
  }

  clearInput() {
    this.categoryGroup.categoryName = '';
    this.categoryGroup.categoryCode = '';
    this.categoryGroup.categoryDesc = '';
  }

  toggleSections(): void {
    this.formSection = false;
    this.tableSection = true;
  }

  openForm() {
    this.formSection = !this.formSection;
    this.tableSection = !this.tableSection;
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    this.tableSection = true;
    this.formSection = false;
  }

  editCategory(category: any) {
    this.formSection = true;
    this.tableSection = false;
    this.categoryGroup = {
      categoryName: category.categoryName,
      categoryCode: category.categoryCode,
      categoryDesc: category.categoryDesc,
      id: category.id,
    };

    console.log('clicked', category);
  }

  deleteVCategory(id: string) {
    this.dataService.deleteVCategory(id);
  }

  toggleCheckbox(id: string) {
    this.checkboxState[id] = !this.checkboxState[id];
  }

  viewVendors(categoryName: string) {
    this.router.navigate(['crm/vendorList'], {
      queryParams: { category: categoryName },
    });
  }
  // viewVendors() {
  //   this.router.navigate(['crm/vendorList']);
  // }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
