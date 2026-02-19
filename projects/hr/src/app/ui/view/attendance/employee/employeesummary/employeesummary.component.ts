import { Component } from '@angular/core';
import { AttendanceTableRecord } from '../../../../shared-component/models/attendancetable.model';

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
