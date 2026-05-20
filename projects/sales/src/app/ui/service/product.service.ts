// src/app/products-services/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Product, ProductFilters } from '../domain/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  // TODO: Replace with your actual API endpoint
  private apiUrl = '/api/products';

  private localStorageKey = 'erp-products';
  private defaultProducts: Product[] = [
    {
      id: '1',
      sku: 'LAP-001',
      barcode: '123456789',
      name: 'MacBook Pro 14"',
      description: 'Apple M3 chip, 16GB RAM, 512GB SSD',
      categoryId: 'cat-1',
      categoryName: 'Laptops',
      brand: 'Apple',
      basePrice: 1999,
      costPrice: 1500,
      stockQuantity: 45,
      reorderLevel: 10,
      unit: 'pcs',
      status: 'ACTIVE',
      images: ['macbook-pro.jpg'],
      tags: ['laptop', 'apple', 'premium'],
      variants: [],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      sku: 'PHN-001',
      barcode: '987654321',
      name: 'Samsung Galaxy S24',
      description: '128GB, 8GB RAM, 5G',
      categoryId: 'cat-2',
      categoryName: 'Phones',
      brand: 'Samsung',
      basePrice: 999,
      costPrice: 700,
      stockQuantity: 120,
      reorderLevel: 20,
      unit: 'pcs',
      status: 'ACTIVE',
      images: ['galaxy-s24.jpg'],
      tags: ['phone', 'samsung', '5g'],
      variants: [],
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-10')
    },
    {
      id: '3',
      sku: 'MNT-001',
      barcode: '456789123',
      name: 'Dell UltraSharp 27"',
      description: '4K Monitor, USB-C Hub',
      categoryId: 'cat-3',
      categoryName: 'Monitors',
      brand: 'Dell',
      basePrice: 650,
      costPrice: 450,
      stockQuantity: 8,
      reorderLevel: 5,
      unit: 'pcs',
      status: 'ACTIVE',
      images: ['dell-monitor.jpg'],
      tags: ['monitor', '4k', 'dell'],
      variants: [],
      createdAt: new Date('2024-03-05'),
      updatedAt: new Date('2024-03-05')
    },
    {
      id: '4',
      sku: 'KEY-001',
      barcode: '321654987',
      name: 'Logitech MX Keys',
      description: 'Wireless Keyboard, Backlit',
      categoryId: 'cat-4',
      categoryName: 'Accessories',
      brand: 'Logitech',
      basePrice: 120,
      costPrice: 80,
      stockQuantity: 0,
      reorderLevel: 3,
      unit: 'pcs',
      status: 'ACTIVE',
      images: ['mx-keys.jpg'],
      tags: ['keyboard', 'wireless', 'logitech'],
      variants: [],
      createdAt: new Date('2024-03-20'),
      updatedAt: new Date('2024-03-20')
    }
  ];
  private products: Product[] = [];

  constructor(private http: HttpClient) {
    this.products = this.loadProductsFromStorage();
  }

  private loadProductsFromStorage(): Product[] {
    const data = localStorage.getItem(this.localStorageKey);
    if (data) {
      // Dates are stored as strings, convert them back
      return JSON.parse(data).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }));
    }
    // If nothing in storage, seed with defaults
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.defaultProducts));
    return [...this.defaultProducts];
  }

  private saveProductsToStorage(): void {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.products));
  }

  // (Removed duplicate constructor)

  // Get all products with optional filters
  getProducts(filters?: ProductFilters): Observable<Product[]> {
    let result = [...this.products];
    // Apply filters if provided
    if (filters) {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(p =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          (p.brand && p.brand.toLowerCase().includes(search))
        );
      }
      if (filters.categoryId) {
        result = result.filter(p => p.categoryId === filters.categoryId);
      }
      if (filters.status) {
        result = result.filter(p => p.status === filters.status);
      }
      if (filters.inStock) {
        result = result.filter(p => p.stockQuantity > 0);
      }
    }
    return of(result);
  }

  // Get single product by ID
  getProduct(id: string): Observable<Product> {
    const product = this.products.find(p => p.id === id);
    return of(product!);
  }

  // Create new product
  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Observable<Product> {
    const newProduct: Product = {
      ...product,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.unshift(newProduct);
    this.saveProductsToStorage();
    return of(newProduct);
  }

  // Update existing product
  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    const index = this.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.products[index] = {
        ...this.products[index],
        ...product,
        updatedAt: new Date()
      };
      this.saveProductsToStorage();
      return of(this.products[index]);
    }
    return of(undefined as any);
  }

  // Delete product
  deleteProduct(id: string): Observable<void> {
    this.products = this.products.filter(p => p.id !== id);
    this.saveProductsToStorage();
    return of(void 0);
  }
}