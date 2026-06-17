import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MonthlyattendancelistComponent } from './monthlyattendancelist/monthlyattendancelist.component';
import { MonthlysummaryComponent } from './monthlysummary/monthlysummary.component';

@Component({
  selector: 'app-employeesummary',
  standalone: true,
  imports: [CommonModule, MonthlyattendancelistComponent, MonthlysummaryComponent],
  templateUrl: './employeesummary.component.html',
  styleUrl: './employeesummary.component.scss'
})
export class EmployeesummaryComponent {

}
