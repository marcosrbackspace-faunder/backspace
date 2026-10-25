'use strict';
// Shared layout + HTML escaping. EVERY piece of user content must go
// through esc() before it hits the page (XSS protection).

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Preserve line breaks in posts / bios / messages.
function escMultiline(s) {
  return esc(s).replace(/\r?\n/g, '<br>');
}

const THEMES = {
  blue: '#3b82f6',
  pink: '#ec4899',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
};

const THEME_NAMES = {
  blue: 'Electric Blue',
  pink: 'Hot Pink',
  green: 'Slime Green',
  purple: 'Purple Haze',
  orange: 'Lava Orange',
};

function fmtTime(ts) {
  // SQLite stores UTC "YYYY-MM-DD HH:MM:SS". Show it plainly.
  return esc(String(ts || '').slice(0, 16).replace('T', ' ')) + ' UTC';
}

function avatar(name, size) {
  const initial = esc(String(name || '?').trim().charAt(0).toUpperCase() || '?');
  const s = size || 44;
  return `<span class="avatar" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.45)}px">${initial}</span>`;
}

// opts: { user, title, body, theme (accent key), active }
function page(opts, legacyBoody) {
  if (typeof opts === 'string') return legacyBoody;
  const { user, title, body, active } = opts;
  const accent = THEMES[opts.theme] || THEMES.blue;

  const nav = user
    ? `
      <a href="/" class="${active === 'home' ? 'on' : ''}">Home</a>
      <a href="/bulletins" class="${active === 'bulletins' ? 'on' : ''}">Bulletins</a>
      <a href="/messages" class="${active === 'messages' ? 'on' : ''}">Messages</a>
      <span class="nav-right">
        <a href="/u/${esc(user.username)}" class="${active === 'profile' ? 'on' : ''}">@${esc(user.username)}</a>
        <a href="/settings" class="${active === 'settings' ? 'on' : ''}">Settings</a>
        <form class="inline" method="post" action="/logout"><button class="linkbtn" type="submit">Log out</button></form>
      </span>`
    : `
      <span class="nav-right">
        <a href="/login" class="${active === 'login' ? 'on' : ''}">Log in</a>
        <a href="/signup" class="${active === 'signup' ? 'on' : ''}">Sign up</a>
      </span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · backMyspace</title>
<link rel="stylesheet" href="/style.css">
<style>:root { --accent: ${accent}; }</style>
</head>
<body>
<header class="topbar">
  <a class="logo" href="/"><span class="key">⌫</span> backMyspace</a>
  <nav>${nav}</nav>
</header>
<main class="wrap">
${body}
</main>
<footer class="foot">backMyspace · old school meets new school </footer>
<script src="/app.js"></script>
</body>
</html>`;
}

module.exports = { esc, escMultiline, page, avatar, fmtTime, THEMES, THEME_NAMES };
