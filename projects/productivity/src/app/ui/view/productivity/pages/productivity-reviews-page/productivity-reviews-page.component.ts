import { Component, OnInit } from '@angular/core';
import { ProductivityLiveDataService } from '../../productivity-live-data.service';
import { ProductivityReviewCycle, ProductivityScorecard } from '../../productivity.models';

@Component({
  selector: 'app-productivity-reviews-page',
  templateUrl: './productivity-reviews-page.component.html',
  styleUrls: ['./productivity-reviews-page.component.scss'],
})
export class ProductivityReviewsPageComponent implements OnInit {
  cycles: ProductivityReviewCycle[] = [];
  scorecards: ProductivityScorecard[] = [];

  constructor(private readonly productivityLiveDataService: ProductivityLiveDataService) {}

  ngOnInit(): void {
    this.productivityLiveDataService.vm$.subscribe((vm) => {
      this.cycles = vm.cycles;
      this.scorecards = vm.scorecards;
    });
  }
}
