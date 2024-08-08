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
  addProduct: boolean = false;
  activeItem: any = {}
  deleteModal: boolean = false;
  editProduct: boolean = false
  newCategory: string = '';
  categories: string[] = ["men's clothing", "jewelery", "electronics", "women's clothing"]
  newVariant = {
    name: '',
    price: '',
    quantity: '',
    sku: ''
  };
  variants: any[] = [];
  discountType:string = ''
  selectedCategory: string=  ""
  openCategories: boolean = false
  openAddCategory: boolean = false
  openAddVariant: boolean = false

  tableSection: boolean = true;
  constructor(
    private posService: PosServiceService,
  ) {
  }

  ngOnInit(): void {
 
  }

  addCategory() {
    const categoryTrimmed = this.newCategory.trim();
    if (categoryTrimmed && !this.categories.includes(categoryTrimmed)) {
      this.categories.push(categoryTrimmed);
      this.newCategory = '';
    }
  }

  removeCategory(category: string) {
    this.categories = this.categories.filter(cat => cat !== category);
  }

  addVariant() {
    this.variants.push({ ...this.newVariant });

    this.newVariant = {
      name: '',
      price: '',
      quantity: '',
      sku: ''
    };

    this.openAddVariant = false;
  }

  deleteVariant(index: number) {
    this.variants.splice(index, 1);
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.openCategories = false;
  }

  toggleCategoryDropdown(){
    this.openCategories =!this.openCategories
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
    this.tableSection = false
    this.viewProduct = false
    this.addProduct = false
    this.editProduct =!this.editProduct
  }

  closeEdit(){
    this.tableSection = true
    this.viewProduct = false
    this.editProduct = false
    this.addProduct = false
  }

  openAddProdut(){
    this.tableSection = false
    this.viewProduct = false
    this.editProduct = false
    this.addProduct = true
  }

  closeAddProduct() {
    this.tableSection = true
    this.viewProduct = false
    this.editProduct = false
    this.addProduct = false
    }

}
