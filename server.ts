import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import twilio from "twilio";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase (Prefer service role for backend triggers)
const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn("SERVER WARNING: Supabase configuration is incomplete.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Notification Services
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", notifications: !!resend && !!twilioClient });
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const { data: venues } = await supabase
        .from('facilities')
        .select('slug, city, country_code')
        .eq('status', 'LIVE');
      
      const cityPages = Array.from(new Set(venues?.map(v => 
        v.country_code && v.city ? `${v.country_code.toLowerCase()}/${v.city.toLowerCase()}` : null
      ).filter(Boolean) || []));
      
      const venuePages = venues?.map(v => 
        v.country_code && v.city && v.slug ? `${v.country_code.toLowerCase()}/${v.city.toLowerCase()}/${v.slug}` : null
      ).filter(Boolean) || [];
      
      // Use deployment URL if available, fallback to localhost for dev
      const baseUrl = process.env.BASE_URL || "https://ais-dev-a66cyx5eupuuojqhntxjqe-509286172976.asia-east1.run.app";

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>
  <url><loc>${baseUrl}/search</loc><priority>0.8</priority></url>`;

      cityPages.forEach(path => {
        xml += `\n  <url><loc>${baseUrl}/${path}</loc><priority>0.7</priority></url>`;
      });

      venuePages.forEach(path => {
        xml += `\n  <url><loc>${baseUrl}/${path}</loc><priority>0.9</priority></url>`;
      });

      xml += '\n</urlset>';
      
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      res.status(500).send('Error generating sitemap');
    }
  });

  // Automated Notification System Triggers (Supabase Realtime)
  
  // 1. Booking Triggers
  supabase
    .channel('booking_notifications')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
      if (payload.eventType === 'INSERT') {
        const booking = payload.new;
        if (booking.status === 'PENDING' && !booking.notified_request) {
          console.log(`New booking request: ${booking.id}`);
          await sendBookingEmails(booking.id, booking);
          await supabase.from('bookings').update({ notified_request: true }).eq('id', booking.id);
        }
      } else if (payload.eventType === 'UPDATE') {
        const booking = payload.new;
        if ((booking.status === 'CONFIRMED' || booking.status === 'CANCELLED') && !booking.notified_response) {
          console.log(`Booking status update: ${booking.id} -> ${booking.status}`);
          await sendResponseEmail(booking.id, booking);
          await supabase.from('bookings').update({ notified_response: true }).eq('id', booking.id);
        }
      }
    })
    .subscribe();

  // 2. Weather Closure Triggers
  supabase
    .channel('weather_alerts')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'facilities' }, async (payload) => {
      const facility = payload.new;
      if (facility.trigger_weather_alert && (!facility.last_weather_alert_at || facility.trigger_weather_alert > facility.last_weather_alert_at)) {
        console.log(`Weather Alert triggered for: ${facility.name}`);
        await triggerCriticalSMS(facility.id, facility);
        await supabase.from('facilities').update({ 
          last_weather_alert_at: facility.trigger_weather_alert,
          trigger_weather_alert: null 
        }).eq('id', facility.id);
      }
    })
    .subscribe();

  async function sendBookingEmails(id: string, booking: any) {
    if (!resend) return;
    try {
      const { data: player } = await supabase.from('profiles').select('*').eq('id', booking.user_id).single();
      const { data: facility } = await supabase.from('facilities').select('*').eq('id', booking.facility_id).single();
      const { data: owner } = await supabase.from('profiles').select('*').eq('id', facility?.owner_id).single();

      if (player?.email && player?.notifications?.email !== false) {
        await resend.emails.send({
          from: 'CourtReserve <notifications@builtbymiguel.net>',
          to: player.email,
          subject: 'Booking Request Received',
          html: `<h1>Pending Confirmation</h1><p>Your request for <strong>${facility?.name}</strong> is with the owner. We'll notify you once it's confirmed.</p>`
        });
      }

      if (owner?.email && owner?.notifications?.email !== false) {
        await resend.emails.send({
          from: 'CourtReserve <admin@builtbymiguel.net>',
          to: owner.email,
          subject: 'New Booking Request',
          html: `<h1>Action Required</h1><p><strong>${player?.name || 'A player'}</strong> wants to book a session at ${facility?.name}. Check your dashboard to confirm.</p>`
        });
      }
    } catch (e) { console.error("Email error:", e); }
  }

  async function sendResponseEmail(id: string, booking: any) {
    if (!resend) return;
    try {
      const { data: player } = await supabase.from('profiles').select('*').eq('id', booking.user_id).single();
      const { data: facility } = await supabase.from('facilities').select('*').eq('id', booking.facility_id).single();

      if (player?.email && player?.notifications?.email !== false) {
        await resend.emails.send({
          from: 'CourtReserve <confirmations@builtbymiguel.net>',
          to: player.email,
          subject: `Booking ${booking.status}`,
          html: `
            <div style="font-family: sans-serif; padding: 40px; background: #0a0a0a; color: white; border-radius: 20px;">
              <h1 style="color: #b5f55a;">${booking.status === 'CONFIRMED' ? 'Game On!' : 'Booking Update'}</h1>
              <p>Your session at <strong>${facility?.name}</strong> has been ${booking.status.toLowerCase()}.</p>
              ${booking.status === 'CONFIRMED' ? `
                <div style="margin-top: 20px; padding: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;">
                  <p style="margin: 0; font-size: 12px; color: #888;">LOCATION</p>
                  <p style="margin: 5px 0; font-weight: bold;">${facility?.address}</p>
                  <a href="https://www.google.com/maps/search/?api=1&query=${facility?.lat},${facility?.lng}" style="color: #b5f55a; text-decoration: none; font-size: 14px;">Open in Maps →</a>
                </div>
              ` : ''}
            </div>
          `
        });
      }
    } catch (e) { console.error("Email error:", e); }
  }

  async function triggerCriticalSMS(facilityId: string, facility: any) {
    if (!twilioClient) return;
    try {
      const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 'global').single();
      if (settings && settings.global_sms_enabled === false) {
        console.log("SMS Transmission Blocked: Global System Lockdown Active.");
        return;
      }

      const now = new Date().toISOString();
      const fourHoursLater = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
      
      const { data: bookingsDoc } = await supabase
        .from('bookings')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'CONFIRMED')
        .gte('start_time', now)
        .lte('start_time', fourHoursLater);
      
      if (!bookingsDoc) return;
      console.log(`Sending SMS to ${bookingsDoc.length} players...`);

      for (const booking of bookingsDoc) {
        const { data: player } = await supabase.from('profiles').select('*').eq('id', booking.user_id).single();

        if (player?.phone && player.notifications?.sms === true) {
          await twilioClient.messages.create({
            body: `[CRITICAL ALERT] Your session at ${facility.name} has been cancelled due to weather conditions. Please check your dashboard for details.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: player.phone
          });
          console.log(`SMS Sent to ${player.phone}`);
        }
      }
    } catch (e) { console.error("SMS error:", e); }
  }

  // 3. Chat Notifications
  supabase
    .channel('chat_notifications')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats' }, async (payload) => {
      const chat = payload.new;
      if ((chat.unread_count_owner || 0) > 0 || (chat.unread_count_player || 0) > 0) {
        console.log(`Unread message in chat: ${chat.id}`);
        await sendChatAlert(chat.id, chat);
      }
    })
    .subscribe();

  async function sendChatAlert(chatId: string, chat: any) {
    if (!resend) return;
    try {
      const recipientId = (chat.unread_count_owner || 0) > 0 ? chat.facility_owner_id : chat.player_id;
      const { data: recipient } = await supabase.from('profiles').select('*').eq('id', recipientId).single();

      if (recipient?.email && recipient?.notifications?.email !== false) {
        await resend.emails.send({
          from: 'CourtReserve <messages@builtbymiguel.net>',
          to: recipient.email,
          subject: 'New Message Received',
          html: `<h1>New Message</h1><p>You have a new message regarding <strong>${chat.facility_name}</strong>.</p><p>"${chat.last_message}"</p><a href="https://builtbymiguel.net/messages">View in App</a>`
        });
      }
    } catch (e) { console.error("Chat alert error:", e); }
  }

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
