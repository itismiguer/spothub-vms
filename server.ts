import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc, updateDoc, Timestamp, getDocs } from "firebase/firestore";
import { Resend } from "resend";
import twilio from "twilio";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const app_firebase = initializeApp(firebaseConfig);
const db = getFirestore(app_firebase, firebaseConfig.firestoreDatabaseId);

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

  // Automated Notification System Triggers
  
  // 1. Booking Triggers (Email)
  onSnapshot(collection(db, "bookings"), async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const booking = change.doc.data();
        // Check if it's a new request
        if (booking.status === "PENDING" && !booking.notifiedRequest) {
          console.log(`New booking request: ${change.doc.id}`);
          sendBookingEmails(change.doc.id, booking);
          await updateDoc(change.doc.ref, { notifiedRequest: true });
        }
      } else if (change.type === "modified") {
        const booking = change.doc.data();
        if ((booking.status === "CONFIRMED" || booking.status === "CANCELLED") && !booking.notifiedResponse) {
          console.log(`Booking status update: ${change.doc.id} -> ${booking.status}`);
          sendResponseEmail(change.doc.id, booking);
          await updateDoc(change.doc.ref, { notifiedResponse: true });
        }
      }
    });
  });

  // 2. Weather Closure Triggers (SMS)
  onSnapshot(collection(db, "facilities"), async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "modified") {
        const facility = change.doc.data();
        const oldFacility = change.doc.data(); // This is wrong in client SDK onSnapshot, it doesn't give old data easily
        // We'll use a specific trigger field: weatherAlertBroadcastedAt
        if (facility.triggerWeatherAlert && (!facility.lastWeatherAlertAt || facility.triggerWeatherAlert > (facility.lastWeatherAlertAt || 0))) {
          console.log(`Weather Alert triggered for: ${facility.name}`);
          triggerCriticalSMS(change.doc.id, facility);
          await updateDoc(change.doc.ref, { 
            lastWeatherAlertAt: facility.triggerWeatherAlert,
            triggerWeatherAlert: null // Reset trigger
          });
        }
      }
    });
  });

  async function sendBookingEmails(id: string, booking: any) {
    if (!resend) return;
    try {
      // Fetch User & Owner
      const playerSnap = await getDoc(doc(db, "users", booking.userId));
      const player = playerSnap.data();
      
      const facilitySnap = await getDoc(doc(db, "facilities", booking.facilityId));
      const facility = facilitySnap.data();
      
      const ownerSnap = await getDoc(doc(db, "users", facility?.ownerId));
      const owner = ownerSnap.data();

      // Email to Player
      if (player?.email && player?.notifications?.email !== false) {
        await resend.emails.send({
          from: 'CourtReserve <notifications@builtbymiguel.net>',
          to: player.email,
          subject: 'Booking Request Received',
          html: `<h1>Pending Confirmation</h1><p>Your request for <strong>${facility?.name}</strong> is with the owner. We'll notify you once it's confirmed.</p>`
        });
      }

      // Email to Owner
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
      const playerSnap = await getDoc(doc(db, "users", booking.userId));
      const player = playerSnap.data();
      const facilitySnap = await getDoc(doc(db, "facilities", booking.facilityId));
      const facility = facilitySnap.data();

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
      // Global SMS Lockdown Check
      const settingsSnap = await getDoc(doc(db, "system_settings", "global"));
      if (settingsSnap.exists() && settingsSnap.data().global_sms_enabled === false) {
        console.log("SMS Transmission Blocked: Global System Lockdown Active.");
        return;
      }

      // Find all CONFIRMED bookings in the next 4 hours
      const now = Timestamp.now();
      const fourHoursLater = new Timestamp(now.seconds + 4 * 3600, 0);
      
      const q = query(collection(db, "bookings"), 
        where("facilityId", "==", facilityId),
        where("status", "==", "CONFIRMED"),
        where("startTime", ">=", now),
        where("startTime", "<=", fourHoursLater)
      );
      
      const snap = await getDocs(q);
      console.log(`Sending SMS to ${snap.size} players...`);

      for (const bookingDoc of snap.docs) {
        const booking = bookingDoc.data();
        const playerSnap = await getDoc(doc(db, "users", booking.userId));
        const player = playerSnap.data();

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

  // 3. Chat Notifications (Email fallback for offline)
  onSnapshot(collection(db, "chats"), async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "modified") {
        const chat = change.doc.data();
        // If unread count increased, send alert
        if ((chat.unreadCountOwner || 0) > 0 || (chat.unreadCountPlayer || 0) > 0) {
           console.log(`Unread message in chat: ${change.doc.id}`);
           // Logic to send email if user is offline (simulated by immediate send in this turn)
           sendChatAlert(change.doc.id, chat);
        }
      }
    });
  });

  async function sendChatAlert(chatId: string, chat: any) {
    if (!resend) return;
    try {
      const recipientId = chat.unreadCountOwner > 0 ? chat.facilityOwnerId : chat.playerId;
      const recipientSnap = await getDoc(doc(db, "users", recipientId));
      const recipient = recipientSnap.data();

      if (recipient?.email && recipient?.notifications?.email !== false) {
        await resend.emails.send({
          from: 'CourtReserve <messages@builtbymiguel.net>',
          to: recipient.email,
          subject: 'New Message Received',
          html: `<h1>New Message</h1><p>You have a new message regarding <strong>${chat.facilityName}</strong>.</p><p>"${chat.lastMessage}"</p><a href="https://ais-dev-a66cyx5eupuuojqhntxjqe-509286172976.asia-east1.run.app/messages">View in App</a>`
        });
      }
    } catch (e) { console.error("Chat alert error:", e); }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
