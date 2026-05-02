# Security Specification - CourtReserve

## 1. Data Invariants
- A User profile must have a valid role (PLAYER, OWNER, ADMIN).
- A Facility must be owned by a user with role OWNER or ADMIN.
- A Court must belong to an existing Facility.
- A Booking must have a startTime before endTime.
- A Booking must be for exactly 60 minutes (as per requirement: "book 60-minute slots").
- A Booking cannot overlap with an existing booking for the same court.
- A GUEST (unauthenticated) can only READ facilities and court availability.

## 2. The "Dirty Dozen" Payloads (Attacker Strategy)

1. **Role Escalation**: Authenticated user tries to set their role to 'ADMIN' in `/users/{userId}`.
2. **Identity Spoofing**: Player tries to book a court for someone else by setting `userId` to another UID.
3. **Ghost Facility**: User tries to create a Facility without being an OWNER/ADMIN.
4. **Price Manipulation**: Player tries to update a Court's `hourlyRate`.
5. **Overlapping Booking**: Player tries to book a slot that is already taken.
6. **Infinite Duration**: Player tries to book a slot for 10 hours instead of 60 mins.
7. **Maintenance Hijack**: Player tries to create a booking with status 'MAINTENANCE' to block a court for free.
8. **PII Scraping**: Anonymous user tries to list all entries in `/users`.
9. **Relational Break**: Player tries to book a court that doesn't exist (`courtId` is fake).
10. **State Corruption**: Player/Owner tries to set `createdAt` in the past.
11. **Orphaned Booking**: User tries to delete their profile but leave bookings active.
12. **Admin Spoof**: User tries to access `/admins/{uid}` to gain privileges.

## 3. Test Runner Plan

We will implement `firestore.rules` that block all the above.

```javascript
// Global Helpers
function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
function incoming() { return request.resource.data; }
function existing() { return resource.data; }
function isSignedIn() { return request.auth != null; }
function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
function isAdmin() { return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)); }

// Requirement: "authenticated players can book 60-minute slots"
function isOneHour(start, end) {
  return duration.value(timestamp.value(end) - timestamp.value(start), 'm') == 60;
}
```
