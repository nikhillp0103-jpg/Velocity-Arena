const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const Database = require("better-sqlite3");
const QRCode = require("qrcode");

const app = express();
const port = Number(process.env.PORT || 3000);
const dataDirectory = process.env.VELOCITY_DATA_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), "velocity-data") : path.join(__dirname, "data"));
const databasePath = process.env.VELOCITY_DB_PATH || path.join(dataDirectory, "velocity-arena.sqlite");

const venueList = [
  ["BOX ARENA", "Box Cricket", 799],
  ["GameGrid Arena", "Gaming Café", 149],
  ["Strike Zone", "Bowling", 299],
  ["Apex Karting", "Go-Karting", 499],
  ["Smash Point", "Badminton", 199],
  ["Turf Nation", "Football Turf", 899],
  ["Cue Club", "Pool / Snooker", 199],
  ["VR Vault", "VR Gaming", 399],
  ["Hoop House", "Basketball", 249],
  ["Neon Ops", "Laser Tag", 349],
  ["The Cricket Yard", "Box Cricket", 699],
  ["Pixel Palace", "Gaming Café", 179],
  ["Perfect 10 Lanes", "Bowling", 349],
  ["Drift Republic", "Go-Karting", 599],
  ["Ace Courts", "Badminton", 229],
  ["Goal Factory", "Football Turf", 799],
  ["Break Point", "Pool / Snooker", 249],
  ["Immersion Lab", "VR Gaming", 449],
  ["Downtown Hoops", "Basketball", 199],
  ["Laser District", "Laser Tag", 399]
].map(([name, activity, price], id) => ({ id, name, activity, price }));

const cityList = [
  ["Ahmedabad", "Gujarat"], ["Surat", "Gujarat"], ["Vadodara", "Gujarat"], ["Gandhinagar", "Gujarat"],
  ["Amreli", "Gujarat"], ["Rajkot", "Gujarat"], ["Bhavnagar", "Gujarat"], ["Jamnagar", "Gujarat"],
  ["Junagadh", "Gujarat"], ["Anand", "Gujarat"], ["Bharuch", "Gujarat"], ["Valsad", "Gujarat"],
  ["Navsari", "Gujarat"], ["Morbi", "Gujarat"], ["Mehsana", "Gujarat"], ["Nadiad", "Gujarat"],
  ["Porbandar", "Gujarat"], ["Bhuj", "Gujarat"], ["Mumbai", "Maharashtra"], ["Pune", "Maharashtra"],
  ["Nagpur", "Maharashtra"], ["Nashik", "Maharashtra"], ["Thane", "Maharashtra"], ["Navi Mumbai", "Maharashtra"],
  ["Bengaluru", "Karnataka"], ["Mysuru", "Karnataka"], ["Mangaluru", "Karnataka"], ["Hyderabad", "Telangana"],
  ["Chennai", "Tamil Nadu"], ["Coimbatore", "Tamil Nadu"], ["Madurai", "Tamil Nadu"], ["Tiruchirappalli", "Tamil Nadu"],
  ["Kochi", "Kerala"], ["Thiruvananthapuram", "Kerala"], ["Kolkata", "West Bengal"], ["Delhi", "Delhi"],
  ["New Delhi", "Delhi"], ["Gurugram", "Haryana"], ["Faridabad", "Haryana"], ["Noida", "Uttar Pradesh"],
  ["Lucknow", "Uttar Pradesh"], ["Kanpur", "Uttar Pradesh"], ["Agra", "Uttar Pradesh"], ["Varanasi", "Uttar Pradesh"],
  ["Prayagraj", "Uttar Pradesh"], ["Jaipur", "Rajasthan"], ["Udaipur", "Rajasthan"], ["Jodhpur", "Rajasthan"],
  ["Indore", "Madhya Pradesh"], ["Bhopal", "Madhya Pradesh"], ["Jabalpur", "Madhya Pradesh"], ["Gwalior", "Madhya Pradesh"],
  ["Chandigarh", "Chandigarh"], ["Ludhiana", "Punjab"], ["Amritsar", "Punjab"], ["Dehradun", "Uttarakhand"],
  ["Patna", "Bihar"], ["Ranchi", "Jharkhand"], ["Bhubaneswar", "Odisha"], ["Guwahati", "Assam"],
  ["Raipur", "Chhattisgarh"], ["Visakhapatnam", "Andhra Pradesh"], ["Vijayawada", "Andhra Pradesh"], ["Shimla", "Himachal Pradesh"]
].map(([name, state]) => ({ slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name, state }));

const activityImages = {
  "Box Cricket": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1000&q=85",
  "Gaming Café": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=85",
  "Bowling": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=85",
  "Go-Karting": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1000&q=85",
  "Badminton": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=85",
  "Football Turf": "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=1000&q=85",
  "Pool / Snooker": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1000&q=85",
  "VR Gaming": "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=1000&q=85",
  "Basketball": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=85",
  "Laser Tag": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=85"
};

const dateAfterDays = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const tournamentList = [
  { id: "ahmedabad-box-cricket", name: "Ahmedabad Box Cricket Championship", activity: "Box Cricket", venue: "The Box Arena", date: dateAfterDays(7), entryFee: 999, prize: "₹25K", capacity: "24 Teams", registrationOpen: true },
  { id: "strike-night-open", name: "Strike Night Open 2026", activity: "Bowling", venue: "Strike Zone", date: dateAfterDays(14), entryFee: 499, prize: "₹15K", capacity: "64 Players", registrationOpen: true },
  { id: "velocity-kart-league", name: "Velocity Kart League", activity: "Go-Karting", venue: "Apex Karting", date: dateAfterDays(21), entryFee: 1299, prize: "₹30K", capacity: "32 Racers", registrationOpen: false }
];
const allowedSlots = new Set(["5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"]);
const allowedPlayers = new Set([2, 4, 6, 8, 10, 12, 16]);
const sessionCookie = "va_session";
const sessionDurationSeconds = 60 * 60 * 24 * 14;

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
// WAL needs extra -wal/-shm files and is unreliable on Vercel's ephemeral /tmp.
db.pragma(process.env.VERCEL ? "journal_mode = DELETE" : "journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cities (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    email TEXT PRIMARY KEY COLLATE NOCASE,
    subscribed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_key TEXT NOT NULL REFERENCES cities(slug),
    name TEXT NOT NULL,
    activity TEXT NOT NULL,
    rating REAL NOT NULL,
    review_count INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    price INTEGER NOT NULL,
    environment TEXT NOT NULL,
    max_players INTEGER NOT NULL,
    is_open INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    UNIQUE(city_key, name)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    ticket_token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city_key TEXT NOT NULL DEFAULT 'ahmedabad',
    venue_id INTEGER,
    venue TEXT NOT NULL,
    activity TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    players INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tournament_registrations (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    tournament_name TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_fee INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(tournament_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    activity TEXT NOT NULL,
    venue TEXT NOT NULL,
    city_key TEXT NOT NULL DEFAULT 'ahmedabad',
    match_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    player_limit INTEGER NOT NULL,
    price_per_player INTEGER NOT NULL,
    base_players INTEGER NOT NULL DEFAULT 0,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS match_players (
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (match_id, user_id)
  );
`);

const existingColumns = table => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
if (!existingColumns("bookings").has("city_key")) db.exec("ALTER TABLE bookings ADD COLUMN city_key TEXT NOT NULL DEFAULT 'ahmedabad'");
if (!existingColumns("bookings").has("venue_id")) db.exec("ALTER TABLE bookings ADD COLUMN venue_id INTEGER");
if (!existingColumns("matches").has("city_key")) db.exec("ALTER TABLE matches ADD COLUMN city_key TEXT NOT NULL DEFAULT 'ahmedabad'");

const insertCity = db.prepare("INSERT OR IGNORE INTO cities (slug, name, state) VALUES (?, ?, ?)");
const insertVenue = db.prepare(`INSERT OR IGNORE INTO venues
  (city_key, name, activity, rating, review_count, distance_km, price, environment, max_players, is_open, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const venueCountForCity = db.prepare("SELECT COUNT(*) AS count FROM venues WHERE city_key = ?");
const seedCities = db.transaction(() => {
  for (const city of cityList) insertCity.run(city.slug, city.name, city.state);
});
const seedVenuesForCity = db.transaction(city => {
  for (const venue of venueList) {
    const rating = Number((4.5 + ((venue.id * 7 + city.name.length) % 5) / 10).toFixed(1));
    const environment = venue.id % 2 === 0 ? "outdoor" : "indoor";
    const maxPlayers = [8, 4, 8, 2, 4, 12, 4, 4, 10, 10][venue.id % 10];
    const isOpen = venue.id % 7 === 6 ? 0 : 1;
    const name = city.slug === "ahmedabad" ? venue.name : `${venue.name} · ${city.name}`;
    insertVenue.run(
      city.slug, name, venue.activity, rating, 45 + ((venue.id * 31 + city.name.length * 13) % 280),
      Number((0.8 + ((venue.id * 17 + city.name.length) % 85) / 10).toFixed(1)),
      venue.price, environment, maxPlayers, isOpen, activityImages[venue.activity]
    );
  }
});
// Seed city rows only at boot. Venue rows are filled per city on first request so
// Vercel cold starts stay under the serverless time limit (full seed is 64×20 inserts).
seedCities();
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS bookings_venue_slot_unique ON bookings (venue_id, booking_date, time_slot) WHERE venue_id IS NOT NULL");

const statements = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT id, name, email, created_at AS createdAt FROM users WHERE id = ?"),
  createUser: db.prepare("INSERT INTO users (id, name, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"),
  createSession: db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
  deleteUserSessions: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
  createPasswordReset: db.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
  passwordReset: db.prepare("SELECT user_id AS userId FROM password_resets WHERE token_hash = ? AND expires_at > ?"),
  deletePasswordResets: db.prepare("DELETE FROM password_resets WHERE user_id = ?"),
  updatePassword: db.prepare("UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?"),
  sessionUser: db.prepare("SELECT users.id, users.name, users.email, users.created_at AS createdAt FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  createBooking: db.prepare("INSERT INTO bookings (id, ticket_token, user_id, city_key, venue_id, venue, activity, booking_date, time_slot, players, amount, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"),
  userBookings: db.prepare("SELECT bookings.id, bookings.venue, bookings.activity, cities.name AS city, bookings.booking_date AS date, bookings.time_slot AS time, bookings.players, bookings.amount, bookings.status, bookings.created_at AS createdAt FROM bookings LEFT JOIN cities ON cities.slug = bookings.city_key WHERE bookings.user_id = ? ORDER BY bookings.created_at DESC"),
  ownedBooking: db.prepare("SELECT bookings.id, bookings.ticket_token AS ticketToken, bookings.venue, bookings.activity, cities.name AS city, bookings.booking_date AS date, bookings.time_slot AS time, bookings.players, bookings.amount, bookings.status FROM bookings LEFT JOIN cities ON cities.slug = bookings.city_key WHERE bookings.id = ? AND bookings.user_id = ?"),
  ticket: db.prepare("SELECT bookings.id, bookings.venue, bookings.activity, cities.name AS city, bookings.booking_date AS date, bookings.time_slot AS time, bookings.players, bookings.status FROM bookings LEFT JOIN cities ON cities.slug = bookings.city_key WHERE bookings.ticket_token = ?"),
  createRegistration: db.prepare("INSERT INTO tournament_registrations (id, tournament_id, tournament_name, user_id, entry_fee, created_at) VALUES (?, ?, ?, ?, ?, ?)"),
  userRegistrations: db.prepare("SELECT tournament_id AS tournamentId, tournament_name AS tournamentName, entry_fee AS entryFee, created_at AS registeredAt FROM tournament_registrations WHERE user_id = ? ORDER BY created_at DESC"),
  hasRegistration: db.prepare("SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?"),
  cities: db.prepare("SELECT slug, name, state FROM cities ORDER BY name"),
  venuesForCity: db.prepare(`SELECT venues.id, venues.name, venues.activity, venues.rating, venues.review_count AS reviewCount,
      venues.distance_km AS distanceKm, venues.price, venues.environment, venues.max_players AS maxPlayers,
      venues.is_open AS isOpen, venues.image_url AS imageUrl, cities.name AS city
    FROM venues JOIN cities ON cities.slug = venues.city_key WHERE venues.city_key = ? ORDER BY venues.id`),
  venueById: db.prepare(`SELECT venues.id, venues.name, venues.activity, venues.rating, venues.review_count AS reviewCount,
      venues.distance_km AS distanceKm, venues.price, venues.environment, venues.max_players AS maxPlayers,
      venues.is_open AS isOpen, venues.image_url AS imageUrl, cities.slug AS cityKey, cities.name AS city
    FROM venues JOIN cities ON cities.slug = venues.city_key WHERE venues.id = ?`),
  cityBySlug: db.prepare("SELECT slug, name, state FROM cities WHERE slug = ?"),
  slotTaken: db.prepare("SELECT id FROM bookings WHERE venue_id = ? AND booking_date = ? AND time_slot = ? AND status = 'Confirmed'"),
  slotsForDate: db.prepare("SELECT time_slot AS time FROM bookings WHERE venue_id = ? AND booking_date = ? AND status = 'Confirmed'"),
  matches: db.prepare(`SELECT id, title, activity, venue, match_date AS date, time_slot AS time,
      player_limit AS playerLimit, price_per_player AS pricePerPlayer,
      base_players + (SELECT COUNT(*) FROM match_players WHERE match_id = matches.id) AS playerCount,
      EXISTS(SELECT 1 FROM match_players WHERE match_id = matches.id AND user_id = ?) AS joined
    FROM matches WHERE city_key = ? AND match_date >= date('now') ORDER BY match_date, time_slot`),
  matchView: db.prepare(`SELECT id, title, activity, venue, match_date AS date, time_slot AS time,
      player_limit AS playerLimit, price_per_player AS pricePerPlayer,
      base_players + (SELECT COUNT(*) FROM match_players WHERE match_id = matches.id) AS playerCount,
      EXISTS(SELECT 1 FROM match_players WHERE match_id = matches.id AND user_id = ?) AS joined
    FROM matches WHERE id = ?`),
  matchById: db.prepare("SELECT * FROM matches WHERE id = ?"),
  matchPlayers: db.prepare("SELECT COUNT(*) AS count FROM match_players WHERE match_id = ?"),
  isMatchPlayer: db.prepare("SELECT 1 FROM match_players WHERE match_id = ? AND user_id = ?"),
  createMatch: db.prepare("INSERT INTO matches (id, title, activity, venue, city_key, match_date, time_slot, player_limit, price_per_player, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"),
  subscribeEmail: db.prepare("INSERT OR IGNORE INTO newsletter_subscribers (email, subscribed_at) VALUES (?, ?)"),
  addMatchPlayer: db.prepare("INSERT INTO match_players (match_id, user_id, joined_at) VALUES (?, ?, ?)"),
  upcomingMatchesForCity: db.prepare("SELECT COUNT(*) AS count FROM matches WHERE city_key = ? AND match_date >= date('now')"),
  seedMatch: db.prepare("INSERT INTO matches (id, title, activity, venue, city_key, match_date, time_slot, player_limit, price_per_player, base_players, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"),
  venueForActivity: db.prepare("SELECT name FROM venues WHERE city_key = ? AND activity = ? ORDER BY id LIMIT 1")
};

function ensureCityVenues(citySlug) {
  const city = statements.cityBySlug.get(citySlug);
  if (!city) return false;
  if (venueCountForCity.get(citySlug).count >= venueList.length) return true;
  seedVenuesForCity(city);
  return true;
}

function ensureCityMatches(citySlug) {
  if (!ensureCityVenues(citySlug)) return false;
  if (statements.upcomingMatchesForCity.get(citySlug).count) return true;
  const city = statements.cityBySlug.get(citySlug);
  const cricketVenue = statements.venueForActivity.get(citySlug, "Box Cricket");
  const gamingVenue = statements.venueForActivity.get(citySlug, "Gaming Café");
  if (!city || !cricketVenue || !gamingVenue) return false;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const seedMatchesForCity = db.transaction(() => {
    statements.seedMatch.run(crypto.randomUUID(), `Open Cricket · ${city.name}`, "Box Cricket", cricketVenue.name, citySlug, today.toISOString().slice(0, 10), "8:00 PM", 10, 180, 6, new Date().toISOString());
    statements.seedMatch.run(crypto.randomUUID(), `Open Gaming · ${city.name}`, "Gaming Café", gamingVenue.name, citySlug, tomorrow.toISOString().slice(0, 10), "7:00 PM", 4, 220, 2, new Date().toISOString());
  });
  seedMatchesForCity();
  return true;
}

// Default city is ready immediately so the homepage and booking modal work on cold start.
ensureCityVenues("ahmedabad");
ensureCityMatches("ahmedabad");

const safeEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
function isFutureSlot(date, time) {
  const [clock, meridiem] = time.split(" ");
  let [hours, minutes] = clock.split(":").map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const slotDate = new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return !Number.isNaN(slotDate.getTime()) && slotDate.getTime() > Date.now();
}
const hashSessionToken = token => crypto.createHash("sha256").update(token).digest("hex");
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString("hex");
const cleanUser = user => ({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });

function setSessionCookie(res, token) {
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds * 1000
  });
}

function currentUser(req) {
  const token = req.cookies && req.cookies[sessionCookie];
  if (!token) return null;
  return statements.sessionUser.get(hashSessionToken(token), Date.now()) || null;
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Please log in to continue." });
  req.user = user;
  next();
}

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie || "";
  req.cookies = Object.fromEntries(cookieHeader.split(";").map(part => {
    const separator = part.indexOf("=");
    if (separator < 0) return ["", ""];
    const key = part.slice(0, separator).trim();
    try {
      return [key, decodeURIComponent(part.slice(separator + 1).trim())];
    } catch {
      return [key, ""];
    }
  }).filter(([key]) => key));
  next();
});
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) req.body = {};
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/cities", (req, res) => res.json({ cities: statements.cities.all() }));
app.get("/api/venues", (req, res) => {
  const city = typeof req.query.city === "string" ? req.query.city : "ahmedabad";
  if (!ensureCityVenues(city)) return res.status(404).json({ error: "That city is not in the local listings yet." });
  return res.json({ venues: statements.venuesForCity.all(city) });
});
app.get("/api/availability", (req, res) => {
  const venueId = Number(req.query.venueId);
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!Number.isSafeInteger(venueId) || !statements.venueById.get(venueId)) {
    return res.status(404).json({ error: "Venue not found. Refresh the city listings and try again." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    return res.status(400).json({ error: "Choose a valid date." });
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastBookableDate = new Date(today);
  lastBookableDate.setUTCDate(lastBookableDate.getUTCDate() + 90);
  if (date < today.toISOString().slice(0, 10) || date > lastBookableDate.toISOString().slice(0, 10)) {
    return res.status(400).json({ error: "Choose a date within the next 90 days." });
  }
  const reservedSlots = new Set(statements.slotsForDate.all(venueId, date).map(slot => slot.time));
  return res.json({
    slots: [...allowedSlots].map(time => ({
      time,
      available: !reservedSlots.has(time) && isFutureSlot(date, time)
    }))
  });
});

app.post("/api/auth/register", (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: "Enter a name between 2 and 80 characters." });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
  if (statements.userByEmail.get(email)) return res.status(409).json({ error: "An account with this email already exists. Please log in." });

  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  try {
    statements.createUser.run(id, name, email, salt, hashPassword(password, salt), new Date().toISOString());
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "An account with this email already exists. Please log in." });
    throw error;
  }
  const user = statements.userById.get(id);
  const token = crypto.randomBytes(32).toString("base64url");
  statements.createSession.run(hashSessionToken(token), id, Date.now() + sessionDurationSeconds * 1000);
  setSessionCookie(res, token);
  return res.status(201).json({ user });
});

app.post("/api/auth/login", (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (password.length > 128) return res.status(400).json({ error: "Password must be 128 characters or fewer." });
  const account = statements.userByEmail.get(email);
  if (!account || !safeEqual(hashPassword(password, account.password_salt), account.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  const token = crypto.randomBytes(32).toString("base64url");
  statements.createSession.run(hashSessionToken(token), account.id, Date.now() + sessionDurationSeconds * 1000);
  setSessionCookie(res, token);
  return res.json({ user: statements.userById.get(account.id) });
});

app.post("/api/auth/forgot-password", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(503).json({ error: "Password reset email is not configured for this deployment." });
  }
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  const account = statements.userByEmail.get(email);
  if (account) {
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashSessionToken(token);
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const createReset = db.transaction(() => {
      statements.deletePasswordResets.run(account.id);
      statements.createPasswordReset.run(tokenHash, account.id, expiresAt);
    });
    createReset();
    const resetUrl = `http://localhost:${port}/auth.html?reset=${encodeURIComponent(token)}`;
    console.log(`Local password reset link for ${email} (expires in 15 minutes): ${resetUrl}`);
  }
  return res.json({ message: "If an account exists for that email, a password reset link was printed in the terminal running this local app." });
});

app.post("/api/auth/reset-password", (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (token.length < 32 || token.length > 128) return res.status(400).json({ error: "This password reset link is invalid or expired." });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
  const reset = statements.passwordReset.get(hashSessionToken(token), Date.now());
  if (!reset) return res.status(400).json({ error: "This password reset link is invalid or expired. Request a new link." });
  const salt = crypto.randomBytes(16).toString("hex");
  const resetPassword = db.transaction(() => {
    statements.updatePassword.run(salt, hashPassword(password, salt), reset.userId);
    statements.deletePasswordResets.run(reset.userId);
    statements.deleteUserSessions.run(reset.userId);
  });
  resetPassword();
  return res.json({ message: "Password updated. Log in with your new password." });
});

app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies[sessionCookie];
  if (token) statements.deleteSession.run(hashSessionToken(token));
  res.clearCookie(sessionCookie, { httpOnly: true, sameSite: "lax", path: "/" });
  return res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = currentUser(req);
  return res.json({ user: user ? cleanUser(user) : null });
});

app.get("/api/bookings", requireUser, (req, res) => {
  return res.json({ bookings: statements.userBookings.all(req.user.id) });
});

app.get("/api/matches", (req, res) => {
  const user = currentUser(req);
  const city = typeof req.query.city === "string" ? req.query.city : "ahmedabad";
  if (!ensureCityMatches(city)) return res.status(404).json({ error: "That city is not in the local listings yet." });
  return res.json({ matches: statements.matches.all(user ? user.id : "", city) });
});

app.post("/api/matches", requireUser, (req, res) => {
  const { title, activity, venueId, city: cityKey, date, time, playerLimit, pricePerPlayer } = req.body;
  const safeTitle = typeof title === "string" ? title.trim() : "";
  if (typeof cityKey === "string") ensureCityVenues(cityKey);
  const venue = Number.isSafeInteger(venueId) ? statements.venueById.get(venueId) : null;
  const selectedCity = typeof cityKey === "string" ? statements.cityBySlug.get(cityKey) : null;
  if (safeTitle.length < 3 || safeTitle.length > 60) return res.status(400).json({ error: "Match name must be between 3 and 60 characters." });
  if (!selectedCity || !venue || venue.cityKey !== selectedCity.slug || venue.activity !== activity) return res.status(400).json({ error: "Choose a valid venue and activity for the selected city." });
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Choose a valid match date." });
  const matchDate = new Date(`${date}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastMatchDate = new Date(today);
  lastMatchDate.setUTCDate(lastMatchDate.getUTCDate() + 90);
  if (Number.isNaN(matchDate.getTime()) || matchDate.toISOString().slice(0, 10) !== date || matchDate < today || matchDate > lastMatchDate) {
    return res.status(400).json({ error: "Choose a match date within the next 90 days." });
  }
  if (!allowedSlots.has(time)) return res.status(400).json({ error: "Choose an available time slot." });
  if (!isFutureSlot(date, time)) return res.status(409).json({ error: "That time has already passed. Choose a later slot." });
  if (!allowedPlayers.has(playerLimit) || playerLimit < 2) return res.status(400).json({ error: "Choose a valid team size." });
  if (playerLimit > venue.maxPlayers) return res.status(400).json({ error: `This venue supports up to ${venue.maxPlayers} players per match.` });
  if (!Number.isInteger(pricePerPlayer) || pricePerPlayer < 0 || pricePerPlayer > 5000) return res.status(400).json({ error: "Price per player must be from ₹0 to ₹5,000." });

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const createAndJoin = db.transaction(() => {
    statements.createMatch.run(id, safeTitle, activity, venue.name, selectedCity.slug, date, time, playerLimit, pricePerPlayer, req.user.id, createdAt);
    statements.addMatchPlayer.run(id, req.user.id, createdAt);
  });
  createAndJoin();
  return res.status(201).json({ match: statements.matchView.get(req.user.id, id) });
});

app.post("/api/matches/:id/join", requireUser, (req, res) => {
  const joinMatch = db.transaction(() => {
    const match = statements.matchById.get(req.params.id);
    if (!match) return { status: 404, error: "Match not found." };
    if (statements.isMatchPlayer.get(match.id, req.user.id)) return { status: 409, error: "You have already joined this match." };
    const count = match.base_players + statements.matchPlayers.get(match.id).count;
    if (count >= match.player_limit) return { status: 409, error: "This match is full." };
    statements.addMatchPlayer.run(match.id, req.user.id, new Date().toISOString());
    return { status: 200, playerCount: count + 1 };
  }).immediate();
  if (joinMatch.error) return res.status(joinMatch.status).json({ error: joinMatch.error });
  return res.json({ message: "You joined the match.", playerCount: joinMatch.playerCount });
});

app.post("/api/bookings", requireUser, (req, res) => {
  const { venueId, city: cityKey, date, time, players, coupon, phone } = req.body;
  if (typeof cityKey === "string") ensureCityVenues(cityKey);
  const venue = Number.isSafeInteger(venueId) ? statements.venueById.get(venueId) : null;
  const selectedCity = typeof cityKey === "string" ? statements.cityBySlug.get(cityKey) : null;
  if (!selectedCity || !venue || venue.cityKey !== selectedCity.slug) return res.status(400).json({ error: "Choose a valid venue in the selected city." });
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Choose a valid booking date." });
  const bookingDate = new Date(`${date}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastBookableDate = new Date(today);
  lastBookableDate.setUTCDate(lastBookableDate.getUTCDate() + 90);
  if (Number.isNaN(bookingDate.getTime()) || bookingDate.toISOString().slice(0, 10) !== date || bookingDate < today || bookingDate > lastBookableDate) {
    return res.status(400).json({ error: "Choose a date within the next 90 days." });
  }
  if (!allowedSlots.has(time)) return res.status(400).json({ error: "Choose an available time slot." });
  if (!allowedPlayers.has(players)) return res.status(400).json({ error: "Choose a valid player count." });
  if (players > venue.maxPlayers) return res.status(400).json({ error: `This venue supports up to ${venue.maxPlayers} players per booking.` });
  if (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
  if (coupon && coupon !== "PLAY10") return res.status(400).json({ error: "That coupon code is not valid." });
  if (statements.slotTaken.get(venue.id, date, time)) return res.status(409).json({ error: "That slot was just booked. Please choose another time." });

  const amount = Math.max(0, Math.round(venue.price * 1.05) - (coupon === "PLAY10" ? Math.round(venue.price * 0.1) : 0));
  const id = `VA-${new Date().getFullYear()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const ticketToken = crypto.randomBytes(32).toString("base64url");
  try {
    statements.createBooking.run(id, ticketToken, req.user.id, selectedCity.slug, venue.id, venue.name, venue.activity, date, time, players, amount, phone, "Confirmed", new Date().toISOString());
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "That slot was just booked. Please choose another time." });
    throw error;
  }
  return res.status(201).json({ booking: { id, venue: venue.name, activity: venue.activity, city: selectedCity.name, date, time, players, amount, status: "Confirmed" } });
});

app.get("/api/bookings/:id/qr", requireUser, async (req, res, next) => {
  try {
    const booking = statements.ownedBooking.get(req.params.id, req.user.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    const ticketUrl = `${req.protocol}://${req.get("host")}/api/tickets/${booking.ticketToken}`;
    const svg = await QRCode.toString(ticketUrl, { type: "svg", errorCorrectionLevel: "M", margin: 2, width: 240 });
    res.type("image/svg+xml").set("Cache-Control", "private, no-store").send(svg);
  } catch (error) {
    next(error);
  }
});

app.get("/api/tickets/:token", (req, res) => {
  const ticket = statements.ticket.get(req.params.token);
  if (!ticket) return res.status(404).json({ error: "Ticket is invalid or no longer available." });
  return res.json({ ticket });
});

app.get("/api/tournaments", (req, res) => {
  const user = currentUser(req);
  const registrations = user ? statements.userRegistrations.all(user.id) : [];
  return res.json({
    tournaments: tournamentList.map(tournament => ({
      ...tournament,
      registered: registrations.some(registration => registration.tournamentId === tournament.id)
    }))
  });
});

app.post("/api/tournaments/:id/register", requireUser, (req, res) => {
  const tournament = tournamentList.find(item => item.id === req.params.id);
  if (!tournament) return res.status(404).json({ error: "Tournament not found." });
  if (!tournament.registrationOpen) return res.status(409).json({ error: "Registration is not open for this tournament yet." });
  if (statements.hasRegistration.get(tournament.id, req.user.id)) return res.status(409).json({ error: "You are already registered for this tournament." });
  statements.createRegistration.run(crypto.randomUUID(), tournament.id, tournament.name, req.user.id, tournament.entryFee, new Date().toISOString());
  return res.status(201).json({ message: `You're registered for ${tournament.name}.`, tournamentId: tournament.id });
});

app.post("/api/newsletter", (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  const result = statements.subscribeEmail.run(email, new Date().toISOString());
  return res.status(result.changes ? 201 : 200).json({ message: result.changes ? "You are subscribed to local deal updates." : "This email is already subscribed." });
});

app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use(express.static(__dirname, {
  index: "index.html",
  dotfiles: "deny",
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/.test(filePath)) res.setHeader("Cache-Control", "no-cache");
  }
}));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status >= 500) console.error("Request failed:", error);
  const message = status === 400 ? "Request body is not valid JSON." : "Something went wrong. Please try again.";
  return res.status(status).json({ error: message });
});

function start(portToUse = port) {
  return app.listen(portToUse, () => {
    console.log(`Velocity Arena is running at http://localhost:${portToUse}`);
  });
}

if (require.main === module) start();

module.exports = app;
app.app = app;
app.db = db;
app.start = start;
app.venueList = venueList;
app.tournamentList = tournamentList;
