import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';

@Component({
  selector: 'app-store-checkout',
  templateUrl: './store-checkout.component.html',
  styleUrls: ['./store-checkout.component.scss']
})
export class StoreCheckoutComponent implements OnInit {
  cartItems: Map<any, any> = new Map();
  subtotal: number = 0;
  isDelivery: boolean = false;
  deliveryFee: number = 1000;
  paymentMethod: string = 'cash';
  isLoading: boolean = false;

  deliveryInfo = {
    fullName: '',
    phoneNumber: '',
    address: '',
    instructions: ''
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService
  ) {}

  ngOnInit(): void {
    this.loadCartData();
  }

  loadCartData(): void {
    const cartData = this.cartService.getCart();
    this.cartItems = cartData.items;
    this.subtotal = cartData.subtotal;
    
    if (this.cartItems.size === 0) {
      this.router.navigate(['/pos-store']);
    }
  }

  get total(): number {
    return this.subtotal + (this.isDelivery ? this.deliveryFee : 0);
  }

  getProductImage(product: any) {
    return this.imageCacheService.getProductImage(product);
  }

  toggleDelivery(isDelivery: boolean): void {
    this.isDelivery = isDelivery;
  }

  canPlaceOrder(): boolean {
    if (this.isDelivery) {
      return !!this.deliveryInfo.fullName && 
             !!this.deliveryInfo.phoneNumber && 
             !!this.deliveryInfo.address &&
             !!this.paymentMethod;
    }
    return !!this.paymentMethod;
  }

  placeOrder(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const orderNumber = this.generateOrderNumber();
    const totalQuantity = Array.from(this.cartItems.values()).reduce(
      (total, item) => total + item.quantity, 0
    );

    // Prepare order items
    const orderItems = Array.from(this.cartItems.entries()).flatMap(([key, value]) => {
      const items: any[] = [];
      
      // Main product
      const mainItem = {
        productId: value.product.id,
        productName: value.product.name,
        quantity: value.quantity,
        unitPrice: value.product.sellingPrice,
        totalPrice: value.product.sellingPrice * value.quantity,
        selectedVariants: value.product.selectedVariants || []
      };
      items.push(mainItem);

      return items;
    });

    // Create the order payload
    const orderPayload = {
      orderNumber: orderNumber,
      orderStatus: 'CONFIRMED',
      totalAmount: this.total,
      quantity: totalQuantity,
      branchId: 1, // You'll need to get this from your store context
      deliveryMethod: this.isDelivery ? 'DELIVERY' : 'PICKUP',
      paymentMethod: this.paymentMethod.toUpperCase(),
      orderItems: orderItems,
      deliveryInfo: this.isDelivery ? this.deliveryInfo : null,
      createdDate: new Date().toISOString(),
      subtotal: this.subtotal,
      deliveryFee: this.isDelivery ? this.deliveryFee : 0
    };

    // For guest orders, we'll use the simplified approach
    const guestOrderData = {
      items: Array.from(this.cartItems.entries()).map(([key, value]) => ({
        productId: value.product.id,
        productName: value.product.name,
        quantity: value.quantity,
        price: value.product.sellingPrice,
        selectedVariants: value.product.selectedVariants
      })),
      subtotal: this.subtotal,
      deliveryFee: this.isDelivery ? this.deliveryFee : 0,
      total: this.total,
      deliveryMethod: this.isDelivery ? 'delivery' : 'pickup',
      paymentMethod: this.paymentMethod,
      deliveryInfo: this.isDelivery ? this.deliveryInfo : null,
      orderDate: new Date().toISOString()
    };

    this.cartService.placeOrder(guestOrderData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('Order placed successfully:', response);
        this.cartService.clearCart();
        
        const currentUuid = this.route.snapshot.paramMap.get('uuid');
        const orderId = response.orderId || orderNumber;
        
        this.router.navigate(['user/checkout/store', currentUuid, 'order-confirmation', orderId]);
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Order placement failed:', error);
        alert('Failed to place order. Please try again.');
      }
    });
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ORD-${timestamp}-${random}`.toUpperCase();
  }

  goBack(): void {
    this.router.navigate(['/pos-store']);
  }
}