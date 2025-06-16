import { Injectable } from '@angular/core';
import { ProductData, Satisfy, VariantDTO } from '../models/interface';

// type ProductAndVariantData<TProduct extends ProductData> = {
//   names: (
//     | TProduct['name']
//     | `${TProduct['name']}-${TProduct['variants'][0]['name']}`
//   )[];
// };

/** Represents the base data (where applicable and in the first index), and variant data that exist.
 *
 * A variant at index 1 in `ProductData["variants"]` will also have it's data accessible in `names[1]`, `prices[1]`, etc
 */
type ProductAndVariantData<TProduct extends ProductData> = {
  /** e.g ["Red Wine", "Red Wine - Zinfandel Red Wine"] */
  names: [TProduct['name'], ...`${TProduct['name']} - ${string}`[]];

  prices: number[];

  quantities: number[];

  /** e.g ["RED-1541", "RED-1541-RED-SMALL"] */
  skus: [TProduct['sku'], ...`${TProduct['sku']} - ${string}`[]];

  sizes: Satisfy<VariantDTO['size'][], ['Regular', ...VariantDTO['size'][]]>;

  colors: ['Regular', ...string[]];
};

@Injectable({
  providedIn: 'root',
})
export class ProductVariantHelperService {
  constructor() {}

  /** Simplifies getting data from a product with variants */
  getData<TProduct extends ProductData>(
    product: TProduct
  ): ProductAndVariantData<TProduct> {
    const returnVal: ProductAndVariantData<TProduct> = {
      colors: ['Regular'],
      names: [product.name],
      prices: [parseFloat(product.sellingPrice ?? '0')],
      quantities: [product.quantity ?? 1],
      sizes: ['Regular'],
      skus: [product.sku],
    };

    product.variants.forEach(
      ({ color, id, name, price, quantity, size, sku }, index) => {
        returnVal.colors.push(color);
        // Sometimes the name may be the same :p
        returnVal.names.push(name);
        returnVal.prices.push(price);
        returnVal.quantities.push(quantity);
        // Sometimes `size` may be null :P, so default to the last value
        returnVal.sizes.push(size ?? returnVal.sizes[index]);
        returnVal.skus.push(sku);
      }
    );

    return returnVal;
  }
}
