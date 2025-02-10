import { Component, OnInit } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ProductData, ProductJSONFormat } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
// import { MatStartDate } from '@angular/material/datepicker';
import { filter } from 'rxjs';
// import xlsx from 'node-xlsx';
// import * as XLSX from 'xlsx';
// import readXlsxFile from 'read-excel-file';
import { map } from 'rxjs/operators';
import { Workbook } from 'exceljs';
import { KeyValue } from '@angular/common';
/**
 * Responsible for showing the list of available products in `admin/pos`
 *
 * @export
 * @class ProductsComponent
 * @typedef {ProductsComponent}
 * @implements {OnInit}
 */
@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  providers: [MessageService],
})
export class ProductsComponent implements OnInit {
  /**
   * The Product data from which the displayed items are generated from. Modify this as you wish, but don't forget to reset by to the `originalProducts` when required
   *
   * @type {ProductData[]}
   */
  products: ProductData[] = [];

  /**
   * The product data fetched straight from the API. DO NOT TOUCH THIS
   *
   * @type {ProductData[]}
   */
  originalProducts: ProductData[] = [];
  viewProduct: boolean = false;
  addProduct: boolean = false;
  activeItem: any = {};

  /**
   * This stored the ids of any items in the table selected by their checkbox
   *
   * @type {number[]}
   */
  listOfSelectedItems: number[] = [];
  deleteModal: boolean = false;
  deleteMultipleItemsModal = false;
  editProduct: boolean = false;

  discountTypes = [
    { label: 'Periodic', value: 'periodic' },
    { label: 'Quantity Based', value: 'quantityBased' },
    { label: 'Global Discount', value: 'globalDiscount' },
  ] as const;
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
  isImportDialogOpen = false;

  productTableHeaders = {
    sku: 'SKU',
    code: 'Code',
    name: 'Name',
    price: 'Price',
    quantity: 'Quantity',
    category: 'Category',
    action: 'Action',
  } as const;
  sortingData = {
    headerToSort: this.productTableHeaders
      .sku as (typeof this.productTableHeaders)[keyof typeof this.productTableHeaders],
    order: 'asc' as 'asc' | 'desc',
  };

  /**
   * This is just to maintain the order used in `productTableHeaders` when it is iterated with `keyValue` in the html template
   * @param a
   * @param b
   * @returns
   */
  originalOrder = (
    a: KeyValue<string, string>,
    b: KeyValue<string, string>
  ): number => 0;

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
  toggleSelectedItemInList(item: ProductData) {
    const id = item.id;

    if (this.listOfSelectedItems.includes(id)) {
      this.listOfSelectedItems = this.listOfSelectedItems.filter(
        (itemId) => itemId !== id
      );
    } else {
      this.listOfSelectedItems.push(id);
    }
  }

  // TODO: At the end of the loop, show the number of items deleted succesfully and those that didn't
  deleteSelectedProducts(ids: number[] = this.listOfSelectedItems) {
    ids.forEach((id) => {
      this.posService.deleteProduct(id).subscribe(async (data) => {
        if (data) {
          console.log(
            `Product with id ${id} deleted successfully. It's data was ${JSON.stringify(
              data
            )}`
          );
        } else {
          this.deleteMultipleItemsModal = false;
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

      // Remove the ID from the list
      this.listOfSelectedItems = this.listOfSelectedItems.filter(
        (itemId) => itemId !== id
      );
    });

    this.toggleMultiDeleteModal();
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
  toggleMultiDeleteModal() {
    this.deleteMultipleItemsModal = !this.deleteMultipleItemsModal;
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

  toggleImportDialog() {
    this.isImportDialogOpen = !this.isImportDialogOpen;
  }

  async processExcelImport(xlsxImport: File) {
    const workbook = new Workbook();
    // Read the file data
    await workbook.xlsx.load(await xlsxImport.arrayBuffer());
    console.log(workbook);
    //   console.log(xlsxImport);
    //   const worksheet = await readXlsxFile(xlsxImport);
    //   console.log(worksheet);
    //   worksheet.forEach((row, index) => {
    //     if (index >= 1) {
    //       let basePrice = parseFloat(
    //         row[ProductExcelColumns.BASE_PRICE] as string
    //       );
    //       let discountPercentage = parseFloat(
    //         row[ProductExcelColumns.DISCOUNT_PERCENTAGE] as string
    //       );
    //       let taxPercentage = parseFloat(
    //         row[ProductExcelColumns.TAX_PERCENTAGE] as string
    //       );
    //       // Validate numeric fields
    //       if (
    //         isNaN(basePrice) ||
    //         isNaN(discountPercentage) ||
    //         isNaN(taxPercentage)
    //       ) {
    //         console.error(
    //           `Invalid data at row ${index + 1}. Falling back to default data`
    //         );
    //         basePrice = isNaN(basePrice) ? 0 : basePrice;
    //         discountPercentage = isNaN(discountPercentage)
    //           ? 0
    //           : discountPercentage;
    //         taxPercentage = isNaN(taxPercentage) ? 0 : taxPercentage;
    //         return;
    //       }
    //       const effectivePrice = (
    //         basePrice -
    //         (basePrice * discountPercentage) / 100 -
    //         (basePrice * taxPercentage) / 100
    //       ).toFixed(2);
    //       const product: ProductJSONFormat = {
    //         id: 0,
    //         createdDate: new Date().toISOString(),
    //         createdBy: '',
    //         effectivePrice: effectivePrice,
    //         effectiveQuantity: row[ProductExcelColumns.QUANTITY] as number,
    //         variant: '',
    //         productImages: [],
    //         variants: [],
    //         name: row[ProductExcelColumns.NAME] as string,
    //         description: row[ProductExcelColumns.DESCRIPTION] as string,
    //         branch: row[ProductExcelColumns.BRANCH] as string,
    //         code: row[ProductExcelColumns.CODE] as string,
    //         initialPrice: basePrice.toString(),
    //         tax: taxPercentage,
    //         discount: {
    //           id: 0,
    //           name: row[ProductExcelColumns.DISCOUNT_NAME] as string,
    //           value: discountPercentage,
    //           discountType: row[ProductExcelColumns.DISCOUNT_TYPE] as string,
    //           startDate: '',
    //           endDate: '',
    //           minQuantity: 0,
    //         },
    //         initialQuantity: row[ProductExcelColumns.QUANTITY] as number,
    //         sku: row[ProductExcelColumns.SKU] as string,
    //         partNumber: row[ProductExcelColumns.PART_NUMBER] as string,
    //         productCategory: row[ProductExcelColumns.CATEGORY] as any,
    //         weight: row[ProductExcelColumns.ITEM_WEIGHT] as number,
    //       };
    //       const formData = new FormData();
    //       formData.append('product', JSON.stringify(product));
    //       console.log(formData);
    //       this.posService.addProduct(formData).subscribe(
    //         async (data) => {
    //           if (data) {
    //             this.messageService.add({
    //               severity: 'success',
    //               summary: 'Product Added',
    //               detail: 'Product added successfully.',
    //               key: 'tl',
    //               life: 3000,
    //             });
    //           } else {
    //             this.messageService.add({
    //               severity: 'error',
    //               summary: 'Failed',
    //               detail: 'Failed, please try again.',
    //               key: 'tl',
    //               life: 3000,
    //             });
    //           }
    //         },
    //         (error) => {
    //           this.messageService.add({
    //             severity: 'error',
    //             summary: 'Error',
    //             detail: 'Unexpected error occurred, please try again later.',
    //             key: 'tl',
    //             life: 3000,
    //           });
    //         }
    //       );
    //     }
    //   });
  }
  sortProductsByHeader(
    header: (typeof this.productTableHeaders)[keyof typeof this.productTableHeaders]
  ) {
    if (header == 'Action') return;
    else {
      // Check if the param and the currently chosen header are the same, if so, invert its order
      if (header == this.sortingData.headerToSort) {
        this.sortingData.order =
          this.sortingData.order == 'asc' ? 'desc' : 'asc';
      } else {
        // Switch to the param's value
        this.sortingData.headerToSort = header;
      }

      // Sort the products
      this.products.sort((productA, productB) => {
        let productAVal: string | number, productBVal: string | number;

        switch (header) {
          case 'Code':
            productAVal = productA.code;
            productBVal = productB.code;
            break;
          case 'SKU':
            productAVal = productA.sku;
            productBVal = productB.sku;
            break;
          case 'Name':
            productAVal = productA.name;
            productBVal = productB.name;
            break;
          case 'Price':
            productAVal = parseInt(productA.effectivePrice);
            productBVal = parseInt(productB.effectivePrice);
            break;
          case 'Quantity':
            productAVal = productA.effectiveQuantity;
            productBVal = productB.effectiveQuantity;
            break;
          case 'Category':
            productAVal = productA.productCategory.name;
            productBVal = productB.productCategory.name;
            break;
          default:
            productAVal = 0;
            productBVal = 0;
        }

        if (typeof productAVal == 'number' && typeof productBVal == 'number') {
          return this.sortingData.order == 'asc'
            ? productBVal - productAVal
            : productAVal - productBVal;
        } else {
          const valA = productAVal.toString().toLocaleLowerCase();
          const valB = productBVal.toString().toLocaleLowerCase();
          return this.sortingData.order == 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
      });
    }
  }
}
