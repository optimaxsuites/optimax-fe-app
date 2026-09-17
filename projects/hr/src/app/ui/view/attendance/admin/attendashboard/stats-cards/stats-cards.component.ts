import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AttendanceSummaryDTO } from '../../../../../domain/attendance/attendance-summary.dto';

@Component({
  selector: 'app-stats-cards',
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss'
})
export class StatsCardsComponent {
  @Input() stats: AttendanceSummaryDTO | null = null;
  @Input() activeCard: string | null = null;

  @Input() pendingApprovals: number = 0;
  @Input() crossBranchCount: number = 0;
  @Input() correctionRequestsCount: number = 0;

  @Output() statusClick = new EventEmitter<'PRESENT' | 'LATE' | 'ABSENT'>();
  @Output() pendingClick = new EventEmitter<void>();
}
