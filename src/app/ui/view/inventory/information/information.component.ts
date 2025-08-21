import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { supplierData, ProductData,StockMovementByInventory } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';

@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss',
})
export class InformationComponent implements OnChanges {
  @Input() productId: number | null = null;
  product: ProductData | null = null;
  supplier: supplierData | null = null;
  @Output() close = new EventEmitter<void>();

  @Input() inventoryId?: number;

  stockMovements: StockMovementByInventory[] = [];
  isMovementsLoading = false; 

  constructor(private posService: PosServiceService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.fetchProductAndSupplier();
    }
      if (changes['inventoryId']) {
      this.loadMovements();
    }
  }

 // after
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
        // this.stockMovements = list.sort((a, b) =>
        //   new Date(this.toIsoString(b.createdDate)).getTime() -
        //   new Date(this.toIsoString(a.createdDate)).getTime()
        // );
        // this.isMovementsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stock movements:', err);
        this.stockMovements = [];
        this.isMovementsLoading = false;
      }
    });
  }

  fetchProductAndSupplier() {
    this.posService.getProductById(this.productId!).subscribe((product) => {
      this.product = product;
      if (product.supplier && product.supplier.id) {
        this.posService.getSupplier().subscribe((suppliers) => {
          this.supplier =
            suppliers.find((s: supplierData) => s.id === product.supplier.id) ||
            null;
        });
      }
    });
  }

  goBack() {
    this.close.emit();
  }
}
