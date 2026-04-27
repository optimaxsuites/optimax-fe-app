import { Pipe, PipeTransform } from '@angular/core';

import { TaxLineItemDTO } from './report.dto';

@Pipe({ name: 'taxTypeFilter', pure: true })
export class TaxTypeFilterPipe implements PipeTransform {
  transform(lines: TaxLineItemDTO[] | null | undefined, taxType: string): TaxLineItemDTO[] {
    if (!lines) {
      return [];
    }

    if (!taxType || taxType === 'All Types') {
      return lines;
    }

    return lines.filter((line) => line.taxType === taxType);
  }
}
