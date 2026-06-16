import { Component } from '@angular/core';

interface OdooState {
  step: 'idle' | 'configure' | 'preview' | 'importing' | 'done' | 'error';
  url: string;
  db: string;
  user: string;
  password: string;
  previewRows: Array<{ name: string; description: string; deadline: string; assignee: string }>;
  importCount: number;
  error: string;
}

@Component({
  selector: 'app-hr-odoo-import',
  templateUrl: './hr-odoo-import.component.html',
  styleUrl: './hr-odoo-import.component.scss',
})
export class HrOdooImportComponent {

  odoo: OdooState = {
    step: 'idle', url: '', db: '', user: '', password: '',
    previewRows: [], importCount: 0, error: '',
  };

  readonly exportColumns = [
    'Name', 'Description', 'Deadline', 'Assigned To',
    'Priority', 'Stage', 'Tags', 'Sub-tasks',
  ];

  startConnect(): void { this.odoo.step = 'configure'; }

  testConnection(): void {
    if (!this.odoo.url || !this.odoo.db || !this.odoo.user) {
      this.odoo.error = 'Please fill in URL, database name, and username.';
      return;
    }
    this.odoo.error = '';
    this.odoo.step = 'preview';
    this.odoo.previewRows = [
      { name: 'Q3 Planning Session',           description: 'Plan department OKRs for Q3',               deadline: '2026-07-15', assignee: 'Team Lead' },
      { name: 'Policy Documentation Update',   description: 'Update HR policy handbook',                  deadline: '2026-07-01', assignee: 'HR Admin' },
      { name: 'Onboarding Checklist Revision', description: 'Revise the new hire onboarding checklist',   deadline: '2026-06-30', assignee: 'L&D Lead' },
    ];
  }

  confirmImport(): void {
    this.odoo.step = 'importing';
    setTimeout(() => {
      // Use a dedicated imports key that the board never overwrites
      const IMPORTS_KEY = 'hr_pm_imports_v1';
      let existing: any[] = [];
      try { existing = JSON.parse(localStorage.getItem(IMPORTS_KEY) || '[]'); } catch {}
      const now = Date.now();
      const newTasks = this.odoo.previewRows.map((row, i) => ({
        id: `odoo_${now}_${i}`,
        title: row.name,
        description: row.description,
        assignee: row.assignee,
        team: '',
        assignees: [row.assignee],
        status: 'To Do',
        priority: 'Medium',
        startDate: '',
        dueDate: row.deadline,
        weight: 0,
        progress: 0,
        tags: ['Odoo Import'],
        subtasks: [],
        activity: [],
        followUps: [],
      }));
      localStorage.setItem(IMPORTS_KEY, JSON.stringify([...existing, ...newTasks]));
      this.odoo.importCount = newTasks.length;
      this.odoo.step = 'done';
    }, 1400);
  }

  reset(): void {
    this.odoo = { step: 'idle', url: '', db: '', user: '', password: '', previewRows: [], importCount: 0, error: '' };
  }
}
