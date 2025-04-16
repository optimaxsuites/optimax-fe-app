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
  private branchSubject = new BehaviorSubject<any[]>([]);
  private productSubject =  new BehaviorSubject<any[]>([]);
  private enrichedProductSubject =  new BehaviorSubject<any[]>([])


  discount$ = this.discountSubject.asObservable();
  discountTypes$ = this.discountTypesSubject.asObservable();
  taxes$ = this.taxSubject.asObservable();
  category$ = this.categorySubject.asObservable();
  supplier$ = this.supplierSubject.asObservable();
  branches$ = this.branchSubject.asObservable();
  products$ = this.productSubject.asObservable();
  enrichedProduct$ = this.enrichedProductSubject.asObservable()



  
  constructor(private posService: PosServiceService) { }

  fetchMetaData() {
    this.posService.getDiscount().subscribe(data => this.discountSubject.next(data));
    this.posService.getDiscountTypes().subscribe(data => this.discountTypesSubject.next(data));
    this.posService.getCategories().subscribe(data => this.categorySubject.next(data));
    this.posService.getSupplier().subscribe((data) => this.supplierSubject.next(data));
    this.posService.getTax().subscribe((data) => this.taxSubject.next(data));
    this.posService.getBranches().subscribe((data) => this.branchSubject.next(data));
    this.posService.getProducts().subscribe((data) => this.productSubject.next(data));
    this.posService.getFilteredProductsWithDetails(1).subscribe(data => 
      this.enrichedProductSubject.next(data)
    );

  }
}
