import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableFooter]'
})
export class TableFooterDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}
