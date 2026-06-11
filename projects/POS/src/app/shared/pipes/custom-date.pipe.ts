import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customDate'
})
export class CustomDatePipe implements PipeTransform {

 transform(value: string): any {
  if (!value) return null;
  const p = value.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2], +p[3], +p[4], +p[5]);
}

}
