// auth.js - handles login and logout on the login page

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMsg = document.getElementById('login-message');
    const toggleBtn = document.getElementById('toggle-pw');
    const passwordInput = document.getElementById('password');

    // Show message helper
    const showMessage = (msg, isError = false) => {
        loginMsg.textContent = msg;
        loginMsg.className = 'message ' + (isError ? 'error' : 'success');
    };

    // Toggle password visibility
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            toggleBtn.textContent = type === 'password' ? 'Show' : 'Hide';
        });
    }

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showMessage('Please fill in all fields', true);
            return;
        }

        const submitBtn = document.getElementById('login-submit');
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;

        try {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            const data = await resp.json();

            if (!resp.ok) throw data.error || 'Login failed';

            showMessage('Login successful! Redirecting...');

            // Redirect based on role
            setTimeout(() => {
                if (data.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/judge';
                }
            }, 500);
        } catch (err) {
            showMessage(err, true);
            submitBtn.textContent = 'Sign In';
            submitBtn.disabled = false;
        }
    });
});
