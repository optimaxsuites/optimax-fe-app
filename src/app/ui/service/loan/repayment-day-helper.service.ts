import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RepaymentDayHelperService {
  
  getMaxDaysInMonth(year: number, month: number): number {
    // month is 0-indexed (0 = January)
    return new Date(year, month + 1, 0).getDate();
  }

  getValidRepaymentDays(year: number, month: number): number[] {
    const maxDays = this.getMaxDaysInMonth(year, month);
    return Array.from({ length: maxDays }, (_, i) => i + 1);
  }

  suggestRepaymentDay(startDate: Date): number {
    // Suggest the day of the month from the start date, or 15th if start date is after 28th
    const day = startDate.getDate();
    if (day > 28) {
      return 28;
    }
    return day;
  }

  validateRepaymentDay(day: number, year: number, month: number): boolean {
    const maxDays = this.getMaxDaysInMonth(year, month);
    return day >= 1 && day <= maxDays;
  }

  getNextDueDate(startDate: Date, repaymentDay: number, installmentNumber: number): Date {
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + installmentNumber);
    
    // Set the repayment day, handling month boundaries
    const maxDay = this.getMaxDaysInMonth(dueDate.getFullYear(), dueDate.getMonth());
    dueDate.setDate(Math.min(repaymentDay, maxDay));
    
    return dueDate;
  }
}