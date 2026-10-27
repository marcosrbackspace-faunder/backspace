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
const { bulletinsPage, inboxPage, threadPage } = require('./views/social');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'backspace-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// ---------- prepared statements ----------
const Q = {
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByUsername: db.prepare('SELECT * FROM users WHERE username = ?'), s
  insertUser: db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
updateProfile: db.prepare('UPDATE users SET display_name = ?, bio = ?, theme_color = ?, song_title = ?, song_url = ? WHERE id = ?'),
friendsOf: db.prepare('                     
    SELECT u.id, u.username, u.display_name, f.position FROM friends f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ? ORDER BY f.position ASC, f.id ASC`),
   frienrow: db.prepare('SELECT * FROM friends WHERE user_id = ? AND friend_id = ?'),
  friendCount: db.prepare('SELECT COUNT(*) AS n FROM friends WHERE user_id = ?'),
  maxPosition: db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM friends WHERE user_id = ?'),
  addFriend: db.prepare('INSERT INTO friends (user_id, friend_id, position) VALUES (?, ?, ?)'),
  removeFriend: db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?'),
  neighborUp: db.prepare('SELECT * FROM friends WHERE user_id = ? AND position < ? ORDER BY position DESC LIMIT 1'),
  neighborDown: db.prepare('SELECT * FROM friends WHERE user_id = ? AND position > ? ORDER BY position ASC LIMIT 1'),
  setPosition: db.prepare('UPDATE friends SET position = ? WHERE id = ?'),

  insertPost: db.prepare('INSERT INTO posts (user_id, body) VALUES (?, ?)'),
  postById: db.prepare('SELECT * FROM posts WHERE id = ?'),
  feedFor: db.prepare(`
    SELECT p.id, p.body, p.created_at, u.username, u.display_name,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me,
      (SELECT COUNT(*) FROM likes l JOIN posts p2 ON p2.id = l.post_id WHERE p2.user_id = p.user_id AND l.user_id = ?)
      + (SELECT COUNT(*) FROM comments c JOIN posts p3 ON p3.id = c.post_id WHERE p3.user_id = p.user_id AND c.user_id = ?) AS affinity
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? OR p.user_id IN (SELECT friend_id FROM friends WHERE user_id = ?)
    ORDER BY p.id + affinity * 2 DESC LIMIT 50`),
  postsByUser: db.prepare(`
    SELECT p.id, p.body, p.created_at, u.username, u.display_name,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? ORDER BY p.id DESC LIMIT 50`),
  likeAdd: db.prepare('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)'),
  likeDel: db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?'),
  commentsFor: db.prepare(`
    SELECT c.*, u.username, u.display_name FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.id ASC`),
  addComment: db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)'),

  bulletins: db.prepare(`
    SELECT b.*, u.username, u.display_name FROM bulletins b
    JOIN users u ON u.id = b.user_id ORDER BY b.id DESC LIMIT 50`),
  addBulletin: db.prepare('INSERT INTO bulletins (user_id, body) VALUES (?, ?)'),

  threads: db.prepare(`
    SELECT u.id, u.username, u.display_name,
      MAX(m.id) AS last_id, MAX(m.created_at) AS last_at,
      (SELECT body FROM messages m2
        WHERE ((m2.sender_id = ? AND m2.receiver_id = u.id) OR (m2.sender_id = u.id AND m2.receiver_id = ?))
        ORDER BY m2.id DESC LIMIT 1) AS preview
    FROM messages m
    JOIN users u ON u.id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY u.id, u.username, u.display_name
    ORDER BY last_id DESC`),
  threadMessages: db.prepare(`
    SELECT m.* FROM messages m
    WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.id ASC`),
  sendMessage: db.prepare('INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)'),
};

// ---------- helpers ----------
app.use((req, res, next) => {
  req.user = req.session.userId ? (Q.userById.get(req.session.userId) || null) : null;
  if (!req.user) delete req.session.userId;
  next();
});

function requireLogin(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

const USER_RE = /^[a-z0-9_]{3,20}$/;
function withComments(posts) {
  return posts.map(p => ({ ...p, comments: Q.commentsFor.all(p.id) }));
}
function back(req) {
  const r = req.get('Referer');
  return r && r.startsWith('/') ? r : '/';
}

// ---------- auth ----------
app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.send(loginForm());
});

app.post('/login', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const u = Q.userByUsername.get(username);
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.password_hash)) {
    return res.status(401).send(loginForm('Nope — wrong username or password.'));
  }
  req.session.userId = u.id;
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  if (req.user) return res.redirect('/');
  res.send(signupForm());
});

app.post('/signup', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const displayName = String(req.body.display_name || '').trim().slice(0, 40);
  const password = String(req.body.password || '');

  if (!USER_RE.test(username)) {
    return res.status(400).send(signupForm('Username must be 3–20 chars: letters, numbers, underscores.'));
  }
  if (password.length < 6) {
    return res.status(400).send(signupForm('Password needs at least 6 characters.'));
  }
  if (Q.userByUsername.get(username)) {
    return res.status(400).send(signupForm('That username is taken. Pick another.'));
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = Q.insertUser.run(username, hash, displayName || username);
  req.session.userId = Number(info.lastInsertRowid);
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- home feed ----------
app.get('/', requireLogin, (req, res) => {
  const posts = withComments(Q.feedFor.all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id));
  res.send(homePage(req.user, posts));
});

app.post('/posts', requireLogin, (req, res) => {
  const body = String(req.body.body || '').trim().slice(0, 500);
  if (!body) {
    const posts = withComments(Q.feedFor.all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id));
    return res.status(400).send(homePage(req.user, posts, 'Write something first.'));
  }
  Q.insertPost.run(req.user.id, body);
  res.redirect('/');
});

app.post('/posts/:id/like', requireLogin, (req, res) => {
  const post = Q.postById.get(Number(req.params.id));
  if (!post) return res.status(404).send('Post not found.');
  const del = Q.likeDel.run(post.id, req.user.id);
  if (del.changes === 0) Q.likeAdd.run(post.id, req.user.id);
  res.redirect(back(req) + '#post-' + post.id);
});

app.post('/posts/:id/comments', requireLogin, (req, res) => {
  const post = Q.postById.get(Number(req.params.id));
  if (!post) return res.status(404).send('Post not found.');
  const body = String(req.body.body || '').trim().slice(0, 300);
  if (!body) return res.redirect(back(req) + '#post-' + post.id);
  Q.addComment.run(post.id, req.user.id, body);
  res.redirect(back(req) + '#post-' + post.id);
});

// ---------- profile ----------
app.get('/u/:username', (req, res) => {
  const owner = Q.userByUsername.get(String(req.params.username).toLowerCase());
  if (!owner) return res.status(404).send(page({ user: req.user, title: 'Not found', body: '<div class="card"><h1>404</h1><p class="muted">Nobody here by that name.</p></div>' }));
  const friends = Q.friendsOf.all(owner.id);
  const posts = withComments(Q.postsByUser.all(req.user ? req.user.id : 0, owner.id));
  const isFriend = req.user ? !!Q.friendRow.get(req.user.id, owner.id) : false;
  res.send(profilePage(req.user, owner, friends, posts, isFriend));
});

app.get('/settings', requireLogin, (req, res) => {
  res.send(settingsPage(req.user));
});

app.post('/settings', requireLogin, (req, res) => {
  const displayName = String(req.body.display_name || '').trim().slice(0, 40);
  const bio = String(req.body.bio || '').trim().slice(0, 200);
  const song = String(req.body.song_title || '').trim().slice(0, 100);
  let theme = String(req.body.theme_color || 'blue');
  if (!THEMES[theme]) theme = 'blue';
  Q.updateProfile.run(displayName || req.user.username, bio, theme, song, req.user.id);
  req.user = Q.userById.get(req.user.id);
  res.send(settingsPage(req.user, null, 'Saved. Looking good.'));
});

// ---------- friends (Top 8) ----------
app.post('/friends/add', requireLogin, (req, res) => {
  const target = Q.userByUsername.get(String(req.body.username || '').trim().toLowerCase());
  if (!target) return res.status(404).send('No user by that name.');
  if (target.id === req.user.id) return res.status(400).send("That's you. You can't friend yourself.");
  if (Q.friendRow.get(req.user.id, target.id)) return res.redirect('/u/' + target.username);
  if (Q.friendCount.get(req.user.id).n >= 8) {
    return res.status(400).send('Top 8 is full — remove someone first.');
  }
  const pos = Q.maxPosition.get(req.user.id).m + 1;
  Q.addFriend.run(req.user.id, target.id, pos);
  res.redirect('/u/' + target.username);
});

app.post('/friends/remove', requireLogin, (req, res) => {
  const fid = Number(req.body.friend_id);
  Q.removeFriend.run(req.user.id, fid);
  res.redirect(back(req));
});

app.post('/friends/move', requireLogin, (req, res) => {
  const fid = Number(req.body.friend_id);
  const dir = req.body.dir === 'down' ? 'down' : 'up';
  const row = Q.friendRow.get(req.user.id, fid);
  if (!row) return res.redirect('/');
  const neighbor = dir === 'up'
    ? Q.neighborUp.get(req.user.id, row.position)
    : Q.neighborDown.get(req.user.id, row.position);
  if (neighbor) {
    Q.setPosition.run(neighbor.position, row.id);
    Q.setPosition.run(row.position, neighbor.id);
  }
  res.redirect('/u/' + req.user.username);
});

// ---------- bulletins ----------
app.get('/bulletins', requireLogin, (req, res) => {
  res.send(bulletinsPage(req.user, Q.bulletins.all()));
});

app.post('/bulletins', requireLogin, (req, res) => {
  const body = String(req.body.body || '').trim().slice(0, 300);
  if (!body) return res.status(400).send(bulletinsPage(req.user, Q.bulletins.all(), 'Write something first.'));
  Q.addBulletin.run(req.user.id, body);
  res.redirect('/bulletins');
});

// ---------- messages ----------
app.get('/messages', requireLogin, (req, res) => {
  const id = req.user.id;
  res.send(inboxPage(req.user, Q.threads.all(id, id, id, id, id)));
});

app.get('/messages/:username', requireLogin, (req, res) => {
  const other = Q.userByUsername.get(String(req.params.username).toLowerCase());
  if (!other) return res.status(404).send('No user by that name.');
  if (other.id === req.user.id) return res.redirect('/messages');
  const msgs = Q.threadMessages.all(req.user.id, other.id, other.id, req.user.id);
  res.send(threadPage(req.user, other, msgs));
});

app.post('/messages/:username', requireLogin, (req, res) => {
  const other = Q.userByUsername.get(String(req.params.username).toLowerCase());
  if (!other) return res.status(404).send('No user by that name.');
  if (other.id === req.user.id) return res.redirect('/messages');
  const body = String(req.body.body || '').trim().slice(0, 1000);
  if (!body) return res.redirect('/messages/' + other.username);
  Q.sendMessage.run(req.user.id, other.id, body);
  res.redirect('/messages/' + other.username);
});

// ---------- go ----------
app.listen(PORT, () => {
  console.log(`⌫ backspace is live at http://localhost:${PORT}`);
});
