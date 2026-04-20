// Create this file: src/app/service/price-calculation.service.ts

import { Injectable } from '@angular/core';
import { ProductData } from '../models/interface';

@Injectable({
  providedIn: 'root'
})
export class PriceCalculationService {

  constructor() { }

  /**
   * Calculates the final price including tax
   * @param product - The product data
   * @returns The price with tax included
   */
  calculatePriceWithTax(product: ProductData | any): number {
    try {
      const basePrice = this.getBasePrice(product);
      
      if (isNaN(basePrice) || basePrice === 0) {
        return 0;
      }

      const taxRate = this.getTaxRate(product);
      
      // Calculate tax amount and add to base price
      const taxAmount = (basePrice * taxRate) / 100;
      const finalPrice = basePrice + taxAmount;

      return finalPrice;
    } catch (error) {
      console.error('Error calculating price with tax:', error);
      return 0;
    }
  }

  /**
   * Formats price with tax for display
   * @param product - The product data
   * @param currency - Currency symbol (default: ₦)
   * @returns Formatted price string with currency symbol
   */
  formatPriceWithTax(product: ProductData | any, currency: string = '₦'): string {
    const priceWithTax = this.calculatePriceWithTax(product);
    return `${currency}${priceWithTax.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  /**
   * Gets the base price from product (handles different property names)
   * @param product - The product data
   * @returns Base price as a number
   */
  private getBasePrice(product: any): number {
    // Handle different possible price property names
    const priceValue = product.sellingPrice ?? product.price ?? product.unitPrice ?? 0;
    
    if (typeof priceValue === 'string') {
      return parseFloat(priceValue);
    }
    
    return Number(priceValue);
  }

  /**
   * Gets tax rate for a product
   * @param product - The product data
   * @returns Tax rate as a number (percentage)
   */
  getTaxRate(product: any): number {
    if (product.tax) {
      // Handle tax as number
      if (typeof product.tax === 'number') {
        return product.tax;
      }
      // Handle tax as object with rate property
      if (product.tax.rate) {
        return Number(product.tax.rate);
      }
    }
    return 0;
  }

  /**
   * Calculates subtotal with tax for multiple items
   * @param items - Array of products with quantities
   * @returns Total amount including tax
   */
  calculateSubtotalWithTax(items: Array<{ product: ProductData | any, quantity: number }>): number {
    return items.reduce((total, item) => {
      const priceWithTax = this.calculatePriceWithTax(item.product);
      return total + (priceWithTax * item.quantity);
    }, 0);
  }

  /**
   * Formats subtotal with tax
   * @param items - Array of products with quantities
   * @param currency - Currency symbol (default: ₦)
   * @returns Formatted subtotal string
   */
  formatSubtotalWithTax(items: Array<{ product: ProductData | any, quantity: number }>, currency: string = '₦'): string {
    const subtotal = this.calculateSubtotalWithTax(items);
    return `${currency}${subtotal.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  /**
   * Gets tax breakdown for a product
   * @param product - The product data
   * @returns Object with base price, tax amount, and total
   */
  getPriceBreakdown(product: ProductData | any): { basePrice: number, taxAmount: number, total: number, taxRate: number } {
    const basePrice = this.getBasePrice(product);
    const taxRate = this.getTaxRate(product);
    const taxAmount = (basePrice * taxRate) / 100;
    const total = basePrice + taxAmount;

    return {
      basePrice,
      taxAmount,
      total,
      taxRate
    };
  }

  /**
   * Formats a raw price value (for non-product items)
   * @param price - Raw price value
   * @param currency - Currency symbol (default: ₦)
   * @returns Formatted price string
   */
  formatPrice(price: number | string, currency: string = '₦'): string {
    const priceValue = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(priceValue)) {
      return `${currency}0.00`;
    }

    return `${currency}${priceValue.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  /**
   * Calculates discount on tax-inclusive price
   * @param product - The product data
   * @param discountPercentage - Discount percentage
   * @returns Discounted price including tax
   */
  calculateDiscountedPriceWithTax(product: ProductData | any, discountPercentage: number): number {
    const priceWithTax = this.calculatePriceWithTax(product);
    const discountAmount = (priceWithTax * discountPercentage) / 100;
    return priceWithTax - discountAmount;
  }
}