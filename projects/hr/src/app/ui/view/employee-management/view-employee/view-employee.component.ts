import { Component, Input } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EmployeeService } from '../../../service/employee.service';
import { catchError, map, Observable, of } from 'rxjs';
@Component({
  selector: 'app-view-employee',
  templateUrl: './view-employee.component.html',
  styleUrl: './view-employee.component.scss'
})
export class ViewEmployeeComponent {
   employeeInView: any; 
  calendarOptions: CalendarOptions = {}
  handleDateClick(arg: DateClickArg) {
    alert('date click! ' + arg.dateStr)
  }

  constructor(private employeeService: EmployeeService){}
  
  ngOnInit(): void {
    const employee = localStorage.getItem("employeeInView");
    if (employee) {
      this.employeeInView = JSON.parse(employee);
      this.employeeService.getSalaryById(this.employeeInView.levelId).subscribe({
        next: data => {
          this.employeeInView.salaryDetails = data[0]
          console.log(this.employeeInView)
          // this.employeeInView.leaveEvents = this.generateLeaveEvents(this.employeeInView.salaryDetails.leaveDetails)
        },
        error: err => console.log(err)
      })
    }
    
    if(this.employeeInView.leaveDetails){
        this.calendarOptions = {
          initialView: 'dayGridMonth',
          plugins: [dayGridPlugin, interactionPlugin],
          dateClick: (arg) => this.handleDateClick(arg),
          events:  this.generateLeaveEvents(this.employeeInView.leaveDetails)
        };
      }    
  }
  getAllowanceName(id: number): Observable<string> {
    return this.employeeService.getAllowanceTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }

  getBonusName(id: number): Observable<string> {
    return this.employeeService.getBonusTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }

  getDeductionName(id: number): Observable<string>  {
    return this.employeeService.getDeductionTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }

  getOvertimeName(id: number): Observable<string> {
    return this.employeeService.getOverTimeTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }
  generateLeaveEvents(leaveDetails: { leavesSpent: any[]; }) {
    return leaveDetails.leavesSpent.map(leave => {
      return {
        title: `${leave.type} Leave`,
        start: leave.from,
        end: leave.to,
        backgroundColor:  '#2EB270'   
      };
    });
  }

  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

}
