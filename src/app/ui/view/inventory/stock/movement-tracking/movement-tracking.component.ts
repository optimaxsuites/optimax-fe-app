// movement-tracking.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin, interval } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  StockMovement,
  MovementStatus,
  MovementType,
  Branch,
  Product,
  getMovementTypeLabel,
  getMovementTypeIcon,
  getMovementStatusLabel
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// INTERFACES
// ============================================================

export interface TrackingUpdate {
  id: string;
  movementId: string;
  status: MovementStatus;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  timestamp: Date;
  notes: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  estimatedArrival: Date;
  actualArrival?: Date;
  trackingUrl?: string;
  progress: number; // 0-100
}

export interface TrackingStats {
  totalInTransit: number;
  totalDelivered: number;
  totalDelayed: number;
  averageDeliveryTime: number; // in hours
  onTimeDeliveryRate: number; // percentage
  activeDrivers: number;
  totalVehicles: number;
}

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-movement-tracking',
  templateUrl: './movement-tracking.component.html',
  styleUrls: ['./movement-tracking.component.scss']
})
export class MovementTrackingComponent implements OnInit, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() movementId: string = '';
  @Input() autoRefresh: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() trackingComplete = new EventEmitter<StockMovement>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  movements: StockMovement[] = [];
  filteredMovements: StockMovement[] = [];
  selectedMovement: StockMovement | null = null;
  trackingUpdates: TrackingUpdate[] = [];
  currentTracking: TrackingUpdate | null = null;
  branches: Branch[] = [];
  products: Product[] = [];
  trackingStats: TrackingStats | null = null;
  isLoading: boolean = true;
  isRefreshing: boolean = false;
  isSubmitting: boolean = false;
  error: string | null = null;
  refreshInterval: any = null;

  // UI
  activeTab: 'tracking' | 'history' | 'fleet' | 'stats' = 'tracking';
  selectedFilter: 'ALL' | 'IN_TRANSIT' | 'DELAYED' | 'COMPLETED' = 'ALL';
  selectedTypeFilter: 'ALL' | MovementType = 'ALL';
  showUpdateModal: boolean = false;
  showConfirmModal: boolean = false;
  showDriverModal: boolean = false;
  searchTerm: string = '';
  mapView: 'route' | 'satellite' = 'route';
  selectedDriverId: string = '';

  // Form
  updateForm: FormGroup;
  driverForm: FormGroup;
  searchSubject = new Subject<string>();

  // Private
  private destroy$ = new Subject<void>();
  private Math = Math;

  // Movement-type breakdown list for the Statistics tab — a typed array (rather than a plain
  // string array cast with `as MovementType` inline in the template, which Angular's template
  // parser rejects) so getMovementTypeIcon()/getMovementTypeLabel() can be called directly.
  movementTypeList: MovementType[] = [
    MovementType.PURCHASE,
    MovementType.TRANSFER,
    MovementType.SALE,
    MovementType.RETURN,
    MovementType.ADJUSTMENT,
    MovementType.DAMAGED
  ];

  // Mock drivers data
  drivers = [
    { id: 'drv-1', name: 'Chidi Okonkwo', phone: '+234-803-123-4567', vehicle: 'Toyota Hilux', plate: 'LAG-123-AB', status: 'ACTIVE' },
    { id: 'drv-2', name: 'Amina Bello', phone: '+234-802-234-5678', vehicle: 'Mercedes Sprinter', plate: 'ABJ-456-CD', status: 'ACTIVE' },
    { id: 'drv-3', name: 'Oluwaseun Adeyemi', phone: '+234-805-345-6789', vehicle: 'Isuzu Truck', plate: 'PHC-789-EF', status: 'ON_ROUTE' },
    { id: 'drv-4', name: 'Ngozi Eze', phone: '+234-803-456-7890', vehicle: 'Ford Transit', plate: 'LAG-234-GH', status: 'AVAILABLE' },
    { id: 'drv-5', name: 'Emeka Okafor', phone: '+234-806-567-8901', vehicle: 'MAN Truck', plate: 'KAN-567-IJ', status: 'ON_ROUTE' }
  ];

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
    this.updateForm = this.buildUpdateForm();
    this.driverForm = this.buildDriverForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get movement ID from route if not provided
    if (!this.movementId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['movementId']) {
          this.movementId = params['movementId'];
          this.loadData();
        } else {
          this.loadData();
        }
      });
    } else {
      this.loadData();
    }

    // Setup auto-refresh
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.refreshTracking();
      }, 30000); // Refresh every 30 seconds
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildUpdateForm(): FormGroup {
    return this.fb.group({
      status: ['', Validators.required],
      location: ['', Validators.required],
      notes: ['', Validators.maxLength(500)],
      estimatedArrival: ['', Validators.required],
      driverId: ['', Validators.required],
      vehicleId: [''],
      notifyRecipient: [true]
    });
  }

  private buildDriverForm(): FormGroup {
    return this.fb.group({
      driverId: ['', Validators.required],
      vehicleId: [''],
      estimatedArrival: ['', Validators.required],
      notes: ['']
    });
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      movements: this.inventoryService.getMovements({ limit: 200 }),
      branches: this.inventoryService.getBranches(),
      products: this.inventoryService.getProducts({ limit: 500 })
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ movements, branches, products }) => {
          this.movements = movements.data || [];
          this.branches = branches;
          this.products = products.data || [];
          this.filterMovements();
          this.generateTrackingData();
          this.calculateStats();
          
          // Auto-select movement if ID provided
          if (this.movementId) {
            this.selectedMovement = this.movements.find(m => m.id === this.movementId) || null;
            if (this.selectedMovement) {
              this.currentTracking = this.trackingUpdates.find(t => t.movementId === this.movementId) || null;
            }
          } else if (this.movements.length > 0 && !this.selectedMovement) {
            this.selectFirstInTransit();
          }
          
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load movements:', err);
          this.error = 'Failed to load tracking data. Please try again.';
          this.isLoading = false;
        }
      });
  }

  refreshTracking(): void {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.generateTrackingData();
    this.calculateStats();
    setTimeout(() => {
      this.isRefreshing = false;
    }, 500);
  }

  private selectFirstInTransit(): void {
    const inTransit = this.movements.filter(m => m.status === MovementStatus.IN_TRANSIT);
    if (inTransit.length > 0) {
      this.selectedMovement = inTransit[0];
      this.currentTracking = this.trackingUpdates.find(t => t.movementId === this.selectedMovement?.id) || null;
    } else if (this.movements.length > 0) {
      this.selectedMovement = this.movements[0];
      this.currentTracking = this.trackingUpdates.find(t => t.movementId === this.selectedMovement?.id) || null;
    }
  }

  // ============================================================
  // TRACKING DATA GENERATION
  // ============================================================

  private generateTrackingData(): void {
    this.trackingUpdates = this.movements.map(movement => {
      const status = movement.status;
      const progress = this.calculateProgress(movement);
      
      // Generate mock location data
      const locations = [
        { lat: 6.4281 + (Math.random() - 0.5) * 0.1, lng: 3.4219 + (Math.random() - 0.5) * 0.1 },
        { lat: 6.4584 + (Math.random() - 0.5) * 0.1, lng: 3.4219 + (Math.random() - 0.5) * 0.1 },
        { lat: 6.4981 + (Math.random() - 0.5) * 0.1, lng: 3.4219 + (Math.random() - 0.5) * 0.1 }
      ];
      const loc = locations[Math.floor(Math.random() * locations.length)];

      // Get a random driver
      const driver = this.drivers[Math.floor(Math.random() * this.drivers.length)];

      // Calculate estimated arrival
      const now = new Date();
      const eta = new Date(now.getTime() + (30 + Math.random() * 120) * 60000);

      // Check if delayed
      const isDelayed = status === MovementStatus.IN_TRANSIT && Math.random() > 0.7;

      return {
        id: `track-${movement.id}`,
        movementId: movement.id,
        status: status,
        location: {
          lat: loc.lat,
          lng: loc.lng,
          address: `${this.getBranchName(movement.fromLocation?.id || '')} → ${this.getBranchName(movement.toLocation?.id || '')}`
        },
        timestamp: new Date(),
        notes: isDelayed ? 'Delayed due to traffic' : 'On schedule',
        driverId: driver.id,
        driverName: driver.name,
        vehicleId: driver.id,
        vehiclePlate: driver.plate,
        estimatedArrival: eta,
        actualArrival: status === MovementStatus.COMPLETED ? new Date(now.getTime() - Math.random() * 3600000) : undefined,
        trackingUrl: `https://track.erpsales.ng/${movement.id}`,
        progress: progress
      };
    });

    // Update current tracking if selected
    if (this.selectedMovement) {
      this.currentTracking = this.trackingUpdates.find(t => t.movementId === this.selectedMovement?.id) || null;
    }
  }

  private calculateProgress(movement: StockMovement): number {
    if (movement.status === MovementStatus.COMPLETED) return 100;
    if (movement.status === MovementStatus.CANCELLED) return 0;
    if (movement.status === MovementStatus.PENDING) return 5;
    
    // In transit - calculate based on time
    const created = new Date(movement.createdAt).getTime();
    const now = Date.now();
    const elapsed = now - created;
    const estimatedTotal = 2 * 60 * 60 * 1000; // 2 hours estimated
    const progress = Math.min(Math.round((elapsed / estimatedTotal) * 100), 95);
    return Math.max(progress, 5);
  }

  private calculateStats(): void {
    const inTransit = this.movements.filter(m => m.status === MovementStatus.IN_TRANSIT);
    const delivered = this.movements.filter(m => m.status === MovementStatus.COMPLETED);
    const delayed = inTransit.filter(m => Math.random() > 0.7);

    // Calculate average delivery time (mock)
    const avgDeliveryTime = delivered.length > 0 ? 2.5 + Math.random() * 3 : 0;
    
    // On-time delivery rate (mock)
    const onTimeRate = 75 + Math.random() * 20;

    // Active drivers
    const activeDrivers = this.drivers.filter(d => d.status === 'ACTIVE' || d.status === 'ON_ROUTE').length;

    this.trackingStats = {
      totalInTransit: inTransit.length,
      totalDelivered: delivered.length,
      totalDelayed: delayed.length,
      averageDeliveryTime: avgDeliveryTime,
      onTimeDeliveryRate: onTimeRate,
      activeDrivers: activeDrivers,
      totalVehicles: this.drivers.length
    };
  }

  // ============================================================
  // FILTERING
  // ============================================================

  filterMovements(): void {
    let filtered = [...this.movements];

    // Filter by status
    if (this.selectedFilter === 'IN_TRANSIT') {
      filtered = filtered.filter(m => m.status === MovementStatus.IN_TRANSIT);
    } else if (this.selectedFilter === 'DELAYED') {
      filtered = filtered.filter(m => m.status === MovementStatus.IN_TRANSIT && Math.random() > 0.7);
    } else if (this.selectedFilter === 'COMPLETED') {
      filtered = filtered.filter(m => m.status === MovementStatus.COMPLETED);
    }

    // Filter by movement type
    if (this.selectedTypeFilter !== 'ALL') {
      filtered = filtered.filter(m => m.movementType === this.selectedTypeFilter);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.productName?.toLowerCase().includes(term) ||
        m.sku?.toLowerCase().includes(term) ||
        m.id?.toLowerCase().includes(term) ||
        m.fromLocation?.name?.toLowerCase().includes(term) ||
        m.toLocation?.name?.toLowerCase().includes(term)
      );
    }

    // Sort: In transit first, then by date
    filtered.sort((a, b) => {
      if (a.status === MovementStatus.IN_TRANSIT && b.status !== MovementStatus.IN_TRANSIT) return -1;
      if (a.status !== MovementStatus.IN_TRANSIT && b.status === MovementStatus.IN_TRANSIT) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    this.filteredMovements = filtered;
  }

  setFilter(filter: 'ALL' | 'IN_TRANSIT' | 'DELAYED' | 'COMPLETED'): void {
    this.selectedFilter = filter;
    this.filterMovements();
  }

  setTypeFilter(type: 'ALL' | MovementType): void {
    this.selectedTypeFilter = type;
    this.filterMovements();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.searchTerm = target.value;
      this.filterMovements();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedFilter = 'ALL';
    this.selectedTypeFilter = 'ALL';
    this.filterMovements();
  }

  // ============================================================
  // SELECTION
  // ============================================================

  selectMovement(movementId: string): void {
    this.selectedMovement = this.movements.find(m => m.id === movementId) || null;
    if (this.selectedMovement) {
      this.currentTracking = this.trackingUpdates.find(t => t.movementId === movementId) || null;
      // Reset forms
      this.updateForm.reset();
      this.driverForm.reset();
      this.showUpdateModal = false;
      this.showConfirmModal = false;
      this.showDriverModal = false;
    }
  }

  // ============================================================
  // TRACKING ACTIONS
  // ============================================================

  openUpdateModal(): void {
    if (!this.selectedMovement) return;
    
    // Pre-fill form with current data
    this.updateForm.patchValue({
      status: this.selectedMovement.status,
      location: this.currentTracking?.location?.address || '',
      estimatedArrival: this.formatDateTimeInput(this.currentTracking?.estimatedArrival || new Date()),
      driverId: this.currentTracking?.driverId || '',
      vehicleId: this.currentTracking?.vehicleId || '',
      notes: this.currentTracking?.notes || ''
    });
    
    this.showUpdateModal = true;
  }

  closeUpdateModal(): void {
    this.showUpdateModal = false;
    this.updateForm.reset();
  }

  submitUpdate(): void {
    if (this.updateForm.invalid || !this.selectedMovement) {
      this.updateForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.updateForm.value;

    // Update movement status
    const newStatus = formValue.status as MovementStatus;
    
    // Simulate API call
    setTimeout(() => {
      if (this.selectedMovement) {
        this.selectedMovement.status = newStatus;
        if (newStatus === MovementStatus.COMPLETED) {
          this.selectedMovement.completedAt = new Date();
          this.trackingComplete.emit(this.selectedMovement);
        }
        
        // Update tracking
        if (this.currentTracking) {
          this.currentTracking.status = newStatus;
          this.currentTracking.notes = formValue.notes || this.currentTracking.notes;
          this.currentTracking.estimatedArrival = new Date(formValue.estimatedArrival);
          this.currentTracking.driverId = formValue.driverId;
          this.currentTracking.driverName = this.drivers.find(d => d.id === formValue.driverId)?.name || '';
          this.currentTracking.vehiclePlate = this.drivers.find(d => d.id === formValue.driverId)?.plate || '';
          this.currentTracking.timestamp = new Date();
          
          if (newStatus === MovementStatus.COMPLETED) {
            this.currentTracking.progress = 100;
            this.currentTracking.actualArrival = new Date();
          }
        }
        
        // Refresh data
        this.calculateStats();
        this.filterMovements();
      }
      
      this.isSubmitting = false;
      this.showUpdateModal = false;
    }, 1000);
  }

  openDriverModal(): void {
    if (!this.selectedMovement) return;
    
    this.driverForm.patchValue({
      driverId: this.currentTracking?.driverId || '',
      estimatedArrival: this.formatDateTimeInput(this.currentTracking?.estimatedArrival || new Date()),
      notes: this.currentTracking?.notes || ''
    });
    
    this.showDriverModal = true;
  }

  closeDriverModal(): void {
    this.showDriverModal = false;
    this.driverForm.reset();
  }

  assignDriver(): void {
    if (this.driverForm.invalid || !this.selectedMovement) {
      this.driverForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.driverForm.value;

    setTimeout(() => {
      if (this.currentTracking) {
        const driver = this.drivers.find(d => d.id === formValue.driverId);
        this.currentTracking.driverId = formValue.driverId;
        this.currentTracking.driverName = driver?.name || '';
        this.currentTracking.vehiclePlate = driver?.plate || '';
        this.currentTracking.estimatedArrival = new Date(formValue.estimatedArrival);
        this.currentTracking.notes = formValue.notes || this.currentTracking.notes;
        this.currentTracking.timestamp = new Date();
      }
      
      this.isSubmitting = false;
      this.showDriverModal = false;
    }, 1000);
  }

  confirmDelivery(): void {
    if (!this.selectedMovement) return;
    this.showConfirmModal = true;
  }

  completeDelivery(): void {
    if (!this.selectedMovement) return;
    
    this.isSubmitting = true;
    
    setTimeout(() => {
      if (this.selectedMovement) {
        this.selectedMovement.status = MovementStatus.COMPLETED;
        this.selectedMovement.completedAt = new Date();
        
        if (this.currentTracking) {
          this.currentTracking.status = MovementStatus.COMPLETED;
          this.currentTracking.progress = 100;
          this.currentTracking.actualArrival = new Date();
          this.currentTracking.timestamp = new Date();
        }
        
        this.trackingComplete.emit(this.selectedMovement);
        this.calculateStats();
        this.filterMovements();
      }
      
      this.isSubmitting = false;
      this.showConfirmModal = false;
    }, 1000);
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

  viewMovementDetail(movementId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/movements', movementId]);
  }

  viewBranch(branchId: string): void {
    if (branchId) {
      this.router.navigate(['/admin/sales/commerce/inventory/branches', branchId]);
    }
  }

  viewProduct(productId: string): void {
    if (productId) {
      this.router.navigate(['/admin/sales/commerce/inventory/products', productId]);
    }
  }

  // ============================================================
  // EXPORT
  // ============================================================

  exportReport(): void {
    console.log('Exporting tracking report...');
  }

  // ============================================================
  // UI HELPERS
  // ============================================================

  getMovementTypeLabel(type: MovementType): string {
    return getMovementTypeLabel(type);
  }

  getMovementTypeIcon(type: MovementType): string {
    return getMovementTypeIcon(type);
  }

  getMovementStatusLabel(status: MovementStatus): string {
    return getMovementStatusLabel(status);
  }

  getStatusColor(status: MovementStatus): string {
    const map: Record<string, string> = {
      'PENDING': '#F5A623',
      'IN_TRANSIT': '#3B82F6',
      'COMPLETED': '#2EB270',
      'CANCELLED': '#DC2626'
    };
    return map[status] || '#6B7280';
  }

  getStatusIcon(status: MovementStatus): string {
    const map: Record<string, string> = {
      'PENDING': 'fa-clock',
      'IN_TRANSIT': 'fa-truck',
      'COMPLETED': 'fa-check-circle',
      'CANCELLED': 'fa-times-circle'
    };
    return map[status] || 'fa-circle';
  }

  getStatusBadge(status: MovementStatus): string {
    const map: Record<string, string> = {
      'PENDING': 'warning',
      'IN_TRANSIT': 'info',
      'COMPLETED': 'success',
      'CANCELLED': 'danger'
    };
    return map[status] || 'secondary';
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#2EB270';
    if (progress >= 50) return '#3B82F6';
    if (progress >= 25) return '#F5A623';
    return '#F59E0B';
  }

  getTimeRemaining(eta: Date): string {
    if (!eta) return '—';
    const diff = new Date(eta).getTime() - Date.now();
    if (diff <= 0) return 'Arriving now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getEstimatedArrival(eta: Date): string {
    if (!eta) return '—';
    return new Date(eta).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  }

  getProductName(productId: string): string {
    const product = this.products.find(p => p.id === productId);
    return product?.name || productId;
  }

  getDriverName(driverId: string): string {
    const driver = this.drivers.find(d => d.id === driverId);
    return driver?.name || 'Unassigned';
  }

  getDriverStatus(status: string): string {
    const map: Record<string, string> = {
      'ACTIVE': 'Active',
      'ON_ROUTE': 'On Route',
      'AVAILABLE': 'Available',
      'OFF_DUTY': 'Off Duty'
    };
    return map[status] || status;
  }

  getDriverStatusColor(status: string): string {
    const map: Record<string, string> = {
      'ACTIVE': '#3B82F6',
      'ON_ROUTE': '#F5A623',
      'AVAILABLE': '#2EB270',
      'OFF_DUTY': '#6B7280'
    };
    return map[status] || '#6B7280';
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

  formatDate(date: Date | string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date | string): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTimeInput(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  getTimeAgo(date: Date | string): string {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  isInTransit(movement: StockMovement): boolean {
    return movement.status === MovementStatus.IN_TRANSIT;
  }

  isCompleted(movement: StockMovement): boolean {
    return movement.status === MovementStatus.COMPLETED;
  }

  isPending(movement: StockMovement): boolean {
    return movement.status === MovementStatus.PENDING;
  }

  getMovementCount(): number {
    return this.filteredMovements.length;
  }

  getInTransitCount(): number {
    return this.movements.filter(m => m.status === MovementStatus.IN_TRANSIT).length;
  }

  getCompletedCount(): number {
    return this.movements.filter(m => m.status === MovementStatus.COMPLETED).length;
  }

  getPendingCount(): number {
    return this.movements.filter(m => m.status === MovementStatus.PENDING).length;
  }

  getTypeCount(type: MovementType): number {
    return this.movements.filter(m => m.movementType === type).length;
  }

  getDriverCountByStatus(status: string): number {
    return this.drivers.filter(d => d.status === status).length;
  }

  getActiveDriverCount(): number {
    return this.drivers.filter(d => d.status === 'ACTIVE' || d.status === 'ON_ROUTE').length;
  }

  // ============================================================
  // TOGGLE VIEWS
  // ============================================================

  toggleMapView(): void {
    this.mapView = this.mapView === 'route' ? 'satellite' : 'route';
  }

  // ============================================================
  // TRACKING LINK
  // ============================================================

  copyTrackingLink(): void {
    if (this.currentTracking?.trackingUrl) {
      navigator.clipboard?.writeText(this.currentTracking.trackingUrl);
      // Show toast notification
    }
  }

  openTrackingLink(): void {
    if (this.currentTracking?.trackingUrl) {
      window.open(this.currentTracking.trackingUrl, '_blank');
    }
  }
}