export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  sport?: string;
  address: string;
  description: string;
  images: string[];
  cover_image?: string;
  amenities?: string[];
  operating_hours?: { open: string; close: string };
  opening_hours?: OpeningHours;
  buffer_time_mins?: number;
  min_booking_duration_mins?: number;
  timezone?: string;
  currency_code?: string;
  rules?: string;
  latitude: number;
  longitude: number;
  status?: 'ACTIVE' | 'LIVE' | 'DEACTIVATED' | 'PENDING';
  slug: string;
  street_address: string;
  unit_number?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  phone_number: string;
  has_canteen: boolean;
  allow_outside_food: boolean;
  corkage_fee_amount?: number;
  show_public_schedule?: boolean;
}

export interface Court {
  id: string;
  facility_id: string;
  name: string;
  hourly_rate: number;
  sport: string;
  environment: 'INDOOR' | 'OUTDOOR';
  surface_type: string;
  image_url?: string;
  is_active: boolean;
  deleted_at?: string | null;
}

export interface Booking {
  id: string;
  court_id: string;
  user_id: string;
  user_name?: string;
  start_time: string;
  end_time: string;
  status: string;
  facility_id: string;
  facility_name?: string;
  court_name?: string;
  amount?: number;
  total_price?: number;
  payment_receipt_url?: string;
  payment_proof_url?: string;
  booking_reference?: string;
  created_at?: string;
  cancellation_reason?: string;
  checked_in_at?: string;
  payment_status?: 'pending' | 'paid' | 'failed';
}

export interface StaffAccess {
  id: string;
  facility_id: string;
  user_id: string;
  role: 'MANAGER' | 'STAFF';
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  facility_id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  owner_reply?: { text: string; updated_at: string };
  hidden?: boolean;
}

export type UserRole = 'PLAYER' | 'OWNER' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | 'UNASSIGNED';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  default_sport?: string;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  facility_id?: string;
  business_name?: string;
  business_address?: string;
  verification_doc_url?: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  facility_id: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'BOOKING_CONFIRMED' | 'NEW_BOOKING' | 'PAYMENT_VERIFIED' | 'VENUE_LIVE' | 'SYSTEM';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  booking_id: string;
  facility_id: string;
  owner_id: string;
  total_amount: number;
  platform_fee: number;
  owner_amount: number;
  status: 'pending' | 'payout_scheduled' | 'paid';
  withdrawal_id?: string;
  currency_code: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  owner_id: string;
  amount: number;
  currency_code: string;
  method: 'bank' | 'e-wallet';
  details: {
    account_name: string;
    account_number: string;
    bank_name?: string;
    swift_code?: string;
    provider?: string; // e.g., GCash, PayMaya
  };
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  processed_at?: string;
  created_at: string;
}

