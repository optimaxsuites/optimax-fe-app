import { Component, Input, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';

@Component({
  selector: 'app-attendancesummary',
  templateUrl: './attendancesummary.component.html',
  styleUrl: './attendancesummary.component.scss'
})
export class AttendancesummaryComponent implements OnChanges {

  @Input() data: AttendanceTableRecord[] = [];
  @ViewChild('attendanceChart') chartRef!: ElementRef<HTMLCanvasElement>;

  viewReady = false;

  summary = {
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    avgHours: 0
  };

  ngAfterViewInit() {
    this.viewReady = true;
  }

  ngOnChanges() {
    this.calculateSummary();
  }

  private calculateSummary() {
    const total = this.data.length;
    const present = this.data.filter(r => r.status === 'PRESENT').length;
    const late = this.data.filter(r => r.status === 'LATE').length;
    const absent = this.data.filter(r => r.status === 'ABSENT').length;

    const totalHours = this.data.reduce((sum, r) => sum + (r.hours || 0), 0);
    const avgHours = total ? +(totalHours / total).toFixed(1) : 0;

    this.summary = { total, present, late, absent, avgHours };
  }

}
