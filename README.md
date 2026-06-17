# Luxe Store — Full Stack (MongoDB)

Premium e-commerce with Node.js/Express + MongoDB (Mongoose), JWT auth, admin dashboard, order tracking, and user profiles.

---

## Project Structure

```
luxe-backend/
├── server.js                ← Express entry point (connects MongoDB, seeds, starts)
├── .env.example             ← Copy to .env and set MONGO_URI + JWT_SECRET
├── package.json
├── db/
│   ├── db.js                ← Mongoose connect()
│   └── seed.js              ← Auto-seeds 20 products + admin user on first run
├── models/
│   ├── User.js              ← firstName, lastName, email, password (hashed), isAdmin
│   ├── Product.js           ← name, category, image, price, oldPrice, badge, stock, isActive
│   ├── Order.js             ← user ref, items[], status, orderNumber, total
│   └── Wishlist.js          ← user + product refs (unique pair per user)
├── middleware/
│   └── auth.js              ← JWT verify (authMiddleware + adminMiddleware)
├── routes/
│   ├── auth.js              ← Register, login, /me, update profile, change password
│   ├── products.js          ← Public listing + admin CRUD
│   ├── orders.js            ← Place order, my orders, admin manage + update status
│   ├── users.js             ← Admin: list all users, stats, view user orders
│   └── wishlist.js          ← Toggle wishlist items per user
└── public/                  ← Frontend (served as static files by Express)
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js            ← All fetch() wrappers (AuthAPI, ProductsAPI, etc.)
        ├── products.js       ← Fallback PRODUCTS_FALLBACK array
        └── main.js           ← All UI logic wired to the API
```

---

## Quick Start

### Step 1 — Install MongoDB
- **Windows**: https://www.mongodb.com/try/download/community → Install → Start the MongoDB service
- **Or use MongoDB Atlas (cloud)**: free tier at https://cloud.mongodb.com

### Step 2 — Configure .env
```bash
cp .env.example .env
```
Edit `.env`:
```
# Local MongoDB (default, no changes needed if MongoDB is running locally)
MONGO_URI=mongodb://127.0.0.1:27017/luxe_store

# MongoDB Atlas (replace with your connection string)
# MONGO_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/luxe_store

JWT_SECRET=change_this_to_a_long_random_secret
PORT=3000
```

### Step 3 — Install Dependencies
```bash
npm install
```

### Step 4 — Start the Server
```bash
node server.js
```

**On first run**, the server automatically:
- Connects to MongoDB
- Seeds all 20 products into the `products` collection
- Creates the admin account

Open **http://localhost:3000** — your full Luxe Store is live!

---

## Login Credentials

| Role  | Email           | Password   |
|-------|-----------------|------------|
| Admin | admin@luxe.in   | Admin@123  |
| User  | Register freely | your choice |

---

## All API Endpoints

### Auth
| Method | Path                      | Auth?  | Description            |
|--------|---------------------------|--------|------------------------|
| POST   | /api/auth/register        | No     | Create account         |
| POST   | /api/auth/login           | No     | Login → JWT token      |
| GET    | /api/auth/me              | ✅ JWT | Get my profile         |
| PUT    | /api/auth/profile         | ✅ JWT | Update name/address    |
| PUT    | /api/auth/change-password | ✅ JWT | Change password        |

### Products
| Method | Path                      | Auth?   | Description             |
|--------|---------------------------|---------|-------------------------|
| GET    | /api/products             | No      | List active products    |
| GET    | /api/products/:id         | No      | Single product          |
| GET    | /api/products/admin/all   | 🛡 Admin | All incl. hidden        |
| POST   | /api/products             | 🛡 Admin | Add product             |
| PUT    | /api/products/:id         | 🛡 Admin | Edit product            |
| DELETE | /api/products/:id         | 🛡 Admin | Soft-hide product       |

### Orders
| Method | Path                         | Auth?   | Description             |
|--------|------------------------------|---------|-------------------------|
| POST   | /api/orders                  | ✅ JWT  | Place order (cart)      |
| GET    | /api/orders                  | ✅ JWT  | My order history        |
| GET    | /api/orders/:id              | ✅ JWT  | Single order            |
| GET    | /api/orders/admin/all        | 🛡 Admin | All orders + user info  |
| PUT    | /api/orders/admin/:id/status | 🛡 Admin | Update order status     |

### Users (Admin)
| Method | Path                    | Auth?   | Description                |
|--------|-------------------------|---------|----------------------------|
| GET    | /api/users              | 🛡 Admin | All users + order stats    |
| GET    | /api/users/:id/orders   | 🛡 Admin | A user's order history     |
| GET    | /api/users/admin/stats  | 🛡 Admin | Dashboard numbers          |

### Wishlist
| Method | Path                      | Auth?  | Description           |
|--------|---------------------------|--------|-----------------------|
| GET    | /api/wishlist             | ✅ JWT | My wishlist items     |
| POST   | /api/wishlist/:productId  | ✅ JWT | Toggle add/remove     |

---

## Features

### User (click your name in the navbar)
- **Overview** — name, email, total orders, wishlist count, saved address
- **My Orders** — full order history with live tracker (Confirmed → Processing → Shipped → Delivered)
- **Wishlist** — saved items, add to cart, or remove
- **Settings** — update name, phone, address, city, pincode; change password; logout

### Admin (login as admin@luxe.in)
Click your name → **Admin Panel** tab appears:
- **Overview** — 4 stat cards (users, orders, revenue, products) + last 5 orders table
- **Orders** — all orders across all users, dropdown to change status (confirmed/processing/shipped/delivered/cancelled)
- **Users** — every registered user, order count, total spend; click order count to expand their full history
- **Products** — add new products, edit name/price/image/badge/stock, hide/show from storefront

### Fixed Issues
- **Broken image** (High-Waist Tailored Trousers #19): fixed Unsplash URL with clean crop params
- All product images have `onerror` fallback so broken CDN URLs never break the layout

---

## Deploy to Railway

1. Push this folder to GitHub
2. New Railway project → Deploy from GitHub repo
3. Add **MongoDB** plugin (Railway provides MongoDB), or use **MongoDB Atlas** free tier
4. Set environment variables: `MONGO_URI`, `JWT_SECRET`, `PORT`
5. Deploy — no SQL setup needed, the seeder runs automatically on first boot

---

Built by **Pranav Medhe** | SaiKet Systems Internship
