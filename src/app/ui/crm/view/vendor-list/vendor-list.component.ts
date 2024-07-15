import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../service/data.service';
import { Location } from '@angular/common';

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
    private router: Router,
    private dataService: DataService,
    private location: Location
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

  viewVendor(vendor: string) {
    this.dataService.viewVendor(vendor);
    this.router.navigate(['crm/individualVendor/edit/:id', vendor]);
    console.log('clicked');
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    this.location.back();
  }
}
