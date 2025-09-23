import { Injectable } from "@angular/core";
import {
	ProductDataGET,
	ProductData as ProductDataPOST,
	Satisfy,
	VariantDTO,
} from "../models/interface";
import { arrayToDate } from "../shared";

// A bunch of helper utilities to reduce repetition

type ProductData = ProductDataPOST | ProductDataGET;

/** Represents the base data (where applicable and in the first index), and variant data that exist.
 *
 * A variant at index 1 in `ProductData["variants"]` will also have it's data accessible in `names[1]`, `prices[1]`, etc
 */
type ProductAndVariantData = {
	/** e.g ["Red Wine", "Red Wine - Zinfandel Red Wine"] */
	names: [ProductData["name"], ...`${ProductData["name"]} - ${string}`[]];

	prices: number[];

	quantities: number[];

	/** e.g ["RED-1541", "RED-1541-RED-SMALL"] */
	skus: [ProductData["sku"], ...`${ProductData["sku"]} - ${string}`[]];

	sizes: Satisfy<VariantDTO["size"][], ["Regular", ...VariantDTO["size"][]]>;

	colors: ["Regular", ...string[]];
};

@Injectable({
	providedIn: "root",
})
export class ProductHelperService {
	constructor() {}
	//TODO: Add caching

	/** Gets the regular data of a product but uses the selected variant's own data to override it if need be.
	 *
	 * The main purpose for this would be if you want to display the product / variant's name or selling price or quantity, etc without manually checking the data structure for `selectedVariants` and such.
	 *
	 * NOTE: **Only the 1st selected variant will be considered**
	 * NOTE: **DO NOT SEND THE RESULT OF THIS TO THE SERVER FOR ANY REASON** */
	getData(
		product: ProductData,
		prioritizeSelectedVariants = true,
	): ProductDataPOST {
		const {
			name: productName,
			selectedVariants,
			createdDate,
			expiryDate,
		} = product;

		const selectedVariant = selectedVariants?.[0];
		const properCreatedDate =
			typeof createdDate === "string"
				? createdDate
				: arrayToDate(createdDate ?? [0]).toISOString();
		const properExpiryDate =
			typeof expiryDate === "string"
				? expiryDate
				: arrayToDate(expiryDate ?? [0]).toISOString();

		if (!prioritizeSelectedVariants || !selectedVariant)
			return {
				...product,
				createdDate: properCreatedDate,
				expiryDate: properExpiryDate,
			};

		// REVIEW: maybe consider adding the `id` and `branches`?
		const { name, price, quantity, sku } = selectedVariant;

		return {
			...product,
			createdDate: properCreatedDate,
			expiryDate: properExpiryDate,
			name: `${productName} - ${name}`,
			sellingPrice: `${price}`,
			quantity,
			sku,
		};
	}

	/** Simplifies getting the combined data from a product with variants */
	getCombinedData(
		product: ProductData,
		useSelectedVariants = false,
	): ProductAndVariantData {
		const returnVal: ProductAndVariantData = {
			colors: ["Regular"],
			names: [product.name],
			prices: [parseFloat(product.sellingPrice ?? "0")],
			quantities: [product.quantity ?? 1],
			sizes: ["Regular"],
			skus: [product.sku],
		};

		(useSelectedVariants
			? (product.selectedVariants ?? [])
			: product.variants
		).forEach(({ color, id, name, price, quantity, size, sku }, index) => {
			returnVal.colors.push(color);
			// Sometimes the name may be the same :p
			returnVal.names.push(name);
			returnVal.prices.push(price);
			returnVal.quantities.push(quantity);
			// Sometimes `size` may be null :P, so default to the last value
			returnVal.sizes.push(size ?? returnVal.sizes[index]);
			returnVal.skus.push(sku);
		});

		return returnVal;
	}

	/** Gets the initial selling price before tax and discount calculations */
	getPrice(
		product: ProductData,
		variant = product.selectedVariants?.[0],
	): number {
		return variant ? variant.price : parseFloat(product.sellingPrice ?? "0");
	}

	/** Gets the amount in stock of the product / variant */
	getQuantity(
		product: ProductData,
		variant = product.selectedVariants?.[0],
	): number {
		return variant ? variant.quantity : (product.quantity ?? 1);
	}

	/** Gets the actual value of the tax */
	getTax(
		product: ProductData,
		variant = product.selectedVariants?.[0],
	): number {
		return (this.getPrice(product, variant) * product.tax.rate) / 100;
	}

	/** Gets the actual value of the discount */
	getDiscount(
		product: ProductData,
		variant = product.selectedVariants?.[0],
	): number {
		return (
			(this.getPrice(product, variant) * (product.discount?.value ?? 0)) / 100
		);
	}

	/** Gets the rate of the product after factoring in the tax and discount.
	 *
	 * Essentially the **effective selling price**
	 */
	getRate(product: ProductData, variant?: VariantDTO): number {
		const price = this.getPrice(product, variant);
		const tax = this.getTax(product, variant);
		const discount = this.getDiscount(product, variant);

		return price + tax - discount;
	}

	/** If the product is a variant, the selected variant data is returned */
	isVariant(
		product: ProductData,
	): { isVariant: true; variants: VariantDTO[] } | { isVariant: false } {
		const { selectedVariants: variants } = product;

		if (variants?.length) return { isVariant: true, variants };
		else return { isVariant: false };
	}
}
