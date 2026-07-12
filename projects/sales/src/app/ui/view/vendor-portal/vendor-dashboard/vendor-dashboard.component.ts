import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { VendorService } from '../../../service/vendor-portal/vendor.service';
import {
  VendorStats,
  PerformanceStats,
  Quotation,
  Rfq,
} from '../../../domain/vendor-portal/vendor.dto';

@Component({
  selector: 'app-vendor-dashboard',
  templateUrl: './vendor-dashboard.component.html',
  styleUrl: './vendor-dashboard.component.scss',
})
export class VendorDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  stats: VendorStats | null = null;
  perfStats: PerformanceStats | null = null;

  upcomingRfqs: Rfq[] = [];
  recentQuotations: Quotation[] = [];

  constructor(private vendorService: VendorService) {}

  ngOnInit(): void {
    this.vendorService.loadRfqs();
    // Load vendor summary stats
    this.vendorService
      .getVendorStats()
      .pipe(take(1))
      .subscribe((s) => (this.stats = s));

    // Load performance stats (win rate, revenue, rating)
    this.vendorService
      .getPerformanceStats()
      .pipe(take(1))
      .subscribe((p) => (this.perfStats = p));

    // Load RFQs — show those closing soonest
    this.vendorService
      .getRfqs()
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        const now = new Date();
        this.upcomingRfqs = list
          .filter((r) => r.status === 'open' && new Date(r.dueDate) >= now)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);
      });

    // Load quotations — most recent first
    this.vendorService
      .getQuotations()
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.recentQuotations = [...list]
          .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
          .slice(0, 5);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Quick-action navigation helpers ──────────────────────────────────────────
  // These emit a string that the parent tab component can intercept,
  // or you can wire them up to your router / tab-switch service.
  navigateTo(tab: 'rfq' | 'quotation' | 'lpo'): void {
    // Replace with your actual tab-switch logic / router.navigate
    console.log('Navigate to:', tab);
  }

  // ── Deadline helpers ──────────────────────────────────────────────────────────
  daysUntil(d: Date): number {
    const ms = new Date(d).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  isDueSoon(d: Date): boolean {
    return this.daysUntil(d) <= 3;
  }

  dueBadgeClass(rfq: Rfq): string {
    const days = this.daysUntil(rfq.dueDate);
    if (days <= 1) return 'deadline-critical';
    if (days <= 3) return 'deadline-urgent';
    return 'deadline-normal';
  }

  // ── Rating stars ─────────────────────────────────────────────────────────────
  stars(rating: number): { full: boolean; half: boolean }[] {
    return [1, 2, 3, 4, 5].map((i) => ({
      full: i <= Math.floor(rating),
      half: i === Math.ceil(rating) && rating % 1 >= 0.5,
    }));
  }

  // ── Quotation badge ───────────────────────────────────────────────────────────
  quotBadge(status: string): string {
    const map: Record<string, string> = {
      draft:               'badge badge-draft',
      sent:                'badge badge-sent',
      revision_requested:  'badge badge-revision_requested',
      accepted:            'badge badge-accepted',
      rejected:            'badge badge-rejected',
      withdrawn:           'badge badge-withdrawn',
    };
    return map[status] ?? 'badge';
  }

  quotStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft:               'Draft',
      sent:                'Sent',
      revision_requested:  'Needs Revision',
      accepted:            'Accepted',
      rejected:            'Rejected',
      withdrawn:           'Withdrawn',
    };
    return map[status] ?? status;
  }

  // ── RFQ badge ────────────────────────────────────────────────────────────────
  rfqBadge(status: string): string {
    const map: Record<string, string> = {
      open:      'badge badge-open',
      converted: 'badge badge-converted',
      expired:   'badge badge-expired',
      closed:    'badge badge-closed',
    };
    return map[status] ?? 'badge';
  }

  // ── Formatting helpers ────────────────────────────────────────────────────────
  fmtDate(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    });
  }

  fmtCurrencyShort(n: number): string {
    if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000)     return `₦${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)         return `₦${(n / 1_000).toFixed(0)}K`;
    return `₦${n}`;
  }

  fmtCurrency(n: number, cur = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style:                'currency',
      currency:             cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

  // ── Win-rate ring offset ─────────────────────────────────────────────────────
  // SVG circle circumference = 2π × r ; r = 26  →  ~163.36
  winRateOffset(rate: number): number {
    const circumference = 2 * Math.PI * 26;
    return circumference - (rate / 100) * circumference;
  }
}