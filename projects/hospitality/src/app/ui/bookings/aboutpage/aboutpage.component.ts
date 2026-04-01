import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-aboutpage',
  templateUrl: './aboutpage.component.html',
  styleUrl: './aboutpage.component.scss',
})
export class AboutpageComponent implements OnInit {
  features = [
    {
      icon: `<i class="pi pi-map-marker text-2xl "></i>`,
      title: 'Prime Location',
      description:
        'Situated in the heart of the city with breathtaking views and easy access to major attractions, shopping districts, and business centers.',
    },
    {
      icon: `<i class="pi pi-star-fill text-2xl "></i>`,
      title: 'Luxury Amenities',
      description:
        'World-class spa, infinity pool, state-of-the-art fitness center, and exclusive concierge services to cater to your every need.',
    },
    {
      icon: `<i class="pi pi-users text-2xl "></i>`,
      title: '24/7 Concierge',
      description:
        'Our dedicated team of hospitality experts is available round-the-clock to ensure your stay is seamless and memorable.',
    },
    {
      icon: `<i class="pi pi-cog text-2xl"></i>`,
      title: 'Fine Dining',
      description:
        'Award-winning restaurants featuring internationally acclaimed chefs, offering diverse cuisines and exceptional culinary experiences.',
    },
  ];

  @ViewChild('headerRef') headerRef!: ElementRef;
  @ViewChild('featuresRef') featuresRef!: ElementRef;
  @ViewChild('visualRef') visualRef!: ElementRef;

  ngOnInit(): void {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    // Observe elements when they exist
    setTimeout(() => {
      if (this.headerRef?.nativeElement)
        observer.observe(this.headerRef.nativeElement);
      if (this.featuresRef?.nativeElement)
        observer.observe(this.featuresRef.nativeElement);
      if (this.visualRef?.nativeElement)
        observer.observe(this.visualRef.nativeElement);
    }, 100);
  }
}
