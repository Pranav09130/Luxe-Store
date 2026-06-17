// =============================================
//  LUXE STORE — Main JavaScript (API Version)
//  js/main.js
// =============================================

/* ---- STATE ---- */
let cart         = JSON.parse(localStorage.getItem("luxe_cart") || "[]");
let wishlist     = [];          // array of product IDs (from API)
let activeFilter = "all";
let currentUser  = null;        // full user object from API

/* ---- DOM READY ---- */
document.addEventListener("DOMContentLoaded", async () => {
  initNavbar();
  initSearch();
  initCart();
  initFilterTabs();
  initNewsletterForm();
  initScrollAnimations();
  initAuthModal();
  initPayModal();
  await restoreSession();     // Try to restore logged-in user from saved token
  await loadProducts();       // Fetch products from API
  updateCartUI();
});

/* =============================================
   SESSION RESTORE
   ============================================= */
async function restoreSession() {
  const token = localStorage.getItem("luxe_token");
  if (!token) return;
  try {
    const data = await AuthAPI.me();
    currentUser = data.user;
    // Load wishlist from backend
    const wlData = await WishlistAPI.get();
    wishlist = wlData.wishlist.map(p => String(p._id || p.id));
    updateAuthUI();
  } catch {
    // Token expired or invalid — clear it
    localStorage.removeItem("luxe_token");
    localStorage.removeItem("luxe_user");
  }
}

/* =============================================
   LOAD PRODUCTS FROM API
   ============================================= */
async function loadProducts(params = {}) {
  try {
    const data = await ProductsAPI.getAll(params);
    // Normalize MongoDB _id → id for all frontend code
    PRODUCTS = data.products.map(p => ({ ...p, id: String(p._id || p.id) }));
    renderProducts(filterByCategory(PRODUCTS, activeFilter));
  } catch {
    PRODUCTS = [...PRODUCTS_FALLBACK];
    renderProducts(filterByCategory(PRODUCTS, activeFilter));
  }
}

/* =============================================
   NAVBAR
   ============================================= */
function initNavbar() {
  const navbar    = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("nav-links");

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
    updateActiveNavLink();
  });

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    navLinks.classList.toggle("mobile-open");
  });

  navLinks.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("mobile-open");
      hamburger.classList.remove("open");
    });
  });
}

function updateActiveNavLink() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");
  let current = "";
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.getAttribute("id");
  });
  navLinks.forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("href") === "#" + current) link.classList.add("active");
  });
}

/* =============================================
   AUTH UI
   ============================================= */
function updateAuthUI() {
  const authBtns  = document.getElementById("nav-auth-btns");
  const userPanel = document.getElementById("nav-user-panel");

  if (currentUser) {
    authBtns.style.display  = "none";
    userPanel.style.display = "flex";
    const initials = (currentUser.firstName[0] + (currentUser.lastName?.[0] || "")).toUpperCase();
    document.getElementById("user-avatar").textContent       = initials;
    document.getElementById("user-display-name").textContent = currentUser.firstName;
  } else {
    authBtns.style.display  = "flex";
    userPanel.style.display = "none";
  }

  // Re-render products to update wishlist hearts
  renderProducts(filterByCategory(PRODUCTS, activeFilter));
}

/* =============================================
   AUTH MODAL
   ============================================= */
function initAuthModal() {
  const overlay     = document.getElementById("auth-modal");
  const closeBtn    = document.getElementById("auth-modal-close");
  const tabs        = document.querySelectorAll(".modal-tab");
  const loginForm   = document.getElementById("login-form");
  const signupForm  = document.getElementById("signup-form");

  document.getElementById("btn-login").addEventListener("click", () => openAuthModal("login"));
  document.getElementById("btn-signup").addEventListener("click", () => openAuthModal("signup"));

  // Profile link in user panel
  const userPanel = document.getElementById("nav-user-panel");
  userPanel.querySelector(".user-pill").addEventListener("click", openProfileModal);

  closeBtn.addEventListener("click", closeAuthModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeAuthModal(); });

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.dataset.tab;
      document.getElementById("login-panel").style.display  = which === "login"  ? "block" : "none";
      document.getElementById("signup-panel").style.display = which === "signup" ? "block" : "none";
    });
  });

  document.getElementById("switch-to-signup").addEventListener("click", (e) => {
    e.preventDefault();
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "signup"));
    document.getElementById("login-panel").style.display  = "none";
    document.getElementById("signup-panel").style.display = "block";
  });
  document.getElementById("switch-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "login"));
    document.getElementById("signup-panel").style.display = "none";
    document.getElementById("login-panel").style.display  = "block";
  });

  // Login submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const pass  = document.getElementById("login-pass").value.trim();
    let valid = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAuthErr("login-email-err", "Enter a valid email address."); valid = false;
    } else clearAuthErr("login-email-err", "login-email");
    if (pass.length < 6) {
      showAuthErr("login-pass-err", "Password must be at least 6 characters."); valid = false;
    } else clearAuthErr("login-pass-err", "login-pass");

    if (valid) {
      const btn = loginForm.querySelector(".btn-auth");
      btn.textContent = "Signing in…"; btn.disabled = true;
      try {
        const data = await AuthAPI.login({ email, password: pass });
        localStorage.setItem("luxe_token", data.token);
        currentUser = data.user;
        // load wishlist
        const wlData = await WishlistAPI.get();
        wishlist = wlData.wishlist.map(p => String(p._id || p.id));
        updateAuthUI();
        closeAuthModal();
        showToast(`Welcome back, ${data.user.firstName}! 👋`);
        if (data.user.isAdmin) {
          setTimeout(() => showToast("Admin access enabled — click your name for the dashboard."), 1500);
        }
      } catch (err) {
        showAuthErr("login-pass-err", err.message || "Invalid email or password.");
      } finally {
        btn.textContent = "Log In →"; btn.disabled = false;
      }
    }
  });

  // Signup submit
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("signup-fname").value.trim();
    const lastName  = document.getElementById("signup-lname").value.trim();
    const email     = document.getElementById("signup-email").value.trim();
    const pass      = document.getElementById("signup-pass").value.trim();
    const confirm   = document.getElementById("signup-confirm").value.trim();
    let valid = true;

    if (firstName.length < 2) { showAuthErr("su-fname-err","Enter first name."); valid=false; } else clearAuthErr("su-fname-err","signup-fname");
    if (lastName.length < 2)  { showAuthErr("su-lname-err","Enter last name.");  valid=false; } else clearAuthErr("su-lname-err","signup-lname");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthErr("su-email-err","Enter a valid email."); valid=false; } else clearAuthErr("su-email-err","signup-email");
    if (pass.length < 6) { showAuthErr("su-pass-err","At least 6 characters."); valid=false; } else clearAuthErr("su-pass-err","signup-pass");
    if (pass !== confirm) { showAuthErr("su-confirm-err","Passwords don't match."); valid=false; } else clearAuthErr("su-confirm-err","signup-confirm");

    if (valid) {
      const btn = signupForm.querySelector(".btn-auth");
      btn.textContent = "Creating account…"; btn.disabled = true;
      try {
        const data = await AuthAPI.register({ firstName, lastName, email, password: pass });
        localStorage.setItem("luxe_token", data.token);
        currentUser = data.user;
        wishlist = [];
        updateAuthUI();
        closeAuthModal();
        showToast(`Welcome to Luxe, ${firstName}! 🎉`);
      } catch (err) {
        showAuthErr("su-email-err", err.message || "Registration failed.");
      } finally {
        btn.textContent = "Create Account →"; btn.disabled = false;
      }
    }
  });

  // ── Google OAuth Sign-In ──────────────────────────────────────────────────
  //
  // IMPORTANT: Replace the value below with your real Google OAuth Client ID.
  // Get it from https://console.cloud.google.com → APIs & Services → Credentials.
  // The origin of your site (e.g. http://localhost:3000 OR your Railway domain)
  // must be listed under "Authorized JavaScript origins" for that credential.
  //
  const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>`;

  // Called after Google credential popup completes successfully
  async function handleGoogleCredentialResponse(response) {
    const idToken = response.credential;
    // Mark ALL google buttons as loading (both login + signup panels)
    const allGoogleBtns = document.querySelectorAll(".btn-google");
    allGoogleBtns.forEach(b => { b.textContent = "Signing in…"; b.disabled = true; });

    try {
      const data = await AuthAPI.googleLogin({ idToken });
      localStorage.setItem("luxe_token", data.token);
      currentUser = data.user;
      const wlData = await WishlistAPI.get();
      wishlist = wlData.wishlist.map(p => String(p._id || p.id));
      updateAuthUI();
      closeAuthModal();
      showToast(`Welcome, ${data.user.firstName}! 👋`);
      if (data.user.isAdmin) {
        setTimeout(() => showToast("Admin access enabled — click your name for the dashboard."), 1500);
      }
    } catch (err) {
      showToast(err.message || "Google sign-in failed. Please try again.");
    } finally {
      // Restore both buttons with icon
      allGoogleBtns.forEach(b => {
        b.innerHTML = `${GOOGLE_SVG} Continue with Google`;
        b.disabled = false;
      });
    }
  }

  function setupGoogleButtons() {
    if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
      // No real client ID configured — show a helpful error on click instead of
      // silently doing nothing.
      document.querySelectorAll(".btn-google").forEach(btn => {
        btn.addEventListener("click", () => {
          showToast("Google sign-in: set GOOGLE_CLIENT_ID in js/main.js first.");
        });
      });
      return;
    }

    // Initialize the GSI library
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback:  handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "signin",
      // Use the popup flow so it works inside iframes / cross-origin tabs
      ux_mode: "popup",
    });

    // Wire up every .btn-google button to trigger the credential picker popup
    document.querySelectorAll(".btn-google").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // prompt() shows the One-Tap UI; for a guaranteed popup use requestCode flow
        // but credential callback works with prompt() on same origin.
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // One-Tap was suppressed (e.g. user previously dismissed it).
            // Fall back to the full account-picker popup via OAuth2 code flow.
            google.accounts.oauth2.initCodeClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: "openid email profile",
              ux_mode: "popup",
              callback: async (codeResponse) => {
                // Exchange code on your backend if needed, or use the id_token path.
                // For now, re-initialize and prompt — the account picker will appear.
                google.accounts.id.prompt();
              },
            }).requestCode();
          }
        });
      });
    });
  }

  function initGoogleSignIn() {
    if (typeof google !== "undefined" && google.accounts) {
      // GSI script already loaded (e.g. injected by another script on the page)
      setupGoogleButtons();
      return;
    }
    // Dynamically load the GSI client library, then set up buttons
    const script = document.createElement("script");
    script.src   = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = setupGoogleButtons;
    script.onerror = () => {
      console.warn("Failed to load Google Sign-In script. Check your network / CSP headers.");
    };
    document.head.appendChild(script);
  }

  initGoogleSignIn();
}

function openAuthModal(tab = "login") {
  document.getElementById("auth-modal").classList.add("open");
  document.body.style.overflow = "hidden";
  document.querySelectorAll(".modal-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.getElementById("login-panel").style.display  = tab === "login"  ? "block" : "none";
  document.getElementById("signup-panel").style.display = tab === "signup" ? "block" : "none";
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.remove("open");
  document.body.style.overflow = "";
}

function logoutUser() {
  currentUser = null;
  wishlist    = [];
  localStorage.removeItem("luxe_token");
  localStorage.removeItem("luxe_user");
  updateAuthUI();
  closeProfileModal();
  showToast("Logged out. See you soon!");
}

function showAuthErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add("show"); }
}
function clearAuthErr(errId, inputId) {
  const el = document.getElementById(errId); if (el) el.classList.remove("show");
  const inp = document.getElementById(inputId); if (inp) inp.classList.remove("error");
}

/* =============================================
   PROFILE MODAL
   ============================================= */
function openProfileModal(section = "overview") {
  if (!currentUser) { openAuthModal("login"); return; }
  const modal = document.getElementById("profile-modal");
  if (!modal) return;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  renderProfileSection(section);
}

function closeProfileModal() {
  const modal = document.getElementById("profile-modal");
  if (modal) { modal.classList.remove("open"); document.body.style.overflow = ""; }
}

function renderProfileSection(section) {
  // Highlight active nav
  document.querySelectorAll(".profile-nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.section === section);
  });

  const content = document.getElementById("profile-content");
  if (!content) return;

  switch (section) {
    case "overview":  renderProfileOverview(content); break;
    case "orders":    renderProfileOrders(content);   break;
    case "wishlist":  renderProfileWishlist(content); break;
    case "settings":  renderProfileSettings(content); break;
    case "admin":     renderAdminDashboard(content);  break;
    default:          renderProfileOverview(content);
  }
}

function renderProfileOverview(el) {
  const u = currentUser;
  el.innerHTML = `
    <div class="profile-section-title">Account Overview</div>
    <div class="profile-overview-grid">
      <div class="profile-info-card">
        <div class="profile-avatar-lg">${(u.firstName[0]+(u.lastName?.[0]||'')).toUpperCase()}</div>
        <div class="profile-name-block">
          <h3>${u.firstName} ${u.lastName}</h3>
          <p>${u.email}</p>
          ${u.phone ? `<p>${u.phone}</p>` : ""}
        </div>
      </div>
      <div class="profile-stats-row">
        <div class="profile-stat" onclick="renderProfileSection('orders')" style="cursor:pointer">
          <span class="stat-num" id="stat-orders">—</span>
          <span class="stat-label">Orders</span>
        </div>
        <div class="profile-stat" onclick="renderProfileSection('wishlist')" style="cursor:pointer">
          <span class="stat-num">${wishlist.length}</span>
          <span class="stat-label">Wishlist</span>
        </div>
      </div>
    </div>
    <div class="profile-address-block">
      <div class="profile-section-subtitle">Saved Address</div>
      ${u.address
        ? `<p>${u.address}${u.city ? ", " + u.city : ""}${u.pincode ? " — " + u.pincode : ""}</p>`
        : `<p class="profile-empty-hint">No address saved. Add one in <a href="#" onclick="renderProfileSection('settings'); return false;">Settings</a>.</p>`}
    </div>`;
  // Load order count
  OrdersAPI.myOrders().then(d => {
    const el2 = document.getElementById("stat-orders");
    if (el2) el2.textContent = d.orders.length;
  }).catch(() => {});
}

async function renderProfileOrders(el) {
  el.innerHTML = `<div class="profile-section-title">My Orders</div><div class="profile-loading">Loading…</div>`;
  try {
    const data = await OrdersAPI.myOrders();
    if (!data.orders.length) {
      el.innerHTML = `<div class="profile-section-title">My Orders</div>
        <div class="profile-empty"><p>No orders yet.</p><button class="btn-profile-action" onclick="closeProfileModal(); document.getElementById('products').scrollIntoView({behavior:'smooth'})">Shop Now →</button></div>`;
      return;
    }
    el.innerHTML = `<div class="profile-section-title">My Orders (${data.orders.length})</div>
      ${data.orders.map(o => orderCard(o)).join("")}`;
  } catch {
    el.innerHTML = `<div class="profile-section-title">My Orders</div><p class="profile-err">Could not load orders.</p>`;
  }
}

function orderCard(o) {
  const statusClass = {
    pending: "status-pending", confirmed: "status-confirmed",
    processing: "status-processing", shipped: "status-shipped",
    delivered: "status-delivered", cancelled: "status-cancelled",
  }[o.status] || "";

  const statusSteps = ["confirmed","processing","shipped","delivered"];
  const stepIdx = statusSteps.indexOf(o.status);

  const stepsHTML = o.status !== "cancelled" ? `
    <div class="order-tracker">
      ${statusSteps.map((s, i) => `
        <div class="tracker-step ${i <= stepIdx ? "done" : ""} ${i === stepIdx ? "current" : ""}">
          <div class="tracker-dot"></div>
          <span>${s.charAt(0).toUpperCase()+s.slice(1)}</span>
        </div>
        ${i < statusSteps.length-1 ? `<div class="tracker-line ${i < stepIdx ? "done" : ""}"></div>` : ""}
      `).join("")}
    </div>` : "";

  return `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <span class="order-num">#${o.orderNumber}</span>
          <span class="order-date">${new Date(o.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
        </div>
        <span class="order-status ${statusClass}">${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span>
      </div>
      ${stepsHTML}
      <div class="order-items-list">
        ${(o.items||[]).map(i => `
          <div class="order-item-row">
            <img src="${i.productImg || i.image}" alt="${i.name}" class="order-item-img" onerror="this.src='https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=60&h=60&fit=crop'"/>
            <span class="order-item-name">${i.name}</span>
            <span class="order-item-qty">× ${i.qty}</span>
            <span class="order-item-price">₹${(i.price*i.qty).toLocaleString("en-IN")}</span>
          </div>`).join("")}
      </div>
      <div class="order-card-foot">
        <span>Total</span>
        <strong>₹${o.total.toLocaleString("en-IN")}</strong>
        ${o.status !== "cancelled" ? `<button class="btn-invoice" onclick="downloadInvoice('${o._id||o.id}')">📄 Download Invoice</button>` : ""}
      </div>
    </div>`;
}

async function downloadInvoice(orderId) {
  try {
    const token = localStorage.getItem("luxe_token");
    const res = await fetch(`${window.location.origin}/api/invoice/${orderId}`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) throw new Error("Failed to generate invoice");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    showToast("Invoice downloaded!");
  } catch (err) {
    showToast("Failed to download invoice: " + err.message);
  }
}

async function renderProfileWishlist(el) {
  el.innerHTML = `<div class="profile-section-title">My Wishlist</div><div class="profile-loading">Loading…</div>`;
  try {
    const data = await WishlistAPI.get();
    wishlist = data.wishlist.map(p => String(p._id || p.id));
    if (!data.wishlist.length) {
      el.innerHTML = `<div class="profile-section-title">My Wishlist</div><div class="profile-empty"><p>Your wishlist is empty.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="profile-section-title">My Wishlist (${data.wishlist.length})</div>
      <div class="wishlist-grid">
        ${data.wishlist.map(p => `
          <div class="wishlist-item" id="wl-${String(p._id||p.id)}">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=200&h=160&fit=crop'"/>
            <div class="wishlist-info">
              <p class="wishlist-name">${p.name}</p>
              <p class="wishlist-price">₹${p.price.toLocaleString("en-IN")}</p>
              <div class="wishlist-actions">
                <button onclick="addToCart('${String(p._id||p.id)}'); closeProfileModal();" class="btn-wishlist-add">Add to Cart</button>
                <button onclick="removeWishlistItem('${String(p._id||p.id)}')" class="btn-wishlist-remove">Remove</button>
              </div>
            </div>
          </div>`).join("")}
      </div>`;
  } catch {
    el.innerHTML = `<div class="profile-section-title">My Wishlist</div><p class="profile-err">Could not load wishlist.</p>`;
  }
}

async function removeWishlistItem(id) {
  await WishlistAPI.toggle(id);
  wishlist = wishlist.filter(wid => wid !== id);
  const el = document.getElementById("wl-" + id);
  if (el) el.remove();
  renderProducts(filterByCategory(PRODUCTS, activeFilter));
}

function renderProfileSettings(el) {
  const u = currentUser;
  el.innerHTML = `
    <div class="profile-section-title">Account Settings</div>

    <div class="settings-block">
      <div class="settings-block-title">Personal Info</div>
      <form id="settings-profile-form" class="settings-form">
        <div class="settings-row">
          <div class="settings-group">
            <label>First Name</label>
            <input type="text" id="s-fname" value="${u.firstName || ""}" />
          </div>
          <div class="settings-group">
            <label>Last Name</label>
            <input type="text" id="s-lname" value="${u.lastName || ""}" />
          </div>
        </div>
        <div class="settings-group">
          <label>Phone Number</label>
          <input type="tel" id="s-phone" value="${u.phone || ""}" placeholder="+91 98765 43210"/>
        </div>
        <div class="settings-group">
          <label>Delivery Address</label>
          <textarea id="s-addr" rows="2" placeholder="House no, Street, Area">${u.address || ""}</textarea>
        </div>
        <div class="settings-row">
          <div class="settings-group">
            <label>City</label>
            <input type="text" id="s-city" value="${u.city || ""}" placeholder="Pune"/>
          </div>
          <div class="settings-group">
            <label>Pincode</label>
            <input type="text" id="s-pin" value="${u.pincode || ""}" placeholder="411001"/>
          </div>
        </div>
        <button type="submit" class="btn-settings-save">Save Changes</button>
        <span class="settings-msg" id="profile-save-msg"></span>
      </form>
    </div>

    <div class="settings-block">
      <div class="settings-block-title">Change Password</div>
      <form id="settings-pw-form" class="settings-form">
        <div class="settings-group">
          <label>Current Password</label>
          <input type="password" id="s-cur-pw" placeholder="••••••••"/>
        </div>
        <div class="settings-group">
          <label>New Password</label>
          <input type="password" id="s-new-pw" placeholder="Min. 6 characters"/>
        </div>
        <div class="settings-group">
          <label>Confirm New Password</label>
          <input type="password" id="s-confirm-pw" placeholder="••••••••"/>
        </div>
        <button type="submit" class="btn-settings-save">Update Password</button>
        <span class="settings-msg" id="pw-save-msg"></span>
      </form>
    </div>

    <div class="settings-block settings-danger">
      <div class="settings-block-title">Session</div>
      <button class="btn-logout-full" onclick="logoutUser()">Log Out</button>
    </div>`;

  document.getElementById("settings-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("profile-save-msg");
    msg.textContent = "Saving…";
    try {
      const data = await AuthAPI.updateProfile({
        firstName: document.getElementById("s-fname").value.trim(),
        lastName:  document.getElementById("s-lname").value.trim(),
        phone:     document.getElementById("s-phone").value.trim(),
        address:   document.getElementById("s-addr").value.trim(),
        city:      document.getElementById("s-city").value.trim(),
        pincode:   document.getElementById("s-pin").value.trim(),
      });
      currentUser = data.user;
      updateAuthUI();
      msg.textContent = "✓ Saved!"; msg.style.color = "var(--gold)";
      setTimeout(() => { msg.textContent = ""; }, 3000);
    } catch (err) {
      msg.textContent = err.message; msg.style.color = "#e74c3c";
    }
  });

  document.getElementById("settings-pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("pw-save-msg");
    const np  = document.getElementById("s-new-pw").value;
    const cp  = document.getElementById("s-confirm-pw").value;
    if (np !== cp) { msg.textContent = "Passwords don't match."; msg.style.color="#e74c3c"; return; }
    msg.textContent = "Updating…";
    try {
      await AuthAPI.changePassword({
        currentPassword: document.getElementById("s-cur-pw").value,
        newPassword: np,
      });
      msg.textContent = "✓ Password updated!"; msg.style.color="var(--gold)";
      document.getElementById("settings-pw-form").reset();
    } catch (err) {
      msg.textContent = err.message; msg.style.color="#e74c3c";
    }
  });
}

/* =============================================
   ADMIN DASHBOARD
   ============================================= */
async function renderAdminDashboard(el) {
  if (!currentUser?.isAdmin) {
    el.innerHTML = `<div class="profile-err">Admin access required.</div>`;
    return;
  }

  el.innerHTML = `<div class="profile-section-title">Admin Dashboard</div>
    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="stats">Overview</button>
      <button class="admin-tab" data-tab="orders">Orders</button>
      <button class="admin-tab" data-tab="users">Users</button>
      <button class="admin-tab" data-tab="products">Products</button>
    </div>
    <div id="admin-tab-content"><div class="profile-loading">Loading…</div></div>`;

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      loadAdminTab(tab.dataset.tab);
    });
  });

  loadAdminTab("stats");
}

async function loadAdminTab(tab) {
  const content = document.getElementById("admin-tab-content");
  content.innerHTML = `<div class="profile-loading">Loading…</div>`;
  try {
    if (tab === "stats")    await renderAdminStats(content);
    if (tab === "orders")   await renderAdminOrders(content);
    if (tab === "users")    await renderAdminUsers(content);
    if (tab === "products") await renderAdminProducts(content);
  } catch (err) {
    content.innerHTML = `<p class="profile-err">${err.message}</p>`;
  }
}

async function renderAdminStats(el) {
  const data = await UsersAPI.adminStats();
  const s    = data.stats;
  el.innerHTML = `
    <div class="admin-stats-grid">
      <div class="admin-stat-card"><div class="admin-stat-icon">👥</div><div class="admin-stat-num">${s.totalUsers}</div><div class="admin-stat-label">Total Users</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon">📦</div><div class="admin-stat-num">${s.totalOrders}</div><div class="admin-stat-label">Total Orders</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon">💰</div><div class="admin-stat-num">₹${parseInt(s.totalRevenue).toLocaleString("en-IN")}</div><div class="admin-stat-label">Revenue</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon">🛍️</div><div class="admin-stat-num">${s.totalProducts}</div><div class="admin-stat-label">Active Products</div></div>
    </div>
    <div class="admin-section-title">Recent Orders</div>
    <table class="admin-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        ${data.recentOrders.map(o => `
          <tr>
            <td>#${o.order_number}</td>
            <td>${o.first_name} ${o.last_name}<br/><small>${o.email}</small></td>
            <td>₹${o.total.toLocaleString("en-IN")}</td>
            <td><span class="order-status status-${o.status}">${o.status}</span></td>
            <td>${new Date(o.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

async function renderAdminOrders(el) {
  const data = await OrdersAPI.adminAll();
  el.innerHTML = `
    <div class="admin-section-title">All Orders (${data.orders.length})</div>
    <table class="admin-table">
      <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>
        ${data.orders.map(o => `
          <tr id="admin-order-row-${o._id||o.id}">
            <td>#${o.orderNumber}</td>
            <td>${o.userName}<br/><small>${o.userEmail}</small></td>
            <td>${(o.items||[]).length} item${(o.items||[]).length !== 1 ? "s" : ""}</td>
            <td>₹${o.total.toLocaleString("en-IN")}</td>
            <td>
              <select class="admin-status-select" onchange="updateOrderStatus('${o._id||o.id}', this.value)">
                ${["pending","confirmed","processing","shipped","delivered","cancelled"].map(s =>
                  `<option value="${s}" ${s===o.status?"selected":""}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
                ).join("")}
              </select>
            </td>
            <td>${new Date(o.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</td>
            <td><span class="order-status status-${o.status}" id="admin-order-badge-${o._id||o.id}">${o.status}</span></td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

async function updateOrderStatus(orderId, status) {
  try {
    await OrdersAPI.setStatus(orderId, status);
    const badge = document.getElementById("admin-order-badge-" + orderId);
    if (badge) {
      badge.className = `order-status status-${status}`;
      badge.textContent = status;
    }
    showToast(`Order status updated to "${status}"`);
  } catch (err) {
    showToast("Failed: " + err.message);
  }
}

async function renderAdminUsers(el) {
  const data = await UsersAPI.getAll();
  el.innerHTML = `
    <div class="admin-section-title">All Users (${data.users.length})</div>
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Joined</th></tr></thead>
      <tbody>
        ${data.users.map(u => `
          <tr>
            <td>${u.firstName} ${u.lastName}${u.isAdmin ? ' <span class="admin-badge">Admin</span>' : ""}</td>
            <td>${u.email}</td>
            <td>${u.phone || "—"}</td>
            <td><a href="#" onclick="showUserOrders('${u.id}','${u.firstName}'); return false;" class="admin-link">${u.totalOrders}</a></td>
            <td>₹${parseInt(u.totalSpent).toLocaleString("en-IN")}</td>
            <td>${new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div id="admin-user-orders-detail"></div>`;
}

async function showUserOrders(userId, name) {
  const detail = document.getElementById("admin-user-orders-detail");
  if (!detail) return;
  detail.innerHTML = `<div class="profile-loading">Loading ${name}'s orders…</div>`;
  try {
    const data = await UsersAPI.getOrders(userId);
    detail.innerHTML = `
      <div class="admin-section-title">${name}'s Orders</div>
      ${!data.orders.length ? "<p>No orders.</p>" : data.orders.map(o => orderCard(o)).join("")}`;
  } catch {
    detail.innerHTML = `<p class="profile-err">Failed to load.</p>`;
  }
}

async function renderAdminProducts(el) {
  const data = await ProductsAPI.adminGetAll();
  el.innerHTML = `
    <div class="admin-products-head">
      <div class="admin-section-title">Products (${data.products.length})</div>
      <button class="btn-admin-add" onclick="showAddProductForm()">+ Add Product</button>
    </div>
    <div id="add-product-form-wrap"></div>
    <table class="admin-table">
      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="admin-products-tbody">
        ${data.products.map(p => adminProductRow(p)).join("")}
      </tbody>
    </table>`;
}

function adminProductRow(p) {
  const pid = String(p._id||p.id);
  return `<tr id="admin-prod-row-${pid}">
    <td><img src="${p.image}" style="width:50px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.src='https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=50&h=40&fit=crop'"/></td>
    <td>${p.name}</td>
    <td>${p.category}</td>
    <td>₹${p.price.toLocaleString("en-IN")}${p.oldPrice ? ` <del style="color:var(--muted);font-size:12px">₹${p.oldPrice.toLocaleString("en-IN")}</del>` : ""}</td>
    <td>${p.stock}</td>
    <td><span class="${p.isActive ? "prod-active" : "prod-inactive"}">${p.isActive ? "Active" : "Hidden"}</span></td>
    <td>
      <button class="btn-admin-act" onclick="showEditProductForm('${pid}')">Edit</button>
      <button class="btn-admin-act btn-admin-del" onclick="deactivateProduct('${pid}')">${p.isActive ? "Hide" : "Show"}</button>
    </td>
  </tr>`;
}

function showAddProductForm() {
  document.getElementById("add-product-form-wrap").innerHTML = productForm(null);
}

async function showEditProductForm(id) {
  try {
    const data = await ProductsAPI.adminGetAll();
    const p = data.products.find(pr => String(pr._id||pr.id) === String(id));
    if (!p) { showToast("Product not found."); return; }
    document.getElementById("add-product-form-wrap").innerHTML = productForm(p);
  } catch { showToast("Could not load product."); }
}

function productForm(p) {
  const isEdit = !!p;
  return `
    <div class="add-product-form">
      <div class="admin-section-title">${isEdit ? "Edit" : "Add"} Product</div>
      <div class="settings-row">
        <div class="settings-group"><label>Name *</label><input id="pf-name" value="${isEdit ? p.name : ""}"/></div>
        <div class="settings-group"><label>Category *</label>
          <select id="pf-cat">
            ${["bags","accessories","footwear","apparel"].map(c => `<option ${(isEdit&&p.category===c)?"selected":""}>${c}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="settings-group">
        <label>Product Image *</label>
        <div class="image-upload-wrap">
          <input type="file" id="pf-img-file" accept="image/*" style="display:none" onchange="handleImageUpload(this)"/>
          <input type="text" id="pf-img" value="${isEdit ? p.image : ""}" placeholder="Or paste image URL" readonly/>
          <button type="button" class="btn-upload-img" onclick="document.getElementById('pf-img-file').click()">📁 Upload Image</button>
          <button type="button" class="btn-use-url" onclick="toggleImageUrlInput()">🔗 Use URL Instead</button>
          ${isEdit && p.image ? `<img src="${p.image}" class="pf-preview" alt="Current image"/>` : ""}
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-group"><label>Price (₹) *</label><input type="number" id="pf-price" value="${isEdit ? p.price : ""}"/></div>
        <div class="settings-group"><label>Old Price (₹)</label><input type="number" id="pf-oldprice" value="${isEdit && p.oldPrice ? p.oldPrice : ""}"/></div>
        <div class="settings-group"><label>Stock</label><input type="number" id="pf-stock" value="${isEdit ? p.stock : 100}"/></div>
      </div>
      <div class="settings-row">
        <div class="settings-group"><label>Badge</label>
          <select id="pf-badge">
            <option value="">None</option>
            ${["hot","sale","new"].map(b => `<option ${(isEdit&&p.badge===b)?"selected":""}>${b}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="pf-actions">
        <button class="btn-settings-save" onclick="${isEdit ? `saveEditProduct('${String(p._id||p.id)}')` : 'saveNewProduct()'}">${isEdit ? "Save Changes" : "Add Product"}</button>
        <button class="btn-pf-cancel" onclick="document.getElementById('add-product-form-wrap').innerHTML=''">Cancel</button>
        <span id="pf-msg" class="settings-msg"></span>
      </div>
    </div>`;
}

function toggleImageUrlInput() {
  const urlInput = document.getElementById("pf-img");
  const uploadBtn = document.querySelector(".btn-upload-img");
  const urlBtn = document.querySelector(".btn-use-url");
  if (urlInput.readOnly) {
    urlInput.readOnly = false;
    urlInput.placeholder = "Paste image URL";
    uploadBtn.style.display = "none";
    urlBtn.textContent = "📁 Upload Image Instead";
  } else {
    urlInput.readOnly = true;
    urlInput.placeholder = "Or paste image URL";
    uploadBtn.style.display = "inline-block";
    urlBtn.textContent = "🔗 Use URL Instead";
  }
}

async function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const msg = document.getElementById("pf-msg");
  msg.textContent = "Uploading image…";
  try {
    const formData = new FormData();
    formData.append("image", file);
    const token = localStorage.getItem("luxe_token");
    const res = await fetch(`${window.location.origin}/api/upload/image`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    document.getElementById("pf-img").value = data.url;
    const preview = document.querySelector(".pf-preview");
    if (preview) preview.src = data.url;
    else {
      const wrap = document.querySelector(".image-upload-wrap");
      const img = document.createElement("img");
      img.src = data.url;
      img.className = "pf-preview";
      img.alt = "Preview";
      wrap.appendChild(img);
    }
    msg.textContent = "✓ Image uploaded!";
    setTimeout(() => { msg.textContent = ""; }, 2000);
  } catch (err) {
    msg.textContent = "Upload failed: " + err.message;
    msg.style.color = "#e74c3c";
  }
}

function getProductFormData() {
  return {
    name:      document.getElementById("pf-name").value.trim(),
    category:  document.getElementById("pf-cat").value,
    image:     document.getElementById("pf-img").value.trim(),
    price:     parseInt(document.getElementById("pf-price").value) || 0,
    old_price: parseInt(document.getElementById("pf-oldprice").value) || null,
    stock:     parseInt(document.getElementById("pf-stock").value) || 100,
    badge:     document.getElementById("pf-badge").value || null,
  };
}

async function saveNewProduct() {
  const msg = document.getElementById("pf-msg");
  msg.textContent = "Saving…";
  try {
    const d = getProductFormData();
    if (!d.name || !d.image || !d.price) { msg.textContent = "Fill all required fields."; return; }
    const data = await ProductsAPI.create(d);
    const tbody = document.getElementById("admin-products-tbody");
    if (tbody) tbody.insertAdjacentHTML("afterbegin", adminProductRow(data.product));
    document.getElementById("add-product-form-wrap").innerHTML = "";
    await loadProducts();
    showToast("Product added!");
  } catch (err) { msg.textContent = err.message; }
}

async function saveEditProduct(id) {
  const msg = document.getElementById("pf-msg");
  msg.textContent = "Saving…";
  try {
    const d = getProductFormData();
    d.isActive = true;
    const data = await ProductsAPI.update(id, d);
    const row = document.getElementById("admin-prod-row-" + id);
    if (row) row.outerHTML = adminProductRow(data.product);
    document.getElementById("add-product-form-wrap").innerHTML = "";
    await loadProducts();
    showToast("Product updated!");
  } catch (err) { msg.textContent = err.message; }
}

async function deactivateProduct(id) {
  try {
    await ProductsAPI.remove(id);
    await loadProducts();
    const row = document.getElementById("admin-prod-row-" + id);
    if (row) row.remove();
    showToast("Product hidden from store.");
  } catch (err) { showToast("Error: " + err.message); }
}

/* =============================================
   SEARCH
   ============================================= */
function initSearch() {
  const searchToggle = document.getElementById("search-toggle");
  const searchBar    = document.getElementById("search-bar");
  const searchClose  = document.getElementById("search-close");
  const searchInput  = document.getElementById("search-input");

  searchToggle.addEventListener("click", () => {
    searchBar.classList.toggle("open");
    if (searchBar.classList.contains("open")) searchInput.focus();
  });
  searchClose.addEventListener("click", () => {
    searchBar.classList.remove("open");
    searchInput.value = "";
    renderProducts(filterByCategory(PRODUCTS, activeFilter));
  });
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) { renderProducts(filterByCategory(PRODUCTS, activeFilter)); return; }
    renderProducts(PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
  });
}

/* =============================================
   CART
   ============================================= */
function initCart() {
  document.getElementById("cart-toggle").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-overlay").addEventListener("click", closeCart);
  document.getElementById("clear-cart").addEventListener("click", clearCart);
  const checkoutBtn = document.getElementById("checkout-btn");
  const shopNowBtn  = document.getElementById("shop-now-btn");
  checkoutBtn && checkoutBtn.addEventListener("click", handleCheckout);
  shopNowBtn  && shopNowBtn.addEventListener("click", () => {
    closeCart();
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  });
}

function handleCheckout() {
  if (!currentUser) { closeCart(); showToast("Please log in to checkout 🔐"); setTimeout(() => openAuthModal("login"), 400); return; }
  closeCart();
  openPayModal();
}

function openCart() {
  document.getElementById("cart-sidebar").classList.add("open");
  document.getElementById("cart-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  document.getElementById("cart-sidebar").classList.remove("open");
  document.getElementById("cart-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1 });
  saveCart();
  updateCartUI();
  showToast(`"${product.name}" added to cart 🛒`);
  openCart();
}
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); saveCart(); updateCartUI(); }
function changeQty(id, d) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) removeFromCart(id); else { saveCart(); updateCartUI(); }
}
function clearCart() { cart = []; saveCart(); updateCartUI(); showToast("Cart cleared."); }
function saveCart() { localStorage.setItem("luxe_cart", JSON.stringify(cart)); }

function updateCartUI() {
  const cartItems   = document.getElementById("cart-items");
  const cartEmpty   = document.getElementById("cart-empty");
  const cartFooter  = document.getElementById("cart-footer");
  const cartCount   = document.getElementById("cart-count");
  const cartSubtotal= document.getElementById("cart-subtotal");
  const cartTotal   = document.getElementById("cart-total");

  const totalQty = cart.reduce((s,i) => s+i.qty, 0);
  const subtotal = cart.reduce((s,i) => s+i.price*i.qty, 0);
  cartCount.textContent = totalQty;

  if (!cart.length) {
    cartEmpty.style.display = "block"; cartFooter.style.display = "none";
    cartItems.querySelectorAll(".cart-item").forEach(el => el.remove());
  } else {
    cartEmpty.style.display = "none"; cartFooter.style.display = "flex";
    cartSubtotal.textContent = "₹"+subtotal.toLocaleString("en-IN");
    cartTotal.textContent    = "₹"+subtotal.toLocaleString("en-IN");
    cartItems.querySelectorAll(".cart-item").forEach(el => el.remove());
    cart.forEach(item => {
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <div class="cart-item-img"><img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=80&h=80&fit=crop'"/></div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price.toLocaleString("en-IN")}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Remove</button>`;
      cartItems.appendChild(div);
    });
  }
}

/* =============================================
   PAYMENT MODAL
   ============================================= */
function initPayModal() {
  const overlay     = document.getElementById("pay-modal");
  const closeBtn    = document.getElementById("pay-modal-close");
  const methodTabs  = document.querySelectorAll(".pay-method-tab");
  const payBtn      = document.getElementById("btn-pay-now");

  closeBtn.addEventListener("click", closePayModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closePayModal(); });

  methodTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      methodTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const method = tab.dataset.method;
      document.querySelectorAll(".pay-card-fields, .pay-upi-field, .pay-netbank-field").forEach(f => f.classList.remove("active"));
      if (method === "card")    document.getElementById("pay-card-fields").classList.add("active");
      if (method === "upi")     document.getElementById("pay-upi-field").classList.add("active");
      if (method === "netbank") document.getElementById("pay-netbank-field").classList.add("active");
    });
  });

  document.querySelectorAll(".upi-app-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".upi-app-btn").forEach(b => b.style.borderColor = "var(--border)");
      btn.style.borderColor = "var(--gold)";
      document.getElementById("upi-id-input").value = btn.dataset.app + "@upi";
    });
  });

  payBtn.addEventListener("click", processDemoPayment);
}

function openPayModal() {
  buildPayOrderSummary();
  document.getElementById("pay-modal").classList.add("open");
  document.body.style.overflow = "hidden";
  document.getElementById("pay-success-screen").classList.remove("show");
  document.getElementById("pay-main-content").style.display = "block";
  document.querySelector(".pay-method-tab[data-method='card']").click();
}
function closePayModal() {
  document.getElementById("pay-modal").classList.remove("open");
  document.body.style.overflow = "";
}

function buildPayOrderSummary() {
  const container = document.getElementById("pay-order-items");
  container.innerHTML = "";
  const subtotal = cart.reduce((s,i) => s+i.price*i.qty, 0);
  cart.forEach(item => {
    const row = document.createElement("div");
    row.className = "pay-order-item";
    row.innerHTML = `<span>${item.name} × ${item.qty}</span><span>₹${(item.price*item.qty).toLocaleString("en-IN")}</span>`;
    container.appendChild(row);
  });
  document.getElementById("pay-total-amount").textContent = "₹"+subtotal.toLocaleString("en-IN");
  document.getElementById("btn-pay-now").textContent = `Pay ₹${subtotal.toLocaleString("en-IN")}`;
}

async function processDemoPayment() {
  const btn = document.getElementById("btn-pay-now");
  btn.textContent = "Processing…"; btn.style.opacity = "0.7"; btn.disabled = true;

  // Determine payment method from active tab
  const activeTab = document.querySelector(".pay-method-tab.active");
  const paymentMethod = activeTab ? activeTab.dataset.method : "card";

  setTimeout(async () => {
    try {
      // Place real order in backend
      const orderData = await OrdersAPI.place({
        items: cart.map(i => ({ id: i.id, name: i.name, image: i.image, price: i.price, qty: i.qty })),
        paymentMethod,
        shippingName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : null,
        shippingAddr: currentUser?.address || null,
      });
      document.getElementById("pay-order-id").textContent     = "Order ID: " + orderData.order.orderNumber;
      document.getElementById("pay-confirmed-amount").textContent = "₹"+orderData.order.total.toLocaleString("en-IN")+" paid successfully";
    } catch {
      // Fallback to demo order ID if backend not available
      const orderId = "LX" + Date.now().toString().slice(-9).toUpperCase();
      document.getElementById("pay-order-id").textContent     = "Order ID: " + orderId;
      const subtotal = cart.reduce((s,i) => s+i.price*i.qty, 0);
      document.getElementById("pay-confirmed-amount").textContent = "₹"+subtotal.toLocaleString("en-IN")+" paid successfully";
    }

    document.getElementById("pay-main-content").style.display = "none";
    document.getElementById("pay-success-screen").classList.add("show");
    cart = []; saveCart(); updateCartUI();

    btn.textContent = "Pay Now"; btn.style.opacity = "1"; btn.disabled = false;
    showToast("Payment successful! 🎉 Order confirmed.");
  }, 2200);
}

/* =============================================
   PRODUCTS RENDER & FILTER
   ============================================= */
function initFilterTabs() {
  const tabs = document.querySelectorAll(".filter-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.dataset.filter;
      renderProducts(filterByCategory(PRODUCTS, activeFilter));
    });
  });
}

function filterByCategory(products, category) {
  if (category === "all") return products;
  return products.filter(p => p.category === category);
}

function renderProducts(products) {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = "";
  if (!products.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:48px 0;">No products found.</p>`;
    return;
  }
  products.forEach(product => {
    const isWishlisted = wishlist.includes(product.id);
    const badgeHTML = product.badge ? `<span class="product-badge badge-${product.badge}">${product.badge}</span>` : "";
    const oldPriceHTML = product.oldPrice ? `<span class="product-old-price">₹${product.oldPrice.toLocaleString("en-IN")}</span>` : "";
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.category = product.category;
    card.innerHTML = `
      ${badgeHTML}
      <button class="product-wishlist ${isWishlisted?"active":""}" onclick="toggleWishlist('${product.id}', this)">
        ${isWishlisted?"❤️":"🤍"}
      </button>
      <div class="product-thumb">
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400&h=300&fit=crop'"/>
      </div>
      <div class="product-body">
        <p class="product-category">${product.category}</p>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">
          <span class="stars-small">${"★".repeat(Math.floor(product.rating))}${"☆".repeat(5-Math.floor(product.rating))}</span>
          <span class="rating-count">(${product.reviews})</span>
        </div>
        <div class="product-price-row">
          <div><span class="product-price">₹${product.price.toLocaleString("en-IN")}</span>${oldPriceHTML}</div>
          <button class="add-to-cart" onclick="addToCart('${product.id}')">+ Add</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

async function toggleWishlist(productId, btn) {
  if (!currentUser) { showToast("Log in to save to wishlist ❤️"); openAuthModal("login"); return; }
  try {
    const data = await WishlistAPI.toggle(productId);
    if (data.action === "added") {
      wishlist.push(productId); btn.classList.add("active"); btn.textContent = "❤️";
      showToast("Added to wishlist ❤️");
    } else {
      wishlist = wishlist.filter(id => id !== productId); btn.classList.remove("active"); btn.textContent = "🤍";
      showToast("Removed from wishlist");
    }
  } catch { showToast("Log in to use wishlist"); }
}

/* =============================================
   NEWSLETTER
   ============================================= */
function initNewsletterForm() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    const name  = document.getElementById("nl-name");
    const email = document.getElementById("nl-email");
    const agree = document.getElementById("nl-agree");
    if (name.value.trim().length < 2) { name.classList.add("error"); document.getElementById("nl-name-err").classList.add("show"); valid=false; } else { name.classList.remove("error"); document.getElementById("nl-name-err").classList.remove("show"); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { email.classList.add("error"); document.getElementById("nl-email-err").classList.add("show"); valid=false; } else { email.classList.remove("error"); document.getElementById("nl-email-err").classList.remove("show"); }
    if (!agree.checked) { document.getElementById("nl-agree-err").classList.add("show"); valid=false; } else document.getElementById("nl-agree-err").classList.remove("show");
    if (valid) { form.reset(); document.getElementById("nl-success").classList.add("show"); setTimeout(() => document.getElementById("nl-success").classList.remove("show"), 6000); }
  });
}

/* =============================================
   TOAST
   ============================================= */
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg; toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

/* =============================================
   SCROLL ANIMATIONS
   ============================================= */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.opacity="1"; e.target.style.transform="translateY(0)"; }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".feat-card,.testimonial-card,.strip-item,.product-card").forEach(el => {
    el.style.opacity="0"; el.style.transform="translateY(24px)"; el.style.transition="opacity 0.5s ease,transform 0.5s ease";
    observer.observe(el);
  });
}
