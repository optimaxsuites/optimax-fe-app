import { Component, Input } from '@angular/core';
import { LateArrival } from '../../../../../shared-component/models/models';

@Component({
  selector: 'app-late-arrivals',
  templateUrl: './late-arrivals.component.html',
  styleUrl: './late-arrivals.component.scss'
})
export class LateArrivalsComponent {
  @Input() lateArrivals: LateArrival[] = [];
  /*lateArrivals = [
  { name: 'Kingsley Kings', time: '09:32 AM' },
  { name: 'Davidson Davids', time: '09:41 AM' }
];*/

}
