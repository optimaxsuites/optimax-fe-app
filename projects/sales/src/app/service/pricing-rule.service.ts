import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PricingRule } from '../domain/pricing-rule.model';

@Injectable({
  providedIn: 'root'
})
export class PricingRuleService {
  private rules: PricingRule[] = [];

  getPricingRules(): Observable<PricingRule[]> {
    return of(this.rules);
  }

  getPricingRule(id: string): Observable<PricingRule | undefined> {
    return of(this.rules.find(r => r.id === id));
  }

  createPricingRule(rule: PricingRule): Observable<PricingRule> {
    this.rules.push(rule);
    return of(rule);
  }

  updatePricingRule(id: string, rule: Partial<PricingRule>): Observable<PricingRule | undefined> {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx > -1) {
      this.rules[idx] = { ...this.rules[idx], ...rule };
      return of(this.rules[idx]);
    }
    return of(undefined);
  }

  deletePricingRule(id: string): Observable<void> {
    this.rules = this.rules.filter(r => r.id !== id);
    return of();
  }
}
