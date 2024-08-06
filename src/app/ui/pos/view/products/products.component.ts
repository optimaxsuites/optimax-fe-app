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
  viewUser: boolean = false
  editUser: boolean = false;
  activeItem: any = {}

  tableSection: boolean = true;
deleteModal: boolean = false;
  constructor(
    private posService: PosServiceService,
  ) {
  }

  ngOnInit(): void {
 
  }
 
  openViewProduct(item: any = {}) {

    this.activeItem = item
    console.log(this.activeItem)
    this.viewUser = !this.viewUser
    this.tableSection =!this.tableSection
  }

  openViewEditForm() {
    this.viewUser = !this.viewUser
    this.editUser = !this.editUser
  
  }

  openDeleteModal(item: any ={}) {
    this.activeItem = item

    this.deleteModal = !this.deleteModal
  }

}
