# Final Demo Script

A step-by-step sequence for the Milestone 03 demonstration, showing the three-role flow
on the Expo **web** app at a mobile viewport (for example Chrome DevTools at 412×915).

## Before the demo

```bash
# Terminal 1 — backend (MongoDB must be running)
cd backend
yarn install
yarn seed          # resets demo data (safe to run again)
yarn start:dev     # http://localhost:3000

# Terminal 2 — frontend
cd frontend
yarn install
yarn web           # opens the Expo web app
```

- Use **three separate browser sessions** so the Customer, Provider and Admin stay signed in
  at the same time: for example a normal Chrome window, a Chrome window of a second
  profile, and Firefox (or one private window). The web app stores the token in
  `localStorage`, which is shared by windows of the same browser profile.
- Set each window to a mobile size (412×915 or 360×780) in DevTools device mode.
- All seed accounts use password `SeedPass123`.
- Prepare a new email for the provider sign-up, e.g. `demo.provider1@example.com`.

## Sequence

| # | Role | Action | What to point out |
|---|---|---|---|
| 1 | Customer | Customer Login as `kumari.perera@seed.fixclean.lk` | Role-specific login |
| 2 | Customer | Home → categories → Provider List → a provider's details | Only verified providers; live ratings and reviews (FR1) |
| 3 | Provider | Provider Sign Up with a new email (e.g. Cleaning, Jaffna) | Account starts as **pending** (FR2) |
| 4 | Provider | Manage Availability → Services & Rates: add a service and a visiting fee, then save | Proposing services does not verify the provider |
| 5 | Customer | Search for the new provider's name | Not found: pending providers are hidden |
| 6 | Admin | Admin Login as `admin@seed.fixclean.lk` | Customer or provider credentials are refused here |
| 7 | Admin | Dashboard → Verification Requests | New provider in the pending queue |
| 8 | Admin | Open Verification Details: review contact, services, prices; tick identity, contact and experience | Approval is blocked until the checks are complete (FR7) |
| 9 | Admin | Approve → Approval Confirmation | Status becomes **verified** |
| 10 | Provider | Refresh the Dashboard | Verified badge, banner gone |
| 11 | Customer | Search again → open the provider | Real services and prices are now visible |
| 12 | Customer | Book Service: choose service, date, window, address → Confirm | Booking reference; availability enforced (FR5) |
| 13 | Provider | Requests → open the job | City only: **"Exact address shared after you accept"** (FR6) |
| 14 | Provider | **Accept Job** | Confirmed; address and phone now shown |
| 15 | Customer | Keep Track Booking open | **"Booking confirmed"** banner within ~15 s (FR3) |
| 16 | Provider | Service Details → **Start trip / Mark 'On the way'** | |
| 17 | Customer | Track Booking | "Provider on the way"; no fake GPS or ETA |
| 18 | Provider | **Mark as completed** → confirm | |
| 19 | Customer | Track Booking | "Service completed" |
| 20 | Admin | Booking Monitoring → open the booking | Read-only timeline showing who made each change; city only |
| 21 | Admin | User Management → open a user → Suspend, then Reactivate | Suspended providers disappear from customer search |
| 22 | Admin | Complaints → open a seeded complaint → Start Review → Resolve with a note | open → in review → resolved (FR8) |

Optional: show a **decline** by making a second booking and declining it with a reason. The
customer then sees "Booking declined" and the reason.

## Notes

- Tested on responsive mobile web only. **Android device/emulator UI testing was not
  completed** because the emulator was unstable.
- Run `yarn seed` again after the demo to restore the seed accounts. Accounts you created
  (such as the demo provider) are kept; see `backend/README.md` for how to clean them up.
