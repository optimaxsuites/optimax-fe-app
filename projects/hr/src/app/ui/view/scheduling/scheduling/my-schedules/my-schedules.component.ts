import { Component } from '@angular/core';

interface Shift {
  id: number;
  date: string;
  projectName: string;
  assignedEmployees: string[];
  recurrence?: string;
}

interface ShiftRecord {
  id: number;
  shiftId: number;
  employeeName: string;
  status: 'Present' | 'Absent' | 'Late';
  clockIn?: string;
  clockOut?: string;
}


@Component({
  selector: 'app-my-schedules',
  templateUrl: './my-schedules.component.html',
  styleUrl: './my-schedules.component.scss'
})
export class MySchedulesComponent {

}
