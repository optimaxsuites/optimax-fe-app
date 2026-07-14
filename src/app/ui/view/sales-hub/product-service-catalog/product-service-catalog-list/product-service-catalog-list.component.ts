import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Product, Category } from '../../../../domain/sales/sales.dto';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-service-catalog-list.component.html',
  styleUrls: ['./product-service-catalog-list.component.scss']
})
export class ProductServiceCatalogListComponent implements OnInit, OnDestroy {

  protected readonly Math = Math;
  
  viewMode: 'list' | 'icon' = 'icon';
  products: Product[] = [];
  isLoading = true;
  selectedProductIds: string[] = [];

  setViewMode(mode: 'list' | 'icon'): void {
    this.viewMode = mode;
  }
  
  // Filters
  filters = {
    status: 'ALL',
    category: 'ALL',
    searchTerm: '',
    minPrice: '',
    maxPrice: '',
    page: 0,
    size: 10
  };
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Stats
  stats = {
    total: 0,
    active: 0,
    outOfStock: 0,
    discontinued: 0,
    totalValue: 0
  };
  
  // Categories for filter (dynamically loaded)
  categories: string[] = ['ALL'];
  rawCategories: Category[] = [];
  showCategoryModal = false;
  newCategoryName = '';
  newCategoryDesc = '';
  editingCategory: Category | null = null;
  
  statusOptions: { value: string; label: string; color: string }[] = [
    { value: 'ALL', label: 'All Products', color: 'gray' },
    { value: 'ACTIVE', label: 'Active', color: 'green' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock', color: 'orange' },
    { value: 'DISCONTINUED', label: 'Discontinued', color: 'red' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private salesService: SalesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.salesService.getCategories().subscribe({
      next: (cats) => {
        this.rawCategories = cats;
        this.categories = ['ALL', ...cats.map(c => c.name)];
      }
    });
  }

  openCategoryModal(): void {
    this.showCategoryModal = true;
    this.editingCategory = null;
    this.newCategoryName = '';
    this.newCategoryDesc = '';
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.editingCategory = null;
    this.newCategoryName = '';
    this.newCategoryDesc = '';
  }

  startEditCategory(cat: Category): void {
    this.editingCategory = cat;
    this.newCategoryName = cat.name;
    this.newCategoryDesc = cat.description || '';
  }

  cancelEditCategory(): void {
    this.editingCategory = null;
    this.newCategoryName = '';
    this.newCategoryDesc = '';
  }

  submitCategory(): void {
    const trimmedName = this.newCategoryName.trim();
    if (!trimmedName) {
      alert('Please enter a category name');
      return;
    }

    if (this.editingCategory) {
      // Update Mode
      const isDuplicate = this.rawCategories.some(
        c => c.id !== this.editingCategory?.id && c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (isDuplicate) {
        alert('Another category already has this name');
        return;
      }

      this.salesService.updateCategory(this.editingCategory.id, {
        name: trimmedName,
        description: this.newCategoryDesc.trim()
      }).subscribe({
        next: (updatedCats) => {
          this.rawCategories = updatedCats;
          this.categories = ['ALL', ...updatedCats.map(c => c.name)];
          this.cancelEditCategory();
          alert('Category updated successfully!');
        },
        error: (err) => {
          console.error('Error updating category:', err);
          alert('Failed to update category');
        }
      });
    } else {
      // Create Mode
      if (this.rawCategories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        alert('Category already exists');
        return;
      }

      this.salesService.createCategory({
        name: trimmedName,
        description: this.newCategoryDesc.trim()
      }).subscribe({
        next: (updatedCats) => {
          this.rawCategories = updatedCats;
          this.categories = ['ALL', ...updatedCats.map(c => c.name)];
          this.newCategoryName = '';
          this.newCategoryDesc = '';
          alert('Category added successfully!');
        },
        error: (err) => {
          console.error('Error adding category:', err);
          alert('Failed to add category');
        }
      });
    }
  }

  confirmDeleteCategory(id: string, name: string): void {
    if (confirm(`Are you sure you want to delete the category "${name}"?`)) {
      this.salesService.deleteCategory(id).subscribe({
        next: (updatedCats) => {
          this.rawCategories = updatedCats;
          this.categories = ['ALL', ...updatedCats.map(c => c.name)];
          if (this.editingCategory?.id === id) {
            this.cancelEditCategory();
          }
          alert('Category deleted successfully!');
        },
        error: (err) => {
          console.error('Error deleting category:', err);
          alert('Failed to delete category');
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.isLoading = true;
    
    this.salesService.getProducts(this.filters).subscribe({
      next: (response: any) => {
        this.products = response.data;
        this.totalElements = response.total;
        this.totalPages = Math.ceil(response.total / this.filters.size);
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.setMockProducts();
        this.calculateStats();
        this.isLoading = false;
      }
    });
  }

  private calculateStats(): void {
    const totalValue = this.products.reduce((sum, p) => sum + (p.unitPrice * p.stockQuantity), 0);
    
    this.stats = {
      total: this.products.length,
      active: this.products.filter(p => p.status === 'ACTIVE').length,
      outOfStock: this.products.filter(p => p.status === 'OUT_OF_STOCK').length,
      discontinued: this.products.filter(p => p.status === 'DISCONTINUED').length,
      totalValue: totalValue
    };
  }

  applyFilters(): void {
    this.filters.page = 0;
    this.loadProducts();
  }

  resetFilters(): void {
    this.filters = {
      status: 'ALL',
      category: 'ALL',
      searchTerm: '',
      minPrice: '',
      maxPrice: '',
      page: 0,
      size: 10
    };
    this.loadProducts();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadProducts();
  }

  onPageSizeChange(size: number): void {
    this.filters.size = size;
    this.filters.page = 0;
    this.loadProducts();
  }

  toggleSelection(productId: string, event: any): void {
    if (event.target.checked) {
      this.selectedProductIds.push(productId);
    } else {
      this.selectedProductIds = this.selectedProductIds.filter(id => id !== productId);
    }
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedProductIds = this.products.map(p => p.id);
    } else {
      this.selectedProductIds = [];
    }
  }

  isSelected(productId: string): boolean {
    return this.selectedProductIds.includes(productId);
  }

  isAllSelected(): boolean {
    return this.products.length > 0 && this.selectedProductIds.length === this.products.length;
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }

  formatDate(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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

  getStatusClass(status: string): string {
    return status ? status.toLowerCase().replace(/_/g, '-') : '';
  }

  navigateToNewProduct(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/products/new', uuid]);
    } else {
      this.router.navigate(['/admin/sales/products/new']);
    }
  }

  generateQuoteFromProduct(productId: string): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/quotes/new', uuid] : ['/admin/sales/quotes/new'];
    this.router.navigate(path, { queryParams: { productId: productId } });
  }

  viewProduct(productId: string): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/products', productId, uuid]);
    } else {
      this.router.navigate(['/admin/sales/products', productId]);
    }
  }

  editProduct(productId: string): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/products', productId, 'edit', uuid]);
    } else {
      this.router.navigate(['/admin/sales/products', productId, 'edit']);
    }
  }

  deleteProduct(product: Product): void {
    if (confirm(`Delete product ${product.name}? This action cannot be undone.`)) {
      this.salesService.deleteProduct(product.id).subscribe({
        next: () => {
          this.loadProducts();
          alert(`Product ${product.name} deleted successfully`);
        },
        error: (error: any) => {
          console.error('Error deleting product:', error);
          alert('Failed to delete product. Please try again.');
        }
      });
    }
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  // Mock data for development
  private setMockProducts(): void {
    this.products = [
      {
        id: 'PROD-001',
        name: 'Executive Office Chair',
        sku: 'CHR-001',
        description: 'Ergonomic executive office chair with lumbar support',
        unitPrice: 50000,
        costPrice: 30000,
        currency: 'NGN',
        stockQuantity: 50,
        category: 'Furniture',
        taxRate: 7.5,
        images: [],
        status: 'ACTIVE'
      },
      {
        id: 'PROD-002',
        name: 'Standing Desk',
        sku: 'DSK-001',
        description: 'Adjustable height standing desk',
        unitPrice: 120000,
        costPrice: 80000,
        currency: 'NGN',
        stockQuantity: 3,
        category: 'Furniture',
        taxRate: 7.5,
        images: [],
        status: 'ACTIVE'
      },
      {
        id: 'PROD-003',
        name: 'Laptop - Dell XPS',
        sku: 'LAP-001',
        description: 'Dell XPS 13 laptop',
        unitPrice: 850000,
        costPrice: 700000,
        currency: 'NGN',
        stockQuantity: 0,
        category: 'Electronics',
        taxRate: 7.5,
        images: [],
        status: 'OUT_OF_STOCK'
      },
      {
        id: 'PROD-004',
        name: 'Conference Table',
        sku: 'TBL-001',
        description: 'Large conference table',
        unitPrice: 250000,
        costPrice: 180000,
        currency: 'NGN',
        stockQuantity: 10,
        category: 'Furniture',
        taxRate: 7.5,
        images: [],
        status: 'ACTIVE'
      },
      {
        id: 'PROD-005',
        name: 'Printer - HP LaserJet',
        sku: 'PRN-001',
        description: 'HP LaserJet printer',
        unitPrice: 150000,
        costPrice: 120000,
        currency: 'NGN',
        stockQuantity: 25,
        category: 'Electronics',
        taxRate: 7.5,
        images: [],
        status: 'DISCONTINUED'
      },
      {
        id: 'PROD-006',
        name: 'Office Chair - Standard',
        sku: 'CHR-002',
        description: 'Standard office chair',
        unitPrice: 30000,
        costPrice: 20000,
        currency: 'NGN',
        stockQuantity: 100,
        category: 'Furniture',
        taxRate: 7.5,
        images: [],
        status: 'ACTIVE'
      }
    ];
    this.totalElements = this.products.length;
    this.totalPages = 1;
  }
}