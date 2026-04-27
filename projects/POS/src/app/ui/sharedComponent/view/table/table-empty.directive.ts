import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableEmpty]'
})
export class TableEmptyDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}
