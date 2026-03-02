import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { VendorCategoryDto } from '../../domain/vendor.category.dto';
import { VendorLocalDbService } from './vendor-local-db.service';

@Injectable({ providedIn: 'root' })
export class VendorCategoryService {
  constructor(private db: VendorLocalDbService) {}

  getAll(): Observable<VendorCategoryDto[]> {
    return this.db.getCategories();
  }
}
