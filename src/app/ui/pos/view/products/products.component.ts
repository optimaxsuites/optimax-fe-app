import { Component, OnInit } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
// import JsBarcode from 'jsbarcode';
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';
@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',

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
  barcodeType: string = 'CODE128'
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
    private posService: PosServiceService,
  ) {
  }

  ngOnInit(): void {
 
  }

  productCode: string = '5901234123457';

  // generateBarcode() {
    
  //   const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  //   JsBarcode(barcodeSvg, this.productCode, {
  //     format: this.barcodeType,
  //     lineColor: '#000',
  //     width: 1,
  //     height: 50,
  //     displayValue: true
  //   });


  //   this.convertSvgToPng(barcodeSvg);
  // }
  
  // convertSvgToPng(svgElement: Node) {
  //   const svgString = new XMLSerializer().serializeToString(svgElement);
    
  //   const encodedSvg = encodeURIComponent(svgString);
    
  //   const img = new Image();
    
  //   img.onload = () => {
  //     const canvas = document.createElement('canvas');
  //     const ctx = canvas.getContext('2d');
  //     canvas.width = img.width;
  //     canvas.height = img.height;
  //     ctx?.drawImage(img, 0, 0);
  
  //     const imgData = canvas.toDataURL('image/png');
  //     this.generatePDF(imgData);
  //   };
  
  //   img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  // }
  
  // generatePDF(imgData: string) {
  //   const pdf = new jsPDF({
  //     orientation: 'portrait',
  //     unit: 'px',
  //     format: 'a4'
  //   });
  
  //   const pdfWidth = pdf.internal.pageSize.getWidth();
  //   const pdfHeight = (100 * pdfWidth) / 200; 

  //   const padding = 10;
  //   const barcodeWidth = 150;
  //   const barcodeHeight = 50;
  //   const itemsPerRow = Math.floor((pdfWidth - 2 * padding) / pdfWidth);
  //   let currentX = padding;
  //   let currentY = padding;
  
  //   for (let i = 0; i < 10; i++) {
  //     pdf.addImage(imgData, 'PNG', currentX, currentY, barcodeWidth, barcodeHeight);
  
  //     currentX += pdfWidth;
  //     if (currentX + pdfWidth > pdf.internal.pageSize.getWidth()) {
  //       currentX = padding;
  //       currentY += pdfHeight + padding;
  //     }

  //     if (currentY + pdfHeight + padding > pdf.internal.pageSize.getHeight()) {
  //       pdf.addPage();
  //       currentX = padding;
  //       currentY = padding;
  //     }
  //   }
  
  //   pdf.save('barcodes.pdf');
  // }
  
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
