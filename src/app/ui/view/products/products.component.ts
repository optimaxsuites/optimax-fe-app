import { Component, OnInit } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ProductJSONFormat } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
// import { MatStartDate } from '@angular/material/datepicker';
import { filter } from 'rxjs';
@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  providers: [MessageService],
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  originalProducts: any[] = [];
  viewProduct: boolean = false;
  addProduct: boolean = false;
  activeItem: any = {};
  deleteModal: boolean = false;
  editProduct: boolean = false;

  discountTypes = [
    { label: 'Periodic', value: 'periodic' },
    { label: 'Quantity Based', value: 'quantityBased' },
    { label: 'Global Discount', value: 'globalDiscount' },
  ];
  discountType: string[] = [];
  periodicDiscount: { startDate: string; endDate: string } = {
    startDate: '',
    endDate: '',
  };
  quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  productImage: any = '';
  tableSection: boolean = true;
  searchTerm: string = '';
  selectedCategories: number[] = [];
  categories: any[] = [];
  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCategory();
    this.getProducts();
    this.getDiscountTypes();
  }

  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(
      (value) => typeof value === 'string' && value.trim() === ''
    );
  }

  getProducts() {
    this.posService.getProducts().subscribe(async (data) => {
      if (data) {
        this.originalProducts = data.sort((a: any, b: any) => {
          const dateA = new Date(
            a.createdDate[0],
            a.createdDate[1] - 1,
            a.createdDate[2],
            a.createdDate[3],
            a.createdDate[4],
            a.createdDate[5]
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5]
          );
          return dateB.getTime() - dateA.getTime();
        });
        this.products = [...this.originalProducts];
      } else {
        console.log('error loading data');
      }
    });
  }
  getDiscountTypes() {
    this.posService.getDiscountTypes().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.discountTypes = data;
      } else {
        console.log('error loading data');
      }
    });
  }
  loadCategory() {
    this.posService.getCategories().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.categories = data;
      } else {
        console.log('error loading data');
      }
    });
  }

  filterProductsBySearch(searchValue: string) {
    this.searchTerm = searchValue;
    if (searchValue.length === 0) {
      if (this.selectedCategories.length === 0) {
        this.products = [...this.originalProducts];
      } else {
        this.filterProductsByCategory();
      }
    } else {
      this.products = this.originalProducts.filter((product) => {
        const matchesCategory =
          this.selectedCategories.length === 0 ||
          this.selectedCategories.includes(product.productCategory?.id);
        const matchesSearch = product.name
          .toLowerCase()
          .includes(this.searchTerm);
        return matchesCategory && matchesSearch;
      });
    }
  }

  filterProductsByCategory() {
    if (this.selectedCategories.length === 0) {
      this.products = [...this.originalProducts];
    } else {
      this.products = this.originalProducts.filter((product) =>
        this.selectedCategories.includes(product.productCategory?.id)
      );
    }
  }
  deleteProduct() {
    this.posService
      .deleteProduct(this.activeItem.id)
      .subscribe(async (data) => {
        if (data) {
          console.log(data);
        } else {
          this.deleteModal = false;
          this.getProducts();
          this.messageService.add({
            severity: 'success',
            summary: 'Product deleted',
            detail: `${this.activeItem.name} deleted successfully`,
            key: 'tl',
            life: 3000,
          });
        }
      });
  }

  openViewProduct(item: any = {}) {
    this.activeItem = item;
    console.log(this.activeItem);
    this.viewProduct = !this.viewProduct;
    this.tableSection = !this.tableSection;
  }

  openViewEditForm() {
    this.viewProduct = !this.viewProduct;
    this.editProduct = !this.editProduct;
  }

  openDeleteModal(item: any = {}) {
    this.activeItem = item;
    // this.tableSection =!this.tableSection
    console.log('modal open', this.deleteModal);
    this.deleteModal = !this.deleteModal;
  }

  openEdit(item: any = {}) {
    this.activeItem = item;
    console.log('view', item);
    this.tableSection = false;
    this.viewProduct = false;
    this.addProduct = false;
    this.editProduct = !this.editProduct;
  }

  closeEdit() {
    this.tableSection = true;
    this.viewProduct = false;
    this.editProduct = false;
    this.addProduct = false;
    this.getProducts();
  }

  openAddProdut() {
    this.tableSection = false;
    this.viewProduct = false;
    this.editProduct = false;
    this.addProduct = true;
  }

  closeAddProduct() {
    this.tableSection = true;
    this.viewProduct = false;
    this.editProduct = false;
    this.addProduct = false;
    this.getProducts();
  }
}
