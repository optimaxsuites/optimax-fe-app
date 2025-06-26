import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import { MessageService } from "primeng/api";
import {
	ProductCategoryPOST,
	ProductData,
	VariantDTO,
} from "../../../models/interface";
import { IndustryDataService } from "../../../service/industry-data.service";
import { PosServiceService } from "../../../service/pos-service.service";

@Component({
	selector: "app-edit-product",
	templateUrl: "./edit-product.component.html",
	styleUrl: "./edit-product.component.scss",
})
export class EditProductComponent {
	//@ts-ignore
	@Input() activeItem: ProductData;
	@Output() close = new EventEmitter<void>();

	productData = {
		name: "",
		code: "",
		description: "",
		sku: "",
		weight: 0,
		initialPrice: "",
		effectivePrice: "",
		initialQuantity: 0,
		effectiveQuantity: 0,
		partNumber: "",
		tax: 0,
		branch: "",
		variant: "",
		discount: 0,
		category: "",
		id: 0,
		count: 0,
		discountType: [] as any[],
		discountValue: 0,
		image: {} as any,
		startDate: "",
		endDate: "",
		discountMinQuantity: 0,
		discountName: "",
	};
	categoryData: ProductCategoryPOST = {
		name: "",
		code: "",
		description: "",
		endDate: "",
		id: 0,
	};
	barcodeConfig = {
		barcodeType: "CODE128",
		barcodeQuantity: 1,
	};

	addProduct: boolean = false;
	productImage: any = "";
	openAddVariant: boolean = false;
	variants: VariantDTO[] = [];
	private defaultVariant: VariantDTO = {
		name: "",
		price: 1,
		quantity: 1,
		sku: "",
		id: 0,
		color: "",
		size: "Regular",
	};
	newVariant = structuredClone(this.defaultVariant);
	branches: any[] = [
		{ label: "HQT", value: "headquarter" },
		{ label: "wuse", value: "Wuse" },
	];

	discountTypes: any[] = [];
	discountType: string[] = [];
	periodicDiscount: { startDate: string; endDate: string } = {
		startDate: "",
		endDate: "",
	};
	quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
	addSuccessfull: boolean = false;

	selectedBranch: any[] = [];
	selectedCategory: string = "";
	openCategories: boolean = false;
	openAddCategory: boolean = false;
	newCategory: string = "";
	categories: any[] = [];
	configureBarcode: boolean = false;
	barcodes: any[] = [
		{ label: "CODE128 ", value: "CODE128" },
		{ label: "CODE128 A/B/C", value: "CODE128" },
		{ label: "EAN-13", value: "EAN13" },
		{ label: "EAN-8", value: "EAN8" },
		{ label: "EAN-5", value: "EAN5" },
		{ label: "EAN-2", value: "EAN2" },
		{ label: "UPC (A)", value: "UPC" },
		{ label: "UPC (E)", value: "UPC" },
		{ label: "ITF", value: "ITF" },
		{ label: "ITF-14", value: "ITF14" },
		{ label: "MSI10", value: "MSI10" },
		{ label: "MSI11", value: "MSI11" },
		{ label: "MSI1010", value: "MSI1010" },
		{ label: "MSI1110", value: "MSI1110" },
	];
	constructor(
		private messageService: MessageService,
		private posService: PosServiceService,
		private industryDataService: IndustryDataService,
		private http: HttpClient,
	) {}
	ngOnInit(): void {
		this.loadCategory();
		this.getDiscountTypes();
	}
	getDiscountTypes() {
		this.posService.getDiscountTypes().subscribe(async (data) => {
			console.log(data);
			if (data) {
				this.discountTypes = data;
			} else {
				console.log("error loading data");
			}
		});
	}
	checkForEmptyFields(obj: any): boolean {
		return Object.values(obj).some(
			(value) => typeof value === "string" && value.trim() === "",
		);
	}
	onImageUpload(event: any) {
		const file = event.target.files[0];
		console.log(file);
		this.productData.image = file;

		if (file) {
			const reader = new FileReader();
			reader.onload = (e: any) => {
				this.productImage = e.target.result;
			};
			reader.readAsDataURL(file);
		}
	}

	deleteVariant(index: number) {
		this.variants.splice(index, 1);
	}
	loadCategory() {
		this.posService.getCategories().subscribe(async (data) => {
			console.log(data);
			if (data) {
				this.categories = data;
			} else {
				console.log("error loading data");
			}
		});
	}
	addCategory() {
		const categoryDetails = { ...this.categoryData };

		if (this.checkForEmptyFields(this.categoryData)) {
			console.log("all fiellds are required");
			this.messageService.add({
				severity: "error",
				summary: "warn",
				detail: "All fields are required",
				key: "tl",
				life: 3000,
			});
		} else {
			this.posService.addCategory(categoryDetails).subscribe(
				async (data) => {
					console.log(data);
					if (data) {
						this.messageService.add({
							severity: "success",
							summary: "Category Added",
							detail: "Category added successfully.",
							key: "tl",
							life: 3000,
						});
						this.loadCategory();
						this.categoryData = {
							name: "",
							code: "",
							description: "",
							endDate: "",
							id: 0,
						};
					} else {
						this.messageService.add({
							severity: "error",
							summary: "Failed",
							detail: "Failed, please try again.",
							key: "tl",
							life: 3000,
						});
					}
				},
				(error: HttpErrorResponse) => {
					if (error.status === 500) {
						this.messageService.add({
							severity: "error",
							summary: "Authentication Failed",
							detail: "Check form details and try again.",
							key: "tl",
							life: 3000,
						});
					} else if (error.status === 404) {
						this.messageService.add({
							severity: "error",
							summary: "Authentication Failed",
							detail: "Error, try again.",
							key: "tl",
							life: 3000,
						});
					} else if (error.status === 0) {
						this.messageService.add({
							severity: "error",
							summary: "Server Unreachable",
							detail:
								"Unable to connect to the server. Please check your internet connection.",
							key: "tl",
							life: 3000,
						});
					} else {
						this.messageService.add({
							severity: "error",
							summary: "Error",
							detail: "An unexpected error occurred.",
							key: "tl",
							life: 3000,
						});
					}
				},
			);
		}
	}
	removeCategory(id: number) {
		this.posService.deleteCategory(id).subscribe(async (data) => {
			if (data) {
				this.messageService.add({
					severity: "error",
					summary: "Failed",
					detail: "Failed to delete category.",
					key: "tl",
					life: 3000,
				});
			} else {
				this.loadCategory();
				this.messageService.add({
					severity: "success",
					summary: "Category deleted",
					detail: "Category deleted successfully.",
					key: "tl",
					life: 3000,
				});
			}
		});
	}
	selectCategory(category: any) {
		console.log(category);
		this.productData.category = category;
		console.log(this.productData.category);
	}

	toggleCategoryDropdown() {
		this.openCategories = !this.openCategories;
	}

	openGenerateBarcode() {
		this.configureBarcode = true;
		this.addSuccessfull = false;
	}

	generateBarcode() {
		const productCode: string = "5901234123457";

		const barcodeSvg = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg",
		);
		JsBarcode(barcodeSvg, productCode, {
			format: this.barcodeConfig.barcodeType,
			lineColor: "#000",
			width: 1,
			height: 50,
			displayValue: true,
		});

		this.convertSvgToPng(barcodeSvg);
	}

	convertSvgToPng(svgElement: Node) {
		const svgString = new XMLSerializer().serializeToString(svgElement);

		const encodedSvg = encodeURIComponent(svgString);

		const img = new Image();

		img.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);

			const imgData = canvas.toDataURL("image/png");
			this.generatePDF(imgData);
		};

		img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
	}

	generatePDF(imgData: string) {
		const pdf = new jsPDF({
			orientation: "portrait",
			unit: "px",
			format: "a4",
		});

		const pdfWidth = pdf.internal.pageSize.getWidth();
		const pdfHeight = (100 * pdfWidth) / 200;

		const padding = 10;
		const barcodeWidth = 150;
		const barcodeHeight = 50;
		const itemsPerRow = Math.floor((pdfWidth - 2 * padding) / pdfWidth);
		let currentX = padding;
		let currentY = padding;

		for (let i = 0; i < this.barcodeConfig.barcodeQuantity; i++) {
			pdf.addImage(
				imgData,
				"PNG",
				currentX,
				currentY,
				barcodeWidth,
				barcodeHeight,
			);

			currentX += pdfWidth;
			if ((i + 1) % itemsPerRow === 0) {
				currentX = padding;
				currentY += barcodeHeight + padding;
			}

			if (currentX + pdfWidth > pdf.internal.pageSize.getWidth()) {
				currentX = padding;
				currentY += pdfHeight + padding;
			}

			if (currentY + pdfHeight + padding > pdf.internal.pageSize.getHeight()) {
				pdf.addPage();
				currentX = padding;
				currentY = padding;
			}
		}

		pdf.save("barcodes.pdf");
	}

	closeEdit() {
		this.close.emit();
	}

	addVariant() {
		this.variants.push({ ...this.newVariant });

		this.newVariant = structuredClone(this.defaultVariant);

		this.openAddVariant = false;
	}

	get businessType() {
		return this.industryDataService.businessType;
	}
}
