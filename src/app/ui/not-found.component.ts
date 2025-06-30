import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  searchQuery = '';
  quickLinks = [
      { title: 'Home', url: '/' },
      { title: 'About', url: '/about' },
      { title: 'Services', url: '/services' },
      { title: 'Contact', url: '/contact' },
      { title: 'Blog', url: '/blog' }
  ];

  ngOnInit() {
      // Auto-focus search input after component loads
      setTimeout(() => {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) {
              searchInput.focus();
          }
      }, 500);

      // Add keyboard shortcuts
      document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  ngOnDestroy() {
      document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
          this.goBack();
      } else if (event.key === 'h' || event.key === 'H') {
          if (!(event.target as HTMLElement).matches('input')) {
              this.navigateHome();
          }
      }
  }

  performSearch() {
      if (this.searchQuery.trim()) {
          // In a real Angular app, you would use Router to navigate to search results
          console.log('Searching for:', this.searchQuery);
          alert(`Searching for: \${this.searchQuery}\\n\\nIn a real Angular app, this would navigate to your search results page using Angular Router.`);
          // Example: this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
      }
  }

  navigateHome() {
      // In a real Angular app: this.router.navigate(['/']);
      console.log('Navigating to home');
      alert('Navigating to homepage...\\n\\nIn a real Angular app, this would use Angular Router to navigate to your home route.');
  }

  goBack() {
      if (window.history.length > 1) {
          window.history.back();
      } else {
          this.navigateHome();
      }
  }

  navigateTo(url: string) {
      // In a real Angular app: this.router.navigate([url]);
      console.log('Navigating to:', url);
      alert(`Navigating to: \${url}\\n\\nIn a real Angular app, this would use Angular Router.`);
  }

  contactSupport() {
      // In a real Angular app, this might open a modal or navigate to contact page
      alert('Opening support contact...\\n\\nIn a real Angular app, this would open your support system or contact form.');
  }
}
