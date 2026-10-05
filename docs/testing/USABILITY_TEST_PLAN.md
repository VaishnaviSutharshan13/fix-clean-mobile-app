# Usability Test Plan — FIX & CLEAN CO.

IT3060 Human Computer Interaction · Milestone 03

> **Status: plan only.** No usability sessions have been run yet. The result tables below
> are intentionally empty. Fill them in only with data from real sessions. Do not add
> invented participants, ratings, quotes or observations.

## 1. Objective

Evaluate whether first-time users can complete the core tasks of each role (Customer,
Service Provider, Administrator) on a mobile-sized screen, and identify usability problems
to prioritise before release.

Questions to answer:

- Can customers find a verified provider and book a service without help?
- Do customers understand the booking status and notifications?
- Can providers review a request and accept it confidently, knowing when the address is shared?
- Can administrators review and approve a provider application, and find a booking or complaint?

## 2. Participants

- **Target: at least 5 participants** (real or proxy users). Aim for a mix of:
  - 2–3 people who would book home services (customer role),
  - 1–2 people with trade or field-service experience, or proxies (provider role),
  - 1 person comfortable with admin or back-office tools (admin role).
- Each participant can do one or more roles' tasks.
- Exclude project team members.
- Record only an anonymous code (P1, P2, …), age range and smartphone experience. Do not
  record names.

## 3. Consent and privacy

Read this to each participant before starting and record their verbal or written consent:

> "We are testing the app, not you. You can stop at any time without giving a reason. We
> will take notes on what you do and say, but we will not record your name. Any data you
> type is demo data and will be deleted. Notes are used only for this university assignment."

- Use **demo accounts only** (see `backend/README.md`). Participants must not enter real
  personal addresses or phone numbers.
- Don't record screens or audio unless the participant explicitly agrees.

## 4. Setup

- Run the backend with freshly seeded data (`yarn seed`) and the Expo web app.
- Use a phone-sized viewport (412×915 or 360×780) or a real phone on the same network.
- Before each session, prepare: a pending provider with services (Task 3), and a booking
  the provider can accept (Task 2).
- One facilitator and, if possible, one note-taker. Use think-aloud. Don't give hints unless
  the participant has been stuck for more than 2 minutes; record any hint given.

## 5. Tasks

| Task | Role | Scenario given to the participant | Success criteria |
|---|---|---|---|
| T1 | Customer | "Your kitchen tap is leaking. Find a verified plumber and book a visit for tomorrow morning." | Booking created; participant can point to the booking reference |
| T2 | Provider | "You have a new job request. Check it and accept it if it suits you." | Booking accepted; participant can say when the customer's address becomes visible |
| T3 | Admin | "A new provider has applied. Review the application and approve it if everything is in order." | Checks confirmed and provider approved via the confirmation screen |
| T4 | Customer | "Check the status of your booking. What is happening now?" (facilitator advances the status during the task) | Participant correctly states the current status after the banner appears |
| T5 | Admin | "A customer called about booking FC-SEED… . Find it, then find any complaint about it." | Correct booking and complaint opened |

## 6. Observation checklist (per task)

- [ ] Completed without help
- [ ] Completed with a hint (note the hint)
- [ ] Not completed / gave up
- [ ] Time on task (mm:ss, stopwatch)
- [ ] Number of wrong taps / back-navigations
- [ ] Hesitations longer than 5 seconds (where)
- [ ] Misread labels, icons or status chips
- [ ] Comments made while thinking aloud (verbatim, short)

## 7. Post-test questions

1. What was the easiest part of the app? What was the hardest?
2. Was it clear when the provider would see your address? (customer and provider)
3. Did you notice when the booking status changed? How?
4. Was anything confusing about the prices or visiting fee?
5. (Admin) Did you feel confident approving the provider? What else would you want to check?
6. Any other comments?

## 8. Rating scale

After each task, ask: **"How easy was this task?"** on a 1–5 scale
(1 = very difficult, 5 = very easy).

At the end, optionally use the 10-item **System Usability Scale (SUS)** with standard scoring.

## 9. Issue severity scale

| Severity | Meaning |
|---|---|
| 4 – Critical | Prevents task completion; must fix before release |
| 3 – Major | Causes significant delay or errors; fix soon |
| 2 – Minor | Causes hesitation or annoyance; fix when possible |
| 1 – Cosmetic | Noticed but no effect on performance |

## 10. Result recording templates

Fill in only with real session data.

### 10.1 Participants

| Code | Age range | Smartphone experience | Roles tested | Date | Consent recorded (Y/N) |
|---|---|---|---|---|---|
| | | | | | |

### 10.2 Task results

| Participant | Task | Completed (Y / Hint / N) | Time (mm:ss) | Errors | Ease rating (1–5) | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |

### 10.3 Usability issues found

| Issue ID | Task | Screen | Description | Participants affected | Severity (1–4) | Suggested fix |
|---|---|---|---|---|---|---|
| | | | | | | |

### 10.4 SUS scores (optional)

| Participant | SUS score (0–100) |
|---|---|
| | |
| **Mean** | |

### 10.5 Summary (write after all sessions)

- Overall task success rate:
- Main problems (by severity):
- Changes made as a result:
