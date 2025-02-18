import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { HistoryData, ProductData, supplierData } from '../ui/models/interface';


@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss'
})
export class InformationComponent {
  // getDisplayName(supplier: any): string {
  //   return (supplier && typeof supplier === 'object') ? supplier.supplierName : supplier;
  supplier: supplierData;
  //@ts-ignore
  @Input() activeItem: ProductData;
  @Input() updatedProduct: any; 
 private revivedDate: Date;
  products: HistoryData = new Map();
   productHistory:ProductData[] = [];
   isEditing: boolean[] = [];
  // route: any;
  selectedOption: string = '';

  constructor(public router: Router) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['supplier']) {
      this.supplier = navigation.extras.state['supplier'];
    } else {
      const storedSupplier = localStorage.getItem('lastSelectedSupplier');
      this.supplier = storedSupplier ? JSON.parse(storedSupplier) : null;
    }
    this.revivedDate = new Date(this.supplier.createdAt);
  }
  ngOnInit(): void {
    // Check if navigation state exists and load supplier data from there
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['supplierData']) {
      this.supplier = navigation.extras.state['/supplierData'];
      console.log("Supplier loaded from navigation state:", this.supplier);
    } else {
      // If no navigation state, try to load from localStorage
      const storedSupplier = localStorage.getItem('lastSelectedSupplier');
      this.supplier = storedSupplier ? JSON.parse(storedSupplier) : null;
      console.log("Supplier loaded from localStorage:", this.supplier);
    }
   
  


     const savedSelectedOption = localStorage.getItem('selectedOption');
          if (savedSelectedOption) {
            this.selectedOption = JSON.parse(savedSelectedOption);
          }
        
          const savedProducts = localStorage.getItem('products');
          this.products = savedProducts ? new Map(JSON.parse(savedProducts)) : new Map();
          
          if (!this.activeItem) {
            const savedProducts = localStorage.getItem('products');
            if (savedProducts) {
              const productList: HistoryData = new Map(JSON.parse(savedProducts));
              this.activeItem = (productList.values().next().value as ProductData[])[0]; // Choose first product if none set
            }
          }
        
          this.productHistory = this.products.get(this.activeItem.id) || [];
          this.isEditing = this.productHistory.map(() => false);
  

    console.log("Product History:", this.productHistory);

    // If supplier is not found from either source
    if (!this.supplier) {
      console.error("No supplier data available.");
    }
  }
  get Date(){
  
    return this.revivedDate.getDate();
  }
  get Time(){
    return `${this.revivedDate.getHours()}:${this.revivedDate.getMinutes()}`;
  }
  
}
