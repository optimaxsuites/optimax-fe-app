import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
   private tenantsSubject = new BehaviorSubject<any[]>([]);
  tenants$ = this.tenantsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

    constructor(
      private http: HttpClient, 
      private navigationLink: NavigationLinksService, 
      private router: Router,
      private jwtHelper: JwtHelperService
    ) {  }
  
  
  
    getAllTenants(): Observable<any> {
      return this.http
          .get<any>(this.getBaseApiUrl() + "/x/api/v2/us/ur/findAllTenants")
          .pipe(catchError(this.handleError));
    }
  
    getAllTenantSubscriptionHistory(domain: string): Observable<any> {
      return this.http
          .get<any>(this.getBaseApiUrl() + `/x/api/v2/sub/subscriptionOrders/get/tenant/subscription/history/${domain}`)
          .pipe(catchError(this.handleError));
    }

    getModuleByID(id: number): Observable<any> {
      return this.http
          .get<any>(this.getBaseApiUrl() + `/x/api/v2/sub/subscriptionModules/${id}`)
          .pipe(catchError(this.handleError));
    }

    getPlanByID(id: number): Observable<any> {
      return this.http
          .get<any>(this.getBaseApiUrl() + `/x/api/v2/sub/subscriptionPlans/${id}`)
          .pipe(catchError(this.handleError));
    }
  

    getFullTenant(domain: string) {
      return this.getAllTenantSubscriptionHistory(domain).pipe(
        switchMap((tenant) => {
          const history = tenant.subscriptionHistory || [];

          if (history.length === 0) return [tenant];

          // Build module + plan requests for every subscription row
          const enrichedHistory$ = forkJoin(
            history.map((item: { moduleId: number; planId: number; }) =>
              forkJoin({
                module: this.getModuleByID(item.moduleId),
                plan: this.getPlanByID(item.planId)
              }).pipe(
                map(result => ({
                  ...item,
                  module: result.module,
                  plan: result.plan
                }))
              )
            )
          );

          return enrichedHistory$.pipe(
            map(enrichedHistory => ({
              ...tenant,
              subscriptionHistory: enrichedHistory
            }))
          );
        })
      );
    }

    getAllTenantsFull() {
      return this.getAllTenants().pipe(
        switchMap((tenants) => {
          const validTenants = tenants.filter((t: { domain: any; }) => !!t.domain); 

          return forkJoin(
            validTenants.map((t: { domain: string; }) => this.getFullTenant(t.domain))
          );
        })
      );
    }

    deleteTenant(domain: number) {
        return this.http
          .delete<any>(this.getBaseApiUrl() + `/x/api/v2/us/tenant/${domain}`)
          .pipe(catchError(this.handleError));
    }



  loadFullTenants(): any  {
    const token = sessionStorage.getItem("Token");
    if (!token) {
      console.warn("⛔ No token found. Skipping metadata fetch.");
      return Promise.resolve(true);
    }
    
    this.loadingSubject.next(true);

    this.getAllTenantsFull()
      .subscribe({
        next: (result: any) => {
          // Remove nulls
          const clean = result.filter((x: any) => x);
          this.tenantsSubject.next(clean);
        },
        complete: () => {
          this.loadingSubject.next(false);
        }
      });
  }



   private getBaseApiUrl(): string {
      return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
    }
    
    private handleError(error: HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
          console.error("An error occurred:", error.error.message);
      } else {
          console.error(
              `Backend returned code ${error.status}, ` +
                  `body was: ${JSON.stringify(error.error)}`
          );
      }
      return throwError(`${error.status}`);
      // 'Something bad happened; please try again later.');
    }

    removeTenantFromState(tenantId: number | undefined) {
      const currentTenant = this.tenantsSubject.value;
      const updatedTenant = currentTenant.filter(c => c.id !== tenantId);
      this.tenantsSubject.next(updatedTenant);
    }
}
