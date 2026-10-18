'use strict';
// Profile page: header, Top 8, posts. Settings page: edit profile.
const { esc, escMultiline, page, avatar, fmtTime, THEMES, THEME_NAMES } = require('./layout');
const { postCard } = require('./home');

function top8Grid(owner, friends, me) {
  const cells = friends.map((f, i) => {
    const controls = me && me.id === owner.id ? `
        <div class="t8-controls">
          <form class="inline" method="post" action="/friends/move">
            <input type="hidden" name="friend_id" value="${f.id}">
            <input type="hidden" name="dir" value="up">
            <button class="mini" type="submit" ${i === 0 ? 'disabled' : ''} title="Move up">▲</button>
          </form>
          <form class="inline" method="post" action="/friends/move">
            <input type="hidden" name="friend_id" value="${f.id}">
            <input type="hidden" name="dir" value="down">
            <button class="mini" type="submit" ${i === friends.length - 1 ? 'disabled' : ''} title="Move down">▼</button>
          </form>
          <form class="inline" method="post" action="/friends/remove" onsubmit="return confirm('Remove ${esc(f.display_name || f.username)} from your Top 8?')">
            <input type="hidden" name="friend_id" value="${f.id}">
            <button class="mini danger" type="submit" title="Remove">✕</button>
          </form>
        </div>` : '';
    return `
      <div class="t8-cell">
        <a href="/u/${esc(f.username)}">${avatar(f.display_name || f.username, 56)}</a>
        <a href="/u/${esc(f.username)}" class="t8-name">#${i + 1} ${esc(f.display_name || f.username)}</a>
        ${controls}
      </div>`;
  }).join('');

  const empty = friends.length === 0
    ? `<p class="muted">No friends yet. This is where your Top 8 lives.</p>` : '';

  return `
  <section class="card">
    <h2>Top 8 <span class="muted small">(${friends.length} of 8)</span></h2>
    <div class="t8-grid">${cells}</div>
    ${empty}
  </section>`;
}

function profilePage(me, owner, friends, posts, isFriend, error) {
  const err = error ? `<p class="error">${esc(error)}</p>` : '';
  const isMe = me && me.id === owner.id;

  let friendBtn = '';
  if (me && !isMe) {
    friendBtn = isFriend
      ? `<form class="inline" method="post" action="/friends/remove" onsubmit="return confirm('Remove friend?')">
           <input type="hidden" name="friend_id" value="${owner.id}">
           <button class="ghost" type="submit">− Remove friend</button>
         </form>
         <a class="btn" href="/messages/${esc(owner.username)}">Message</a>`
      : `<form class="inline" method="post" action="/friends/add">
           <input type="hidden" name="username" value="${esc(owner.username)}">
           <button type="submit">+ Add friend</button>
         </form>`;
  }

  const song = owner.song_title
    ? `<div class="song">♪ <span class="muted">now playing:</span> ${esc(owner.song_title)}</div>` : '';

  const theirPosts = posts.length
    ? posts.map(p => postCard(p, me)).join('\n')
    : `<div class="card"><p class="muted">No posts yet.</p></div>`;

  const body = `
    ${err}
    <section class="card profile-head">
      <div class="ph-top">
        ${avatar(owner.display_name || owner.username, 72)}
        <div>
          <h1>${esc(owner.display_name || owner.username)}</h1>
          <div class="muted">@${esc(owner.username)}</div>
        </div>
        <div class="ph-actions">${friendBtn}${isMe ? `<a class="btn" href="/settings">Edit profile</a>` : ''}</div>
      </div>
      ${owner.bio ? `<p class="bio">${escMultiline(owner.bio)}</p>` : ''}
      ${song}
    </section>
    ${top8Grid(owner, friends, me)}
    <h2>Posts</h2>
    ${theirPosts}`;

  return page({ user: me, title: '@' + owner.username, body, active: isMe ? 'profile' : '', theme: owner.theme_color });
}

function settingsPage(user, error, notice) {
  const err = error ? `<p class="error">${esc(error)}</p>` : '';
  const ok = notice ? `<p class="notice">${esc(notice)}</p>` : '';
  const swatches = Object.keys(THEMES).map(key => `
      <label class="swatch" data-color="${THEMES[key]}" title="${esc(THEME_NAMES[key])}">
        <input type="radio" name="theme_color" value="${key}" ${user.theme_color === key ? 'checked' : ''}>
        <span class="dot" style="background:${THEMES[key]}"></span>
        ${esc(THEME_NAMES[key])}
      </label>`).join('');

  const body = `
    <div class="card narrow">
      <h1>Profile settings</h1>
      ${err}${ok}
      <form method="post" action="/settings">
        <label>Display name<input name="display_name" maxlength="40" value="${esc(user.display_name)}"></label>
        <label>Bio<textarea name="bio" rows="3" maxlength="200">${esc(user.bio)}</textarea></label>
        <label>Profile song<input name="song_title" maxlength="100" value="${esc(user.song_title)}" placeholder="What plays on your page?"></label>
        <fieldset>
          <legend>Theme color</legend>
          <div class="swatches">${swatches}</div>
          <div id="theme-preview" class="theme-preview">Preview — your page wears this color.</div>
        </fieldset>
        <button type="submit">Save changes</button>
      </form>
      <p><a href="/u/${esc(user.username)}">View my profile →</a></p>
    </div>`;

  return page({ user, title: 'Settings', body, active: 'settings', theme: user.theme_color });
}

module.exports = { profilePage, settingsPage };
