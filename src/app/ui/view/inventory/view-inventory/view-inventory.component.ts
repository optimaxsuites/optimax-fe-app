import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ProductData, supplierData } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-view-inventory',
  templateUrl: './view-inventory.component.html',
  styleUrl: './view-inventory.component.scss',
})
export class ViewInventoryComponent implements OnInit {
  @Input() activeItem!: ProductData;
  @Output() edit = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  @Input() updatedProduct: any;

  supplier: supplierData | null = null;
  revivedDate: Date = new Date();
  loading: boolean = true;

  constructor(
    private router: Router,
    private posService: PosServiceService,
    private messageService: MessageService
  ) {}

  // Removed productImageUrl getter to revert to previous image logic

  ngOnInit() {
    let productId = this.activeItem?.id;
    if (!productId && history.state.productId) {
      productId = history.state.productId;
    }
    if (productId) {
      this.loading = true;
      forkJoin({
        product: this.posService.getProductById(productId),
        suppliers: this.posService.getSupplier(),
      }).subscribe({
        next: ({ product, suppliers }) => {
          this.activeItem = product;
          this.revivedDate = new Date(product.createdDate);
          if (product.supplier) {
            this.supplier =
              suppliers.find(
                (s: supplierData) => s.id === product.supplier.id
              ) || null;
          } else if (suppliers.length === 1) {
            this.supplier = suppliers[0];
          } else {
            this.supplier = null;
          }
          this.loading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load product or supplier',
            life: 3000,
            key: 'tg',
          });
          this.loading = false;
        },
      });
    }
  }

  get Timestamp() {
    return this.revivedDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  closeEditInventory() {
    this.closeEdit();
  }

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
}
