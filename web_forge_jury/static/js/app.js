// app.js - Frontend logic for Jury Scoring Portal
// Handles login, logout, and displays user dashboard

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginMsg = document.getElementById('login-message');
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const displayNameEl = document.getElementById('display-name');
  const roleEl = document.getElementById('role');
  const logoutBtn = document.getElementById('logout-btn');

  // Helper to show messages
  const showMessage = (el, msg, isError = false) => {
    el.textContent = msg;
    el.style.color = isError ? '#ff4d4f' : '#4caf50';
  };

  // Check session on load
  fetch('/api/me', { credentials: 'include' })
    .then(res => res.ok ? res.json() : Promise.reject('Unauthenticated'))
    .then(data => {
      // Show dashboard
      loginSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      displayNameEl.textContent = data.display_name || 'User';
      roleEl.textContent = data.role;
    })
    .catch(() => {
      // Not logged in – stay on login screen
    });

  // Login form submission
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw data.error || 'Login failed';
      // Success – show dashboard
      loginSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      displayNameEl.textContent = data.display_name;
      roleEl.textContent = data.role;
      showMessage(loginMsg, 'Login successful');
    } catch (err) {
      showMessage(loginMsg, err, true);
    }
  });

  // Logout button
  logoutBtn.addEventListener('click', async () => {
    try {
      const resp = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      if (!resp.ok) throw 'Logout failed';
      // Reset UI
      dashboardSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
      loginForm.reset();
      showMessage(loginMsg, 'Logged out');
    } catch (err) {
      showMessage(loginMsg, err, true);
    }
  });
});
