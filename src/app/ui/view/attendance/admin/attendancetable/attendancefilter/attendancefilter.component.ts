import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
//import { Router, ActivatedRoute } from '@angular/router';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';

@Component({
  selector: 'app-attendancefilter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendancefilter.component.html',
  styleUrl: './attendancefilter.component.scss'
})
export class AttendancefilterComponent {
  //private router = inject(Router);
  //private route = inject(ActivatedRoute);

  @Output() filtersChange = new EventEmitter<any>();

  filters = {
    month: '',
    //dateFrom: '',
    //dateTo: '',
    id: '',
    employee: '',
    department: '',
    status: ''
  };
  attendance: any;

  constructor(private attendancetableService: AttendancetableService) {}

  ngOnInit() {
    this.attendance = this.attendancetableService.getAttendance();
  }

  applyFilters() {
    /*this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.filters,
      queryParamsHandling: 'merge'
    });*/

    console.log('Filters applied: ', this.filters);
    this.filtersChange.emit(this.filters);
  }
}
