// =============================================
//  LUXE STORE — API Service
//  js/api.js
// =============================================

const API_BASE = window.location.origin + "/api";

// Get stored JWT token
function getToken() {
  return localStorage.getItem("luxe_token");
}

// Build headers with auth
function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
}

// Generic request wrapper
async function apiRequest(method, path, body = null) {
  const opts = { method, headers: authHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---- AUTH ----
const AuthAPI = {
  register: (d)  => apiRequest("POST", "/auth/register", d),
  login:    (d)  => apiRequest("POST", "/auth/login",    d),
  googleLogin: (d) => apiRequest("POST", "/auth/google", d),
  me:       ()   => apiRequest("GET",  "/auth/me"),
  updateProfile:  (d) => apiRequest("PUT",  "/auth/profile",         d),
  changePassword: (d) => apiRequest("PUT",  "/auth/change-password", d),
};

// ---- PRODUCTS ----
const ProductsAPI = {
  getAll:    (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest("GET", "/products" + (qs ? "?" + qs : ""));
  },
  adminGetAll: () => apiRequest("GET",    "/products/admin/all"),
  create:      (d) => apiRequest("POST",   "/products",       d),
  update:      (id, d) => apiRequest("PUT", "/products/" + id, d),
  remove:      (id)    => apiRequest("DELETE", "/products/" + id),
};

// ---- ORDERS ----
const OrdersAPI = {
  place:     (d)  => apiRequest("POST", "/orders",        d),
  myOrders:  ()   => apiRequest("GET",  "/orders"),
  getOne:    (id) => apiRequest("GET",  "/orders/" + id),
  adminAll:  ()   => apiRequest("GET",  "/orders/admin/all"),
  setStatus: (id, status) => apiRequest("PUT", `/orders/admin/${id}/status`, { status }),
};

// ---- USERS (admin) ----
const UsersAPI = {
  getAll:     ()   => apiRequest("GET", "/users"),
  getOrders:  (id) => apiRequest("GET", "/users/" + id + "/orders"),
  adminStats: ()   => apiRequest("GET", "/users/admin/stats"),
};

// ---- WISHLIST ----
const WishlistAPI = {
  get:    ()   => apiRequest("GET",  "/wishlist"),
  toggle: (id) => apiRequest("POST", "/wishlist/" + id),
};
