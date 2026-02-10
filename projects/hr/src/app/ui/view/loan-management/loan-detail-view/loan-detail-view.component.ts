import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-loan-detail-view',
  templateUrl: './loan-detail-view.component.html',
  styleUrl: './loan-detail-view.component.scss'
})
export class LoanDetailViewComponent implements OnInit {

  employeeID: string | null | undefined;
  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.employeeID = this.route.snapshot.paramMap.get('employeeId');
    // Fetch loan details for this employee

  }

}