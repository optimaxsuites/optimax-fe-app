import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductivityNavItem } from './productivity.models';

const PRODUCTIVITY_NAV_ITEMS: ProductivityNavItem[] = [
  {
    label: 'Overview',
    route: 'overview',
    icon: 'pi pi-home',
    summary: 'Executive dashboard and current workload posture',
  },
  {
    label: 'Tasks',
    route: 'tasks',
    icon: 'pi pi-check-square',
    summary: 'Assignment board, due dates, evidence, and blockers',
  },
  {
    label: 'Reviews',
    route: 'reviews',
    icon: 'pi pi-star',
    summary: 'Self-assessment, supervisor scoring, and active cycles',
  },
  {
    label: 'Analytics',
    route: 'analytics',
    icon: 'pi pi-chart-line',
    summary: 'Department drill-down and trend monitoring',
  },
];

@Component({
  selector: 'app-productivity',
  templateUrl: './productivity.component.html',
  styleUrls: ['./productivity.component.scss'],
})
export class ProductivityComponent {
  readonly navItems: ProductivityNavItem[] = PRODUCTIVITY_NAV_ITEMS;

  constructor(public route: ActivatedRoute) {}
}
