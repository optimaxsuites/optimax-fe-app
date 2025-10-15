import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormArray, FormGroup, Validators } from "@angular/forms";
import {
	ProductData,
	ProductJSONFormat,
	supplierData,
	TaxDTO,
	VariantDTO,
} from "../../../models/interface";
import { MetadataService } from "../../../service/metadata.service";
import { PosServiceService } from "../../../service/pos-service.service";
import { ProductHelperService } from "../../../service/product-helper.service";

@Component({
	selector: "app-view-product",
	templateUrl: "./view-product.component.html",
	styleUrl: "./view-product.component.scss",
})
export class ViewProductComponent {
	@Input() activeItem: ProductData = {} as any;
	@Output() edit = new EventEmitter<void>();
	@Output() closeView = new EventEmitter<void>();

	variants: any[] = [];
	discounts: any[] = [];
	suppliers: supplierData[] = [];
	taxes: TaxDTO[] = [];
	categories: any[] = [];
	discountTypes: any[] = [];
	branches: any[] = [];
	originalProducts: any[] = [];
	selectedBranchIds: string[] = [];
	activeItemImages: string[] = []
	mainProductImage: string = 'assets/image loading placeholder.png'

	private readonly defaultVariant: VariantDTO = {
		id: 0,
		name: "",
		price: 0,
		quantity: 0,
		color: "",
		size: "Regular",
		sku: "",
		branches: [],
	};
	constructor(
		private metadataservice: MetadataService,
		private _productHelper: ProductHelperService,
	) {}

	ngOnInit() {
		this.loadVariants();
		this.fetchMetaData();
		this.selectedBranchIds =
			this.activeItem?.branchDetails
				?.map(
					(d: { productBranch: { branchId: any } }) =>
						d.productBranch?.branchId,
				)
				.filter((id: number) => !!id) || [];


		this._productHelper.getImageUrls(this.activeItem.productImages).subscribe((urls: any) => {
					this.activeItemImages = urls;
					this.mainProductImage = urls.length ? urls[0] : 'assets/image loading placeholder.png';
		});
				  
	   
	}

	setAsMainImage(imageUrl: string){
		this.mainProductImage = imageUrl
	}

	openViewProduct() {
		this.closeView.emit();
	}

	openEdit(arg0: any) {
		this.edit.emit(arg0);
	}

	get selectedBranchNames(): string {
		const ids =
			this.activeItem?.branchDetails?.map(
				(d: { productBranch: { branchId: any } }) => d.productBranch?.branchId,
			) || [];

		const names = ids
			.map((id: any) => this.getNameFromId(this.branches, id))
			.filter((name: any) => !!name);

		return names.join(", ");
	}
	loadVariants() {
		const variantMap: { [key: string]: any } = {};

		this.activeItem?.branchDetails?.forEach((branchDetail: any) => {
			const branchId = branchDetail.productBranch.branchId;
			const variants = branchDetail.variants;

			variants.forEach((variant: any) => {
				const key = variant.variantId || variant.sku || variant.name;

				if (!variantMap[key]) {
					variantMap[key] = {
						variantId: variant.variantId,
						name: variant.name,
						sku: variant.sku,
						color: variant.color || "Other".split(",").map((val) => val.trim()),
						size: variant.size || "Regular",
						branches: [branchId],
					};
				} else {
					if (!variantMap[key].branches.includes(branchId)) {
						variantMap[key].branches.push(branchId);
					}
				}
			});
		});

		this.variants = Object.values(variantMap);
	}

	trackByBranch(index: number, branchDetail: any): string {
		return branchDetail?.productBranch?.branchId || index;
	}

	getNameFromId(list: any[], id: any): string {
		return list?.find((item) => item.id === id)?.name || "—";
	}

	fetchMetaData() {
		this.metadataservice.discount$.subscribe((data) => (this.discounts = data));
		this.metadataservice.category$.subscribe(
			(data) => (this.categories = data),
		);
		this.metadataservice.supplier$.subscribe((data) => (this.suppliers = data));
		this.metadataservice.discountTypes$.subscribe(
			(data) => (this.discountTypes = data),
		);
		this.metadataservice.taxes$.subscribe((data) => (this.taxes = data));
		this.metadataservice.branches$.subscribe((data) => (this.branches = data));
		this.metadataservice.products$.subscribe((data) => {
			this.originalProducts = data;
		});
	}

	protected get variantObjectKeys() {
		return (
			Object.keys(this.defaultVariant) as (keyof typeof this.defaultVariant)[]
		)
			.filter((key) => key != "id" && key != "branches")
			.map((key) => {
				if (key == "sku") return key.toLocaleUpperCase();
				// "size" becomes "Size"
				else return key.charAt(0).toLocaleUpperCase() + key.slice(1);
			});
	}

	get activeItemExpiryDate() {
		return new Date(
			this._productHelper.getData(this.activeItem).expiryDate,
		).toDateString();
	}
}
