import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Activity } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-activities',
  templateUrl: './crm-activities.component.html',
  styleUrls: ['./crm-activities.component.scss'],
})
export class CrmActivitiesComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  saving$ = new BehaviorSubject(false);
  activities: Activity[] = [];
  filtered: Activity[] = [];
  typeFilter = '';
  showForm = false;
  form!: FormGroup;

  typeOptions = ['CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'TASK', 'SMS', 'NOTE'];
  typeIcons: Record<string, string> = {
    CALL: '📞', EMAIL: '📧', WHATSAPP: '💬', MEETING: '📅',
    TASK: '✅', SMS: '💬', NOTE: '📄', DEMO: '🖥',
  };

  constructor(
    private api: CrmApiService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
  }

  buildForm() {
    this.form = this.fb.group({
      activityType: ['CALL'],
      subject: [''],
      description: [''],
      contactName: [''],
      dealName: [''],
      dueDate: [null],
      ownerName: [''],
      outcome: [''],
    });
  }

  load() {
    this.loading$.next(true);
    this.api.getActivities(1, 200).subscribe({
      next: (data) => {
        this.activities = data || [];
        this.applyFilters();
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  applyFilters() {
    this.filtered = this.activities.filter(a =>
      !this.typeFilter || a.activityType === this.typeFilter,
    );
  }

  openForm() {
    this.form.reset({ activityType: 'CALL' });
    this.showForm = true;
  }

  closeForm() { this.showForm = false; }

  save() {
    const payload: Activity = this.form.value;
    this.saving$.next(true);
    this.api.createActivity(payload).pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => {
        this.snack.open('Activity logged', 'Close', { duration: 3000 });
        this.closeForm();
        this.load();
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  complete(a: Activity) {
    this.api.completeActivity(a.id!).subscribe({
      next: () => { this.snack.open('Activity completed', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  delete(a: Activity) {
    if (!confirm(`Delete activity "${a.subject}"?`)) return;
    this.api.deleteActivity(a.id!).subscribe({
      next: () => { this.snack.open('Activity deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  icon(type?: string): string { return this.typeIcons[type || ''] || '📝'; }

  isOverdue(a: Activity): boolean {
    return a.status !== 'COMPLETED' && !!a.dueDate && new Date(a.dueDate) < new Date();
  }

  dotClass(type?: string): string {
    const map: Record<string, string> = {
      CALL: 'call', EMAIL: 'email', WHATSAPP: 'whatsapp',
      MEETING: 'meeting', TASK: 'task', SMS: 'sms', NOTE: 'note',
    };
    return `tl-dot ${map[type || ''] || ''}`;
  }

  timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  }
}
