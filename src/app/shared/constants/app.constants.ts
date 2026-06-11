export class AppConstants {
  // Storage Keys
  static readonly STORAGE_BRANDING = 'optimax_settings';
  static readonly STORAGE_LAST_BOOKING = 'lastBooking';
  static readonly STORAGE_USER_ID = 'userid';
  static readonly STORAGE_USERNAME = 'username';
  static readonly STORAGE_THEME = 'theme';

  // Timing (milliseconds)
  static readonly SKELETON_MIN_DURATION = 500;
  static readonly CAROUSEL_SLIDE_INTERVAL = 4000;
  static readonly DEBOUNCE_TIME = 300;
  static readonly API_TIMEOUT = 30000;

  // Validation
  static readonly USERNAME_MIN_LENGTH = 3;
  static readonly USERNAME_MAX_LENGTH = 20;
  static readonly PASSWORD_MIN_LENGTH = 6;
  static readonly FULLNAME_MAX_LENGTH = 100;

  // Validation Patterns
  static readonly PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Routes (Whitelist for returnUrl validation)
  static readonly ALLOWED_RETURN_ROUTES = [
    '/e-bookings/home',
    '/e-bookings/auth/login',
    '/user/e-bookings/checkout',
    '/user/e-bookings/home'
  ];

  // Error Messages
  static readonly ERROR_NETWORK = 'Network error. Please check your connection.';
  static readonly ERROR_INVALID_CREDENTIALS = 'Invalid username or password.';
  static readonly ERROR_EMAIL_EXISTS = 'Email already registered.';
  static readonly ERROR_USERNAME_EXISTS = 'Username already taken.';
  static readonly ERROR_INVALID_FORM = 'Please fill in all required fields correctly.';
  static readonly ERROR_BOOKING_FAILED = 'Booking failed. Please try again.';
  static readonly ERROR_SERVICE_UNAVAILABLE = 'Service temporarily unavailable. Please try again later.';
  static readonly ERROR_ROOM_NOT_FOUND = 'Room not found.';
  static readonly ERROR_INVALID_DATE = 'Checkout date must be after check-in date.';
}
