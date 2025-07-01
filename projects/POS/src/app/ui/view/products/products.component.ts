import { Component, OnInit } from "@angular/core";
import { PosServiceService } from "../../service/pos-service.service";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BranchDTO,
  DiscountDTO,
  MeasurementUnit,
  ProductCategoryPOST,
  ProductData,
  ProductJSONFormat,
  ProductJSONFormatPOST,
} from "../../models/interface";
import { MessageService } from "primeng/api";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
// import { MatStartDate } from '@angular/material/datepicker';
import { filter, Observable } from "rxjs";
// import xlsx from 'node-xlsx';
// import * as XLSX from 'xlsx';
// import readXlsxFile from 'read-excel-file';
import { map } from "rxjs/operators";
import { Workbook, Worksheet } from "exceljs";
import { KeyValue } from "@angular/common";
import { ProductExcelColumns } from "../../models/enums";
import { ImageCacheService } from "../../service/image-cache.service";
import { MetadataService } from "../../service/metadata.service";
/**
 * Responsible for showing the list of available products in `admin/pos`
 *
 * @export
 * @class ProductsComponent
 * @typedef {ProductsComponent}
 * @implements {OnInit}
 */
@Component({
  selector: "app-products",
  templateUrl: "./products.component.html",
  styleUrl: "./products.component.scss",
  providers: [MessageService],
})
export class ProductsComponent implements OnInit {
  /**
   * The Product data from which the displayed items are generated from. Modify this as you wish, but don't forget to reset by to the `originalProducts` when required
   *
   * @type {ProductData[]}
   */
  products: ProductData[] = [];
  tableSections: boolean = false;
  imageUrl: string = "";
  /**
   * The product data fetched straight from the API. DO NOT TOUCH THIS
   *
   * @type {ProductData[]}
   */
  originalProducts: ProductData[] = [];
  viewProduct: boolean = false;
  addProduct: boolean = false;
  activeItem: any = {};
  isLoading = this.metadataService.loading$;

  /**
   * This stored the ids of any items in the table selected by their checkbox
   *
   * @type {number[]}
   */
  listOfSelectedItems: number[] = [];
  deleteModal: boolean = false;
  deleteMultipleItemsModal = false;
  editProduct: boolean = false;
  configureBarcode: boolean = false;

  discountTypes = [
    { label: "Periodic", value: "periodic" },
    { label: "Quantity Based", value: "quantityBased" },
    { label: "Global Discount", value: "globalDiscount" },
  ] as const;
  discountType: string[] = [];
  periodicDiscount: { startDate: string; endDate: string } = {
    startDate: "",
    endDate: "",
  };
  quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  productImage: any = "";
  tableSection: boolean = true;
  searchTerm: string = "";
  selectedCategories: number[] = [];
  selectedBranch: number = 1;

  categories: any[] = [];
  isImportDialogOpen = false;
  branches: BranchDTO[] = [];
  productTableHeaders = {
    sku: "SKU",
    code: "Code",
    name: "Name",
    price: "Price",
    quantity: "Quantity",
    category: "Category",
    action: "",
  } as const;
  sortingData = {
    headerToSort: this.productTableHeaders
      .sku as (typeof this.productTableHeaders)[keyof typeof this.productTableHeaders],
    order: "asc" as "asc" | "desc",
  };
  barcodeConfig = {
    barcodeType: "CODE128",
    barcodeQuantity: 1,
    variants: false,
  };
  barcodes = [
    { label: "CODE128 ", value: "CODE128" },
    // { label: 'CODE128 A/B/C', value: 'CODE128' },
    { label: "EAN-13", value: "EAN13" },
    { label: "EAN-8", value: "EAN8" },
    // { label: 'EAN-5', value: 'EAN5' },
    // { label: 'EAN-2', value: 'EAN2' },
    { label: "UPC (A)", value: "UPC" },
    { label: "UPC (E)", value: "UPC" },
    { label: "ITF", value: "ITF" },
    // { label: 'ITF-14', value: 'ITF14' },
    // { label: 'MSI10', value: 'MSI10' },
    // { label: 'MSI11', value: 'MSI11' },
    // { label: 'MSI1010', value: 'MSI1010' },
    // { label: 'MSI1110', value: 'MSI1110' },

    { label: "Codabar", value: "Codabar" },
    { label: "CODE39", value: "CODE39" },
  ] as const;

  measurementUnits = Object.keys(MeasurementUnit);

  /**
   * Populated from import spreadsheets
   *
   * @type {ProductJSONFormat[]}
   */
  parsedProductData: ProductJSONFormatPOST[] = [];

  /**
   * This is just to maintain the order used in `productTableHeaders` when it is iterated with `keyValue` in the html template
   * @param a
   * @param b
   * @returns
   */
  originalOrder = (
    a: KeyValue<string, string>,
    b: KeyValue<string, string>,
  ): number => 0;

  //paginator

  currentPage = 0;
  rowsPerPage = 15;
  /** Roughly a hundred years from now */
  private readonly _defaultExpiryDate = new Date(Date.now() + (100 * 365.25 * 24 * 60 * 60 * 1000));

  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,
    private http: HttpClient,
    private imageCacheService: ImageCacheService,
    public metadataService: MetadataService,
  ) {}

  ngOnInit(): void {
    this.loadCategory();
    this.getProducts();
    this.getDiscountTypes();
    this.metadataService.branches$.subscribe((data) => (this.branches = data));
    if (this.selectedBranch) {
      this.metadataService.setSelectedBranch(this.selectedBranch);
    }
    this.setRowsPerPageBasedOnScreenSize();

    window.addEventListener(
      "resize",
      this.setRowsPerPageBasedOnScreenSize.bind(this),
    );
  }
  ngOnDestroy() {
    window.removeEventListener(
      "resize",
      this.setRowsPerPageBasedOnScreenSize.bind(this),
    );
  }

  setRowsPerPageBasedOnScreenSize() {
    const height = window.innerWidth;

    if (height > 1000) {
      this.rowsPerPage = 21;
    } else if (height > 800) {
      this.rowsPerPage = 15;
    } else if (height > 600) {
      this.rowsPerPage = 10;
    } else {
      this.rowsPerPage = 5;
    }
  }

  toggleView() {
    this.tableSections = !this.tableSections;
  }

  get paginatedProducts() {
    const startIndex = this.currentPage * this.rowsPerPage;
    return this.products.slice(startIndex, startIndex + this.rowsPerPage);
  }

  onPageChange(event: any) {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
  }

  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(
      (value) => typeof value === "string" && value.trim() === "",
    );
  }

  getProducts() {
    this.metadataService.enrichedProduct$.subscribe(async (data) => {
      if (data) {
        this.originalProducts = data.sort((a: any, b: any) => {
          const dateA = new Date(
            a.createdDate[0],
            a.createdDate[1] - 1,
            a.createdDate[2],
            a.createdDate[3],
            a.createdDate[4],
            a.createdDate[5],
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5],
          );
          return dateB.getTime() - dateA.getTime();
        });
        this.products = [...this.originalProducts];
        console.log(this.products);
      } else {
        console.log("error loading data");
      }
    });

    // this.posService.getFilteredProductsWithDetails(this.selectedBranch).subscribe((data) => {
    //     if (data) {
    //     this.originalProducts = data.sort((a: any, b: any) => {
    //       const dateA = new Date(
    //         a.createdDate[0],
    //         a.createdDate[1] - 1,
    //         a.createdDate[2],
    //         a.createdDate[3],
    //         a.createdDate[4],
    //         a.createdDate[5]
    //       );
    //       const dateB = new Date(
    //         b.createdDate[0],
    //         b.createdDate[1] - 1,
    //         b.createdDate[2],
    //         b.createdDate[3],
    //         b.createdDate[4],
    //         b.createdDate[5]
    //       );
    //       return dateB.getTime() - dateA.getTime();
    //     });
    //     this.products = [...this.originalProducts];
    //     console.log(this.products)
    //     this.isLoading = false;
    //   } else {
    //     console.log('error loading data');
    //     this.isLoading = false;
    //   }
    // });
  }
  getDiscountTypes() {
    this.posService.getDiscountTypes().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.discountTypes = data;
      } else {
        console.log("error loading data");
      }
    });
  }
  loadCategory() {
    this.posService.getCategories().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.categories = data;
      } else {
        console.log("error loading data");
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
        this.selectedCategories.includes(product.productCategory?.id),
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
            severity: "success",
            summary: "Product deleted",
            detail: `Product deleted successfully`,
            key: "tl",
            life: 3000,
          });
        }
      });
  }
  toggleSelectedItemInList(item: ProductData) {
    const id = item.id;

    if (this.listOfSelectedItems.includes(id)) {
      this.listOfSelectedItems = this.listOfSelectedItems.filter(
        (itemId) => itemId !== id,
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
              data,
            )}`,
          );
        } else {
          this.deleteMultipleItemsModal = false;
          this.getProducts();
          this.messageService.add({
            severity: "success",
            summary: "Product deleted",
            detail: `Product deleted successfully`,
            key: "tl",
            life: 3000,
          });
        }
      });

      // Remove the ID from the list
      this.listOfSelectedItems = this.listOfSelectedItems.filter(
        (itemId) => itemId !== id,
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
    console.log("modal open", this.deleteModal);
    this.deleteModal = !this.deleteModal;
  }
  toggleMultiDeleteModal() {
    this.deleteMultipleItemsModal = !this.deleteMultipleItemsModal;
  }

  openEdit(item: any = {}) {
    this.activeItem = item;
    console.log("view", item);
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
    if (!this.isImportDialogOpen) this.#clearImportedProductData();
  }
  #clearImportedProductData() {
    this.parsedProductData.length = 0;
  }

  async processExcelImport(xlsxImport: File) {
    this.#clearImportedProductData();
    const workbook = new Workbook();
    // Read the file data
    await workbook.xlsx.load(await xlsxImport.arrayBuffer());
    // console.log(workbook);
    const worksheet = workbook.getWorksheet("Products to Add") as Worksheet;
    // console.log(this.products);
    // const workSheetImages = worksheet.getImages();
    // // Just something to easily arrange the images in a sensible order
    // console.log(worksheet.getCell('C2'));
    // let mappedImages: Map<{ row: number; column: number }, number> = new Map();
    // workSheetImages.forEach((image) => {
    //   console.log(
    //     `Image anchored at row ${image.range.tl.nativeRow}, col ${image.range.tl.nativeCol}. It's data is: `
    //   );
    //   console.log(image);
    //   console.log(worksheet.model.media);
    //   // const media = (worksheet.model.media).find((m) => m.index === image.imageId);
    // });
    for (let i = 2; i < 999; i++) {
      const row = worksheet.getRow(i);

      const name = row.getCell(ProductExcelColumns.NAME + 1).text;
      if (name == "Dummy Product" || name == "") continue;
      const description = row.getCell(ProductExcelColumns.DESCRIPTION + 1).text;
      // Just some simple validation on the string provided, other it'll default to a dummy image
      const imgUrl = ((url: string) => {
        try {
          new URL(url);
          return url;
        } catch (_) {
          return "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWN8hLKJungcUipWLReON9fse4yZcyB0rzNw&s";
        }
      })(row.getCell(ProductExcelColumns.IMAGE_URL + 1).text);
      // TODO: Add error handling
      const imgBlob = await (await fetch(imgUrl)).blob();
      const imgFile = new File([imgBlob], "img.jpg", {
        type: imgBlob.type,
      });
      console.log(imgFile);
      const branchName = row.getCell(ProductExcelColumns.BRANCH + 1).text;
      const code = parseInt(row.getCell(ProductExcelColumns.CODE + 1).text);
      const basePrice = parseInt(
        row.getCell(ProductExcelColumns.BASE_PRICE + 1).text,
      );
      const taxPercentage = parseInt(
        row.getCell(ProductExcelColumns.TAX_PERCENTAGE + 1).text,
      );
      const discountName = row.getCell(
        ProductExcelColumns.DISCOUNT_NAME + 1,
      ).text;
      const quantity = parseInt(
        row.getCell(ProductExcelColumns.QUANTITY + 1).text,
      );
      const sku = parseInt(row.getCell(ProductExcelColumns.SKU + 1).text);
      const partNumber = parseInt(
        row.getCell(ProductExcelColumns.PART_NUMBER + 1).text,
      );
      const categoryName = row.getCell(ProductExcelColumns.CATEGORY + 1).text;
      const variantNames = row
        .getCell(ProductExcelColumns.VARIANTS + 1)
        .text.split(",");
      const weight = parseInt(
        row.getCell(ProductExcelColumns.ITEM_WEIGHT + 1).text,
      );

      let discount: DiscountDTO = {} as any;
      let productCategory: ProductCategoryPOST = {} as any;
      let branch: string = branchName;

      this.products.forEach((product) => {
        // if (product.discount.name == discountName) {
        //   discount = structuredClone(product.discount);
        // }
        if (product.productCategory.name == categoryName) {
          productCategory = structuredClone(product.productCategory);
        }
      });

      this.parsedProductData.push({
        id: 0 || (Math.random().toString(36).substr(2, 50) as any),
        createdDate: new Date().toISOString(),
        createdBy: "",
        costPrice: (
          basePrice -
          (basePrice * discount.value) / 100 -
          (basePrice * taxPercentage) / 100
        ).toFixed(2),
        // effectiveQuantity: quantity,
        variant: "",
        productImages: [
          {
            id: 54,
            name: "Opera Snapshot_2025-02-03_030901_localhost.png",
            imgNo: "d03BR3TK6L3",
          },
        ],
        variants: [],
        name: name,
        description: description,
        // branch: branch,
        code: code.toString(),
        // originalPurchasePrice: basePrice.toString(),
        tax: { rate: taxPercentage, name: "" },
        // quantity: 0,
        discount: discount,
        // initialQuantity: quantity,
        sku: sku.toString(),
        partNumber: partNumber.toString(),
        productCategory: productCategory,
        weight: weight,
        expiryDate:this._defaultExpiryDate.toISOString()
      });

      // // REVIEW: PLEASE REDO THIS
      // const userName = sessionStorage.getItem('username');
      // const formData = new FormData();
      // formData.append('product', JSON.stringify(product));
      // formData.append('files', new File());
    }
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
    header: (typeof this.productTableHeaders)[keyof typeof this.productTableHeaders],
  ) {
    if (header == "") return;
    else {
      // Check if the param and the currently chosen header are the same, if so, invert its order
      if (header == this.sortingData.headerToSort) {
        this.sortingData.order =
          this.sortingData.order == "asc" ? "desc" : "asc";
      } else {
        // Switch to the param's value
        this.sortingData.headerToSort = header;
      }

      // Sort the products
      this.products.sort((productA, productB) => {
        let productAVal: string | number, productBVal: string | number;

        switch (header) {
          case "Code":
            productAVal = productA.code;
            productBVal = productB.code;
            break;
          case "SKU":
            productAVal = productA.sku;
            productBVal = productB.sku;
            break;
          case "Name":
            productAVal = productA.name;
            productBVal = productB.name;
            break;
          // case 'Price':
          //   productAVal = parseInt(productA.effectivePrice);
          //   productBVal = parseInt(productB.effectivePrice);
          //   break;
          // case 'Quantity':
          //   productAVal = productA.effectiveQuantity;
          //   productBVal = productB.effectiveQuantity;
          //   break;
          case "Category":
            productAVal = productA.productCategory.name;
            productBVal = productB.productCategory.name;
            break;
          default:
            productAVal = 0;
            productBVal = 0;
        }

        if (typeof productAVal == "number" && typeof productBVal == "number") {
          return this.sortingData.order == "asc"
            ? productBVal - productAVal
            : productAVal - productBVal;
        } else {
          const valA = productAVal.toString().toLocaleLowerCase();
          const valB = productBVal.toString().toLocaleLowerCase();
          return this.sortingData.order == "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
      });
    }
  }

  promptBarcode(item: any, op: any) {
    op.hide();

    this.configureBarcode = true;
    this.activeItem = item;
  }

  printBarcode() {
    this.generateBarcode(true);
  }

  generateBarcode(shouldPrint?: boolean) {
    const barcodes: { svg: SVGSVGElement; text: string }[] = [];

    const sku = this.activeItem?.sku;
    if (typeof sku === "string") {
      const displayValue = `${(
        this.activeItem.name?.split(" ")[0] || ""
      ).toLowerCase()}-${sku}`;

      for (let i = 0; i < this.barcodeConfig.barcodeQuantity; i++) {
        const barcodeSvg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        JsBarcode(barcodeSvg, sku, {
          format: this.barcodeConfig.barcodeType,
          lineColor: "#000",
          width: 3,
          height: 150,
          displayValue: true,
          text: displayValue,
        });
        barcodes.push({ svg: barcodeSvg, text: displayValue });
      }
    } else {
      alert("Please fill in the SKU with valid data.");
    }

    if (Array.isArray(this.activeItem?.variants)) {
      this.activeItem.variants.forEach(
        (variant: { sku: string; name: string; quantity: number }) => {
          const variantSKU = variant?.sku;
          if (typeof variantSKU === "string") {
            const displayValue = `${(
              variant.name?.split(" ")[0] || ""
            ).toLowerCase()}-${variantSKU}`;

            for (let i = 0; i < variant.quantity; i++) {
              const barcodeSvg = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg",
              );
              JsBarcode(barcodeSvg, variantSKU, {
                format: this.barcodeConfig.barcodeType,
                lineColor: "#000",
                width: 3,
                height: 150,
                displayValue: true,
                text: displayValue,
              });
              barcodes.push({ svg: barcodeSvg, text: displayValue });
            }
          }
        },
      );
    }

    // Convert and print each barcode separately
    if (shouldPrint) {
      this.printBarcodesSeparately(barcodes);
    }
  }

  printBarcodesSeparately(barcodes: { svg: SVGSVGElement; text: string }[]) {
    barcodes.forEach((barcode, index) => {
      setTimeout(() => {
        const svgString = new XMLSerializer().serializeToString(barcode.svg);
        const encodedSvg = encodeURIComponent(svgString);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);

          const imgData = canvas.toDataURL("image/png");
          this.printSingleImage(imgData);
        };
        img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      }, index * 1500); // Small delay to ensure separate print jobs
    });
  }

  printSingleImage(imgSrc: string) {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(`
        <html>
        <head>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
              img { max-width: 100%; max-height: 100%; }
            }
          </style>
        </head>
        <body>
          <img src="${imgSrc}">
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 5000);
      }, 500);
    }
  }

  convertSvgToPng(svgElement: Node, shouldPrint?: boolean) {
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("width", "300");
    svgClone.setAttribute("height", "150");

    if (shouldPrint) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
            <html>
            <head>
              <title>Print Barcode</title>
              <style>
                @media print {
                  body { margin: 0; padding: 0; }
                  @page { size: auto; margin: 0; }
                }
              </style>
            </head>
            <body onload="window.print();">
              ${new XMLSerializer().serializeToString(svgClone)}
            </body>
            </html>
          `);
        doc.close();

        setTimeout(() => document.body.removeChild(iframe), 5000);
      }
    } else {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const encodedSvg = encodeURIComponent(svgString);
      const imgSrc = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      this.generatePDF(imgSrc);
    }
  }

  generatePDF(imgData: string) {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (100 * pdfWidth) / 200;

    const padding = 10;
    const barcodeWidth = 150;
    const barcodeHeight = 50;
    const itemsPerRow = Math.floor((pdfWidth - 2 * padding) / pdfWidth);
    let currentX = padding;
    let currentY = padding;

    for (let i = 0; i < this.barcodeConfig.barcodeQuantity; i++) {
      pdf.addImage(
        imgData,
        "PNG",
        currentX,
        currentY,
        barcodeWidth,
        barcodeHeight,
      );

      currentX += pdfWidth;
      if ((i + 1) % itemsPerRow === 0) {
        currentX = padding;
        currentY += barcodeHeight + padding;
      }

      if (currentX + pdfWidth > pdf.internal.pageSize.getWidth()) {
        currentX = padding;
        currentY += pdfHeight + padding;
      }

      if (currentY + pdfHeight + padding > pdf.internal.pageSize.getHeight()) {
        pdf.addPage();
        currentX = padding;
        currentY = padding;
      }
    }

    pdf.save("barcodes.pdf");
  }
}
