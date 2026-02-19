import { Component, Input, OnChanges } from '@angular/core';
import { AttendanceTableRecord } from '../../../../../shared-component/models/attendancetable.model';

@Component({
  selector: 'app-monthlysummary',
  templateUrl: './monthlysummary.component.html',
  styleUrl: './monthlysummary.component.scss'
})
export class MonthlysummaryComponent implements OnChanges {
   @Input() monthlyData: AttendanceTableRecord[] = []; // 👈 add this

  monthlyPerformance = {
    attendanceRate: 0,
    punctualityScore: 0,
    totalOvertime: 0,
    absences: 0
  };

  ngOnChanges() {
    console.log('Monthly data received:', this.monthlyData);
    this.calculateMonthlyPerformance();
  }

  private calculateMonthlyPerformance() {
  const data = this.monthlyData;

  if (!data || data.length === 0) {
    this.monthlyPerformance = {
      attendanceRate: 0,
      punctualityScore: 0,
      totalOvertime: 0,
      absences: 0
    };
    return;
  }

  const totalDays = data.length;

  const presentDays = data.filter(d =>
    d.status === 'PRESENT' || d.status === 'LATE'
  ).length;

  const lateDays = data.filter(d => d.status === 'LATE').length;

  const absentDays = data.filter(d => d.status === 'ABSENT').length;

  const totalHours = data.reduce((sum, d) => sum + (d.hours ?? 0), 0);

  const expectedHoursPerDay = 8;
  const expectedHours = totalDays * expectedHoursPerDay;

  const overtime = Math.max(totalHours - expectedHours, 0);

  this.monthlyPerformance = {
    attendanceRate: Math.round((presentDays / totalDays) * 100),
    punctualityScore: presentDays
      ? Math.round(((presentDays - lateDays) / presentDays) * 100)
      : 0,
    totalOvertime: parseFloat(overtime.toFixed(1)),
    absences: absentDays
  };


    /*
    if (!this.monthlyData || this.monthlyData.length === 0) {
      this.monthlyPerformance = {
        attendanceRate: 0,
        punctualityScore: 0,
        totalOvertime: 0,
        absences: 0
      };
      return;
    }

    const totalDays = this.monthlyData.length;

    const presentDays = this.monthlyData.filter(d =>
      d.status === 'PRESENT' || d.status === 'LATE'
    ).length;

    const lateDays = this.monthlyData.filter(d => d.status === 'LATE').length;

    const absentDays = this.monthlyData.filter(d => d.status === 'ABSENT').length;

    const totalHours = this.monthlyData.reduce((sum, d) => sum + (d.hours || 0), 0);
    const expectedHours = totalDays * 8; // you can later replace 8 with office hours logic
    const overtime = Math.max(totalHours - expectedHours, 0);

    this.monthlyPerformance.attendanceRate = Math.round((presentDays / totalDays) * 100);
    this.monthlyPerformance.punctualityScore = presentDays
      ? Math.round(((presentDays - lateDays) / presentDays) * 100)
      : 0;
    this.monthlyPerformance.totalOvertime = parseFloat(overtime.toFixed(1));
    this.monthlyPerformance.absences = absentDays;
  */}

}
