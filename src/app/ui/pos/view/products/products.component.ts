import { Component, OnInit } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Product } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatStartDate } from '@angular/material/datepicker';
@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  providers: [MessageService]
})
export class ProductsComponent implements OnInit {


productData = {
  name: "",
  code: "",
  description: "",
  sku: "",
  weight: 0,
  initialPrice: "",
  effectivePrice: "",
  initialQuantity: 0,
  effectiveQuantity: 0,
  partNumber: "",
  tax: 0,
  branch: "",
  variant: "",
  discount: 0,
  category: "",
  id: 0,
  count: 0,
  discountType: [] as string[],
  discountValue: 0,
  image: "",
  startDate: "",
  endDate: "",
  discountMinQuantity: 0
}

categoryData = {
  name: "",
  code: "",
  description: "",
}

barcodeConfig = {
  barcodeType: 'CODE128',
  barcodeQuantity: 1
}

  products = this.posService.products 
  viewProduct: boolean = false
  addProduct: boolean = false;
  activeItem: any = {}
  deleteModal: boolean = false;
  editProduct: boolean = false
  newCategory: string = '';
  categories: any[] = []
  addSuccessfull: boolean = false
  configureBarcode: boolean = false
  barcodes: any[] = [
    { label: 'CODE128 ', value: 'CODE128' },
    {label: 'CODE128 A/B/C', value: 'CODE128'},
    {label: 'EAN-13', value: 'EAN13'},
    {label: 'EAN-8', value: 'EAN8'},
    {label: 'EAN-5', value: 'EAN5'},
    {label: 'EAN-2', value: 'EAN2'},
    {label: 'UPC (A)', value: 'UPC'},
    {label: 'UPC (E)', value: 'UPC'},
    {label: 'ITF', value: 'ITF'},
    {label: 'ITF-14', value: 'ITF14'},
    {label: 'MSI10', value: 'MSI10'},
    {label: 'MSI11', value: 'MSI11'},
    {label: 'MSI1010', value: 'MSI1010'},
    {label: 'MSI1110', value: 'MSI1110'},
  ]

  branches: any[] = [
    { label: 'HQT', value: 'headquarter' },
    {label: 'wuse', value: 'Wuse'}
    ]
  selectedBranch: any[] = []
  newVariant = {
    name: '',
    price: '',
    quantity: '',
    sku: ''
  };
  variants: any[] = [];
  discountTypes = [
    { label: 'Periodic', value: 'periodic' },
    { label: 'Quantity Based', value: 'quantityBased' },
    { label: 'Global Discount', value: 'globalDiscount' }
  ];
  discountType: string[] = []
  periodicDiscount: { startDate: string, endDate: string } = { startDate: '', endDate: '' };
  quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  selectedCategory: string=  ""
  openCategories: boolean = false
  openAddCategory: boolean = false
  openAddVariant: boolean = false

  tableSection: boolean = true;
  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,  private http: HttpClient
  ) {
  }

  ngOnInit(): void {
this.loadCategory()
this.getProducts()
  }

  productCode: string = '5901234123457';

  openGenerateBarcode() {
    this.configureBarcode = true
    this.addSuccessfull = false
  }

  generateBarcode() {
    
    const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(barcodeSvg, this.productCode, {
      format: this.barcodeConfig.barcodeType,
      lineColor: '#000',
      width: 1,
      height: 50,
      displayValue: true
    });


    this.convertSvgToPng(barcodeSvg);
  }
  
  convertSvgToPng(svgElement: Node) {
    const svgString = new XMLSerializer().serializeToString(svgElement);
    
    const encodedSvg = encodeURIComponent(svgString);
    
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
  
      const imgData = canvas.toDataURL('image/png');
      this.generatePDF(imgData);
    };
  
    img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  }
  
  generatePDF(imgData: string) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
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
      pdf.addImage(imgData, 'PNG', currentX, currentY, barcodeWidth, barcodeHeight);
  
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
  
    pdf.save('barcodes.pdf');
  }

  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(value => typeof value === 'string' && value.trim() === '');
  }

  getProducts() {
    this.posService.getProducts().subscribe(
      async (data) => {
        console.log(data)
        if (data) {
          
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
  addCategory() {
    const categoryDetails = {
      name: this.categoryData.name,
      code: this.categoryData.code,
      description: this.categoryData.description
    }

    if (this.checkForEmptyFields(this.categoryData)) {
      console.log("all fiellds are required")
        this.messageService.add({ severity: 'error', summary: 'warn', detail: 'All fields are required' , key: 'tl', life: 3000 });
    } else {
            this.posService.addCategory(categoryDetails).subscribe(
              async (data) => {
            console.log(data)
            if (data) {
              this.messageService.add({ severity: 'success', summary: 'Category Added', detail: 'Category added successfully.', key: 'tl', life: 3000 });
              this.categoryData = {
                name: "",
                code: "",
                description: "",
              }
            } else {
              this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Failed, please try again.', key: 'tl', life: 3000 });
            }
                },
                (error: HttpErrorResponse) => {
                  if (error.status === 500) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Check form details and try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 404) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Error, try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 0) {
                    this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.', key: 'tl', life: 3000 });
                  } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An unexpected error occurred.', key: 'tl', life: 3000 });
                  }
                }
            );}
  
  }
  
  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productData.image = e.target.result;
      };
      reader.readAsDataURL(file);
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
  addToProduct(){
   const product = {
        name: this.productData.name,
        code: this.productData.code,
        description: this.productData.description,
        sku: this.productData.sku,
        weight: this.productData.weight,
        initialPrice: this.productData.initialPrice,
        effectivePrice: this.productData.effectivePrice,
        initialQuantity: this.productData.initialQuantity,
        effectiveQuantity: this.productData.effectiveQuantity,
        partNumber: this.productData.partNumber,
        tax: this.productData.tax,
        branch: this.productData.branch[0],
        discount: {
          name: this.productData.discountType.join(" and "),
          value: this.productData.discountValue,
          startDate: this.productData.startDate,
          endDate: this.productData.endDate,
          minQuantity: this.productData.discountMinQuantity,
          discountType: this.productData.discountType.join(" and ")
        },
        category: this.productData.category,
     
    }
    if (this.checkForEmptyFields(product)) {
      console.log("all fiellds are required")
        this.messageService.add({ severity: 'error', summary: 'warn', detail: 'All fields are required' , key: 'tl', life: 3000 });
    } else {
            this.posService.addProduct(product).subscribe(
              async (data) => {
            console.log(data)
            if (data) {
            
            } else {
              this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Failed, please try again.', key: 'tl', life: 3000 });
            }
                },
                (error: HttpErrorResponse) => {
                  if (error.status === 500) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Check form details and try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 404) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Error, try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 0) {
                    this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.', key: 'tl', life: 3000 });
                  } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An unexpected error occurred.', key: 'tl', life: 3000 });
                  }
                }
            );}
   
  }
  selectCategory(category: string) {
    this.selectedCategory = category;
    this.openCategories = false;
    this.productData.category = category
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
