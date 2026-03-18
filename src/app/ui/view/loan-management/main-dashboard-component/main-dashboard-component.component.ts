import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-dashboard-component',
  templateUrl: './main-dashboard-component.component.html',
  styleUrls: ['./main-dashboard-component.component.scss']
})
export class MainDashboardComponent {
  selectedDashboard: 'advance' | 'cooperative' = 'advance';

  private readonly subscription = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.route.queryParamMap.subscribe(params => {
        const requestedDashboard = params.get('dashboard');
        this.selectedDashboard = requestedDashboard === 'cooperative' ? 'cooperative' : 'advance';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
