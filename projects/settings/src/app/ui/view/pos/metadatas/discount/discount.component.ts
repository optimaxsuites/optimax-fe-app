import { Component } from '@angular/core';

@Component({
  selector: 'app-discount',
  templateUrl: './discount.component.html',
  styleUrl: './discount.component.scss'
})
export class DiscountComponent {
  discount: [null],
  discountMinQuantity: [0],
  discountName: [''],

  discount: {
  id: number;
  name: string;
  value: number;
  startDate: Date;
  endDate: Date;
  minQuantity: number;
  discountType: number[];  // ✅ Changed to array of IDs
} = {
  id: 0,
  name: '',
  value: 0,
  startDate: new Date(),
  endDate: new Date(),
  minQuantity: 0,
  discountType: [],  // ✅ Initialize as empty array
};
}
