import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import { RemoteAttendanceMetadata } from '../../domain/attendance/remote-attendance.dto';

@Injectable({ providedIn: 'root' })
export class RemoteAttendanceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;

  constructor(private http: HttpClient) {}

  async checkLocationPermission(): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      return false;
    }

    try {
      const permission = await (navigator as any).permissions?.query?.({ name: 'geolocation' });
      return permission?.state === 'granted';
    } catch {
      return false;
    }
  }

  async getCurrentLocation(): Promise<RemoteAttendanceMetadata> {
    let gpsCoordinates = undefined;
    let geoAddress = undefined;
    let accuracy = 0;

    if (await this.checkLocationPermission()) {
      try {
        const position = await this.getGPSPosition();
        gpsCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        accuracy = position.coords.accuracy;
        geoAddress = await this.getAddressFromCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );
      } catch {
        // GPS location capture failed
      }
    }

    return {
      gpsCoordinates,
      geoAddress,
      accuracy,
      userAgent: navigator.userAgent,
      timestamp: new Date()
    };
  }

  private getGPSPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  private async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.address?.city || data.address?.town || 'Unknown Location';
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  calculateLocationDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

