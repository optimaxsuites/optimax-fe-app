import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, finalize, firstValueFrom, forkJoin, max, min, Observable, of, switchMap, take, tap } from 'rxjs';
import { PosServiceService } from './pos-service.service';
import { CheckoutService } from './checkout.service';
import { SalesReportDTO, BranchSalesDTO, TopProductDTO, PaymentMethodSummaryDTO, SalesReportBreakdownDTO, Order } from '../models/interface';
import { OrderService } from './order.service';
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
  providedIn: 'root'
})
export class MetadataService {
 
  private branches: any = [
    
  ];

  private products: any = [
    
  ];

  private users: any = [
    
  ];

  private paymentMethods: string[] = ['Credit Card', 'Debit Card', 'Cash', 'Mobile Payment', 'Gift Card']

  private selectedBranchIdSubject = new BehaviorSubject<number | null>(1);
  selectedBranchId$ = this.selectedBranchIdSubject.asObservable();
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();



   discountSubject = new BehaviorSubject<any[]>([]);
   discountTypesSubject = new BehaviorSubject<any[]>([]);
   categorySubject = new BehaviorSubject<any[]>([]);
   taxSubject = new BehaviorSubject<any[]>([]);
   supplierSubject = new BehaviorSubject<any[]>([]);
   branchSubject = new BehaviorSubject<any[]>([]);
   productSubject =  new BehaviorSubject<any[]>([]);
   enrichedProductSubject =  new BehaviorSubject<any[]>([])
   orderSubject = new BehaviorSubject<any[]>([])
   returnSubject = new BehaviorSubject<any[]>([])

  discount$ = this.discountSubject.asObservable();
  discountTypes$ = this.discountTypesSubject.asObservable();
  taxes$ = this.taxSubject.asObservable();
  category$ = this.categorySubject.asObservable();
  supplier$ = this.supplierSubject.asObservable();
  branches$ = this.branchSubject.asObservable();
  orders$ = this.orderSubject.asObservable();
 returns$ = this.returnSubject.asObservable();
  products$ = this.productSubject.asObservable();
  enrichedProduct$ = this.enrichedProductSubject.asObservable()



  
  constructor(private posService: PosServiceService, private checkoutService: CheckoutService, private orderService: OrderService) { }
  async setSelectedBranch(id: number) {
    this.selectedBranchIdSubject.next(id);
   await this.fetchMetaData()

  }


  

 
  async fetchMetaData(): Promise<any> {
    console.log("🔄 [MetadataService] Starting metadata fetch");
  
    const token = sessionStorage.getItem("Token");
    if (!token) {
      console.warn("⛔ No token found. Skipping metadata fetch.");
      return Promise.resolve(true);
    }
  
    const metadata$ = forkJoin({
      discounts: this.posService.getDiscount().pipe(catchError(() => of([]))),
      discountTypes: this.posService.getDiscountTypes().pipe(catchError(() => of([]))),
      categories: this.posService.getCategories().pipe(catchError(() => of([]))),
      suppliers: this.posService.getSupplier().pipe(catchError(() => of([]))),
      taxes: this.posService.getTax().pipe(catchError(() => of([]))),
      branches: this.posService.getBranches().pipe(catchError(() => of([]))),
      products: this.posService.getProducts().pipe(catchError(() => of([]))),
      orders: this.checkoutService.getOrders().pipe(catchError(() => of([]))),
      returnRequests: this.orderService.getReturnRequest().pipe(catchError(() => of([]))),
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
  
    this.selectedBranchId$.pipe(take(1)).subscribe(branchId => {
      if (branchId != null) {
        this.loadingSubject.next(true);
        this.posService.getFilteredProductsWithDetails(branchId).pipe(
          catchError(error => {
            console.error("❌ Failed to load enriched products", error);
            return of([]);
          })
        ).subscribe(filteredProducts => {
          this.enrichedProductSubject.next(filteredProducts);
          this.loadingSubject.next(false);
          console.log("✅ [MetadataService] Enriched products loaded");
        });
      } else {
        console.warn("⚠️ No branch ID selected. Skipping filtered products fetch.");
      }
    });
  
    return true;
  }
  


  private loadEnrichedProductsByBranch(): Observable<void> {
    const branchId = this.selectedBranchIdSubject.value;
    if (!branchId) return of(undefined);

    this.loadingSubject.next(true);

    return this.posService.getFilteredProductsWithDetails(branchId).pipe(
      tap(data => this.enrichedProductSubject.next(data)),
      finalize(() => this.loadingSubject.next(false)),
      catchError((error) => {
        console.error('❌ Failed to load products for branch:', error);
        return of(undefined);
      }),
      switchMap(() => of(undefined))
    );
  }



  getSalesReport(): Observable<SalesReportDTO> {
    const branchSales: BranchSalesDTO[] = this.generateBranchSales();
    const topProducts: TopProductDTO[] = this.generateTopProducts();
    const paymentBreakdown: PaymentMethodSummaryDTO[] = this.generatePaymentMethodBreakdown();
    const salesBreakdown: SalesReportBreakdownDTO[] = this.generateSalesBreakdown();

    // Calculate totals
    const totalRevenue = branchSales.reduce((sum, branch) => sum + branch.totalRevenue, 0);
    const totalTransactions = branchSales.reduce((sum, branch) => sum + branch.totalTransactions, 0);
    const averageOrderValue = totalRevenue / totalTransactions;
    const totalDiscounts = salesBreakdown.reduce((sum, item) => sum + item.discounts, 0);

    const salesReport: SalesReportDTO = {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      totalDiscounts,
      totalSalesPerBranch: branchSales,
      topSellingProducts: topProducts,
      paymentMethodBreakdown: paymentBreakdown,
      breakdown: salesBreakdown
    };

    return of(salesReport);
  }

  
  private generateBranchSales(): BranchSalesDTO[] {
    return this.branches.map((branch: any) => {
      const totalTransactions = this.getRandomInt(100, 500);
      const totalRevenue = this.getRandomInt(10000, 50000);
      return {
        branch,
        totalRevenue,
        totalTransactions,
        averageOrderValue: totalRevenue / totalTransactions
      };
    });
  }

  private generateTopProducts(): TopProductDTO[] {
    return this.products.slice(0, 7).map((product: { price: number; }) => {
      const quantitySold = this.getRandomInt(20, 200);
      return {
        product,
        quantitySold,
        revenue: quantitySold * product.price
      };
    }).sort((a: { revenue: number; }, b: { revenue: number; }) => b.revenue - a.revenue);
  }

  private generatePaymentMethodBreakdown(): PaymentMethodSummaryDTO[] {
    return this.paymentMethods.map((method: any) => {
      const transactions = this.getRandomInt(50, 300);
      const revenue = this.getRandomInt(5000, 30000);
      return {
        paymentMethod: method,
        transactions,
        revenue
      };
    });
  }

  private generateSalesBreakdown(): SalesReportBreakdownDTO[] {
    const breakdown: SalesReportBreakdownDTO[] = [];
    
    // Generate data for the last 14 days
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // For each branch, create 1-3 entries per day
      this.branches.forEach((branch: any) => {
        const entriesCount = this.getRandomInt(1, 4);
        
        for (let j = 0; j < entriesCount; j++) {
          const transactions = this.getRandomInt(5, 30);
          const revenue = this.getRandomInt(500, 3000);
          const discounts = revenue * this.getRandomFloat(0.05, 0.15);
          
          breakdown.push({
            date: new Date(date),
            branch,
            cashier: this.users[this.getRandomInt(0, this.users.length)],
            paymentMethod: this.paymentMethods[this.getRandomInt(0, this.paymentMethods.length)],
            transactions,
            revenue,
            discounts
          });
        }
      });
    }
    
    return breakdown;
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  private getRandomFloat(min: number, max: number): number {
    return (Math.random() * (max - min) + min);
  }
}

