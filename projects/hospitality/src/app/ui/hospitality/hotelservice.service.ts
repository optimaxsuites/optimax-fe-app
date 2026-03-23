import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  of,
  tap,
  catchError,
  throwError,
  map,
} from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';
import { MessageService } from 'primeng/api';

// ────────────────────── Interfaces ──────────────────────

export interface RoomTypeDTO {
  id?: number;
  name: string;
  description?: string;
}

export interface AdditionalDetail {
  id?: number;
  name: string;
  description?: string;
  price: number;
  measurements: 'UNIT' | 'HOUR' | 'DAY' | 'KG';
}

export interface ServiceCharge {
  id?: number;
  description: string;
  amount: number;
  applicableFrom: string;
  applicableTo: string;
  room: number;
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
  id?: number;
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
  id?: number;
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
  payment?: number;
  rooms: number[];
}

export interface Payment {
  id?: number;
  bookingId: number;
  amountPaid: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidOn: string;
  reference?: string;
  note?: string;
  bookingg?: number; // API field
}

export interface MaintenainceRequest {
  id?: number;
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

export interface HousekeepingRecord {
  id?: number;
  status: string;
  lastCleaned: string;
  notes?: string;
  room: number;
}

// ────────────────────── Enums & Types ──────────────────────

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

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'POS' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface RoomFilters {
  status?: RoomStatus;
  roomTypeId?: number;
}
export interface BookingFilters {
  status?: BookingStatus;
}

// ────────────────────── Service ──────────────────────

@Injectable({
  providedIn: 'root',
})
export class HotelserviceService {
  /** Safely extract an ID from a variety of object structures */
  getId(obj: any): any {
    if (obj == null) return null;
    if (typeof obj === 'number' || typeof obj === 'string') return obj;
    const target = obj.data || obj;
    return (
      target.id ??
      target.bookingId ??
      target.idBooking ??
      target.guestId ??
      target.idGuest ??
      target.idRoom ??
      target.roomId ??
      target.room_id ??
      target.guest_id ??
      target.id_room ??
      target.id_guest ??
      target.customerId ??
      target.idCustomer ??
      null
    );
  }

  /** Gets a field value from an object using a prioritized list of possible keys */
  getF(obj: any, keys: string[]): any {
    if (!obj || typeof obj !== 'object') return null;
    const target = obj.data || obj;
    for (const k of keys) {
      if (target[k] !== undefined && target[k] !== null) return target[k];
    }
    return null;
  }

  /** Normalizes a booking object from any API shape */
  normalizeBooking(b: any): Booking {
    const raw = b?.data || b || {};
    console.log(
      'DEBUG: Hotelservice — Normalizing booking:',
      JSON.stringify(raw),
    );
    // Extract guest ID or object
    let guestRaw = this.getF(raw, [
      'guest',
      'guestId',
      'idGuest',
      'guest_id',
      'id_guest',
      'user',
      'userId',
      'customerId',
      'idCustomer',
    ]);
    let guest: Guest | number;

    if (guestRaw && typeof guestRaw === 'object') {
      const g = guestRaw.data || guestRaw;
      guest = {
        ...g,
        id: this.getId(g),
        firstName: this.getF(g, ['firstName', 'first_name', 'name']),
        lastName: this.getF(g, ['lastName', 'last_name', 'surname']),
        email: this.getF(g, ['email', 'userEmail']),
        phone: this.getF(g, ['phone', 'phoneNumber', 'idPhone']),
      } as Guest;
    } else {
      guest = Number(guestRaw);
    }

    // Extract room IDs or objects
    let roomsRaw = this.getF(raw, [
      'rooms',
      'roomIds',
      'idRooms',
      'room',
      'id_room',
      'room_ids',
      'rooms_ids',
      'roomNumbers',
    ]);
    if (roomsRaw && !Array.isArray(roomsRaw)) roomsRaw = [roomsRaw];
    if (!roomsRaw) roomsRaw = [];

    const rooms = roomsRaw
      .map((r: any) => {
        if (typeof r === 'object' && r !== null) {
          return this.getId(r);
        }
        return r != null ? Number(r) : null;
      })
      .filter((id: any) => id != null && !isNaN(id));

    return {
      ...raw,
      id: this.getId(raw),
      checkinDate: this.getF(raw, [
        'checkinDate',
        'checkInDate',
        'idCheckin',
        'arrivalDate',
        'startDate',
        'check_in_date',
      ]),
      checkoutDate: this.getF(raw, [
        'checkoutDate',
        'checkOutDate',
        'idCheckout',
        'departureDate',
        'endDate',
        'check_out_date',
      ]),
      guest: guest,
      rooms: rooms,
      adults: Number(
        this.getF(raw, [
          'adults',
          'noOfAdults',
          'adultCount',
          'no_of_adults',
        ]) ||
          raw.adults ||
          0,
      ),
      children: Number(
        this.getF(raw, [
          'children',
          'noOfChildren',
          'childCount',
          'childs',
          'no_of_children',
        ]) ||
          raw.children ||
          0,
      ),
      total: Number(
        this.getF(raw, [
          'total',
          'totalPrice',
          'amount',
          'id_total',
          'total_amount',
        ]) ||
          raw.total ||
          0,
      ),
      subTotal: Number(
        this.getF(raw, ['subTotal', 'subtotal', 'id_subtotal', 'sub_total']) ||
          raw.subTotal ||
          0,
      ),
      status:
        this.getF(raw, [
          'status',
          'bookingStatus',
          'id_status',
          'state',
          'booking_status',
        ]) || raw.status,
    };
  }

  /** Prepares a booking payload for creation/updating */
  prepareBookingPayload(booking: Booking): any {
    const gId = this.getId(booking.guest);
    const roomIds = (booking.rooms || [])
      .map((r) => this.getId(r))
      .filter((id) => id != null);
    const paymentId = this.getId(booking.payment);

    // Send clean payload - match API documentation schema exactly
    const payload = {
      checkinDate: booking.checkinDate,
      checkoutDate: booking.checkoutDate,
      adults: String(booking.adults), // API expects strings
      children: String(booking.children),
      specialRequests: booking.specialRequests || '',
      depositAmount: String(booking.depositAmount || 0),
      subTotal: String(booking.subTotal || 0),
      taxes: String(booking.taxes || 0),
      total: String(booking.total || 0),
      balanceAmount: String(booking.balanceAmount || 0),
      status: booking.status || 'CONFIRMED',
      guest: gId ? Number(gId) : null,
      payment: paymentId ? Number(paymentId) : null,
      rooms: roomIds.map((id) => Number(id)),
    };

    console.log(
      'DEBUG: Prepared booking payload:',
      JSON.stringify(payload, null, 2),
    );
    console.log('DEBUG: Guest ID:', gId);
    console.log('DEBUG: Room IDs:', roomIds);
    console.log('DEBUG: Payment ID:', paymentId);

    return payload;
  }

  private apiUrl = environment.apiBaseUrl;
  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  // ── Caches (BehaviorSubjects) ──
  private roomTypes$ = new BehaviorSubject<RoomTypeDTO[]>([]);
  private roomsCache$ = new BehaviorSubject<Room[]>([]);
  private guestsCache$ = new BehaviorSubject<Guest[]>([]);
  private additionalDetailsCache$ = new BehaviorSubject<AdditionalDetail[]>([]);
  private bookingsCache$ = new BehaviorSubject<Booking[]>([]);
  private paymentsCache$ = new BehaviorSubject<Payment[]>([]);

  private roomTypesLoaded = false;
  private roomsLoaded = false;
  private guestsLoaded = false;
  private additionalDetailsLoaded = false;
  private bookingsLoaded = false;
  private paymentsLoaded = false;

  // Room-type map for quick name lookup
  private roomTypeMap: Map<number, string> = new Map();

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
  ) {
  }

  // ══════════════════════════════════════════════════════
  //  INITIALIZATION
  // ══════════════════════════════════════════════════════

  loadInitialRoomTypes(): void {
    this.fetchRoomTypes().subscribe({
      next: (types) => {
        this.roomTypes$.next(types);
        this.roomTypesLoaded = true;
        this.buildRoomTypeMap(types);
      },
      error: (error) => this.handleError(error),
    });
  }

  private buildRoomTypeMap(types: RoomTypeDTO[]): void {
    this.roomTypeMap.clear();
    types.forEach((t) => {
      if (t.id != null) this.roomTypeMap.set(t.id, t.name);
    });
  }

  /** Resolve a room type ID to its name */
  getRoomTypeNameById(id: any): string {
    if (id == null) return 'Unknown';

    // Handle if ID is an object from API
    const typeId =
      typeof id === 'object' ? id.id || id.bookingId || id.idBooking : id;
    if (typeId == null) return 'Unknown';

    // Try direct map lookup
    let name =
      this.roomTypeMap.get(Number(typeId)) ||
      (this.roomTypeMap as any).get(String(typeId));

    // If still not found, try iterate map for loose match
    if (!name) {
      for (const [key, val] of this.roomTypeMap.entries()) {
        if (String(key) == String(typeId)) {
          name = val;
          break;
        }
      }
    }

    return name || `Type #${typeId}`;
  }

  // ══════════════════════════════════════════════════════
  //  ROOM TYPES
  // ══════════════════════════════════════════════════════

  getRoomTypesObservable(): Observable<RoomTypeDTO[]> {
    return this.roomTypes$.asObservable();
  }

  /** Cache-aware getter */
  getRoomTypes(): Observable<RoomTypeDTO[]> {
    if (this.roomTypesLoaded && this.roomTypes$.getValue().length > 0) {
      return of(this.roomTypes$.getValue());
    }
    return this.fetchRoomTypes().pipe(
      tap((types) => {
        this.roomTypes$.next(types);
        this.roomTypesLoaded = true;
        this.buildRoomTypeMap(types);
      }),
    );
  }

  private fetchRoomTypes(): Observable<RoomTypeDTO[]> {
    return this.http
      .get<RoomTypeDTO[]>(`${this.apiUrl}/x/api/v2/hsp/roomTypes`, {
        headers: this.headers,
      })
      .pipe(
        catchError((error) => {
          console.error('Error fetching room types:', error);
          return throwError(() => error);
        }),
      );
  }

  createRoomType(roomType: RoomTypeDTO): Observable<RoomTypeDTO> {
    return this.http
      .post<RoomTypeDTO>(`${this.apiUrl}/x/api/v2/hsp/roomTypes`, roomType, {
        headers: this.headers,
      })
      .pipe(
        tap((created) => {
          const current = this.roomTypes$.getValue();
          const updated = [...current, created];
          this.roomTypes$.next(updated);
          this.buildRoomTypeMap(updated);
        }),
        catchError((error) => {
          console.error('Error creating room type:', error);
          return throwError(() => error);
        }),
      );
  }

  getRoomType(id: number): Observable<RoomTypeDTO> {
    return this.http.get<RoomTypeDTO>(
      `${this.apiUrl}/x/api/v2/hsp/roomTypes/${id}`,
      {
        headers: this.headers,
      },
    );
  }

  updateRoomType(id: number, roomType: RoomTypeDTO): Observable<RoomTypeDTO> {
    return this.http
      .put<RoomTypeDTO>(
        `${this.apiUrl}/x/api/v2/hsp/roomTypes/${id}`,
        roomType,
        {
          headers: this.headers,
        },
      )
      .pipe(
        tap(() => {
          const current = this.roomTypes$.getValue();
          const idx = current.findIndex((rt) => rt.id === id);
          if (idx >= 0) {
            current[idx] = { ...roomType, id };
            this.roomTypes$.next([...current]);
            this.buildRoomTypeMap(current);
          }
        }),
        catchError((error) => {
          console.error('Error updating room type:', error);
          return throwError(() => error);
        }),
      );
  }

  deleteRoomType(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/x/api/v2/hsp/roomTypes/${id}`, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          const updated = this.roomTypes$
            .getValue()
            .filter((rt) => rt.id !== id);
          this.roomTypes$.next(updated);
          this.buildRoomTypeMap(updated);
        }),
        catchError((error) => {
          console.error('Error deleting room type:', error);
          return throwError(() => error);
        }),
      );
  }

  // ══════════════════════════════════════════════════════
  //  ADDITIONAL DETAILS (SERVICES)
  // ══════════════════════════════════════════════════════

  getAdditionalDetails(): Observable<AdditionalDetail[]> {
    if (
      this.additionalDetailsLoaded &&
      this.additionalDetailsCache$.getValue().length > 0
    ) {
      return of(this.additionalDetailsCache$.getValue());
    }
    return this.http
      .get<AdditionalDetail[]>(
        `${this.apiUrl}/x/api/v2/hsp/additionalDetails`,
        {
          headers: this.headers,
        },
      )
      .pipe(
        tap((data) => {
          this.additionalDetailsCache$.next(data);
          this.additionalDetailsLoaded = true;
        }),
        catchError((err) => {
          console.error('Error fetching additional details:', err);
          return throwError(() => err);
        }),
      );
  }

  getAdditionalDetail(id: number): Observable<AdditionalDetail> {
    return this.http.get<AdditionalDetail>(
      `${this.apiUrl}/x/api/v2/hsp/additionalDetails/${id}`,
      {
        headers: this.headers,
      },
    );
  }

  createAdditionalDetail(
    service: AdditionalDetail,
  ): Observable<AdditionalDetail> {
    return this.http
      .post<AdditionalDetail>(
        `${this.apiUrl}/x/api/v2/hsp/additionalDetails`,
        service,
        {
          headers: this.headers,
        },
      )
      .pipe(
        tap((created) => {
          this.additionalDetailsCache$.next([
            ...this.additionalDetailsCache$.getValue(),
            created,
          ]);
        }),
      );
  }

  updateAdditionalDetail(
    id: number,
    service: AdditionalDetail,
  ): Observable<AdditionalDetail> {
    return this.http
      .put<AdditionalDetail>(
        `${this.apiUrl}/x/api/v2/hsp/additionalDetails/${id}`,
        service,
        {
          headers: this.headers,
        },
      )
      .pipe(
        tap(() => {
          this.additionalDetailsLoaded = false;
        }),
      );
  }

  deleteAdditionalDetail(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/x/api/v2/hsp/additionalDetails/${id}`, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.additionalDetailsCache$.next(
            this.additionalDetailsCache$.getValue().filter((s) => s.id !== id),
          );
        }),
      );
  }

  // ══════════════════════════════════════════════════════
  //  SERVICE CHARGES
  // ══════════════════════════════════════════════════════

  getServiceCharges(): Observable<ServiceCharge[]> {
    return this.http.get<ServiceCharge[]>(
      `${this.apiUrl}/x/api/v2/hsp/serviceCharges`,
      {
        headers: this.headers,
      },
    );
  }

  getServiceCharge(id: number): Observable<ServiceCharge> {
    return this.http.get<ServiceCharge>(
      `${this.apiUrl}/x/api/v2/hsp/serviceCharges/${id}`,
      {
        headers: this.headers,
      },
    );
  }

  createServiceCharge(charge: ServiceCharge): Observable<ServiceCharge> {
    return this.http.post<ServiceCharge>(
      `${this.apiUrl}/x/api/v2/hsp/serviceCharges`,
      charge,
      {
        headers: this.headers,
      },
    );
  }

  updateServiceCharge(
    id: number,
    charge: ServiceCharge,
  ): Observable<ServiceCharge> {
    return this.http.put<ServiceCharge>(
      `${this.apiUrl}/x/api/v2/hsp/serviceCharges/${id}`,
      charge,
      {
        headers: this.headers,
      },
    );
  }

  deleteServiceCharge(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/x/api/v2/hsp/serviceCharges/${id}`,
      {
        headers: this.headers,
      },
    );
  }

  // ══════════════════════════════════════════════════════
  //  ROOMS
  // ══════════════════════════════════════════════════════

  getRoom(id: number): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/x/api/v2/hsp/rooms/${id}`, {
      headers: this.headers,
    });
  }

  /** Cache-aware rooms getter */
  getRooms(filters: RoomFilters = {}): Observable<Room[]> {
    // Always fetch fresh if filters applied
    if (filters.status || filters.roomTypeId) {
      return this.fetchRooms(filters);
    }
    if (this.roomsLoaded && this.roomsCache$.getValue().length > 0) {
      return of(this.roomsCache$.getValue());
    }
    return this.fetchRooms(filters).pipe(
      tap((data) => {
        console.log('DEBUG: RAW ROOMS FROM API:', data);
        this.roomsCache$.next(data);
        this.roomsLoaded = true;
      }),
      catchError((err) => {
        console.error('ERROR fetching rooms:', err);
        return throwError(() => err);
      }),
    );
  }

  private fetchRooms(filters: RoomFilters = {}): Observable<Room[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.roomTypeId)
      params = params.set('roomTypeId', filters.roomTypeId.toString());
    return this.http.get<Room[]>(`${this.apiUrl}/x/api/v2/hsp/rooms`, {
      headers: this.headers,
      params,
    });
  }

  refreshRoomsCache(): void {
    this.roomsLoaded = false;
  }

  getRoomsByStatus(status: RoomStatus): Observable<Room[]> {
    return this.getRooms({ status });
  }

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
    return this.http
      .post<Room>(`${this.apiUrl}/x/api/v2/hsp/rooms`, room, {
        headers: this.headers,
      })
      .pipe(
        tap((created) => {
          this.roomsCache$.next([...this.roomsCache$.getValue(), created]);
        }),
        catchError((error) => {
          console.error('Error creating room:', error);
          return throwError(() => error);
        }),
      );
  }

  updateRoom(id: any, room: Room): Observable<Room> {
    const fixedId = this.getId(id);
    return this.http
      .put<Room>(`${this.apiUrl}/x/api/v2/hsp/rooms/${fixedId}`, room, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.roomsLoaded = false;
        }),
        catchError((err) => {
          console.error('Error updating room:', err);
          return throwError(() => err);
        }),
      );
  }

  deleteRoom(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/x/api/v2/hsp/rooms/${id}`, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.roomsCache$.next(
            this.roomsCache$.getValue().filter((r) => r.id !== id),
          );
        }),
      );
  }

  // ══════════════════════════════════════════════════════
  //  GUESTS
  // ══════════════════════════════════════════════════════

  /** Cache-aware guests getter */
  getGuests(): Observable<Guest[]> {
    if (this.guestsLoaded && this.guestsCache$.getValue().length > 0) {
      return of(this.guestsCache$.getValue());
    }
    return this.http
      .get<Guest[]>(`${this.apiUrl}/x/api/v2/hsp/guests`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          console.log('DEBUG: RAW GUESTS FROM API:', data);
          this.guestsCache$.next(data);
          this.guestsLoaded = true;
        }),
        catchError((err) => {
          console.error('Error fetching guests:', err);
          return throwError(() => err);
        }),
      );
  }

  searchGuests(query: string): Observable<Guest[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Guest[]>(`${this.apiUrl}/x/api/v2/hsp/guests`, {
      headers: this.headers,
      params,
    });
  }

  createGuest(guest: Guest): Observable<Guest> {
    return this.http
      .post<Guest>(`${this.apiUrl}/x/api/v2/hsp/guests`, guest, {
        headers: this.headers,
      })
      .pipe(
        tap((created) => {
          this.guestsCache$.next([...this.guestsCache$.getValue(), created]);
        }),
      );
  }

  updateGuest(id: any, guest: Guest): Observable<Guest> {
    const fixedId = this.getId(id);
    return this.http
      .put<Guest>(`${this.apiUrl}/x/api/v2/hsp/guests/${fixedId}`, guest, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.guestsLoaded = false;
        }),
      );
  }

  deleteGuest(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/x/api/v2/hsp/guests/${id}`, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.guestsCache$.next(
            this.guestsCache$.getValue().filter((g) => g.id !== id),
          );
        }),
      );
  }

  /** Resolve a guest object from ID or Guest reference */
  resolveGuestName(guest: Guest | number): string {
    if (typeof guest === 'object' && guest !== null) {
      return `${guest.title || ''} ${guest.firstName} ${guest.lastName}`.trim();
    }
    const cached = this.guestsCache$
      .getValue()
      .find((g) => String(this.getId(g)) === String(guest));
    return cached
      ? `${cached.title || ''} ${cached.firstName} ${cached.lastName}`.trim()
      : `Guest #${guest}`;
  }

  getGuest(id: number): Observable<Guest> {
    return this.http
      .get<Guest>(`${this.apiUrl}/x/api/v2/hsp/guests/${id}`, {
        headers: this.headers,
      })
      .pipe(
        catchError((err) => {
          console.error('Error fetching guest:', err);
          return throwError(() => err);
        }),
      );
  }

  // ══════════════════════════════════════════════════════
  //  BOOKINGS
  // ══════════════════════════════════════════════════════

  /** Cache-aware bookings getter */
  getBookings(): Observable<Booking[]> {
    if (this.bookingsLoaded && this.bookingsCache$.getValue().length > 0) {
      return of(this.bookingsCache$.getValue());
    }
    return this.http
      .get<any[]>(`${this.apiUrl}/x/api/v2/hsp/bookings`, {
        headers: this.headers,
      })
      .pipe(
        map((list) => list.map((b) => this.normalizeBooking(b))),
        tap((data) => {
          console.log('DEBUG: RAW BOOKINGS FROM API:', data);
          this.bookingsCache$.next(data);
          this.bookingsLoaded = true;
        }),
        catchError((err) => {
          console.error('Error fetching bookings:', err);
          return throwError(() => err);
        }),
      );
  }

  refreshBookingsCache(): void {
    this.bookingsLoaded = false;
  }

  getBooking(id: number): Observable<Booking> {
    return this.http
      .get<any>(`${this.apiUrl}/x/api/v2/hsp/bookings/${id}`, {
        headers: this.headers,
      })
      .pipe(
        map((res) => this.normalizeBooking(res)),
        catchError((err) => {
          console.error('Error fetching booking:', err);
          return throwError(() => err);
        }),
      );
  }

  createBooking(booking: Booking): Observable<Booking> {
    const payload = this.prepareBookingPayload(booking);
    console.log(
      'DEBUG: Creating booking with payload:',
      JSON.stringify(payload),
    );
    return this.http
      .post<any>(`${this.apiUrl}/x/api/v2/hsp/bookings`, payload, {
        headers: this.headers,
      })
      .pipe(
        map((res) => this.normalizeBooking(res)),
        tap((created) => {
          this.bookingsCache$.next([
            ...this.bookingsCache$.getValue(),
            created,
          ]);
        }),
        catchError((err) => {
          console.error('DEBUG: ERROR creating booking:', err);
          if (err.error) console.error('DEBUG: Error body:', err.error);
          return throwError(() => err);
        }),
      );
  }

  updateBooking(id: any, booking: Booking): Observable<Booking> {
    const fixedId = this.getId(id);
    const payload = this.prepareBookingPayload(booking);
    console.log(
      `DEBUG: Updating booking #${fixedId} with payload:`,
      JSON.stringify(payload),
    );
    return this.http
      .put<any>(`${this.apiUrl}/x/api/v2/hsp/bookings/${fixedId}`, payload, {
        headers: this.headers,
      })
      .pipe(
        map((res) => this.normalizeBooking(res)),
        tap(() => {
          this.bookingsLoaded = false;
        }),
        catchError((err) => {
          console.error('DEBUG: ERROR updating booking:', err);
          if (err.error) console.error('DEBUG: Error body:', err.error);
          return throwError(() => err);
        }),
      );
  }

  getBookingsByStatus(status: BookingStatus): Observable<Booking[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<Booking[]>(`${this.apiUrl}/x/api/v2/hsp/bookings`, {
      headers: this.headers,
      params,
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
    return this.http
      .delete<void>(`${this.apiUrl}/x/api/v2/hsp/bookings/${id}`, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.bookingsCache$.next(
            this.bookingsCache$.getValue().filter((b) => b.id !== id),
          );
        }),
      );
  }

  getBookingsByGuest(guestId: number): Observable<Booking[]> {
    const params = new HttpParams().set('guestId', guestId.toString());
    return this.http
      .get<Booking[]>(`${this.apiUrl}/x/api/v2/hsp/bookings`, {
        headers: this.headers,
        params,
      })
      .pipe(
        catchError((err) => {
          console.error('Error fetching guest bookings:', err);
          return throwError(() => err);
        }),
      );
  }

  getRoomsAvailable(checkin: string, checkout: string): Observable<Room[]> {
    const params = new HttpParams()
      .set('checkin', checkin)
      .set('checkout', checkout);
    return this.http
      .get<Room[]>(`${this.apiUrl}/x/api/v2/hsp/rooms/available`, {
        headers: this.headers,
        params,
      })
      .pipe(catchError(() => this.getRooms()));
  }

  // ══════════════════════════════════════════════════════
  //  PAYMENTS
  // ══════════════════════════════════════════════════════

  /** Cache-aware payments getter */
  getPayments(): Observable<Payment[]> {
    if (this.paymentsLoaded && this.paymentsCache$.getValue().length > 0) {
      return of(this.paymentsCache$.getValue());
    }
    return this.http
      .get<Payment[]>(`${this.apiUrl}/x/api/v2/hsp/payments`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          this.paymentsCache$.next(data);
          this.paymentsLoaded = true;
        }),
        catchError((err) => {
          console.error('Error fetching payments:', err);
          return throwError(() => err);
        }),
      );
  }

  refreshPaymentsCache(): void {
    this.paymentsLoaded = false;
  }

  getPayment(id: number): Observable<Payment> {
    return this.http.get<Payment>(
      `${this.apiUrl}/x/api/v2/hsp/payments/${id}`,
      {
        headers: this.headers,
      },
    );
  }

  createPayment(payment: Payment): Observable<Payment> {
    return this.http
      .post<Payment>(`${this.apiUrl}/x/api/v2/hsp/payments`, payment, {
        headers: this.headers,
      })
      .pipe(
        tap((created) => {
          this.paymentsCache$.next([
            ...this.paymentsCache$.getValue(),
            created,
          ]);
        }),
      );
  }

  updatePayment(id: number, payment: Payment): Observable<Payment> {
    return this.http
      .put<Payment>(`${this.apiUrl}/x/api/v2/hsp/payments/${id}`, payment, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.paymentsLoaded = false;
        }),
      );
  }

  deletePayment(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/x/api/v2/hsp/payments/${id}`, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.paymentsCache$.next(
            this.paymentsCache$.getValue().filter((p) => p.id !== id),
          );
        }),
      );
  }

  getPaymentsByBooking(bookingId: number): Observable<Payment[]> {
    return this.getPayments().pipe(
      map((payments) =>
        payments.filter(
          (p) => p.bookingId === bookingId || p.bookingg === bookingId,
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════
  //  MAINTENANCE RECORDS
  // ══════════════════════════════════════════════════════

  getMaintenanceRequests(): Observable<MaintenainceRequest[]> {
    return this.http.get<MaintenainceRequest[]>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords`,
      { headers: this.headers },
    );
  }

  getMaintenanceRequest(id: number): Observable<MaintenainceRequest> {
    return this.http.get<MaintenainceRequest>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords/${id}`,
      { headers: this.headers },
    );
  }

  createMaintenanceRequest(
    request: MaintenainceRequest,
  ): Observable<MaintenainceRequest> {
    return this.http.post<MaintenainceRequest>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords`,
      request,
      { headers: this.headers },
    );
  }

  updateMaintenanceRequest(
    id: number,
    request: MaintenainceRequest,
  ): Observable<MaintenainceRequest> {
    return this.http.put<MaintenainceRequest>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords/${id}`,
      request,
      { headers: this.headers },
    );
  }

  deleteMaintenanceRequest(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/x/api/v2/hsp/maintenanceRecords/${id}`,
      { headers: this.headers },
    );
  }

  // ══════════════════════════════════════════════════════
  //  HOUSEKEEPING RECORDS
  // ══════════════════════════════════════════════════════

  getHousekeepingRecords(): Observable<HousekeepingRecord[]> {
    return this.http.get<HousekeepingRecord[]>(
      `${this.apiUrl}/x/api/v2/hsp/housekeepingRecords`,
      { headers: this.headers },
    );
  }

  getHousekeepingRecord(id: number): Observable<HousekeepingRecord> {
    return this.http.get<HousekeepingRecord>(
      `${this.apiUrl}/x/api/v2/hsp/housekeepingRecords/${id}`,
      { headers: this.headers },
    );
  }

  createHousekeepingRecord(
    record: HousekeepingRecord,
  ): Observable<HousekeepingRecord> {
    return this.http.post<HousekeepingRecord>(
      `${this.apiUrl}/x/api/v2/hsp/housekeepingRecords`,
      record,
      { headers: this.headers },
    );
  }

  updateHousekeepingRecord(
    id: number,
    record: HousekeepingRecord,
  ): Observable<HousekeepingRecord> {
    return this.http.put<HousekeepingRecord>(
      `${this.apiUrl}/x/api/v2/hsp/housekeepingRecords/${id}`,
      record,
      { headers: this.headers },
    );
  }

  deleteHousekeepingRecord(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/x/api/v2/hsp/housekeepingRecords/${id}`,
      { headers: this.headers },
    );
  }

  // ══════════════════════════════════════════════════════
  //  ID SCANNING
  // ══════════════════════════════════════════════════════

  scanIdDocument(imageData: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/x/api/v2/hsp/scan/id`,
      { image: imageData },
      { headers: this.headers },
    );
  }

  // ══════════════════════════════════════════════════════
  //  HELPERS & ENUMS
  // ══════════════════════════════════════════════════════

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

  getPaymentMethods(): PaymentMethod[] {
    return ['CASH', 'CARD', 'TRANSFER', 'POS', 'ONLINE'];
  }

  getPaymentStatuses(): PaymentStatus[] {
    return ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
  }

  getMaintenanceTasks(): string[] {
    return [
      'CLEANING_REQUIRED',
      'REPAIR_REQUIRED',
      'INSPECTION_REQUIRED',
      'DEEP_CLEANING',
      'PEST_CONTROL',
      'GENERAL_MAINTENANCE',
    ];
  }

  getMaintenancePriorities(): string[] {
    return ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
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

  // Utility methods
  private handleError(error: any): void {
    console.error('An error occurred:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'An unexpected error occurred',
    });
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  calculateNights(
    checkinDate: string | null | undefined,
    checkoutDate: string | null | undefined,
  ): number {
    if (!checkinDate || !checkoutDate) return 0;
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    if (isNaN(checkin.getTime()) || isNaN(checkout.getTime())) return 0;
    const timeDiff = checkout.getTime() - checkin.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  }

  calculateTotal(subTotal: number, taxes: number = 0): number {
    return subTotal + taxes;
  }

  getHeaders(): HttpHeaders {
    return this.headers;
  }
}
