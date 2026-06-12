import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-hr-reports',
  templateUrl: './hr-reports.component.html',
  styleUrl: './hr-reports.component.scss',
})
export class HrReportsComponent implements OnInit {
  private readonly BASE = 'https://be.optimaxsuites.com/x/api/v2/hr';

  loading = true;
  error = false;

  // Overtime cost report
  overtimeCost: any = null;

  // Probation tracking report
  probation: any = null;

  activeTab: 'overtime' | 'probation' = 'overtime';
  probationFilter: 'ALL' | 'OVERDUE' | 'DUE_SOON' | 'ACTIVE' = 'ALL';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    forkJoin({
      overtime: this.http.get<any>(`${this.BASE}/reports/overtime-cost`).pipe(catchError(() => of(null))),
      probation: this.http.get<any>(`${this.BASE}/reports/probation-tracking`).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ overtime, probation }) => {
        this.overtimeCost = overtime;
        this.probation = probation;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  get filteredProbationRows(): any[] {
    const rows: any[] = this.probation?.rows ?? [];
    if (this.probationFilter === 'ALL') return rows;
    if (this.probationFilter === 'OVERDUE') return rows.filter((r: any) => r.probationStatus === 'Overdue');
    if (this.probationFilter === 'DUE_SOON') return rows.filter((r: any) => r.probationStatus === 'DueSoon');
    if (this.probationFilter === 'ACTIVE') return rows.filter((r: any) => r.probationStatus === 'Active');
    return rows;
  }

  daysRemaining(endDate: string): number {
    if (!endDate) return 0;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.round(diff / 86400000);
  }

  statusClass(status: string): string {
    if (status === 'Overdue') return 'rpt-badge rpt-badge--red';
    if (status === 'DueSoon') return 'rpt-badge rpt-badge--orange';
    return 'rpt-badge rpt-badge--green';
  }
}
