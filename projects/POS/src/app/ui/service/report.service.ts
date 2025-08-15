import { Injectable } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexGrid, ApexStroke, ApexTooltip, ApexPlotOptions, ApexFill, ApexLegend, ApexResponsive } from 'ng-apexcharts';
import { SalesReportDTO } from '../models/interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
export interface ProductPerformanceReportRequestDTO {
  startDate: Date;
  endDate: Date;
  branchIds?: number[];
  categoryIds?: number[];
  groupBy?: 'product' | 'category' | 'variant';
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
  id: number;
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
    return this.http.get<CategoryDTO[]>(`${this.baseUrl}/categories`).pipe(
      catchError(err => {
        console.error('Error fetching categories:', err);
        return throwError(() => err);
      })
    );
  }
}
