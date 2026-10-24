const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

let dataDirectory;
let server;
let db;
let baseUrl;

before(async () => {
  dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-arena-test-"));
  process.env.VELOCITY_DATA_DIR = dataDirectory;
  const backend = require("./server");
  db = backend.db;
  server = await new Promise(resolve => {
    const instance = backend.app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  db.close();
  fs.rmSync(dataDirectory, { recursive: true, force: true });
});

async function request(endpoint, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, result, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

test("accounts, bookings, QR tickets and tournament registrations persist in SQLite", async () => {
  const health = await request("/api/health");
  assert.equal(health.result.status, "ok");

  const cityResponse = await request("/api/cities");
  assert.equal(cityResponse.result.cities.length, 64);
  assert.ok(cityResponse.result.cities.some(city => city.slug === "amreli"));
  const suratVenues = await request("/api/venues?city=surat");
  assert.equal(suratVenues.result.venues.length, 20);
  assert.ok(suratVenues.result.venues.every(venue => venue.city === "Surat"));
  assert.equal((await request("/api/venues?city=unknown-city")).response.status, 404);
  const suratMatches = await request("/api/matches?city=surat");
  assert.equal(suratMatches.result.matches.length, 2);
  assert.ok(suratMatches.result.matches.every(match => match.venue.includes("Surat")));
  const missingApi = await request("/api/this-route-does-not-exist");
  assert.equal(missingApi.response.status, 404);
  assert.match(missingApi.response.headers.get("content-type"), /application\/json/);
  assert.equal(missingApi.result.error, "API endpoint not found.");
  const malformedJson = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(malformedJson.status, 400);
  assert.equal((await malformedJson.json()).error, "Request body is not valid JSON.");
  const newsletter = await request("/api/newsletter", { method: "POST", body: { email: "news@example.com" } });
  assert.equal(newsletter.response.status, 201);
  const duplicateNewsletter = await request("/api/newsletter", { method: "POST", body: { email: "NEWS@example.com" } });
  assert.equal(duplicateNewsletter.response.status, 200);

  const ahmedabadVenues = (await request("/api/venues?city=ahmedabad")).result.venues;
  const venue = ahmedabadVenues.find(item => item.name === "BOX ARENA");
  assert.ok(venue);
  const anonymous = await request("/api/auth/me");
  assert.equal(anonymous.result.user, null);
  const blockedBooking = await request("/api/bookings", {
    method: "POST",
    body: { venueId: venue.id, city: "ahmedabad", date: "2026-10-20", time: "7:00 PM", players: 8, phone: "9876543210" }
  });
  assert.equal(blockedBooking.response.status, 401);
  assert.equal((await request("/api/matches", {
    method: "POST",
    body: { title: "Test Match", activity: "Box Cricket", venueId: venue.id, city: "ahmedabad", date: "2026-10-20", time: "8:00 PM", playerLimit: 2, pricePerPlayer: 100 }
  })).response.status, 401);

  const registration = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Test Player", email: "player@example.com", password: "test-pass-123" }
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.result.user.name, "Test Player");
  const cookie = registration.cookie;
  assert.ok(cookie);
  assert.equal(db.prepare("SELECT password_hash FROM users").get().password_hash.includes("test-pass-123"), false);

  const duplicate = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Test Player", email: "PLAYER@example.com", password: "test-pass-123" }
  });
  assert.equal(duplicate.response.status, 409);

  const badLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: "player@example.com", password: "wrong-password" }
  });
  assert.equal(badLogin.response.status, 401);

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const bookingDate = tomorrow.toISOString().slice(0, 10);
  const invalidBooking = await request("/api/bookings", {
    method: "POST",
    cookie,
    body: { venueId: venue.id, city: "ahmedabad", date: "not-a-date", time: "7:00 PM", players: 8, phone: "9876543210" }
  });
  assert.equal(invalidBooking.response.status, 400);

  const bookingResponse = await request("/api/bookings", {
    method: "POST",
    cookie,
    body: { venueId: venue.id, city: "ahmedabad", date: bookingDate, time: "7:00 PM", players: 8, coupon: "PLAY10", phone: "9876543210" }
  });
  assert.equal(bookingResponse.response.status, 201);
  const booking = bookingResponse.result.booking;
  assert.equal(booking.amount, 759);
  const duplicateBooking = await request("/api/bookings", {
    method: "POST",
    cookie,
    body: { venueId: venue.id, city: "ahmedabad", date: bookingDate, time: "7:00 PM", players: 8, phone: "9876543210" }
  });
  assert.equal(duplicateBooking.response.status, 409);
  const availability = await request(`/api/availability?venueId=${venue.id}&date=${bookingDate}`);
  assert.equal(availability.result.slots.find(slot => slot.time === "7:00 PM").available, false);
  const invalidPlayerCount = await request("/api/bookings", {
    method: "POST",
    cookie,
    body: { venueId: venue.id, city: "ahmedabad", date: bookingDate, time: "8:00 PM", players: 10, phone: "9876543210" }
  });
  assert.equal(invalidPlayerCount.response.status, 400);

  const qr = await request(`/api/bookings/${encodeURIComponent(booking.id)}/qr`, { cookie });
  assert.match(qr.response.headers.get("content-type"), /image\/svg\+xml/);
  assert.match(qr.result, /<svg/);

  const ticketToken = db.prepare("SELECT ticket_token FROM bookings WHERE id = ?").get(booking.id).ticket_token;
  const verifiedTicket = await request(`/api/tickets/${ticketToken}`);
  assert.equal(verifiedTicket.response.status, 200);
  assert.equal(verifiedTicket.result.ticket.id, booking.id);
  assert.equal(verifiedTicket.result.ticket.venue, "BOX ARENA");
  assert.equal((await request("/api/tickets/invalid-ticket-token")).response.status, 404);

  const tournament = await request("/api/tournaments");
  assert.equal(tournament.response.status, 200);
  const registrationResponse = await request("/api/tournaments/ahmedabad-box-cricket/register", {
    method: "POST",
    cookie,
    body: {}
  });
  assert.equal(registrationResponse.response.status, 201);
  assert.equal((await request("/api/tournaments/ahmedabad-box-cricket/register", { method: "POST", cookie, body: {} })).response.status, 409);
  assert.equal((await request("/api/tournaments/velocity-kart-league/register", { method: "POST", cookie, body: {} })).response.status, 409);

  const openMatches = await request("/api/matches", { cookie });
  assert.equal(openMatches.result.matches.length, 2);
  const createdMatch = await request("/api/matches", {
    method: "POST",
    cookie,
    body: { title: "Test Match", activity: "Box Cricket", venueId: venue.id, city: "ahmedabad", date: bookingDate, time: "8:00 PM", playerLimit: 2, pricePerPlayer: 200 }
  });
  assert.equal(createdMatch.response.status, 201);
  assert.equal(createdMatch.result.match.playerCount, 1);
  assert.equal(createdMatch.result.match.joined, 1);
  assert.equal((await request(`/api/matches/${createdMatch.result.match.id}/join`, { method: "POST", cookie, body: {} })).response.status, 409);

  const secondUser = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Second Player", email: "second@example.com", password: "test-pass-123" }
  });
  const secondCookie = secondUser.cookie;
  const joinMatch = await request(`/api/matches/${createdMatch.result.match.id}/join`, { method: "POST", cookie: secondCookie, body: {} });
  assert.equal(joinMatch.response.status, 200);
  assert.equal(joinMatch.result.playerCount, 2);
  const thirdUser = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Third Player", email: "third@example.com", password: "test-pass-123" }
  });
  assert.equal((await request(`/api/matches/${createdMatch.result.match.id}/join`, { method: "POST", cookie: thirdUser.cookie, body: {} })).response.status, 409);

  const logout = await request("/api/auth/logout", { method: "POST", cookie, body: {} });
  assert.equal(logout.response.status, 200);
  assert.equal((await request("/api/bookings", { cookie })).response.status, 401);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email: "player@example.com", password: "test-pass-123" }
  });
  assert.equal(login.response.status, 200);
  const savedBookings = await request("/api/bookings", { cookie: login.cookie });
  assert.equal(savedBookings.result.bookings.length, 1);
  assert.equal(savedBookings.result.bookings[0].id, booking.id);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tournament_registrations").get().total, 1);

  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  const previousLog = console.log;
  const capturedLogs = [];
  console.log = (...values) => capturedLogs.push(values.join(" "));
  let resetResponse;
  try {
    resetResponse = await request("/api/auth/forgot-password", {
      method: "POST",
      body: { email: "PLAYER@example.com" }
    });
  } finally {
    console.log = previousLog;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
  assert.equal(resetResponse.response.status, 200);
  const resetUrl = capturedLogs.join("\n").match(/http:\/\/localhost:\d+\/auth\.html\?reset=[^\s]+/)?.[0];
  assert.ok(resetUrl, "The local reset URL should be printed in the app server terminal.");
  const resetToken = new URL(resetUrl).searchParams.get("reset");
  const resetResult = await request("/api/auth/reset-password", {
    method: "POST",
    body: { token: resetToken, password: "new-test-pass-456" }
  });
  assert.equal(resetResult.response.status, 200);
  assert.equal((await request("/api/bookings", { cookie: login.cookie })).response.status, 401);
  assert.equal((await request("/api/auth/login", {
    method: "POST",
    body: { email: "player@example.com", password: "test-pass-123" }
  })).response.status, 401);
  assert.equal((await request("/api/auth/login", {
    method: "POST",
    body: { email: "player@example.com", password: "new-test-pass-456" }
  })).response.status, 200);
  assert.equal((await request("/api/auth/reset-password", {
    method: "POST",
    body: { token: resetToken, password: "another-new-pass-456" }
  })).response.status, 400);
});
