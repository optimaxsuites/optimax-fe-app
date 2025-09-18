import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; // Add ActivatedRoute
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

  deliveryInfo = {
    fullName: '',
    phoneNumber: '',
    address: '',
    instructions: ''
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute, // Add ActivatedRoute
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
    const orderData = {
      items: Array.from(this.cartItems.entries()).map(([key, value]) => ({
        productId: value.product.id,
        productName: value.product.name, // Add product name for display
        quantity: value.quantity,
        price: value.product.sellingPrice,
        selectedVariants: value.product.selectedVariants // Add variants if needed
      })),
      subtotal: this.subtotal,
      deliveryFee: this.isDelivery ? this.deliveryFee : 0,
      total: this.total,
      deliveryMethod: this.isDelivery ? 'delivery' : 'pickup',
      paymentMethod: this.paymentMethod,
      deliveryInfo: this.isDelivery ? this.deliveryInfo : null,
      orderDate: new Date().toISOString()
    };

    // Save order and clear cart
    this.cartService.placeOrder(orderData).subscribe({
      next: (response: any) => {
        // Get the current UUID from the route
        const currentUuid = this.route.snapshot.paramMap.get('uuid');
        
        // Navigate to order confirmation with the new route
        this.router.navigate(['/store', currentUuid, 'order-confirmation', response.orderId]);
      },
      error: (error: any) => {
        console.error('Order placement failed:', error);
        alert('Failed to place order. Please try again.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/pos-store']);
  }
}