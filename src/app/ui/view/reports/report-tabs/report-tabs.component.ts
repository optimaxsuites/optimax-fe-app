import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';

@Component({
  selector: 'app-report-tabs',
  templateUrl: './report-tabs.component.html',
  styleUrls: ['./report-tabs.component.scss']
})
export class  ReportTabsComponent {
  constructor(private router: Router, private viewportScroller: ViewportScroller) {}

  goToFinancialStatement(event: Event) {
    event.preventDefault();
    if (this.router.url === '/reports') {
      setTimeout(() => {
        this.viewportScroller.scrollToAnchor('financial-statement-section');
      }, 0);
    } else {
      this.router.navigate(['/reports']).then(() => {
        setTimeout(() => {
          this.viewportScroller.scrollToAnchor('financial-statement-section');
        }, 100);
      });
    }
  }

  isFinancialStatementActive(): boolean {
    return this.router.url === '/reports';
  }
}