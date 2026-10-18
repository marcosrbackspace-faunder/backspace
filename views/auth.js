'use strict';
// Login / signup pages.
const { esc, page } = require('./layout');

function loginForm(error) {
  const err = error ? `<p class="error">${esc(error)}</p>` : '';
  const body = `
    <div class="card narrow">
      <h1>Log in</h1>
      ${err}
      <form method="post" action="/login">
        <label>Username<input name="username" autocomplete="username" required></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
        <button type="submit">Log in</button>
      </form>
      <p class="muted">No account? <a href="/signup">Sign up</a></p>
    </div>`;
  return page({ user: null, title: 'Log in', body, active: 'login' });
}

function signupForm(error) {
  const err = error ? `<p class="error">${esc(error)}</p>` : '';
  const body = `
    <div class="card narrow">
      <h1>Sign up</h1>
      ${err}
      <form method="post" action="/signup">
        <label>Username <span class="muted">(3–20 chars, letters/numbers/_)</span><input name="username" autocomplete="username" required></label>
        <label>Display name<input name="display_name" maxlength="40"></label>
        <label>Password <span class="muted">(min 6 chars)</span><input type="password" name="password" autocomplete="new-password" required></label>
        <button type="submit">Create account</button>
      </form>
      <p class="muted">Already on here? <a href="/login">Log in</a></p>
    </div>`;
  return page({ user: null, title: 'Sign up', body, active: 'signup' });
}

module.exports = { loginForm, signupForm };
