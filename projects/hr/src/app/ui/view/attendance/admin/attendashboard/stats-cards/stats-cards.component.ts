import { Component, Input } from '@angular/core';
import { AttendanceStats } from '../../../../../domain/attendance/attendashboard.dto';

@Component({
  selector: 'app-stats-cards',
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss'
})
export class StatsCardsComponent {
  @Input() stats!: {
    present: string;
    absent: string;
    late: string;
    onLeave: string;
  };

  @Input() pendingApprovals: number = 0;
  @Input() crossBranchCount: number = 0;
  @Input() correctionRequestsCount: number = 0;

  //@Input() stats!: AttendanceStats;
  /*stats = {
  present: 128,
  absent: 12,
  late: 7
};*/

}
