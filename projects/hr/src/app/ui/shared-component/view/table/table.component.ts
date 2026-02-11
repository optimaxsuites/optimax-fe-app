import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent {
  @Input() wrapperClass: string = '';
  @Input() tableClass: string = '';
  @Input() compact: boolean = false;
  @Input() striped: boolean = false;
}
