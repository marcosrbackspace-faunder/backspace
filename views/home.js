'use strict';
// Home feed: composer + chronological posts with likes and comments.
const { esc, escMultiline, page, avatar, fmtTime } = require('./layout');

function postCard(p, me) {
  const liked = Number(p.liked_by_me) > 0;
  const comments = (p.comments || []).map(c => `
      <div class="comment">
        ${avatar(c.display_name || c.username, 28)}
        <div>
          <a href="/u/${esc(c.username)}" class="who">${esc(c.display_name || c.username)}</a>
          <span class="when">${fmtTime(c.created_at)}</span>
          <div class="cbody">${escMultiline(c.body)}</div>
        </div>
      </div>`).join('');

  return `
  <article class="card post" id="post-${p.id}">
    <div class="post-head">
      ${avatar(p.display_name || p.username, 40)}
      <div>
        <a href="/u/${esc(p.username)}" class="who">${esc(p.display_name || p.username)}</a>
        <div class="when">${fmtTime(p.created_at)}</div>
      </div>
    </div>
    <div class="pbody">${escMultiline(p.body)}</div>
    <div class="post-actions">
      <form class="inline" method="post" action="/posts/${p.id}/like">
        <button class="pill ${liked ? 'liked' : ''}" type="submit">♥ ${p.like_count}${liked ? ' · liked' : ''}</button>
      </form>
      <span class="muted">💬 ${p.comment_count}</span>
    </div>
    <div class="comments">${comments}</div>
    <form class="comment-form" method="post" action="/posts/${p.id}/comments">
      <input name="body" maxlength="300" placeholder="Write a comment…" required>
      <button type="submit">Reply</button>
    </form>
  </article>`;
}

function homePage(user, posts, error) {
  const err = error ? `<p class="error">${esc(error)}</p>` : '';
  const feed = posts.length
    ? posts.map(p => postCard(p, user)).join('\n')
    : `<div class="card"><p class="muted">Quiet in here. Write the first post — or go add some friends.</p></div>`;

  const body = `
    <div class="card">
      <h1>⌫ The Feed</h1>
      ${err}
      <form method="post" action="/posts">
        <textarea name="body" rows="3" maxlength="500" placeholder="What's on your mind, ${esc(user.display_name || user.username)}?" required></textarea>
        <button type="submit">Post</button>
      </form>
    </div>
    ${feed}`;

  return page({ user, title: 'Home', body, active: 'home', theme: user.theme_color });
}

module.exports = { homePage, postCard };
