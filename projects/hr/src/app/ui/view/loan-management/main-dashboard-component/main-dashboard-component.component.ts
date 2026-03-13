import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-main-dashboard-component',
  templateUrl: './main-dashboard-component.component.html',
  styleUrls: ['./main-dashboard-component.component.scss']
})
export class MainDashboardComponent implements OnInit {
  selectedDashboard: 'advance' | 'cooperative' = 'advance';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const dashboard = params.get('dashboard');

      if (dashboard !== 'advance' && dashboard !== 'cooperative') {
        this.selectedDashboard = 'advance';
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { dashboard: 'advance' },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        return;
      }

      this.selectedDashboard = dashboard;
    });
  }

  onDashboardChange(value: 'advance' | 'cooperative'): void {
    this.selectedDashboard = value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dashboard: value },
      queryParamsHandling: 'merge'
    });
  }
}
