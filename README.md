# Velocity Arena

## Run locally

1. Install Node.js 20 or newer.
2. Double-click `start.bat` in this folder (or run `npm install` and `npm start` in the project directory).
3. Open [http://localhost:3000](http://localhost:3000).

Do not open the HTML file directly or use VS Code Live Server for app workflows. A static-file preview cannot run the API, SQLite database, login, password reset, bookings, or city switching; use `start.bat` and the `localhost:3000` address instead. The site shows a persistent server-required notice when it detects a static preview.

The local server stores accounts, sessions, password resets, bookings, tournament registrations, player matches, newsletter subscriptions, city records, and seeded sample venues in `data/velocity-arena.sqlite`. It seeds sample listings for 64 Indian cities, including Ahmedabad, Surat, Vadodara, Gandhinagar, and Amreli. These are demo records, not verified venue partnerships or live inventory. Set `VELOCITY_DATA_DIR` or `VELOCITY_DB_PATH` to store the SQLite database somewhere else. Do not expose this demo server directly to the public internet.

Sign-up passwords are hashed with Node.js `scrypt`; the session cookie is HTTP-only. For this local demo, a forgot-password reset link is printed in the terminal running `start.bat`; links expire after 15 minutes and work once. Production email-based password reset is not configured. Booking confirmations and tournament registrations are local demo records: no real payment is collected, and venue availability is not connected to a live provider. Public matches can be created and joined by signed-in users.

Run the backend integration tests with `npm test`.
