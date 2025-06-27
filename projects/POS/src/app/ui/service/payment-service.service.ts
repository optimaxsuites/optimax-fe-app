import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import type { Cart, ProductData } from "../models/interface";
import { NavigationLinksService } from "../sharedComponent/service/navigation-links/navigation-links.service";
import { ProductHelperService } from "./product-helper.service";

@Injectable({
	providedIn: "root",
})
export class PaymentServiceService {
	constructor(
		private _navigationService: NavigationLinksService,
		private _router: Router,
		private _productHelper: ProductHelperService,
	) {}

	/** Just a redirect to the actual payment component */
	processPayment(args: {
		paymentModes: Cart["paymentModes"];
		cartItems: ProductData[];
		total: number;
		discount: number;
		tax: number;
		subTotal: number;
	}) {
		const {
			cartItems: inputCartItems,
			discount,
			paymentModes,
			subTotal: subtotal,
			tax,
			total,
		} = args;

		// Use a clone to ensure our mutations don't affect anything important
		const cartItems = structuredClone(inputCartItems);

		if (cartItems.length === 0) return;

		// console.log("Cart Items are: ", cartItems);

		/** Indexed with the products name, and stores the index of the product in the new array */
		const visited = new Map<string, number>();
		// Get the `count` property depending on the number of times a product appears
		const trimmedCartItems = cartItems.reduce<ProductData[]>((acc, product) => {
			// console.log("Trimmed cart is:", acc, "and visited map is:", visited);
			const { isVariant } = this._productHelper.isVariant(product);
			const productAndVariantData = this._productHelper.getData(product);
			const visitedProductIndex = visited.get(productAndVariantData.name);

			// Increment the existing product / variant and add the necessary fields for the cart
			if (visitedProductIndex != null) {
				if (isVariant) {
					const selectedVariant =
						acc[visitedProductIndex].selectedVariants?.[0];
					// This should never happen, it's just for typescript to be sure that this wouldn't be undefined
					if (!selectedVariant || !selectedVariant.selectedQuantity) return acc;

					acc[visitedProductIndex] = {
						...acc[visitedProductIndex],
						selectedVariants: [
							{
								...selectedVariant,
								selectedQuantity: ++selectedVariant.selectedQuantity,
							},
						],
					};
				} else {
					const newCount = ++acc[visitedProductIndex].count;
					acc[visitedProductIndex] = {
						...acc[visitedProductIndex],
						count: newCount,
						cartPriceTotal: `${this._productHelper.getPrice(acc[visitedProductIndex]) * newCount}`,
					};
				}
				return acc;
			}

			if (!isVariant && product.count == null) {
				product.count = 1;
				product.cartPriceTotal = `${this._productHelper.getPrice(product)}`;
			}
			if (
				isVariant &&
				product.selectedVariants &&
				product.selectedVariants[0] &&
				product.selectedVariants[0].selectedQuantity == null
			)
				product.selectedVariants[0].selectedQuantity = 1;
			const length = acc.push(product);

			visited.set(productAndVariantData.name, length - 1);
			return acc;
		}, []);

		const cart: Cart = {
			cartItems: trimmedCartItems,
			total,
			discount,
			tax,
			subtotal,
			paymentModes,
			id: "",
			orderId: 0,
		};

		const cashPaymentComponentLink =
			this._navigationService.getLink("cashPayment");

		this._router.navigate([cashPaymentComponentLink], { state: { cart } });
	}
}
