import { Component, OnInit } from '@angular/core';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';

@Component({
  selector: 'app-shift-calendar',
  templateUrl: './shift-calendar.component.html',
  styleUrl: './shift-calendar.component.scss'
})
export class ShiftCalendarComponent implements OnInit {
  showAssignment = false;
  schedules: ScheduleDTO[] = [];
  weekDates: string[] = [];

  openAssignment() {
  this.showAssignment = true;
}

  closeAssignment() {
  this.showAssignment = false;
}


  constructor(
    private scheduleserviceService: ScheduleserviceService,
    private shiftserviceService: ShiftserviceService
  ) {}

  ngOnInit(): void {
    this.generateWeek();
    this.scheduleserviceService.schedules$.subscribe(data => {
      this.schedules = data;
    });

  }

  /* GENERATE CURRENT WEEK */
  generateWeek() {
    const today = new Date();
    const start = new Date(today);

    start.setDate(today.getDate() - today.getDay() + 1);

    this.weekDates = [];

    for (let i = 0; i < 5; i++) {

      const date = new Date(start);
      date.setDate(start.getDate() + i);

      this.weekDates.push(
        date.toISOString().split('T')[0]
      );

    }

  }

  /* GET SCHEDULES FOR DATE */
  getSchedulesForDate(date: string) {
    return this.schedules.filter(s => s.date === date);
  }

  /* GET SHIFT DATA */
  getShift(shiftId: string) {
    return this.shiftserviceService.getShiftById(shiftId);
  }
  
  getEmployeeSchedules(employeeId: string, date: string) {
  return this.schedules.filter(schedule =>
    schedule.employeeId === employeeId &&
    schedule.date === date
  );

}
}
