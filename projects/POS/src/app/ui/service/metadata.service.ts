import { Injectable, isDevMode } from "@angular/core";
import {
  BehaviorSubject,
  catchError,
  finalize,
  firstValueFrom,
  forkJoin,
  max,
  min,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from "rxjs";
import { PosServiceService } from "./pos-service.service";
import { CheckoutService } from "./checkout.service";
import { environment } from "../sharedComponent/service/environments/environment";
import {
  SalesReportDTO,
  BranchSalesDTO,
  TopProductDTO,
  PaymentMethodSummaryDTO,
  SalesReportBreakdownDTO,
  Order,
  RefundStatus,
} from "../models/interface";
import { OrderService } from "./order.service";
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from "@angular/common/http";
import { OfflineService } from "./offline.service";
export interface BranchDTO {
  id: number;
  name: string;
  location: string;
}

export interface ProductDTO {
  id: number;
  name: string;
  sku: string;
  price: number;
  category?: string;
}

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: string;
}
@Injectable({
  providedIn: "root",
})
export class MetadataService {
  // rejectRefund(refundLogId: number, customerName: any, adminComment: string) {
  //   throw new Error("Method not implemented.");
  // }
  // approveRefund(refundLogId: number, customerName: any, adminComment: string) {
  //   throw new Error("Method not implemented.");
  // }

  private branches: any = [];

  private products: any = [];

  private users: any = [];

  private paymentMethods: string[] = [
    "Credit Card",
    "Debit Card",
    "Cash",
    "Mobile Payment",
    "Gift Card",
  ];

  private selectedBranchIdSubject = new BehaviorSubject<number | null>(5);
  selectedBranchId$ = this.selectedBranchIdSubject.asObservable();
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  discountSubject = new BehaviorSubject<any[]>([]);
  discountTypesSubject = new BehaviorSubject<any[]>([]);
  categorySubject = new BehaviorSubject<any[]>([]);
  taxSubject = new BehaviorSubject<any[]>([]);
  supplierSubject = new BehaviorSubject<any[]>([]);
  branchSubject = new BehaviorSubject<any[]>([]);
  productSubject = new BehaviorSubject<any[]>([]);
  enrichedProductSubject = new BehaviorSubject<any[]>([]);
  orderSubject = new BehaviorSubject<any[]>([]);
  returnSubject = new BehaviorSubject<any[]>([]);

  discount$ = this.discountSubject.asObservable();
  discountTypes$ = this.discountTypesSubject.asObservable();
  taxes$ = this.taxSubject.asObservable();
  category$ = this.categorySubject.asObservable();
  supplier$ = this.supplierSubject.asObservable();
  branches$ = this.branchSubject.asObservable();
  orders$ = this.orderSubject.asObservable();
  returns$ = this.returnSubject.asObservable();
  products$ = this.productSubject.asObservable();
  enrichedProduct$ = this.enrichedProductSubject.asObservable();

  constructor(
    private posService: PosServiceService,
    private checkoutService: CheckoutService,
    private orderService: OrderService,
    private http: HttpClient,
    private offlineService: OfflineService
   
  ) {}
  async setSelectedBranch(id: number) {
    this.selectedBranchIdSubject.next(id);
    await this.fetchMetaData();
  }

  


  async fetchMetaData(): Promise<any> {
    console.log("🔄 [MetadataService] Starting metadata fetch");
    if (!navigator.onLine) {
      console.warn("⚠️ Offline. Loading products from local cache...");
      // const offlineProducts = await firstValueFrom(this.offlineService.getProducts());
      // this.productSubject.next(offlineProducts);
      // this.enrichedProductSubject.next(offlineProducts);

      // console.log(offlineProducts)

      this.offlineService.getProducts().subscribe((peoples) => {
        console.log(peoples);
      });
;
      return true;
    }


    const token = sessionStorage.getItem("Token");
    if (!token) {
      console.warn("⛔ No token found. Skipping metadata fetch.");
      return Promise.resolve(true);
    }

    const metadata$ = forkJoin({
      discounts: this.posService.getDiscount().pipe(catchError(() => of([]))),
      discountTypes: this.posService
        .getDiscountTypes()
        .pipe(catchError(() => of([]))),
      categories: this.posService
        .getCategories()
        .pipe(catchError(() => of([]))),
      suppliers: this.posService.getSupplier().pipe(catchError(() => of([]))),
      taxes: this.posService.getTax().pipe(catchError(() => of([]))),
      branches: this.posService.getBranches().pipe(catchError(() => of([]))),
      products: this.posService.getProducts().pipe(catchError(() => of([]))),
      orders: this.checkoutService.getOrders().pipe(catchError(() => of([]))),
      returnRequests: this.orderService
        .getReturnRequest()
        .pipe(catchError(() => of([]))),
    });

    const data = await firstValueFrom(metadata$);
    this.discountSubject.next(data.discounts);
    this.discountTypesSubject.next(data.discountTypes);
    this.categorySubject.next(data.categories);
    this.supplierSubject.next(data.suppliers);
    this.taxSubject.next(data.taxes);
    this.branchSubject.next(data.branches);
    this.productSubject.next(data.products);
    this.orderSubject.next(data.orders);
    this.returnSubject.next(data.returnRequests);

    console.log("✅ [MetadataService] Base metadata loaded");

    this.selectedBranchId$.pipe(take(1)).subscribe((branchId) => {
      if (branchId != null) {
        this.loadingSubject.next(true);
        this.posService
          .getFilteredProductsWithDetails(branchId)
          .pipe(
            catchError((error) => {
              console.error("❌ Failed to load enriched products", error);
              return of([]);
            })
          )
          .subscribe((filteredProducts) => {
            this.enrichedProductSubject.next(filteredProducts);
            this.loadingSubject.next(false);
            console.log("✅ [MetadataService] Enriched products loaded");
          });
      } else {
        console.warn(
          "⚠️ No branch ID selected. Skipping filtered products fetch."
        );
      }
    });
      if (data.products && data.products.length > 0) {
     console.log("data", data)

      for (const product of data.products) {
        await this.offlineService.addProduct({
          ...product,
          isSynced: true,
        });
      }
      console.log("📦 Products cached locally in IndexedDB");
    }


    return true;
  }

  private loadEnrichedProductsByBranch(): Observable<void> {
    const branchId = this.selectedBranchIdSubject.value;
    if (!branchId) return of(undefined);

    this.loadingSubject.next(true);

    return this.posService.getFilteredProductsWithDetails(branchId).pipe(
      tap((data) => this.enrichedProductSubject.next(data)),
      finalize(() => this.loadingSubject.next(false)),
      catchError((error) => {
        console.error("❌ Failed to load products for branch:", error);
        return of(undefined);
      }),
      switchMap(() => of(undefined))
    );
  }


  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  private getRandomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private handleRefundError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {

      errorMessage = error.error.message;
    } else {

      console.error('Full error response:', error);

      if (error.error?.fieldErrors?.length) {

        const fieldMessages = error.error.fieldErrors
          .map((fe: any) => `${fe.field}: ${fe.errorCode}${fe.message ? ` - ${fe.message}` : ''}`)
          .join(', ');
        errorMessage = `Validation errors: ${fieldMessages}`;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `HTTP ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Refund update error:', error);
    return throwError(() => new Error(errorMessage));
  };
  updateReturnLogStatus(logId: number, status: string, adminComment?: string): Observable<any> {
    const body = {
      refundStatus: status,
      adminComment: adminComment || ''
    };

    return this.http.put(`${this.getBaseApiUrl()}/x/api/v2/pos/itemReturnLogs/${logId}`, body)
      .pipe(catchError(this.handleError));
  }

  private handleError = (error: any): Observable<any> => {
    console.error('MetadataService API Error:', error);
    throw error;
  };

  async refreshRefundData(): Promise<void> {
    try {
      const returnRequests = await firstValueFrom(
        this.orderService.getReturnRequest().pipe(catchError(() => of([])))
      );
      this.returnSubject.next(returnRequests);
    } catch (error) {
      console.error('Failed to refresh refund data:', error);
    }
  }

approveRefund(refundLogId: number, customerName: string, adminComment: string): Observable<any> {
  const existingRefund = this.returnSubject.value.find((r: any) => r.id === refundLogId);
  
  if (!existingRefund) {
    return throwError(() => new Error('Refund not found'));
  }

  const body = {
    id: refundLogId,
    name: customerName,
    refundStatus: 'Approved',
    adminComment: adminComment?.trim() || '',
    
   
    phoneNumber: existingRefund.phoneNumber || null,
    reason: existingRefund.reason || null,
    cashierComment: existingRefund.cashierComment || null,
    createdAt: existingRefund.createdAt || new Date().toISOString(),
    refundableAmount: existingRefund.refundableAmount || 0,
    refundMethod: existingRefund.refundMethod || 'CASH',
    royaltyAccountId: existingRefund.royaltyAccountId || null,
    
   
    order: existingRefund.order || null,
    orderId: existingRefund.order?.id || existingRefund.orderId || null,
    
    processedById: null,
    bankDetail: existingRefund.bankDetail || null,
    bankDetailsId: existingRefund.bankDetailsId || null,
    exchangeForId: existingRefund.exchangeForId || null,
    returnItems: existingRefund.returnItems || []
  };

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  return this.http.put(
    `${this.getBaseApiUrl()}/x/api/v2/pos/itemReturnLogs/${refundLogId}`,
    body,
    { headers }
  ).pipe(
    tap((response) => {
      console.log('Approve refund response:', response);
      this.refreshRefundData();
    }),
    catchError(this.handleRefundError)
  );
}

rejectRefund(refundLogId: number, customerName: string, adminComment: string): Observable<any> {
  const existingRefund = this.returnSubject.value.find((r: any) => r.id === refundLogId);
  
  if (!existingRefund) {
    return throwError(() => new Error('Refund not found'));
  }

  const body = {
    id: refundLogId,
    name: customerName,
    refundStatus: 'Rejected',
    adminComment: adminComment?.trim() || '',
    
   
    phoneNumber: existingRefund.phoneNumber || null,
    reason: existingRefund.reason || null,
    cashierComment: existingRefund.cashierComment || null,
    createdAt: existingRefund.createdAt || new Date().toISOString(),
    refundableAmount: existingRefund.refundableAmount || 0,
    refundMethod: existingRefund.refundMethod || 'CASH',
    royaltyAccountId: existingRefund.royaltyAccountId || null,
    
    
    order: existingRefund.order || null,
    orderId: existingRefund.order?.id || existingRefund.orderId || null,
    
    processedById: null,
    bankDetail: existingRefund.bankDetail || null,
    bankDetailsId: existingRefund.bankDetailsId || null,
    exchangeForId: existingRefund.exchangeForId || null,
    returnItems: existingRefund.returnItems || []
  };

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  return this.http.put(
    `${this.getBaseApiUrl()}/x/api/v2/pos/itemReturnLogs/${refundLogId}`,
    body,
    { headers }
  ).pipe(
    tap((response) => {
      console.log('Reject refund response:', response);
      this.refreshRefundData();
    }),
    catchError(this.handleRefundError)
  );
}
}
