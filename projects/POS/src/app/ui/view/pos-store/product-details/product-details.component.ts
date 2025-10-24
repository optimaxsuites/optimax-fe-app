// product-details.component.ts - CORRECTED VERSION
import { Component, OnInit, signal, computed, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

import { ProductData, VariantDTO, ProductImageDTO } from '../../../models/interface';
import { ImageCacheService } from '../../../service/image-cache.service';
import { PosServiceService } from '../../../service/pos-service.service';
import { StoreCartService } from '../../../service/store-cart.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  // Signals
  product = signal<ProductData | null>(null);
  isLoading = signal(true);
  quantity = signal(1);
  storeUuid = '';
  
  // Cart visibility signals
  isCartOpen = false;
  isCartSidebarVisible = false;
  
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

  // Related products with pagination
  relatedProducts = signal<ProductData[]>([]);
  currentRelatedPage = signal(1);
  relatedItemsPerPage = signal(4);
  totalRelatedPages = signal(1);

  // Scroll to top
  showScrollToTop = signal(false);
  
  // Header data
  branches: any[] = [];
  user = signal({ name: 'Guest', isGuest: true });
  selectedCategory = signal('All');
  searchText = signal('');
  
  // Computed values
  categoryOptions = computed(() => [{ label: 'All', value: 'All' }]);
  
  // Computed for current selected image - FIXED: No longer affects related products
currentImage = computed((): ProductImageDTO | undefined => {
  const product = this.product();
  const index = this.selectedImageIndex();
  
  if (!product || !product.productImages || product.productImages.length === 0) {
    return undefined;
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

  // Computed for paginated related products
  paginatedRelatedProducts = computed(() => {
    const related = this.relatedProducts();
    const startIndex = (this.currentRelatedPage() - 1) * this.relatedItemsPerPage();
    const endIndex = startIndex + this.relatedItemsPerPage();
    return related.slice(startIndex, endIndex);
  });

  @ViewChild('mainContent') mainContent!: ElementRef;

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
    
    // Add scroll listener for scroll-to-top button
    this.addScrollListener();
    
    if (productId) {
      this.loadProductDetails(parseInt(productId));
    } else {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    // Clean up scroll listener
    window.removeEventListener('scroll', this.onScroll.bind(this));
  }

  // FIXED: Image selection no longer affects related products
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

  // Scroll to top functionality
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private addScrollListener(): void {
    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  private onScroll(): void {
    this.showScrollToTop.set(window.scrollY > 300);
  }

  // FIXED: Related products navigation
  navigateToRelatedProduct(productId: number): void {
    this.router.navigate(['/user/checkout/store', this.storeUuid, 'product-details', productId])
      .then(() => {
        // Reload the page to show new product details
        window.location.reload();
      });
  }

  // Alternative method that preserves scroll position
  navigateToProductDetails(productId: number): void {
    this.router.navigate(['/user/checkout/store', this.storeUuid, 'product-details', productId])
      .then(success => {
        if (success) {
          // Reset component state for new product
          this.product.set(null);
          this.isLoading.set(true);
          this.selectedImageIndex.set(0);
          this.quantity.set(1);
          
          // Load new product details
          this.loadProductDetails(productId);
          
          // Scroll to top after a brief delay
          setTimeout(() => {
            window.scrollTo(0, 0);
          }, 100);
        }
      });
  }

  // Related products pagination
  nextRelatedPage(): void {
    if (this.currentRelatedPage() < this.totalRelatedPages()) {
      this.currentRelatedPage.set(this.currentRelatedPage() + 1);
    }
  }

  previousRelatedPage(): void {
    if (this.currentRelatedPage() > 1) {
      this.currentRelatedPage.set(this.currentRelatedPage() - 1);
    }
  }

  goToRelatedPage(page: number): void {
    if (page >= 1 && page <= this.totalRelatedPages()) {
      this.currentRelatedPage.set(page);
    }
  }

  getRelatedPageNumbers(): (number | string)[] {
    const total = this.totalRelatedPages();
    const current = this.currentRelatedPage();
    const pages: (number | string)[] = [];
    
    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }
    
    return pages;
  }

  private loadProductDetails(productId: number): void {
    this.isLoading.set(true);
    this.selectedImageIndex.set(0);
    this.currentRelatedPage.set(1);
    
    this.posService.getProducts().subscribe({
      next: (products: ProductData[]) => {
        const foundProduct = products.find((p: ProductData) => p.id === productId);
        this.product.set(foundProduct || null);
        
        if (foundProduct) {
          // Preload images for better performance
          this.imageCacheService.preloadProductImages(foundProduct);
          this.loadRelatedProducts(foundProduct, products);
        }
        
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading product details:', error);
        this.isLoading.set(false);
      }
    });
  }

  private loadRelatedProducts(currentProduct: ProductData, allProducts: ProductData[]): void {
    const related = allProducts.filter((p: ProductData) => 
      p.id !== currentProduct.id && 
      p.productCategory.id === currentProduct.productCategory.id
    );
    
    this.relatedProducts.set(related);
    this.totalRelatedPages.set(Math.ceil(related.length / this.relatedItemsPerPage()));
    
    // Preload related product images
    this.imageCacheService.preloadRelatedProductsImages(related);
  }

 getProductImage(product: ProductData, specificImage?: ProductImageDTO | null): Observable<string> {
  // For related products, always use their first image
  if (product.id !== this.product()?.id) {
    return this.imageCacheService.getProductImage(product);
  }
  
  // For main product with specific image (handle null case)
  if (specificImage && specificImage.imgNo) {
    const imageUrl = this.imageCacheService.getImageUrlFromDTO(specificImage);
    return this.imageCacheService.getImage(imageUrl);
  }
  
  // For main product with selected index
  if (this.selectedImageIndex() > 0 && product.productImages) {
    return this.imageCacheService.getProductImageByIndex(product, this.selectedImageIndex());
  }
  
  // Default to first image
  return this.imageCacheService.getProductImage(product);
}

  // Update the template method calls for thumbnails
  getThumbnailImage(product: ProductData, image: ProductImageDTO): Observable<string> {
    const imageUrl = this.imageCacheService.getImageUrlFromDTO(image);
    return this.imageCacheService.getImage(imageUrl);
  }

  // ... rest of your existing methods remain the same
  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  getCartSubtotal(): number {
    return this.cartService.cart().subtotal;
  }

  toggleCart(): void {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  addToCart(product?: ProductData): void {
    const productToAdd = product || this.product();
    if (!productToAdd || !this.isInStock()) return;

    for (let i = 0; i < this.quantity(); i++) {
      this.cartService.addToCart(productToAdd);
    }
    
    this.quantity.set(1);
    
    if (window.innerWidth >= 768) {
      this.isCartSidebarVisible = true;
    } else {
      this.showToastMessage(`Added to cart successfully!`);
    }
  }

  addVariantToCart(variant: VariantDTO): void {
    const product = this.product();
    if (!product || variant.quantity === 0) return;

    for (let i = 0; i < this.quantity(); i++) {
      this.cartService.addToCart(product, variant);
    }
    
    this.quantity.set(1);
    
    if (window.innerWidth >= 768) {
      this.isCartSidebarVisible = true;
    } else {
      this.showToastMessage(`${product.name} (${variant.name}) added to cart successfully!`);
    }
  }

  addRelatedToCart(relatedProduct: ProductData): void {
    this.cartService.addToCart(relatedProduct);
    
    if (window.innerWidth >= 768) {
      this.isCartSidebarVisible = true;
    } else {
      this.showToastMessage(`${relatedProduct.name} added to cart successfully!`);
    }
  }

  private showToastMessage(message: string): void {
    this.toastMessage.set(message);
    this.showToast.set(true);
    
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

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

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