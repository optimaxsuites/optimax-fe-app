/**
 * Nigerian Banks Service
 * Provides a list of Nigerian banks for use in dropdown selections
 */
import { Injectable } from '@angular/core';

export interface NigerianBank {
  code: string;
  name: string;
  abbreviation?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NigerianBanksService {
  
  private banks: NigerianBank[] = [
    { code: '044', name: 'Access Bank', abbreviation: 'ACCESS' },
    { code: '023', name: 'Citibank Nigeria', abbreviation: 'CITI' },
    { code: '050', name: 'EcoBank Nigeria', abbreviation: 'ECOBANK' },
    { code: '070', name: 'Fidelity Bank', abbreviation: 'FIDELITY' },
    { code: '011', name: 'First Bank', abbreviation: 'FIRSTBANK' },
    { code: '058', name: 'Guaranty Trust Bank', abbreviation: 'GTB' },
    { code: '030', name: 'Heritage Bank', abbreviation: 'HERITAGE' },
    { code: '999', name: 'Keystone Bank', abbreviation: 'KEYSTONE' },
    { code: '090', name: 'Polaris Bank', abbreviation: 'POLARIS' },
    { code: '101', name: 'Providus Bank', abbreviation: 'PROVIDUS' },
    { code: '075', name: 'Rand Merchant Bank', abbreviation: 'RMB' },
    { code: '076', name: 'Stanbic IBTC Bank', abbreviation: 'STANBIC' },
    { code: '002', name: 'Standard Chartered Bank', abbreviation: 'STANCHART' },
    { code: '039', name: 'Stanbic Mortgage Bank', abbreviation: 'STANBICMB' },
    { code: '037', name: 'Standard Trust Bank', abbreviation: 'STB' },
    { code: '221', name: 'Sterling Bank', abbreviation: 'STERLING' },
    { code: '100', name: 'Suntrust Bank', abbreviation: 'SUNTRUST' },
    { code: '032', name: 'Union Bank', abbreviation: 'UNIONBANK' },
    { code: '033', name: 'United Bank for Africa', abbreviation: 'UBA' },
    { code: '215', name: 'Unity Bank', abbreviation: 'UNITY' },
    { code: '035', name: 'Wema Bank', abbreviation: 'WEMA' },
    { code: '057', name: 'Zenith Bank', abbreviation: 'ZENITHBANK' }
  ];

  constructor() { }

  /**
   * Get all available Nigerian banks
   */
  getBanks(): NigerianBank[] {
    return this.banks;
  }

  /**
   * Get bank by code
   */
  getBankByCode(code: string): NigerianBank | undefined {
    return this.banks.find(bank => bank.code === code);
  }

  /**
   * Get bank by name
   */
  getBankByName(name: string): NigerianBank | undefined {
    return this.banks.find(bank => bank.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Search banks by partial name match
   */
  searchBanks(query: string): NigerianBank[] {
    const lowerQuery = query.toLowerCase();
    return this.banks.filter(bank =>
      bank.name.toLowerCase().includes(lowerQuery) ||
      (bank.abbreviation?.toLowerCase() || '').includes(lowerQuery)
    );
  }

  /**
   * Validate account number format for Nigerian banks
   * Most Nigerian bank accounts are 10 digits
   */
  validateAccountNumber(accountNumber: string): boolean {
    // Remove spaces
    const cleaned = accountNumber.trim();
    // Nigerian accounts are typically 10 digits
    return /^\d{10}$/.test(cleaned);
  }
}
