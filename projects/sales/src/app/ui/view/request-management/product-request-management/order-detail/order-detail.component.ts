import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MasterOrder } from '../../../../domain/procurement-request/product-requests/product-requests.dto';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { ExportDropdownComponent } from '../export-dropdown/export-dropdown.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ExportDropdownComponent],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  order: MasterOrder | null = null;
  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementRequestService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.procurementService.getOrderById(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (order) => {
            this.order = order ?? null;
            this.isLoading = false;
            if (!order) {
              this.router.navigate(['/admin/sales/commerce/requests']);
            }
          },
          error: () => {
            this.isLoading = false;
            this.router.navigate(['/admin/sales/commerce/requests']);
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTotalQuantity(): number {
    return this.order?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  }

  formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Draft',
      PENDING_VENDOR_QUOTES: 'Pending Vendor Quotes',
      VENDOR_SELECTION_IN_PROGRESS: 'Vendor Selection In Progress',
      PARTIALLY_AWARDED: 'Partially Awarded',
      FULLY_AWARDED: 'Fully Awarded',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled'
    };
    return labels[status] ?? status;
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      DRAFT: 'badge-draft',
      PENDING_VENDOR_QUOTES: 'badge-pending',
      VENDOR_SELECTION_IN_PROGRESS: 'badge-quoting',
      PARTIALLY_AWARDED: 'badge-partial',
      FULLY_AWARDED: 'badge-awarded',
      COMPLETED: 'badge-completed',
      CANCELLED: 'badge-cancelled'
    };
    return classes[status] ?? 'badge-pending';
  }
}
