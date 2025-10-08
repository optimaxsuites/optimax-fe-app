// product-details.component.ts - UPDATED VERSION
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
  
  // Cart visibility signals - CHANGED TO MATCH POS-STORE
  isCartOpen = false; // For mobile modal
  isCartSidebarVisible = false; // For desktop sidebar
  
  // Image gallery signals
  selectedImageIndex = signal(0);
  isImageModalOpen = signal(false);
  
  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');
  
  // Cart signals
  cartProducts = computed(() => this.cartService.cart().items);
  isCartEmpty = computed(() => this.cartService.isCartEmpty());
  totalCartItems = computed(() => this.cartService.totalItems());

  // Related products
  relatedProducts = signal<ProductData[]>([]);

  // Header data
  branches: any[] = [];
  user = signal({ name: 'Guest', isGuest: true });
  selectedCategory = signal('All');
  searchText = signal('');
  
  // Computed values
  categoryOptions = computed(() => [{ label: 'All', value: 'All' }]);
  
  // Computed for current selected image
  currentImage = computed(() => {
    const product = this.product();
    const index = this.selectedImageIndex();
    
    if (!product || !product.productImages || product.productImages.length === 0) {
      return null;
    }
    
    return product.productImages[index] || product.productImages[0];
  });
  
  // Computed for all product images
  allImages = computed(() => {
    const product = this.product();
    return product?.productImages || [];
  });
  
  hasMultipleImages = computed(() => {
    return this.allImages().length > 1;
  });

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

  // Image Gallery Methods
  selectImage(index: number): void {
    const images = this.allImages();
    if (index >= 0 && index < images.length) {
      this.selectedImageIndex.set(index);
    }
  }

  nextImage(): void {
    const images = this.allImages();
    const currentIndex = this.selectedImageIndex();
    const nextIndex = (currentIndex + 1) % images.length;
    this.selectedImageIndex.set(nextIndex);
  }

  previousImage(): void {
    const images = this.allImages();
    const currentIndex = this.selectedImageIndex();
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    this.selectedImageIndex.set(prevIndex);
  }

  openImageModal(): void {
    this.isImageModalOpen.set(true);
  }

  closeImageModal(): void {
    this.isImageModalOpen.set(false);
  }

  // Handle keyboard navigation in modal
  handleModalKeyPress(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      this.nextImage();
    } else if (event.key === 'ArrowLeft') {
      this.previousImage();
    } else if (event.key === 'Escape') {
      this.closeImageModal();
    }
  }

  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  getCartSubtotal(): number {
    return this.cartService.cart().subtotal;
  }

  // Cart methods 
  toggleCart(): void {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  // Add to cart with automatic sidebar on desktop and toast on mobile
  addToCart(product?: ProductData): void {
    const productToAdd = product || this.product();
    if (!productToAdd || !this.isInStock()) return;

    for (let i = 0; i < this.quantity(); i++) {
      this.cartService.addToCart(productToAdd);
    }
    
    this.quantity.set(1);
    
    //  Show sidebar on desktop, toast on mobile
    if (window.innerWidth >= 768) {
      // Desktop - automatically show sidebar (like pos-store)
      this.isCartSidebarVisible = true;
    } else {
      //show toast notification instead of automatically opening modal
      this.showToastMessage(`added to cart successfully!`);
    }
  }

  // UPDATED: Add variant to cart with same behavior
  addVariantToCart(variant: VariantDTO): void {
    const product = this.product();
    if (!product || variant.quantity === 0) return;

    for (let i = 0; i < this.quantity(); i++) {
      this.cartService.addToCart(product, variant);
    }
    
    this.quantity.set(1);
    
    // CHANGED: Show sidebar on desktop, toast on mobile
    if (window.innerWidth >= 768) {
      // Desktop - automatically show sidebar
      this.isCartSidebarVisible = true;
    } else {
      // Mobile - show toast notification
      this.showToastMessage(`${product.name} (${variant.name}) added to cart successfully!`);
    }
  }

  // UPDATED: Add related product to cart
  addRelatedToCart(relatedProduct: ProductData): void {
    this.cartService.addToCart(relatedProduct);
    
    // CHANGED: Show sidebar on desktop, toast on mobile
    if (window.innerWidth >= 768) {
      // Desktop - automatically show sidebar
      this.isCartSidebarVisible = true;
    } else {
      // Mobile - show toast notification
      this.showToastMessage(`${relatedProduct.name} added to cart successfully!`);
    }
  }

  // NEW: Show toast message method
  private showToastMessage(message: string): void {
    this.toastMessage.set(message);
    this.showToast.set(true);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  reduceQuantityInCart(product: ProductData): void {
    const idToUse = product.selectedVariants?.[0] 
      ? `${product.id}-${product.selectedVariants[0].id}` 
      : product.id.toString();
    
    const currentQuantity = this.cartProducts().get(idToUse)?.quantity || 0;
    this.cartService.updateQuantity(product, currentQuantity - 1, product.selectedVariants?.[0]);
  }

  removeFromCart(product: ProductData): void {
    this.cartService.removeFromCart(product, product.selectedVariants?.[0]);
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.isCartOpen = false;
    this.isCartSidebarVisible = false;
  }

  navigateToCheckout(): void {
    this.isCartOpen = false;
    this.isCartSidebarVisible = false;
    this.router.navigate(['/store', this.storeUuid, 'checkout']);
  }

  // Helper methods
  getSellingPrice(): number {
    const product = this.product();
    if (!product || !product.sellingPrice) return 0;
    
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
    // Reset image selection when loading new product
    this.selectedImageIndex.set(0);
    
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
    // If a specific image is provided, create a modified product object with that image
    if (specificImage && product.productImages) {
      const modifiedProduct = {
        ...product,
        productImages: [specificImage]
      };
      return this.imageCacheService.getProductImage(modifiedProduct);
    }
    
    // If we need a specific image by index, modify the product
    if (specificImage === undefined && this.selectedImageIndex() > 0 && product.productImages) {
      const modifiedProduct = {
        ...product,
        productImages: [product.productImages[this.selectedImageIndex()]]
      };
      return this.imageCacheService.getProductImage(modifiedProduct);
    }
    
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

  // Navigation
  navigateToRelatedProduct(productId: number): void {
    this.router.navigate(['/user/checkout/store', this.storeUuid, 'product-details', productId]);
  }

  navigateToProductDetails(productId: number): void {
  this.router.navigate(['/user/checkout/store', this.storeUuid, 'product-details', productId]);
}


  // Header event handlers
  changeCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  changeSearchInput(text: string): void {
    this.searchText.set(text);
  }

  changeBranch(branch: any): void {
    console.log('Branch changed to:', branch);
  }
}