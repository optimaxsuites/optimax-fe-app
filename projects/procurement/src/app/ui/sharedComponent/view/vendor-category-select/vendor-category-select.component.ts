import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VendorCategoryDto } from '../../../domain/vendor.category.dto';

@Component({
  selector: 'app-vendor-category-select',
  templateUrl: './vendor-category-select.component.html',
})
export class VendorCategorySelectComponent {
  @Input() categories: VendorCategoryDto[] = [];
  @Input() selectedIds: string[] = [];
  @Output() selectedIdsChange = new EventEmitter<string[]>();

  onChange(ids: string[]) {
    this.selectedIds = ids ?? [];
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
