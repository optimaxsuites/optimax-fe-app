// tax-helper.service.ts
import { Injectable } from '@angular/core';
import { TaxDTO } from '../models/interface';

@Injectable({
  providedIn: 'root'
})
export class TaxHelperService {
  
  /**
   * Normalize tax data from API (handles both TaxDTO and TaxDTO[] formats)
   */
  normalizeTax(taxData: any): TaxDTO | null {
    if (!taxData) return null;
    
    // If it's already a TaxDTO object
    if (typeof taxData === 'object' && !Array.isArray(taxData) && 'rate' in taxData) {
      return taxData as TaxDTO;
    }
    
    // If it's an array
    if (Array.isArray(taxData)) {
      if (taxData.length === 0) return null;
      // Use the first tax object in the array
      return taxData[0] as TaxDTO;
    }
    
    // If it's a number (legacy format)
    if (typeof taxData === 'number') {
      return {
        id: 0,
        name: `Tax ${taxData}%`,
        rate: taxData
      };
    }
    
    return null;
  }
  
  /**
   * Get effective tax rate
   */
  getTaxRate(taxData: any): number {
    const tax = this.normalizeTax(taxData);
    return tax?.rate || 0;
  }
  
  /**
   * Get tax name
   */
  getTaxName(taxData: any): string {
    const tax = this.normalizeTax(taxData);
    return tax?.name || 'Tax';
  }
  
  /**
   * Calculate tax amount
   */
  calculateTax(price: number, taxData: any): number {
    const rate = this.getTaxRate(taxData);
    return (price * rate) / 100;
  }
}