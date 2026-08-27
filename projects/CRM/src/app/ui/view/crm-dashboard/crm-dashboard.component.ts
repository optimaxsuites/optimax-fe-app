import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Deal } from '../../domain/crm.model';
import { CrmContactFormComponent } from '../crm-contacts/crm-contact-form.component';

@Component({
  selector: 'app-crm-dashboard',
  templateUrl: './crm-dashboard.component.html',
  styleUrls: ['./crm-dashboard.component.scss'],
})
export class CrmDashboardComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  today = new Date();

  totalContacts = 0;
  totalLeads = 0;
  openDeals = 0;
  pipelineValue = 0;
  wonDeals = 0;
  wonValue = 0;
  openTickets = 0;
  winRate = 0;
  recentDeals: Deal[] = [];

  constructor(
    private api: CrmApiService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    forkJoin({
      contacts: this.api.getContacts(1, 500),
      leads: this.api.getLeads(1, 500),
      deals: this.api.getDeals(1, 500),
      tickets: this.api.getTickets(1, 200),
    }).subscribe({
      next: (res) => {
        this.totalContacts = (res.contacts || []).length;
        this.totalLeads = (res.leads || []).length;
        const deals = res.deals || [];
        const open = deals.filter(d => d.status === 'OPEN');
        const won = deals.filter(d => d.status === 'WON');
        const closed = deals.filter(d => d.status === 'WON' || d.status === 'LOST');
        this.openDeals = open.length;
        this.pipelineValue = open.reduce((s, d) => s + (d.dealValue || 0), 0);
        this.wonDeals = won.length;
        this.wonValue = won.reduce((s, d) => s + (d.dealValue || 0), 0);
        this.winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
        this.openTickets = (res.tickets || []).filter(t => !['RESOLVED', 'CLOSED'].includes(t.status || '')).length;
        this.recentDeals = deals.slice(0, 5);
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  openNewContact() {
    const ref = this.dialog.open(CrmContactFormComponent, { data: null, width: '640px', maxHeight: '90vh' });
    ref.afterClosed().subscribe(saved => { if (saved) this.ngOnInit(); });
  }

  private get uuid(): string { return this.route.snapshot.params['uuid'] || 'default'; }

  goToDeals() { this.router.navigate(['deals', this.uuid], { relativeTo: this.route.parent }); }
  goToActivities() { this.router.navigate(['activities', this.uuid], { relativeTo: this.route.parent }); }
  goToCampaigns() { this.router.navigate(['campaigns', this.uuid], { relativeTo: this.route.parent }); }
  goToLeads() { this.router.navigate(['leads', this.uuid], { relativeTo: this.route.parent }); }

  logCall() {
    this.router.navigate(['activities', this.uuid], { relativeTo: this.route.parent });
    this.snack.open('Navigating to Activities — log a call there', 'OK', { duration: 2500 });
  }

  sendEmail() {
    this.router.navigate(['campaigns', this.uuid], {
      relativeTo: this.route.parent,
      state: { openForm: true, campaignType: 'EMAIL' },
    });
  }

  whatsappBlast() {
    this.router.navigate(['campaigns', this.uuid], {
      relativeTo: this.route.parent,
      state: { openForm: true, campaignType: 'WHATSAPP' },
    });
  }

  sendProposal() {
    this.router.navigate(['quotes', this.uuid], {
      relativeTo: this.route.parent,
      state: { openForm: true },
    });
  }

  comingSoon(feature: string) {
    this.snack.open(`${feature} — coming soon`, 'OK', { duration: 3000 });
  }

  formatValue(v: number): string {
    if (v >= 1_000_000_000) return '₦' + (v / 1_000_000_000).toFixed(1) + 'B';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString();
  }

  statusColor(s?: string): string {
    const map: Record<string, string> = {
      OPEN: '#6366f1', WON: '#10b981', LOST: '#ef4444', ON_HOLD: '#f59e0b',
    };
    return map[s || ''] || '#64748b';
  }
}
