# CourtReserve

A high-performance multi-tenant sports court reservation system built with React, Tailwind CSS, and Firebase.

## 🚀 Architecture

CourtReserve uses a multi-tenant architecture where each **Facility** acts as a tenant.

### Data Model
- **Profiles**: User identity with roles (`PLAYER`, `OWNER`, `ADMIN`).
- **Facilities**: Root level entities representing clubs or locations.
- **Courts**: Sub-collection under each Facility.
- **Bookings**: Central collection managing reservations with relational links to Facilities and Courts.

### Multi-Tenancy Logic
Each facility owner manages their own courts and rules. Players can discover facilities via the Discovery Map and book slots based on real-time availability.

## 🛠 Features

- **Google Maps Integration**: Discovery view with custom pins.
- **Real-Time Booking**: 60-minute interval slots with instant conflict resolution.
- **Role-Based Access**:
  - **Players**: Book courts and view history.
  - **Owners**: Manage multiple facilities, block maintenance slots, and view venue stats.
  - **SuperAdmins**: Platform management and role overriding.
- **Live Status**: Real-time availability badges on court cards.

## 🎾 Adding New Sport Types

To add a new sport type to the discovery and filtering system:

1. **Dashboard Update**: Add the new sport string to the `type` options in `src/pages/OwnerDashboard.tsx`.
2. **Icons**: Use appropriate icons from `lucide-react` in the frontend feed components.
3. **Firestore**: The `Facility` schema in `firebase-blueprint.json` handles the `type` field dynamically.

## ⚙️ Configuration

Copy `.env.example` to `.env` and provide your credentials:

```env
VITE_GOOGLE_MAPS_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_FIRESTORE_DATABASE_ID=...
```

## 🔒 Security

Firestore rules are enforced using Attribute-Based Access Control (ABAC). 
- Users can only read their own private data.
- Facility owners can only manage their own facilities and sub-resources.
- Bookings are validated against relational ownership and server-side timestamps.

## 📦 Deployment (Cloud Run)

The project is optimized for deployment via AI Studio to Google Cloud Run. Ensure `NODE_ENV=production` is set for optimized builds.
