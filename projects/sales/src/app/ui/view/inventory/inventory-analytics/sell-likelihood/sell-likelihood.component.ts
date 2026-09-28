// sell-likelihood.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  Product,
  Branch,
  BranchInventory,
  ProductPerformance,
  StockMovement,
  MovementType,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// INTERFACES
// ============================================================

export interface SellLikelihoodPrediction {
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  confidence: number;
  factors: {
    name: string;
    impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    weight: number;
    value: string;
  }[];
  recommendations: string[];
  predictedMonthlySales: number;
  predictedQuarterlySales: number;
  lastCalculated: Date;
}

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-sell-likelihood',
  templateUrl: './sell-likelihood.component.html',
  styleUrls: ['./sell-likelihood.component.scss']
})
export class SellLikelihoodComponent implements OnInit, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() productId: string = '';
  @Input() branchId: string = '';
  @Output() close = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  products: Product[] = [];
  branches: Branch[] = [];
  inventory: BranchInventory[] = [];
  prediction: SellLikelihoodPrediction | null = null;
  isLoading: boolean = true;
  isPredicting: boolean = false;
  error: string | null = null;

  // UI
  Math = Math;
  activeTab: 'overview' | 'factors' | 'recommendations' | 'history' = 'overview';

  // Form
  predictionForm: FormGroup;

  // Real monthly sales history, built from actual SALE movements — see buildHistoryFromSales().
  historyData: { month: string; score: number; sales: number; confidence: number }[] = [];

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private fb: FormBuilder
  ) {
    this.predictionForm = this.buildForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get params from route if not provided
    if (!this.productId || !this.branchId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['productId']) this.productId = params['productId'];
        if (params['branchId']) this.branchId = params['branchId'];
        this.loadData();
      });
    } else {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildForm(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      branchId: ['', Validators.required]
    });
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      products: this.inventoryService.getProducts({ limit: 500 }),
      branches: this.inventoryService.getBranches()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ products, branches }) => {
          this.products = products.data;
          this.branches = branches;

          // If productId and branchId are provided, load prediction
          if (this.productId && this.branchId) {
            this.loadPrediction();
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Failed to load data:', err);
          this.error = 'Failed to load data';
          this.isLoading = false;
        }
      });
  }

  loadPrediction(): void {
    if (this.predictionForm.invalid || !this.productId || !this.branchId) {
      this.predictionForm.markAllAsTouched();
      this.error = 'Select a product and a branch before generating a prediction.';
      return;
    }

    this.isPredicting = true;
    this.error = null;

    // Built entirely from real backend data — product performance (sales/turnover/trend),
    // this branch's current stock, and this product/branch's real SALE movement history.
    // There is no prediction-model API in this app, so "score"/"likelihood" is a transparent,
    // deterministic formula over real numbers, not a black-box ML output — and there is no
    // real source at all for things like "competitor presence" or "marketing activity", so
    // those factors are gone rather than faked with Math.random().
    forkJoin({
      performance: this.inventoryService.getProductPerformance(this.productId),
      branchInventory: this.inventoryService.getBranchInventory(this.branchId),
      salesHistory: this.inventoryService.getMovements({
        productId: this.productId,
        branchId: this.branchId,
        type: MovementType.SALE,
        limit: 1000
      })
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ performance, branchInventory, salesHistory }) => {
        const branchStock = branchInventory.find(i => i.productId === this.productId);
        const sales = salesHistory.data;
        this.prediction = this.buildPrediction(performance, branchStock, sales);
        this.historyData = this.buildHistoryFromSales(sales);
        this.isPredicting = false;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load sell-likelihood data:', err);
        this.error = 'Failed to load performance data for this product/branch.';
        this.isPredicting = false;
        this.isLoading = false;
      }
    });
  }

  // ============================================================
  // PRODUCT SEARCH
  // ============================================================

  selectProduct(product: Product): void {
    this.predictionForm.patchValue({ productId: String(product.id) });
    this.productId = String(product.id);
    // Close dropdown, and show the picked product in the search box
    // (previously cleared to '', which made the field look empty after selection).
    this.showProductDropdown = false;
    this.productSearchTerm = product.name;
  }

  onBranchChange(): void {
    this.branchId = this.predictionForm.get('branchId')?.value;
  }

  // ============================================================
  // PREDICTION GENERATION (Mock)
  // ============================================================

  private buildPrediction(
    performance: ProductPerformance,
    branchStock: BranchInventory | undefined,
    salesHistory: StockMovement[]
  ): SellLikelihoodPrediction {
    const product = this.products.find(p => String(p.id) === this.productId);
    const branch = this.branches.find(b => String(b.id) === this.branchId);

    const sellThroughScore = Math.min(Math.max(performance.sellThroughRate || 0, 0), 100);
    const turnoverScore = Math.min(Math.max((performance.stockTurnover || 0) * 10, 0), 100);
    const trendAdjustment = performance.trend === 'UP' ? 8 : performance.trend === 'DOWN' ? -8 : 0;
    const score = Math.round(Math.min(Math.max(sellThroughScore * 0.55 + turnoverScore * 0.45 + trendAdjustment, 0), 100));

    let likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
    if (score >= 70) likelihood = 'HIGH';
    else if (score >= 45) likelihood = 'MEDIUM';
    else likelihood = 'LOW';

    const stockStatus = branchStock ? getStockStatus(branchStock.quantity, branchStock.reorderPoint, branchStock.safetyStock) : null;

    // Only factors with a genuine backend data source behind them. There is no competitor,
    // marketing, demographic or seasonality data anywhere in this app to compute the equivalents
    // of the old mock factors from — faking those would be no more honest than Math.random().
    const factors: SellLikelihoodPrediction['factors'] = [
      {
        name: 'Historical Sales',
        impact: performance.totalSold > 0 ? 'POSITIVE' : 'NEUTRAL',
        weight: 40,
        value: `${performance.totalSold} unit(s) sold`
      },
      {
        name: 'Sales Trend',
        impact: performance.trend === 'UP' ? 'POSITIVE' : performance.trend === 'DOWN' ? 'NEGATIVE' : 'NEUTRAL',
        weight: 25,
        value: performance.trend === 'UP' ? 'Trending up' : performance.trend === 'DOWN' ? 'Trending down' : 'Stable'
      },
      {
        name: 'Stock Turnover',
        impact: performance.stockTurnover >= 1 ? 'POSITIVE' : 'NEUTRAL',
        weight: 25,
        value: `${(performance.stockTurnover || 0).toFixed(1)}x`
      },
      {
        name: 'Current Branch Stock',
        impact: stockStatus === 'CRITICAL' || stockStatus === 'LOW' ? 'NEGATIVE' : stockStatus === 'OVERSTOCK' ? 'NEUTRAL' : 'POSITIVE',
        weight: 10,
        value: branchStock ? `${branchStock.quantity} unit(s) in stock` : 'No stock record at this branch'
      }
    ];

    const recommendations: string[] = [];
    if (likelihood === 'HIGH') {
      recommendations.push('Increase stock levels for this branch');
      recommendations.push('Consider a targeted promotion to capitalize on demand');
    } else if (likelihood === 'MEDIUM') {
      recommendations.push('Monitor sales velocity before adjusting stock levels');
    } else {
      recommendations.push('Reduce stock allocation to this branch');
      recommendations.push('Investigate why demand is low before reordering more');
    }
    if (stockStatus === 'CRITICAL' || stockStatus === 'LOW') {
      recommendations.push('Current stock is low — check the Restock Suggestions page for this branch');
    }

    const periodMonths = Math.max(
      1,
      Math.round((new Date(performance.period.end).getTime() - new Date(performance.period.start).getTime()) / (30 * 86400000))
    );
    const monthlySales = Math.round(performance.totalSold / periodMonths);

    return {
      productId: this.productId,
      productName: product?.name || performance.productName || 'Unknown Product',
      sku: product?.sku || performance.sku || 'N/A',
      branchId: this.branchId,
      branchName: branch?.name || 'Unknown Branch',
      likelihood,
      score,
      // Reflects how much real sales history this was computed from, not a statistical model's
      // margin of error — there is no ML model behind this feature. More recorded SALE movements
      // for this product/branch means more data the score above was actually derived from.
      confidence: Math.min(95, Math.max(40, 40 + salesHistory.length * 3)),
      factors,
      recommendations,
      predictedMonthlySales: monthlySales,
      predictedQuarterlySales: monthlySales * 3,
      lastCalculated: new Date()
    };
  }

  /** Real monthly sales volume for this product/branch over the last 6 months, from actual SALE
   *  movements — not a re-run of a predictive model (there's no historical stock snapshot to
   *  recompute sell-through/turnover retroactively, so "score" here is each month's sales
   *  relative to the busiest month in the window, a real ratio, not a fabricated number). */
  private buildHistoryFromSales(salesHistory: StockMovement[]): { month: string; score: number; sales: number; confidence: number }[] {
    const now = new Date();
    const buckets: { key: string; label: string; sales: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), sales: 0 });
    }
    salesHistory.forEach(m => {
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.find(b => b.key === key);
      if (bucket) bucket.sales += (m.quantity || 0);
    });

    const maxSales = Math.max(...buckets.map(b => b.sales), 1);
    const confidence = this.prediction?.confidence ?? 50;
    return buckets.map(b => ({
      month: b.label,
      sales: b.sales,
      score: Math.round((b.sales / maxSales) * 100),
      confidence
    }));
  }

  // ============================================================
  // REFRESH PREDICTION
  // ============================================================

  refreshPrediction(): void {
    if (this.productId && this.branchId) {
      this.loadPrediction();
    }
  }

  // ============================================================
  // TAB MANAGEMENT
  // ============================================================

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    if (this.close.observed) {
      this.close.emit();
    } else {
      this.location.back();
    }
  }

  viewProduct(): void {
    if (this.productId) {
      this.router.navigate(['/admin/sales/commerce/inventory/products', this.productId]);
    }
  }

  viewBranch(): void {
    if (this.branchId) {
      this.router.navigate(['/admin/sales/commerce/inventory/branches', this.branchId]);
    }
  }

  // ============================================================
  // UI HELPERS
  // ============================================================

  showProductDropdown: boolean = false;
  productSearchTerm: string = '';
  filteredProducts: Product[] = [];

  /** Delay hiding the dropdown on blur so a (mousedown) on a dropdown option has a chance to
   *  register first — otherwise the blur fires and removes the options before the click lands. */
  onProductInputBlur(): void {
    setTimeout(() => {
      this.showProductDropdown = false;
    }, 200);
  }

  onProductSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.productSearchTerm = target.value;
    if (this.productSearchTerm.length > 0) {
      this.filteredProducts = this.products.filter(p =>
        (p.name || '').toLowerCase().includes(this.productSearchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(this.productSearchTerm.toLowerCase())
      );
    } else {
      this.filteredProducts = this.products;
    }
    this.showProductDropdown = true;
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getLikelihoodColor(likelihood: string): string {
    const map: Record<string, string> = {
      'HIGH': '#2EB270',
      'MEDIUM': '#F5A623',
      'LOW': '#DC2626'
    };
    return map[likelihood] || '#6B7280';
  }

  getLikelihoodIcon(likelihood: string): string {
    const map: Record<string, string> = {
      'HIGH': 'fa-arrow-up',
      'MEDIUM': 'fa-minus',
      'LOW': 'fa-arrow-down'
    };
    return map[likelihood] || 'fa-minus';
  }

  getLikelihoodLabel(likelihood: string): string {
    return likelihood.charAt(0) + likelihood.slice(1).toLowerCase();
  }

  getImpactColor(impact: string): string {
    const map: Record<string, string> = {
      'POSITIVE': '#2EB270',
      'NEUTRAL': '#F5A623',
      'NEGATIVE': '#DC2626'
    };
    return map[impact] || '#6B7280';
  }

  getImpactIcon(impact: string): string {
    const map: Record<string, string> = {
      'POSITIVE': 'fa-arrow-up',
      'NEUTRAL': 'fa-minus',
      'NEGATIVE': 'fa-arrow-down'
    };
    return map[impact] || 'fa-minus';
  }

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => String(b.id) === branchId);
    return branch?.name || branchId;
  }

  formatCurrency(value: number): string {
    if (!value) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    if (!value) return '0';
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  formatDate(date: Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  getHistoryChange(): number {
    if (!this.historyData || this.historyData.length === 0) return 0;
    const first = this.historyData[0]?.score || 0;
    const last = this.historyData[this.historyData.length - 1]?.score || 0;
    return last - first;
  }

  getHistoryChangeColor(): string {
    const change = this.getHistoryChange();
    if (change > 0) return '#2EB270';
    if (change < 0) return '#DC2626';
    return '#F5A623';
  }

  getMaxHistoryScore(): number {
    if (!this.historyData || this.historyData.length === 0) return 100;
    const max = Math.max(...this.historyData.map(d => d.score));
    return Math.ceil(max / 10) * 10 + 10;
  }

  getPointX(index: number, total: number): number {
    const padding = 40;
    const width = 500 - padding * 2;
    return padding + (index / (total - 1 || 1)) * width;
  }

  getPointY(value: number, max: number): number {
    const padding = 20;
    const height = 260 - padding * 2;
    return padding + height - (value / max) * height;
  }

  getHistoryPath(data: any[], max: number, key: string): string {
    if (!data || data.length === 0) return '';

    return data.map((d, i) => {
      const x = this.getPointX(i, data.length);
      const y = this.getPointY(d[key], max);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }).join(' ');
  }

  getHistoryAreaPath(data: any[], max: number, key: string): string {
    if (!data || data.length === 0) return '';

    const path = data.map((d, i) => {
      const x = this.getPointX(i, data.length);
      const y = this.getPointY(d[key], max);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }).join(' ');

    const lastX = this.getPointX(data.length - 1, data.length);
    const firstX = this.getPointX(0, data.length);
    const baseY = this.getPointY(0, max);
    return path + ` L${lastX},${baseY} L${firstX},${baseY} Z`;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.predictionForm.get(fieldName);
    return !!control?.invalid && !!control?.touched;
  }

  getFieldError(fieldName: string): string {
    const control = this.predictionForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';

    return 'Invalid input';
  }
}