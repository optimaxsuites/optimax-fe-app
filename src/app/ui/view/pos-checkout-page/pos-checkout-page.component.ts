import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// import { UserComponent } from 'src/app/user.component';
import { RegisterService } from '../../service/register.service';
import { PosServiceService } from '../../service/pos-service.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { RandomTokenService } from '../../sharedComponent/service/random-token/random-token.service';
import { BusinessType, ProductCategories } from '../../models/enums';
import { Business, Cart, ProductData, VariantDTO } from '../../models/interface';
import { IndustryDataService } from '../../service/industry-data.service';

@Component({
  selector: 'app-pos-checkout-page',
  templateUrl: './pos-checkout-page.component.html',
  styleUrl: './pos-checkout-page.component.scss',
  providers: [],
})
export class PosCheckoutPageComponent implements OnInit, Business {
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

  subtotal: number = 0.0;
  tax: number = 0.0;
  discount: number = 0.0;
  productDiscount: number = 0.0;
  total: number = 0.0;
  cartItems: typeof this.products = [];
  count: number = 1;

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
    //  public userComponent: UserComponent,
    private registerService: RegisterService,
    private posService: PosServiceService,
    private industryDataService: IndustryDataService
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras
      .state as typeof this.navigationState;
  }

  ngOnInit() {
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
    this.getProducts();
    this.loadCategory();
  }
  loadOrder(order: any) {
    console.log(order);
    this.cartItems = order.cart.map((item: any) => ({ ...item }));
    this.discount = order.cartDiscount;
    this.discountValue = order.discountValue;
    this.value = order.value;
    this.total = order.total;
    this.calculateTotals();
  }

  getLabelForValue(value: string): string {
    const option = this.stateOptions.find((opt) => opt.value === value);
    return option ? option.label : '';
  }
  addToCart(product: (typeof this.products)[0], chosenVariant?: VariantDTO) {
 
  
    if (!this.cartItems) this.cartItems = [];
  
    let existingItem = this.cartItems.find((item) => item.name === product.name);
  
    if (chosenVariant) {
      if (!existingItem) {
        existingItem = { ...product, selectedVariants: [] };
        this.cartItems.push(existingItem);
      }
  
      let existingVariant = existingItem.selectedVariants.find(v => v.id === chosenVariant.id);
  
      if (existingVariant) {
        existingVariant.selectedQuantity = (existingVariant.selectedQuantity || 0) + 1;
      } else {
        existingItem.selectedVariants.push({ ...chosenVariant, selectedQuantity: 1 });
      }
  
      // existingItem.cartPriceTotal = existingItem.selectedVariants.reduce((acc, v) => acc + (v.price * v.selectedQuantity), 0);
    } else {
      if (existingItem) {
        existingItem.count += 1;
        existingItem.cartPriceTotal = (parseInt(existingItem.cartPriceTotal) + parseInt(product.effectivePrice)).toString();
      } else {
        product.count = 1;
        this.cartItems.push({ ...product, selectedVariants: [] });
        product.cartPriceTotal = product.effectivePrice.toString();
      }
    }
  
    // this.calculateProductDiscount();
    this.calculateTotals();
    this.calculateDiscount();
  
    console.log(this.cartItems);
  }

  deleteCartItem(index: number) {
    this.resetProductDiscount(index);

    this.cartItems[index].cartPriceTotal = this.cartItems[index].effectivePrice;
    this.cartItems[index].count = 0;
    this.cartItems.splice(index, 1);
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
    this.productThatNeedsUpdate = index;
  }

  calculateTotals() {
    console.log(this.cartItems)
    this.subtotal = this.cartItems.reduce((acc, item) => {
      if (item.selectedVariants && item.selectedVariants.length > 0) {
        return acc + item.selectedVariants.reduce(
          (variantAcc: number, variant: any) => variantAcc + (variant.selectedQuantity * variant.price), 
          0
        );
      } else {
        return acc + Number(item.cartPriceTotal); 
      }
    }, 0);
    const productDiscount = this.cartItems.reduce(
      (acc, item) => acc + (item.discountedPrice || 0),
      0
    );
    this.displayedDiscount = this.discount + productDiscount;
    this.tax = this.subtotal * 0.1;
    this.total = this.subtotal + this.tax - (this.discount + productDiscount);
  }

  handleCountChange(newCount: number, index: number, variant?: any) {
    this.cartItems[index].cartPriceTotal = (
      parseInt(this.cartItems[index].effectivePrice) * newCount
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
      if (item.discount.value > 0) {
        if (item.discount.discountType.name === 'naira') {
          item.discountedPrice = Number(item.discount.value);
        } else {
          item.discountedPrice =
            (parseInt(item.cartPriceTotal) * Number(item.discount.value)) / 100;
        }
      }
    }

    this.calculateTotals();
    this.itemUpdateModal = false;
  }

  saveCurrentCartItem() {
    const pausedCart = {
      name: this.orderName,
      cart: this.cartItems.map((item) => ({ ...item })),
      cartDiscount: this.discount,
      state: 'Open',
      total: this.total,
      discountValue: this.discountValue,
      value: this.value,
      timestamp: new Date().toLocaleString(),
      id: this.randomTokenService.getRandomToken(),
    };
    const savedItems = localStorage.getItem('savedItems');
    this.orders = savedItems ? JSON.parse(savedItems) : [];

    this.orders.push(pausedCart);
    localStorage.setItem('savedItems', JSON.stringify(this.orders));

    this.cartItems = [];
    this.orderName = '';
    this.resetDiscount();
    this.resetProductProperties();

    this.saveModal = false;
  }

  resetProductProperties() {
    this.products.forEach((product) => {
      product.count = 0;
      product.cartPriceTotal = product.effectivePrice;
      product.discount.value = 0.0;
    });
  }

  processCashPayment() {
    if (this.cartItems.length === 0) return;

    const cart = {
      cartItems: [...this.cartItems],
      total: this.total,
      discount: this.displayedDiscount,
      tax: this.tax,
      subtotal: this.subtotal,
    };
    const cashPayment = this.navigationLink.getLink('cashPayment');
    this.router.navigate([cashPayment], { state: { cart } });
  }

  // Filters the displayed items based on the selected value in the select element
  filterItems(event: Event) {
    const filterVal = (event.target as HTMLSelectElement | HTMLButtonElement)
      .value as ProductCategories;

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
    this.registerService.triggerCloseRegister();
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
    this.posService.getProducts().subscribe(async (data) => {
      if (data) {
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
          product.cartPriceTotal = product.effectivePrice;
        });
        console.log(this.products);
        this.categorizedProducts = this.products;
        this.shownProducts = this.products;
      } else {
        console.log('error loading data');
      }
    });
  }
  loadCategory() {
    this.posService.getCategories().subscribe(async (data) => {
      if (data) {
        //@ts-expect-error
        this.categories = data.map((category) => category.name);
      } else {
        console.log('error loading data');
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
}
