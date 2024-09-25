import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { AttendanceSheetsComponent } from '../attendance-sheet/attendance-sheet.component';
import { MyAttendanceComponent } from '../my-attendance/my-attendance.component';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Attendance Sheet', component: AttendanceSheetsComponent },
    { name: 'My attendance', component: MyAttendanceComponent },
  ];
}
