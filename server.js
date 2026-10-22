'use strict';

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const { esc, page, THEMES } = require('./views/layout');
const { loginForm, signupForm } = require('./views/auth');
const { homePage } = require('./views/home');
const { profilePage, settingsPage } = require('./views/profile');
const { socialPage } = require('./views/social');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'backspace-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function currentUser(req) {
  if (!req.session.userId) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
}

// ---------- Auth ----------

app.get('/login', (req, res) => {
  res.send(page('Log in', loginForm(), req));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.send(page('Log in', loginForm('Invalid username or password.'), req));
  }
  req.session.userId = user.id;
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  res.send(page('Sign up', signupForm(), req));
});

app.post('/signup', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const displayName = String(req.body.display_name || '').trim();
  const password = String(req.body.password || '');
  if (!username || !displayName || password.length < 4) {
    return res.send(page('Sign up', signupForm('All fields required. Password must be at least 4 characters.'), req));
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.send(page('Sign up', signupForm('That username is taken.'), req));
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)').run(username, displayName, hash);
  req.session.userId = info.lastInsertRowid;
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- Feed ----------

app.get('/', requireAuth, (req, res) => {
  const user = currentUser(req);
  const posts = db.prepare(`
    SELECT posts.*, users.username, users.display_name, users.theme_color
    FROM posts JOIN users ON users.id = posts.user_id
    ORDER BY posts.created_at DESC LIMIT 50
  `).all();
  res.send(page('The Feed', homePage(user, posts), req));
});

app.post('/posts', requireAuth, (req, res) => {
  const body = String(req.body.body || '').trim();
  if (body) {
    db.prepare('INSERT INTO posts (user_id, body) VALUES (?, ?)').run(req.session.userId, body);
  }
  res.redirect('/');
});

app.post('/posts/:id/like', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.session.userId, postId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.session.userId, postId);
  }
  res.redirect('/');
});

app.post('/posts/:id/comments', requireAuth, (req, res) => {
  const body = String(req.body.body || '').trim();
  if (body) {
    db.prepare('INSERT INTO comments (user_id, post_id, body) VALUES (?, ?, ?)').run(req.session.userId, Number(req.params.id), body);
  }
  res.redirect('/');
});

// ---------- Bulletins ----------

app.post('/bulletins', requireAuth, (req, res) => {
  const body = String(req.body.body || '').trim();
  if (body) {
    db.prepare('INSERT INTO bulletins (user_id, body) VALUES (?, ?)').run(req.session.userId, body);
  }
  res.redirect('/');
});

// ---------- Friends / Top 8 ----------

app.post('/friends/add', requireAuth, (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const friend = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (friend && friend.id !== req.session.userId) {
    const exists = db.prepare('SELECT id FROM friends WHERE user_id = ? AND friend_id = ?').get(req.session.userId, friend.id);
    if (!exists) {
      const count = db.prepare('SELECT COUNT(*) AS c FROM friends WHERE user_id = ?').get(req.session.userId).c;
      if (count < 8) {
        db.prepare('INSERT INTO friends (user_id, friend_id, position) VALUES (?, ?, ?)').run(req.session.userId, friend.id, count + 1);
      }
    }
  }
  res.redirect(req.headers.referer || '/');
});

app.post('/friends/:id/remove', requireAuth, (req, res) => {
  db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(req.session.userId, Number(req.params.id));
  res.redirect(req.headers.referer || '/');
});

app.post('/friends/reorder', requireAuth, (req, res) => {
  const order = Array.isArray(req.body.order) ? req.body.order : [req.body.order];
  const stmt = db.prepare('UPDATE friends SET position = ? WHERE user_id = ? AND friend_id = ?');
  order.forEach((friendId, index) => {
    stmt.run(index + 1, req.session.userId, Number(friendId));
  });
  res.redirect(req.headers.referer || '/');
});

// ---------- Profiles ----------

app.get('/u/:username', requireAuth, (req, res) => {
  const user = currentUser(req);
  const profile = db.prepare('SELECT * FROM users WHERE username = ?').get(String(req.params.username).toLowerCase());
  if (!profile) return res.status(404).send(page('Not found', '<p>User not found.</p>', req));
  res.send(page(profile.display_name, profilePage(user, profile), req));
});

app.get('/settings', requireAuth, (req, res) => {
  const user = currentUser(req);
  res.send(page('Settings', settingsPage(user), req));
});

app.post('/settings', requireAuth, (req, res) => {
  const bio = String(req.body.bio || '').trim();
  const mood = String(req.body.mood || '').trim();
  const theme = String(req.body.theme_color || 'blue').trim();
  const displayName = String(req.body.display_name || '').trim();
  const songTitle = String(req.body.song_title || '').trim();
  const songUrl = String(req.body.song_url || '').trim();
  db.prepare('UPDATE users SET bio = ?, mood = ?, theme_color = ?, display_name = ?, song_title = ?, song_url = ? WHERE id = ?')
    .run(bio, mood, theme, displayName, songTitle, songUrl, req.session.userId);
  res.redirect('/u/' + currentUser(req).username);
});

// ---------- Social ----------

app.get('/social', requireAuth, (req, res) => {
  const user = currentUser(req);
  res.send(page('Bulletins', socialPage(user), req));
});

app.get('/messages', requireAuth, (req, res) => {
  const user = currentUser(req);
  const friends = db.prepare(`
    SELECT users.* FROM friends JOIN users ON users.id = friends.friend_id
    WHERE friends.user_id = ? ORDER BY friends.position
  `).all(req.session.userId);
  res.send(page('Messages', `
    <h2>Messages</h2>
    <p class="muted">Pick a friend to message:</p>
    ${friends.map(f => `<p><a href="/messages/${f.id}">${esc(f.display_name)}</a></p>`).join('') || '<p>No friends yet.</p>'}
  `, req));
});

app.get('/messages/:id', requireAuth, (req, res) => {
  const user = currentUser(req);
  const other = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!other) return res.status(404).send(page('Not found', '<p>User not found.</p>', req));
  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(req.session.userId, other.id, other.id, req.session.userId);
  const thread = messages.map(m => `
    <div class="msg ${m.sender_id === req.session.userId ? 'mine' : 'theirs'}">
      <p>${esc(m.body)}</p>
      <small>${esc(m.created_at)}</small>
    </div>
  `).join('');
  res.send(page('Messages', `
    <h2>Message ${esc(other.display_name)}</h2>
    <div class="thread">${thread}</div>
    <form method="POST" action="/messages/${other.id}">
      <input name="body" placeholder="Say something..." required>
      <button type="submit">Send</button>
    </form>
  `, req));
});

app.post('/messages/:id', requireAuth, (req, res) => {
  const body = String(req.body.body || '').trim();
  if (body) {
    db.prepare('INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)').run(req.session.userId, Number(req.params.id), body);
  }
  res.redirect('/messages/' + req.params.id);
});

app.listen(PORT, () => {
  console.log(`🚀 backspace is live at http://localhost:${PORT}`);
});
