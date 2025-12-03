import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-whatsapp-widget',
  standalone: false,
  // imports: [CommonModule],
  templateUrl: './whatsapp-widget.component.html',
  styleUrls: ['./whatsapp-widget.component.scss']
})
export class WhatsappWidgetComponent {
  @Input() phoneNumber: string = '08118348261';
  @Input() message: string = 'Hello! I would like to get more information';
  @Input() position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';
  @Input() hoverMessage: string = "Hi, let's chat! We're here to help you.";
  
  isOpen = false;
  showTooltip = false;
  private tooltipTimeout: any;

  ngOnInit() {
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
    // Clear timeout when component is destroyed
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
  }

  get whatsappUrl(): string {
    const encodedMessage = encodeURIComponent(this.message);
    return `https://api.whatsapp.com/send?phone=${this.phoneNumber}&text=${encodedMessage}`;
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
  }

  openWhatsApp() {
    window.open(this.whatsappUrl, '_blank');
    this.isOpen = false;
  }

  onMouseEnter() {
    this.showTooltip = true;
  }

  onMouseLeave() {
    this.showTooltip = false;
  }
}