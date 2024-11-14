import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-vacancy',
  templateUrl: './vacancy.component.html',
  styleUrl: './vacancy.component.scss',
})
export class VacancyComponent {
  openVacancyForm: boolean = false;

  constructor(private router: Router) {} // Inject Router service

  stages = [
    'Application Received',
    'Shortlisted',
    'Rejected',
    'Interview',
    'Hired',
  ];

  candidates: any[] = [
    {
      candidate: 'Rissa Quan',
      email: 'rissaquan@hotmail.com',
      contactNo: '202-555-0181',
      dateApplied: '2023-06-04',
      stage: 'Shortlisted',
    },
    {
      candidate: 'Susan Williams',
      email: 'susan.williams@gmail.com',
      contactNo: '+1(970)333-3833',
      dateApplied: '2023-06-04',
      stage: 'Application Received',
    },
    {
      candidate: 'Anthony Davies',
      email: 'anthony.davies@gmail.com',
      contactNo: '+1(970)888-3866',
      dateApplied: '2023-06-03',
      stage: 'Shortlisted',
    },
    {
      candidate: 'Kevin Scott',
      email: 'kevinscott@gmail.com',
      contactNo: '202-555-0120',
      dateApplied: '2023-06-02',
      stage: 'Hired',
    },
    {
      candidate: 'Christopher Morgan',
      email: 'christopher.morgan@gmail.com',
      contactNo: '+49800600600',
      dateApplied: '2023-06-02',
      stage: 'Rejected',
    },
  ];

  // Function to handle stage selection
  updateStage(candidate: any, newStage: string) {
    candidate.stage = newStage;
  }
}
