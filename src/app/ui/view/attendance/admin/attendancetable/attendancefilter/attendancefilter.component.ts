import { Component, EventEmitter, Output } from '@angular/core';
//import { Router, ActivatedRoute } from '@angular/router';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../shared-component/models/attendancetable.model';

@Component({
  selector: 'app-attendancefilter',
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
