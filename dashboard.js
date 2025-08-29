// dashboard.js - updated sidebar active behavior + layout friendly fixes

// Wait for firebase
function whenFirebaseReady(cb) {
  if (window.firebase && firebase.firestore && firebase.auth) return cb();
  const start = Date.now();
  const interval = setInterval(() => {
    if (window.firebase && firebase.firestore && firebase.auth) {
      clearInterval(interval); cb();
    } else if (Date.now() - start > 5000) { clearInterval(interval); console.warn('Firebase did not load in 5s'); cb(); }
  }, 150);
}

whenFirebaseReady(() => {
  const auth = firebase.auth ? firebase.auth() : null;
  const db = firebase.firestore ? firebase.firestore() : null;

  // Sidebar toggle for mobile
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Sidebar active highlighting based on href or data-key; robust matching
  const items = Array.from(document.querySelectorAll('.sidebar-item'));
  const pathname = window.location.pathname.split('/').pop() || 'dashboard.html';
  items.forEach(item => item.classList.remove('active'));
  items.forEach(item => {
    const href = item.getAttribute('href') || '';
    const dataKey = item.dataset.key || '';
    if (href && href.endsWith(pathname)) item.classList.add('active');
    else if (dataKey && pathname.includes(dataKey)) item.classList.add('active');
  });

  // Logout button
  const logoutBtn = document.getElementById('sidebarLogout');
  if (logoutBtn && auth) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await auth.signOut();
        window.location.href = 'login.html';
      } catch (err) {
        console.error('Could not sign out', err);
        alert('Logout failed');
      }
    });
  }

  // redirect if not authenticated
  if (!auth) {
    console.warn('Firebase auth not available');
    return;
  }

  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const avatarCircle = document.getElementById('avatarCircle');
    if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${displayName}!`;
    if (avatarCircle) avatarCircle.textContent = displayName.charAt(0).toUpperCase();

    // wire buttons
    document.getElementById('viewProjectsBtn')?.addEventListener('click', ()=> window.location.href='projects.html');
    document.getElementById('viewTargetsBtn')?.addEventListener('click', ()=> window.location.href='target-list.html');

    // initialize listeners
    initListeners(db);
  });

  // Utility helpers
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const escapeHtml = (s) => s ? String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]) : '';

  function timeAgo(date) {
    if (!date) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.round(diff/60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins/60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours/24);
    return `${days}d ago`;
  }

  // Firestore listeners
  function initListeners(db) {
    if (!db) { console.warn('Firestore not available'); return; }

    // Active projects count
    try {
      db.collection('projectsPPM')
        .where('status','not-in',['Completed','Cancelled'])
        .onSnapshot(snap => { document.getElementById('activeProjectsValue').textContent = String(snap.size); });
    } catch (err) {
      // fallback if not-in unsupported: compute locally
      db.collection('projectsPPM').onSnapshot(snap => {
        let cnt=0; snap.forEach(d=>{ const s=d.data().status; if (s!=='Completed' && s!=='Cancelled') cnt++; });
        document.getElementById('activeProjectsValue').textContent = String(cnt);
      });
    }

    // Targets in progress
    try {
      db.collection('targetListItems').where('status','==','In Progress').onSnapshot(snap => {
        document.getElementById('inProgressTargetsValue').textContent = String(snap.size);
      });
    } catch (e) { console.error(e); }

    // Violations
    db.collection('studentViolations').onSnapshot(snap => {
      document.getElementById('violationsValue').textContent = String(snap.size);
    });

    // Birthdays for today
    db.collection('birthdayEvents').onSnapshot(snap => {
      const today = new Date(); let count=0;
      snap.forEach(doc => {
        const d = doc.data();
        if (d.anchorDate && d.anchorDate.toDate) {
          const bd = d.anchorDate.toDate();
          if (bd.getMonth()===today.getMonth() && bd.getDate()===today.getDate()) count++;
        }
      });
      document.getElementById('birthdaysValue').textContent = String(count);
    });

    // Academic events count -> update associated feature card if present
    const acadQ = db.collection('academicEvents').where('date','>=', firebase.firestore.Timestamp.fromDate(startOfDay(new Date())));
    acadQ.onSnapshot(snap => {
      const el = document.querySelector('[data-feature="Academic Calendar"] .feature-value');
      if (el) el.textContent = String(snap.size);
    });

    // Total assets -> update feature card
    db.collection('assetItems').onSnapshot(snap => {
      let total=0; snap.forEach(doc => { const d = doc.data(); if (d && typeof d.amount==='number') total+=d.amount; });
      const assetsEl = document.querySelector('[data-feature="Total Assets"] .feature-value');
      if (assetsEl) {
        // format simple 'Rp 10B' style
        const formatted = formatLargeNumberWithSuffix(total);
        assetsEl.textContent = formatted;
      }
    });

    // Recent activities
    db.collection('activityLogEntries').orderBy('date','desc').limit(6).onSnapshot(snap => {
      const recentActivitiesList = document.getElementById('recentActivitiesList');
      recentActivitiesList.innerHTML = '';
      if (snap.size === 0) { recentActivitiesList.innerHTML = '<p class="muted">No recent activity.</p>'; return; }
      snap.forEach(doc => {
        const d = doc.data();
        const title = escapeHtml(d.title || 'No title');
        const date = d.date && d.date.toDate ? d.date.toDate() : new Date();
        const source = d.source ? escapeHtml(d.source) : '';
        const div = document.createElement('div'); div.className = 'activity-item';
        div.innerHTML = `<div class="activity-avatar">🟢</div>
          <div>
            <div style="font-weight:700">${title} ${source? `<span style="font-weight:600;color:#666;font-size:12px"> (via ${source})</span>`:''}</div>
            <div class="small muted">${timeAgo(date)}</div>
          </div>`;
        recentActivitiesList.appendChild(div);
      });
    });

    // If you want to add other listeners, do it here...
  }

  // small formatting helper for assets display
  function formatLargeNumberWithSuffix(num, precision = 1) {
    const map = [{suffix:'T',threshold:1e12},{suffix:'B',threshold:1e9},{suffix:'M',threshold:1e6},{suffix:'K',threshold:1e3},{suffix:'',threshold:1}];
    const found = map.find(x => Math.abs(num) >= x.threshold) || map[4];
    const formatted = (num / found.threshold).toFixed(precision);
    const finalValue = precision > 0 && formatted.endsWith(`.${'0'.repeat(precision)}`) ? formatted.slice(0, -(precision + 1)) : formatted;
    return `Rp ${finalValue}${found.suffix}`;
  }

  // Render feature cards (static) and attach buttons
  (function renderFeatureCards() {
    const features = [
      { title:'PPM Calendar', description:'Upcoming deadlines, meetings, and milestones.', icon:'📆', link:'ppm-calendar.html' },
      { title:'Birthday Calendar', description:"Don't miss any colleague or student birthdays.", icon:'🎂', link:'birthday-calendar.html' },
      { title:'Academic Calendar', description:'Stay on top of school events, exams, and holidays.', icon:'🎓', link:'academic.html' },
      { title:'Total Assets', description:'Current total value of recorded assets.', icon:'📦', link:'total-assets.html' },
      { title:'Information Hub', description:'Latest news, announcements, and industry trends.', icon:'ℹ️', link:'information.html' },
      { title:'Knowledge Hub', description:'Access learning resources and tutorials.', icon:'📚', link:'knowledge.html' }
    ];
    const featuresGrid = document.getElementById('featuresGrid');
    featuresGrid.innerHTML = '';
    features.forEach(f => {
      const el = document.createElement('div'); el.className = 'card feature-card'; el.setAttribute('data-feature', f.title);
      el.innerHTML = `
        <div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="font-size:20px">${f.icon}</div>
            <div style="font-weight:800">${escapeHtml(f.title)}</div>
          </div>
          <div class="muted small" style="margin-top:10px">${escapeHtml(f.description)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
          <div class="feature-value" style="font-weight:800">—</div>
          <button class="btn outline" data-link="${f.link}">View Details →</button>
        </div>`;
      featuresGrid.appendChild(el);
      el.querySelectorAll('button[data-link]').forEach(b => b.addEventListener('click', () => {
        const link = b.getAttribute('data-link'); if (link) location.href = link;
      }));
    });
  })();

  // Render quick links
  (function renderQuickLinks() {
    const quickLinksList = document.getElementById('quickLinksList');
    const links = [
      { href:'projects.html', label:'Manage Projects' },
      { href:'target-list.html', label:'View Target List' },
      { href:'violations.html', label:'Report Violations' },
      { href:'chat.html', label:'Open Team Chat' },
      { href:'profile.html', label:'Your Profile' },
      { href:'settings.html', label:'App Settings' },
    ];
    quickLinksList.innerHTML = '';
    links.forEach(l => {
      const btn = document.createElement('div'); btn.className='quick-btn';
      btn.innerHTML = `<a href="${l.href}">→ ${escapeHtml(l.label)}</a>`;
      quickLinksList.appendChild(btn);
    });
  })();

});

// sidebar.js - attach to pages that include sidebar.html
(function () {
  // Quick helper to safely query DOM
  const qs = (s) => document.querySelector(s);

  // highlight active link by comparing href or data-key with current pathname
  function highlightActive() {
    const items = document.querySelectorAll('.ppm-item');
    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    items.forEach(i => i.classList.remove('active'));
    items.forEach(i => {
      const href = i.getAttribute('href') || '';
      const key = i.dataset.key || '';
      if (href && href.endsWith(path)) {
        i.classList.add('active');
      } else if (key && path.includes(key)) {
        i.classList.add('active');
      }
    });
  }

  // Logout: if you use firebase auth, hook it; otherwise fallback to redirect
  function setupLogout() {
    const btn = document.getElementById('ppmLogout');
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      // If Firebase exists, sign out; otherwise just redirect
      if (window.firebase && firebase.auth) {
        try {
          await firebase.auth().signOut();
          window.location.href = 'login.html';
          return;
        } catch (err) {
          console.warn('SignOut failed', err);
        }
      }
      // fallback redirect
      window.location.href = 'login.html';
    });
  }

  // Mobile: optional API to toggle sidebar open/close
  function setupMobileToggle(toggleSelector = '#sidebarToggle') {
    const toggle = document.querySelector(toggleSelector);
    const sidebar = document.getElementById('appSidebar') || document.querySelector('.ppm-sidebar');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    // close if you click outside (mobile behavior)
    document.addEventListener('click', (e) => {
      if (!sidebar.classList.contains('open')) return;
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) sidebar.classList.remove('open');
    });
  }

  // Run
  document.addEventListener('DOMContentLoaded', () => {
    highlightActive();
    setupLogout();
    // If you added a mobile toggle button with id="sidebarToggle", setup it
    setupMobileToggle();
  });

  // If your app updates route via history API, expose highlightActive
  window.ppmSidebar = { highlightActive };
})();

const sidebar = document.getElementById("sidebar");
const toggle = document.getElementById("sidebarToggle");

toggle.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});
