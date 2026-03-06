import { Component } from '@angular/core';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';

@Component({
  selector: 'app-employeesummary',
  templateUrl: './employeesummary.component.html',
  styleUrl: './employeesummary.component.scss'
})
export class EmployeesummaryComponent /*implements OnInit*/ {
  monthlyFilteredData: AttendanceTableRecord[] = [];
  /*filteredData: AttendanceTableRecord[] = [];
  ngOnInit(): void {}*/

}
