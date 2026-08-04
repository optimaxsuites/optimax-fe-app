import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableBody]',
  standalone: true
})
export class TableBodyDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}
