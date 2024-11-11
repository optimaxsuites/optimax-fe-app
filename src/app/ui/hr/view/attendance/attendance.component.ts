import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { AttendanceSheetsComponent } from '../attendance-sheet/attendance-sheet.component';
// import { MyAttendanceComponent } from '../my-attendance/my-attendance.component';

import { MyAttendanceComponent } from '../my-attendance/my-attendance.component';
import { TimeSheetComponent } from './time-sheet/time-sheet.component';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent {
  tabsConfig: TabConfig[] = [
    { name: 'My attendance', component: MyAttendanceComponent },
    { name: 'Attendance Sheet', component: AttendanceSheetsComponent },

    { name: 'Time Sheet', component: TimeSheetComponent },

  ];
}
