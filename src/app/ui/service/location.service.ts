import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { City, Country, State } from '../domain/meta.data.dto';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
private baseUrl = 'assets/data';

  constructor(private http: HttpClient) {}

  // -------------------------
  // COUNTRIES
  // -------------------------
  getCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.baseUrl}/countries.json`);
  }

  // -------------------------
  // STATES
  // -------------------------
  getStates(): Observable<State[]> {
    return this.http.get<State[]>(`${this.baseUrl}/states.json`);
  }

  getStatesByCountry(countryId: number): Observable<State[]> {
    return this.getStates().pipe(
      map(states => states.filter(s => s.countryId === countryId))
    );
  }

  // -------------------------
  // CITIES
  // -------------------------
  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.baseUrl}/cities.json`);
  }

  getCitiesByState(stateId: number): Observable<City[]> {
    return this.getCities().pipe(
      map(cities => cities.filter(c => c.stateId === stateId))
    );
  }
}
