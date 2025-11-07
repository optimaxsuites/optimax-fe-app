// paystack.service.ts
import { Injectable } from '@angular/core';

declare var PaystackPop: any;

@Injectable({
  providedIn: 'root'
})
export class PaystackService {
  private publicKey: string | null = null;

  constructor() {
    this.loadPaystack();
  }

  private loadPaystack(): void {
    // Paystack is loaded via CDN in index.html
    if (typeof PaystackPop === 'undefined') {
      console.warn('Paystack CDN not loaded yet');
    }
  }

  // Set public key dynamically
  setPublicKey(publicKey: string): void {
    this.publicKey = publicKey;
    console.log('🔑 Paystack public key set:', publicKey.substring(0, 20) + '...');
  }

  // Process Paystack payment using CDN
  async processPayment(paymentData: PaystackPaymentData): Promise<PaystackResponse> {
    return new Promise((resolve, reject) => {
      // Wait for Paystack to be available
      if (typeof PaystackPop === 'undefined') {
        reject({
          success: false,
          message: 'Payment service not available. Please refresh the page.'
        });
        return;
      }

      // Check if public key is set
      if (!this.publicKey) {
        reject({
          success: false,
          message: 'Payment configuration error. Please try another payment method.'
        });
        return;
      }

      const handler = PaystackPop.setup({
        key: this.publicKey,
        email: paymentData.email,
        amount: paymentData.amount, // Already in kobo from StoreOrderService
        currency: 'NGN',
        ref: paymentData.reference,
        metadata: paymentData.metadata,
        callback: (response: any) => {
          console.log('Paystack callback success:', response);
          resolve({
            success: true,
            reference: response.reference,
            transaction: response,
            message: 'Payment successful'
          });
        },
        onClose: () => {
          console.log('Paystack payment window closed');
          reject({
            success: false,
            message: 'Payment cancelled by user'
          });
        }
      });

      handler.openIframe();
    });
  }

  // Generate unique reference
  generateReference(): string {
    return `STORE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface PaystackPaymentData {
  email: string;
  amount: number;
  reference: string;
  metadata?: {
    custom_fields: Array<{
      display_name: string;
      variable_name: string;
      value: any;
    }>;
  };
}

export interface PaystackResponse {
  success: boolean;
  reference: string;
  transaction?: any;
  message: string;
}