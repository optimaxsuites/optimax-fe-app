import { Component } from '@angular/core';
import { AttendanceSheetComponent } from '../attendance-sheet/attendance-sheet.component';
import { MyAttendanceComponent } from '../my-attendance/my-attendance.component';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Attendance Sheet', component: AttendanceSheetComponent },
    { name: 'My attendance', component: MyAttendanceComponent },
  ];
}
