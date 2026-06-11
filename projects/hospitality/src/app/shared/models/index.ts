export interface Amenity {
  name: string;
  icon: string;
}

export interface Room {
  id: number;
  roomNumber: string | number;
  name: string;
  typeId: number;
  description: string;
  price: number;
  capacity: number;
  amenities: Amenity[];
  images: string[];
  activeImageIndex: number;
  available: boolean;
}

export interface RoomDetail {
  id: number;
  roomNumber: string;
  roomType: number;
  roomTypeName: string;
  rate: number;
  maxOccupancy: number;
  beds: number;
  floor: number;
  description: string;
  amenities: string[];
  images: string[];
  displayPrice: number;
  capacity: number;
  bedsCount: number;
  floorNumber: number;
  rating: number;
  reviewsCount: number;
}

export interface AuthPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  fullname: string;
  username: string;
  email: string;
  phonenumber: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface BookingRequest {
  roomId: number;
  checkinDate: string;
  checkoutDate: string;
  adults: number;
  children: number;
  guestInfo: GuestInfo;
  additionalServices: number[];
}

export interface BookingConfirmation {
  id?: string;
  bookingId?: string;
  roomId?: number;
  checkinDate?: string;
  checkoutDate?: string;
  totalPrice?: number;
  confirmationCode?: string;
  [key: string]: any;
}

export interface BrandSettings {
  companyName: string;
  logo: string | null;
  logoPosition: 'left' | 'center' | 'right';
  footerDescription?: string;
}

export interface RoomType {
  id: number;
  name: string;
}

export interface ApiRoom {
  id: number;
  roomNumber: string;
  roomType: number;
  rate: number;
  maxOccupancy: number;
  beds: number;
  floor: number;
  description?: string;
  amenities?: string[];
  imageURLs?: string[];
  roomStatus?: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';
}
