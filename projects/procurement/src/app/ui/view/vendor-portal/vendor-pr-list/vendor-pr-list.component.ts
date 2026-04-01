import { Component } from '@angular/core';

@Component({
  selector: 'app-vendor-pr-list',
  templateUrl: './vendor-pr-list.component.html',
  styleUrl: './vendor-pr-list.component.scss'
})
export class VendorPrListComponent {
  vendorId: string = '';

  ngOnInit(): void {
    this.setRandomVendorId();
  }

  setRandomVendorId(): void {
    const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');

    if (!vendors.length) {
      console.warn('No vendors found in localStorage');
      return;
    }

    const randomIndex = Math.floor(Math.random() * vendors.length);
    const randomVendor = vendors[randomIndex];

    this.vendorId = randomVendor.id;
    console.log(this.vendorId)
  }
}
