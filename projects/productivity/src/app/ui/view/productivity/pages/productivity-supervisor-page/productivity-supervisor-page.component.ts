import { Component, OnInit } from '@angular/core';

interface SubmissionEntry {
  goalId: string;
  goalTitle: string;
  weight: number;
  selfScore: number;
  evidence: string;
  notes: string;
}

interface PendingSubmission {
  id: string;
  employeeName: string;
  cycleName: string;
  submittedAt: string;
  goals: number;
  avgSelfScore: number;
  entries: SubmissionEntry[];
}

interface ReviewForm {
  score: number;
  decision: string;
  template: string;
  note: string;
}

const DECISION_TEMPLATES: Record<string, string> = {
  'approved-strong': 'Strong performance — exceeds targets across all key areas. Recommended for recognition this cycle.',
  'approved-standard': 'Satisfactory performance — meeting expectations with consistent delivery. Keep it up.',
  'needs-improvement': 'Below expectations — targets partially met. A structured improvement plan is recommended for the next cycle.',
  'insufficient-evidence': 'Insufficient evidence submitted — please provide additional documentation of your deliverables.',
  'needs-discussion': 'Further discussion required before a final score can be assigned. Please schedule a one-on-one.',
  'on-track': 'On track overall, but specific KPI gaps need to be addressed before the cycle closes.',
};

@Component({
  selector: 'app-productivity-supervisor-page',
  templateUrl: './productivity-supervisor-page.component.html',
  styleUrls: ['./productivity-supervisor-page.component.scss'],
})
export class ProductivitySupervisorPageComponent implements OnInit {
  submissions: PendingSubmission[] = [];
  completedIds = new Set<string>();
  expandedId: string | null = null;
  forms: { [id: string]: ReviewForm } = {};
  reviewedToday = 0;

  readonly decisions = [
    { value: 'approved', label: 'Approved' },
    { value: 'needs-discussion', label: 'Needs Discussion' },
    { value: 'sent-back', label: 'Sent Back' },
    { value: 'flagged', label: 'Flagged for HR' },
  ];

  readonly templateOptions: Array<{ key: string; label: string }> = [
    { key: 'approved-strong', label: 'Strong performance' },
    { key: 'approved-standard', label: 'Satisfactory performance' },
    { key: 'needs-improvement', label: 'Below expectations' },
    { key: 'insufficient-evidence', label: 'Insufficient evidence' },
    { key: 'needs-discussion', label: 'Needs discussion' },
    { key: 'on-track', label: 'On track — minor gaps' },
  ];

  readonly starRange = [1, 2, 3, 4, 5];

  get pendingCount(): number {
    return this.submissions.filter(s => !this.completedIds.has(s.id)).length;
  }

  noDecision(id: string): boolean {
    const form = this.forms[id];
    return !form || !form.decision;
  }

  supervisorScore(id: string): number {
    return this.forms[id]?.score ?? 0;
  }

  ngOnInit(): void {
    this.load();
  }

  toggle(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  applyTemplate(id: string): void {
    const form = this.forms[id];
    if (!form || !form.template) return;
    form.note = DECISION_TEMPLATES[form.template] || '';
  }

  submitReview(submission: PendingSubmission): void {
    const form = this.forms[submission.id];
    if (!form?.decision) return;

    const review = {
      submissionId: submission.id,
      employeeName: submission.employeeName,
      supervisorScore: form.score,
      decision: form.decision,
      note: form.note,
      reviewedAt: new Date().toISOString(),
    };

    const stored = this.readStorage('supervisorReviews');
    stored.push(review);
    localStorage.setItem('supervisorReviews', JSON.stringify(stored));

    const submissions = this.readStorage('selfAssessmentSubmissions');
    const updated = submissions.map((s: any) =>
      s.id === submission.id
        ? { ...s, supervisorStatus: form.decision, supervisorNote: form.note }
        : s
    );
    localStorage.setItem('selfAssessmentSubmissions', JSON.stringify(updated));

    this.completedIds.add(submission.id);
    this.reviewedToday++;
    this.expandedId = null;
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  initial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  decisionClass(decision: string): string {
    return `decision-${decision.toLowerCase().replace(/[\s_]+/g, '-')}`;
  }

  private load(): void {
    const reviewed = new Set<string>(
      this.readStorage('supervisorReviews').map((r: any) => String(r.submissionId))
    );

    this.submissions = this.readStorage('selfAssessmentSubmissions')
      .filter((s: any) => !reviewed.has(s.id))
      .map((s: any) => ({
        id: s.id,
        employeeName: s.employeeName || 'Employee',
        cycleName: s.cycleName || 'Performance Cycle',
        submittedAt: s.submittedAt,
        goals: s.goals || 0,
        avgSelfScore: s.avgSelfScore || 0,
        entries: Array.isArray(s.entries) ? s.entries : [],
      }));

    const today = new Date().toDateString();
    this.reviewedToday = this.readStorage('supervisorReviews').filter(
      (r: any) => new Date(r.reviewedAt).toDateString() === today
    ).length;

    this.submissions.forEach(s => {
      this.forms[s.id] = { score: 0, decision: '', template: '', note: '' };
    });
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
