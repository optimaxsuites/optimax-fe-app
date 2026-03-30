import { Injectable } from '@angular/core';

export interface SubscriptionLimit {
  users: number;
  roles: number;
  branches: number;
  ecommerce: boolean;
  customizedEcommerce: boolean;
  loyaltyProgram: boolean;
  report: boolean;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  subscriptionLimit: SubscriptionLimit[];
}

@Injectable({
  providedIn: 'root'
})
export class TierService {

  constructor() { }
  private activePlan?: SubscriptionPlan;

  setActivePlan(plan: SubscriptionPlan) {
    this.activePlan = plan;
  }

  hasFeature(feature: keyof SubscriptionLimit): boolean {
    if (!this.activePlan) return false;
    const limits = this.activePlan.subscriptionLimit[0];
    return Boolean((limits as any)[feature]);
  }

  getLimit(limitKey: keyof SubscriptionLimit): number | null {
    if (!this.activePlan) return null;
    const limits = this.activePlan.subscriptionLimit[0];
    return (limits as any)[limitKey] ?? null;
  }

  withinLimit(limitKey: keyof SubscriptionLimit, current: number): boolean {
    const max = this.getLimit(limitKey);
    if (typeof max !== 'number') return true;
    return current < max;
  }

}
