import { NumberOnlyDirective } from './number-only.directive';
import { ElementRef } from '@angular/core';

describe('NumberOnlyDirective', () => {
  it('should create an instance', () => {
    const directive = new NumberOnlyDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
