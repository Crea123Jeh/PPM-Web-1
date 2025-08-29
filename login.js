// login.js — robust auth handling and overlay fallback
const AUTH_FALLBACK_MS = 1500; // 1.5s fallback
const FIREBASE_MAX_WAIT_MS = 5000; // stop waiting for firebase longer than this

// DOM refs
const authLoading = document.getElementById('authLoading');
const overlayContinue = document.getElementById('overlayContinue');
const loginForm = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const passEl = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginBtnSpinner = document.getElementById('loginBtnSpinner');
const yearSpan = document.getElementById('year');

if (yearSpan) yearSpan.textContent = new Date().getFullYear();

function showError(msg){
  if (!errorMessage) return;
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
}
function hideError(){
  if (!errorMessage) return;
  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';
}
function setLoading(isLoading){
  if (!loginBtn) return;
  if (isLoading) {
    loginBtn.disabled = true;
    loginBtnText.style.opacity = '0';
    loginBtnSpinner.classList.remove('hidden');
  } else {
    loginBtn.disabled = false;
    loginBtnText.style.opacity = '1';
    loginBtnSpinner.classList.add('hidden');
  }
}
function hideOverlayImmediately(){
  if (!authLoading) return;
  authLoading.classList.add('hidden');
  authLoading.style.pointerEvents = 'none';
}

// Toggle password visibility
togglePasswordBtn?.addEventListener('click', () => {
  if (!passEl) return;
  if (passEl.type === 'password') {
    passEl.type = 'text';
    togglePasswordBtn.textContent = '🙈';
  } else {
    passEl.type = 'password';
    togglePasswordBtn.textContent = '👁️';
  }
});

// If user clicks "Continue to login" overlay button, hide overlay so form is interactive
overlayContinue?.addEventListener('click', (e) => {
  e.preventDefault();
  console.info('[login] overlay manually dismissed by user');
  hideOverlayImmediately();
});

// Fallback timer: hide overlay after AUTH_FALLBACK_MS if auth hasn't resolved
let authResolved = false;
const fallbackTimer = setTimeout(() => {
  if (!authResolved) {
    console.info(`[login] auth did not resolve within ${AUTH_FALLBACK_MS}ms — unblocking UI`);
    hideOverlayImmediately();
  }
}, AUTH_FALLBACK_MS);

// Wait for firebase SDK to be present, but don't wait forever
function whenFirebaseReady(cb) {
  if (window.firebase && firebase.auth) return cb();
  const start = Date.now();
  const interval = setInterval(() => {
    if (window.firebase && firebase.auth) {
      clearInterval(interval);
      cb();
    } else if (Date.now() - start > FIREBASE_MAX_WAIT_MS) {
      clearInterval(interval);
      console.warn('[login] firebase did not become ready within timeout');
      // allow UI to be unblocked so user may attempt login (will likely fail if SDK absent)
      hideOverlayImmediately();
      cb();
    }
  }, 150);
}

whenFirebaseReady(() => {
  if (!window.firebase || !firebase.auth) {
    console.error('[login] Firebase Auth not available');
    // ensure overlay is hidden so user can still see form (they can't actually log in until SDK loads)
    hideOverlayImmediately();
    return;
  }

  const auth = firebase.auth();

  // Listen for auth state changes
  auth.onAuthStateChanged(user => {
    authResolved = true;
    clearTimeout(fallbackTimer);
    console.info('[login] onAuthStateChanged fired; user=', !!user);

    if (user) {
      // signed in, redirect to dashboard
      window.location.href = 'dashboard.html';
      return;
    }

    // not signed in — hide overlay and let user interact
    hideOverlayImmediately();
  });
});

// Form submit (login)
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) {
    showError('Please enter both email and password.');
    return;
  }

  setLoading(true);

  try {
    if (!window.firebase || !firebase.auth) throw new Error('Firebase not ready');
    await firebase.auth().signInWithEmailAndPassword(email, password);
    // redirect proactively (onAuthStateChanged will also redirect)
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error('[login] signIn error', err);
    showError(err && err.message ? err.message : 'Login failed. Try again.');
    setLoading(false);
  }
});
