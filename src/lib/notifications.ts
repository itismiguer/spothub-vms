import { supabase } from './supabase';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'BOOKING_CONFIRMED' | 'NEW_BOOKING' | 'PAYMENT_VERIFIED' | 'VENUE_LIVE' | 'SYSTEM';
  link?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type,
  link
}: CreateNotificationParams) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false
      });
    
    if (error) console.error('Error creating notification:', error);
  } catch (err) {
    console.error('Notification trigger failed:', err);
  }
}
