import { Component, OnInit, OnDestroy, AfterViewInit, Output, EventEmitter, Input, NgZone } from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
// import { faLocationCrosshairs } from '@fortawesome/free-solid-svg-icons';


delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: false,
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss']
})
export class LocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number; address?: string }>();
  @Output() close = new EventEmitter<void>();
  @Input() initialLocation: { lat: number; lng: number } | null = null;
  // faLocationCrosshairs = faLocationCrosshairs
  private map: L.Map | undefined;
  private marker: L.Marker | undefined;
  private currentPickedLocation: { lat: number; lng: number; address?: string } | null = null;
  private apiKey: string = 'pk.cfb14b234e3e72743ea1aa24a1104fc0'

  private actualStartLocation: { lat: number; lng: number };
  private readonly DEFAULT_ABUJA_LOCATION = { lat: 9.0765, lng: 7.3986 }; 

  searchQuery: string = '';
  searchResults: NominatimResult[] = [];
  showSearchResults: boolean = false;
  private searchSubject = new Subject<string>(); 
  private blurTimeout: any

  constructor(private http: HttpClient, private ngZone: NgZone) {
    this.actualStartLocation = this.initialLocation || this.DEFAULT_ABUJA_LOCATION;

    this.searchSubject.pipe(
      debounceTime(400), 
      distinctUntilChanged() 
    ).subscribe(query => {
      if (query.length > 2) {
        this.performSearch(query);
      } else {
        this.searchResults = [];
        this.showSearchResults = false;
      }
    });
  }

  ngOnInit(): void {
    if (!this.initialLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.actualStartLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          if (this.map) {
            this.updateMapAndView(this.actualStartLocation.lat, this.actualStartLocation.lng, false);
          }
        },
        (error) => {
          console.warn('Geolocation failed:', error);
        }
      );
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.initMap();
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    this.searchSubject.unsubscribe();
  }

  private initMap(): void {
    if (this.map) {
      this.map.remove();
    }

    this.map = L.map('map').setView([this.actualStartLocation.lat, this.actualStartLocation.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.marker = L.marker([this.actualStartLocation.lat, this.actualStartLocation.lng], { draggable: true }).addTo(this.map)
      .bindPopup('Drag to pick a location.')
      .openPopup();

    this.marker.on('dragend', (event) => {
      const position = this.marker!.getLatLng();
      this.updateMapAndView(position.lat, position.lng, true);
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      console.log("clicked")
      this.updateMapAndView(e.latlng.lat, e.latlng.lng, true);
    });

    this.updateMapAndView(this.actualStartLocation.lat, this.actualStartLocation.lng, false);
  }

  private updateMapAndView(lat: number, lng: number, emitToParent: boolean): void {
    const newLatLng = L.latLng(lat, lng);
    if (this.marker) {
      this.marker.setLatLng(newLatLng);
    } else {
      this.marker = L.marker(newLatLng, { draggable: true }).addTo(this.map!)
        .bindPopup('Drag to pick a location.')
        .openPopup();
    }
    this.map?.panTo(newLatLng);
    console.log("newlatlnf", newLatLng)
    this.resolveAddress(lat, lng, emitToParent); 
  }

  private async resolveAddress(lat: number, lon: number, emitToParent: boolean): Promise<void> {
    try {
      const corsProxy = 'https://api.allorigins.win/raw?url=';
const url = `${corsProxy}${encodeURIComponent(
  `https://us1.locationiq.com/v1/reverse?key=${this.apiKey}&lat=${lat}&lon=${lon}&format=json`
)}`;
      // const url = `https://us1.locationiq.com/v1/reverse?key=${this.apiKey}&lat=${lat}&lon=${lon}&format=json`;
      const response: any = await this.http.get(url).toPromise();

      console.log("resp", response)
  
      let address: string;
  
      if (response?.display_name) {
        address = response.display_name;
      } else if (response?.address) {
        const addr = response.address;
        const parts = [
          addr.road,
          addr.suburb,
          addr.city || addr.town || addr.village,
          addr.state,
          addr.country
        ].filter(Boolean);
        address = parts.join(', ');
      } else {
        address = `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`;
      }
  
      this.marker?.setPopupContent(`<b>Selected:</b><br>${address}`).openPopup();
      this.currentPickedLocation = { lat, lng: lon, address };
  
      if (emitToParent) {
        this.locationSelected.emit(this.currentPickedLocation);
      }
    } catch (error) {
      console.error('Error resolving address:', error);
      this.currentPickedLocation = { lat, lng: lon };
      if (emitToParent) {
        this.locationSelected.emit(this.currentPickedLocation);
      }
    }
  }
  

  onSearchInputChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  hideSearchResultsDelayed() {
    this.blurTimeout = setTimeout(() => {
      this.showSearchResults = false;
    }, 150); 
  }

  onSearchInputFocus() {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
    if (this.searchQuery.length > 0 && this.searchResults.length > 0) {
      this.showSearchResults = true;
    }
  }

  async performSearch(query: string): Promise<void> {
    try {
      const url = `https://us1.locationiq.com/v1/search?key=${this.apiKey}&q=${encodeURIComponent(query)}&format=json&countrycodes=ng&limit=5`;
      const response: any = await this.http.get(url).toPromise();
  
      this.searchResults = (response || []).map((r: any) => ({
        lat: r.lat,
        lon: r.lon,
        display_name: r.display_name
      }));
  
      this.showSearchResults = this.searchResults.length > 0;
    } catch (error) {
      console.error('Error performing search:', error);
      this.searchResults = [];
      this.showSearchResults = false;
    }
  }

  searchLocation(): void {
    this.performSearch(this.searchQuery); 
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  selectSearchResult(result: NominatimResult): void {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (!isNaN(lat) && !isNaN(lng)) {
      this.updateMapAndView(lat, lng, false); 

      
      this.map?.setView([lat, lng], 15);

      this.searchQuery = result.display_name;

      this.searchResults = []; 
      this.showSearchResults = false;
    }
  }

  // --- New: Use Current Location ---
  useCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.updateMapAndView(lat, lng, true);
          this.map?.setView([lat, lng], 15); 
          this.searchQuery = 'Current Location';
          this.showSearchResults = false;
          this.searchResults = [];
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Could not get your current location. Please ensure location services are enabled for your browser.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  confirmLocation() {
    if (this.currentPickedLocation) {
      console.log(this.currentPickedLocation)
      this.locationSelected.emit(this.currentPickedLocation);
    }
    this.close.emit();
  }

  cancelLocation() {
    this.close.emit();
  }
}
