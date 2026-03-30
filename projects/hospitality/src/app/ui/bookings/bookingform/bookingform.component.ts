import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  HotelserviceService,
  Room,
} from '../../hospitality/hotelservice.service';

@Component({
  selector: 'app-bookingform',
  templateUrl: './bookingform.component.html',
  styleUrls: ['./bookingform.component.scss'],
})
export class BookingformComponent implements OnInit {
  @Input() roomName: string = 'Executive Ocean View Suite';
  @Input() location: string = 'Victoria Island, Lagos';
  @Input() rating: number = 4.9;
  @Input() reviews: number = 128;
  @Input() price: number = 145000;

  description: string =
    'Experience unparalleled luxury in our premier suite. Located on the 14th floor, the Executive Ocean View Suite offers floor-to-ceiling windows with panoramic views of the Atlantic. Designed with a minimalist aesthetic, the room features bespoke Nigerian mahogany furniture, a king-sized memory foam mattress, and a dedicated workspace for the modern professional.';

  amenities = [
    { icon: 'wifi', label: 'Ultra-fast Wi-Fi 6' },
    { icon: 'climate', label: 'Climate Control AC' },
    { icon: 'tv', label: '65" 4K Smart TV' },
    { icon: 'coffee', label: 'Nespresso Machine' },
    { icon: 'work', label: 'Dedicated Workspace' },
    { icon: 'bath', label: 'Deep Soaking Tub' },
  ];

  galleryImages = [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600',
  ];

  constructor(
    private route: ActivatedRoute,
    private hotelService: HotelserviceService,
  ) {}

  uuid: string = '';

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id');
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    
    if (roomId) {
      this.loadRoomDetails(Number(roomId));
    }
  }

  loadRoomDetails(id: number): void {
    this.hotelService.getRoom(id).subscribe({
      next: (room: Room) => {
        this.roomName = this.hotelService.getRoomTypeNameById(room.roomType);
        this.price = room.rate;
        this.description = room.description || this.description;

        if (room.imageURLs && room.imageURLs.length > 0) {
          this.galleryImages = [
            room.imageURLs[0],
            room.imageURLs[1] || this.galleryImages[1],
            room.imageURLs[2] || this.galleryImages[2],
            room.imageURLs[3] || this.galleryImages[3],
          ];
        }

        if (room.amenities && room.amenities.length > 0) {
          this.amenities = room.amenities.map((a) => ({
            icon: this.getAmenityIcon(a),
            label: a,
          }));
        }
      },
      error: (err) => console.error('Error loading room details:', err),
    });
  }

  private getAmenityIcon(label: string): string {
    const l = label.toLowerCase();
    if (l.includes('wifi')) return 'wifi';
    if (l.includes('ac') || l.includes('air')) return 'climate';
    if (l.includes('tv')) return 'tv';
    if (l.includes('coffee')) return 'coffee';
    if (l.includes('work')) return 'work';
    if (l.includes('bath')) return 'bath';
    return 'default';
  }
}
