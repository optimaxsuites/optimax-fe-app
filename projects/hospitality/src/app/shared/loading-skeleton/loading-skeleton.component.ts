import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-skeleton.component.html',
  styleUrls: ['./loading-skeleton.component.scss']
})
export class LoadingSkeletonComponent {
  @Input() type: 'card' | 'text' | 'circle' | 'line' | 'room-grid' = 'card';
  @Input() count: number = 1;

  get skeletons(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
