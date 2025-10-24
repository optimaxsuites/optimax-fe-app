import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'unique' })
export class UniquePipe implements PipeTransform {
  transform(value: any[], property: string): any[] {
    if (!value || !property) return value;
    return value.filter((item, index, self) => 
      index === self.findIndex(t => 
        t[property] === item[property]
      )
    );
  }
}