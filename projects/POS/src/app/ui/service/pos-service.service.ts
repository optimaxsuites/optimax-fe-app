import { Injectable, isDevMode } from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from "@angular/common/http";

import {
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  ShareReplayConfig,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { Router } from "@angular/router";
import { RandomTokenService } from "../sharedComponent/service/random-token/random-token.service";
import { NavigationLinksService } from "../sharedComponent/service/navigation-links/navigation-links.service";
import { environment } from "../sharedComponent/service/environments/environment";
import { ProductCategories } from "../models/enums";
import { supplierData } from "../models/interface";
import { ImageCacheService } from "./image-cache.service";
import {
  OrderGET,
  TableOrderStatusGET,
  TableOrderStatusPOST,
} from "../models/interfaces/kitchen";

@Injectable({
  providedIn: "root",
})
export class PosServiceService {
  constructor(
    private randomTokenService: RandomTokenService,
    private http: HttpClient,
    private imageCacheService: ImageCacheService,
    private router: Router,
  ) {}
  /**
   * These are the options used in `shareReplay()` to cache http requests
   */
  private shareReplayOptions: ShareReplayConfig = {
    refCount: true,
    bufferSize: 1,
  };
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  addCategory(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/productCategories", data)
      .pipe(catchError(this.handleError));
  }

  getCategories() {
    return this.http
      .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/productCategories")
      .pipe(catchError(this.handleError));
  }
  getBranches() {
    return this.http
      .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/branches")
      .pipe(catchError(this.handleError));
  }

  deleteCategory(id: number) {
    return this.http
      .delete<any>(
        this.getBaseApiUrl() + `/x/api/v2/pos/productCategories/${id}`,
      )
      .pipe(catchError(this.handleError));
  }

  deleteSupplier(id: any) {
    return this.http
      .delete<any>(this.getBaseApiUrl() + `/x/api/v2/pos/suppliers/${id}`)
      .pipe(catchError(this.handleError));
  }

  deleteTax(id: any) {
    return this.http
      .delete<any>(this.getBaseApiUrl() + `/x/api/v2/pos/taxes/${id}`)
      .pipe(catchError(this.handleError));
  }
  addProduct(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/products/product", data)
      .pipe(catchError(this.handleError));
  }

  addBranchData(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/branchDatas", data)
      .pipe(catchError(this.handleError));
  }

  addProductVariant(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/productVariants", data)
      .pipe(catchError(this.handleError));
  }

  addProductBranchData(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/productBranches", data)
      .pipe(catchError(this.handleError));
  }

  getProductBranchDataById(id: number) {
    return this.http
      .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/productBranches/${id}`)
      .pipe(catchError(this.handleError));
  }
  getBranchDataById(id: number) {
    return this.http
      .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/branchDatas/${id}`)
      .pipe(
        catchError((error) => {
          console.error(`❌ Error fetching branch data for ID ${id}:`, error);
          return of(null); // return a null fallback to avoid forkJoin breaking
        }),
      );
  }

  getVariant() {
    return this.http
      .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/productVariants`)
      .pipe(catchError(this.handleError));
  }

  getVariantsByBranchDataId(id: number) {
    return this.http
      .get<
        any[]
      >(this.getBaseApiUrl() + `/x/api/v2/pos/productVariants/getBy/${id}`)
      .pipe(
        catchError((error) => {
          console.error(
            `❌ Error fetching variants for branchDataId ${id}:`,
            error,
          );
          return of([]);
        }),
      );
  }

  private products$!: Observable<any>;
  getProducts() {
    if (!this.products$) {
      this.products$ = this.http
        .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/products")
        .pipe(
          catchError(this.handleError),
          shareReplay(this.shareReplayOptions),
        ); // For caching!
    }

    return this.products$;
  }

  getProductsByBranchId(id: number) {
    return (this.products$ = this.http
      .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/products/getBy/${id}`)
      .pipe(
        catchError(this.handleError),
        shareReplay(this.shareReplayOptions),
      ));
  }

  getProductById(id: number) {
    return this.http
      .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/products/${id}`)
      .pipe(catchError(this.handleError));
  }

  getFilteredProductsWithDetails(currentBranchId: number = 1) {
    return this.getProductsByBranchId(currentBranchId).pipe(
      switchMap((products: any[]) => {
        console.log(products);
        const enrichedProducts$ = products.map((product) => {
          const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${product?.productImages[0]?.imgNo}`;

          return forkJoin([
            this.imageCacheService.getImage(remoteImageUrl),
          ]).pipe(
            map(([imageUrl$]) => {
              return {
                ...product,
                imageUrl$,
              };
            }),
            catchError((error) => {
              console.error(
                `❌ Error enriching product ${product.name}:`,
                error,
              );
              return of({ ...product, branchDetails: [] });
            }),
          );
        });

        return forkJoin(enrichedProducts$);
      }),
      catchError((err) => {
        console.error("❌ Error fetching product details:", err);
        return of([]);
      }),
    );
  }

  deleteProductAndRelated(activeItem: any): Observable<any> {
    const variantIds = activeItem.variants
      .map((variant: any) => variant.id)
      .filter((id: any) => id);

    const deleteVariants$ = variantIds.length
      ? forkJoin(
          variantIds.map((id: any) =>
            this.http.delete<any>(
              `${this.getBaseApiUrl()}/x/api/v2/pos/productVariants/${id}`,
            ),
          ),
        ).pipe(tap(() => console.log("Deleted variants:", variantIds)))
      : of(null);
    const deleteProduct$ = this.http
      .delete<any>(
        `${this.getBaseApiUrl()}/x/api/v2/pos/products/${activeItem.id}`,
      )
      .pipe(tap(() => console.log("Deleted product with ID:", activeItem.id)));

    return deleteVariants$.pipe(switchMap(() => deleteProduct$));
  }

  deleteBranchVariantData(id: number) {
    return this.http
      .delete<any>(this.getBaseApiUrl() + `/x/api/v2/pos/productVariants/${id}`)
      .pipe(catchError(this.handleError));
  }
  updateProduct(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/products/product", data)
      .pipe(catchError(this.handleError));
  }

  deleteProduct(id: number) {
    return this.http
      .delete<any>(this.getBaseApiUrl() + `/x/api/v2/pos/products/${id}`)
      .pipe(catchError(this.handleError));
  }

  getProductImage(filename: string) {
    return this.getBaseApiUrl() + `/x/api/v2/pos/products/images/${filename}`;
  }

  getDiscountTypes() {
    return this.http
      .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/discountTypes")
      .pipe(catchError(this.handleError));
  }

  private discount$!: Observable<any>;
  getDiscount() {
    return this.http
      .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/discounts")
      .pipe(catchError(this.handleError));
  }

  addIngredient(ingredientData: any) {
    return this.http
      .post<any>(
        this.getBaseApiUrl() + "/x/api/v2/pos/ingredients",
        ingredientData,
      )
      .pipe(catchError(this.handleError));
  }
  getIngredient() {
    return this.http
      .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/ingredients")
      .pipe(catchError(this.handleError));
  }

  getSupplier() {
    return this.http
      .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/suppliers")
      .pipe(catchError(this.handleError));
  }

  getTax() {
    return this.http
      .get<any>(this.getBaseApiUrl() + "/x/api/v2/pos/taxes")
      .pipe(catchError(this.handleError));
  }

  getOrderById(id: number) {
    return this.http
      .get<OrderGET[]>(this.getBaseApiUrl() + `/x/api/v2/pos/orders/${id}`)
      .pipe(catchError(this.handleError));
  }

  getOrderByOrderNumber(id: number) {
    return this.http
      .get<any>(
        this.getBaseApiUrl() + `/x/api/v2/pos/orders/get/by/orderNumer?orderNumber=${id}`
      )
      .pipe(catchError(this.handleError));
  }


  addDiscount(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/discounts", data)
      .pipe(catchError(this.handleError));
  }

  addSupplier(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/suppliers", data)
      .pipe(catchError(this.handleError));
  }

  addTax(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/taxes", data)
      .pipe(catchError(this.handleError));
  }
  private handleError(error: HttpErrorResponse) {
    let errorMessage = "An unknown error occurred!";
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 500) {
        errorMessage =
          "Server error: " + error.error.message ||
          "Check form details and try again.";
      } else if (error.status === 404) {
        errorMessage = "Resource not found. Please try again.";
      } else if (error.status === 0) {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      } else {
        errorMessage = error.error.message || "An unexpected error occurred.";
      }
    }
    return throwError(() => errorMessage);
  }

  addTableOrderStatus(data: TableOrderStatusPOST) {
    return this.http
      .post<TableOrderStatusPOST>(
        this.getBaseApiUrl() + "/x/api/v2/pos/tableOrderStatuses",
        data,
      )
      .pipe(catchError(this.handleError));
  }
  getTableOrderStatuses() {
    return this.http
      .get<
        TableOrderStatusGET[]
      >(this.getBaseApiUrl() + "/x/api/v2/pos/tableOrderStatuses")
      .pipe(catchError(this.handleError));
  }
  getTableOrderStatusById(id: number) {
    return this.http
      .get<TableOrderStatusGET>(
        this.getBaseApiUrl() + `/x/api/v2/pos/tableOrderStatuses/${id}`,
      )
      .pipe(catchError(this.handleError));
  }
  updateTableOrderStatus(id: number, data: TableOrderStatusPOST) {
    return this.http
      .put<TableOrderStatusPOST>(
        this.getBaseApiUrl() + `/x/api/v2/pos/tableOrderStatuses/${id}`,
        data,
      )
      .pipe(catchError(this.handleError));
  }
  deleteTableOrderStatusById(id: number) {
    return this.http
      .delete<TableOrderStatusGET>(
        this.getBaseApiUrl() + `/x/api/v2/pos/tableOrderStatuses/${id}`,
      )
      .pipe(catchError(this.handleError));
  }
}
