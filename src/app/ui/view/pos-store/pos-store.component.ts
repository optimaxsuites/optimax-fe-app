import { Component, OnInit, signal, computed } from '@angular/core';
import { ProductData } from '../../models/interface';
import { PosServiceService } from '../../service/pos-service.service';
import { ImageCacheService } from '../../service/image-cache.service';
import Fuse, { IFuseOptions } from 'fuse.js';

/** Indexed by each `category`'s name */
type ProductDataMap = Map<string, ProductData[]>;

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
  /** Indexed with the product id. Value is the img url to use for displaying images */
  productImgMap = new Map<number, string>();

  readonly defaultCategory = 'All';

  /** Populated in `ngOnInit` */
  selectedCategory = signal(this.defaultCategory);

  private _productsInChosenCategory = computed(
    () => this.productData().get(this.selectedCategory()) ?? this._allProducts
  );

  searchText = signal('');

  private readonly _fuse = new Fuse<ProductData>(
    this._productsInChosenCategory(),
    PosStoreComponent._fuseOptions
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

  didSearchHaveResults = computed<'no_search_yet' | 'no' | 'yes'>(() => {
    if (!this.searchText() || !this._productsInChosenCategory().length)
      return 'no_search_yet';
    else if (this.filteredProducts() == this._productsInChosenCategory())
      return 'no';
    else return 'yes';
  });

  constructor(
    private _posService: PosServiceService,
    private _imgCacheService: ImageCacheService
  ) {}

  ngOnInit(): void {
    // Populate the product data
    this._posService.getProducts().subscribe((data) => {
      this._allProducts = data;

      data.forEach((iteratedProduct) => {
        const categoryName = iteratedProduct.productCategory.name;

        if (!this.productData().has(categoryName)) {
          this.productData.update((oldMap) =>
            new Map(oldMap).set(categoryName, [iteratedProduct])
          );
        } else {
          this.productData.update((oldMap) => {
            const existingProductArray = oldMap.get(categoryName)!;
            existingProductArray.push(iteratedProduct);

            return new Map(oldMap).set(categoryName, existingProductArray);
          });
        }

        // Cache product images
        const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${iteratedProduct.productImages[0].imgNo}`;
        this._imgCacheService.getImage(remoteImageUrl).subscribe((url) => {
          this.productImgMap.set(iteratedProduct.id, url);
        });
      });
    });
  }

  changeCategory(category: string) {
    this.selectedCategory.set(category);
  }

  changeSearchInput(text: string) {
    this.searchText.set(text);
  }
}
