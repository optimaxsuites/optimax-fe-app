import { Component, OnInit, signal, computed } from "@angular/core";
import { ProductData, VariantDTO } from "../../models/interface";
import { PosServiceService } from "../../service/pos-service.service";
import { ImageCacheService } from "../../service/image-cache.service";
import Fuse, { IFuseOptions } from "fuse.js";
import { ProductHelperService } from "../../service/product-helper.service";

/** Indexed by each `category`'s name */
type ProductDataMap = Map<string, ProductData[]>;

type ProductAndVariantCombinedId =
  `${ProductData["id"]}-${Exclude<ProductData["selectedVariants"], undefined>[0]["id"]}`;

@Component({
  selector: "app-pos-store",
  templateUrl: "./pos-store.component.html",
  styleUrl: "./pos-store.component.scss",
})
export class PosStoreComponent implements OnInit {
  private static readonly _fuseOptions: IFuseOptions<ProductData> = {
    keys: [
      { name: "sku", weight: 2 },
      { name: "name", weight: 1.5 },
      "description",
      "category",
    ],
    includeScore: true,
    threshold: 0.333, // Lower threshold for less fuzzy matching
  };

  private _allProducts: ProductData[] = [];

  /** Populated in `ngOnInit` */
  productData = signal<ProductDataMap>(new Map());

  readonly defaultCategory = "All";

  /** Populated in `ngOnInit` */
  selectedCategory = signal(this.defaultCategory);

  private _productsInChosenCategory = computed(
    () => this.productData().get(this.selectedCategory()) ?? this._allProducts,
  );

  searchText = signal("");

  private readonly _fuse = new Fuse<ProductData>(
    this._productsInChosenCategory(),
    PosStoreComponent._fuseOptions,
  );

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

  didSearchHaveResults = computed<"no_search_yet" | "no" | "yes">(() => {
    if (!this.searchText() || !this._productsInChosenCategory().length)
      return "no_search_yet";
    else if (this.filteredProducts() == this._productsInChosenCategory())
      return "no";
    else return "yes";
  });

  /** This is just a way for me to detect whether the device is mobile and in portrait mode */
  readonly shouldCartHaveViewportWidth =
    window.innerWidth < 640 &&
    window.matchMedia("(orientation: portrait)").matches;

  isCartOpen = false;

  isVariantModalOpen = false;

  /** Will have a value when `isVariantModalOpen` is true */
  selectedProduct: ProductData | null = null;

  /** Each index is either the number id of a product: `234` or the combined string literal of both the id and a selected variant: `"234-1"`, and it holds a **clone** of the product as well as the quantity. Note that if a string literal representing the product id and variant id is present, then the `selectedVariants` property will be populated with 1 variant. */
  cartProducts = signal(
    new Map<
      ProductData["id"] | ProductAndVariantCombinedId,
      { product: ProductData; quantity: number; isVariant: boolean }
    >(),
  );

  isCartEmpty = computed(() => !this.cartProducts().size);

  constructor(
    private _posService: PosServiceService,
    private _imgCacheService: ImageCacheService,
    private _productHelper: ProductHelperService,
  ) {}

  ngOnInit(): void {
    // Populate the product data
    this._posService.getProducts().subscribe((data) => {
      this._allProducts = data;

      data.forEach((iteratedProduct) => {
        const categoryName = iteratedProduct.productCategory.name;

        if (!this.productData().has(categoryName)) {
          this.productData.update((oldMap) =>
            new Map(oldMap).set(categoryName, [iteratedProduct]),
          );
        } else {
          this.productData.update((oldMap) => {
            const existingProductArray = oldMap.get(categoryName)!;
            existingProductArray.push(iteratedProduct);

            return new Map(oldMap).set(categoryName, existingProductArray);
          });
        }
      });
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
    variant?: VariantDTO,
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
    product: ProductData,
  ) {
    this.cartProducts.update((previousMap) => {
      const idToUse: ProductData["id"] | ProductAndVariantCombinedId = product
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

  productQuantityInCart(productToCheck: ProductData): number {
    let countedQuantity = 0;

    this.cartProducts().forEach(({ product, quantity }) => {
      if (product.id == productToCheck.id) countedQuantity += quantity;
    });

    return countedQuantity;
  }

  strToNum(string?: string) {
    const convertedRes = parseFloat(string ?? "0");

    return isNaN(convertedRes) ? 0 : convertedRes;
  }
}
