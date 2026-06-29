// src/app/ui/service/delivery-tracking/delivery-tracking.service.ts

import { Injectable } from '@angular/core';
import { Observable, of, delay, map, catchError, throwError, interval, switchMap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface TrackingLocation {
  lat: number;
  lng: number;
  address: string;
  timestamp: Date;
  status: string;
  speed?: number;
  heading?: number;
}

export interface DeliveryRoute {
  id: string;
  requestId: string;
  vendorId: string;
  customerId: string;
  origin: TrackingLocation;
  destination: TrackingLocation;
  currentPosition: TrackingLocation;
  waypoints: TrackingLocation[];
  estimatedArrival: Date;
  distanceRemaining: string;
  distanceRemainingKm: number;
  timeRemaining: string;
  timeRemainingMinutes: number;
  status: 'PREPARING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
}

export interface DeliveryEvent {
  id: string;
  deliveryId: string;
  status: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: Date;
  description: string;
  icon: string;
  completed: boolean;
}

export interface CourierInfo {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  photoUrl?: string;
  rating: number;
}

export interface DeliverySummary {
  deliveryId: string;
  requestId: string;
  productName: string;
  vendorName: string;
  customerName: string;
  status: string;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  packageWeight: number;
  packageDimensions: string;
  trackingNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryTrackingService {
  
  private apiUrl = '/api/delivery'; // Replace with your actual API endpoint
  private googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Add your API key

  constructor(private http: HttpClient) {}

  /**
   * Get delivery summary by request ID
   */
  getDeliverySummary(requestId: string): Observable<DeliverySummary> {
    // Replace with actual API call
    // return this.http.get<DeliverySummary>(`${this.apiUrl}/summary/${requestId}`);
    
    // Mock data for now
    return of({
      deliveryId: 'DEL-' + Math.random().toString(36).substr(2, 9),
      requestId: requestId,
      productName: 'Office Laptops',
      vendorName: 'Tech Solutions NG',
      customerName: 'John Doe Enterprises',
      status: 'IN_TRANSIT',
      estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      packageWeight: 5.2,
      packageDimensions: '30x20x15 cm',
      trackingNumber: 'OPT-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    }).pipe(delay(500));
  }

  /**
   * Get delivery route with live tracking
   */
  getDeliveryRoute(deliveryId: string): Observable<DeliveryRoute> {
    // Replace with actual API call
    // return this.http.get<DeliveryRoute>(`${this.apiUrl}/route/${deliveryId}`);
    
    // Mock data with realistic Lagos coordinates
    return of(this.getMockDeliveryRoute()).pipe(delay(800));
  }

  /**
   * Get live current position (for real-time updates)
   */
  getCurrentPosition(deliveryId: string): Observable<TrackingLocation> {
    // Replace with WebSocket or polling API
    // return this.http.get<TrackingLocation>(`${this.apiUrl}/position/${deliveryId}`);
    
    // Simulate moving position
    return of(this.getUpdatedPosition()).pipe(delay(300));
  }

  /**
   * Get all delivery events/timeline
   */
  getDeliveryEvents(deliveryId: string): Observable<DeliveryEvent[]> {
    // Replace with actual API call
    // return this.http.get<DeliveryEvent[]>(`${this.apiUrl}/events/${deliveryId}`);
    
    return of(this.getMockDeliveryEvents()).pipe(delay(500));
  }

  /**
   * Get courier/driver information
   */
  getCourierInfo(deliveryId: string): Observable<CourierInfo> {
    // Replace with actual API call
    // return this.http.get<CourierInfo>(`${this.apiUrl}/courier/${deliveryId}`);
    
    return of({
      id: 'COURIER-001',
      name: 'Michael Okafor',
      phone: '+234 123 456 7890',
      vehicleNumber: 'LAG-123-XY',
      vehicleType: 'Motorcycle',
      rating: 4.8
    }).pipe(delay(300));
  }

  /**
   * Calculate route between two points using Google Maps API
   */
  calculateRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Observable<any> {
    const params = new HttpParams()
      .set('origin', `${origin.lat},${origin.lng}`)
      .set('destination', `${destination.lat},${destination.lng}`)
      .set('key', this.googleMapsApiKey);

    return this.http.get('https://maps.googleapis.com/maps/api/directions/json', { params });
  }

  /**
   * Geocode address to coordinates
   */
  geocodeAddress(address: string): Observable<{ lat: number; lng: number }> {
    const params = new HttpParams()
      .set('address', address)
      .set('key', this.googleMapsApiKey);

    return this.http.get('https://maps.googleapis.com/maps/api/geocode/json', { params })
      .pipe(
        map((response: any) => {
          if (response.status === 'OK') {
            const location = response.results[0].geometry.location;
            return { lat: location.lat, lng: location.lng };
          }
          throw new Error('Geocoding failed');
        }),
        catchError(error => {
          console.error('Geocoding error:', error);
          return throwError(() => new Error('Failed to geocode address'));
        })
      );
  }

  /**
   * Subscribe to real-time position updates (WebSocket simulation)
   */
  subscribeToLiveTracking(deliveryId: string): Observable<TrackingLocation> {
    // For WebSocket implementation:
    // return new WebSocket(`ws://your-server.com/delivery/${deliveryId}`).pipe(...);
    
    // Polling simulation - updates every 10 seconds
    return interval(10000).pipe(
      switchMap(() => this.getCurrentPosition(deliveryId))
    );
  }

  /**
   * Confirm delivery and mark as delivered
   */
  confirmDelivery(deliveryId: string, confirmationData?: { signature?: string; photo?: string }): Observable<{ success: boolean; message: string }> {
    // Replace with actual API call
    // return this.http.post(`${this.apiUrl}/${deliveryId}/confirm`, confirmationData);
    
    return of({
      success: true,
      message: 'Delivery confirmed successfully'
    }).pipe(delay(500));
  }

  /**
   * Report an issue with delivery
   */
  reportIssue(deliveryId: string, issueType: string, description: string): Observable<{ success: boolean; ticketId: string }> {
    // Replace with actual API call
    // return this.http.post(`${this.apiUrl}/${deliveryId}/issue`, { issueType, description });
    
    return of({
      success: true,
      ticketId: 'SUP-' + Math.random().toString(36).substr(2, 8).toUpperCase()
    }).pipe(delay(500));
  }

  /**
   * Share tracking link
   */
  getTrackingLink(deliveryId: string): string {
    return `${window.location.origin}/track/${deliveryId}`;
  }

  // ============= MOCK DATA METHODS =============

  private getMockDeliveryRoute(): DeliveryRoute {
    return {
      id: 'DEL-001',
      requestId: 'REQ-001',
      vendorId: 'VEND-001',
      customerId: 'CUST-001',
      origin: {
        lat: 6.6018,
        lng: 3.3515,
        address: 'Tech Solutions NG, Maryland, Lagos',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        status: 'Picked up'
      },
      destination: {
        lat: 6.4531,
        lng: 3.3958,
        address: 'John Doe Enterprises, Lekki Phase 1, Lagos',
        timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: 'Estimated arrival'
      },
      currentPosition: {
        lat: 6.4962,
        lng: 3.3712,
        address: 'Sorting Center, Ilupeju, Lagos',
        timestamp: new Date(),
        status: 'In transit',
        speed: 45,
        heading: 180
      },
      waypoints: [
        {
          lat: 6.5244,
          lng: 3.3792,
          address: 'Optimax Warehouse, Ikeja, Lagos',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'Arrived at warehouse'
        },
        {
          lat: 6.4962,
          lng: 3.3712,
          address: 'Sorting Center, Ilupeju, Lagos',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          status: 'Processing at sort center'
        }
      ],
      estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000),
      distanceRemaining: '15.3 km',
      distanceRemainingKm: 15.3,
      timeRemaining: '2 hours 15 min',
      timeRemainingMinutes: 135,
      status: 'IN_TRANSIT'
    };
  }

  private getMockDeliveryEvents(): DeliveryEvent[] {
    return [
      {
        id: '1',
        deliveryId: 'DEL-001',
        status: 'Order Confirmed',
        location: 'Online',
        lat: 0,
        lng: 0,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        description: 'Your order has been confirmed and is being processed',
        icon: 'check-circle',
        completed: true
      },
      {
        id: '2',
        deliveryId: 'DEL-001',
        status: 'Picked Up',
        location: 'Tech Solutions NG, Maryland, Lagos',
        lat: 6.6018,
        lng: 3.3515,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        description: 'Vendor has picked up your order',
        icon: 'package',
        completed: true
      },
      {
        id: '3',
        deliveryId: 'DEL-001',
        status: 'At Warehouse',
        location: 'Optimax Warehouse, Ikeja, Lagos',
        lat: 6.5244,
        lng: 3.3792,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        description: 'Package arrived at our warehouse for processing',
        icon: 'warehouse',
        completed: true
      },
      {
        id: '4',
        deliveryId: 'DEL-001',
        status: 'In Transit',
        location: 'Sorting Center, Ilupeju, Lagos',
        lat: 6.4962,
        lng: 3.3712,
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        description: 'Package is in transit to sorting center',
        icon: 'truck',
        completed: true
      },
      {
        id: '5',
        deliveryId: 'DEL-001',
        status: 'Out for Delivery',
        location: 'En route to Lekki',
        lat: 6.4750,
        lng: 3.3830,
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        description: 'Your package is out for delivery',
        icon: 'delivery',
        completed: false
      },
      {
        id: '6',
        deliveryId: 'DEL-001',
        status: 'Delivered',
        location: 'John Doe Enterprises, Lekki Phase 1, Lagos',
        lat: 6.4531,
        lng: 3.3958,
        timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000),
        description: 'Package delivered successfully',
        icon: 'home',
        completed: false
      }
    ];
  }

  private getUpdatedPosition(): TrackingLocation {
    // Simulate moving position - gradually moving towards destination
    const positions = [
      { lat: 6.4962, lng: 3.3712, address: 'Sorting Center, Ilupeju' },
      { lat: 6.4850, lng: 3.3750, address: 'Along Ikorodu Road' },
      { lat: 6.4750, lng: 3.3800, address: 'Anthony Village' },
      { lat: 6.4650, lng: 3.3880, address: 'GRA, Ikeja' },
      { lat: 6.4531, lng: 3.3958, address: 'Lekki Phase 1' }
    ];
    
    const randomIndex = Math.floor(Math.random() * 3);
    const pos = positions[randomIndex];
    
    return {
      lat: pos.lat,
      lng: pos.lng,
      address: pos.address,
      timestamp: new Date(),
      status: 'Moving',
      speed: 45 + Math.random() * 20,
      heading: 180 + Math.random() * 20
    };
  }
}