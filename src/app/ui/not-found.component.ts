import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent implements OnInit, OnDestroy {
  searchQuery = '';
  quickLinks = [
      { title: 'Home', url: '/' },
      { title: 'About', url: '/about' },
      { title: 'Services', url: '/services' },
      { title: 'Contact', url: '/contact' },
      { title: 'Blog', url: '/blog' }
  ];

  private boundKeydown = this.handleKeydown.bind(this);

  constructor(private location: Location, private router: Router) {}

  ngOnInit() {
      document.addEventListener('keydown', this.boundKeydown);
  }

  ngOnDestroy() {
      document.removeEventListener('keydown', this.boundKeydown);
  }

  handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;

      if (event.key === 'Escape') {
          this.goBack();
      } else if (event.key === 'h' || event.key === 'H') {
          this.navigateHome();
      }
  }

  performSearch() {
      if (this.searchQuery.trim()) {
          this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
      }
  }

  navigateHome() {
      this.router.navigate(['/']);
  }

  goBack() {
      this.location.back();
  }

  navigateTo(url: string) {
      this.router.navigate([url]);
  }

  contactSupport() {
      this.router.navigate(['/contact']);
  }
}
