# ⌫ Backspace

A working social prototype — old school meets new school. Customizable
profiles, Top 8 friends, profile songs, bulletins, a feed with a light
algorithm (friends you engage with float up — recency still rules), and DMs. No build step, no frameworks on the frontend,
one SQLite file for storage.

## What you need

- A laptop (Windows, Mac, or Linux — anything works)
- **Node.js LTS** (the JavaScript runtime). That's it. No database to install.

## Setup — exact steps on a fresh laptop

1. **Install Node.js LTS** from [https://nodejs.org](https://nodejs.org)
   (grab the "LTS" download for your system and run the installer).
   To check it worked, open a terminal and run:
   ```
   node --version
   ```
   You should see something like `v22.x.x` or newer.

2. **Open a terminal and go into the project folder:**
   ```
   cd backspace
   ```

3. **Install the dependencies** (one time only):
   ```
   npm install
   ```

4. **Seed the demo data** (one time only — creates the database with a
   demo user, friends, posts, and messages):
   ```
   npm run seed
   ```

5. **Start the app:**
   ```
   npm start
   ```

6. **Open your browser** and go to:
   ```
   http://localhost:3000
   ```

Log in with the demo account:

- **Username:** `marcos`
- **Password:** `backspace123`

### Make your own account

Click **Sign up** (top right) and create a username + password. Your new
account starts with an empty Top 8 — go find `tom` (search him via
`http://localhost:3000/u/tom`) and add him. As it should be, he's #1 material.

## Features

- **Signup / login / logout** — passwords are hashed (bcrypt), sessions use
  httpOnly cookies
- **Customizable profile** — display name, bio, theme color (5 swatches),
  profile song title
- **Top 8 friends** — add/remove friends, reorder with ▲▼ (max 8, obviously)
- **Feed** — text posts from you + your friends, with a light algorithm:
  friends you like/comment on float up; recent posts still dominate
- **Likes & comments** on posts
- **Bulletins** — pin short bulletins to the public board
- **DMs** — per-friend conversation threads
- **XSS protection** — all user content is HTML-escaped before rendering

## Project layout

```
backspace/
├── server.js        # Express app: all routes
├── db.js            # SQLite setup + schema
├── seed.js          # Demo data (npm run seed)
├── backspace.db     # Created on first run (git-ignored)
├── views/           # Server-side HTML templates
│   ├── layout.js    # Page shell + HTML escaping
│   ├── auth.js      # Login / signup
│   ├── home.js      # Feed
│   ├── profile.js   # Profile + Top 8 + settings
│   └── social.js    # Bulletins + messages
└── public/
    ├── style.css
    └── app.js
```

## Notes

- The database file `backspace.db` is created next to `server.js`. Delete it
  and re-run `npm run seed` any time you want a fresh start.
- Timestamps are shown in UTC.
- Sessions are kept in server memory — fine for a prototype on one machine.
  For anything public you'd want a real session store, HTTPS, and a proper
  `SESSION_SECRET` env var (the dev default is in `server.js`).
- To let another device on your Wi-Fi try it: run `npm start`, find your
  laptop's local IP, and visit `http://<your-ip>:3000` from the other device.
