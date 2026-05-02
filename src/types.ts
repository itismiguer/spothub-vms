import { Timestamp } from 'firebase/firestore';

export interface Facility {
  id: string;
  name: string;
  type: string;
  address: string;
  description: string;
  images: string[];
  coverImage?: string;
  amenities?: string[];
  operating_hours?: { open: string; close: string };
  rules?: string;
  lat: number;
  lng: number;
  status?: 'LIVE' | 'DEACTIVATED';
  showPublicSchedule?: boolean;
}

export interface Court {
  id: string;
  facilityId: string;
  name: string;
  hourlyRate: number;
  isActive?: boolean;
}

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  userName?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  facilityId: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
  ownerReply?: { text: string; updatedAt: Timestamp };
  hidden?: boolean;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'USER' | 'STAFF';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  facilityId?: string;
  email_confirmed_at?: string;
}
