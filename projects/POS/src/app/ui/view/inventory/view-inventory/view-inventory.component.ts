import { Component, Input, Output, EventEmitter } from '@angular/core';
import { HistoryData, ProductData, supplierData } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-view-inventory',
  templateUrl: './view-inventory.component.html',
  styleUrl: './view-inventory.component.scss'
})

export class ViewInventoryComponent {

  //@ts-ignore
  @Input() activeItem: ProductData;  // Ensure this property exists
  @Output() edit = new EventEmitter<any>(); // Event emitters for outputs
  @Output() close = new EventEmitter<void>();
  @Input() updatedProduct: any; 

  productHistory:ProductData[] = [];
  //@ts-ignore
  revivedDate: Date;
  savedBranches: any[] = []; // Declare it here
  index = 0;
  currentIndex: number = 0;
  selectedHistory: any; 
  currentPriceAndQuantity: any[] = [];
  products: HistoryData = new Map();
  selectedOption: string = '';
  viewProduct: boolean = false;
  //activeItem: any | null = null;
  editInventory: boolean = false;
  isEditing: boolean[] = [];

 
  constructor(private router: Router, private posService: PosServiceService, private messageService: MessageService) { 
    this.revivedDate = new Date(); 
    
  }

  ngOnInit() {
    if (this.productHistory.length > 0) {
      this.revivedDate = new Date(this.productHistory[0].createdDate); // Use first item's date
    } else {
      this.revivedDate = new Date(); // Fallback if no history exists
    }
  
    const productId = history.state.productId; // Get product ID from navigation state
    const savedProducts = localStorage.getItem('products');
    this.products = savedProducts ? new Map(JSON.parse(savedProducts)) : new Map();
        
    if (!this.activeItem) {
      const savedProducts = localStorage.getItem('products');
      if (savedProducts) {
        const productList: HistoryData = new Map(JSON.parse(savedProducts));
        this.activeItem = (productList.values().next().value as ProductData[])[0]; // Choose first product if none set
      }
    }
  
    const supplierDataString = localStorage.getItem('selectedSupplier');
    const supplier: supplierData | null = supplierDataString ? JSON.parse(supplierDataString) : null;
  
    const pricingQuantityString = localStorage.getItem('pricingQuantity');
    const pricingQuantity = pricingQuantityString ? JSON.parse(pricingQuantityString) : null;
  
    this.productHistory = this.products.get(this.activeItem.id) || [];
    this.productHistory = this.productHistory.map(product => ({
      ...product,
      supplier: product.supplier || supplier,// Retain existing supplier or assign new
      pricingQuantity: product.pricingQuantity || pricingQuantity
    }));
  
    console.log("Product History:", this.productHistory);
    this.isEditing = this.productHistory.map(() => false);
  }

  get Timestamp() {
    return this.revivedDate.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
  
    });
  }

  

openSupplierDetails(item: ProductData, ) {
  const supplierData = localStorage.getItem('selectedSupplier');
  if (supplierData) {
    const supplier = JSON.parse(supplierData);
    // Navigate to the supplier details page, passing the supplier data via state
    console.log("Retrieved Supplier Data:", item);
    this.router.navigate(['/supplier-details'], { state: { supplierData: item } });
    console.log("Supplier Data:", supplier);

    const data = localStorage.getItem('fullHistories');   
    if (data ) {
      const parsedData = JSON.parse(data);
      
      if (parsedData.length > 0){
        console.log(`Showing History ${this.currentIndex + 1}:`, parsedData[this.currentIndex]);

      this.selectedHistory = parsedData[this.currentIndex]; 

      this.currentIndex++; // Move to the next history

      }
    }

    } else {

    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Supplier Information Not Available ',
      life: 3000,
      key: 'tg'
    });

    }
    
}


viewHistory(index: number) {
  const data = localStorage.getItem('fullHistories');
  if (data) {
    const parsedData = JSON.parse(data);
    console.log(`Product_History ${index}:`, parsedData[index]); 

      if (parsedData[index]) {
        this.selectedHistory = parsedData[index]; 
      } else {
        console.log(`No history found for index ${index}`);
        this.selectedHistory = null; 
      }
    }
  }
  


triggerEdit() {
  this.edit.emit(this.activeItem);
}
 
  
triggerClose() {
  this.close.emit();
}

closeEdit() {
  this.close.emit();
}
    
printPage() {
  const printContents = document.getElementById('printable-area')?.innerHTML;
  if (printContents) {
    const originalContents = document.body.innerHTML;

    // Replace the body content with the printable section
    document.body.innerHTML = printContents;
    window.print();

    // Restore the original content after printing
    document.body.innerHTML = originalContents;
    location.reload(); // Refresh to restore event bindings
  }
}


loadSavedData() {
  // Retrieve data from local storage
  const storedData = JSON.parse(localStorage.getItem('currentPriceAndQuantity') || '[]');

  if (storedData.length > 0) {
    this.currentPriceAndQuantity = storedData;
    console.log("Retrieved data:", this.currentPriceAndQuantity);
  } else {
    console.log("No saved data found.");
  }
}




closeView() {
  this.viewProduct = false;
}

openEditInventory(item: any) {
  this.activeItem = { ...item }; 
  this.editInventory = true;
}

closeEditInventory() {
  this.closeEdit();
}

ngOnChanges() {
  console.log("Updated Product received in View Page:", this.updatedProduct);
}

enableEdit(index: number): void {
  this.isEditing[index] = true;
}
  
saveEdit(item: any, index: number): void {

  item.createdDate = new Date().toISOString();

    // Fetch the supplier data from localStorage
  const supplierData = localStorage.getItem('selectedSupplier');
  const supplier = supplierData ? JSON.parse(supplierData) : null;

  item.createdDate = new Date().toISOString(); // Update timestamp
  console.log("Supplier Data:", supplier);

  this.productHistory[index] = { 
    ...this.productHistory[index],
    supplier: supplier

  };

  // Reset the editing state for this row.
  this.isEditing[index] = false;
  
  // Update the products map with the updated productHistory.
  this.products.set(this.activeItem.id, this.productHistory);
  localStorage.setItem('products', JSON.stringify([...this.products]));

}  

deleteProductHistory(index:number){
   this.productHistory = this.productHistory.filter((_, i) => i !== index);
   this.products.set(this.activeItem.id, this.productHistory);
   localStorage.setItem('products', JSON.stringify([...this.products]));
  }  
}
