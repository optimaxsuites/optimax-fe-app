import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductData, VariantDTO } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss'],
  standalone: false
})
export class ProductDetailsComponent implements OnInit {
  product: ProductData | null = null;
  quantity: number = 1;
  selectedVariants: { [key: string]: string } = {};
  
  variantGroups: { type: string; values: string[] }[] = [];
  selectedVariantType: string = '';
  selectedVariantValue: string = '';

  constructor(
    private route: ActivatedRoute,
    private posService: PosServiceService,
    private imageCacheService: ImageCacheService,
    private storeCartService: StoreCartService // Fixed capitalization
  ) { }

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      const idNumber = parseInt(productId, 10);
      if (!isNaN(idNumber)) {
        this.loadProductDetails(idNumber);
      }
    }
  }

  loadProductDetails(productId: number): void {
    this.posService.getProductById(productId).subscribe({
      next: (product: ProductData) => {
        this.product = product;
        this.processVariants();
      },
      error: (err: any) => {
        console.error('Error loading product details:', err);
      }
    });
  }

  getProductImage(product: ProductData) {
    return this.imageCacheService.getProductImage(product);
  }

  processVariants(): void {
    if (!this.product?.variants || this.product.variants.length === 0) return;
    
    const variantMap = new Map<string, Set<string>>();
    
    this.product.variants.forEach((variant: VariantDTO) => {
      if (variant.color) {
        if (!variantMap.has('color')) {
          variantMap.set('color', new Set());
        }
        variantMap.get('color')?.add(variant.color);
      }
      
      if (variant.size && variant.size !== 'Regular') {
        if (!variantMap.has('size')) {
          variantMap.set('size', new Set());
        }
        variantMap.get('size')?.add(variant.size);
      }
    });
    
    this.variantGroups = Array.from(variantMap.entries()).map(([type, values]) => ({
      type,
      values: Array.from(values)
    }));

    if (this.variantGroups.length > 0) {
      this.selectedVariantType = this.variantGroups[0].type;
    }
  }

  selectVariant(type: string, value: string): void {
    this.selectedVariants[type] = value;
  }

  isVariantSelected(type: string, value: string): boolean {
    return this.selectedVariants[type] === value;
  }

  increaseQuantity(): void {
    if (this.product && this.quantity < (this.product.quantity || 0)) {
      this.quantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(): void {
    if (!this.product) return;
    
    const productToAdd = { ...this.product };
    
    if (Object.keys(this.selectedVariants).length > 0 && this.product.variants) {
      const matchingVariant = this.product.variants.find((variant: VariantDTO) => {
        return (
          (!this.selectedVariants['color'] || variant.color === this.selectedVariants['color']) &&
          (!this.selectedVariants['size'] || variant.size === this.selectedVariants['size'])
        );
      });
      
      // if (matchingVariant) {
      //   productToAdd.selectedVariants = [matchingVariant];
      //   if (matchingVariant.price) {
          
      //     productToAdd.sellingPrice = Number(matchingVariant.price);
      //   }
      // }
    }
    
    this.storeCartService.addToCart(productToAdd, this.quantity);
    
    this.quantity = 1;
    this.selectedVariants = {};
    
    alert('Product added to cart!');
  }

  getCategoryName(): string {
    return this.product?.productCategory?.name || 'Category';
  }
}