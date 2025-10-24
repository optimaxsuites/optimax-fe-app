import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StoreOrderService } from '../../../../service/store-order.service';
import { Order } from '../../../../models/interface';
import { HttpErrorResponse } from '@angular/common/http'; 
@Component({
  selector: 'app-estore-orders-list',
  templateUrl: './estore-orders-list.component.html',
  styleUrls: ['./estore-orders-list.component.scss']
})
export class EStoreOrdersListComponent implements OnInit, OnDestroy {
  formatDate(arg0: any) {
    throw new Error('Method not implemented.');
  }

  orders: Order[] = [];
  isLoading = false;
  total = 0;

  filterForm: FormGroup;
  private destroy$ = new Subject<void>();

  dateRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
  ];

  statuses = [
    { label: 'All', value: 'all' },
    { label: 'Paid', value: 'paid' },
    { label: 'Unpaid', value: 'unpaid' },
    { label: 'Pending', value: 'pending' },
  ];

  // Delivery status filters
  deliveryStatuses = [
    { label: 'All', value: 'all' },
    { label: 'Awaiting Delivery', value: 'AWAITING_DELIVERY' },
    { label: 'Packaged', value: 'PACKAGED' },
    { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', value: 'DELIVERED' },
  ];

  constructor(
    private fb: FormBuilder,
    private storeOrderService: StoreOrderService
  ) {
    this.filterForm = this.fb.group({
      dateRange: ['today'],
      customDays: [null],
      cashier: ['all'],
      status: ['all'],
      deliveryStatus: ['all'],
      search: [''],
      page: [0],
      size: [25]
    });
  }

  ngOnInit(): void {
    this.loadOrders();

    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterForm.patchValue({ page: 0 }, { emitEvent: false });
        this.loadOrders();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.isLoading = true;
    const filters = this.mapFiltersToQuery(this.filterForm.value);

    this.storeOrderService.getEStoreOrders(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if ((res as any).content) {
            this.orders = (res as any).content as Order[];
            this.total = (res as any).totalElements || this.orders.length;
          } else {
            this.orders = res as unknown as Order[];
            this.total = this.orders.length;
          }
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to load E-Store orders:', err);
          this.orders = [];
          this.total = 0;
          this.isLoading = false;
        }
      });
  }

  // Map filter form values to query parameters
  private mapFiltersToQuery(f: any) {
    const params: any = {
      page: f.page ?? 0,
      size: f.size ?? 25,
      q: f.search || undefined,
      status: f.status && f.status !== 'all' ? f.status : undefined,
      dateRange: f.dateRange,
      deliveryStatus: f.deliveryStatus 
    };

    // Clean up undefined fields (status, q, etc.)
    const finalParams: any = {};
    for (const key in params) {
      if (params[key] !== undefined) {
        finalParams[key] = params[key];
      }
    }

    return finalParams;
  }

  formatCurrency(amount: number): string {
    if (amount == null) return '0.00';
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  viewOrderDetails(order: Order): void {
    console.log('Navigating to details for order:', order.id);
    // Logic to navigate to sales details page
  }

  onPageChange(pageIndex: number, pageSize: number) {
    this.filterForm.patchValue({ page: pageIndex, size: pageSize });
    this.loadOrders();
  }
}
