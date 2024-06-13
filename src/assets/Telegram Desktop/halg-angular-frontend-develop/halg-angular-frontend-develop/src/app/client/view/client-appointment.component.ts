import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { EventSettingsModel, DayService, WeekService, WorkWeekService, MonthService, AgendaService } from '@syncfusion/ej2-angular-schedule';


@Component({
  selector: 'app-client-appointment',
  template: `<div class="card">

  <ejs-schedule width='100%' height='850px' [selectedDate]="selectedDate"
    [eventSettings]="eventSettings" > </ejs-schedule>
  
          </div>`,
  styles: ['./client-appointment.component.scss'],
  providers: [DayService, WeekService, WorkWeekService, MonthService, AgendaService, MessageService]
})
export class ClientAppointmentComponent implements OnInit {

  public data: object[] = [{
    TravelId: 2,
    TravelSummary: 'Paris',
    DepartureTime: new Date(2018, 1, 15, 10, 0),
    ArrivalTime: new Date(2018, 1, 15, 12, 30),
    FullDay: false,
    Source: 'London',
    Comments: 'Summer vacation planned for outstation.',
    Origin: 'Asia/Yekaterinburg',
    Destination: 'Asia/Yekaterinburg'
}];
public selectedDate: Date = new Date(2021, 1, 15);
public eventSettings: EventSettingsModel = {
    dataSource: this.data,
    fields: {
        id: 'TravelId',
        subject: { name: 'TravelSummary' },
        isAllDay: { name: 'FullDay' },
        location: { name: 'Source' },
        description: { name: 'Comments' },
        startTime: { name: 'DepartureTime' },
        endTime: { name: 'ArrivalTime' },
        startTimezone: { name: 'Origin' },
        endTimezone: { name: 'Destination' }
    }
};

  constructor(private breadcrumbService: AppBreadcrumbService) { 
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Appointment', routerLink: ['/cAppointment'] }
       ]);
  }

  ngOnInit(): void {
  }

}
