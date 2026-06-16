export interface ProductivityNavItem {
  label: string;
  route: string;
  icon: string;
  summary: string;
}

export interface ProductivityMetric {
  label: string;
  value: string;
  delta: string;
  tone: 'positive' | 'warning' | 'neutral';
  hint: string;
}

export interface ProductivityTask {
  title: string;
  assignee: string;
  team: string;
  dueDate: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue' | 'Blocked';
  progress: number;
  target: string;
  weight: number;
}

export interface ProductivityScorecard {
  employee: string;
  role: string;
  department: string;
  completionRate: string;
  onTimeRate: string;
  score: string;
  trend: string;
  reviewStatus: string;
}

export interface ProductivityReviewCycle {
  name: string;
  period: string;
  owner: string;
  selfAssessmentRate: string;
  supervisorRate: string;
  status: string;
}

export interface ProductivityTemplate {
  name: string;
  scope: string;
  weighting: string;
  cadence: string;
  status: string;
}

export interface ProductivityLeaderboardRow {
  unit: string;
  score: string;
  completed: string;
  overdue: string;
  selfReviewRate: string;
  risk: string;
}
