// =============================================
//  LUXE STORE — Product Data (Fallback)
//  js/products.js
//  Note: live data is loaded from /api/products
//  This array is used only if the API is unavailable.
// =============================================

const PRODUCTS_FALLBACK = [
  { id: 1,  name: "Classic Leather Tote",         category: "bags",        image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=300&fit=crop",       price: 2499, oldPrice: 3200, rating: 4.8, reviews: 124, badge: "hot"  },
  { id: 2,  name: "Mini Crossbody Bag",            category: "bags",        image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=300&fit=crop",       price: 1599, oldPrice: 2000, rating: 4.8, reviews:  98, badge: "sale" },
  { id: 3,  name: "Quilted Shoulder Bag",          category: "bags",        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=300&fit=crop",       price: 3199, oldPrice: null, rating: 4.7, reviews:  61, badge: "new"  },
  { id: 4,  name: "Structured Top Handle",         category: "bags",        image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&h=300&fit=crop",       price: 4299, oldPrice: 5500, rating: 4.9, reviews:  43, badge: "hot"  },
  { id: 5,  name: "Canvas Weekend Bag",            category: "bags",        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",       price: 1999, oldPrice: null, rating: 4.5, reviews:  77, badge: null  },
  { id: 6,  name: "Gold Chain Bracelet",           category: "accessories", image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&h=300&fit=crop",       price:  899, oldPrice: null, rating: 4.9, reviews:  87, badge: "new"  },
  { id: 7,  name: "Pearl Drop Earrings",           category: "accessories", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=300&fit=crop",       price:  649, oldPrice: null, rating: 5.0, reviews: 210, badge: "hot"  },
  { id: 8,  name: "Layered Gold Necklace",         category: "accessories", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=300&fit=crop",       price: 1199, oldPrice: 1600, rating: 4.8, reviews: 134, badge: "sale" },
  { id: 9,  name: "Tortoise Shell Sunglasses",     category: "accessories", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop",       price:  799, oldPrice: null, rating: 4.6, reviews:  95, badge: null  },
  { id: 10, name: "Leather Belt — Tan",            category: "accessories", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop&q=80",    price:  549, oldPrice:  750, rating: 4.7, reviews:  58, badge: "sale" },
  { id: 11, name: "Suede Ankle Boots",             category: "footwear",    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=300&fit=crop",       price: 3299, oldPrice: 4500, rating: 4.7, reviews:  63, badge: "sale" },
  { id: 12, name: "White Leather Sneakers",        category: "footwear",    image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=300&fit=crop",       price: 2199, oldPrice: null, rating: 4.5, reviews: 156, badge: null  },
  { id: 13, name: "Block Heel Mules",              category: "footwear",    image: "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=400&h=300&fit=crop",       price: 1899, oldPrice: 2400, rating: 4.6, reviews:  84, badge: "new"  },
  { id: 14, name: "Strappy Heeled Sandals",        category: "footwear",    image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=300&fit=crop",       price: 2599, oldPrice: null, rating: 4.8, reviews:  49, badge: "hot"  },
  { id: 15, name: "Chunky Platform Loafers",       category: "footwear",    image: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&h=300&fit=crop",       price: 3499, oldPrice: 4200, rating: 4.7, reviews:  37, badge: "new"  },
  { id: 16, name: "Silk Wrap Dress",               category: "apparel",     image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=300&fit=crop",       price: 1899, oldPrice: null, rating: 4.6, reviews:  45, badge: "new"  },
  { id: 17, name: "Linen Oversized Blazer",        category: "apparel",     image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop",       price: 2899, oldPrice: 3500, rating: 4.7, reviews:  72, badge: "sale" },
  { id: 18, name: "Cashmere Turtleneck",           category: "apparel",     image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=300&fit=crop",       price: 2199, oldPrice: null, rating: 4.8, reviews:  93, badge: "hot"  },
  { id: 19, name: "High-Waist Tailored Trousers",  category: "apparel",     image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=400&h=300&fit=crop",       price: 1699, oldPrice: 2200, rating: 4.5, reviews:  61, badge: "sale" },
  { id: 20, name: "Cropped Leather Jacket",        category: "apparel",     image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop",       price: 5499, oldPrice: 6800, rating: 4.9, reviews:  28, badge: "hot"  },
];

// Will be populated from API on page load
let PRODUCTS = [...PRODUCTS_FALLBACK];
