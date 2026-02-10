import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { HeatmapComponent } from './heatmap/heatmap.component';
import { LateArrivalsComponent } from './late-arrivals/late-arrivals.component';
import { StatsCardsComponent } from './stats-cards/stats-cards.component';
import { AttendashboardService } from '../../../../service/attendance/attendashboard.service';
//import { AttendanceTableRecord } from '../../../../shared-component/models/attendancetable.model';

@Component({
  selector: 'app-attendashboard',
  templateUrl: './attendashboard.component.html',
  styleUrl: './attendashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendashboardComponent implements OnInit{

  private attendashboardService = inject(AttendashboardService);

  stats$ = this.attendashboardService.getTodayStats();
  heatmap$ = this.attendashboardService.getDepartmentHeatmap();
  lateArrivals$ = this.attendashboardService.getLateArrivals();

  ngOnInit(): void {
    
  }

}
