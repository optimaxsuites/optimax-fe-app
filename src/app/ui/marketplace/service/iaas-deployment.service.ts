import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class IaasDeploymentService {
  private base = (environment as any).apiBaseUrl;

  constructor(private http: HttpClient) {}

  private url(path: string): string {
    return this.base + path;
  }

  getProviders(): Observable<any[]> {
    return this.http.get<any[]>(this.url('/x/api/v2/iaas/providers'));
  }

  getPlans(): Observable<any[]> {
    return this.http.get<any[]>(this.url('/x/api/v2/iaas/plans'));
  }

  getOptions(
    providerId: number,
    planId: number,
    deploymentMode: string,
    regionCode: string,
    billingCountryCode?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('providerId', providerId.toString())
      .set('planId', planId.toString())
      .set('deploymentMode', deploymentMode)
      .set('regionCode', regionCode);
    if (billingCountryCode) {
      params = params.set('billingCountryCode', billingCountryCode);
    }
    return this.http.get<any>(
      this.url('/x/api/v2/iaas/application-deployments/options'),
      { params }
    );
  }

  createOrder(dto: any): Observable<any> {
    return this.http.post<any>(
      this.url('/x/api/v2/iaas/application-deployments/orders'),
      dto
    );
  }

  confirmPayment(id: number, paymentReference: string): Observable<any> {
    return this.http.post<any>(
      this.url(`/x/api/v2/iaas/application-deployments/orders/${id}/confirm-payment`),
      { paymentReference }
    );
  }

  provision(id: number): Observable<any> {
    return this.http.post<any>(
      this.url(`/x/api/v2/iaas/application-deployments/orders/${id}/provision`),
      {}
    );
  }

  getOrder(id: number): Observable<any> {
    return this.http.get<any>(
      this.url(`/x/api/v2/iaas/application-deployments/orders/${id}`)
    );
  }

  getSmokeChecks(id: number): Observable<any[]> {
    return this.http.get<any[]>(
      this.url(`/x/api/v2/iaas/application-deployments/orders/${id}/smoke-checks`)
    );
  }
}
