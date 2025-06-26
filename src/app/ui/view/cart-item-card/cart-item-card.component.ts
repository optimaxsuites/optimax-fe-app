import { Component, EventEmitter, Input, input, Output } from "@angular/core";
import { Business, ProductData } from "../../models/interface";
import { ImageCacheService } from "../../service/image-cache.service";
import { IndustryDataService } from "../../service/industry-data.service";

@Component({
	selector: "app-cart-item-card",
	templateUrl: "./cart-item-card.component.html",
	styleUrl: "./cart-item-card.component.scss",
})
export class CartItemCardComponent implements Business {
	@Input() freezeItemCount = false;
	@Input() item: ProductData = {} as any;
	@Input() showDelete: boolean = true;
	@Input() cart?: boolean = true;
	@Output() delete = new EventEmitter<{ isVariant: boolean; index: number }>();
	@Output() calculateTotal = new EventEmitter<void>();

	@Output() countChange = new EventEmitter<number>();
	@Output() updateItem = new EventEmitter<number>();
	imageUrl!: any;

	// count: number = this.item.count

	constructor(
		private industryDataService: IndustryDataService,
		private imageCacheService: ImageCacheService,
	) {}
	ngOnInit(): void {
		console.log("Item is: ", this.item, "while cart is", this.cart);

		if (this.item.imageUrl$) {
			this.imageUrl = this.item.imageUrl$;
			return;
		}
		const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${this.item.product ? this.item.product.productImages[0].imgNo : this.item.productImages[0].imgNo}`;
		this.imageCacheService.getImage(remoteImageUrl).subscribe((url) => {
			this.imageUrl = url;
		});
	}
	decreaseCount() {
		if (this.freezeItemCount) return;

		if (this.item.count > 0) {
			this.item.count--;
		}
		this.emitCountChange();
	}

	validateItemCount(item: any) {
		if (item.count <= 0 || isNaN(item.count)) {
			item.count = 1;
		}
		this.countChange.emit(item.count);
	}

	increaseCount() {
		if (this.freezeItemCount) return;

		this.item.count++;
		this.emitCountChange();
	}

	private emitCountChange() {
		this.countChange.emit(this.item.count);
	}

	onDelete(isVariant: boolean = false, index: number = 0) {
		this.delete.emit({ isVariant: isVariant, index: index });
	}
	onCountChange(newCount: number) {
		this.countChange.emit(newCount);
	}

	onClick() {
		this.updateItem.emit(this.item.id);
	}

	get cartPriceTotal() {
		return (
			Math.round(
				parseFloat(
					this.item.cartPriceTotal ??
						parseFloat(this.item.sellingPrice ?? "0") * this.item.count,
				) * 100,
			) / 100
		);
	}

	get businessType() {
		return this.industryDataService.businessType;
	}

	updateItemQuantity(item: any, change: number, variant?: any) {
		if (variant) {
			variant.selectedQuantity = Math.max(
				(variant.selectedQuantity ?? 0) + change,
				1,
			);

			if (variant.selectedQuantity === 1) {
				return;
			}

			if (variant.selectedQuantity === 0) {
				item.selectedVariants = item.selectedVariants.filter(
					(v: any) => v !== variant,
				);
			}
			this.calculateTotal.emit();
		}

		if (!variant || item.selectedVariants.length === 0) {
			item.count = Math.max((item.count ?? 0) + change, 1);

			this.countChange.emit(item.count);
		}
	}

	// getImge(imgageUrl: string){
	//   const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${this.product.productImages[0].imgNo}`;
	//   this.imageCacheService.getImage(remoteImageUrl).subscribe((url) => {

	//   });
	// }
}
