// pos-store.component.ts - FIXED
import { Component, computed, OnInit, signal } from '@angular/core';
import Fuse, { IFuseOptions } from 'fuse.js';
import { ProductData, VariantDTO } from '../../models/interface';
import { ActivatedRoute } from '@angular/router'; 
import { ImageCacheService } from '../../service/image-cache.service';
import { PaymentServiceService } from '../../service/payment-service.service';
import { PosServiceService } from '../../service/pos-service.service';
import { ProductHelperService } from '../../service/product-helper.service';
import { Router } from '@angular/router';
import { StoreCartService } from '../../service/store-cart.service'; 

type ProductDataMap = Map<string, ProductData[]>;

type ConvertedCartProducts = {
  products: ProductData[];
  subtotal: number; // Fixed: changed subTotal to subtotal
  tax: number;
  discount: number;
  total: number;
};

@Component({
  selector: 'app-pos-store',
  templateUrl: './pos-store.component.html',
  styleUrl: './pos-store.component.scss',
})
export class PosStoreComponent implements OnInit {
  private static readonly _fuseOptions: IFuseOptions<ProductData> = {
    keys: [
      { name: 'sku', weight: 2 },
      { name: 'name', weight: 1.5 },
      'description',
      'category',
    ],
    includeScore: true,
    threshold: 0.333,
  };

  private _allProducts: ProductData[] = [];

  productData = signal<ProductDataMap>(new Map());
  readonly defaultCategory = 'All';
  selectedCategory = signal(this.defaultCategory);

  private _productsInChosenCategory = computed(
    () => this.productData().get(this.selectedCategory()) ?? this._allProducts
  );

  user = signal({ name: 'Guest', isGuest: true });
  branches: any[] = [];
  searchText = signal('');
  isLoading = signal(true);

  private readonly _fuse = new Fuse<ProductData>(
    this._productsInChosenCategory(),
    PosStoreComponent._fuseOptions
  );

  isSidebarVisible = true;
  isCartOpen = false;
  isHamburgerMenuOpen = false;
  isVariantModalOpen = false;
  isPaymentModalOpen = false;
  isCartSidebarVisible = true;
  selectedProduct: ProductData | null = null;

  // Use ONLY the service for cart state
  cartProducts = computed(() => this.cartService.cart().items);
  isCartEmpty = computed(() => this.cartService.isCartEmpty());
  totalCartItems = computed(() => this.cartService.totalItems());
  
  // Fixed: Remove duplicate declaration and use proper type
  convertedCartProducts = computed<ConvertedCartProducts>(() => {
    const cart = this.cartService.getCart();
    return Array.from(cart.items).reduce<ConvertedCartProducts>(
      (acc, [_, { product: currProduct, quantity: currQuantity }]) => {
        acc.products.push(...Array(currQuantity).fill(currProduct));
        acc.discount += this._productHelper.getDiscount(currProduct) * currQuantity;
        acc.subtotal += this._productHelper.getPrice(currProduct) * currQuantity; // Fixed: subtotal not subTotal
        acc.tax += this._productHelper.getTax(currProduct) * currQuantity;
        acc.total += this._productHelper.getRate(currProduct) * currQuantity;
        return acc;
      },
      { products: [], subtotal: cart.subtotal, tax: 0, discount: 0, total: cart.subtotal } // Fixed: subtotal not subTotal
    );
  });

  categoryOptions = computed(() => {
    const options = [
      { label: this.defaultCategory, value: this.defaultCategory },
    ];

    this.productData().forEach((_, key) => {
      options.push({
        label: key[0].toUpperCase() + key.slice(1),
        value: key,
      });
    });

    return options;
  });

  filteredProducts = computed(() => {
    if (!this.searchText() || !this._productsInChosenCategory().length) {
      return this._productsInChosenCategory();
    }
    this._fuse.setCollection(this._productsInChosenCategory());

    const searchResults = this._fuse
      .search(this.searchText())
      .map(({ item }) => item);

    if (!searchResults.length) return this._productsInChosenCategory();
    else return searchResults;
  });

  didSearchHaveResults = computed<'no_search_yet' | 'no' | 'yes'>(() => {
    if (!this.searchText() || !this._productsInChosenCategory().length)
      return 'no_search_yet';
    else if (this.filteredProducts() === this._productsInChosenCategory())
      return 'no';
    else return 'yes';
  });

  readonly shouldCartHaveViewportWidth =
    window.innerWidth < 640 &&
    window.matchMedia('(orientation: portrait)').matches;

  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  constructor(
    private _posService: PosServiceService,
    private router: Router,
    private _imgCacheService: ImageCacheService,
    private _productHelper: ProductHelperService,
    private _paymentService: PaymentServiceService,
    private cartService: StoreCartService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this._posService.getBranches().subscribe((branches) => {
      this.branches = branches;
    });

    this._posService.getProducts().subscribe({
      next: (data) => {
        this._allProducts = data;

        data.forEach((iteratedProduct) => {
          const categoryName = iteratedProduct.productCategory.name;

          if (!this.productData().has(categoryName)) {
            this.productData.update((oldMap) =>
              new Map(oldMap).set(categoryName, [iteratedProduct])
            );
          } else {
            this.productData.update((oldMap) => {
              const existingProductArray = oldMap.get(categoryName);

              if (!existingProductArray) return new Map(oldMap);

              existingProductArray.push(iteratedProduct);

              return new Map(oldMap).set(categoryName, existingProductArray);
            });
          }
        });
        
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading products', error);
        this.isLoading.set(false);
      }
    });
  }

  getCategoryList(): string[] {
    const categories: string[] = [];
    this.productData().forEach((_, key) => {
      if (key !== 'All') {
        categories.push(key);
      }
    });
    return categories;
  }

  getProductsByCategory(category: string): ProductData[] {
    return this.productData().get(category) || [];
  }

  // Cart methods using service ONLY
  addToCart(product: ProductData, variant?: VariantDTO) {
    this.cartService.addToCart(product, variant);
    // Force change detection by accessing the signal
    this.cartProducts(); // This reads the signal and triggers reactivity
  }

  reduceQuantityInCart(product: ProductData) {
    const idToUse = product.selectedVariants?.[0] 
      ? `${product.id}-${product.selectedVariants[0].id}` 
      : product.id.toString();
    
    const currentQuantity = this.cartProducts().get(idToUse)?.quantity || 0;
    this.cartService.updateQuantity(product, currentQuantity - 1, product.selectedVariants?.[0]);
    this.cartProducts(); // Trigger reactivity
  }

  removeFromCart(product: ProductData) {
    this.cartService.removeFromCart(product, product.selectedVariants?.[0]);
    this.cartProducts(); // Trigger reactivity
  }

  clearCart() {
    this.cartService.clearCart();
    this.isCartOpen = false;
  }

  toggleCart() {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  productQuantityInCart(product: ProductData): number {
    const idToUse = product.selectedVariants?.[0] 
      ? `${product.id}-${product.selectedVariants[0].id}` 
      : product.id.toString();

    return this.cartProducts().get(idToUse)?.quantity || 0;
  }

  getProductImage(product: ProductData) {
    return this._imgCacheService.getProductImage(product);
  }

  changeCategory(category: string) {
    this.selectedCategory.set(category);
  }

  changeSearchInput(text: string) {
    this.searchText.set(text);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

  navigateToCheckout(): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(['/store', currentUuid, 'checkout']);
  }

  navigateToProductDetails(productId: number): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    
    if (currentUuid) {
      this.router.navigate(['product-details', productId], { relativeTo: this.route });
    } else {
      console.error('No store UUID found in route parameters');
    }
  }
}