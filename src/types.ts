export interface Facility {
  id: string;
  name: string;
  type: string;
  address: string;
  description: string;
  images: string[];
  cover_image?: string;
  amenities?: string[];
  operating_hours?: { open: string; close: string };
  rules?: string;
  lat: number;
  lng: number;
  status?: 'LIVE' | 'DEACTIVATED';
  show_public_schedule?: boolean;
}

export interface Court {
  id: string;
  facility_id: string;
  name: string;
  hourly_rate: number;
  is_active?: boolean;
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
  booking_reference?: string;
  created_at?: string;
  cancellation_reason?: string;
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

export type UserRole = 'PLAYER' | 'OWNER' | 'ADMIN' | 'STAFF';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  facility_id?: string;
  business_name?: string;
  business_address?: string;
  verification_doc_url?: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  created_at: string;
}
