import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ProductData, supplierData, StockMovementByInventory } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ImageCacheService } from '../../../service/image-cache.service';
import { filter, Observable } from "rxjs";

@Component({
  selector: 'app-view-inventory',
  templateUrl: './view-inventory.component.html',
  styleUrl: './view-inventory.component.scss',
})
export class ViewInventoryComponent implements OnInit {
  @Input() activeItem!: any;
  @Input() updatedProduct: any;
  @Output() edit = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  supplier: supplierData | null = null;
  revivedDate: Date = new Date();
  loading = true;

  stockMovements: StockMovementByInventory[] = [];
  isMovementsLoading = false;
  hasTriedMovements = false;             // show “no data” only after we attempt a load
  private inventoryId: number | null = null;

  constructor(
    private router: Router,
    private posService: PosServiceService,
    private messageService: MessageService,
    private imageCacheService: ImageCacheService
  ) {}

    getImageUrl(item: any): Observable<string> {
    // Check if we have image data in different places
    const productImages = item.__originalProduct?.productImages || 
                         item.productImages || 
                         item.__inventory?.product?.productImages ||
                         item.product?.productImages;
                         
    if (productImages && productImages.length > 0 && productImages[0].imgNo) {
      const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${productImages[0].imgNo}`;
      return this.imageCacheService.getImage(remoteImageUrl);
    }
    
    // Return placeholder URL as Observable
    return new Observable(observer => {
      observer.next('https://via.placeholder.com/300x200?text=No+Image');
      observer.complete();
    });
  }

  ngOnInit(): void {
    // capture inventoryId BEFORE we overwrite activeItem
    const passed = this.activeItem ?? {};
    this.inventoryId =
      passed?.inventoryId ??
      passed?.__inventory?.id ??
      history.state?.inventoryId ??
      null;

    // figure out productId
    const productId = passed?.id ?? history.state?.productId ?? null;

    // fetch product (or use passed) + suppliers
    this.loading = true;
    const product$ = productId ? this.posService.getProductById(productId) : of(passed);

    forkJoin({
      product: product$,
      suppliers: this.posService.getSupplier(),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ product, suppliers }) => {
          // keep inventoryId merged into activeItem so the template can still see it if needed
          this.activeItem = { ...product, inventoryId: this.inventoryId, __inventory: passed?.__inventory };

          // handle supplier resolution
          if (product?.supplier) {
            this.supplier = suppliers.find((s: supplierData) => s.id === product.supplier.id) || null;
          } else if (suppliers.length === 1) {
            this.supplier = suppliers[0];
          } else {
            this.supplier = null;
          }

          // createdDate can be ISO or [Y,M,D,H,m,s]
          this.revivedDate = this.parseApiDate(product?.createdDate);

          // finally load movements if we have an inventory id
          if (this.inventoryId) {
            this.loadMovements(this.inventoryId);
          } else {
            console.warn('No inventoryId found; skipping stock movements fetch.');
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load product or supplier',
            life: 3000,
            key: 'tg',
          });
        },
      });
  }

  private parseApiDate(d: any): Date {
    if (Array.isArray(d)) {
      const [y, m = 1, day = 1, h = 0, mi = 0, s = 0] = d;
      return new Date(y, m - 1, day, h, mi, s);
    }
    return new Date(d);
  }

  // must be public for template usage
  toIsoString(d: string | number[] | Date): string {
    if (Array.isArray(d)) {
      const [y, m = 1, day = 1, h = 0, mi = 0, s = 0] = d;
      return new Date(y, m - 1, day, h, mi, s).toISOString();
    }
    return new Date(d).toISOString();
  }

  loadMovements(inventoryId: number): void {
  this.isMovementsLoading = true;
  this.hasTriedMovements = true;

  this.posService
    .getStockMovementsByInventory(inventoryId)
    .pipe(finalize(() => (this.isMovementsLoading = false)))
    .subscribe({
      next: (rows: StockMovementByInventory[]) => {
        const list: StockMovementByInventory[] = rows ?? [];
        this.stockMovements = [...list].sort(this.movementDateDesc);
      },
      error: (err) => {
        console.error('Failed to load stock movements:', err);
        this.stockMovements = [];
      },
    });
}

  get Timestamp(): string {
    return this.revivedDate.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  triggerEdit() { this.edit.emit(this.activeItem); }
  triggerClose() { this.close.emit(); }
  closeEdit()    { this.close.emit(); }
  closeEditInventory() { this.close.emit(); }

  printPage() {
    const printContents = document.getElementById('printable-area')?.innerHTML;
    if (printContents) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      location.reload();
    }
  }

  // add this helper inside the class
private movementDateDesc = (
  a: StockMovementByInventory,
  b: StockMovementByInventory
): number => {
  return (
    new Date(this.toIsoString(b.createdDate)).getTime() -
    new Date(this.toIsoString(a.createdDate)).getTime()
  );
};

}
