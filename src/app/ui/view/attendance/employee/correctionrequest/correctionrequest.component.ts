import { Component, OnInit } from '@angular/core';
import { CorrectionRequest } from '../../../../shared-component/models/correctionrequest.model';
import { CorrectionrequestService } from '../../../../service/attendance/correctionrequest.service';

@Component({
  selector: 'app-correctionrequest',
  templateUrl: './correctionrequest.component.html',
  styleUrl: './correctionrequest.component.scss'
})
export class CorrectionrequestComponent  implements OnInit{
   /*requests: CorrectionRequest[] = [
    {
      id: '1',
      date: '2026-02-03',
      issueType: 'MISSED_CLOCK',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      date: '2026-02-01',
      issueType: 'WRONG_TIME',
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    }
  ];

  showForm = false;

  openForm() {
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  sendReminder(request: CorrectionRequest) {
    console.log('Reminder sent for request:', request.id);
    // later → call backend API / notification service
    alert('Reminder sent to admin');
  }

  addRequest(request: CorrectionRequest) {
    this.requests = [request, ...this.requests];
    this.closeForm();
  }
    */

  getIssueLabel(type: string): string {
    const map: any = {
      MISSED_CLOCK: 'Missed Clock',
      WRONG_TIME: 'Wrong Time',
      OTHER: 'Other'
    };
    return map[type] || type;
  }

  requests: CorrectionRequest[] = [];
  showForm = false;

  constructor(private correctionService: CorrectionrequestService) {}

  ngOnInit() {
    this.correctionService.getRequests().subscribe(reqs => {
      this.requests = reqs;
    });
  }

  openForm() {
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  addRequest(request: CorrectionRequest) {
    this.correctionService.addRequest(request); // sends to admin
    this.closeForm();
  }


}
