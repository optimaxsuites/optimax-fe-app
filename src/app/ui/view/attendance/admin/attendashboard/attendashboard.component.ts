import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AttendashboardService } from '../../../../service/attendance/attendashboard.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';

@Component({
  selector: 'app-attendashboard',
  templateUrl: './attendashboard.component.html',
  styleUrl: './attendashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendashboardComponent implements OnInit{

  private attendashboardService = inject(AttendashboardService);
  private attendanceService = inject(AttendancetableService);

  activeTab: 'dashboard' | 'reports' = 'dashboard';

  stats$ = this.attendashboardService.getTodayStats();
  heatmap$ = this.attendashboardService.getDepartmentHeatmap();
  lateArrivals$ = this.attendashboardService.getLateArrivals();
  statsData: any;
  heatmapData: { department: string; attendance: number }[] = [];
  lateArrivalsData: any[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];
  currentFilters: any = {};

  onDataChange(event: { data: AttendanceTableRecord[], filters:any }) {
  this.filteredAttendance = event.data;
  this.currentFilters = event.filters;
  this.calculateDashboardData();
}
  calculateDashboardData() {const data = this.filteredAttendance;

  const total = data.length;

  const present = data.filter(r => r.status === 'PRESENT').length;
  const absent = data.filter(r => r.status === 'ABSENT').length;
  const late = data.filter(r => r.status === 'LATE').length;
  const onLeave = data.filter(r => r.status === 'ON_LEAVE').length;

  //stats
  this.statsData = {
    present: ((present / total) * 100).toFixed(1),
    absent: ((absent / total) * 100).toFixed(1),
    late: ((late / total) * 100).toFixed(1),
    onLeave: ((onLeave / total) * 100).toFixed(1)
  };

 //latearrivals
  this.lateArrivalsData = data
    .filter(r => r.status === 'LATE')
    .map(r => ({
      id: r.id,
      name: r.employee,
      time: r.checkIn
    }));

 //heatmap

  const departmentMap: any = {};

  data.forEach(record => {

    if (!departmentMap[record.department]) {
      departmentMap[record.department] = {
        total: 0,
        present: 0
      };
    }

    departmentMap[record.department].total++;

    if (record.status === 'PRESENT') {
      departmentMap[record.department].present++;
    }
  });

  const departmentRates = Object.keys(departmentMap).map(dept => {
    const deptData = departmentMap[dept];
    const rate = (deptData.present / deptData.total) * 100;

    return {
      department: dept,
      attendance: Number(rate.toFixed(1))
    };
  });

  this.heatmapData = departmentRates
    .sort((a, b) => b.attendance - a.attendance)
    .slice(0, 3);
}

  ngOnInit(): void {
    this.attendanceService.attendance$.subscribe(data => {
    const today = new Date().toISOString().split('T')[0];

    const todaysData = data.filter(r => r.date === today);

    this.filteredAttendance = todaysData;

    this.calculateDashboardData();
  });
    
  }

}
