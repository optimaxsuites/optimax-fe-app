import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PosServiceService } from './pos-service.service';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {

  private discountSubject = new BehaviorSubject<any[]>([]);
  private discountTypesSubject = new BehaviorSubject<any[]>([]);
  private categorySubject = new BehaviorSubject<any[]>([]);
  private taxSubject = new BehaviorSubject<any[]>([]);
  private supplierSubject = new BehaviorSubject<any[]>([]);


  discount$ = this.discountSubject.asObservable();
  discountTypes$ = this.discountTypesSubject.asObservable();
  taxes$ = this.taxSubject.asObservable();
  category$ = this.categorySubject.asObservable();
  supplier$ = this.supplierSubject.asObservable();

  
  constructor(private posService: PosServiceService) { }

  fetchMetaData() {
    this.posService.getDiscount().subscribe(data => this.discountSubject.next(data));
    this.posService.getDiscountTypes().subscribe(data => this.discountTypesSubject.next(data));
    this.posService.getCategories().subscribe(data => this.categorySubject.next(data));
    this.posService.getSupplier().subscribe((data) => this.supplierSubject.next(data));
    this.posService.getTax().subscribe((data) => this.taxSubject.next(data));
  }
}
