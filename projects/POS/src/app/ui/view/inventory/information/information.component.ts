import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { supplierData, ProductData, StockMovementByInventory, StockMovementResponsePayload } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss',
})
export class InformationComponent implements OnChanges {
  @Input() productId: number | null = null;
  product: ProductData | null = null;
  supplier: supplierData | null = null;
  suppliersList: supplierData[] = []; // List of all suppliers for dropdown
  @Output() close = new EventEmitter<void>();

  @Input() inventoryId?: number;

  stockMovements: StockMovementByInventory[] = [];
  isMovementsLoading = false;

  // Dropdown and Edit Modal properties
  activeDropdownIndex: number | null = null;
  showEditModal = false;
  editingMovement: any = {};
  isUpdatingMovement = false;

  constructor(private posService: PosServiceService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.fetchProductAndSupplier();
    }
    if (changes['inventoryId']) {
      this.loadMovements();
    }
  }

  // Close dropdown when clicking outside
@HostListener('document:click', ['$event'])
onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.mv-actions')) {
    this.activeDropdownIndex = null;
  }
}

 // Toggle
toggleDropdown(index: number): void {
  this.activeDropdownIndex = this.activeDropdownIndex === index ? null : index;
}

 
  editStockMovement(movement: StockMovementByInventory): void {
    this.editingMovement = { ...movement };
    // Ensure supplierId is null if not set, for the dropdown's 'Select a supplier' option
    this.editingMovement.supplierId = movement.supplierId ?? null;
    this.showEditModal = true;
    this.activeDropdownIndex = null;
  }

  
  deleteStockMovement(movement: StockMovementByInventory): void {
    // Replaced confirm() with console error/message 
    console.warn(`Attempting to delete stock movement: ${movement.id}`);
    this.posService.deleteStockMovement(movement.id).subscribe({
      next: () => {
        this.stockMovements = this.stockMovements.filter(m => m.id !== movement.id);
        console.log('Stock movement deleted successfully');
      },
      error: (err) => {
        console.error('Failed to delete stock movement:', err);
        // Fallback message/action if delete fails
        // Removed alert as per instructions
        console.error('Failed to delete stock movement. Please try again.');
      }
    });
    this.activeDropdownIndex = null;
  }

  
  saveStockMovement(): void {
    if (!this.editingMovement.id) {
      return;
    }

    this.isUpdatingMovement = true;
    
    // Prepare update data, ensuring supplierId is explicitly handled (null if needed)
    const updateData: any = {
      id: this.editingMovement.id, 
      reference: this.editingMovement.reference,
      quantity: Number(this.editingMovement.quantity),
      purchasePrice: Number(this.editingMovement.purchasePrice),
      sellingPrice: Number(this.editingMovement.sellingPrice),
      // Use null if supplierId is intentionally cleared
      supplierId: this.editingMovement.supplierId ? Number(this.editingMovement.supplierId) : null,
      inventoryId: this.inventoryId,
      createdDate: this.editingMovement.createdDate, 
      ingredientId: this.editingMovement.ingredientId || null 
    };

    this.posService.updateStockMovement(this.editingMovement.id, updateData).subscribe({
      next: (updatedMovement: StockMovementResponsePayload) => {
        // Update the movement in the local array
        const index = this.stockMovements.findIndex(m => m.id === this.editingMovement.id);
        if (index !== -1) {
          // FIX: Updated to correctly use updatedMovement.supplierId and the locally resolved supplier object
          // Since StockMovementResponsePayload only has supplierId, we resolve the supplier object locally.
          const supplier = this.suppliersList.find(s => s.id === updatedMovement.supplierId);
          this.stockMovements[index] = { 
            ...this.stockMovements[index], 
            ...updatedMovement,
            supplierId: updatedMovement.supplierId ?? null,
            supplier: supplier ? supplier : null, // Set the rich supplier object for display
          } as StockMovementByInventory;
        }
        this.showEditModal = false;
        this.editingMovement = {};
        this.isUpdatingMovement = false;
        console.log('Stock movement updated successfully');
        // Reload movements to get fresh data and re-calculate inventory if needed
        this.loadMovements();
      },
      error: (err) => {
        console.error('Failed to update stock movement:', err);
        // Removed alert as per instructions
        console.error('Failed to update stock movement. Please try again.');
        this.isUpdatingMovement = false;
      }
    });
  }

  // Cancel edit
  cancelEdit(): void {
    this.showEditModal = false;
    this.editingMovement = {};
  }

  // Convert date to ISO string
  toIsoString(d: string | number[]): string {
    if (Array.isArray(d)) {
      return new Date(
        d[0], d[1] - 1, d[2], d[3] ?? 0, d[4] ?? 0, d[5] ?? 0
      ).toISOString();
    }
    return new Date(d).toISOString();
  }

 loadMovements(): void {
    const id = Number(this.inventoryId);
    if (!id) {
      this.stockMovements = [];
      return;
    }
    this.isMovementsLoading = true;
    this.posService.getStockMovementsByInventory(id).subscribe({
      next: (rows) => {
        const list = rows ?? [];
        // newest first
        this.stockMovements = list.sort((a: StockMovementByInventory, b: StockMovementByInventory) =>
          new Date(this.toIsoString(b.createdDate)).getTime() -
          new Date(this.toIsoString(a.createdDate)).getTime()
        );
        this.isMovementsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stock movements:', err);
        this.stockMovements = [];
        this.isMovementsLoading = false;
      }
    });
  }
  
  fetchProductAndSupplier() {
    // Fetch product details AND the list of all suppliers
    forkJoin({
      product: this.posService.getProductById(this.productId!),
      suppliers: this.posService.getSupplier()
    }).subscribe({
      next: ({ product, suppliers }) => {
        this.product = product;
        this.suppliersList = suppliers; // Store list for dropdown

        // Set main product supplier
        if (product.supplier && product.supplier.id) {
          this.supplier =
            suppliers.find((s: supplierData) => s.id === product.supplier.id) ||
            null;
        } else {
            this.supplier = null;
        }
      },
      error: (err) => {
        console.error('Failed to fetch product and supplier data:', err);
      }
    });
  }

  goBack() {
    this.close.emit();
  }
}