// =========================================
// SXC SHOP - APPLICATION LOGIC
// =========================================

// Admin Emails Configuration
const ADMIN_EMAILS = [
  // Add your admin email here
  "admin@example.com"
];

// State
let cart = [];
let products = [];
let categories = [];
let currentUser = null;
let isAdmin = false;

// DOM Elements
const cartBtn = document.getElementById('cartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const googleSignIn = document.getElementById('googleSignIn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');
const closeMobileNav = document.getElementById('closeMobileNav');
const overlay = document.getElementById('overlay');
const adminBtn = document.getElementById('adminBtn');
const mobileAdminBtn = document.getElementById('mobileAdminBtn');
const mobileAuthBtn = document.getElementById('mobileAuthBtn');
const productsGrid = document.getElementById('productsGrid');
const categoriesGrid = document.getElementById('categoriesGrid');
const toastContainer = document.getElementById('toastContainer');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  loadProducts();
  loadCategories();
  loadCart();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  // Cart
  cartBtn.addEventListener('click', toggleCart);
  closeCart.addEventListener('click', toggleCart);
  
  // Auth
  authBtn.addEventListener('click', toggleAuthModal);
  closeAuthModal.addEventListener('click', toggleAuthModal);
  googleSignIn.addEventListener('click', handleGoogleSignIn);
  mobileAuthBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthModal();
  });
  
  // Mobile Nav
  mobileMenuBtn.addEventListener('click', toggleMobileNav);
  closeMobileNav.addEventListener('click', toggleMobileNav);
  overlay.addEventListener('click', () => {
    toggleMobileNav();
    toggleCart();
    toggleAuthModal();
  });
  
  // Checkout
  checkoutBtn.addEventListener('click', handleCheckout);
}

// Cart Functions
function toggleCart() {
  cartSidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

function loadCart() {
  const savedCart = localStorage.getItem('sxc_cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartUI();
  }
}

function addToCart(product) {
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      ...product,
      quantity: 1
    });
  }
  
  saveCart();
  updateCartUI();
  showToast('Product added to cart', 'success');
  toggleCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
}

function updateQuantity(productId, change) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    saveCart();
    updateCartUI();
  }
}

function saveCart() {
  localStorage.setItem('sxc_cart', JSON.stringify(cart));
}

function updateCartUI() {
  // Update count
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  
  // Update items
  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-state">
        <i data-lucide="shopping-cart" class="empty-icon" width="64" height="64"></i>
        <p>Your cart is empty</p>
        <button class="btn btn-primary mt-4" onclick="toggleCart()">Continue Shopping</button>
      </div>
    `;
    lucide.createIcons();
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.name}</h4>
          <p class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</p>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">
              <i data-lucide="minus" width="14" height="14"></i>
            </button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">
              <i data-lucide="plus" width="14" height="14"></i>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="removeFromCart('${item.id}')" style="margin-left: auto;">
              <i data-lucide="trash-2" width="16" height="16"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }
  
  // Update totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartTotal.textContent = `$${subtotal.toFixed(2)}`;
}

// Product Functions
async function loadProducts() {
  try {
    // Try to load from Firebase
    if (typeof db !== 'undefined') {
      const snapshot = await db.collection('products').get();
      products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
    } else {
      // Fallback demo products
      products = [
        {
          id: '1',
          name: 'Premium Wireless Headphones',
          price: 199.99,
          originalPrice: 249.99,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          rating: 4.8,
          reviews: 124
        },
        {
          id: '2',
          name: 'Smart Watch Pro',
          price: 299.99,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
          rating: 4.6,
          reviews: 89
        },
        {
          id: '3',
          name: 'Minimalist Backpack',
          price: 79.99,
          originalPrice: 99.99,
          category: 'Accessories',
          image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
          rating: 4.9,
          reviews: 256
        },
        {
          id: '4',
          name: 'Organic Cotton T-Shirt',
          price: 39.99,
          category: 'Clothing',
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
          rating: 4.5,
          reviews: 67
        }
      ];
    }
    
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    // Show demo products on error
    renderProducts();
  }
}

function renderProducts() {
  if (products.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="package" class="empty-icon" width="64" height="64"></i>
        <p>No products available</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }
  
  productsGrid.innerHTML = products.map(product => `
    <div class="product-card">
      <div class="product-image-wrapper">
        <img src="${product.image || 'https://via.placeholder.com/400'}" alt="${product.name}" class="product-image" loading="lazy">
        ${product.originalPrice ? `
          <span class="badge badge-error product-badge">Sale</span>
        ` : ''}
        <div class="product-actions">
          <button class="action-btn" aria-label="Add to wishlist">
            <i data-lucide="heart" width="18" height="18"></i>
          </button>
          <button class="action-btn" onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})" aria-label="Add to cart">
            <i data-lucide="shopping-cart" width="18" height="18"></i>
          </button>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category || 'General'}</span>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">
          <span class="price-current">$${product.price.toFixed(2)}</span>
          ${product.originalPrice ? `
            <span class="price-original">$${product.originalPrice.toFixed(2)}</span>
          ` : ''}
        </div>
        ${product.rating ? `
          <div class="product-rating">
            ${renderStars(product.rating)}
            <span>(${product.reviews || 0})</span>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  lucide.createIcons();
}

function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars += '<i data-lucide="star" class="star-filled" width="14" height="14" fill="#FBBF24"></i>';
    } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
      stars += '<i data-lucide="star-half" class="star-filled" width="14" height="14" fill="#FBBF24"></i>';
    } else {
      stars += '<i data-lucide="star" width="14" height="14"></i>';
    }
  }
  return stars;
}

// Category Functions
async function loadCategories() {
  try {
    if (typeof db !== 'undefined') {
      const snapshot = await db.collection('categories').get();
      categories = [];
      snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
      });
    } else {
      categories = [
        { id: '1', name: 'Electronics', icon: 'cpu' },
        { id: '2', name: 'Clothing', icon: 'shirt' },
        { id: '3', name: 'Accessories', icon: 'watch' },
        { id: '4', name: 'Home', icon: 'home' }
      ];
    }
    
    renderCategories();
  } catch (error) {
    console.error('Error loading categories:', error);
    renderCategories();
  }
}

function renderCategories() {
  if (categories.length === 0) return;
  
  categoriesGrid.innerHTML = categories.map(cat => `
    <div class="category-card">
      <i data-lucide="${cat.icon || 'tag'}" class="category-icon" width="32" height="32"></i>
      <h3 class="category-name">${cat.name}</h3>
    </div>
  `).join('');
  
  lucide.createIcons();
}

// Auth Functions
function initAuth() {
  // Check if user is logged in
  const savedUser = localStorage.getItem('sxc_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    checkAdminStatus(currentUser.email);
    updateAuthUI();
  }
}

function toggleAuthModal() {
  authModal.classList.toggle('open');
  overlay.classList.toggle('open');
}

async function handleGoogleSignIn() {
  if (typeof auth === 'undefined') {
    // Demo login
    currentUser = {
      email: 'demo@example.com',
      name: 'Demo User',
      photo: null
    };
    localStorage.setItem('sxc_user', JSON.stringify(currentUser));
    checkAdminStatus(currentUser.email);
    updateAuthUI();
    toggleAuthModal();
    showToast('Welcome back!', 'success');
    return;
  }
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    currentUser = {
      email: result.user.email,
      name: result.user.displayName,
      photo: result.user.photoURL
    };
    localStorage.setItem('sxc_user', JSON.stringify(currentUser));
    checkAdminStatus(currentUser.email);
    updateAuthUI();
    toggleAuthModal();
    showToast('Welcome back!', 'success');
  } catch (error) {
    console.error('Sign in error:', error);
    showToast('Failed to sign in', 'error');
  }
}

function checkAdminStatus(email) {
  isAdmin = ADMIN_EMAILS.includes(email);
  
  if (isAdmin) {
    adminBtn.classList.remove('hidden');
    mobileAdminBtn.classList.remove('hidden');
  } else {
    adminBtn.classList.add('hidden');
    mobileAdminBtn.classList.add('hidden');
  }
}

function updateAuthUI() {
  if (currentUser) {
    authBtn.innerHTML = currentUser.photo 
      ? `<img src="${currentUser.photo}" alt="${currentUser.name}" style="width: 20px; height: 20px; border-radius: 50%;">`
      : `<i data-lucide="user" width="20" height="20"></i>`;
    mobileAuthBtn.textContent = `${currentUser.name} (Logout)`;
    mobileAuthBtn.onclick = handleLogout;
  } else {
    authBtn.innerHTML = `<i data-lucide="user" width="20" height="20"></i>`;
    mobileAuthBtn.textContent = 'Login / Sign Up';
    mobileAuthBtn.onclick = (e) => {
      e.preventDefault();
      toggleAuthModal();
    };
  }
  lucide.createIcons();
}

function handleLogout() {
  if (typeof auth !== 'undefined') {
    auth.signOut();
  }
  currentUser = null;
  isAdmin = false;
  localStorage.removeItem('sxc_user');
  adminBtn.classList.add('hidden');
  mobileAdminBtn.classList.add('hidden');
  updateAuthUI();
  showToast('Logged out successfully', 'success');
  toggleMobileNav();
}

// Mobile Nav
function toggleMobileNav() {
  mobileNav.classList.toggle('open');
  overlay.classList.toggle('open');
}

// Checkout
function handleCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }
  
  if (!currentUser) {
    showToast('Please login to checkout', 'error');
    toggleCart();
    toggleAuthModal();
    return;
  }
  
  showToast('Redirecting to checkout...', 'success');
  // Redirect to checkout page
  setTimeout(() => {
    alert('Checkout functionality will be implemented here');
  }, 500);
}

// Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" width="20" height="20"></i>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Make functions globally available
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.toggleCart = toggleCart;
window.toggleAuthModal = toggleAuthModal;
window.toggleMobileNav = toggleMobileNav;
