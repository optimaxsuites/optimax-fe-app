import { Component, OnInit } from '@angular/core';
import { ProductivityLiveDataService } from '../../productivity-live-data.service';
import {
  ProductivityLeaderboardRow,
  ProductivityMetric,
  ProductivityReviewCycle,
  ProductivityTask,
} from '../../productivity.models';

@Component({
  selector: 'app-productivity-overview-page',
  templateUrl: './productivity-overview-page.component.html',
  styleUrls: ['./productivity-overview-page.component.scss'],
})
export class ProductivityOverviewPageComponent implements OnInit {
  metrics: ProductivityMetric[] = [];
  tasks: ProductivityTask[] = [];
  cycles: ProductivityReviewCycle[] = [];
  leaderboard: ProductivityLeaderboardRow[] = [];

  constructor(private readonly productivityLiveDataService: ProductivityLiveDataService) {}

  ngOnInit(): void {
    this.productivityLiveDataService.vm$.subscribe((vm) => {
      this.metrics = vm.metrics;
      this.tasks = vm.tasks.slice(0, 4);
      this.cycles = vm.cycles;
      this.leaderboard = vm.leaderboard;
    });
  }

  toneClass(tone: string): string {
    return `tone-${tone}`;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
