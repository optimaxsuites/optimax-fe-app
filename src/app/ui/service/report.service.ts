import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { forkJoin } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
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
  ProductDTO,
  InventoryItemDTO,
  StockMovementReportDTO,
  StockMovementReportItemDTO,
  StockMovementReportRequestDTO,
  StockMovementResponsePayload
} from '../models/interface';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private baseUrl = 'https://be.optimaxsuites.com/x/api/v2/pos';

  // Caches
  private branchesCache: BranchDTO[] | null = null;
  private categoriesCache: CategoryDTO[] | null = null;
  private productCache = new Map<number, ProductDTO>();
  private branchCache = new Map<number, BranchDTO>();
  private categoryCache = new Map<number, CategoryDTO>();
  private allProductsCache: ProductDTO[] | null = null;

  constructor(private http: HttpClient) {}

  // Cached Branches
  getBranches(): Observable<BranchDTO[]> {
    if (this.branchesCache) {
      return of(this.branchesCache);
    }
    
    return this.http.get<BranchDTO[]>(`${this.baseUrl}/branches`).pipe(
      tap(data => {
        this.branchesCache = data;
        data.forEach(branch => {
          if (branch.id) {
            this.branchCache.set(branch.id, branch);
          }
        });
      }),
      catchError((err) => {
        console.error('Error fetching branches:', err);
        return throwError(() => err);
      }),
      shareReplay(1)
    );
  }

  // Cached Categories
  getCategories(): Observable<CategoryDTO[]> {
    if (this.categoriesCache) {
      return of(this.categoriesCache);
    }
    
    return this.http
      .get<CategoryDTO[]>(`${this.baseUrl}/productCategories`)
      .pipe(
        tap(data => {
          this.categoriesCache = data;
          data.forEach(category => {
            if (category.id) {
              this.categoryCache.set(category.id, category);
            }
          });
        }),
        catchError((err) => {
          console.error('Error fetching categories:', err);
          return throwError(() => err);
        }),
        shareReplay(1)
      );
  }

  // Get ALL products at once
  getAllProducts(): Observable<ProductDTO[]> {
    if (this.allProductsCache) {
      return of(this.allProductsCache);
    }
    
    return this.http.get<ProductDTO[]>(`${this.baseUrl}/products`).pipe(
      tap(products => {
        this.allProductsCache = products;
        products.forEach(product => {
          if (product.id) {
            this.productCache.set(product.id, product);
          }
        });
      }),
      catchError((err) => {
        console.error('Error fetching all products:', err);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  // Cached Product by ID
  getProductById(id: number): Observable<ProductDTO> {
    if (this.productCache.has(id)) {
      return of(this.productCache.get(id)!);
    }
    
    return this.http.get<ProductDTO>(`${this.baseUrl}/products/${id}`).pipe(
      tap(product => {
        if (product && product.id) {
          this.productCache.set(product.id, product);
        }
      }),
      catchError((err) => {
        console.error(`Error fetching product with ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  // Cached Category by ID
  getCategoryById(id: number): Observable<CategoryDTO> {
    if (this.categoryCache.has(id)) {
      return of(this.categoryCache.get(id)!);
    }
    
    return this.http.get<CategoryDTO>(`${this.baseUrl}/productCategories/${id}`).pipe(
      tap(category => {
        if (category && category.id) {
          this.categoryCache.set(category.id, category);
        }
      }),
      catchError((err) => {
        console.error(`Error fetching category with ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  // Cached Branch by ID
  getBranchById(id: number): Observable<BranchDTO> {
    if (this.branchCache.has(id)) {
      return of(this.branchCache.get(id)!);
    }
    
    return this.http.get<BranchDTO>(`${this.baseUrl}/branches/${id}`).pipe(
      tap(branch => {
        if (branch && branch.id) {
          this.branchCache.set(branch.id, branch);
        }
      }),
      catchError((err) => {
        console.error(`Error fetching branch with ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  // Bulk enrichment methods
  getProductsByIds(ids: number[]): Observable<Map<number, ProductDTO>> {
    const missingIds = ids.filter(id => !this.productCache.has(id));
    
    if (missingIds.length === 0) {
      const result = new Map<number, ProductDTO>();
      ids.forEach(id => {
        const product = this.productCache.get(id);
        if (product) {
          result.set(id, product);
        }
      });
      return of(result);
    }
    
    if (this.allProductsCache) {
      const result = new Map<number, ProductDTO>();
      ids.forEach(id => {
        const product = this.allProductsCache?.find(p => p.id === id);
        if (product) {
          result.set(id, product);
          this.productCache.set(id, product);
        }
      });
      return of(result);
    }
    
    const requests = missingIds.map(id => 
      this.getProductById(id).pipe(
        catchError(() => of(null))
      )
    );
    
    return requests.length ? forkJoin(requests).pipe(
      map(products => {
        const result = new Map<number, ProductDTO>();
        products.forEach(product => {
          if (product && product.id) {
            result.set(product.id, product);
            this.productCache.set(product.id, product);
          }
        });
        return result;
      })
    ) : of(new Map<number, ProductDTO>());
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
    return this.http
      .post<CashierReportDTO>(
        `${this.baseUrl}/salesreport/cashierperformancereport`,
        formattedPayload
      )
      .pipe(
        map((response) => {
          const normalizedResponse: CashierReportDTO = {
            cashiers: response?.cashiers || [],
          };
          return normalizedResponse;
        }),
        catchError((err) => {
          console.error('Service: Error details:', err);
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
    return this.http
      .post<PromotionsReportDTO>(
        `${this.baseUrl}/salesreport/promotionperformancereport`,
        formattedPayload
      )
      .pipe(
        map((response) => {
          const normalizedResponse: PromotionsReportDTO = {
            promotions: Array.isArray(response?.promotions)
              ? response.promotions
              : [],
          };
          return normalizedResponse;
        }),
        catchError((err) => {
          console.error('Error fetching promotion performance report:', err);
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
      branchIds: payload.branchIds || [], 
      categoryIds: payload.categoryIds || [],
      includeLowStock: payload.includeLowStock || false,
      startDate: payload.startDate,
      endDate: payload.endDate,
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
          return normalizedResponse;
        }),
        catchError((err) => {
          console.error('Service: Error fetching inventory report:', err);
          return of({ inventory: [] });
        })
      );
  }

  getStockMovementReport(
    payload: StockMovementReportRequestDTO
  ): Observable<StockMovementReportDTO> {
    
    let params = new HttpParams();

    if (payload.startDate) {
        params = params.set('startDate', payload.startDate);
    }
    if (payload.endDate) {
        params = params.set('endDate', payload.endDate);
    }
    if (payload.branchIds && payload.branchIds.length > 0) {
      params = params.set('branchIds', payload.branchIds.join(','));
    }
    if (payload.productId) {
      params = params.set('productId', payload.productId.toString());
    }
    if (payload.categoryIds && payload.categoryIds.length > 0) {
      params = params.set('categoryIds', payload.categoryIds.join(','));
    }

    console.log('Service: Sending GET stock movements request with params:', params.toString());
    
    return this.http
      .get<any[]>( // Changed to any[] to allow flexible inspection
        `${this.baseUrl}/stockMovements`, 
        { params }
      )
      .pipe(
        map((response: any) => {
          console.log('Service: Raw stock movement response:', response);

          const movements: StockMovementReportItemDTO[] = Array.isArray(response)
            ? response.map((item: any) => {
                
                // --- FIX: Robust extraction of Product ID ---
                let extractedProductId: number;
                
                if (item.ingredientId) {
                    extractedProductId = item.ingredientId;
                } else if (item.inventory && item.inventory.productId) {
                    extractedProductId = item.inventory.productId;
                } else if (item.productId) {
                    extractedProductId = item.productId;
                } else if (item.product && item.product.id) {
                    extractedProductId = item.product.id; // Check nested product object
                } else if (item.inventory && item.inventory.product && item.inventory.product.id) {
                    extractedProductId = item.inventory.product.id; // Check deeply nested
                } else {
                    extractedProductId = 0; // Default to 0 to prevent undefined
                }

                return {
                    id: item.id || Math.random(), 
                    createdDate: item.createdDate || new Date().toISOString(), 
                    quantity: item.quantity || 0, 
                    reference: item.reference || null,
                    purchasePrice: item.purchasePrice || null,
                    sellingPrice: item.sellingPrice || null, 
                    
                    productName: 'N/A (Enriching...)',
                    productSku: 'N/A',
                    productCategory: 'N/A',
                    productDisplayName: 'N/A (Enriching...)',
                    categoryName: 'N/A',
                    branchName: 'N/A (Enriching...)',
                    supplierName: 'N/A',
                    
                    productId: extractedProductId,
                    // IMPORTANT: Pass inventoryId through for fallback lookup in component
                    // We cast to 'any' here if DTO interface is strict, to ensure data flows
                    inventoryId: item.inventoryId, 
                    branchId: item.inventory?.branchId || item.branchId || payload.branchIds?.[0], 
                } as any;
            })
            : [];
            
          const totalInflow = movements.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0);
          const totalOutflow = movements.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0);
          const netChange = totalInflow - totalOutflow;

          const normalizedResponse: StockMovementReportDTO = {
            movements: movements,
            totalInflow: totalInflow,
            totalOutflow: totalOutflow,
            netChange: netChange,
          };
          console.log('Service: Normalized stock movement response:', normalizedResponse);
          return normalizedResponse;
        }),
        catchError((err) => {
          console.error('Service: ERROR fetching stock movement report:', err);
          return of({
            movements: [],
            totalInflow: 0,
            totalOutflow: 0,
            netChange: 0,
          } as StockMovementReportDTO);
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

  clearCaches(): void {
    this.branchesCache = null;
    this.categoriesCache = null;
    this.allProductsCache = null;
    this.productCache.clear();
    this.branchCache.clear();
    this.categoryCache.clear();
  }

  getCurrentUserBranchId(): number | null {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.branchId && typeof user.branchId === 'number' ? user.branchId : 1; 
      } catch (e) {
        return 1; 
      }
    }
    return 1; 
  }
}