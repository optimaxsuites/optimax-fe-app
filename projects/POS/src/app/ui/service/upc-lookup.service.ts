import { Injectable } from '@angular/core';

export interface UpcProduct {
  title: string;
  brand: string;
  category: string;
  description?: string;
  images?: string[];
}

// 012345678905
// 123456789012
// 000000000000

@Injectable({
  providedIn: 'root'
})


export class UpcLookupService {

   private API_URL = 'https://n8n.royalvilletechnologies.com/webhook/e3c31105-48c4-4b27-aa34-078dabd85936';

  constructor() {}

  async lookup(upc: string): Promise<UpcProduct | null> {
    if (!/^\d{12,13}$/.test(upc)) return null;

    try {
      const res = await fetch(`${this.API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upc }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data[0].items?.length) {
        const item = data[0].items[0];
        return {
          title: item.title,
          brand: item.brand,
          category: item.category,
          description: item.description,
          images: item.images,
        };
      }
      return null;
    } catch (err) {
      console.error('UPC lookup failed', err);
      return null;
    }
  }
}
