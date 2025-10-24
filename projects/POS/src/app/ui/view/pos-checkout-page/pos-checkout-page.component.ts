import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from "@angular/core";
import { Router } from "@angular/router";
// import { UserComponent } from 'src/app/user.component';
import { RegisterService } from "../../service/register.service";
import { PosServiceService } from "../../service/pos-service.service";
import { NavigationLinksService } from "../../sharedComponent/service/navigation-links/navigation-links.service";
import { RandomTokenService } from "../../sharedComponent/service/random-token/random-token.service";
import { BusinessType, ProductCategories } from "../../models/enums";
import {
  Business,
  Cart,
  Order,
  PaymentModes,
  ProductData,
  VariantDTO,
} from "../../models/interface";
import { IndustryDataService } from "../../service/industry-data.service";
import { MetadataService } from "../../service/metadata.service";
import { CheckoutService } from "../../service/checkout.service";
import { MessageService } from "primeng/api";
import { firstValueFrom, lastValueFrom } from "rxjs";
import { PaymentServiceService } from "../../service/payment-service.service";
import { OfflineService } from "../../service/offline.service";
// import { AppResizeDirective } from '../../service/app-resize.directive';

@Component({
  selector: "app-pos-checkout-page",
  templateUrl: "./pos-checkout-page.component.html",
  styleUrl: "./pos-checkout-page.component.scss",
  providers: [],
})
export class PosCheckoutPageComponent implements OnInit, Business {
  // Register State Management
  isNotePresent = false;
  openingAmount: number = 0;
  closingAmount: number | null = null;
  isRegisterOpened = false;
  closingTotal: number = 0;
  expectedBalance: number = 0;
  denominationCounts: { [key: number]: number } = {};
  openingTotal: number = 0;
  errorMessage: string | null = null;
  canFinalize: boolean = false;
  draftOrders: any[] = []
  openRegisterModal: boolean = true;
  openDraftsModal: boolean = false; 
  scannedSKU: string = "";
  register: string = "open";
  orderName: string = "";
  itemUpdateModal: boolean = false;
  productThatNeedsUpdate: number = 0;
  discountModal: boolean = false;
  saveModal: boolean = false;
  categories = [];
  products: ProductData[] = [];
  categorizedProducts: ProductData[] = [];
  shownProducts: ProductData[] = [];
  cartWidth = 300;
  resizing = false;
  subtotal: number = 0.0;
  tax: number = 0.0;
  discount: number = 0.0;
  productDiscount: number = 0.0;
  total: number = 0.0;
  cartItems: typeof this.products = [];
  count: number = 1;
  selectedCategory: string = "Category";
  readonly stateOptions = [
    { label: "₦", value: "naira" },
    { label: "%", value: "percentage" },
  ] as const;
  readonly discountOptions = [
    { label: "5", value: 5 },
    { label: "10", value: 10 },
    { label: "15", value: 15 },
  ] as const;
  discountValue: number = 0;
  displayedDiscount: number = 0;
  productDiscountValue: number = 0;
  value: "naira" | "percentage" = "naira";
  rowsPerPage = 15
  orders: unknown[] = [];
  navigationState: { order: any; cart?: Cart };
  isNotesModalOpen = false;
  isDeliveryModalOpen = false;
  isAllPaymentsModalOpen = false;
  isCategorySidebarOpen = false;
  selectedPaymentModes: PaymentModes[] = [];
  noteText: string = '';
  globalSearchResults: any[] = [];
  globalSearchQuery: string = '';
  isSearching: boolean = false;
  searchError: string | null = null;
  
  // NEW: Cache for local products by ID for quick lookup
  private localProductCache: Map<number, ProductData> = new Map();

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private randomTokenService: RandomTokenService,
    public metadataService: MetadataService,
    private registerService: RegisterService,
    private messageService: MessageService,
    private posService: PosServiceService,
    private checkoutService: CheckoutService,
    private industryDataService: IndustryDataService,
    private _paymentService: PaymentServiceService,
    private offlineService: OfflineService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras
      .state as typeof this.navigationState;
  }

  ngOnInit() {
    this.checkAndResetNotes();
    const navState = this.router.getCurrentNavigation()?.extras.state ?? history.state;

    if (navState?.["paymentSuccess"]) {
      this.clearCart();
      this.router.navigate([], { replaceUrl: true });
    }

    const storedOpeningAmount = localStorage.getItem("openingAmount");
    this.openingAmount = storedOpeningAmount ? Number(storedOpeningAmount) : 0;

      if (this.navigationState?.order) {
        this.loadOrder(this.navigationState.order);
      }
      if (this.navigationState?.cart) {
        const cart = this.navigationState.cart;
        this.cartItems = [...cart.cartItems];
        this.total = cart.total;
        this.displayedDiscount = cart.discount;
        this.tax = cart.tax;
        this.subtotal = cart.subtotal;
      }
      
      // Check for the paymentSuccess flag from the router state
      if (this.router.getCurrentNavigation()?.extras.state?.["paymentSuccess"]) {
        this.clearCart();
        this.router.navigate([], { replaceUrl: true }); // Clear the state from the URL
      }
    console.log("payment success",this.router.getCurrentNavigation()?.extras.state?.["paymentSuccess"])
    // Check for the paymentSuccess flag from the router state
   
    
    this.getProducts();
    this.loadCategory();
    this.getDraftOrders();
  }

  // Add a new method to clear the cart
  clearCart() {
    this.cartItems = [];
    this.subtotal = 0;
    this.tax = 0;
    this.discount = 0;
    this.total = 0;
    this.orderName = '';
    this.discountValue = 0;
    this.displayedDiscount = 0;
    localStorage.removeItem("currentCart"); 
  }

 
  checkAndResetNotes() {
    const noteData = localStorage.getItem('orderNote');
    if (noteData) {
      const { note, timestamp } = JSON.parse(noteData);
      const savedTime = new Date(timestamp).getTime();
      const currentTime = new Date().getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (currentTime - savedTime > twentyFourHours) {
        localStorage.removeItem('orderNote');
        this.noteText = ''; // Clear note text on expiry
        this.isNotePresent = false;
      } else {
        this.noteText = note; // Load note text
        this.isNotePresent = true;
      }
    } else {
      this.noteText = '';
      this.isNotePresent = false;
    }
  }

  toggleCategorySidebar() {
    this.isCategorySidebarOpen = !this.isCategorySidebarOpen;
  }
  @HostListener("window:keydown", ["$event"])
  handleKeyDown(event: KeyboardEvent) {
    console.log(this.scannedSKU.trim());
    if (event.key === "Enter" && this.scannedSKU.trim() !== "") {
      this.processScannedSKU();
      this.scannedSKU = "";
    } else {
      this.scannedSKU += event.key;
    }
  }

  processScannedSKU() {
    let product = this.categorizedProducts.find(
      (item) => item.code === this.scannedSKU.trim(),
    );

    if (product) {
      this.addToCart(product);
      return;
    }

    for (const item of this.categorizedProducts) {
      if (item.variants && Array.isArray(item.variants)) {
        const variant = item.variants.find(
          (v) => v.sku === this.scannedSKU.trim(),
        );
        if (variant) {
          this.addToCart(item, variant);
          return;
        }
      }
    }

    console.log("Product not found");
  }

  loadOrder(order: any) {
    console.log(order);
    this.cartItems = this.buildCartFromOrders(order.orderItem);
    // this.cartItems = order.orderItems.map((item: any) => ({ ...item }));
    console.log(this.cartItems);
    this.discount = order.cartDiscount | 0;
    this.discountValue = order.discountValue;
    this.value = order.value;
    this.total = order.totalAmount;
    this.calculateTotals();
  }

  buildCartFromOrders(orders: any): any {
    const groupedCartItems: any[] = [];

    orders.forEach((item: any) => {
      if (!item.productVariant) {
        // Only match variants with the same product.id
        const variants = orders.filter(
          (v: any) =>
            v.productVariant && v.product && v.product.id === item.product.id,
        );

        const selectedVariants = variants.map((v: any) => ({
          ...v.productVariant,
          selectedQuantity: v.quantity,
        }));

        const variantTotal = selectedVariants.reduce(
          (sum: number, variant: any) =>
            sum + variant.price * variant.selectedQuantity,
          0,
        );

        const itemTotal =
          parseFloat(item.product.sellingPrice) * parseFloat(item.quantity);
        const cartPriceTotal = itemTotal + variantTotal;

        groupedCartItems.push({
          orderId: item.id,
          ...item.product,
          count: item.quantity,
          selectedVariants,
          cartPriceTotal: itemTotal,
        });
      }
    });

    const subtotal = groupedCartItems.reduce(
      (sum, item) => sum + parseFloat(item.cartPriceTotal),
      0,
    );

    const taxRate = 0.1; // example: 10%
    const tax = subtotal * taxRate;
    const discount = 0;
    const total = subtotal + tax;

    return groupedCartItems as any;
  }
  getLabelForValue(value: string): string {
    const option = this.stateOptions.find((opt) => opt.value === value);
    return option ? option.label : "";
  }
addToCart(product: ProductData, chosenVariant?: VariantDTO) {
  if (!this.cartItems) this.cartItems = [];

  let existingItem = this.cartItems.find(
    (item) => item.name === product.name,
  );

  if (chosenVariant) {
    // Check variant inventory
    const currentVariantQuantity = existingItem?.selectedVariants?.find(v => v.id === chosenVariant.id)?.selectedQuantity || 0;
    
    if (currentVariantQuantity >= (chosenVariant.quantity || 0)) {
      this.messageService.add({
        severity: "warn",
        summary: "Out of Stock",
        detail: `${chosenVariant.name} is out of stock`,
        key: "tl",
        life: 3000,
      });
      return;
    }

    if (!existingItem) {
      existingItem = { ...product, selectedVariants: [] };
      this.cartItems.push(existingItem);
    }

    let existingVariant = existingItem?.selectedVariants?.find(
      (v) => v.id === chosenVariant.id,
    );

    if (existingVariant) {
      existingVariant.selectedQuantity =
        (existingVariant.selectedQuantity || 0) + 1;
    } else {
      existingItem?.selectedVariants?.push({
        ...chosenVariant,
        selectedQuantity: 1,
      });
    }
  } else {
    // Check main product inventory
    const currentCartQuantity = existingItem?.count || 0;
    
    //To prevent adding out-of-stock items to the cart.
    if (product.quantity <= 0) {
       this.messageService.add({
        severity: "warn",
        summary: "Out of Stock",
        detail: `${product.name} is out of stock and cannot be added to cart.`,
        key: "tl",
        life: 3000,
      });
      return;
    }

    if (currentCartQuantity >= product.quantity) {
      this.messageService.add({
        severity: "warn",
        summary: "Out of Stock",
        detail: `${product.name} is out of stock`,
        key: "tl",
        life: 3000,
      });
      return;
    }

    if (existingItem) {
      existingItem.count += 1;
      existingItem.cartPriceTotal = (
        existingItem.count * parseInt(existingItem.sellingPrice || "0")
      ).toString();
    } else {
      product.count = 1;
      product.cartPriceTotal = product.sellingPrice || "0";
      this.cartItems.push({ ...product, selectedVariants: [] });
    }
  }

  this.calculateTotals();
  this.calculateDiscount();
  console.log(this.cartItems);
}

  deleteCartItem(index: number, isVariant?: boolean, variantIndex?: number) {
    if (isVariant) {
      this.cartItems[index].selectedVariants?.splice(variantIndex!, 1);
    } else {
      this.resetProductDiscount(index);
      this.cartItems[index].count = 0;
      this.cartItems.splice(index, 1);
    }

    this.calculateTotals();
    this.calculateDiscount();

    if (this.cartItems.length === 0) {
      this.resetDiscount();
    }
  }

  resetProductDiscount(index: number) {
    this.cartItems[index].discountedPrice = 0.0;
    this.productDiscountValue = 0;
  }

  resetDiscount() {
    this.discount = 0.0;
    this.discountValue = 0;
  }

  openItemUpdateModal(index: any) {
    this.itemUpdateModal = true;
    console.log(index);
    this.productThatNeedsUpdate = index;
  }

  calculateTotals() {
    console.log(this.cartItems);

    this.subtotal = this.cartItems.reduce((acc, item) => {
      let itemTotal = (item.count ?? 0) * parseFloat(item.sellingPrice || "0");
      // let itemTotal =0
      let variantsTotal = (item.selectedVariants ?? []).reduce(
        (variantAcc, variant) =>
          variantAcc +
          (variant.selectedQuantity ?? 0) * (Number(variant.price) || 0),
        0,
      );

      return acc + itemTotal + variantsTotal;
    }, 0);

    const productDiscount = this.cartItems.reduce(
      (acc, item) => acc + (item.discountedPrice || 0),
      0,
    );
    this.displayedDiscount = this.discount + productDiscount;

    this.tax = this.cartItems.reduce((sum, item) => {
      let itemTotal = (item.count ?? 0) * parseFloat(item.sellingPrice || "0");

      let variantsTotal = (item.selectedVariants ?? []).reduce(
        (variantAcc, variant) =>
          variantAcc +
          (variant.selectedQuantity ?? 0) * (Number(variant.price) || 0),
        0,
      );

      let subtotal = itemTotal + variantsTotal;

      let taxRate = item.tax?.rate || item.product?.tax?.rate || 0;

      return sum + (taxRate / 100) * subtotal;
    }, 0);

    this.total = this.subtotal + this.tax - this.displayedDiscount;
  }

  handleCountChange(newCount: number, index: number, variant?: any) {
    this.cartItems[index].cartPriceTotal = (
      parseInt(this.cartItems[index]?.sellingPrice || "0") * newCount
    ).toString();
    this.calculateDiscount();
    // this.calculateProductDiscount();
    this.calculateTotals();
  }

  toggleDiscountModal() {
    if (this.cartItems.length > 0) {
      this.discountModal = !this.discountModal;
    }
  }

  calculateDiscount() {
    if (this.value == "naira") {
      this.discount = Number(this.discountValue);
    } else {
      const discountedValue =
        (this.subtotal * Number(this.discountValue)) / 100;
      this.discount = discountedValue;
    }
    this.calculateTotals();
    this.discountModal = false;
  }

  get _discountValue(): number {
    return this.discountValue;
  }

  set _discountValue(value: number) {
    if (this.value === "percentage" && value > 100) {
      this.discountValue = 100;
    } else if (this.value === "naira" && value > this.subtotal) {
      this.discountValue = this.subtotal;
    } else if (value < 0) {
      this.discountValue = 0;
    } else {
      this.discountValue = value;
    }
    // this.calculateDiscount();
  }
  validateDiscountValue() {
    const discount = Number(this.discountValue);
    if (this.value == "percentage" && discount > 100) {
      this.discountValue = 100;
    } else if (this.value == "naira" && discount > this.subtotal) {
      this.discountValue = this.subtotal;
    } else if (discount < 0) {
      this.discountValue = 0;
    }
  }

  get _productDiscountValue(): number {
    return this.productDiscountValue;
  }

  set _productDiscountValue(value: number) {
    if (this.value === "percentage" && value > 100) {
      this.productDiscountValue = 100;
    } else if (this.value === "naira" && value > this.subtotal) {
      this.productDiscountValue = this.subtotal;
    } else if (value < 0) {
      this.productDiscountValue = 0;
    } else {
      this.productDiscountValue = value;
    }
    // this.calculateDiscount();
  }

  calculateProductDiscount() {
    for (let item of this.cartItems) {
      // if (item.discount.value > 0) {
      //   if (item.discount.discountType.name === 'naira') {
      //     item.discountedPrice = Number(item.discount.value);
      //   } else {
      //     item.discountedPrice =
      //       (parseInt(item.cartPriceTotal) * Number(item.discount.value)) / 100;
      //   }
      // }
    }

    this.calculateTotals();
    this.itemUpdateModal = false;
  }

  async saveCurrentCartItem() {
    console.log(this.cartItems);
    const now = new Date().toISOString();
    const branchId = await firstValueFrom(this.metadataService.selectedBranchId$);

    const pausedCart = {
      id: 0,
      orderNumber: this.randomTokenService.getRandomToken(),
      orderStatus: "UNPAID",
      updatedAt: now,
      createdDate: now,
      totalAmount: this.total,
      amountTendered: 0,
      quantity: 0,
      // customerId: 1,
      branchId: branchId,
      cashier:  Number(sessionStorage.getItem("userid")),
      orderItem: this.cartItems
        .map((item) => {
          let orderItems = [
            {
              totalPrice: item.count * parseInt(item.sellingPrice || "0"),
              quantity: item.count,
              productId: item.id,
              product: item
            },
          ];

          if (item.selectedVariants && item.selectedVariants.length > 0) {
            item.selectedVariants.forEach((variant) => {
              const selectedQuantity = variant.selectedQuantity ?? 0;
              const price = variant.price || 0;
              if (selectedQuantity > 0) {
                orderItems.push({
                  totalPrice: selectedQuantity * price,
                  quantity: selectedQuantity,
                  productId: item.id,
                  product: item,
                  productVariantId: variant.id,
                } as {
                  totalPrice: number;
                  quantity: number;
                  productId: number;
                  product: any
                  productVariantId: number | null;
                });
              }
            });
          }

          return orderItems;
        })
        .flat(),
    };

    console.log(pausedCart);

  //   if (!navigator.onLine) {
  //   await this.offlineService.addPendingPayment(pausedCart);
  //   this.messageService.add({
  //     severity: "info",
  //     summary: "Offline",
  //     detail: "Payment saved offline.",
  //     key: "tl",
  //     life: 5000,
  //   });
  //   this.cartItems = [];
  //   this.orderName = "";
  //   this.resetDiscount();
  //   this.resetProductProperties();
  //   return;
  // }

     await this.offlineService.addPendingTransactions(pausedCart as any)
        this.messageService.add({
          severity: "success",
          summary: "Success",
          detail: "Saved",
          key: "tl",
          life: 3000,
    });

    // this.checkoutService.saveOrder(pausedCart as any).subscribe({
    //   next: (res) => {
    //     this.messageService.add({
    //       severity: "success",
    //       summary: "Success",
    //       detail: "Cart saved successfully",
    //       key: "tl",
    //       life: 3000,
    //     });
    //     this.cartItems = [];
    //     this.orderName = "";
    //     this.resetDiscount();
    //     this.resetProductProperties();
    //   },
    //   error: (err) => {
    //     console.log(err)
    //   }
    // })

    this.cartItems = [];
    this.orderName = "";
    this.resetDiscount();
    this.resetProductProperties();

    this.saveModal = false;
  }

  resetProductProperties() {
    this.products.forEach((product) => {
      product.count = 0;
      // product.cartPriceTotal = product.effectivePrice;
      // product.discount.value = 0.0;
    });
  }

  // This new method handles the payment methods selected from the modal.
  onPaymentsConfirmed(modes: PaymentModes[]) {
    this.selectedPaymentModes = modes;
    this.isAllPaymentsModalOpen = false;
    this._paymentService.processPayment({
      paymentModes: modes,
      cartItems: [...this.cartItems],
      total: this.total,
      discount: this.displayedDiscount,
      tax: this.tax,
      subTotal: this.subtotal,
    });
  }

  // Filters the displayed items based on the selected value in the select element
  filterItems(event: Event) {
    const filterVal = (event.target as HTMLSelectElement | HTMLButtonElement)
      .value; 
    this.selectedCategory = filterVal;

    let filteredProducts: ProductData[] = [];
    if (filterVal === "Category") {
      filteredProducts = [...this.products];
    } else {
      filteredProducts = this.products.filter(
        (val) => val.productCategory.name === filterVal,
      );
    }

    // Sort products: in-stock first, then out-of-stock
    filteredProducts.sort((a, b) => {
      const aInStock = a.quantity > 0 ? 1 : 0;
      const bInStock = b.quantity > 0 ? 1 : 0;
      return bInStock - aInStock;
    });

    this.categorizedProducts = filteredProducts;
    this.shownProducts = this.categorizedProducts;
  }

  closeRegister() {
    this.registerService.triggerCloseRegister();
  }
  
  // MODIFIED: Added logic for opening, closing, and saving the note
  toggleNotesModal(open: boolean = !this.isNotesModalOpen, shouldSave: boolean = false) {
    if (open) {
      // OPEN: Load existing note (already done in ngOnInit and checkAndResetNotes)
      this.checkAndResetNotes();
      this.isNotesModalOpen = true;
    } else {
      // CLOSE: Handle saving if requested
      if (shouldSave) {
        if (this.noteText.trim() !== '') {
            const noteData = {
              note: this.noteText.trim(),
              timestamp: new Date().toISOString()
            };
            localStorage.setItem('orderNote', JSON.stringify(noteData));
            this.isNotePresent = true;
        } else {
            // If the user clicks save but the text is empty, clear the note
            this.clearNote(false);
        }
      } 
      // Close the modal regardless of saving
      this.isNotesModalOpen = false;
    }
  }
  
  // NEW: Method to clear the note
  clearNote(closeModal: boolean = true) {
      this.noteText = '';
      localStorage.removeItem('orderNote');
      this.isNotePresent = false;
      if (closeModal) {
          this.isNotesModalOpen = false;
      }
  }

  toggleDeliveryModal() {
    this.isDeliveryModalOpen = !this.isDeliveryModalOpen;
  }
  toggleAllPaymentsModal() {
    this.isAllPaymentsModalOpen = !this.isAllPaymentsModalOpen;
    const cart: Cart = {
      id: this.navigationState?.order?.id?.toString() || this.randomTokenService.getRandomToken(),
      orderId: this.navigationState?.order?.id || 0,
      cartItems: this.cartItems,
      subtotal: this.subtotal,
      tax: this.tax,
      discount: this.displayedDiscount,
      total: this.total,
      paymentModes: [],
      timestamp: new Date().toISOString()
    };
    // Save the current cart state to local storage before navigating
    localStorage.setItem("currentCart", JSON.stringify(cart));
  }
  
  //  Method to handle the global search event from the search bar 
  async handleGlobalSearch(query: string) {
  // 1. Clear previous state
  this.globalSearchResults = [];
  this.searchError = null;

  if (!query.trim()) {
    // Clear all state if query is empty
    this.globalSearchQuery = '';
    this.isSearching = false;
    return;
  }

  this.globalSearchQuery = query;
  this.isSearching = true;

  // Helper to get product details from local cache
  const getProductFromCache = (productId: number | undefined): { name: string, price: string } => {
    if (!productId) {
      return { name: 'Unknown Product', price: 'N/A' };
    }
    const product = this.localProductCache.get(productId);
    return {
      name: product?.name || `Product ID: ${productId}`,
      price: product?.sellingPrice || 'N/A'
    };
  };

  try {
    const results = await lastValueFrom(this.posService.getGlobalStockBySearch(query));

    this.globalSearchResults = (results as any[])?.map(result => {
      const cacheData = getProductFromCache(result.id || result.productId);

      //  API values but fallback to cache if missing
      const productName = result.name || result.product?.name || cacheData.name;
      const sellingPrice = result.sellingPrice || result.product?.sellingPrice || cacheData.price;

      return {
        productName,
        price: sellingPrice,  // selling price from payload
        branchName: result.branch?.name || `Branch ${result.branch?.id || 'Unknown'}`,
        address: result.branch?.address || 'Remote Location',
        quantity: result.quantity || 0,
        productId: result.id || result.productId
      };
    }) || [];

  } catch (error) {
    console.error("Global search failed:", error);
    this.searchError = "Could not retrieve global stock information. Please try again.";
  } finally {
    this.isSearching = false;
  }
}


  getProducts() {
    this.metadataService.enrichedProduct$.subscribe(async (data) => {
      if (data) {
        console.log(data);
        const p = data.sort((a: any, b: any) => {
          const dateA = new Date(
            a.createdDate[0],
            a.createdDate[1] - 1,
            a.createdDate[2],
            a.createdDate[3],
            a.createdDate[4],
            a.createdDate[5],
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5],
          );
          return dateB.getTime() - dateA.getTime();
        }) as any[];
      
      // Sort products: in-stock first, then out-of-stock
      p.sort((a, b) => {
        const aInStock = a.quantity > 0 ? 1 : 0;
        const bInStock = b.quantity > 0 ? 1 : 0;
        return bInStock - aInStock;
      });
      
      this.products = [...p];
      this.products.forEach((product) => {
        product.count = 0;
        this.localProductCache.set(product.id, product);
      });
      console.log(this.products);
      this.categorizedProducts = this.products;
      this.shownProducts = this.products;
      }
    });
  }
  loadCategory() {
    this.metadataService.category$.subscribe(async (data) => {
      // If there are no enriched products, this would just be an empty array which is *technically* truthy
      if (data?.length) {
        //@ts-expect-error
        this.categories = data.map((category) => category.name);
      } else {
        console.log("error loading categories. Fallback to regular fetching");
        this.posService.getCategories().subscribe((data) => {
          //@ts-expect-error
          this.categories = data.map((category) => category.name);
        });
      }
    });
  }
  get productDataFromClickedProduct() {
    return this.products.find(
      (product) => product.id === this.productThatNeedsUpdate,
    ) as ProductData;
  }

  get chosenProductVariants() {
    // NOTE: This is guaranteed to have a value since `onAddToCart()` will only indirectly clall this if there are any products.
    return this.productDataFromClickedProduct!.variants;
  }

  get businessType() {
    return this.industryDataService.businessType;
  }
  startResizing(event: MouseEvent) {
    this.resizing = true;

    document.addEventListener("mousemove", this.resize);
    document.addEventListener("mouseup", this.stopResizing);
  }

  resize = (event: MouseEvent) => {
    if (this.resizing) {
      const newWidth = window.innerWidth - event.clientX;
      this.cartWidth = Math.max(200, Math.min(600, newWidth));
    }
  };

  stopResizing = () => {
    this.resizing = false;
    document.removeEventListener("mousemove", this.resize);
    document.removeEventListener("mouseup", this.stopResizing);
  };

  formatDate(parts: any): Date | null {
    if (!parts) return null;
    if (Array.isArray(parts)) return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    if (typeof parts === 'string' || parts instanceof Date) {
      const d = new Date(parts);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  async deleteDraft(order: any) {
    await this.offlineService.removePendingTransaction(order.__dfKey)
  }

  async getDraftOrders() {
    this.offlineService.getPendingTransactions().subscribe((data) => {
     this.draftOrders = data 
    })
   }
   toggleDraftTransactionModal() {
     this.openDraftsModal = !this.openDraftsModal;
     if (this.openDraftsModal) {
       this.getDraftOrders();
     }
   
    }
    
    reOpenCart(order: any) {
      // const checkoutLink = this.navigationLink.getLink('checkoutLink');
      // this.router.navigate([checkoutLink], { state: { order } });
    console.log(order)
     this.loadOrder(order);
     this.deleteDraft(order);
     this.openDraftsModal = false;
      
  }

  clearAllDraftOrders(){
    this.offlineService.clearPendingTransactions();
  }


}