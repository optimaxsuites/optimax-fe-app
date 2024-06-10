import { Component, OnInit } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';
import { DataService } from '../../data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.scss',
  providers: [TopProductService],
})
export class RfqComponent {
  constructor(private router: Router) {}
}
