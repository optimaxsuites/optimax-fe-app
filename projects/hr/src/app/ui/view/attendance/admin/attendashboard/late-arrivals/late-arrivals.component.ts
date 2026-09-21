import { Component, Input } from '@angular/core';
import { LateArrivalDTO } from '../../../../../domain/attendance/attendance-summary.dto';

@Component({
  selector: 'app-late-arrivals',
  templateUrl: './late-arrivals.component.html',
  styleUrl: './late-arrivals.component.scss'
})
export class LateArrivalsComponent {
  @Input() lateArrivals: LateArrivalDTO[] = [];
}
