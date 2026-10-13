import { Component } from '@angular/core';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';

@Component({
  selector: 'app-employeesummary',
  templateUrl: './employeesummary.component.html',
  styleUrl: './employeesummary.component.scss'
})
export class EmployeesummaryComponent /*implements OnInit*/ {
  monthlyFilteredData: AttendanceTableRecord[] = [];

  onFilteredDataChange(data: AttendanceTableRecord[]): void {
    // The child emits during its own init, after the summary binding above it was checked.
    Promise.resolve().then(() => this.monthlyFilteredData = data);
  }
  /*filteredData: AttendanceTableRecord[] = [];
  ngOnInit(): void {}*/

}
