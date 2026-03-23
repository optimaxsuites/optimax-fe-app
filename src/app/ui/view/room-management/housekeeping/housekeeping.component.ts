import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  HotelserviceService,
  MaintenainceRequest,
  HousekeepingRecord,
  Room,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-housekeeping',
  templateUrl: './housekeeping.component.html',
})
export class HousekeepingComponent implements OnInit {
  // Tab: 'housekeeping' | 'maintenance'
  activeTab: 'housekeeping' | 'maintenance' = 'maintenance';

  // Maintenance
  maintenanceRecords: MaintenainceRequest[] = [];
  filteredMaintenance: MaintenainceRequest[] = [];

  // Housekeeping
  housekeepingRecords: HousekeepingRecord[] = [];
  filteredHousekeeping: HousekeepingRecord[] = [];

  rooms: Room[] = [];
  loading = true;

  // Filters
  filterPriority = '';
  filterStatus = '';
  filterRoom = '';

  // Create / Edit drawer
  showDrawer = false;
  drawerMode: 'create' | 'edit' = 'create';
  editingId: number | null = null;

  maintenanceForm!: FormGroup;
  housekeepingForm!: FormGroup;

  tasks: string[] = [];
  priorities: string[] = [];

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  uuid = '';

  // Housekeeping Workflow Modal
  showStatusModal = false;
  selectedHousekeeping: HousekeepingRecord | null = null;
  targetStatus = '';
  statusNotes = '';

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 
                this.route.parent?.snapshot.paramMap.get('uuid') || '';
    this.tasks = this.hotelService.getMaintenanceTasks();
    this.priorities = this.hotelService.getMaintenancePriorities();

    this.maintenanceForm = this.fb.group({
      tasks: ['CLEANING_REQUIRED', Validators.required],
      reasons: [''],
      priority: ['MEDIUM', Validators.required],
      room: [null, Validators.required],
      dueDate: ['', Validators.required],
      startDate: [this.today()],
      notes: [''],
    });

    this.housekeepingForm = this.fb.group({
      status: ['PENDING', Validators.required],
      room: [null, Validators.required],
      lastCleaned: [this.today()],
      notes: [''],
    });

    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.hotelService.getRooms().subscribe({
      next: (rooms) => (this.rooms = rooms),
    });

    this.hotelService.getMaintenanceRequests().subscribe({
      next: (data) => {
        this.maintenanceRecords = data;
        this.filteredMaintenance = [...data];
      },
    });

    this.hotelService.getHousekeepingRecords().subscribe({
      next: (data) => {
        this.housekeepingRecords = data;
        this.filteredHousekeeping = [...data];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // ── Stats ──
  get pendingMaintenanceCount(): number {
    return this.maintenanceRecords.filter((r) => !r.completed).length;
  }
  get completedMaintenanceCount(): number {
    return this.maintenanceRecords.filter((r) => r.completed).length;
  }
  get totalMaintenanceCount(): number {
    return this.maintenanceRecords.length;
  }
  get totalHousekeepingCount(): number {
    return this.housekeepingRecords.length;
  }

  // ── Filters ──
  applyFilters(): void {
    if (this.activeTab === 'maintenance') {
      this.filteredMaintenance = this.maintenanceRecords.filter((r) => {
        const matchPriority = !this.filterPriority || r.priority === this.filterPriority;
        const matchStatus =
          !this.filterStatus ||
          (this.filterStatus === 'COMPLETED' ? r.completed : !r.completed);
        const matchRoom = !this.filterRoom || r.room === +this.filterRoom;
        return matchPriority && matchStatus && matchRoom;
      });
    } else {
      this.filteredHousekeeping = this.housekeepingRecords.filter((r) => {
        const matchStatus = !this.filterStatus || r.status === this.filterStatus;
        const matchRoom = !this.filterRoom || r.room === +this.filterRoom;
        return matchStatus && matchRoom;
      });
    }
  }

  clearFilters(): void {
    this.filterPriority = '';
    this.filterStatus = '';
    this.filterRoom = '';
    this.filteredMaintenance = [...this.maintenanceRecords];
    this.filteredHousekeeping = [...this.housekeepingRecords];
  }

  switchTab(tab: 'housekeeping' | 'maintenance'): void {
    this.activeTab = tab;
    this.clearFilters();
  }

  // ── Room helpers ──
  getRoomNumber(roomId: number): string {
    const room = this.rooms.find((r) => r.id === roomId);
    return room ? `#${room.roomNumber}` : `#${roomId}`;
  }

  getRoomFloor(roomId: number): string {
    const room = this.rooms.find((r) => r.id === roomId);
    return room ? `Floor ${room.floor}` : '';
  }

  getRoomTypeName(roomId: number): string {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) return '';
    return this.hotelService.getRoomTypeNameById(room.roomType);
  }

  // ── Priority styling ──
  getPriorityBadge(priority: string): string {
    const map: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-600',
      MEDIUM: 'bg-amber-100 text-amber-700',
      HIGH: 'bg-red-100 text-red-700',
      URGENT: 'bg-red-500 text-white animate-pulse',
    };
    return map[priority] || 'bg-gray-100 text-gray-600';
  }

  getTaskLabel(task: string): string {
    return task.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  getTaskIcon(task: string): string {
    const map: Record<string, string> = {
      CLEANING_REQUIRED: 'fa-solid fa-broom',
      REPAIR_REQUIRED: 'fa-solid fa-wrench',
      INSPECTION_REQUIRED: 'fa-solid fa-clipboard-check',
      DEEP_CLEANING: 'fa-solid fa-spray-can-sparkles',
      PEST_CONTROL: 'fa-solid fa-bug',
      GENERAL_MAINTENANCE: 'fa-solid fa-screwdriver-wrench',
    };
    return map[task] || 'fa-solid fa-wrench';
  }

  // ── CRUD — Maintenance ──
  openCreateDrawer(): void {
    this.drawerMode = 'create';
    this.editingId = null;
    if (this.activeTab === 'maintenance') {
      this.maintenanceForm.reset({
        tasks: 'CLEANING_REQUIRED',
        reasons: '',
        priority: 'MEDIUM',
        room: null,
        dueDate: '',
        startDate: this.today(),
        notes: '',
      });
    } else {
      this.housekeepingForm.reset({
        status: 'PENDING',
        room: null,
        lastCleaned: this.today(),
        notes: '',
      });
    }
    this.showDrawer = true;
  }

  openEditDrawer(record: any): void {
    this.drawerMode = 'edit';
    this.editingId = record.id;
    if (this.activeTab === 'maintenance') {
      this.maintenanceForm.patchValue({
        tasks: record.tasks,
        reasons: (record.reasons || []).join(', '),
        priority: record.priority,
        room: record.room,
        dueDate: record.dueDate,
        startDate: record.startDate,
        notes: record.notes,
      });
    } else {
      this.housekeepingForm.patchValue({
        status: record.status,
        room: record.room,
        lastCleaned: record.lastCleaned,
        notes: record.notes,
      });
    }
    this.showDrawer = true;
  }

  saveRecord(): void {
    if (this.activeTab === 'maintenance') {
      this.saveMaintenanceRecord();
    } else {
      this.saveHousekeepingRecord();
    }
  }

  private saveMaintenanceRecord(): void {
    const v = this.maintenanceForm.value;
    const record: any = {
      tasks: v.tasks,
      reasons: v.reasons ? v.reasons.split(',').map((r: string) => r.trim()) : [],
      priority: v.priority,
      room: +v.room,
      dueDate: v.dueDate,
      startDate: v.startDate || this.today(),
      notes: v.notes || '',
      completed: false,
      completedAt: '',
    };

    if (this.drawerMode === 'edit' && this.editingId) {
      record.id = this.editingId;
      this.hotelService.updateMaintenanceRequest(this.editingId, record).subscribe({
        next: () => {
          this.showToastMessage('Record updated', 'success');
          this.showDrawer = false;
          this.loadData();
        },
        error: () => this.showToastMessage('Update failed', 'error'),
      });
    } else {
      this.hotelService.createMaintenanceRequest(record).subscribe({
        next: () => {
          this.showToastMessage('Task created', 'success');
          this.showDrawer = false;
          this.loadData();
        },
        error: () => this.showToastMessage('Creation failed', 'error'),
      });
    }
  }

  private saveHousekeepingRecord(): void {
    const v = this.housekeepingForm.value;
    const record: HousekeepingRecord = {
      status: v.status,
      room: +v.room,
      lastCleaned: v.lastCleaned || this.today(),
      notes: v.notes || '',
    };

    if (this.drawerMode === 'edit' && this.editingId) {
      record.id = this.editingId;
      this.hotelService.updateHousekeepingRecord(this.editingId, record).subscribe({
        next: () => {
          this.showToastMessage('Record updated', 'success');
          this.showDrawer = false;
          this.loadData();
        },
        error: () => this.showToastMessage('Update failed', 'error'),
      });
    } else {
      this.hotelService.createHousekeepingRecord(record).subscribe({
        next: () => {
          this.showToastMessage('Record created', 'success');
          this.showDrawer = false;
          this.loadData();
        },
        error: () => this.showToastMessage('Creation failed', 'error'),
      });
    }
  }

  // ── Housekeeping Workflow ──
  openStatusModal(record: HousekeepingRecord, status: string): void {
    this.selectedHousekeeping = record;
    this.targetStatus = status;
    this.statusNotes = record.notes || '';
    this.showStatusModal = true;
  }

  confirmStatusChange(): void {
    if (!this.selectedHousekeeping || !this.selectedHousekeeping.id) return;

    const updated: HousekeepingRecord = {
      ...this.selectedHousekeeping,
      status: this.targetStatus,
      notes: this.statusNotes,
      lastCleaned: this.targetStatus === 'CLEANED' ? this.today() : this.selectedHousekeeping.lastCleaned
    };

    this.hotelService.updateHousekeepingRecord(this.selectedHousekeeping.id, updated).subscribe({
      next: () => {
        this.showToastMessage(`Housekeeping status updated to ${this.targetStatus}`, 'success');
        this.showStatusModal = false;
        this.loadData();
        
        // If Cleaned, set room to AVAILABLE
        if (this.targetStatus === 'CLEANED') {
          const room = this.rooms.find(r => r.id === updated.room);
          if (room) {
            this.hotelService.updateRoom(room.id, { ...room, roomStatus: 'AVAILABLE' }).subscribe(() => {
              this.hotelService.refreshRoomsCache();
            });
          }
        }
      },
      error: () => this.showToastMessage('Failed to update status', 'error')
    });
  }

  completeTask(record: MaintenainceRequest): void {
    const updated: any = { ...record, completed: true, completedAt: this.today() };
    this.hotelService.updateMaintenanceRequest(record.id!, updated).subscribe({
      next: () => {
        this.showToastMessage('Task completed!', 'success');
        this.loadData();
        // Update room status to AVAILABLE
        const room = this.rooms.find((r) => r.id === record.room);
        if (room) {
          const updatedRoom = { ...room, roomStatus: 'AVAILABLE' as const };
          this.hotelService.updateRoom(room.id, updatedRoom).subscribe();
          this.hotelService.refreshRoomsCache();
        }
      },
      error: () => this.showToastMessage('Failed to complete', 'error'),
    });
  }

  deleteRecord(id: number): void {
    if (this.activeTab === 'maintenance') {
      this.hotelService.deleteMaintenanceRequest(id).subscribe({
        next: () => {
          this.showToastMessage('Deleted', 'success');
          this.loadData();
        },
        error: () => this.showToastMessage('Delete failed', 'error'),
      });
    } else {
      this.hotelService.deleteHousekeepingRecord(id).subscribe({
        next: () => {
          this.showToastMessage('Deleted', 'success');
          this.loadData();
        },
        error: () => this.showToastMessage('Delete failed', 'error'),
      });
    }
  }

  // ── Helpers ──
  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3000);
  }
}
