import { Component, OnInit } from '@angular/core';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';

@Component({
  selector: 'app-shift-list',
  templateUrl: './shift-list.component.html',
  styleUrl: './shift-list.component.scss'
})
export class ShiftListComponent implements OnInit{
  shifts: ShiftDTO[] = [];
  filteredShifts: ShiftDTO[] = [];

  searchText = '';
  departmentFilter = '';

  morningCount = 0;
  eveningCount = 0;
  nightCount = 0;

  constructor(private shiftserviceService: ShiftserviceService) {}

  ngOnInit(): void {
    this.shiftserviceService.shifts$.subscribe(shifts => {
      this.shifts = shifts;
      this.filteredShifts = shifts;
      this.calculateSummary();
    });
  }

  applyFilter() {
  this.filteredShifts = this.shifts.filter(shift => {
    const matchesName =
      !this.searchText ||
      shift.name.toLowerCase().includes(this.searchText.toLowerCase());

    const matchesDepartment =
      !this.departmentFilter ||
      shift.department === this.departmentFilter;

    return matchesName && matchesDepartment;
  });
}

resetFilter() {
  this.searchText = '';
  this.departmentFilter = '';

  this.filteredShifts = this.shifts;
}

  calculateSummary() {
    this.morningCount = this.shifts.filter(s =>
      s.name.toLowerCase().includes('morning')
    ).length;

    this.eveningCount = this.shifts.filter(s =>
      s.name.toLowerCase().includes('evening')
    ).length;

    this.nightCount = this.shifts.filter(s =>
      s.name.toLowerCase().includes('night')
    ).length;
  }

  /*createShift() {
    console.log("open shift form");
  }*/

  showForm = false;
  selectedShift?: ShiftDTO;

createShift() {
  this.selectedShift = undefined;
  this.showForm = true;
}

editShift(shift: ShiftDTO) {
  this.selectedShift = shift;
  this.showForm = true;
}

closeForm() {
  this.showForm = false;
}


}
