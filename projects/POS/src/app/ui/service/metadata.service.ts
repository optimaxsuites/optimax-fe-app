import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { PosServiceService } from './pos-service.service';
import { CheckoutService } from './checkout.service';
import { SalesReportDTO, BranchSalesDTO, TopProductDTO, PaymentMethodSummaryDTO, SalesReportBreakdownDTO } from '../models/interface';
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
    { id: 1, name: 'Downtown Store', location: 'Main Street 123' },
    { id: 2, name: 'Shopping Mall', location: 'Fashion Avenue 45' },
    { id: 3, name: 'North Side', location: 'Business Park 67' },
    { id: 4, name: 'East Branch', location: 'Green Road 89' },
    { id: 5, name: 'West Location', location: 'Blue Highway 101' },
  ];

  private products: any = [
    { id: 1, name: 'Premium Headphones', sku: 'EL-001', price: 199.99, category: 'Electronics' },
    { id: 2, name: 'Wireless Keyboard', sku: 'EL-002', price: 89.99, category: 'Electronics' },
    { id: 3, name: 'Designer T-Shirt', sku: 'CL-001', price: 29.99, category: 'Clothing' },
    { id: 4, name: 'Leather Jacket', sku: 'CL-002', price: 249.99, category: 'Clothing' },
    { id: 5, name: 'Smart Watch', sku: 'EL-003', price: 299.99, category: 'Electronics' },
    { id: 6, name: 'Bluetooth Speaker', sku: 'EL-004', price: 129.99, category: 'Electronics' },
    { id: 7, name: 'Athletic Shoes', sku: 'SH-001', price: 119.99, category: 'Footwear' },
    { id: 8, name: 'Formal Shoes', sku: 'SH-002', price: 159.99, category: 'Footwear' },
    { id: 9, name: 'Smartphone Case', sku: 'AC-001', price: 19.99, category: 'Accessories' },
    { id: 10, name: 'Laptop Bag', sku: 'AC-002', price: 59.99, category: 'Accessories' },
  ];

  private users: any = [
    { id: 1, name: 'John Smith', email: 'john.smith@example.com', role: 'Cashier' },
    { id: 2, name: 'Emma Johnson', email: 'emma.johnson@example.com', role: 'Cashier' },
    { id: 3, name: 'Michael Brown', email: 'michael.brown@example.com', role: 'Cashier' },
    { id: 4, name: 'Lisa Davis', email: 'lisa.davis@example.com', role: 'Cashier' },
    { id: 5, name: 'James Wilson', email: 'james.wilson@example.com', role: 'Cashier' },
  ];

  private paymentMethods: string[] = ['Credit Card', 'Debit Card', 'Cash', 'Mobile Payment', 'Gift Card']

  private selectedBranchIdSubject = new BehaviorSubject<number | null>(null);
  selectedBranchId$ = this.selectedBranchIdSubject.asObservable();
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private discountSubject = new BehaviorSubject<any[]>([]);
  private discountTypesSubject = new BehaviorSubject<any[]>([]);
  private categorySubject = new BehaviorSubject<any[]>([]);
  private taxSubject = new BehaviorSubject<any[]>([]);
  private supplierSubject = new BehaviorSubject<any[]>([]);
  private branchSubject = new BehaviorSubject<any[]>([]);
  private productSubject =  new BehaviorSubject<any[]>([]);
  private enrichedProductSubject =  new BehaviorSubject<any[]>([])
  private orderSubject = new BehaviorSubject<any[]>([])

  discount$ = this.discountSubject.asObservable();
  discountTypes$ = this.discountTypesSubject.asObservable();
  taxes$ = this.taxSubject.asObservable();
  category$ = this.categorySubject.asObservable();
  supplier$ = this.supplierSubject.asObservable();
  branches$ = this.branchSubject.asObservable();
  orders$ = this.orderSubject.asObservable();

  products$ = this.productSubject.asObservable();
  enrichedProduct$ = this.enrichedProductSubject.asObservable()



  
  constructor(private posService: PosServiceService, private checkoutService: CheckoutService) { }
  setSelectedBranch(id: number) {
    this.selectedBranchIdSubject.next(id);
  }

  fetchMetaData() {
    this.posService.getDiscount().subscribe(data => this.discountSubject.next(data));
    this.posService.getDiscountTypes().subscribe(data => this.discountTypesSubject.next(data));
    this.posService.getCategories().subscribe(data => this.categorySubject.next(data));
    this.posService.getSupplier().subscribe((data) => this.supplierSubject.next(data));
    this.posService.getTax().subscribe((data) => this.taxSubject.next(data));
    this.posService.getBranches().subscribe((data) => this.branchSubject.next(data));
    this.posService.getProducts().subscribe((data) => this.productSubject.next(data));
    this.posService.getProducts().subscribe((data) => this.productSubject.next(data));
    this.checkoutService.getOrders().subscribe((data) => this.orderSubject.next(data));
    this.selectedBranchId$.subscribe((branchId) => {
      if (branchId != null) {
        this.loadingSubject.next(true); 
  
        this.posService.getFilteredProductsWithDetails(branchId).subscribe(data => {
          this.enrichedProductSubject.next(data);
          this.loadingSubject.next(false); // end loading
        }, error => {
          this.loadingSubject.next(false); // end loading on error too
          console.error('❌ Failed to load products for branch:', error);
        });
      }
    });

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

