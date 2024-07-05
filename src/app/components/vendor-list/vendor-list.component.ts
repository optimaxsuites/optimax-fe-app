import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from 'src/app/data.service';

@Component({
  selector: 'app-vendor-list',
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss',
})
export class VendorListComponent implements OnInit {
  individualVendorList: any[] = [];
  filteredVendorList: any[] = [];
  categoryFilter: string = '';

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.categoryFilter = params['category'];
      this.filterVendors();
    });

    this.dataService.individualVendorList$.subscribe((individualVendorList) => {
      this.individualVendorList = individualVendorList;
      this.filterVendors();
    });
  }

  filterVendors(): void {
    if (this.categoryFilter) {
      this.filteredVendorList = this.individualVendorList.filter(
        (vendor) => vendor.categoryType === this.categoryFilter
      );
    } else {
      this.filteredVendorList = [...this.individualVendorList];
    }
  }
}
