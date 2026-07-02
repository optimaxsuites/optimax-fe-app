import { Component, OnInit } from '@angular/core';

interface AssessmentGoal {
  id: string;
  title: string;
  target: string;
  weight: number;
  dueDate: string;
  metrics: { name: string; completed: boolean }[];
  progress: number;
}

interface FormEntry {
  selfScore: number;
  evidence: string;
  notes: string;
}

interface PastSubmission {
  id: string;
  cycleName: string;
  submittedAt: string;
  goalsCount: number;
  avgSelfScore: number;
  supervisorStatus: string;
  supervisorNote?: string;
}

@Component({
  selector: 'app-productivity-assessment-page',
  templateUrl: './productivity-assessment-page.component.html',
  styleUrls: ['./productivity-assessment-page.component.scss'],
})
export class ProductivityAssessmentPageComponent implements OnInit {
  goals: AssessmentGoal[] = [];
  forms: { [id: string]: FormEntry } = {};
  submissions: PastSubmission[] = [];
  expandedGoal: string | null = null;
  submitted = false;
  readonly starRange = [1, 2, 3, 4, 5];

  get currentPeriod(): string {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  ngOnInit(): void {
    this.goals = this.loadGoals();
    this.goals.forEach(g => {
      this.forms[g.id] = { selfScore: 0, evidence: '', notes: '' };
    });
    this.submissions = this.readStorage('selfAssessmentSubmissions').map((s: any) => ({
      id: s.id,
      cycleName: s.cycleName,
      submittedAt: s.submittedAt,
      goalsCount: s.goals || 0,
      avgSelfScore: s.avgSelfScore || 0,
      supervisorStatus: s.supervisorStatus || 'pending',
      supervisorNote: s.supervisorNote,
    }));
  }

  toggle(id: string): void {
    this.expandedGoal = this.expandedGoal === id ? null : id;
  }

  setScore(id: string, score: number): void {
    if (this.forms[id]) {
      this.forms[id] = { ...this.forms[id], selfScore: score };
    }
  }

  selfScore(id: string): number {
    return this.forms[id]?.selfScore ?? 0;
  }

  submit(): void {
    const entries = this.goals.map(g => ({
      goalId: g.id,
      goalTitle: g.title,
      weight: g.weight,
      selfScore: this.forms[g.id]?.selfScore ?? 0,
      evidence: this.forms[g.id]?.evidence ?? '',
      notes: this.forms[g.id]?.notes ?? '',
    }));
    const scored = entries.filter(e => e.selfScore > 0);
    const avg = scored.length
      ? Math.round((scored.reduce((sum, e) => sum + e.selfScore, 0) / scored.length) * 10) / 10
      : 0;
    const record = {
      id: `sa-${Date.now()}`,
      cycleName: `Monthly ICT Review — ${this.currentPeriod}`,
      submittedAt: new Date().toISOString(),
      goals: entries.length,
      avgSelfScore: avg,
      supervisorStatus: 'pending',
      employeeName: this.getLoggedInName(),
      entries,
    };
    const stored = this.readStorage('selfAssessmentSubmissions');
    stored.push(record);
    localStorage.setItem('selfAssessmentSubmissions', JSON.stringify(stored));
    this.submissions = [record as any, ...this.submissions];
    this.submitted = true;
    this.expandedGoal = null;
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  statusLabel(status: string): string {
    const map: { [k: string]: string } = {
      pending: 'Awaiting supervisor',
      approved: 'Approved',
      'needs-discussion': 'Needs discussion',
      'sent-back': 'Sent back',
      flagged: 'Flagged for HR',
    };
    return map[status] || status;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace(/[\s_]+/g, '-')}`;
  }

  private loadGoals(): AssessmentGoal[] {
    const raw: any[] = [
      ...this.readStorage('targetGoals'),
      ...this.readStorage('employeeGoals'),
    ];
    return raw.map((g, i) => {
      const metrics: { name: string; completed: boolean }[] = Array.isArray(g.targetMetrics)
        ? g.targetMetrics
        : [];
      const completedCount = metrics.filter(m => m.completed).length;
      return {
        id: `goal-${i}`,
        title: String(g.goalName || 'Untitled Goal').trim(),
        target: metrics.length
          ? metrics.map(m => m.name).join(', ')
          : String(g.goalDescription || 'Complete assigned deliverable').trim(),
        weight: metrics.length ? Math.min(40, Math.max(10, metrics.length * 5)) : 10,
        dueDate: g.endDate || '',
        metrics,
        progress: metrics.length ? Math.round((completedCount / metrics.length) * 100) : 0,
      };
    });
  }

  private getLoggedInName(): string {
    return (
      sessionStorage.getItem('fullName') ||
      sessionStorage.getItem('employeeName') ||
      sessionStorage.getItem('userName') ||
      localStorage.getItem('fullName') ||
      'Employee'
    );
  }

  private readStorage(key: string): any[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
