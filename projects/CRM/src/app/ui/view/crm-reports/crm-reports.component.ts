import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrmApiService } from '../../service/crm-api.service';
import { Deal } from '../../domain/crm.model';

interface RepStat { name: string; value: number; deals: number; color: string; }

@Component({
  selector: 'app-crm-reports',
  templateUrl: './crm-reports.component.html',
  styleUrls: ['./crm-reports.component.scss'],
})
export class CrmReportsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);

  totalContacts = 0;
  totalLeads = 0;
  totalDeals = 0;
  totalCampaigns = 0;
  openTickets = 0;
  wonValue = 0;
  pipelineValue = 0;
  winRate = 0;

  repStats: RepStat[] = [];
  maxRepValue = 1;

  sourceBreakdown: { label: string; pct: number; color: string }[] = [];

  recentDeals: Deal[] = [];

  constructor(private api: CrmApiService, private snack: MatSnackBar) {}

  ngOnInit() {
    this.loading$.next(true);
    forkJoin({
      contacts: this.api.getContacts(1, 500),
      leads: this.api.getLeads(1, 500),
      deals: this.api.getDeals(1, 500),
      tickets: this.api.getTickets(1, 200),
      campaigns: this.api.getCampaigns(1, 100),
    }).subscribe({
      next: (res) => {
        this.totalContacts = (res.contacts || []).length;
        this.totalLeads = (res.leads || []).length;
        this.totalCampaigns = (res.campaigns || []).length;
        this.openTickets = (res.tickets || []).filter(t => !['RESOLVED', 'CLOSED'].includes(t.status || '')).length;

        const deals = res.deals || [];
        this.totalDeals = deals.length;
        const won = deals.filter(d => d.status === 'WON');
        const closed = deals.filter(d => d.status === 'WON' || d.status === 'LOST');
        const open = deals.filter(d => d.status === 'OPEN');
        this.wonValue = won.reduce((s, d) => s + (d.dealValue || 0), 0);
        this.pipelineValue = open.reduce((s, d) => s + (d.dealValue || 0), 0);
        this.winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
        this.recentDeals = [...deals].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);

        // Rep stats — aggregate won deal value per owner
        const ownerColors = ['#25925B', '#2E6276', '#7c3aed', '#0ea5e9', '#ec4899', '#f59e0b'];
        const ownerMap = new Map<string, { value: number; deals: number; color: string }>();
        deals.forEach(d => {
          const owner = d.ownerName || 'Unassigned';
          const existing = ownerMap.get(owner) || { value: 0, deals: 0, color: '' };
          existing.value += (d.dealValue || 0);
          existing.deals += 1;
          ownerMap.set(owner, existing);
        });
        let colorIdx = 0;
        this.repStats = Array.from(ownerMap.entries())
          .sort((a, b) => b[1].value - a[1].value)
          .slice(0, 5)
          .map(([name, stat]) => ({
            name, value: stat.value, deals: stat.deals,
            color: ownerColors[colorIdx++ % ownerColors.length],
          }));
        this.maxRepValue = Math.max(...this.repStats.map(r => r.value), 1);

        // Source breakdown — lead sources from leads
        const sourceMap = new Map<string, number>();
        (res.leads || []).forEach(l => {
          const src = l.leadSource || 'OTHER';
          sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
        });
        const sourceColors: Record<string, string> = {
          WEBSITE: '#25925B', REFERRAL: '#2E6276', COLD_CALL: '#f59e0b',
          EVENT: '#0ea5e9', TRADE_SHOW: '#0ea5e9', LINKEDIN: '#7c3aed',
          WHATSAPP: '#10b981', OTHER: '#94a3b8', DIRECT: '#ec4899',
        };
        const total = this.totalLeads || 1;
        this.sourceBreakdown = Array.from(sourceMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([label, count]) => ({
            label, pct: Math.round((count / total) * 100),
            color: sourceColors[label] || '#94a3b8',
          }));

        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  formatValue(v: number): string {
    if (v >= 1_000_000_000) return '₦' + (v / 1_000_000_000).toFixed(1) + 'B';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(1) + 'K';
    return '₦' + v.toLocaleString();
  }

  barWidth(value: number): string {
    return Math.round((value / this.maxRepValue) * 100) + '%';
  }

  runReport(name: string) {
    this.snack.open(`Running "${name}" — exporting to your browser`, 'OK', { duration: 3000 });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
  }
}
