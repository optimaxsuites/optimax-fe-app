import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Product } from '../../../../domain/sales/sales.dto';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BackButtonComponent],
  templateUrl: './product-service-catalog-detail.component.html',
  styleUrls: ['./product-service-catalog-detail.component.scss']
})
export class ProductServiceCatalogDetailComponent implements OnInit, OnDestroy {
  
  product: Product | null = null;
  isLoading = true;
  productId: string = '';
  
  // UI State
  showDeleteConfirm = false;
  
  // Mock sales history
  salesHistory: any[] = [];
  isLoadingHistory = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') || '';
    if (this.productId) {
      this.loadProduct();
      this.loadSalesHistory();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProduct(): void {
    this.isLoading = true;
    this.salesService.getProductById(this.productId).subscribe({
      next: (product: Product | null) => {
        this.product = product;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading product:', error);
        this.isLoading = false;
        alert('Failed to load product. Please try again.');
        this.goBack();
      }
    });
  }

  private loadSalesHistory(): void {
    this.isLoadingHistory = true;
    // Mock data - replace with actual service call
    setTimeout(() => {
      this.salesHistory = [
        { 
          id: 'SALE-001', 
          date: new Date('2026-06-15'), 
          quantity: 5, 
          customer: 'Mama Nkechi Enterprises', 
          total: 250000,
          status: 'COMPLETED'
        },
        { 
          id: 'SALE-002', 
          date: new Date('2026-06-12'), 
          quantity: 3, 
          customer: 'Tech Solutions Ltd', 
          total: 150000,
          status: 'COMPLETED'
        },
        { 
          id: 'SALE-003', 
          date: new Date('2026-06-08'), 
          quantity: 2, 
          customer: 'Global Services NG', 
          total: 100000,
          status: 'PENDING'
        },
        { 
          id: 'SALE-004', 
          date: new Date('2026-06-01'), 
          quantity: 10, 
          customer: 'Aliko Dangote Wholesale', 
          total: 500000,
          status: 'COMPLETED'
        }
      ];
      this.isLoadingHistory = false;
    }, 500);
  }

  editProduct(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/products', this.productId, 'edit', uuid]);
    } else {
      this.router.navigate(['/admin/sales/products', this.productId, 'edit']);
    }
  }

  deleteProduct(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (this.product) {
      this.salesService.deleteProduct(this.product.id).subscribe({
        next: () => {
          alert(`Product ${this.product?.name} has been deleted`);
          const uuid = this.route.snapshot.paramMap.get('uuid');
          if (uuid) {
            this.router.navigate(['/admin/sales/sales-hub', uuid]);
          } else {
            this.router.navigate(['/admin/sales/sales-hub']);
          }
        },
        error: (error: any) => {
          console.error('Error deleting product:', error);
          alert('Failed to delete product. Please try again.');
        }
      });
    }
  }

  goBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'ACTIVE': 'status-active',
      'OUT_OF_STOCK': 'status-out-of-stock',
      'DISCONTINUED': 'status-discontinued'
    };
    return classes[status] || 'status-active';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Active',
      'OUT_OF_STOCK': 'Out of Stock',
      'DISCONTINUED': 'Discontinued'
    };
    return labels[status] || status;
  }

  getStockStatusClass(stockQuantity: number): string {
    if (stockQuantity === 0) return 'stock-out';
    if (stockQuantity <= 5) return 'stock-low';
    return 'stock-good';
  }

  getStockStatusLabel(stockQuantity: number): string {
    if (stockQuantity === 0) return 'Out of Stock';
    if (stockQuantity <= 5) return 'Low Stock';
    return 'In Stock';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }

  formatDate(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatDateShort(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getProfitMargin(): number {
    if (!this.product || this.product.costPrice === 0) return 0;
    return ((this.product.unitPrice - this.product.costPrice) / this.product.unitPrice) * 100;
  }

  getTotalStockValue(): number {
    if (!this.product) return 0;
    return this.product.unitPrice * this.product.stockQuantity;
  }

  getOrderStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'PROCESSING': 'status-processing',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  }

  getOrderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pending',
      'PROCESSING': 'Processing',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}