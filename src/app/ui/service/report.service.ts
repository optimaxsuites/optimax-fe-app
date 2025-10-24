import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  BranchDTO,
  SalesReportDTO,
  CategoryDTO,
  ProductPerformanceReportDTO,
  PromotionsReportDTO,
  BranchReportDTO,
  InventoryReportDTO,
  ProductPerformanceReportRequestDTO,
  PromotionsReportRequestDTO,
  BranchReportRequestDTO,
  InventoryReportRequestDTO,
  CashierReportDTO,
  CashierReportRequestDTO,
  PaymentMethodDTO,
  ProductStatsDTO,
  ProductPerformanceDTO,
  ProductDTO,
  PromotionPerformanceDTO,
  BranchPerformanceDTO,
  InventoryProductDTO,
  InventoryItemDTO,
} from '../models/interface';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private baseUrl = 'https://be.optimaxsuites.com/x/api/v2/pos';

  constructor(private http: HttpClient) {}

  getBranches(): Observable<BranchDTO[]> {
    return this.http.get<BranchDTO[]>(`${this.baseUrl}/branches`).pipe(
      catchError((err) => {
        console.error('Error fetching branches:', err);
        return throwError(() => err);
      })
    );
  }

  getSalesPerformanceReport(payload: any): Observable<SalesReportDTO> {
    const formattedPayload = {
      startDate: payload.startDate,
      endDate: payload.endDate,
      branchIds: payload.branchIds || [],
      cashierIds: payload.cashierIds || [],
      paymentMethods: payload.paymentMethods || [],
      categoryIds: payload.categoryIds || [],
    };
    return this.http
      .post<SalesReportDTO>(
        `${this.baseUrl}/salesreport/salesperformancereport`,
        formattedPayload
      )
      .pipe(
        catchError((err) => {
          console.error('Error fetching sales performance report:', err);
          return throwError(() => err);
        })
      );
  }

  getProductPerformanceReport(
    payload: ProductPerformanceReportRequestDTO
  ): Observable<ProductPerformanceReportDTO> {
    const formattedPayload = {
      startDate: new Date(payload.startDate).toISOString(),
      endDate: new Date(payload.endDate).toISOString(),
      branchIds: payload.branchIds || [],
      categoryIds: payload.categoryIds || [],
      groupBy: payload.groupBy || '',
    };
    return this.http
      .post<ProductPerformanceReportDTO>(
        `${this.baseUrl}/salesreport/productperformancereport`,
        formattedPayload
      )
      .pipe(
        catchError((err) => {
          console.error('Error fetching product performance report:', err);
          return throwError(() => err);
        })
      );
  }

  getCategories(): Observable<CategoryDTO[]> {
    return this.http
      .get<CategoryDTO[]>(`${this.baseUrl}/productCategories`)
      .pipe(
        catchError((err) => {
          console.error('Error fetching categories:', err);
          return throwError(() => err);
        })
      );
  }

  getCashierPerformanceReport(
    payload: CashierReportRequestDTO
  ): Observable<CashierReportDTO> {
    const formattedPayload = {
      startDate: payload.startDate,
      endDate: payload.endDate,
      branchIds:
        payload.branchIds && payload.branchIds.length > 0
          ? payload.branchIds
          : [0],
      shift: payload.shift || 'string',
    };
    console.log('Service: Sending to API:', formattedPayload);
    return this.http
      .post<CashierReportDTO>(
        `${this.baseUrl}/salesreport/cashierperformancereport`,
        formattedPayload
      )
      .pipe(
        map((response) => {
          console.log('Service: Raw response received:', response);
          const normalizedResponse: CashierReportDTO = {
            cashiers: response?.cashiers || [],
          };
          console.log('Service: Normalized response:', normalizedResponse);
          return normalizedResponse;
        }),
        catchError((err) => {
          console.error('Service: Error details:', {
            status: err.status,
            statusText: err.statusText,
            url: err.url,
            error: err.error,
          });
          return throwError(() => err);
        })
      );
  }

  getPromotionPerformanceReport(
    payload: PromotionsReportRequestDTO
  ): Observable<PromotionsReportDTO> {
    const startDate =
      payload.startDate instanceof Date
        ? payload.startDate
        : new Date(payload.startDate);
    const endDate =
      payload.endDate instanceof Date
        ? payload.endDate
        : new Date(payload.endDate);
    const formattedPayload = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      promotionIds:
        payload.promotionIds && payload.promotionIds.length > 0
          ? payload.promotionIds
          : [],
    };
    console.log('Sending promotion report request:', formattedPayload);
    return this.http
      .post<PromotionsReportDTO>(
        `${this.baseUrl}/salesreport/promotionperformancereport`,
        formattedPayload
      )
      .pipe(
        map((response) => {
          console.log('Raw promotion response:', response);
          const normalizedResponse: PromotionsReportDTO = {
            promotions: Array.isArray(response?.promotions)
              ? response.promotions
              : [],
          };
          console.log('Normalized promotion response:', normalizedResponse);
          return normalizedResponse;
        }),
        catchError((err) => {
          console.error('Error fetching promotion performance report:', {
            status: err.status,
            statusText: err.statusText,
            url: err.url,
            error: err.error,
            payload: formattedPayload,
          });
          return of({ promotions: [] });
        })
      );
  }

  getBranchPerformanceReport(
    payload: BranchReportRequestDTO
  ): Observable<BranchReportDTO> {
    const formattedPayload = {
      startDate: payload.startDate,
      endDate: payload.endDate,
      compareWithPrevious: payload.compareWithPrevious,
    };
    return this.http
      .post<BranchReportDTO>(
        `${this.baseUrl}/salesreport/branchperformancereport`,
        formattedPayload
      )
      .pipe(
        catchError((err) => {
          console.error('Error fetching branch performance report:', err);
          return throwError(() => err);
        })
      );
  }

  getInventoryReport(
    payload: InventoryReportRequestDTO
  ): Observable<InventoryReportDTO> {
    const formattedPayload = {
      branchIds: payload.branchIds || [0],
      categoryIds: payload.categoryIds || [0],
      includeLowStock: payload.includeLowStock || false,
    };
    console.log('Service: Sending inventory report request:', formattedPayload);
    return this.http
      .post<InventoryReportDTO>(
        `${this.baseUrl}/salesreport/inventoryperformancereport`,
        formattedPayload
      )
      .pipe(
        map((response) => {
          console.log('Service: Raw inventory response received:', response);
          const normalizedResponse: InventoryReportDTO = {
            inventory: Array.isArray(response?.inventory)
              ? response.inventory.map((item: InventoryItemDTO) => ({
                  ...item,
                  product: {
                    ...item.product,
                    id:
                      typeof item.product.id === 'string'
                        ? parseInt(item.product.id)
                        : item.product.id,
                  },
                  category: {
                    ...item.category,
                    id:
                      typeof item.category.id === 'string'
                        ? parseInt(item.category.id)
                        : item.category.id,
                  },
                  branch: {
                    ...item.branch,
                    id:
                      typeof item.branch.id === 'string'
                        ? parseInt(item.branch.id)
                        : item.branch.id,
                  },
                }))
              : [],
          };
          console.log(
            'Service: Normalized inventory response:',
            normalizedResponse
          );
          return normalizedResponse;
        }),
        catchError((err) => {
          console.error('Service: Error fetching inventory report:', {
            status: err.status,
            statusText: err.statusText,
            url: err.url,
            error: err.error,
            payload: formattedPayload,
          });
          return of({ inventory: [] });
        })
      );
  }

  getBranchMonthlyTrend(branchId: number): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/salesreport/monthlytrend`, { branchId })
      .pipe(
        catchError((err) => {
          console.error('Error fetching monthly trend data:', err);
          return of({ revenue: [], customers: [], months: [] });
        })
      );
  }

  // New methods to get full details by ID
  getProductById(id: number): Observable<ProductDTO> {
    return this.http.get<ProductDTO>(`${this.baseUrl}/products/${id}`).pipe(
      catchError((err) => {
        console.error(`Error fetching product with ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  getCategoryById(id: number): Observable<CategoryDTO> {
    return this.http.get<CategoryDTO>(`${this.baseUrl}/productCategories/${id}`).pipe(
      catchError((err) => {
        console.error(`Error fetching category with ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  getBranchById(id: number): Observable<BranchDTO> {
    return this.http.get<BranchDTO>(`${this.baseUrl}/branches/${id}`).pipe(
      catchError((err) => {
        console.error(`Error fetching branch with ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }
}