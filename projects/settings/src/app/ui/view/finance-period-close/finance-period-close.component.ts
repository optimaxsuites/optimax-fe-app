import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-period-close',
  templateUrl: './finance-period-close.component.html',
  styleUrls: ['./finance-period-close.component.scss']
})
export class FinancePeriodCloseComponent {
  activeScreen = 'calendar'; // 'calendar' | 'wizard' | 'locked'
  wizardStep = 0;
  draftChecksAcknowledged = false;

  months = [
    { name: 'Jan 2026', status: 'locked' },
    { name: 'Feb 2026', status: 'locked' },
    { name: 'Mar 2026', status: 'locked' },
    { name: 'Apr 2026', status: 'locked' },
    { name: 'May 2026', status: 'locked' },
    { name: 'Jun 2026', status: 'open' },
    { name: 'Jul 2026', status: 'future' },
    { name: 'Aug 2026', status: 'future' },
    { name: 'Sep 2026', status: 'future' },
    { name: 'Oct 2026', status: 'future' },
    { name: 'Nov 2026', status: 'future' },
    { name: 'Dec 2026', status: 'future' },
  ];

  openWizard(month: any) {
    if (month.status === 'open') this.activeScreen = 'wizard';
  }

  setStep(n: number) { this.wizardStep = n; }

  acknowledgeDraft() { this.draftChecksAcknowledged = true; }

  hardLock() { this.activeScreen = 'locked'; }

  backToCalendar() {
    this.activeScreen = 'calendar';
    this.wizardStep = 0;
    this.draftChecksAcknowledged = false;
  }

  monthStatusClass(status: string): string {
    return ({ locked: 'pc-month-locked', open: 'pc-month-open', future: 'pc-month-future' } as any)[status] || '';
  }
}
