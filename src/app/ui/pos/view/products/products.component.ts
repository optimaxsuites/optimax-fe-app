import { Component, OnInit } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {

  constructor(
    private posService: PosServiceService,
  ) {
  }

  ngOnInit(): void {
 
  }
  products = this.posService.products 

}
