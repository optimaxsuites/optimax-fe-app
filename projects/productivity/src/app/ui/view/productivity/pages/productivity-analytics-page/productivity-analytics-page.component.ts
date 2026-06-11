import { Component, OnInit } from '@angular/core';
import { ProductivityLiveDataService } from '../../productivity-live-data.service';
import { ProductivityLeaderboardRow, ProductivityMetric } from '../../productivity.models';

@Component({
  selector: 'app-productivity-analytics-page',
  templateUrl: './productivity-analytics-page.component.html',
  styleUrls: ['./productivity-analytics-page.component.scss'],
})
export class ProductivityAnalyticsPageComponent implements OnInit {
  summary: ProductivityMetric[] = [];
  leaderboard: ProductivityLeaderboardRow[] = [];
  trendPoints: number[] = [0, 0, 0, 0, 0, 0];

  constructor(private readonly productivityLiveDataService: ProductivityLiveDataService) {}

  ngOnInit(): void {
    this.productivityLiveDataService.vm$.subscribe((vm) => {
      this.summary = vm.metrics;
      this.leaderboard = vm.leaderboard;
      this.trendPoints = vm.trendPoints;
    });
  }
}
