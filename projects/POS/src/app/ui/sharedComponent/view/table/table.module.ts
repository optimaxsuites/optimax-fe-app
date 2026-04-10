import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TableBodyDirective } from './table-body.directive';
import { TableEmptyDirective } from './table-empty.directive';
import { TableFooterDirective } from './table-footer.directive';
import { TableHeaderDirective } from './table-header.directive';
import { TableComponent } from './table.component';

@NgModule({
  declarations: [
    TableComponent,
    TableBodyDirective,
    TableHeaderDirective,
    TableFooterDirective,
    TableEmptyDirective
  ],
  imports: [CommonModule, TableModule],
  exports: [
    TableComponent,
    TableBodyDirective,
    TableHeaderDirective,
    TableFooterDirective,
    TableEmptyDirective
  ]
})
export class AppTableModule {}
