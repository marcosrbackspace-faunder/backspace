'use strict';
// Bulletins board + DMs.
const { esc, escMultiline, page, avatar, fmtTime } = require('./layout');

function bulletinsPage(user, items, error) {
  const err = error ? `<p class="error">${esc(error)}</p>` : '';
  const list = items.length ? items.map(b => `
    <article class="card bulletin">
      <div class="post-head">
        ${avatar(b.display_name || b.username, 36)}
        <div>
          <a href="/u/${esc(b.username)}" class="who">${esc(b.display_name || b.username)}</a>
          <div class="when">${fmtTime(b.created_at)}</div>
        </div>
      </div>
      <div class="pbody">${escMultiline(b.body)}</div>
    </article>`).join('\n')
    : `<div class="card"><p class="muted">No bulletins yet. Pin one to the board.</p></div>`;

  const body = `
    <div class="card">
      <h1>📢 Bulletins</h1>
      ${err}
      <form method="post" action="/bulletins">
        <textarea name="body" rows="2" maxlength="300" placeholder="Post a bulletin for everyone…" required></textarea>
        <button type="submit">Pin bulletin</button>
      </form>
    </div>
    ${list}`;

  return page({ user, title: 'Bulletins', body, active: 'bulletins', theme: user.theme_color });
}

function inboxPage(user, threads) {
  const list = threads.length ? threads.map(t => `
    <a class="thread-row" href="/messages/${esc(t.username)}">
      ${avatar(t.display_name || t.username, 44)}
      <div>
        <div class="who">${esc(t.display_name || t.username)}</div>
        <div class="muted small">${esc(t.preview || '')}</div>
      </div>
      <span class="when">${fmtTime(t.last_at)}</span>
    </a>`).join('\n')
    : `<div class="card"><p class="muted">No conversations yet. Visit a friend's profile and hit Message.</p></div>`;

  const body = `<div class="card"><h1>✉️ Messages</h1></div>${list}`;
  return page({ user, title: 'Messages', body, active: 'messages', theme: user.theme_color });
}

function threadPage(user, other, messages, error) {
  const err = error ? `<p class="error">${esc(error)}</p>` : '';
  const bubbles = messages.map(m => `
    <div class="msg ${m.sender_id === user.id ? 'mine' : 'theirs'}">
      <div class="bubble">${escMultiline(m.body)}</div>
      <div class="when">${fmtTime(m.created_at)}</div>
    </div>`).join('\n');

  const body = `
    <div class="card">
      <h1><a href="/u/${esc(other.username)}">${esc(other.display_name || other.username)}</a></h1>
      ${err}
      <div class="thread">${bubbles || '<p class="muted">Say hi. First message is free.</p>'}</div>
      <form method="post" action="/messages/${esc(other.username)}">
        <div class="sendrow">
          <input name="body" maxlength="1000" placeholder="Message ${esc(other.display_name || other.username)}…" required autocomplete="off">
          <button type="submit">Send</button>
        </div>
      </form>
    </div>`;

  return page({ user, title: 'Chat with ' + other.username, body, active: 'messages', theme: user.theme_color });
}

module.exports = { bulletinsPage, inboxPage, threadPage };
