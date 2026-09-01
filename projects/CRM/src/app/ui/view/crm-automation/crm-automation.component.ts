import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

interface Workflow {
  id: number;
  name: string;
  description: string;
  runs: number;
  successRate: string;
  lastRun: string;
  active: boolean;
  icon: string;
  iconColor: string;
}

@Component({
  selector: 'app-crm-automation',
  templateUrl: './crm-automation.component.html',
  styleUrls: ['./crm-automation.component.scss'],
})
export class CrmAutomationComponent implements OnInit {
  showNewForm = false;
  newWorkflowName = '';
  newWorkflowDesc = '';
  newWorkflowTrigger = 'LEAD_CREATED';

  triggerOptions = [
    { value: 'LEAD_CREATED', label: 'Lead Created' },
    { value: 'DEAL_STAGNANT', label: 'Deal Stagnant (14 days)' },
    { value: 'EMAIL_OPENED', label: 'Email Opened 3x' },
    { value: 'DEAL_WON', label: 'Deal Closed Won' },
    { value: 'SLA_BREACH', label: 'SLA Breach Warning' },
    { value: 'CONTRACT_RENEWAL', label: 'Contract Renewal Approaching' },
    { value: 'CONTACT_CREATED', label: 'Contact Created' },
    { value: 'TICKET_OPENED', label: 'Support Ticket Opened' },
  ];

  workflows: Workflow[] = [
    {
      id: 1, active: true, icon: '⚡', iconColor: '#25925B',
      name: 'New Lead → Auto-Assign + Welcome Email',
      description: 'Trigger: Lead created · Assign by territory → Send personalized welcome email → Create follow-up task (24hr)',
      runs: 342, successRate: '99.1%', lastRun: '18 min ago',
    },
    {
      id: 2, active: true, icon: '⏰', iconColor: '#25925B',
      name: 'Deal Stagnation Alert (14 days)',
      description: 'Trigger: Deal not updated in 14 days · Notify owner + manager via email + in-app → Add "Rotting" badge → Create urgent task',
      runs: 28, successRate: '100%', lastRun: '2 hr ago',
    },
    {
      id: 3, active: true, icon: '📧', iconColor: '#25925B',
      name: 'Email Opened (3×) → Priority Follow-up Alert',
      description: 'Trigger: Contact opens email ≥3 times in 24 hrs · Notify owner immediately with WhatsApp + in-app ping → Score +10',
      runs: 89, successRate: '98.9%', lastRun: '1 hr ago',
    },
    {
      id: 4, active: true, icon: '🏆', iconColor: '#25925B',
      name: 'Deal Won → Onboarding Kickoff Sequence',
      description: 'Trigger: Deal stage = Closed Won · Create account · Send welcome kit · Assign CSM · Schedule kickoff call → Integration: HR + Accounting',
      runs: 12, successRate: '100%', lastRun: 'Jun 20',
    },
    {
      id: 5, active: true, icon: '🚨', iconColor: '#25925B',
      name: 'SLA Breach Warning → Auto-Escalate',
      description: 'Trigger: Ticket SLA < 1hr remaining · Notify support manager → If Platinum: escalate to CTO + MD · Auto-reply to client',
      runs: 4, successRate: '100%', lastRun: '2 hr ago',
    },
    {
      id: 6, active: false, icon: '🔄', iconColor: '#94a3b8',
      name: 'Contract Renewal Reminder (90/60/30 days)',
      description: 'Trigger: Contract end date approaching · Email to account owner at 90d, 60d, 30d · Create renewal deal · Manager CC at 30d',
      runs: 0, successRate: '—', lastRun: 'Never',
    },
  ];

  constructor(private snack: MatSnackBar) {}

  ngOnInit() {
    const saved = localStorage.getItem('crm_workflows');
    if (saved) {
      try {
        const states = JSON.parse(saved) as Record<number, boolean>;
        this.workflows.forEach(w => {
          if (states[w.id] !== undefined) w.active = states[w.id];
        });
      } catch {}
    }
  }

  get activeCount(): number { return this.workflows.filter(w => w.active).length; }
  get totalRuns(): number { return this.workflows.reduce((s, w) => s + w.runs, 0); }

  toggleWorkflow(w: Workflow) {
    w.active = !w.active;
    const states: Record<number, boolean> = {};
    this.workflows.forEach(wf => states[wf.id] = wf.active);
    localStorage.setItem('crm_workflows', JSON.stringify(states));
    this.snack.open(`Workflow "${w.name}" ${w.active ? 'enabled' : 'disabled'}`, 'Close', { duration: 2500 });
  }

  deleteWorkflow(w: Workflow) {
    if (!confirm(`Delete workflow "${w.name}"?`)) return;
    this.workflows = this.workflows.filter(wf => wf.id !== w.id);
    this.snack.open('Workflow deleted', 'Close', { duration: 2500 });
  }

  openNewForm() { this.newWorkflowName = ''; this.newWorkflowDesc = ''; this.showNewForm = true; }
  closeNewForm() { this.showNewForm = false; }

  saveNewWorkflow() {
    if (!this.newWorkflowName.trim()) { this.snack.open('Workflow name is required', 'Close', { duration: 3000 }); return; }
    const triggerLabel = this.triggerOptions.find(t => t.value === this.newWorkflowTrigger)?.label || this.newWorkflowTrigger;
    this.workflows.unshift({
      id: Date.now(),
      active: true,
      icon: '⚡',
      iconColor: '#25925B',
      name: this.newWorkflowName.trim(),
      description: `Trigger: ${triggerLabel} · ${this.newWorkflowDesc.trim() || 'Custom workflow'}`,
      runs: 0,
      successRate: '—',
      lastRun: 'Never',
    });
    this.snack.open('Workflow created', 'Close', { duration: 3000 });
    this.closeNewForm();
  }
}
