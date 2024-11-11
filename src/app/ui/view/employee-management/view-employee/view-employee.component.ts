import { Component, Input } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
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
  
  ngOnInit(): void {
    const employee = localStorage.getItem("employeeInView");
    if (employee) {
      this.employeeInView = JSON.parse(employee);
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
  getAllowanceKeys(allowances: object): string[] {
    return Object.keys(allowances);
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
