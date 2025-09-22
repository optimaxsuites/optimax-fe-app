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
import { StoreHeaderComponent } from './store-header/store-header.component';

/** Indexed by each `category`'s name */
type ProductDataMap = Map<string, ProductData[]>;

type ProductAndVariantCombinedId = `${ProductData['id']}-${Exclude<
  ProductData['selectedVariants'],
  undefined
>[0]['id']}`;

type ConvertedCartProducts = {
  products: ProductData[];
  subTotal: number;
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
    threshold: 0.333, // Lower threshold for less fuzzy matching
  };

  private _allProducts: ProductData[] = [];

  /** Populated in `ngOnInit` */
  productData = signal<ProductDataMap>(new Map());

  readonly defaultCategory = 'All';

  /** Populated in `ngOnInit` */
  selectedCategory = signal(this.defaultCategory);

  private _productsInChosenCategory = computed(
    () => this.productData().get(this.selectedCategory()) ?? this._allProducts
  );

  user = signal({ name: 'Guest', isGuest: true });

  branches: any[] = [];

  getCategoryList(): string[] {
    const categories: string[] = [];
    this.productData().forEach((_, key) => {
      if (key !== 'All') {
        categories.push(key);
      }
    });
    return categories;
  }

  // Method to get products by category
  getProductsByCategory(category: string): ProductData[] {
    return this.productData().get(category) || [];
  }

  categoryCarousels: { [key: string]: Element } = {};

  // After view init, get references to carousel elements
  ngAfterViewInit() {
    // We'll use a small timeout to ensure the view is rendered
    setTimeout(() => {
      this.getCategoryList().forEach((category) => {
        const element = document.querySelector(`[data-category="${category}"]`);
        if (element) {
          this.categoryCarousels[category] = element;
        }
      });
    }, 100);
  }

  scrollCarouselLeft(category: string): void {
    const carousel = document.querySelector(`[data-category="${category}"]`);
    if (carousel) {
      carousel.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }

  scrollCarouselRight(category: string): void {
    const carousel = document.querySelector(`[data-category="${category}"]`);
    if (carousel) {
      carousel.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }

  // Method to handle branch change
  changeBranch(branch: any) {
    // Implement logic to filter products by branch
    console.log('Branch changed to:', branch);
    // You'll need to update your product fetching logic based on the selected branch
  }

  searchText = signal('');

  private readonly _fuse = new Fuse<ProductData>(
    this._productsInChosenCategory(),
    PosStoreComponent._fuseOptions
  );

  isSidebarVisible = true;
  // isLoading = signal(true); 
  // Create category options for the dropdown
  categoryOptions = computed(() => {
    const options = [
      { label: this.defaultCategory, value: this.defaultCategory },
    ];

    // Fix: Use proper iteration over the Map
    this.productData().forEach((_, key) => {
      options.push({
        label: key[0].toUpperCase() + key.slice(1),
        value: key,
      });
    });

    return options;
  });

  // Add this method to handle navigation to product details
  navigateToProductDetails(productId: number): void {
    this.router.navigate(['user/checkout/pos-store/product-details', productId]);
  }

  // TODO: add extra dependencies like search filtering
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

  /** This is just a way for me to detect whether the device is mobile and in portrait mode */
  readonly shouldCartHaveViewportWidth =
    window.innerWidth < 640 &&
    window.matchMedia('(orientation: portrait)').matches;

  isCartOpen = false;
  isHamburgerMenuOpen = false;

  isVariantModalOpen = false;

  /** Will have a value when `isVariantModalOpen` is true */
  selectedProduct: ProductData | null = null;

  /** Each index is either the number id of a product: `234` or the combined string literal of both the id and a selected variant: `"234-1"`, and it holds a **clone** of the product as well as the quantity. Note that if a string literal representing the product id and variant id is present, then the `selectedVariants` property will be populated with 1 variant. */
  cartProducts = signal(
    new Map<
      ProductData['id'] | ProductAndVariantCombinedId,
      { product: ProductData; quantity: number; isVariant: boolean }
    >()
  );

  isCartEmpty = computed(() => !this.cartProducts().size);

  /** Get total number of items in cart (sum of all quantities) */
  getTotalCartItems = computed(() => {
    let total = 0;
    this.cartProducts().forEach(({ quantity }) => {
      total += quantity;
    });
    return total;
  });

  /** For easily connecting with the payment service */
  convertedCartProducts = computed<ConvertedCartProducts>(() =>
    Array.from(this.cartProducts()).reduce<ConvertedCartProducts>(
      (
        {
          discount: accDiscount,
          products: accProducts,
          subTotal: accSubTotal,
          tax: accTax,
          total: accTotal,
        },
        [_, { product: currProduct, quantity: currQuantity }]
      ) => {
        accProducts.push(...Array(currQuantity).fill(currProduct));
        accDiscount +=
          this._productHelper.getDiscount(currProduct) * currQuantity;
        accSubTotal += this._productHelper.getPrice(currProduct) * currQuantity;
        accTax += this._productHelper.getTax(currProduct) * currQuantity;
        accTotal += this._productHelper.getRate(currProduct) * currQuantity;

        return {
          products: accProducts,
          subTotal: accSubTotal,
          tax: accTax,
          discount: accDiscount,
          total: accTotal,
        };
      },
      { products: [], subTotal: 0, tax: 0, discount: 0, total: 0 }
    )
  );

  isPaymentModalOpen = false;

  constructor(
    private _posService: PosServiceService,
    private router: Router,
    private _imgCacheService: ImageCacheService,
    private _productHelper: ProductHelperService,
    private _paymentService: PaymentServiceService,
    private cartService: StoreCartService,
    private route: ActivatedRoute
  ) {}
isLoading = signal(true); 
ngOnInit(): void {
  // Fetch branches
  this._posService.getBranches().subscribe((branches) => {
    this.branches = branches;
  });

  // Populate the product data
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
      
      // Hide loading skeleton when data is loaded
      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('Error loading products', error);
      this.isLoading.set(false);
    }
  });
}
  getProductImage(product: ProductData) {
    return this._imgCacheService.getProductImage(product);
  }

  getProductAndVariantData(
    ...args: Parameters<typeof this._productHelper.getCombinedData>
  ) {
    return this._productHelper.getCombinedData(...args);
  }

  changeCategory(category: string) {
    this.selectedCategory.set(category);
  }

  changeSearchInput(text: string) {
    this.searchText.set(text);
  }

  //TODO
  addToCart(
    product: ProductData,
    /** If given, the variant's data would overwrite relevant product fields. */
    variant?: VariantDTO
  ) {
    this.cartProducts.update((previousMap) => {
      const clonedProductToAdd = structuredClone(product);

      if (!variant) {
        if (!previousMap.has(product.id)) {
          clonedProductToAdd.selectedVariants = [];

          previousMap.set(product.id, {
            isVariant: false,
            product: clonedProductToAdd,
            quantity: 1,
          });
        } else {
          previousMap.set(product.id, {
            isVariant: false,
            product: clonedProductToAdd,
            quantity: previousMap.get(product.id)!.quantity + 1,
          });
        }
      } else {
        const combinedId: ProductAndVariantCombinedId = `${product.id}-${variant.id}`;
        clonedProductToAdd.selectedVariants = [variant];

        if (!previousMap.has(combinedId)) {
          previousMap.set(combinedId, {
            isVariant: true,
            product: clonedProductToAdd,
            quantity: 1,
          });
        } else {
          previousMap.set(combinedId, {
            isVariant: true,
            product: clonedProductToAdd,
            quantity: previousMap.get(combinedId)!.quantity + 1,
          });
        }
      }
      return new Map(previousMap);
    });
  }

  reduceQuantityInCart(
    /** If a variant must be reduced / removed, ensure that `selectedVariants` contains a single instance of the aforementioned variant. */
    product: ProductData
  ) {
    this.cartProducts.update((previousMap) => {
      const idToUse: ProductData['id'] | ProductAndVariantCombinedId = product
        .selectedVariants?.[0]
        ? `${product.id}-${product.selectedVariants[0].id}`
        : product.id;

      if (previousMap.has(idToUse)) {
        const originalQuantity = previousMap.get(idToUse)!.quantity;

        if (originalQuantity > 1) {
          previousMap.set(idToUse, {
            isVariant: previousMap.get(idToUse)!.isVariant,
            product,
            quantity: originalQuantity - 1,
          });
        } else {
          previousMap.delete(idToUse);
        }
      }

      if (!previousMap.size) this.isCartOpen = false;

      return new Map(previousMap);
    });
  }

  // Add to your component class
  isCartSidebarVisible = true;

  // Toggle cart function
  toggleCart() {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  /** Completely remove an item from cart */
  removeFromCart(product: ProductData) {
    this.cartProducts.update((previousMap) => {
      const idToUse: ProductData['id'] | ProductAndVariantCombinedId = product
        .selectedVariants?.[0]
        ? `${product.id}-${product.selectedVariants[0].id}`
        : product.id;

      previousMap.delete(idToUse);

      if (!previousMap.size) this.isCartOpen = false;

      return new Map(previousMap);
    });
  }

  clearCart() {
    this.cartProducts.set(new Map());
    this.isCartOpen = false;
  }

  productQuantityInCart(product: ProductData): number {
    const idToUse: ProductData['id'] | ProductAndVariantCombinedId = product
      .selectedVariants?.[0]
      ? `${product.id}-${product.selectedVariants[0].id}`
      : product.id;

    return this.cartProducts().get(idToUse)?.quantity || 0;
  }

  // processPayment(paymentData: any) {
  //   // Implementation for processing payment
  //   this._paymentService.processPayment(paymentData).subscribe({
  //     next: (response) => {
  //       console.log("Payment successful", response);
  //       this.clearCart();
  //       this.isPaymentModalOpen = false;
  //     },
  //     error: (error) => {
  //       console.error("Payment failed", error);
  //     }
  //   });
  // }

  strToNum(value: string | number): number {
    return typeof value === 'string' ? parseFloat(value) : value;
  }

  // Helper method to safely handle image errors
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }
navigateToCheckout(): void {
  const currentUuid = this.route.snapshot.paramMap.get('uuid');
  this.cartService.setCart(this.cartProducts(), this.convertedCartProducts().subTotal);
  this.router.navigate(['/store', currentUuid, 'checkout']);
}
}
