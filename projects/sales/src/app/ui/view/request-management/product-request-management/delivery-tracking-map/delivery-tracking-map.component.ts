import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval, Subscription } from 'rxjs';
import { DeliveryTrackingService, DeliverySummary, CourierInfo } from '../../../../service/procurement-request-management/product-request-management/delivery-tracking.service';

// Declare Google Maps (if using Google Maps API)
declare var google: any;

interface TrackingLocation {
  lat: number;
  lng: number;
  address: string;
  timestamp: Date;
  status: string;
}

interface DeliveryEvent {
  id: string;
  status: string;
  location: string;
  timestamp: Date;
  description: string;
  icon: string;
  completed: boolean;
}

interface DeliveryRoute {
  origin: TrackingLocation;
  destination: TrackingLocation;
  currentPosition: TrackingLocation;
  waypoints: TrackingLocation[];
  estimatedArrival: Date;
  distanceRemaining: string;
  timeRemaining: string;
}

@Component({
  selector: 'app-delivery-tracking-map',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './delivery-tracking-map.component.html',
  styleUrls: ['./delivery-tracking-map.component.scss']
})
export class DeliveryTrackingMapComponent implements OnInit, AfterViewInit, OnDestroy {
    // Placeholder for Contact Support button
    contactSupport(): void {
      alert('Support has been contacted!');
    }
  
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() requestId: string = '';
  @Input() deliveryId: string = '';
  
  // Map related
  map: any = null;
  markers: any[] = [];
  directionsRenderer: any = null;
  directionsService: any = null;
  
  // Tracking data
  isLoading = true;
  isMapLoading = true;
  mapError = false;
  
  deliveryRoute: DeliveryRoute | null = null;
  deliveryEvents: DeliveryEvent[] = [];
  currentStatus: string = 'PREPARING';
  
  // Selected view
  selectedView: 'map' | 'timeline' | 'details' = 'map';

  deliverySummary: DeliverySummary | null = null;
  courierInfo: CourierInfo | null = null;
  
  // Auto-refresh
  private refreshSubscription: Subscription | null = null;
  private refreshInterval = 30000; // 30 seconds
  private destroy$ = new Subject<void>();
  
  // Mock data - replace with actual API calls
  private mockLocations = {
    warehouse: { lat: 6.5244, lng: 3.3792, address: 'Optimax Warehouse, Ikeja, Lagos' },
    vendor: { lat: 6.6018, lng: 3.3515, address: 'Vendor Location, Maryland, Lagos' },
    sortCenter: { lat: 6.4962, lng: 3.3712, address: 'Sorting Center, Ilupeju, Lagos' },
    delivery: { lat: 6.4531, lng: 3.3958, address: 'Customer Location, Lekki Phase 1, Lagos' }
  };

  constructor(
    private deliveryTrackingService: DeliveryTrackingService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (!this.requestId) {
      this.requestId = this.route.snapshot.paramMap.get('id') || '';
    }

    this.loadTrackingData();
    this.startAutoRefresh();
  }

  ngAfterViewInit(): void {
    // Small delay to ensure container is ready
    setTimeout(() => {
      this.initMap();
    }, 500);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTrackingData(): void {
  this.isLoading = true;
  
  // Get delivery summary first
  this.deliveryTrackingService.getDeliverySummary(this.requestId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (summary) => {
        this.deliveryId = summary.deliveryId;
        this.deliverySummary = summary;
        
        // Then get route and events in parallel
        this.loadRouteAndEvents();
      },
      error: (error) => {
        console.error('Error loading delivery summary:', error);
        this.isLoading = false;
      }
    });
}

private loadRouteAndEvents(): void {
  // Get delivery route
  this.deliveryTrackingService.getDeliveryRoute(this.deliveryId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (route) => {
        this.deliveryRoute = route;
        this.currentStatus = route.status;
        this.isLoading = false;
        
        // Initialize map after route is loaded
        setTimeout(() => this.initMap(), 500);
      },
      error: (error) => {
        console.error('Error loading delivery route:', error);
        this.isLoading = false;
      }
    });

  // Get delivery events
  this.deliveryTrackingService.getDeliveryEvents(this.deliveryId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (events) => {
        this.deliveryEvents = events;
      },
      error: (error) => {
        console.error('Error loading delivery events:', error);
      }
    });

  // Get courier info
  this.deliveryTrackingService.getCourierInfo(this.deliveryId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (courier) => {
        this.courierInfo = courier;
      },
      error: (error) => {
        console.error('Error loading courier info:', error);
      }
    });
}


 private startRealTimeTracking(): void {
  this.deliveryTrackingService.subscribeToLiveTracking(this.deliveryId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (position) => {
        // Update current position on map
        if (this.deliveryRoute) {
          this.deliveryRoute.currentPosition = position;
          this.updateCurrentPositionOnMap(position);
        }
      },
      error: (error) => {
        console.error('Error in live tracking:', error);
      }
    });
}

private updateCurrentPositionOnMap(position: TrackingLocation): void {
  if (this.map && this.markers.length > 0) {
    const currentMarker = this.markers.find(m => m.getTitle() === 'Current Location');
    if (currentMarker) {
      currentMarker.setPosition(new google.maps.LatLng(position.lat, position.lng));
      this.map.setCenter(new google.maps.LatLng(position.lat, position.lng));
    }
  }
}


  private setupMockData(): void {
    // Setup delivery route
    this.deliveryRoute = {
      origin: {
        lat: this.mockLocations.vendor.lat,
        lng: this.mockLocations.vendor.lng,
        address: this.mockLocations.vendor.address,
        timestamp: new Date('2026-05-25T08:00:00'),
        status: 'Picked up'
      },
      destination: {
        lat: this.mockLocations.delivery.lat,
        lng: this.mockLocations.delivery.lng,
        address: this.mockLocations.delivery.address,
        timestamp: new Date('2026-05-25T18:00:00'),
        status: 'Estimated arrival'
      },
      currentPosition: {
        lat: this.mockLocations.sortCenter.lat,
        lng: this.mockLocations.sortCenter.lng,
        address: this.mockLocations.sortCenter.address,
        timestamp: new Date(),
        status: 'In transit'
      },
      waypoints: [
        {
          lat: this.mockLocations.warehouse.lat,
          lng: this.mockLocations.warehouse.lng,
          address: this.mockLocations.warehouse.address,
          timestamp: new Date('2026-05-25T10:30:00'),
          status: 'Arrived at warehouse'
        },
        {
          lat: this.mockLocations.sortCenter.lat,
          lng: this.mockLocations.sortCenter.lng,
          address: this.mockLocations.sortCenter.address,
          timestamp: new Date('2026-05-25T13:15:00'),
          status: 'Processing at sort center'
        }
      ],
      estimatedArrival: new Date('2026-05-25T17:30:00'),
      distanceRemaining: '15.3 km',
      timeRemaining: '2 hours 15 min'
    };

    // Setup delivery timeline events
    this.deliveryEvents = [
      {
        id: '1',
        status: 'Order Confirmed',
        location: 'Online',
        timestamp: new Date('2026-05-24T09:00:00'),
        description: 'Your order has been confirmed and is being processed',
        icon: 'check-circle',
        completed: true
      },
      {
        id: '2',
        status: 'Picked Up',
        location: this.mockLocations.vendor.address,
        timestamp: new Date('2026-05-25T08:00:00'),
        description: 'Vendor has picked up your order',
        icon: 'package',
        completed: true
      },
      {
        id: '3',
        status: 'At Warehouse',
        location: this.mockLocations.warehouse.address,
        timestamp: new Date('2026-05-25T10:30:00'),
        description: 'Package arrived at our warehouse for processing',
        icon: 'warehouse',
        completed: true
      },
      {
        id: '4',
        status: 'In Transit',
        location: this.mockLocations.sortCenter.address,
        timestamp: new Date('2026-05-25T13:15:00'),
        description: 'Package is in transit to sorting center',
        icon: 'truck',
        completed: true
      },
      {
        id: '5',
        status: 'Out for Delivery',
        location: 'En route to destination',
        timestamp: new Date('2026-05-25T15:00:00'),
        description: 'Your package is out for delivery',
        icon: 'delivery',
        completed: false
      },
      {
        id: '6',
        status: 'Delivered',
        location: this.mockLocations.delivery.address,
        timestamp: new Date('2026-05-25T18:00:00'),
        description: 'Package delivered successfully',
        icon: 'home',
        completed: false
      }
    ];

    this.currentStatus = 'IN_TRANSIT';
  }

  private initMap(): void {
    // Check if Google Maps API is available
    if (typeof google === 'undefined') {
      console.warn('Google Maps API not loaded. Using fallback mode.');
      this.mapError = true;
      this.isMapLoading = false;
      return;
    }

    try {
      // Initialize directions service and renderer
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2EB270',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      // Calculate center point between origin and destination
      const center = this.deliveryRoute 
        ? {
            lat: (this.deliveryRoute.origin.lat + this.deliveryRoute.destination.lat) / 2,
            lng: (this.deliveryRoute.origin.lng + this.deliveryRoute.destination.lng) / 2
          }
        : { lat: 6.5244, lng: 3.3792 };

      // Create map
      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center: center,
        zoom: 11,
        styles: this.getMapStyles(),
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });

      // Set directions renderer map
      this.directionsRenderer.setMap(this.map);

      // Calculate and display route
      this.calculateAndDisplayRoute();

      // Add custom markers
      this.addCustomMarkers();

      this.isMapLoading = false;
    } catch (error) {
      console.error('Error initializing map:', error);
      this.mapError = true;
      this.isMapLoading = false;
    }
  }

  private calculateAndDisplayRoute(): void {
    if (!this.directionsService || !this.deliveryRoute) return;

    const waypoints = this.deliveryRoute.waypoints.map(wp => ({
      location: { lat: wp.lat, lng: wp.lng },
      stopover: true
    }));

    const request: any = {
      origin: { lat: this.deliveryRoute.origin.lat, lng: this.deliveryRoute.origin.lng },
      destination: { lat: this.deliveryRoute.destination.lat, lng: this.deliveryRoute.destination.lng },
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC
    };

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === 'OK') {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Directions request failed:', status);
      }
    });
  }

  private addCustomMarkers(): void {
    if (!this.map || !this.deliveryRoute) return;

    // Origin marker (Vendor)
    const originMarker = new google.maps.Marker({
      position: { lat: this.deliveryRoute.origin.lat, lng: this.deliveryRoute.origin.lng },
      map: this.map,
      title: 'Pickup Location',
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2EB270" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" fill="white"/>
            <path d="M12 8v4l3 3"/>
            <circle cx="12" cy="12" r="2" fill="#2EB270"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });

    // Destination marker (Customer)
    const destMarker = new google.maps.Marker({
      position: { lat: this.deliveryRoute.destination.lat, lng: this.deliveryRoute.destination.lng },
      map: this.map,
      title: 'Delivery Location',
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E6276" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12h3l3-9 3 9 3-9 3 9h3" fill="white"/>
            <circle cx="12" cy="18" r="3" fill="#2E6276"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });

    // Current position marker (animated)
    const currentMarker = new google.maps.Marker({
      position: { lat: this.deliveryRoute.currentPosition.lat, lng: this.deliveryRoute.currentPosition.lng },
      map: this.map,
      title: 'Current Location',
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" fill="white"/>
            <circle cx="12" cy="12" r="6" fill="#f97316" stroke="none"/>
            <animateTransform attributeName="transform" type="scale" values="1;1.2;1" dur="2s" repeatCount="indefinite" additive="sum"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18)
      }
    });

    // Add waypoint markers
    this.deliveryRoute.waypoints.forEach((wp, index) => {
      new google.maps.Marker({
        position: { lat: wp.lat, lng: wp.lng },
        map: this.map,
        title: wp.status,
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c757d" stroke-width="2">
              <circle cx="12" cy="12" r="8" fill="white"/>
              <text x="12" y="16" text-anchor="middle" font-size="10" fill="#6c757d">${index + 1}</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        }
      });
    });

    this.markers = [originMarker, destMarker, currentMarker];
  }

  private getMapStyles(): any[] {
    // Custom map styles with your company colors
    return [
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#e3eef0' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{ color: '#f8feff' }]
      }
    ];
  }

  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.refreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshTrackingData();
      });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  refreshTrackingData(): void {
    // Call API to get latest tracking data
    console.log('Refreshing tracking data...');
    // this.trackingService.getLatestTracking(this.deliveryId).subscribe(data => {
    //   this.updateTrackingData(data);
    // });
  }

  private updateTrackingData(data: any): void {
    // Update current position on map
    if (this.map && data.currentPosition) {
      const marker = this.markers.find(m => m.getTitle() === 'Current Location');
      if (marker) {
        marker.setPosition(new google.maps.LatLng(data.currentPosition.lat, data.currentPosition.lng));
        
        // Center map on new position
        this.map.setCenter(new google.maps.LatLng(data.currentPosition.lat, data.currentPosition.lng));
      }
    }
  }

  centerOnCurrentLocation(): void {
    if (this.map && this.deliveryRoute) {
      this.map.setCenter({
        lat: this.deliveryRoute.currentPosition.lat,
        lng: this.deliveryRoute.currentPosition.lng
      });
      this.map.setZoom(14);
    }
  }

  centerOnFullRoute(): void {
    if (this.map && this.deliveryRoute) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: this.deliveryRoute.origin.lat, lng: this.deliveryRoute.origin.lng });
      bounds.extend({ lat: this.deliveryRoute.destination.lat, lng: this.deliveryRoute.destination.lng });
      this.deliveryRoute.waypoints.forEach(wp => {
        bounds.extend({ lat: wp.lat, lng: wp.lng });
      });
      this.map.fitBounds(bounds);
    }
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'PREPARING': 'package',
      'PICKED_UP': 'truck',
      'IN_TRANSIT': 'map-pin',
      'OUT_FOR_DELIVERY': 'delivery',
      'DELIVERED': 'home',
      'CANCELLED': 'alert-circle'
    };
    return icons[status] || 'circle';
  }

  getStatusMessage(): string {
    const messages: Record<string, string> = {
      'PREPARING': 'Your order is being prepared',
      'PICKED_UP': 'Your package has been picked up',
      'IN_TRANSIT': 'Your package is on the way',
      'OUT_FOR_DELIVERY': 'Your package is almost there',
      'DELIVERED': 'Package delivered successfully',
      'CANCELLED': 'Delivery cancelled'
    };
    return messages[this.currentStatus] || 'Tracking your package';
  }

  formatTimeRemaining(): string {
    if (!this.deliveryRoute?.estimatedArrival) return 'Calculating...';
    
    const now = new Date();
    const eta = new Date(this.deliveryRoute.estimatedArrival);
    const diffMs = eta.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Arriving soon';
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 0) {
      return `${diffHrs} hr ${diffMins} min`;
    }
    return `${diffMins} minutes`;
  }

  getProgressPercentage(): number {
    const completed = this.deliveryEvents.filter(e => e.completed).length;
    const total = this.deliveryEvents.length;
    return (completed / total) * 100;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  shareTrackingLink(): void {
    const trackingLink = `${window.location.origin}/track/${this.deliveryId}`;
    navigator.clipboard.writeText(trackingLink);
    alert('Tracking link copied to clipboard!');
  }

  getDeliveryStatusClass(): string {
    const classes: Record<string, string> = {
      'PREPARING': 'status-preparing',
      'PICKED_UP': 'status-picked',
      'IN_TRANSIT': 'status-transit',
      'OUT_FOR_DELIVERY': 'status-out',
      'DELIVERED': 'status-delivered',
      'CANCELLED': 'status-cancelled'
    };
    return classes[this.currentStatus] || 'status-default';
  }
}