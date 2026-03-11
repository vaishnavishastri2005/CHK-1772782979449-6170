/**
 * auth-nav.js
 * ─────────────────────────────────────────────────────────────────
 * Drop this script into any page to get:
 *  1. Auth guard placeholder (no longer redirects)
 *  2. Profile icon in the top-right of the navbar with a dropdown
 *     showing user name/email + Logout button
 * ─────────────────────────────────────────────────────────────────
 * Usage: add at the bottom of <body>:
 *   <script type="module" src="js/auth-nav.js"></script>
 */

import {
    auth,
    onAuthStateChanged,
    signOut,
} from './firebase-config.js';

// ── Inject CSS ──────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .profile-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .profile-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid rgba(255,59,59,0.4);
    background: rgba(255,59,59,0.12);
    color: #f0f4ff;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    overflow: hidden;
    flex-shrink: 0;
  }

  .profile-btn:hover {
    border-color: #ff3b3b;
    background: rgba(255,59,59,0.22);
    box-shadow: 0 0 12px rgba(255,59,59,0.3);
  }

  .profile-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .profile-dropdown {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    min-width: 220px;
    background: #111;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    z-index: 999;
    overflow: hidden;
    animation: dropIn 0.18s ease;
  }

  @keyframes dropIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .profile-dropdown.open { display: block; }

  .profile-info {
    padding: 14px 16px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .profile-info .p-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: #f0f4ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .profile-info .p-email {
    font-size: 0.74rem;
    color: #6b7a99;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .profile-menu {
    padding: 6px;
  }

  .profile-menu a,
  .profile-menu button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #9ba8c0;
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.15s;
    text-align: left;
  }

  .profile-menu a:hover,
  .profile-menu button:hover {
    background: rgba(255,255,255,0.05);
    color: #f0f4ff;
  }

  .profile-menu .logout-btn {
    color: #ff6b6b;
    margin-top: 2px;
    border-top: 1px solid rgba(255,255,255,0.06);
    border-radius: 0 0 8px 8px;
    padding-top: 10px;
  }

  .profile-menu .logout-btn:hover {
    background: rgba(255,59,59,0.1);
    color: #ff3b3b;
  }
`;
document.head.appendChild(style);

// ── Inject Profile Button into Navbar ───────────────────────────
function injectProfileUI(user) {
    // Remove existing profile wrap if present (re-render)
    const existing = document.getElementById('profile-wrap');
    if (existing) existing.remove();

    const navbar = document.querySelector('.navbar') || document.querySelector('nav');
    if (!navbar) return;

    // Avatar: use Google photo or initials
    const displayName = user.displayName || user.email?.split('@')[0] || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    const photoURL = user.photoURL;

    const avatarHTML = photoURL
        ? `<img src="${photoURL}" alt="avatar" referrerpolicy="no-referrer"/>`
        : initial;

    const wrap = document.createElement('div');
    wrap.className = 'profile-wrap';
    wrap.id = 'profile-wrap';
    wrap.innerHTML = `
    <button class="profile-btn" id="profile-btn" title="${displayName}">
      ${avatarHTML}
    </button>
    <div class="profile-dropdown" id="profile-dropdown">
      <div class="profile-info">
        <div class="p-name">${displayName}</div>
        <div class="p-email">${user.email || ''}</div>
      </div>
      <div class="profile-menu">
        <a href="index.html">🏠 Dashboard</a>
        <a href="hospital.html">🏥 Hospitals</a>
        <a href="ambulance.html">🚑 Ambulances</a>
        <a href="db-viewer.html">📊 Database</a>
        <button class="logout-btn" id="logout-btn">🚪 Sign Out</button>
      </div>
    </div>
  `;

    // Replace last child of navbar (usually the right-side element)
    navbar.appendChild(wrap);

    // Toggle dropdown
    document.getElementById('profile-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('profile-dropdown').classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', () => {
        const dd = document.getElementById('profile-dropdown');
        if (dd) dd.classList.remove('open');
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
}

function injectLoginPrompt() {
    const existing = document.getElementById('profile-wrap');
    if (existing) existing.remove();

    const navbar = document.querySelector('.navbar') || document.querySelector('nav');
    if (!navbar) return;

    const wrap = document.createElement('div');
    wrap.className = 'profile-wrap';
    wrap.id = 'profile-wrap';
    
    // Add custom styles inline or use existing utility classes 
    // to provide a clear "Please login" call to action
    wrap.innerHTML = `
        <button onclick="window.location.href='login.html'" style="
            text-decoration: none;
            color: #f0f4ff;
            background: rgba(255, 59, 59, 0.2);
            border: 1px solid rgba(255, 59, 59, 0.4);
            padding: 8px 16px;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            font-weight: 600;
            transition: all 0.2s ease;
            cursor: pointer;
        " onmouseover="this.style.background='rgba(255, 59, 59, 0.35)'" onmouseout="this.style.background='rgba(255, 59, 59, 0.2)'">
            Please login
        </button>
    `;

    navbar.appendChild(wrap);
}

// ── Auth Guard ──────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Logged in → inject profile icon
        injectProfileUI(user);
    } else {
        // Not logged in → inject please login button
        injectLoginPrompt();
    }
});
