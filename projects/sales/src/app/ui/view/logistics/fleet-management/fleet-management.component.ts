import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LogisticsService } from '../../../service/logistics/logistics.service';
import {
  BRANCH_OPTIONS,
  DRIVER_STATUS_META,
  DRIVER_STATUS_OPTIONS,
  Driver,
  DriverFormPayload,
  DriverStatus,
  VEHICLE_STATUS_META,
  VEHICLE_STATUS_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  Vehicle,
  VehicleFormPayload,
  VehicleStatus,
  VehicleType,
} from '../../../domain/logistics/logistics.dto';
import { MessageService } from 'primeng/api';

type FleetTab = 'vehicles' | 'drivers';
type ViewState = 'list' | 'vehicle-detail' | 'driver-detail' | 'vehicle-form' | 'driver-form';

@Component({
  selector: 'app-fleet-management',
  templateUrl: './fleet-management.component.html',
  styleUrl: './fleet-management.component.scss'
})
export class FleetManagementComponent implements OnInit, OnDestroy {
  vehicleStatusMeta = VEHICLE_STATUS_META;
  driverStatusMeta = DRIVER_STATUS_META;
  vehicleStatusOptions = VEHICLE_STATUS_OPTIONS;
  vehicleTypeOptions = VEHICLE_TYPE_OPTIONS;
  driverStatusOptions = DRIVER_STATUS_OPTIONS;
  branchOptions = BRANCH_OPTIONS;

  activeTab: FleetTab = 'vehicles';
  view: ViewState = 'list';
  isLoading = true;

  vehicles: Vehicle[] = [];
  drivers: Driver[] = [];

  vehicleStatusFilter: VehicleStatus | 'ALL' = 'ALL';
  vehicleSearch = '';

  // Detail (editable)
  selectedVehicle?: Vehicle;
  selectedDriver?: Driver;
  isEditingVehicle = false;
  isEditingDriver = false;
  isSaving = false;
  vehicleEditModel!: VehicleFormPayload;
  driverEditModel!: DriverFormPayload;

  // New forms
  isSubmittingForm = false;
  vehicleFormModel: VehicleFormPayload = this.blankVehicleForm();
  driverFormModel: DriverFormPayload = this.blankDriverForm();

  private destroy$ = new Subject<void>();

  constructor(
    private logisticsService: LogisticsService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAll(): void {
    this.isLoading = true;
    this.logisticsService.getVehicles().pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.vehicles = v;
      this.isLoading = false;
    });
    this.logisticsService.getDrivers().pipe(takeUntil(this.destroy$)).subscribe(d => this.drivers = d);
  }

  setTab(tab: FleetTab): void {
    this.activeTab = tab;
  }

  // ============================================
  // LIST HELPERS
  // ============================================

  get filteredVehicles(): Vehicle[] {
    let v = this.vehicles;
    if (this.vehicleStatusFilter !== 'ALL') v = v.filter(x => x.status === this.vehicleStatusFilter);
    if (this.vehicleSearch) {
      const s = this.vehicleSearch.toLowerCase();
      v = v.filter(x => x.plateNumber.toLowerCase().includes(s) || x.name.toLowerCase().includes(s) || (x.assignedDriverName || '').toLowerCase().includes(s));
    }
    return v;
  }

  vehicleCountByStatus(status: VehicleStatus | 'ALL'): number {
    if (status === 'ALL') return this.vehicles.length;
    return this.vehicles.filter(v => v.status === status).length;
  }

  fleetUtilizationAvg(): number {
    if (!this.vehicles.length) return 0;
    return Math.round(this.vehicles.reduce((sum, v) => sum + v.utilizationPct, 0) / this.vehicles.length);
  }

  vehiclesNeedingAttention(): Vehicle[] {
    return this.vehicles.filter(v =>
      v.status === 'MAINTENANCE' || v.status === 'OUT_OF_SERVICE' || v.documents.some(d => d.status !== 'valid')
    );
  }

  // ============================================
  // NAVIGATION
  // ============================================

  openVehicle(v: Vehicle): void {
    this.selectedVehicle = v;
    this.isEditingVehicle = false;
    this.view = 'vehicle-detail';
  }

  openDriver(d: Driver): void {
    this.selectedDriver = d;
    this.isEditingDriver = false;
    this.view = 'driver-detail';
  }

  backToList(): void {
    this.view = 'list';
    this.selectedVehicle = undefined;
    this.selectedDriver = undefined;
    this.loadAll();
  }

  openNewVehicleForm(): void {
    this.vehicleFormModel = this.blankVehicleForm();
    this.view = 'vehicle-form';
  }

  openNewDriverForm(): void {
    this.driverFormModel = this.blankDriverForm();
    this.view = 'driver-form';
  }

  cancelForm(): void {
    this.view = 'list';
  }

  private blankVehicleForm(): VehicleFormPayload {
    return {
      plateNumber: '',
      name: '',
      type: 'VAN',
      status: 'ACTIVE',
      capacityKg: 1000,
      homeBranch: this.branchOptions[0],
      assignedDriverId: '',
    };
  }

  private blankDriverForm(): DriverFormPayload {
    return {
      name: '',
      phone: '',
      email: '',
      licenseNumber: '',
      licenseExpiry: '',
      status: 'ON_DUTY',
      homeBranch: this.branchOptions[0],
      assignedVehicleId: '',
    };
  }

  // ============================================
  // NEW VEHICLE FORM
  // ============================================

  get isVehicleFormValid(): boolean {
    return !!(this.vehicleFormModel.plateNumber.trim() && this.vehicleFormModel.name.trim() && this.vehicleFormModel.capacityKg > 0);
  }

  submitNewVehicle(): void {
    if (!this.isVehicleFormValid) {
      this.messageService.add({ severity: 'warn', summary: 'Missing details', detail: 'Fill in plate number, name and capacity.' });
      return;
    }
    this.isSubmittingForm = true;
    const payload = { ...this.vehicleFormModel, assignedDriverId: this.vehicleFormModel.assignedDriverId || undefined };
    this.logisticsService.createVehicle(payload).subscribe({
      next: (created) => {
        this.isSubmittingForm = false;
        this.messageService.add({ severity: 'success', summary: 'Vehicle added', detail: `${created.plateNumber} has been added to the fleet.` });
        this.vehicles = [created, ...this.vehicles];
        this.openVehicle(created);
      },
      error: () => {
        this.isSubmittingForm = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not add vehicle. Try again.' });
      }
    });
  }

  // ============================================
  // NEW DRIVER FORM
  // ============================================

  get isDriverFormValid(): boolean {
    return !!(this.driverFormModel.name.trim() && this.driverFormModel.phone.trim() && this.driverFormModel.licenseNumber.trim() && this.driverFormModel.licenseExpiry);
  }

  submitNewDriver(): void {
    if (!this.isDriverFormValid) {
      this.messageService.add({ severity: 'warn', summary: 'Missing details', detail: 'Fill in name, phone, and license details.' });
      return;
    }
    this.isSubmittingForm = true;
    const payload = { ...this.driverFormModel, assignedVehicleId: this.driverFormModel.assignedVehicleId || undefined };
    this.logisticsService.createDriver(payload).subscribe({
      next: (created) => {
        this.isSubmittingForm = false;
        this.messageService.add({ severity: 'success', summary: 'Driver added', detail: `${created.name} has been added to the roster.` });
        this.drivers = [created, ...this.drivers];
        this.openDriver(created);
      },
      error: () => {
        this.isSubmittingForm = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not add driver. Try again.' });
      }
    });
  }

  // ============================================
  // EDIT VEHICLE (inline, in detail view)
  // ============================================

  startEditVehicle(): void {
    if (!this.selectedVehicle) return;
    this.vehicleEditModel = {
      plateNumber: this.selectedVehicle.plateNumber,
      name: this.selectedVehicle.name,
      type: this.selectedVehicle.type,
      status: this.selectedVehicle.status,
      capacityKg: this.selectedVehicle.capacityKg,
      homeBranch: this.selectedVehicle.homeBranch,
      assignedDriverId: this.selectedVehicle.assignedDriverId || '',
    };
    this.isEditingVehicle = true;
  }

  cancelEditVehicle(): void {
    this.isEditingVehicle = false;
  }

  saveVehicleEdit(): void {
    if (!this.selectedVehicle) return;
    this.isSaving = true;
    const payload = { ...this.vehicleEditModel, assignedDriverId: this.vehicleEditModel.assignedDriverId || undefined };
    this.logisticsService.updateVehicle(this.selectedVehicle.id, payload).subscribe({
      next: (updated) => {
        this.isSaving = false;
        this.isEditingVehicle = false;
        if (updated) this.selectedVehicle = updated;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Vehicle details updated.' });
      },
      error: () => {
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not save changes.' });
      }
    });
  }

  quickChangeVehicleStatus(status: VehicleStatus): void {
    if (!this.selectedVehicle) return;
    this.logisticsService.updateVehicle(this.selectedVehicle.id, { status }).subscribe(updated => {
      if (updated) this.selectedVehicle = updated;
    });
  }

  // ============================================
  // EDIT DRIVER (inline, in detail view)
  // ============================================

  startEditDriver(): void {
    if (!this.selectedDriver) return;
    this.driverEditModel = {
      name: this.selectedDriver.name,
      phone: this.selectedDriver.phone,
      email: this.selectedDriver.email || '',
      licenseNumber: this.selectedDriver.licenseNumber,
      licenseExpiry: this.selectedDriver.licenseExpiry?.slice(0, 10) || '',
      status: this.selectedDriver.status,
      homeBranch: this.selectedDriver.homeBranch,
      assignedVehicleId: this.selectedDriver.assignedVehicleId || '',
    };
    this.isEditingDriver = true;
  }

  cancelEditDriver(): void {
    this.isEditingDriver = false;
  }

  saveDriverEdit(): void {
    if (!this.selectedDriver) return;
    this.isSaving = true;
    const payload = { ...this.driverEditModel, assignedVehicleId: this.driverEditModel.assignedVehicleId || undefined };
    this.logisticsService.updateDriver(this.selectedDriver.id, payload).subscribe({
      next: (updated) => {
        this.isSaving = false;
        this.isEditingDriver = false;
        if (updated) this.selectedDriver = updated;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Driver details updated.' });
      },
      error: () => {
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not save changes.' });
      }
    });
  }

  quickChangeDriverStatus(status: DriverStatus): void {
    if (!this.selectedDriver) return;
    this.logisticsService.updateDriver(this.selectedDriver.id, { status }).subscribe(updated => {
      if (updated) this.selectedDriver = updated;
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  daysUntil(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 3600 * 24));
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  vehicleTypeLabel(t: VehicleType): string {
    return t.charAt(0) + t.slice(1).toLowerCase();
  }
}
