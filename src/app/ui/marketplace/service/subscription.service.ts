import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
 private _apiBaseUrl = (environment as any).apiBaseUrl;
 private planLimitsMap$ = new BehaviorSubject<any>(null);


  constructor(
    private http: HttpClient, 
    private navigationLink: NavigationLinksService, 
    private router: Router,
    private jwtHelper: JwtHelperService
  ) {  }
    createOrderRecord(order: any): Observable<any> {
      return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/sub/subscriptionOrders", order)
        .pipe(catchError(this.handleError));
    }

    getOrderRecord(): Observable<any> {
      return this.http
        .get<any>(this.getBaseApiUrl() + "/x/api/v2/sub/subscriptionOrders")
        .pipe(catchError(this.handleError));
    }

    getOrderRecordById(id: number): Observable<any> {
      return this.http
        .get<any>(this.getBaseApiUrl() + `/x/api/v2/sub/subscriptionOrders/${id}`)
        .pipe(catchError(this.handleError));
    }

    createPaymentRecord(payment: any): Observable<any> {
      return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/sub/subscriptionPayments", payment)
        .pipe(catchError(this.handleError));
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
    }  
    getPlanLimits(planId: number) {
      return this.http.get(this.getBaseApiUrl() + `/x/api/v2/sub/subscriptionPlans/${planId}`).pipe(catchError(this.handleError));;
    }
  
    loadAllModulePlanLimits() {
      return this.getOrderRecord().pipe(
        switchMap((orders: any[]) => {
          const activeOrders = orders.filter(o => o.status === 'ACTIVE');
          if (!activeOrders.length) {
            console.warn('No active subscriptions found.');
            return of({});
          }
  
          const requests = activeOrders.map(order =>
            this.getPlanLimits(order.plan.id).pipe(
              map((limitData: any) => ({
                moduleName: order.module.name,
                limits: limitData.subscriptionLimit
              }))
            )
          );
  
          return forkJoin(requests).pipe(
            tap(results => {
              const mapObj = results.reduce((acc, r) => {
                acc[r.moduleName] = r.limits;
                return acc;
              }, {} as any);
  
              this.planLimitsMap$.next(mapObj);
              localStorage.setItem('plan_limits_map', JSON.stringify(mapObj));
  
              console.log('✅ Loaded plan limits for modules:', mapObj);
            })
          );
        })
      );
    }
  
    restoreLimitsFromCache() {
      const cached = localStorage.getItem('plan_limits_map');
      if (cached) {
        this.planLimitsMap$.next(JSON.parse(cached));
      }
    }
  
    getLimitsForModule(moduleName: string) {
      const cached = localStorage.getItem('plan_limits_map');
      const mapObj = cached ? JSON.parse(cached) : this.planLimitsMap$.value;
      return mapObj?.[moduleName] || null;
    }
  
    getLimitsStream() {
      return this.planLimitsMap$.asObservable();
    }
  }