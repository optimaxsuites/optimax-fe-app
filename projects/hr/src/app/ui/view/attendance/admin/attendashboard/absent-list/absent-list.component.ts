import { Component, Input } from '@angular/core';
import { AbsentEmployeeDTO } from '../../../../../domain/attendance/attendance-summary.dto';

@Component({
  selector: 'app-absent-list',
  templateUrl: './absent-list.component.html',
  styleUrl: './absent-list.component.scss'
})
export class AbsentListComponent {
  @Input() absentees: AbsentEmployeeDTO[] = [];
}
