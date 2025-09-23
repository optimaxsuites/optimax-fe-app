import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ProductData, VariantDTO } from '../../../models/interface';
import { ImageCacheService } from '../../../service/image-cache.service';
import { PosServiceService } from '../../../service/pos-service.service';
import { StoreCartService } from '../../../service/store-cart.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})
export class ProductDetailsComponent implements OnInit {
  // Signals
  product = signal<ProductData | null>(null);
  isLoading = signal(true);
  quantity = signal(1);
  storeUuid = '';

  // Related products
  relatedProducts = signal<ProductData[]>([]);

  // Header data
  branches: any[] = [];
  user = signal({ name: 'Guest', isGuest: true });
  selectedCategory = signal('All');
  searchText = signal('');
  
  // Computed values for header
  categoryOptions = computed(() => [{ label: 'All', value: 'All' }]);
  isCartEmpty = computed(() => true);
  getTotalCartItems = computed(() => 0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: PosServiceService,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService
  ) {}

  ngOnInit(): void {
    this.storeUuid = this.route.snapshot.paramMap.get('uuid') || '';
    const productId = this.route.snapshot.paramMap.get('id');
    
    if (productId) {
      this.loadProductDetails(parseInt(productId));
    } else {
      this.isLoading.set(false);
    }
  }

  // Helper methods for template safety
  getSellingPrice(): number {
    const product = this.product();
    if (!product || !product.sellingPrice) return 0;
    
    // Convert string to number if necessary
    return typeof product.sellingPrice === 'string' 
      ? parseFloat(product.sellingPrice) 
      : product.sellingPrice;
  }

  getCostPrice(): number {
    const product = this.product();
    if (!product || !product.costPrice) return 0;
    
    return typeof product.costPrice === 'string' 
      ? parseFloat(product.costPrice) 
      : product.costPrice;
  }

  hasDiscount(): boolean {
    const product = this.product();
    if (!product || !product.costPrice || !product.sellingPrice) return false;
    
    const costPrice = this.getCostPrice();
    const sellingPrice = this.getSellingPrice();
    
    return sellingPrice < costPrice;
  }

  isInStock(): boolean {
    const product = this.product();
    return !!(product?.quantity && product.quantity > 0);
  }

  getAvailableQuantity(): number {
    const product = this.product();
    return product?.quantity || 0;
  }

  hasVariants(): boolean {
    const product = this.product();
    return !!(product?.variants && product.variants.length > 0);
  }

  getVariants(): VariantDTO[] {
    const product = this.product();
    return product?.variants || [];
  }

  canIncreaseQuantity(): boolean {
    const currentQuantity = this.quantity();
    const maxQuantity = this.getAvailableQuantity();
    return currentQuantity < maxQuantity;
  }

  calculateTotalPrice(): number {
    return this.getSellingPrice() * this.quantity();
  }

  private loadProductDetails(productId: number): void {
    this.isLoading.set(true);
    
    this.posService.getProducts().subscribe({
      next: (products: ProductData[]) => {
        const foundProduct = products.find((p: ProductData) => p.id === productId);
        this.product.set(foundProduct || null);
        
        if (foundProduct) {
          this.loadRelatedProducts(foundProduct);
        }
        
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading product details:', error);
        this.isLoading.set(false);
      }
    });
  }

  private loadRelatedProducts(currentProduct: ProductData): void {
    this.posService.getProducts().subscribe({
      next: (products: ProductData[]) => {
        const related = products.filter((p: ProductData) => 
          p.id !== currentProduct.id && 
          p.productCategory.id === currentProduct.productCategory.id
        ).slice(0, 4);
        
        this.relatedProducts.set(related);
      },
      error: (error: any) => {
        console.error('Error loading related products:', error);
      }
    });
  }

  // Image handling
  getProductImage(product: ProductData, specificImage?: any) {
    return this.imageCacheService.getProductImage(product);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

  // Quantity management
  increaseQuantity(): void {
    if (this.canIncreaseQuantity()) {
      this.quantity.set(this.quantity() + 1);
    }
  }

  decreaseQuantity(): void {
    const currentQuantity = this.quantity();
    if (currentQuantity > 1) {
      this.quantity.set(currentQuantity - 1);
    }
  }

  // Cart functionality
  addToCart(product?: ProductData): void {
    const productToAdd = product || this.product();
    if (!productToAdd || !this.isInStock()) return;

    // Add to cart logic here
    for (let i = 0; i < this.quantity(); i++) {
      // this.cartService.addToCart(productToAdd);
    }

    this.quantity.set(1);
    this.showAddToCartFeedback();
  }

  addVariantToCart(variant: VariantDTO): void {
    const product = this.product();
    if (!product || variant.quantity === 0) return;

    // this.cartService.addToCart(product, variant);
    this.showAddToCartFeedback();
  }

  private showAddToCartFeedback(): void {
    console.log('Product added to cart');
  }

  // Navigation
  navigateToProductDetails(productId: number): void {
    this.router.navigate(['/user/checkout/pos-store', this.storeUuid, 'product-details', productId]);
  }

  // Header event handlers
  changeCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  changeSearchInput(text: string): void {
    this.searchText.set(text);
  }

  toggleCart(): void {
    // Implement cart toggle logic
  }

  changeBranch(branch: any): void {
    // Implement branch change logic
  }
}