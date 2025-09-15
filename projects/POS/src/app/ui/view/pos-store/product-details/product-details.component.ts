import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductData, VariantDTO } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { StoreHeaderComponent } from '../store-header/store-header.component';

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
  storeUuid: string = '';
  cartItemCount: number = 0;
  isCartEmpty: boolean = true;
  
  variantGroups: { type: string; values: string[] }[] = [];
  selectedVariantType: string = '';
  selectedVariantValue: string = '';

  // Image gallery
  mainImage: string = '';
  thumbnailImages: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: PosServiceService,
    private imageCacheService: ImageCacheService,
    private storeCartService: StoreCartService
  ) { }

  ngOnInit(): void {
    // Get store UUID from parent route
    this.storeUuid = this.route.parent?.snapshot.params['uuid'] || '';
    
    // Get product ID from current route
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      const idNumber = parseInt(productId, 10);
      if (!isNaN(idNumber)) {
        this.loadProductDetails(idNumber);
      }
    }

    // Subscribe to cart changes
    this.storeCartService.cartItems$.subscribe(items => {
      this.cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
      this.isCartEmpty = this.cartItemCount === 0;
    });
  }

  loadProductDetails(productId: number): void {
    this.posService.getProductById(productId).subscribe({
      next: (product: ProductData) => {
        this.product = product;
        this.processVariants();
        this.loadImages();
      },
      error: (err: any) => {
        console.error('Error loading product details:', err);
      }
    });
  }

  loadImages(): void {
    if (!this.product) return;
    
    this.imageCacheService.getProductImage(this.product).subscribe(imageUrl => {
      this.mainImage = imageUrl;
      this.thumbnailImages = [imageUrl]; // You can add more thumbnails if available
    });
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
      
      if (matchingVariant) {
        productToAdd.selectedVariants = [matchingVariant];
      }
    }
    
    this.storeCartService.addToCart(productToAdd, this.quantity);
    
    // Show success message
    this.showSuccessMessage('Product added to cart!');
  }

  showSuccessMessage(message: string): void {
    // You can implement a toast notification here
    alert(message);
  }

  goBack(): void {
    this.router.navigate(['/store', this.storeUuid]);
  }

  getCategoryName(): string {
    return this.product?.productCategory?.name || 'Products';
  }

  onToggleCart(): void {
    // Handle cart toggle if needed
    console.log('Cart toggled');
  }

  onToggleMenu(): void {
    // Handle menu toggle if needed
    console.log('Menu toggled');
  }

  changeImage(imageUrl: string): void {
    this.mainImage = imageUrl;
  }

  getCurrentPrice(): number {
    if (!this.product) return 0;
    
    // If variants are selected, use variant price, otherwise use product price
    if (Object.keys(this.selectedVariants).length > 0 && this.product.variants) {
      const matchingVariant = this.product.variants.find((variant: VariantDTO) => {
        return (
          (!this.selectedVariants['color'] || variant.color === this.selectedVariants['color']) &&
          (!this.selectedVariants['size'] || variant.size === this.selectedVariants['size'])
        );
      });
      
      if (matchingVariant && matchingVariant.price) {
        return Number(matchingVariant.price);
      }
    }
    
    return Number(this.product.sellingPrice);
  }
}