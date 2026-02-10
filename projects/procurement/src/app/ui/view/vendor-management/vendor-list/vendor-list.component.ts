import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../../service/vendor/vendor.service';
import { VendorCategoryDto } from '../../../domain/vendor.category.dto';
import {
  VendorDto,
  VendorListQuery,
  VendorStatus,
} from '../../../domain/vendor.dto';
import { Router } from '@angular/router';

@Component({
  templateUrl: './vendor-list.component.html',
})
export class VendorListComponent implements OnInit {
  loading = false;

  vendors: VendorDto[] = [];
  total = 0;

  categories: VendorCategoryDto[] = []; // you can load from API later
  statusOptions = [
    'All',
    VendorStatus.Pending,
    VendorStatus.Approved,
    VendorStatus.Rejected,
    VendorStatus.Inactive,
  ];

  query: VendorListQuery = { q: '', status: 'All', page: 1, pageSize: 10 };

  constructor(
    private vendorService: VendorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // TODO: load categories from API if you have endpoint
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.vendorService.getVendors(this.query).subscribe({
      next: (res: any) => {
        this.vendors = res.items;
        this.total = res.total;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onPage(event: any) {
    // PrimeNG paginator is 0-indexed
    const page = (event.page ?? 0) + 1;
    this.query.page = page;
    this.query.pageSize = event.rows ?? this.query.pageSize;
    this.fetch();
  }

  open(v: VendorDto) {
    this.router.navigate(['/vendor', v.id]);
  }
}
