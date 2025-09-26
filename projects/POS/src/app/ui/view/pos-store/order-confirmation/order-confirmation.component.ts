import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreCartService } from '../../../service/store-cart.service';
import { GuestOrderService } from '../../../service/guest-order.service';
import { PosServiceService } from '../../../service/pos-service.service'; 
import * as confetti from 'canvas-confetti';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss']
})
export class OrderConfirmationComponent implements OnInit, AfterViewInit {
  @ViewChild('confettiCanvas', { static: false }) confettiCanvas!: ElementRef<HTMLCanvasElement>;
  
  orderId: string = '';
  orderDetails: any = null;
  isLoading: boolean = true;
  isGuestOrder: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: StoreCartService,
    private guestOrderService: GuestOrderService,
    private posService: PosServiceService 
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    this.loadOrderDetails();
  }

  ngAfterViewInit(): void {
    // Delay confetti to ensure canvas is rendered
    setTimeout(() => {
      this.fireConfetti();
    }, 100);
  }

  loadOrderDetails(): void {
    const guestOrder = this.guestOrderService.getOrder(this.orderId);
    
    if (guestOrder) {
      this.orderDetails = guestOrder;
      this.isGuestOrder = true;
      this.isLoading = false;
    } else {
      // If you want to use API for authenticated users, uncomment this:
      /*
      this.posService.getOrderByOrderNumber(this.orderId).subscribe({
        next: (order) => {
          this.orderDetails = order;
          this.isGuestOrder = false;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading order details:', error);
          this.isLoading = false;
          this.router.navigate(['/pos-store']);
        }
      });
      */
      
      // For now, just set loading to false since we're using guest orders
      this.isLoading = false;
    }
  }

  fireConfetti(): void {
    // Check if canvas element exists
    if (!this.confettiCanvas?.nativeElement) {
      console.warn('Confetti canvas not found');
      return;
    }

    try {
      const canvas = this.confettiCanvas.nativeElement;
      
      // Set canvas dimensions
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Create confetti instance
      const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true
      });

      // Fire confetti celebration
      myConfetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });

      // Additional confetti effects
      setTimeout(() => {
        myConfetti({
          particleCount: 80,
          angle: 60,
          spread: 65,
          origin: { x: 0 }
        });

        myConfetti({
          particleCount: 80,
          angle: 120,
          spread: 65,
          origin: { x: 1 }
        });
      }, 300);
    } catch (error) {
      console.error('Confetti error:', error);
    }
  }

  goToStore(): void {
    this.guestOrderService.clearCurrentOrder();
    this.router.navigate(['/user/checkout/store/qjneh219-2ee3qwr-23e23rsadas-2dwajdnad']);
  }

  viewOrderHistory(): void {
    this.router.navigate(['/order-history']);
  }

  printOrder(): void {
    window.print();
  }

  getOrderStatusClass(): string {
    if (!this.orderDetails) return 'bg-gray-100 text-gray-800';
    
    switch (this.orderDetails.status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getEstimatedTime(): string {
    if (this.orderDetails?.deliveryMethod === 'delivery') {
      return '30-45 minutes';
    }
    return '15-25 minutes';
  }

  formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

formatTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

navigateToOrderConfirmation(orderId: string): void {
  const currentUuid = this.route.snapshot.paramMap.get('uuid');
  this.router.navigate(['user/checkout/store', currentUuid, 'order-confirmation', orderId]);
}
}