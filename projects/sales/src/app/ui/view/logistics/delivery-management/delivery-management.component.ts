import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LogisticsService } from '../../../service/logistics/logistics.service';
import {
  DELIVERY_PRIORITY_META,
  DELIVERY_STATUS_FLOW,
  DELIVERY_STATUS_META,
  DELIVERY_TYPE_META,
  Delivery,
  DeliveryItemInput,
  DeliveryPriority,
  DeliveryStatus,
  DeliveryType,
  Driver,
  NewDeliveryPayload,
  Vehicle,
} from '../../../domain/logistics/logistics.dto';
import { MessageService } from 'primeng/api';
import { TableColumn } from '../../../shared-component/view/table/table.component';

type ViewState = 'list' | 'detail' | 'form';

@Component({
  selector: 'app-delivery-management',
  templateUrl: './delivery-management.component.html',
  styleUrl: './delivery-management.component.scss'
})
export class DeliveryManagementsComponent implements OnInit, OnDestroy {
  statusMeta = DELIVERY_STATUS_META;
  priorityMeta = DELIVERY_PRIORITY_META;
  typeMeta = DELIVERY_TYPE_META;
  statusFlow = DELIVERY_STATUS_FLOW;

  statusFilterOrder: (DeliveryStatus | 'ALL')[] = ['ALL', 'PENDING', 'PICKING', 'PACKING', 'DISPATCHED', 'IN_TRANSIT', 'DELAYED', 'ARRIVED', 'DELIVERED', 'CANCELLED'];
  typeOptions: DeliveryType[] = ['BRANCH_TRANSFER', 'SUPPLIER_PURCHASE', 'CUSTOMER_DELIVERY', 'RETURN_DELIVERY', 'BULK_TRANSFER'];
  priorityOptions: DeliveryPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

  // Typed accessors — used from the app-table row template, where the row
  // param (`let-d`) is untyped, so indexing meta records directly there
  // trips strict template type-checking (NG3 implicit any).
  typeIcon(type: DeliveryType): string {
    return this.typeMeta[type].icon;
  }
  typeLabel(type: DeliveryType): string {
    return this.typeMeta[type].label;
  }
  priorityColor(priority: DeliveryPriority): string {
    return this.priorityMeta[priority].color;
  }
  priorityLabel(priority: DeliveryPriority): string {
    return this.priorityMeta[priority].label;
  }
  statusColor(status: DeliveryStatus): string {
    return this.statusMeta[status].color;
  }
  statusLabel(status: DeliveryStatus): string {
    return this.statusMeta[status].label;
  }

  view: ViewState = 'list';

  isLoading = true;
  deliveries: Delivery[] = [];
  total = 0;
  page = 0;
  pageSize = 12;

  search = '';
  statusFilter: DeliveryStatus | 'ALL' = 'ALL';
  typeFilter: DeliveryType | 'ALL' = 'ALL';
  priorityFilter: DeliveryPriority | 'ALL' = 'ALL';

  statusCounts: Record<string, number> = {};

  deliveryColumns: TableColumn[] = [
    { header: 'Delivery' },
    { header: 'Type' },
    { header: 'Origin → Destination' },
    { header: 'Driver / Vehicle' },
    { header: 'Priority' },
    { header: 'Status' },
    { header: 'ETA' },
    { header: 'Cost', align: 'right' },
  ];

  // Detail
  selectedDelivery?: Delivery;
  showAssignPanel = false;
  drivers: Driver[] = [];
  vehicles: Vehicle[] = [];
  assignForm = { driverId: '', vehicleId: '' };
  isSavingAssignment = false;

  // New delivery form
  isSubmittingForm = false;
  formModel: {
    type: DeliveryType;
    priority: DeliveryPriority;
    linkedOrderRef: string;
    originLabel: string;
    originLine1: string;
    destinationLabel: string;
    destinationLine1: string;
    destinationContactName: string;
    destinationContactPhone: string;
    driverId: string;
    vehicleId: string;
    notes: string;
  } = this.blankFormModel();
  formItems: DeliveryItemInput[] = [{ name: '', sku: '', quantity: 1, unit: 'pcs' }];

  private destroy$ = new Subject<void>();
  private searchDebounce: any;

  constructor(
    private logisticsService: LogisticsService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.loadDeliveries();
    this.loadResources();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.searchDebounce);
  }

  // ============================================
  // LIST
  // ============================================

  loadDeliveries(): void {
    this.isLoading = true;
    this.logisticsService.getDeliveries({
      search: this.search,
      status: this.statusFilter,
      type: this.typeFilter,
      priority: this.priorityFilter,
      page: this.page,
      size: this.pageSize,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.deliveries = res.data;
        this.total = res.total;
        this.isLoading = false;
        this.recomputeStatusCounts();
      },
      error: () => { this.isLoading = false; }
    });
  }

  private loadResources(): void {
    this.logisticsService.getDrivers().pipe(takeUntil(this.destroy$)).subscribe(d => this.drivers = d);
    this.logisticsService.getVehicles().pipe(takeUntil(this.destroy$)).subscribe(v => this.vehicles = v);
  }

  private recomputeStatusCounts(): void {
    this.logisticsService.getDeliveries({ page: 0, size: 500 }).pipe(takeUntil(this.destroy$)).subscribe(all => {
      const counts: Record<string, number> = { ALL: all.total };
      this.statusFilterOrder.filter(s => s !== 'ALL').forEach(s => {
        counts[s] = all.data.filter(d => d.status === s).length;
      });
      this.statusCounts = counts;
    });
  }

  onSearchInput(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 0; this.loadDeliveries(); }, 300);
  }

  setStatusFilter(status: DeliveryStatus | 'ALL'): void {
    this.statusFilter = status;
    this.page = 0;
    this.loadDeliveries();
  }

  applyFilters(): void {
    this.page = 0;
    this.loadDeliveries();
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'ALL';
    this.typeFilter = 'ALL';
    this.priorityFilter = 'ALL';
    this.page = 0;
    this.loadDeliveries();
  }

  get hasActiveFilters(): boolean {
    return !!this.search || this.statusFilter !== 'ALL' || this.typeFilter !== 'ALL' || this.priorityFilter !== 'ALL';
  }

  nextPage(): void {
    if ((this.page + 1) * this.pageSize < this.total) { this.page++; this.loadDeliveries(); }
  }

  prevPage(): void {
    if (this.page > 0) { this.page--; this.loadDeliveries(); }
  }

  get pageStart(): number { return this.total === 0 ? 0 : this.page * this.pageSize + 1; }
  get pageEnd(): number { return Math.min((this.page + 1) * this.pageSize, this.total); }

  // ============================================
  // NAVIGATION BETWEEN FULL-PAGE VIEWS
  // ============================================

  openDelivery(delivery: Delivery): void {
    this.selectedDelivery = delivery;
    this.view = 'detail';
    this.showAssignPanel = false;
    this.assignForm = { driverId: delivery.driverId || '', vehicleId: delivery.vehicleId || '' };
  }

  backToList(): void {
    this.view = 'list';
    this.selectedDelivery = undefined;
    this.loadDeliveries();
  }

  openNewDeliveryForm(): void {
    this.formModel = this.blankFormModel();
    this.formItems = [{ name: '', sku: '', quantity: 1, unit: 'pcs' }];
    this.view = 'form';
  }

  cancelForm(): void {
    this.view = 'list';
  }

  private blankFormModel() {
    return {
      type: 'CUSTOMER_DELIVERY' as DeliveryType,
      priority: 'MEDIUM' as DeliveryPriority,
      linkedOrderRef: '',
      originLabel: '',
      originLine1: '',
      destinationLabel: '',
      destinationLine1: '',
      destinationContactName: '',
      destinationContactPhone: '',
      driverId: '',
      vehicleId: '',
      notes: '',
    };
  }

  // ============================================
  // NEW DELIVERY FORM
  // ============================================

  addFormItem(): void {
    this.formItems.push({ name: '', sku: '', quantity: 1, unit: 'pcs' });
  }

  removeFormItem(index: number): void {
    if (this.formItems.length > 1) this.formItems.splice(index, 1);
  }

  get isFormValid(): boolean {
    return !!(
      this.formModel.originLabel.trim() &&
      this.formModel.originLine1.trim() &&
      this.formModel.destinationLabel.trim() &&
      this.formModel.destinationLine1.trim() &&
      this.formItems.every(it => it.name.trim() && it.quantity > 0)
    );
  }

  submitNewDelivery(): void {
    if (!this.isFormValid) {
      this.messageService.add({ severity: 'warn', summary: 'Missing details', detail: 'Fill in all required fields before creating the delivery.' });
      return;
    }
    this.isSubmittingForm = true;
    const payload: NewDeliveryPayload = {
      type: this.formModel.type,
      priority: this.formModel.priority,
      linkedOrderRef: this.formModel.linkedOrderRef || undefined,
      originLabel: this.formModel.originLabel,
      originLine1: this.formModel.originLine1,
      destinationLabel: this.formModel.destinationLabel,
      destinationLine1: this.formModel.destinationLine1,
      destinationContactName: this.formModel.destinationContactName || undefined,
      destinationContactPhone: this.formModel.destinationContactPhone || undefined,
      driverId: this.formModel.driverId || undefined,
      vehicleId: this.formModel.vehicleId || undefined,
      items: this.formItems,
      notes: this.formModel.notes || undefined,
    };

    this.logisticsService.createDelivery(payload).subscribe({
      next: (created) => {
        this.isSubmittingForm = false;
        this.messageService.add({ severity: 'success', summary: 'Delivery created', detail: `${created.deliveryNumber} has been added.` });
        this.openDelivery(created);
        this.loadDeliveries();
      },
      error: () => {
        this.isSubmittingForm = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not create delivery. Try again.' });
      }
    });
  }

  // ============================================
  // DETAIL ACTIONS
  // ============================================

  toggleAssignPanel(): void {
    this.showAssignPanel = !this.showAssignPanel;
  }

  saveAssignment(): void {
    if (!this.selectedDelivery || !this.assignForm.driverId || !this.assignForm.vehicleId) {
      this.messageService.add({ severity: 'warn', summary: 'Select both', detail: 'Choose a driver and a vehicle to assign.' });
      return;
    }
    this.isSavingAssignment = true;
    this.logisticsService.assignDriverAndVehicle(this.selectedDelivery.id, this.assignForm.driverId, this.assignForm.vehicleId)
      .subscribe({
        next: (updated) => {
          this.isSavingAssignment = false;
          this.showAssignPanel = false;
          if (updated) this.selectedDelivery = updated;
          this.messageService.add({ severity: 'success', summary: 'Assigned', detail: 'Driver and vehicle assigned to delivery.' });
        },
        error: () => {
          this.isSavingAssignment = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not assign driver/vehicle.' });
        }
      });
  }

  advanceStatus(): void {
    if (!this.selectedDelivery) return;
    const idx = this.statusFlow.indexOf(this.selectedDelivery.status);
    if (idx === -1 || idx === this.statusFlow.length - 1) return;
    const next = this.statusFlow[idx + 1];
    this.logisticsService.updateDeliveryStatus(this.selectedDelivery.id, next).subscribe(updated => {
      if (updated) this.selectedDelivery = updated;
    });
  }

  markDelayed(): void {
    if (!this.selectedDelivery) return;
    this.logisticsService.updateDeliveryStatus(this.selectedDelivery.id, 'DELAYED', 'Marked delayed by dispatcher').subscribe(updated => {
      if (updated) this.selectedDelivery = updated;
    });
  }

  cancelDelivery(): void {
    if (!this.selectedDelivery) return;
    this.logisticsService.updateDeliveryStatus(this.selectedDelivery.id, 'CANCELLED', 'Cancelled by dispatcher').subscribe(updated => {
      if (updated) this.selectedDelivery = updated;
    });
  }

  get nextStatusLabel(): string {
    if (!this.selectedDelivery) return '';
    const idx = this.statusFlow.indexOf(this.selectedDelivery.status);
    if (idx === -1 || idx === this.statusFlow.length - 1) return '';
    return this.statusMeta[this.statusFlow[idx + 1]].label;
  }

  availableDrivers(): Driver[] {
    return this.drivers.filter(d => d.status === 'ON_DUTY' || d.id === this.assignForm.driverId);
  }

  availableVehicles(): Vehicle[] {
    return this.vehicles.filter(v => v.status === 'ACTIVE' || v.status === 'IDLE' || v.id === this.assignForm.vehicleId);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatCurrency(v: number): string {
    return this.logisticsService.formatCurrency(v);
  }
}
