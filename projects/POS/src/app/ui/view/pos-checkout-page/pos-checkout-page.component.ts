import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';

// import { UserComponent } from 'src/app/user.component';
import { RegisterService } from '../../service/register.service';
import { PosServiceService } from '../../service/pos-service.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { RandomTokenService } from '../../sharedComponent/service/random-token/random-token.service';
import { BusinessType, ProductCategories } from '../../models/enums';
import {
  Business,
  Cart,
  ProductData,
  VariantDTO,
} from '../../models/interface';
import { IndustryDataService } from '../../service/industry-data.service';
import { MetadataService } from '../../service/metadata.service';
import { CheckoutService } from '../../service/checkout.service';
import { MessageService } from 'primeng/api';
import { lastValueFrom } from 'rxjs';
// import { AppResizeDirective } from '../../service/app-resize.directive';

@Component({
  selector: 'app-pos-checkout-page',
  templateUrl: './pos-checkout-page.component.html',
  styleUrl: './pos-checkout-page.component.scss',
  providers: [],
})
export class PosCheckoutPageComponent implements OnInit, Business {
  // Register State Management
  showOpenRegisterModal = true;
  showCloseRegisterModal = false;
  openingAmount: number | null = null;
  closingAmount: number | null = null;
  isRegisterOpened = false;
  closingTotal: number = 0;
  expectedBalance: number = 0;
  denominationCounts: { [key: number]: number } = {};
  openingTotal: number = 0;
  errorMessage: string | null = null;
  canFinalize: boolean = false;

  openRegisterModal: boolean = true;

  scannedSKU: string = '';
  register: string = 'open';
  orderName: string = '';
  itemUpdateModal: boolean = false;
  productThatNeedsUpdate: number = 0;
  discountModal: boolean = false;
  saveModal: boolean = false;
  categories = [];
  products: ProductData[] = [];
  categorizedProducts: ProductData[] = [];
  shownProducts: ProductData[] = [];
  cartWidth = 300; // Default width of cart
  resizing = false;
  subtotal: number = 0.0;
  tax: number = 0.0;
  discount: number = 0.0;
  productDiscount: number = 0.0;
  total: number = 0.0;
  cartItems: typeof this.products = [];
  count: number = 1;
  selectedCategory: string = 'Category';
  readonly stateOptions = [
    { label: '₦', value: 'naira' },
    { label: '%', value: 'percentage' },
  ] as const;
  readonly discountOptions = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '15', value: 15 },
  ] as const;
  discountValue: number = 0;
  displayedDiscount: number = 0;
  productDiscountValue: number = 0;
  value: 'naira' | 'percentage' = 'naira';

  orders: unknown[] = [];
  navigationState: { order: any; cart?: Cart };
  isNotesModalOpen = false;
  isDeliveryModalOpen = false;
  isAllPaymentsModalOpen = false;

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private randomTokenService: RandomTokenService,
    public metadataService: MetadataService,
    private registerService: RegisterService,
    private messageService: MessageService,
    private posService: PosServiceService,
    private checkoutService: CheckoutService,
    private industryDataService: IndustryDataService
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras
      .state as typeof this.navigationState;
  }

  ngOnInit() {
    // Register initialization
    this.checkRegisterState();

    const storedOpeningAmount = localStorage.getItem('openingAmount');
    this.openingAmount = storedOpeningAmount ? Number(storedOpeningAmount) : 0;

    if (this.navigationState?.order) {
      this.loadOrder(this.navigationState.order);
    }
    if (this.navigationState?.cart) {
      const cart = this.navigationState.cart;
      console.log(cart)

      this.cartItems = [...cart.cartItems];
      this.total = cart.total;
      this.displayedDiscount = cart.discount;
      this.tax = cart.tax;
      this.subtotal = cart.subtotal;
    }
    // this.metadataService.fetchMetaData();
    this.getProducts();
    this.loadCategory();
  }

  // New Register Methods
  checkRegisterState() {
    const registerState = localStorage.getItem('registerState');
    if (registerState) {
      this.isRegisterOpened = JSON.parse(registerState);
      this.showOpenRegisterModal = !this.isRegisterOpened;
    }
  }
  calculateOpeningTotal(): void {
    // Calculate the total from cash denominations
    const denomTotal = Object.entries(this.denominationCounts).reduce(
      (sum, [denom, count]) => sum + Number(denom) * (count || 0),
      0
    );

    this.openingTotal = denomTotal;

    // Validate totals
    if (this.openingTotal !== this.openingAmount) {
      this.errorMessage =
        'Mismatch: The cash count total does not match the opening amount.';
    } else {
      this.errorMessage = null; // Clear the error if everything matches
    }

    // Enable or disable the confirm button
    this.canFinalize = !this.errorMessage;
  }

  confirmOpeningRegister(): void {
    this.calculateOpeningTotal(); // Ensure the opening total is calculated
    if (this.errorMessage) {
      return; // Prevent confirmation if there is an error
    }

    if (this.openingAmount !== null && this.openingAmount >= 0) {
      if (this.openingTotal !== this.openingAmount) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'The total from cash denominations must equal the opening amount.',
          key: 'tl',
          life: 3000,
        });
        return; // Prevent the register from opening
      }

      this.isRegisterOpened = true;
      this.showOpenRegisterModal = false;
      localStorage.setItem('registerState', 'true');
      localStorage.setItem('openingAmount', this.openingAmount.toString());
    }
  }

  confirmClosingRegister(): void {
    const openingAmount = Number(localStorage.getItem('openingAmount')) || 0; // Retrieve the opening amount
    const salesTotal = this.total; // Use the existing cart total
    this.expectedBalance = openingAmount + salesTotal; // Calculate the expected balance

    if (this.closingAmount !== null) {
      this.closingTotal = this.calculateClosingTotal();
      this.isRegisterOpened = false;
      this.showCloseRegisterModal = false;

      // Pass openingAmount to the closing modal
      console.log('Opening Amount:', this.openingAmount);
      console.log('Closing Amount:', this.closingAmount);

      localStorage.setItem('registerState', 'false');
      // Add API call here if needed
    }
  }

  // Add this new calculation method
  private calculateClosingTotal(): number {
    const openingAmount = Number(localStorage.getItem('openingAmount')) || 0;
    const salesTotal = this.total; // Using your existing cart total
    this.expectedBalance = openingAmount + salesTotal;
    return this.closingAmount! - this.expectedBalance;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    console.log(this.scannedSKU.trim());
    if (event.key === 'Enter' && this.scannedSKU.trim() !== '') {
      this.processScannedSKU();
      this.scannedSKU = '';
    } else {
      this.scannedSKU += event.key;
    }
  }

  processScannedSKU() {
    let product = this.categorizedProducts.find(
      (item) => item.sku === this.scannedSKU.trim()
    );

    if (product) {
      this.addToCart(product);
      return;
    }

    for (const item of this.categorizedProducts) {
      if (item.variants && Array.isArray(item.variants)) {
        const variant = item.variants.find(
          (v) => v.sku === this.scannedSKU.trim()
        );
        if (variant) {
          this.addToCart(item, variant);
          return;
        }
      }
    }

    console.log('Product not found');
  }

  loadOrder(order: any) {
    console.log(order);
    this.cartItems = this.buildCartFromOrders(order.orderItem)
    // this.cartItems = order.orderItems.map((item: any) => ({ ...item }));
    console.log(this.cartItems)
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
        const variants = orders.filter((v: any) =>
          v.productVariant &&
          item.product &&
          v.product.id === item.product.id
        );
    
        const selectedVariants = variants.map((v: any) => ({
          ...v.productVariant,
          selectedQuantity: v.quantity,
        }));
    
        const variantTotal = selectedVariants.reduce(
          (sum: number, variant: any) => sum + (variant.price * variant.selectedQuantity),
          0
        );
    
        const itemTotal = parseFloat(item.product.sellingPrice) * parseFloat(item.quantity);
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
      0
    );
  
    const taxRate = 0.1; // example: 10%
    const tax = subtotal * taxRate;
    const discount = 0;
    const total = subtotal + tax;
  
return  groupedCartItems as any

    // console.log( this.navigationState.order.cart)
  }
  getLabelForValue(value: string): string {
    const option = this.stateOptions.find((opt) => opt.value === value);
    return option ? option.label : '';
  }
  addToCart(product: ProductData, chosenVariant?: VariantDTO) {
    if (!this.cartItems) this.cartItems = [];

    let existingItem = this.cartItems.find(
      (item) => item.name === product.name
    );

    if (chosenVariant) {
      if (!existingItem) {
        existingItem = { ...product, selectedVariants: [] };
        this.cartItems.push(existingItem);
      }

      let existingVariant = existingItem?.selectedVariants.find(
        (v) => v.id === chosenVariant.id
      );

      if (existingVariant) {
        existingVariant.selectedQuantity =
          (existingVariant.selectedQuantity || 0) + 1;
      } else {
        existingItem?.selectedVariants.push({
          ...chosenVariant,
          selectedQuantity: 1,
        });
      }
    } else {
      if (existingItem) {
        existingItem.count += 1;
        existingItem.cartPriceTotal = (
          existingItem.count * parseInt(existingItem.sellingPrice || '0')
        ).toString();
      } else {
        product.count = 1;
        product.cartPriceTotal = product.sellingPrice || '0';
        this.cartItems.push({ ...product, selectedVariants: [] });
      }
    }

    // this.calculateProductDiscount();
    this.calculateTotals();
    this.calculateDiscount();

    console.log(this.cartItems);
  }

  deleteCartItem(index: number, isVariant?: boolean, variantIndex?: number) {
    if (isVariant) {
      this.cartItems[index].selectedVariants.splice(variantIndex!, 1);
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
      let itemTotal = (item.count ?? 0) * parseFloat(item.sellingPrice || '0');
      // let itemTotal =0
      let variantsTotal = (item.selectedVariants ?? []).reduce(
        (variantAcc, variant) =>
          variantAcc +
          (variant.selectedQuantity ?? 0) * (Number(variant.price) || 0),
        0
      );

      return acc + itemTotal + variantsTotal;
    }, 0);

    const productDiscount = this.cartItems.reduce(
      (acc, item) => acc + (item.discountedPrice || 0),
      0
    );
    this.displayedDiscount = this.discount + productDiscount;

    this.tax = this.subtotal * 0.1;

    this.total = this.subtotal + this.tax - this.displayedDiscount;
  }

  handleCountChange(newCount: number, index: number, variant?: any) {
    this.cartItems[index].cartPriceTotal = (
      parseInt(this.cartItems[index]?.sellingPrice || '0') * newCount
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
    if (this.value == 'naira') {
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
    if (this.value === 'percentage' && value > 100) {
      this.discountValue = 100;
    } else if (this.value === 'naira' && value > this.subtotal) {
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
    if (this.value == 'percentage' && discount > 100) {
      this.discountValue = 100;
    } else if (this.value == 'naira' && discount > this.subtotal) {
      this.discountValue = this.subtotal;
    } else if (discount < 0) {
      this.discountValue = 0;
    }
  }

  get _productDiscountValue(): number {
    return this.productDiscountValue;
  }

  set _productDiscountValue(value: number) {
    if (this.value === 'percentage' && value > 100) {
      this.productDiscountValue = 100;
    } else if (this.value === 'naira' && value > this.subtotal) {
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

  saveCurrentCartItem() {
    console.log(this.cartItems);
    const now = new Date().toISOString();

    const pausedCart = {
      id: 0,
      orderNumber: this.randomTokenService.getRandomToken(),
      orderStatus: 'UNPAID',
      updatedAt: now,
      createdDate: now,
      totalAmount: this.total,
      amountTendered: 0,
      quantity: 0,
      customerId: 1,
      branchId: 1,
      cashier: 67,
      orderItem: this.cartItems
        .map((item) => {
          let orderItems = [
            {
              totalPrice: item.count * parseInt(item.sellingPrice || '0'),
              quantity: item.count,
              productId: item.id,
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
                  productVariantId: variant.id,
                } as { totalPrice: number; quantity: number; productId: number; productVariantId: number | null });
              }
            });
          }

          return orderItems;
        })
        .flat(),
    };

    console.log(pausedCart);

    this.checkoutService.saveOrder(pausedCart).subscribe({
      next: (data) => {
        console.log(data);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Saved',
          key: 'tl',
          life: 3000,
        });
      },
    });

    this.cartItems = [];
    this.orderName = '';
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

  processPayment(modes: string[]) {
    if (this.cartItems.length === 0) return;

    const cart = {
      cartItems: [...this.cartItems],
      total: this.total,
      discount: this.displayedDiscount,
      tax: this.tax,
      subtotal: this.subtotal,
      paymentModes: modes,
    };
    const cashPayment = this.navigationLink.getLink('cashPayment');
    this.router.navigate([cashPayment], { state: { cart } });
  }

  // Filters the displayed items based on the selected value in the select element
  filterItems(event: Event) {
    const filterVal = (event.target as HTMLSelectElement | HTMLButtonElement)
      .value as ProductCategories;
    this.selectedCategory = filterVal;
    // No category is selected, reset
    if (filterVal == ProductCategories.NONE) {
      this.categorizedProducts = this.products;
      this.shownProducts = this.categorizedProducts;
      return;
    }

    this.categorizedProducts = this.products.filter(
      (val) => val.productCategory.name == filterVal
    );

    this.shownProducts = this.categorizedProducts;
  }

  closeRegister() {
    this.showCloseRegisterModal = true;
  }
  toggleNotesModal() {
    this.isNotesModalOpen = !this.isNotesModalOpen;
  }
  toggleDeliveryModal() {
    this.isDeliveryModalOpen = !this.isDeliveryModalOpen;
  }
  toggleAllPaymentsModal() {
    this.isAllPaymentsModalOpen = !this.isAllPaymentsModalOpen;
  }
  getProducts() {
    this.metadataService.enrichedProduct$.subscribe(async (data) => {
      if (data) {
        console.log(data)
        const p = data.sort((a: any, b: any) => {
          const dateA = new Date(
            a.createdDate[0],
            a.createdDate[1] - 1,
            a.createdDate[2],
            a.createdDate[3],
            a.createdDate[4],
            a.createdDate[5]
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5]
          );
          return dateB.getTime() - dateA.getTime();
        }) as any[];
        this.products = [...p];
        this.products.forEach((product) => {
          // Add some extra necessary properties
          product.count = 0;
          // product.cartPriceTotal = product.effectivePrice;
        });
        console.log(this.products);
        this.categorizedProducts = this.products;
        this.shownProducts = this.products;
      };
      // If there are no enriched products, this would just be an empty array which is *technically* truthy
      if (data?.length) {
        func(data);
      } else {
        console.log(
          'error loading enriched products. Fallback to regular products'
        );
        this.posService.getProducts().subscribe((data) => {
          func(data);
        });
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
        console.log('error loading categories. Fallback to regular fetching');
        this.posService.getCategories().subscribe((data) => {
          //@ts-expect-error
          this.categories = data.map((category) => category.name);
        });
      }
    });
  }
  get productDataFromClickedProduct() {
    return this.products.find(
      (product) => product.id === this.productThatNeedsUpdate
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

    document.addEventListener('mousemove', this.resize);
    document.addEventListener('mouseup', this.stopResizing);
  }

  resize = (event: MouseEvent) => {
    if (this.resizing) {
      const newWidth = window.innerWidth - event.clientX;
      this.cartWidth = Math.max(200, Math.min(600, newWidth));
    }
  };

  stopResizing = () => {
    this.resizing = false;
    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResizing);
  };
}
function func(data: any[]) {
  throw new Error('Function not implemented.');
}

