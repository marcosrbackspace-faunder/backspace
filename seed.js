'use strict';
// Seed the database with a demo user + friends + content so Backspace
// opens with life in it. Safe to re-run: it wipes the demo tables first.
//
//   npm run seed
const bcrypt = require('bcryptjs');
const db = require('./db');

console.log('Seeding backspace.db …');

db.exec('DELETE FROM messages; DELETE FROM bulletins; DELETE FROM comments; DELETE FROM likes; DELETE FROM posts; DELETE FROM friends; DELETE FROM users;');

const addUser = db.prepare(
  'INSERT INTO users (username, password_hash, display_name, bio, theme_color, song_title) VALUES (?, ?, ?, ?, ?, ?)'
);
const addFriend = db.prepare('INSERT INTO friends (user_id, friend_id, position) VALUES (?, ?, ?)');
const addPost = db.prepare("INSERT INTO posts (user_id, body, created_at) VALUES (?, ?, datetime('now', ?))");
const addBulletin = db.prepare('INSERT INTO bulletins (user_id, body) VALUES (?, ?)');
const addMessage = db.prepare('INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)');
const addLike = db.prepare('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)');
const addComment = db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)');

function user(username, password, displayName, bio, theme, song) {
  const info = addUser.run(username, bcrypt.hashSync(password, 10), displayName, bio, theme, song);
  return Number(info.lastInsertRowid);
}

const marcos = user('marcos', 'backspace123', 'Marcos', 'Trucks, greenhouses, and bringing MySpace back from the dead.', 'pink', 'Transcendent Derti — bass demo');
const tom = user('tom', 'tom12345', 'Tom', 'Your first friend. Still here.', 'blue', '');
const luna = user('luna', 'luna12345', 'Luna', 'plants > people', 'green', 'midnight garden — luna');
const rico = user('rico', 'rico12345', 'Rico', 'I fix transmissions and argue about football.', 'orange', '');

// Marcos's Top 8 — Tom at #1, as it should be.
addFriend.run(marcos, tom, 0);
addFriend.run(marcos, luna, 1);
addFriend.run(marcos, rico, 2);
addFriend.run(tom, marcos, 0);
addFriend.run(luna, marcos, 0);

const p1 = addPost.run(tom, 'Welcome to Backspace. Customize your profile, pick your Top 8, put a song on your page. Like the old days, but it actually works.', '-2 hours').lastInsertRowid;
const p2 = addPost.run(marcos, 'First post. This thing is really happening. ⌫', '-90 minutes').lastInsertRowid;
const p3 = addPost.run(luna, 'greenhouse update: the misters are FINALLY dialed in. pics soon 🌱', '-45 minutes').lastInsertRowid;
const p4 = addPost.run(rico, 'unpopular opinion: the 4R75E is a perfectly good transmission and I will not be taking questions', '-20 minutes').lastInsertRowid;

addLike.run(p1, marcos);
addLike.run(p1, luna);
addLike.run(p2, tom);
addLike.run(p4, marcos);
addComment.run(p1, marcos, 'Tom still #1 after all these years. Respect.');
addComment.run(p4, tom, 'bold statement rico');

addBulletin.run(tom, '📌 Bulletin #1: your Top 8 is sacred. Choose wisely.');
addBulletin.run(marcos, '📌 Backspace is live. Tell your friends. Actually — ADD your friends.');

addMessage.run(tom, marcos, 'hey. welcome back.');
addMessage.run(marcos, tom, 'this feels like 2007 again. in a good way.');
addMessage.run(luna, marcos, 'did you see the greenhouse?? the misters!!');

console.log('Done. Demo login: marcos / backspace123');
