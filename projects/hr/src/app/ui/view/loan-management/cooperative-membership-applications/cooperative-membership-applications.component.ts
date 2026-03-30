import { Component, OnInit } from '@angular/core';
import { PendingMembershipApplication } from '../../../service/loan/cooperative-loan/cooperative-membership.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';

@Component({
  selector: 'app-cooperative-membership-applications',
  templateUrl: './cooperative-membership-applications.component.html',
  styleUrls: ['./cooperative-membership-applications.component.scss']
})
export class CooperativeMembershipApplicationsComponent implements OnInit {
  pendingApplications: PendingMembershipApplication[] = [];
  actionMessage = '';

  constructor(private cooperativeService: CooperativeService) {}

  ngOnInit(): void {
    this.loadPendingApplications();
  }

  loadPendingApplications(): void {
    this.pendingApplications = this.cooperativeService.getPendingMembershipApplications();
  }


  approveApplication(applicationId: number): void {
    const result = this.cooperativeService.approveMembershipApplication(applicationId);
    this.actionMessage = result.message;
    this.loadPendingApplications();
  }

  rejectApplication(applicationId: number): void {
    const result = this.cooperativeService.rejectMembershipApplication(applicationId);
    this.actionMessage = result.message;
    this.loadPendingApplications();
  }
}
