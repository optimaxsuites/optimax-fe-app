import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { AttendancetableService } from '../../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../../domain/attendance/attendancetable.dto';
import { UserSessionService } from '../../../../../../service/attendance/user-session.service';

@Component({
  selector: 'app-monthlyattendancelist',
  templateUrl: './monthlyattendancelist.component.html',
  styleUrl: './monthlyattendancelist.component.scss'
})
export class MonthlyattendancelistComponent implements OnInit {
  attendanceData: AttendanceTableRecord[] = [];
  filteredData: AttendanceTableRecord[] = [];

  selectedMonth!: string; // format: YYYY-MM

  @Output() filteredDataChange = new EventEmitter<AttendanceTableRecord[]>();

  constructor(private attendanceService: AttendancetableService,
    private userSession: UserSessionService
  ) {}

  ngOnInit(): void {
    this.setCurrentMonth();
    this.loadAttendance();
  }

  private setCurrentMonth() {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  loadAttendance() {
    const user = this.userSession.getCurrentUser();
      // TEMP: diagnostic log
      console.log('=== MONTHLY LIST ===');
      console.log('Current user:', user);

    if(user?.id) {
      //use employee endpoint
      this.attendanceService.fetchByEmployee(parseInt(user.id));
    }
    //suscribe to shared BehaviourSubject
    this.attendanceService.attendance$.subscribe(data => {
      const callId = Math.random().toString(36).substr(2, 5); //unique tag per callback
      console.log(`[${callId}] data length:`, data.length);

      //filter to only this employee's records since Behaviour Subject is shared
      const userId = user?.id ?? '';

      data.forEach(r => {
        console.log({
          recordId: r.id,
          //recordIdType: typeof r.id,
          //userId: userId,
          //userIdType: typeof userId,
          strictEqual: r.id === userId,
          //stringEqual: String(r.id) === String(userId)
        });
      });

      this.attendanceData = data.filter(r => String(r.id).trim() === String(userId).trim());
      console.log(`[${callId}] After filter:`, this.attendanceData);
      
      this.applyMonthFilter();
    });
  }

  applyMonthFilter() {
    const [year, month] = this.selectedMonth.split('-').map(Number);

  this.filteredData = this.attendanceData.filter(record => {
    if (!record.date) return false;

    const d = new Date(record.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
    /*
    this.filteredData = this.attendanceData.filter(record => {
      if (!record.date) return false;
      return record.date.startsWith(this.selectedMonth);
    });*/

    //to send data to parent component
    this.filteredDataChange.emit(this.filteredData);
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selectedMonth = value;
    this.applyMonthFilter();
  }

}
