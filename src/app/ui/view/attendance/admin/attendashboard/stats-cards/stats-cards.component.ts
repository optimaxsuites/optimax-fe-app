import { Component, Input } from '@angular/core';
import { AttendanceStats } from '../../../../../shared-component/models/models';

@Component({
  selector: 'app-stats-cards',
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss'
})
export class StatsCardsComponent {
  @Input() stats!: AttendanceStats;
  /*stats = {
  present: 128,
  absent: 12,
  late: 7
};*/

}
