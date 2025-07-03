import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment.prod';
import { MessageService } from 'primeng/api';

// Interfaces
export interface RoomTypeDTO {
  id?: number;
  name: string;
  description?: string;
}

export interface Room {
  id: number;
  roomNumber: number;
  roomStatus: RoomStatus;
  floor: number;
  rate: number;
  beds: number;
  maxOccupancy: number;
  description?: string;
  amenities: string[];
  imageURLs: string[];
  accessible: boolean;
  roomType: number;
  isSmokingAllowed: boolean;
}

export interface Guest {
  id?: number; // Made optional for creation
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  idNumber: string;
  gender: string;
}

export interface Booking {
  id?: number; // Made optional for creation
  checkinDate: string;
  checkoutDate: string;
  adults: number;
  children: number;
  specialRequests?: string;
  depositAmount?: number;
  subTotal: number;
  taxes?: number;
  total: number;
  balanceAmount?: number;
  status: BookingStatus;
  guest: Guest | number;
  payment?: number; // Payment ID
  rooms: number[]; // Array of Room IDs
}

export interface BookingDetail {
  id?: number;
  totalPrice: number;
  dateUsed: string;
  notes?: string;
  booking: number; // Booking ID
  additionalService?: number; // Additional Service ID
}

export interface MaintenainceRequest {
  id: number;
  tasks: string;
  reasons: string[];
  startDate: string;
  notes: string;
  completed: boolean;
  priority: string;
  dueDate: string;
  completedAt: string;
  room: number;
}

// Enums
export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'BOOKED'
  | 'UNDER_MAINTENANCE'
  | 'CLEANING';

export type BookingStatus =
  | 'CONFIRMED'
  | 'PENDING'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'NO_SHOW';

export interface RoomFilters {
  status?: RoomStatus;
  roomTypeId?: number;
}
export interface BookingFilters {
  status?: BookingStatus;
}

@Injectable({
  providedIn: 'root',
})
export class HotelserviceService {
  private apiUrl = environment.apiBaseUrl;
  private roomType: RoomTypeDTO[] = [];
  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization: environment.apiKey,
  });

  private roomTypes$ = new BehaviorSubject<RoomTypeDTO[]>([]);

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {
    this.loadInitialRoomTypes();
  }

  private loadInitialRoomTypes(): void {
    this.getRoomTypes().subscribe({
      next: (types) => {
        this.roomType = types;
        this.roomTypes$.next(types);
      },
      error: (error) => this.handleError(error),
    });
  }

  getRoomTypesObservable(): Observable<RoomTypeDTO[]> {
    return this.roomTypes$.asObservable();
  }

  // Room Type Endpoints
  getRoomTypes(): Observable<RoomTypeDTO[]> {
    return this.http
      .get<RoomTypeDTO[]>(`${this.apiUrl}/x/api/v2/hsp/roomTypes`, {
        headers: this.headers,
      })
      .pipe(
        catchError((error) => {
          console.error('Error fetching room types:', error);
          return throwError(() => error);
        })
      );
  }

  createRoomType(roomType: RoomTypeDTO): Observable<RoomTypeDTO> {
    return this.http
      .post<RoomTypeDTO>(`${this.apiUrl}/x/api/v2/hsp/roomTypes`, roomType, {
        headers: this.headers,
      })
      .pipe(
        tap((createdRoomType) => {
          // Update the BehaviorSubject with the new room type
          const currentTypes = this.roomTypes$.getValue();
          const updatedTypes = [...currentTypes, createdRoomType];
          this.roomTypes$.next(updatedTypes);
          this.roomType = updatedTypes;
        }),
        catchError((error) => {
          console.error('Error creating room type:', error);
          return throwError(() => error);
        })
      );
  }

  getRoom(id: number): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/x/api/v2/hsp/rooms/${id}`, {
      headers: this.headers,
    });
  }

  getRooms(filters: RoomFilters = {}): Observable<Room[]> {
    let params = new HttpParams();

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<Room[]>(`${this.apiUrl}/x/api/v2/hsp/rooms`, {
      headers: this.headers,
      params: params,
    });
  }

  getRoomsByStatus(status: RoomStatus): Observable<Room[]> {
    let params = new HttpParams().set('status', status);

    return this.http.get<Room[]>(`${this.apiUrl}/x/api/v2/hsp/rooms`, {
      headers: this.headers,
      params: params,
    });
  }

  // Get available rooms specifically
  getAvailableRooms(): Observable<Room[]> {
    return this.getRoomsByStatus('AVAILABLE');
  }

  getOccupiedRooms(): Observable<Room[]> {
    return this.getRoomsByStatus('OCCUPIED');
  }

  getBookedRooms(): Observable<Room[]> {
    return this.getRoomsByStatus('BOOKED');
  }

  getCleaningRooms(): Observable<Room[]> {
    return this.getRoomsByStatus('CLEANING');
  }

  getUnderMaintenanceRooms(): Observable<Room[]> {
    return this.getRoomsByStatus('UNDER_MAINTENANCE');
  }

  createRoom(room: Room): Observable<Room> {
    // Validate room data before sending
    if (!room.roomType || room.roomType <= 0) {
      return throwError(() => new Error('Invalid room type'));
    }

    console.log('Service: Creating room with data:', room);

    return this.http
      .post<Room>(`${this.apiUrl}/x/api/v2/hsp/rooms`, room, {
        headers: this.headers,
      })
      .pipe(
        tap((createdRoom) => {
          console.log('Service: Room created successfully:', createdRoom);
        }),
        catchError((error) => {
          console.error('Service: Error creating room:', error);
          return throwError(() => error);
        })
      );
  }

  updateRoom(id: number, room: Room): Observable<Room> {
    return this.http.put<Room>(
      `${this.apiUrl}/x/api/v2/hsp/rooms/${id}`,
      room,
      { headers: this.headers }
    );
  }

  deleteRoom(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/x/api/v2/hsp/rooms/${id}`, {
      headers: this.headers,
    });
  }

  // Enhanced Guest Endpoints
  getGuests(): Observable<Guest[]> {
    return this.http.get<Guest[]>(`${this.apiUrl}/x/api/v2/hsp/guests`, {
      headers: this.headers,
    });
  }

  searchGuests(query: string): Observable<Guest[]> {
    return this.http.get<Guest[]>(
      `${this.apiUrl}/x/api/v2/hsp/guests/search?query=${encodeURIComponent(
        query
      )}`,
      { headers: this.headers }
    );
  }

  getGuest(id: number): Observable<Guest> {
    return this.http.get<Guest>(`${this.apiUrl}/x/api/v2/hsp/guests/${id}`, {
      headers: this.headers,
    });
  }

  createGuest(guest: Guest): Observable<Guest> {
    return this.http.post<Guest>(`${this.apiUrl}/x/api/v2/hsp/guests`, guest, {
      headers: this.headers,
    });
  }

  updateGuest(id: number, guest: Guest): Observable<Guest> {
    return this.http.put<Guest>(
      `${this.apiUrl}/x/api/v2/hsp/guests/${id}`,
      guest,
      { headers: this.headers }
    );
  }

  deleteGuest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/x/api/v2/hsp/guests/${id}`, {
      headers: this.headers,
    });
  }

  // Enhanced Booking Endpoints
  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/x/api/v2/hsp/bookings`, {
      headers: this.headers,
    });
  }

  getBooking(id: number): Observable<Booking> {
    return this.http.get<Booking>(
      `${this.apiUrl}/x/api/v2/hsp/bookings/${id}`,
      { headers: this.headers }
    );
  }

  createBooking(booking: Booking): Observable<Booking> {
    return this.http.post<Booking>(
      `${this.apiUrl}/x/api/v2/hsp/bookings`,
      booking,
      { headers: this.headers }
    );
  }

  updateBooking(id: number, booking: Booking): Observable<Booking> {
    return this.http.put<Booking>(
      `${this.apiUrl}/x/api/v2/hsp/bookings/${id}`,
      booking,
      { headers: this.headers }
    );
  }

  getBookingsByStatus(status: BookingStatus): Observable<Booking[]> {
    let params = new HttpParams().set('status', status);

    return this.http.get<Booking[]>(`${this.apiUrl}/x/api/v2/hsp/bookings`, {
      headers: this.headers,
      params: params,
    });
  }

  getCheckInBookings(): Observable<Booking[]> {
    return this.getBookingsByStatus('CHECKED_IN');
  }

  getCheckOutBookings(): Observable<Booking[]> {
    return this.getBookingsByStatus('CHECKED_OUT');
  }

  getNoShowBookings(): Observable<Booking[]> {
    return this.getBookingsByStatus('NO_SHOW');
  }

  getPendingBookings(): Observable<Booking[]> {
    return this.getBookingsByStatus('PENDING');
  }

  getCancelledBookings(): Observable<Booking[]> {
    return this.getBookingsByStatus('CANCELLED');
  }

  getConfirmedBookings(): Observable<Booking[]> {
    return this.getBookingsByStatus('CONFIRMED');
  }

  deleteBooking(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/x/api/v2/hsp/bookings/${id}`,
      { headers: this.headers }
    );
  }

  // Enhanced Booking Details Endpoints
  getBookingDetails(bookingId: number): Observable<BookingDetail[]> {
    return this.http.get<BookingDetail[]>(
      `${this.apiUrl}/x/api/v2/hsp/bookingDetails?booking=${bookingId}`,
      { headers: this.headers }
    );
  }

  createBookingDetail(bookingDetail: BookingDetail): Observable<BookingDetail> {
    return this.http.post<BookingDetail>(
      `${this.apiUrl}/x/api/v2/hsp/bookingDetails`,
      bookingDetail,
      { headers: this.headers }
    );
  }

  updateBookingDetail(
    id: number,
    bookingDetail: BookingDetail
  ): Observable<BookingDetail> {
    return this.http.put<BookingDetail>(
      `${this.apiUrl}/x/api/v2/hsp/bookingDetails/${id}`,
      bookingDetail,
      { headers: this.headers }
    );
  }

  deleteBookingDetail(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/x/api/v2/hsp/bookingDetails/${id}`,
      { headers: this.headers }
    );
  }

  // ID Scanning Service
  scanIdDocument(imageData: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/x/api/v2/hsp/scan/id`,
      { image: imageData },
      { headers: this.headers }
    );
  }

  // Maintenance Request Endpoints
  getMaintenanceRequests(): Observable<MaintenainceRequest[]> {
    return this.http.get<MaintenainceRequest[]>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords`,
      { headers: this.headers }
    );
  }

  getMaintenanceRequest(id: number): Observable<MaintenainceRequest> {
    return this.http.get<MaintenainceRequest>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords/${id}`,
      { headers: this.headers }
    );
  }

  createMaintenanceRequest(
    request: MaintenainceRequest
  ): Observable<MaintenainceRequest> {
    return this.http.post<MaintenainceRequest>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords`,
      request,
      { headers: this.headers }
    );
  }

  updateMaintenanceRequest(
    id: number,
    request: MaintenainceRequest
  ): Observable<MaintenainceRequest> {
    return this.http.put<MaintenainceRequest>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords/${id}`,
      request,
      { headers: this.headers }
    );
  }

  deleteMaintenanceRequest(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords/${id}`,
      { headers: this.headers }
    );
  }

  // Helper methods for enums
  getRoomStatuses(): RoomStatus[] {
    return ['AVAILABLE', 'OCCUPIED', 'BOOKED', 'UNDER_MAINTENANCE', 'CLEANING'];
  }

  getBookingStatuses(): BookingStatus[] {
    return [
      'CONFIRMED',
      'PENDING',
      'CANCELLED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'NO_SHOW',
    ];
  }

  getTitles(): string[] {
    return ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
  }

  getGenders(): string[] {
    return ['Male', 'Female', 'Other', 'Prefer not to say'];
  }

  getCountries(): string[] {
    return [
      'Nigeria',
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
      'Germany',
      'France',
      'Ghana',
      'South Africa',
      'Kenya',
      'Egypt',
      'Morocco',
    ];
  }

  // Utility method to handle errors
  private handleError(error: any): void {
    console.error('An error occurred:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'An unexpected error occurred',
    });
  }

  // Additional utility methods
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  calculateNights(checkinDate: string, checkoutDate: string): number {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    const timeDiff = checkout.getTime() - checkin.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  calculateTotal(subTotal: number, taxes: number = 0): number {
    return subTotal + taxes;
  }

  getPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/x/api/v2/hsp/payments`, {
      headers: this.headers,
    });
  }

  createPayment(payment: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/x/api/v2/hsp/payments`,
      payment,
      { headers: this.headers }
    );
  }

  getPayment(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/x/api/v2/hsp/payments/${id}`, {
      headers: this.headers,
    });
  }

  getHeaders(): HttpHeaders {
    return this.headers;
  }
}
