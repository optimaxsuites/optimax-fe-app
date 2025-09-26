import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
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
  suppliersList: supplierData[] = []; // List of all suppliers for dropdown
  revivedDate: Date = new Date();
  loading = true;

  stockMovements: StockMovementByInventory[] = [];
  isMovementsLoading = false;
  hasTriedMovements = false;             // show "no data" only after we attempt a load
  private inventoryId: number | null = null;

  // Dropdown and Edit Modal properties
  activeDropdownIndex: number | null = null;
  showEditModal = false;
  editingMovement: any = {};
  isUpdatingMovement = false;

  // Delete Modal properties
  showDeleteModal = false;
  movementToDelete: StockMovementByInventory | null = null;
  isDeletingMovement = false;

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

          // Store suppliers list for dropdown
          this.suppliersList = suppliers;

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
// Replace the existing toIsoString method with this:
toIsoString(d: string | number[] | Date): string {
  if (Array.isArray(d)) {
    
    const [y, m = 1, day = 1, h = 0, mi = 0, s = 0] = d;
   
    return new Date(y, m - 1, day, h, mi, s).toISOString();
  } else if (typeof d === 'string') {
  
    return new Date(d).toISOString();
  }
  return d.toISOString();
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
  // Create print content
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Details - ${this.activeItem?.name || 'Inventory'}</title>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          padding: 20px;
          background: white;
        }
        .print-header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 15px; 
        }
        .print-header h1 { 
          color: #2563eb; 
          font-size: 28px; 
          margin-bottom: 5px; 
        }
        .section { 
          margin-bottom: 25px; 
          break-inside: avoid; 
        }
        .section h2 { 
          color: #1f2937; 
          font-size: 18px; 
          margin-bottom: 10px; 
          border-bottom: 1px solid #e5e7eb; 
          padding-bottom: 5px; 
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
          gap: 15px; 
          margin-top: 10px;
        }
        .info-item { 
          background: #f8fafc; 
          padding: 10px 15px; 
          border-radius: 5px; 
          border-left: 3px solid #3b82f6;
        }
        .info-label { 
          font-weight: 600; 
          color: #374151; 
          font-size: 14px;
        }
        .info-value { 
          color: #111827; 
          margin-top: 2px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 15px; 
          font-size: 12px;
        }
        th, td { 
          border: 1px solid #d1d5db; 
          padding: 8px 6px; 
          text-align: left; 
        }
        th { 
          background-color: #2563eb; 
          color: white; 
          font-weight: 600; 
          font-size: 11px;
          text-transform: uppercase;
        }
        tr:nth-child(even) { background-color: #f9fafb; }
        .positive { 
          color: #059669; 
          font-weight: 600; 
          background: #d1fae5;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .negative { 
          color: #dc2626; 
          font-weight: 600; 
          background: #fee2e2;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .text-center { text-align: center; }
        .no-movements { 
          text-align: center; 
          color: #6b7280; 
          font-style: italic; 
          padding: 20px;
          background: #f3f4f6;
          border-radius: 5px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .section { page-break-inside: avoid; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Product Details Report</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
      
      <div class="section">
        <h2>Product Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Product Name</div>
            <div class="info-value">${this.activeItem?.name || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">SKU</div>
            <div class="info-value">${this.activeItem?.sku || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Category</div>
            <div class="info-value">${this.activeItem?.productCategory?.name || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Current Quantity</div>
            <div class="info-value">${this.activeItem?.quantity || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Current Price</div>
            <div class="info-value">${this.activeItem?.sellingPrice ? '₦' + Number(this.activeItem.sellingPrice).toFixed(2) : '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Product Code</div>
            <div class="info-value">${this.activeItem?.code || '-'}</div>
          </div>
        </div>
      </div>
      
      ${this.supplier && this.activeItem?.supplier ? `
        <div class="section">
          <h2>Supplier Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Supplier Name</div>
              <div class="info-value">${this.activeItem.supplier.name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Contact Person</div>
              <div class="info-value">${this.activeItem.supplier.contactPerson || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${this.activeItem.supplier.email || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phone</div>
              <div class="info-value">${this.activeItem.supplier.phoneNumber || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Address</div>
              <div class="info-value">${this.activeItem.supplier.address || '-'}</div>
            </div>
          </div>
        </div>
      ` : ''}
      
      <div class="section">
        <h2>Stock Movement History</h2>
        <p style="margin-bottom: 10px;"><strong>Total Movements:</strong> ${this.stockMovements.length}</p>
        ${this.stockMovements && this.stockMovements.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Reference</th>
                <th>Qty Change</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              ${this.stockMovements.map(movement => `
                <tr>
                  <td>${this.formatDateForPrint(movement.createdDate)}</td>
                  <td>${movement.reference || 'N/A'}</td>
                  <td class="text-center">
                    <span class="${movement.quantity > 0 ? 'positive' : movement.quantity < 0 ? 'negative' : ''}">
                      ${movement.quantity > 0 ? '+' : ''}${movement.quantity}
                    </span>
                  </td>
                  <td>${movement.purchasePrice ? '₦' + Number(movement.purchasePrice).toFixed(2) : '-'}</td>
                  <td>${movement.sellingPrice ? '₦' + Number(movement.sellingPrice).toFixed(2) : '-'}</td>
                  <td>${movement.supplier?.name || (movement.supplierId ? 'ID: ' + movement.supplierId : 'N/A')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="no-movements">No stock movements found for this product.</div>'}
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }, 100);
        };
      </script>
    </body>
    </html>
  `;

 
  try {
    
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
     
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
       
        const link = document.createElement('a');
        link.href = url;
        link.download = `product-report-${this.activeItem?.name || 'inventory'}-${new Date().getTime()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Print popup was blocked. The report has been downloaded as an HTML file. Open it in your browser to print.');
      }
    }
  } catch (error) {
    console.error('Print error:', error);
    
    this.printInline();
  }
}


private printInline() {
  const originalContent = document.body.innerHTML;
  const printableContent = document.getElementById('printable-area');
  
  if (printableContent) {
    const printContent = printableContent.innerHTML;
    document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Product Details - ${this.activeItem?.name}</h1>
        ${printContent}
      </div>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  } else {
    alert('Unable to print. Please try again or use your browser\'s print function.');
  }
}

private formatDateForPrint(date: any): string {
  try {
    const dateObj = new Date(this.toIsoString(date));
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
}


private movementDateDesc = (
  a: StockMovementByInventory,
  b: StockMovementByInventory
): number => {
  const dateA = new Date(this.toIsoString(a.createdDate)).getTime();
  const dateB = new Date(this.toIsoString(b.createdDate)).getTime();
  

  return dateB - dateA;
};

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
    this.showEditModal = true;
    this.activeDropdownIndex = null;
  }

  
  deleteStockMovement(movement: StockMovementByInventory): void {
    this.movementToDelete = movement;
    this.showDeleteModal = true;
    this.activeDropdownIndex = null;
  }

  confirmDelete(): void {
    if (!this.movementToDelete) return;

    this.isDeletingMovement = true;
    
    this.posService.deleteStockMovement(this.movementToDelete.id).subscribe({
      next: () => {
        this.stockMovements = this.stockMovements.filter(m => m.id !== this.movementToDelete!.id);
        console.log('Stock movement deleted successfully');
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Failed to delete stock movement:', err);
        // You could replace this alert with another nice modal if you want
        alert('Failed to delete stock movement. Please try again.');
        this.isDeletingMovement = false;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.movementToDelete = null;
    this.isDeletingMovement = false;
  }

  
  saveStockMovement(): void {
    if (!this.editingMovement.id) {
      return;
    }

    this.isUpdatingMovement = true;
    
    
    const updateData: any = {
      id: this.editingMovement.id, 
      reference: this.editingMovement.reference,
      quantity: Number(this.editingMovement.quantity),
      purchasePrice: Number(this.editingMovement.purchasePrice),
      sellingPrice: Number(this.editingMovement.sellingPrice),
      supplierId: this.editingMovement.supplierId,
      inventoryId: this.inventoryId,
      createdDate: this.editingMovement.createdDate, 
      ingredientId: this.editingMovement.ingredientId || null 
    };

    this.posService.updateStockMovement(this.editingMovement.id, updateData).subscribe({
      next: (updatedMovement) => {
        
        const index = this.stockMovements.findIndex(m => m.id === this.editingMovement.id);
        if (index !== -1) {
          this.stockMovements[index] = { ...this.stockMovements[index], ...updatedMovement };
        }
        this.showEditModal = false;
        this.editingMovement = {};
        this.isUpdatingMovement = false;
        console.log('Stock movement updated successfully');
      },
      error: (err) => {
        console.error('Failed to update stock movement:', err);
        alert('Failed to update stock movement. Please try again.');
        this.isUpdatingMovement = false;
      }
    });
  }

  // Cancel edit
  cancelEdit(): void {
    this.showEditModal = false;
    this.editingMovement = {};
  }

}