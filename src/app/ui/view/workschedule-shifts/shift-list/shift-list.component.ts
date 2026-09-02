import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { WorkShiftDTO } from '../../../domain/workschedule-shift/shift.dto';

@Component({
  selector: 'app-shift-list',
  templateUrl: './shift-list.component.html',
  styleUrl: './shift-list.component.scss'
})
export class ShiftListComponent implements OnInit, OnDestroy {

  /** Set when hosted in a drawer, so the header can offer a close button. */
  @Input() dismissable = false;

  /**
   * Opens the create form immediately. Lets a host whose button reads
   * "Create a new shift" land on the form rather than on the list, while the
   * catalogue sits behind it for reference.
   */
  @Input() autoOpenForm = false;

  @Output() dismiss = new EventEmitter<void>();

  shifts: WorkShiftDTO[] = [];
  filteredShifts: WorkShiftDTO[] = [];

  searchText = '';
  shiftTypeFilter = '';

  readonly shiftTypes: WorkShiftDTO['type'][] = ['morning', 'evening', 'night', 'custom'];

  showForm = false;
  selectedShift?: WorkShiftDTO;

  private shiftSub?: Subscription;

  constructor(private shiftserviceService: ShiftserviceService) {}

  ngOnInit(): void {
    this.shiftSub = this.shiftserviceService.shifts$.subscribe(shifts => {
      this.shifts = shifts;
      this.applyFilter();
    });

    if (this.autoOpenForm) this.createShift();
  }

  ngOnDestroy(): void {
    this.shiftSub?.unsubscribe();
  }

  /** Called on every keystroke and select change — no Apply button needed. */
  applyFilter(): void {
    const query = this.searchText.trim().toLowerCase();

    this.filteredShifts = this.shifts.filter(shift => {
      const matchesName = !query || shift.name.toLowerCase().includes(query);
      const matchesType = !this.shiftTypeFilter || shift.type === this.shiftTypeFilter;
      return matchesName && matchesType;
    });
  }

  resetFilter(): void {
    this.searchText = '';
    this.shiftTypeFilter = '';
    this.applyFilter();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.shiftTypeFilter);
  }

  createShift(): void {
    this.selectedShift = undefined;
    this.showForm = true;
  }

  editShift(shift: WorkShiftDTO): void {
    this.selectedShift = shift;
    this.showForm = true;
  }

  deleteShift(shift: WorkShiftDTO): void {
    // Deleting a definition orphans every schedule pointing at it, so confirm.
    if (!confirm(`Delete the "${shift.name}" shift?`)) return;
    this.shiftserviceService.deleteShift(shift.id);
  }

  closeForm(): void {
    this.showForm = false;
  }

  duration(shift: WorkShiftDTO): string {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    let span = toMinutes(shift.endTime) - toMinutes(shift.startTime);
    if (span <= 0) span += 24 * 60; // overnight shift

    const hours = Math.floor(span / 60);
    const minutes = span % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}
