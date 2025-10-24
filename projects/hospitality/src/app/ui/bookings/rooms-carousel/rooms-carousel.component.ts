import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
interface Room {
  id: number;
  name: string;
  type: string;
  image: string;
  price: number;
  description: string;
  amenities: string[];
}
@Component({
  selector: 'app-rooms-carousel',
  templateUrl: './rooms-carousel.component.html',
  styleUrl: './rooms-carousel.component.scss',
})
export class RoomsCarouselComponent implements OnInit, OnDestroy {
  currentSlide = 0;
  autoSlideInterval: any;
  isDarkMode = false;
  openRoom: boolean = false;

  constructor(private router: Router) {}

  rooms: Room[] = [
    {
      id: 1,
      name: 'Deluxe Room',
      type: 'deluxe',
      image:
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      price: 150,
      description: 'Spacious and comfortable room with modern amenities',
      amenities: ['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service'],
    },
    {
      id: 2,
      name: 'Executive Suite',
      type: 'executive',
      image:
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      price: 300,
      description: 'Premium suite with separate living area and city views',
      amenities: [
        'Free WiFi',
        'Air Conditioning',
        'Mini Bar',
        'Room Service',
        'City View',
        'Separate Living Area',
      ],
    },

    {
      id: 3,
      name: 'Deluxe Ocean View',
      type: 'deluxe',
      image:
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      price: 200,
      description: 'Deluxe room with stunning ocean views and modern comfort',
      amenities: [
        'Free WiFi',
        'Air Conditioning',
        'Mini Bar',
        'Room Service',
        'Ocean View',
      ],
    },
  ];

  ngOnInit() {
    this.startAutoSlide();

    this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  navigateToRoom() {
    const uuid = 'abc123';
    this.router.navigate([`/user/rooms/uuid`]);
  }

  navigateTobooking() {
    const uuid = 'abc123';
    this.router.navigate([`/user/booking-form/uuid`]);
  }

  ngOnDestroy() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  trackByRoomId(index: number, room: Room): number {
    return room.id;
  }

  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.rooms.length;
  }

  prevSlide() {
    this.currentSlide =
      this.currentSlide === 0 ? this.rooms.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }

  getRoomTypeColor(type: string): string {
    switch (type) {
      case 'deluxe':
        return 'from-blue-500 to-purple-600';
      case 'executive':
        return 'from-emerald-500 to-teal-600';
      case 'suite':
        return 'from-amber-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  }
}
