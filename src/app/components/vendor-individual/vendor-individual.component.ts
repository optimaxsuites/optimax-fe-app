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
  isVendorList: boolean = false;
  isIndividualFormVisible: boolean = false;

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

 



  

  

  deleteVCategory(id: string) {
    this.dataService.deleteVCategory(id);
  }

  deleteVendor(id: string) {
    this.dataService.deleteVendor(id);
  }

 

  toggleCheckbox(id: string) {
    this.checkboxState[id] = !this.checkboxState[id];
  }
}
