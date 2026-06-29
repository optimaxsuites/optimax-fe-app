import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ProbationRow {
  employeeId: number;
  employeeName: string;
  department: string;
  level: string;
  probationEndDate: string;
  probationStatus: string;
}

interface ProbationReport {
  totalOnProbation: number;
  probationDueSoon: number;
  probationOverdue: number;
  rows: ProbationRow[];
}

interface Level {
  id: number;
  name: string;
}

@Component({
  selector: 'app-probation-settings',
  templateUrl: './probation-settings.component.html',
  styleUrl: './probation-settings.component.scss',
})
export class ProbationSettingsComponent implements OnInit {
  readonly BASE = 'https://be.optimaxsuites.com/x/api/v2/hr';

  loading = true;
  error = false;

  report: ProbationReport | null = null;
  levels: Level[] = [];

  filterStatus: string = 'ALL';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    forkJoin({
      report: this.http.get<ProbationReport>(`${this.BASE}/reports/probation-tracking`)
        .pipe(catchError(() => of(null))),
      levels: this.http.get<Level[]>(`${this.BASE}/levels?size=100`)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ report, levels }) => {
        this.report = report;
        this.levels = Array.isArray(levels) ? levels : (levels as any)?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  get filteredRows(): ProbationRow[] {
    if (!this.report?.rows) return [];
    if (this.filterStatus === 'ALL') return this.report.rows;
    return this.report.rows.filter(r => r.probationStatus.toUpperCase() === this.filterStatus);
  }

  statusClass(status: string): string {
    const s = status.toUpperCase();
    if (s === 'OVERDUE') return 'ps-badge ps-badge--red';
    if (s === 'DUESOON') return 'ps-badge ps-badge--amber';
    if (s === 'ACTIVE') return 'ps-badge ps-badge--green';
    return 'ps-badge ps-badge--gray';
  }

  statusLabel(status: string): string {
    const s = status.toUpperCase();
    if (s === 'OVERDUE') return 'Overdue';
    if (s === 'DUESOON') return 'Due Soon';
    if (s === 'ACTIVE') return 'Active';
    return status;
  }

  daysRemaining(endDate: string): number {
    if (!endDate) return 0;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
