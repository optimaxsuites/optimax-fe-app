import { Injectable } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexGrid, ApexStroke, ApexTooltip, ApexPlotOptions, ApexFill, ApexLegend, ApexResponsive } from 'ng-apexcharts';
import { SalesReportDTO } from '../models/interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface InventoryReportRequestDTO {
  branchIds?: number[];
  categoryIds?: number[];
  includeLowStock?: boolean;
}

export interface InventoryProductDTO {
  id: number;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
}

export interface InventoryItemDTO {
  product: InventoryProductDTO;
  category: CategoryDTO;
  currentStock: number;
  soldQuantity: number;
  branch: BranchDTO;
  lowStockAlert: boolean;
}

export interface InventoryReportDTO {
  inventory: InventoryItemDTO[];
}
export interface ProductPerformanceReportRequestDTO {
  startDate: string;
  endDate: string;
  branchIds?: number[];
  categoryIds?: number[];
  groupBy?: 'product' | 'category' | 'variant';
}
export interface PromotionsReportRequestDTO {
  startDate: Date;
  endDate: Date;
  promotionIds?: string[];
}

export interface DiscountDTO {
  id: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  active: boolean;
  code?: string;
}

export interface BranchDTO {
  id: number;
  name: string;
  location: string;
  manager: string;
  contactInfo: string;
}

export interface BranchReportRequestDTO {
  startDate: Date;
  endDate: Date;
  compareWithPrevious?: boolean;
}

export interface BranchPerformanceDTO {
  branch: BranchDTO;
  totalRevenue: number;
  productMovement: number;
  customerFootfall?: number;
  previousRevenue?: number;
  revenueGrowthPercent: number;
}

export interface BranchReportDTO {
  branches: BranchPerformanceDTO[];
}
export interface ProductDTO {
  id: string;
  name: string;
  category: string;
  price: number;
  discountedUnits: number;
  totalDiscountAmount: number;
}

export interface PromotionPerformanceDTO {
  promotion: DiscountDTO;
  usageCount: number;
  totalDiscountAmount: number;
  affectedProducts: ProductDTO[];
  startDate: Date;
  endDate: Date;
}

export interface PromotionsReportDTO {
  promotions: PromotionPerformanceDTO[];
}


export interface BranchDTO {
  id: number;
  name: string;
  location: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  sku: string;
  price: number;
}

export interface ProductStatsDTO {
  product: ProductDTO;
  quantitySold: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface ProductPerformanceDTO {
  product: ProductDTO;
  category: CategoryDTO;
  variant?: string;
  quantitySold: number;
  totalRevenue: number;
  grossMargin: number;
  branch?: BranchDTO;
}

export interface ProductPerformanceReportDTO {
  totalProductsSold: number;
  totalRevenue: number;
  bestsellers: ProductStatsDTO[];
  underperformers: ProductStatsDTO[];
  productPerformanceBreakdown: ProductPerformanceDTO[];
}
export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface CashierPerformanceDTO {
  cashier: UserDTO;
  branch: BranchDTO;
  ordersHandled: number;
  revenueGenerated: number;
  refunds: number;
  discountsGiven: number;
}

export interface CashierReportDTO {
  cashiers: CashierPerformanceDTO[];
}

export interface CashierReportRequestDTO {
  startDate: string;
  endDate: string;
  branchIds?: number[];
  shift?: string;
}

// Chart type definitions
export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  legend: ApexLegend;
  responsive: ApexResponsive[];
  colors: string[];
};
@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private baseUrl = 'https://be.optimaxsuites.com/x/api/v2/pos';
  

  constructor(private http: HttpClient) {
    this.http = http;
  }

 
  getSalesPerformanceReport(payload: any): Observable<SalesReportDTO> {
   
    const formattedPayload = {
      startDate: payload.startDate,
      endDate: payload.endDate,
      branchIds: payload.branchIds || [],
      cashierIds: payload.cashierIds || [],
      paymentMethods: payload.paymentMethods || [],
      groupBy: payload.groupBy || ""
    };
  
    return this.http.post<SalesReportDTO>(
      `${this.baseUrl}/salesreport/salesperformancereport`,
      formattedPayload).pipe(
      catchError(err => {
        console.error('Error fetching sales performance report:', err);
        return throwError(() => err);
      })
    );
  }

   getProductPerformanceReport(payload: any): Observable<ProductPerformanceReportDTO> {
    const formattedPayload = {
      startDate: new Date(payload.startDate).toISOString(),
      endDate: new Date(payload.endDate).toISOString(),
      branchIds: payload.branchIds || [],
      categoryIds: payload.categoryIds || [],
      groupBy: payload.groupBy || ''
    };

    return this.http.post<ProductPerformanceReportDTO>(
      `${this.baseUrl}/salesreport/productperformancereport`,
      formattedPayload
    ).pipe(
      catchError(err => {
        console.error('Error fetching product performance report:', err);
        return throwError(() => err);
      })
    );
  }

  getBranches(): Observable<BranchDTO[]> {
    return this.http.get<BranchDTO[]>(`${this.baseUrl}/branches`).pipe(
      catchError(err => {
        console.error('Error fetching branches:', err);
        return throwError(() => err);
      })
    );
  }

  getCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.baseUrl}/productCategories`).pipe(
      catchError(err => {
        console.error('Error fetching categories:', err);
        return throwError(() => err);
      })
    );
  }
getCashierPerformanceReport(payload: CashierReportRequestDTO): Observable<CashierReportDTO> {
  const formattedPayload = {
    startDate: payload.startDate, 
    endDate: payload.endDate, 
    branchIds: payload.branchIds && payload.branchIds.length > 0 ? payload.branchIds : [0],
    shift: payload.shift || "string"
  };

  console.log('Service: Sending to API:', formattedPayload);

  return this.http.post<CashierReportDTO>(
    `${this.baseUrl}/salesreport/cashierperformancereport`,
    formattedPayload
  ).pipe(
    map(response => {
      console.log('Service: Raw response received:', response);
      
  
      const normalizedResponse: CashierReportDTO = {
        cashiers: response?.cashiers || []
      };
      
      console.log('Service: Normalized response:', normalizedResponse);
      return normalizedResponse;
    }),
    catchError(err => {
      console.error('Service: Error details:', {
        status: err.status,
        statusText: err.statusText,
        url: err.url,
        error: err.error
      });
      return throwError(() => err);
    })
  );
}
getPromotionPerformanceReport(payload: PromotionsReportRequestDTO): Observable<PromotionsReportDTO> {
  const startDate = payload.startDate instanceof Date ? payload.startDate : new Date(payload.startDate);
  const endDate = payload.endDate instanceof Date ? payload.endDate : new Date(payload.endDate);
  
  const formattedPayload = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    promotionIds: payload.promotionIds && payload.promotionIds.length > 0 ? payload.promotionIds : []
  };

  console.log('Sending promotion report request:', formattedPayload);

  return this.http.post<PromotionsReportDTO>(
    `${this.baseUrl}/salesreport/promotionperformancereport`,
    formattedPayload
  ).pipe(
    map(response => {
      console.log('Raw promotion response:', response);
      
      const normalizedResponse: PromotionsReportDTO = {
        promotions: Array.isArray(response?.promotions) ? response.promotions : []
      };
      
      console.log('Normalized promotion response:', normalizedResponse);
      return normalizedResponse;
    }),
    catchError(err => {
      console.error('Error fetching promotion performance report:', {
        status: err.status,
        statusText: err.statusText,
        url: err.url,
        error: err.error,
        payload: formattedPayload
      });
      
      // Return empty data structure on error
      return of({ promotions: [] });
    })
  );
}
// Add to ReportService
getBranchPerformanceReport(payload: any): Observable<BranchReportDTO> {
  const formattedPayload = {
    startDate: payload.startDate,
    endDate: payload.endDate,
    compareWithPrevious: payload.compareWithPrevious
  };

  return this.http.post<BranchReportDTO>(
    `${this.baseUrl}/salesreport/branchperformancereport`,
    formattedPayload
  ).pipe(
    catchError(err => {
      console.error('Error fetching branch performance report:', err);
      return throwError(() => err);
    })
  );
}
// ... (existing methods) ...

// getBranchMonthlyTrend(payload: any): Observable<TrendDataDTO> {
//   const formattedPayload = {
//     startDate: payload.startDate.toISOString(),
//     endDate: payload.endDate.toISOString(),
//     branchId: payload.branchId
//   };
//   return this.http.post<TrendDataDTO>(`${this.baseUrl}/salesreport/branchmonthlytrend`, formattedPayload).pipe(
//     catchError(err => {
//       console.error('Error fetching branch monthly trend:', err);
//       return throwError(() => err);
//     })
//   );
// }

// getBranchProductCategories(payload: any): Observable<CategoryDataDTO[]> {
//   const formattedPayload = {
//     startDate: payload.startDate.toISOString(),
//     endDate: payload.endDate.toISOString(),
//     branchId: payload.branchId
//   };
//   return this.http.post<CategoryDataDTO[]>(`${this.baseUrl}/salesreport/branchproductcategories`, formattedPayload).pipe(
//     catchError(err => {
//       console.error('Error fetching branch product categories:', err);
//       return throwError(() => err);
//     })
//   );
// }

// getCustomerDemographics(payload: any): Observable<DemographicDataDTO[]> {
//   const formattedPayload = {
//     startDate: payload.startDate.toISOString(),
//     endDate: payload.endDate.toISOString(),
//     branchId: payload.branchId
//   };
//   return this.http.post<DemographicDataDTO[]>(`${this.baseUrl}/salesreport/customerdemographics`, formattedPayload).pipe(
//     catchError(err => {
//       console.error('Error fetching customer demographics:', err);
//       return throwError(() => err);
//     })
//   );
// }

// getHourlyTraffic(payload: any): Observable<TrafficDataDTO> {
//   const formattedPayload = {
//     startDate: payload.startDate.toISOString(),
//     endDate: payload.endDate.toISOString(),
//     branchId: payload.branchId
//   };
//   return this.http.post<TrafficDataDTO>(`${this.baseUrl}/salesreport/hourlytraffic`, formattedPayload).pipe(
//     catchError(err => {
//       console.error('Error fetching hourly traffic:', err);
//       return throwError(() => err);
//     })
//   );
// }
getInventoryReport(payload: InventoryReportRequestDTO): Observable<InventoryReportDTO> {
    const formattedPayload = {
      branchIds: payload.branchIds || [0],
      categoryIds: payload.categoryIds || [0],
      includeLowStock: payload.includeLowStock || false
    };

    console.log('Service: Sending inventory report request:', formattedPayload);

    return this.http.post<InventoryReportDTO>(
      `${this.baseUrl}/salesreport/inventoryperformancereport`, 
      formattedPayload
    ).pipe(
      map(response => {
        console.log('Service: Raw inventory response received:', response);
        
        // Normalize the response to ensure consistent data structure
        const normalizedResponse: InventoryReportDTO = {
          inventory: Array.isArray(response?.inventory) ? response.inventory.map(item => ({
            ...item,
            product: {
              ...item.product,
              id: typeof item.product.id === 'string' ? parseInt(item.product.id) : item.product.id
            },
            category: {
              ...item.category,
              id: typeof item.category.id === 'string' ? parseInt(item.category.id) : item.category.id
            },
            branch: {
              ...item.branch,
              id: typeof item.branch.id === 'string' ? parseInt(item.branch.id) : item.branch.id
            }
          })) : []
        };
        
        console.log('Service: Normalized inventory response:', normalizedResponse);
        return normalizedResponse;
      }),
      catchError(err => {
        console.error('Service: Error fetching inventory report:', {
          status: err.status,
          statusText: err.statusText,
          url: err.url,
          error: err.error,
          payload: formattedPayload
        });
        
        // Return empty data structure on error
        return of({ inventory: [] });
      })
    );
  }

}
