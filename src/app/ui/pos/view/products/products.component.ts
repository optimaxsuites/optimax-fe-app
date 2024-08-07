import { Component, OnInit } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import { Product } from '../../models/interface';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  products = this.posService.products 
  viewProduct: boolean = false
  // editUser: boolean = false;
  activeItem: any = {}
  deleteModal: boolean = false;
  editProduct: boolean = false

  tableSection: boolean = true;
  constructor(
    private posService: PosServiceService,
  ) {
  }

  ngOnInit(): void {
 
  }
 
  openViewProduct(item: any = {}) {

    this.activeItem = item
    console.log(this.activeItem)
    this.viewProduct = !this.viewProduct
    this.tableSection =!this.tableSection
  }

  openViewEditForm() {
    this.viewProduct = !this.viewProduct
    this.editProduct = !this.editProduct
  
  }

  openDeleteModal(item: any ={}) {
    this.activeItem = item
    // this.tableSection =!this.tableSection
    console.log("modal open", this.deleteModal)
    this.deleteModal = !this.deleteModal
  }

  openEdit(item: any ={}) {
    this.activeItem = item
    this.tableSection =!this.tableSection
    this.viewProduct = false
    this.editProduct =!this.editProduct
  }


}
