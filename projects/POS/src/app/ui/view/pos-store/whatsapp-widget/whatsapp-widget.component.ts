import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-whatsapp-widget',
  standalone: false,
  templateUrl: './whatsapp-widget.component.html',
  styleUrls: ['./whatsapp-widget.component.scss']
})
export class WhatsappWidgetComponent implements OnChanges, OnInit, OnDestroy {
  @Input() phoneNumber: string = '';
  @Input() message: string = 'Hello! I would like to get more information';
  @Input() position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';
  @Input() hoverMessage: string = "Hi, let's chat! We're here to help you.";
  @Input() showFallbackMessage: boolean = false;
  
  isOpen = false;
  showTooltip = false;
  showWidgetToast = false;
  private tooltipTimeout: any;
  private toastTimeout: any;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showFallbackMessage'] || changes['phoneNumber']) {
      this.updateHoverMessage();
    }
  }

  ngOnInit() {
    this.updateHoverMessage();
    
    // Show tooltip automatically after 3 seconds
    this.tooltipTimeout = setTimeout(() => {
      this.showTooltip = true;
      // Hide tooltip after 5 seconds
      setTimeout(() => {
        this.showTooltip = false;
      }, 5000);
    }, 3000);
  }

  ngOnDestroy() {
    // Clear timeouts when component is destroyed
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  private updateHoverMessage() {
    if (this.showFallbackMessage || !this.phoneNumber) {
      this.hoverMessage = "Customer care not available";
    } else {
      this.hoverMessage = "Hi, let's chat! We're here to help you.";
    }
  }

  get whatsappUrl(): string {
    if (!this.phoneNumber) {
      return '#';
    }
    const encodedMessage = encodeURIComponent(this.message);
    return `https://api.whatsapp.com/send?phone=${this.phoneNumber}&text=${encodedMessage}`;
  }

  toggleWidget() {
    if (!this.phoneNumber) {
      this.showWidgetToast = true;
      
      // Auto-hide toast after 40 seconds
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
      }
      this.toastTimeout = setTimeout(() => {
        this.hideWidgetToast();
      }, 40000);
      
      return;
    }
    this.isOpen = !this.isOpen;
  }

  openWhatsApp() {
    if (this.phoneNumber) {
      window.open(this.whatsappUrl, '_blank');
    }
    this.isOpen = false;
  }

  hideWidgetToast() {
    this.showWidgetToast = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  onMouseEnter() {
    this.showTooltip = true;
  }

  onMouseLeave() {
    this.showTooltip = false;
  }
}