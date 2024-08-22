import { Component, OnInit } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Product } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse,  } from '@angular/common/http';
import { MatStartDate } from '@angular/material/datepicker';
@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  providers: [MessageService]
})
export class ProductsComponent implements OnInit {

  products = [] 
  viewProduct: boolean = false
  addProduct: boolean = false;
  activeItem: any = {}
  deleteModal: boolean = false;
  editProduct: boolean = false

  discountTypes = [
    { label: 'Periodic', value: 'periodic' },
    { label: 'Quantity Based', value: 'quantityBased' },
    { label: 'Global Discount', value: 'globalDiscount' }
  ];
  discountType: string[] = []
  periodicDiscount: { startDate: string, endDate: string } = { startDate: '', endDate: '' };
  quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  productImage: any = ''
  tableSection: boolean = true;
  categories: any[] = [];
  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,  private http: HttpClient
  ) {
  }

  ngOnInit(): void {
this.loadCategory()
this.getProducts()
this.getDiscountTypes()
  }

  productCode: string = '5901234123457';



  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(value => typeof value === 'string' && value.trim() === '');
  }

  getProducts() {
    this.posService.getProducts().subscribe(
      async (data) => {
        console.log(data)
        if (data) {
          this.products = data
        } else {
         console.log("error loading data")
        }}
    )  
  }
  getDiscountTypes(){
    this.posService.getDiscountTypes().subscribe(
      async (data) => {
        console.log(data)
        if (data) {
          this.discountTypes = data
        } else {
         console.log("error loading data")
        }}
    )  
  }
  loadCategory(){
    this.posService.getCategories().subscribe(
      async (data) => {
        console.log(data)
        if (data) {
          this.categories = data
        } else {
         console.log("error loading data")
        }}
    )  
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
