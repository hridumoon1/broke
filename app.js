// ============================================
// FIREBASE CONFIGURATION
// ============================================
// TODO: Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let isAdmin = false;
let cart = [];
let products = [];
let siteSettings = {};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Auth State Listener
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            await checkAdminStatus(user.email);
            updateAuthUI(true);
        } else {
            isAdmin = false;
            updateAuthUI(false);
        }
    });
    
    // Load Site Settings
    loadSiteSettings();
    
    // Load Products
    loadProducts();
    
    // Load Reviews
    loadReviews();
    
    // Checkout Form Handler
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
});

// ============================================
// ADMIN AUTHENTICATION
// ============================================
async function checkAdminStatus(email) {
    try {
        const adminDoc = await db.collection('admins').doc(email).get();
        isAdmin = adminDoc.exists && adminDoc.data().isAllowed;
        
        if (isAdmin) {
            document.getElementById('admin-btn-li').classList.remove('hidden');
        } else {
            document.getElementById('admin-btn-li').classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        isAdmin = false;
    }
}

function handleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            showToast('Login successful!', 'success');
        })
        .catch((error) => {
            showToast('Login failed: ' + error.message, 'error');
        });
}

function handleLogout() {
    auth.signOut()
        .then(() => {
            showToast('Logged out successfully', 'success');
            router('home');
        })
        .catch((error) => {
            showToast('Logout failed: ' + error.message, 'error');
        });
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-btn-li').classList.add('hidden');
        document.getElementById('logout-btn-li').classList.remove('hidden');
    } else {
        document.getElementById('auth-btn-li').classList.remove('hidden');
        document.getElementById('logout-btn-li').classList.add('hidden');
        document.getElementById('admin-btn-li').classList.add('hidden');
    }
}

// ============================================
// SITE SETTINGS & CUSTOMIZATION
// ============================================
async function loadSiteSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('site').get();
        if (settingsDoc.exists) {
            siteSettings = settingsDoc.data();
            applySiteSettings();
        } else {
            // Default settings
            siteSettings = {
                siteName: 'SXC Shop',
                primaryColor: '#6c5ce7',
                contactInfo: 'support@sxc-shop.xyz',
                socialLinks: { facebook: '#', twitter: '#', instagram: '#' }
            };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function applySiteSettings() {
    // Apply colors
    if (siteSettings.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', siteSettings.primaryColor);
    }
    
    // Apply site name
    if (siteSettings.siteName) {
        document.getElementById('site-name-text').textContent = siteSettings.siteName;
        document.title = siteSettings.siteName;
    }
    
    // Apply logo
    if (siteSettings.logoUrl) {
        const logoImg = document.getElementById('logo-img');
        logoImg.src = siteSettings.logoUrl;
        logoImg.classList.remove('hidden');
        document.getElementById('site-name-text').classList.add('hidden');
    }
    
    // Apply footer info
    if (siteSettings.contactInfo) {
        document.getElementById('footer-contact').textContent = siteSettings.contactInfo;
    }
    
    // Apply social links
    if (siteSettings.socialLinks) {
        const socialContainer = document.getElementById('footer-socials');
        socialContainer.innerHTML = '';
        Object.entries(siteSettings.socialLinks).forEach(([platform, url]) => {
            if (url) {
                socialContainer.innerHTML += `
                    <a href="${url}" target="_blank">
                        <i class="fab fa-${platform}"></i>
                    </a>
                `;
            }
        });
    }
}

// ============================================
// PRODUCT MANAGEMENT (Customer View)
// ============================================
async function loadProducts() {
    try {
        toggleLoader(true);
        const snapshot = await db.collection('products')
            .where('status', '==', 'active')
            .get();
        
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        renderProducts();
        toggleLoader(false);
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
        toggleLoader(false);
    }
}

// ============================================
// REVIEW CAROUSEL
// ============================================
async function loadReviews() {
    try {
        const snapshot = await db.collection('reviews')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        reviews = [];
        snapshot.forEach(doc => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function calculateAverageRating() {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function renderReviewCarousel() {
    if (reviews.length === 0) {
        return '';
    }
    
    const avgRating = calculateAverageRating();
    
    return `
        <section class="reviews-section">
            <div class="container">
                <div class="reviews-header">
                    <h2>Customer Reviews</h2>
                    <div class="rating-summary">
                        <div class="rating-stars">${renderStars(parseFloat(avgRating))}</div>
                        <span class="rating-text">${avgRating} out of 5 (${reviews.length} reviews)</span>
                    </div>
                </div>
                
                <div class="carousel-container">
                    <button class="carousel-btn carousel-prev" aria-label="Previous reviews" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <div class="carousel-track-container">
                        <div class="carousel-track" id="review-carousel-track">
                            ${reviews.map(review => `
                                <div class="review-card">
                                    <div class="review-card-header">
                                        <div class="review-rating">${renderStars(review.rating || 0)}</div>
                                        ${review.verifiedPurchase ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified Purchase</span>' : ''}
                                    </div>
                                    ${review.title ? `<h4 class="review-title">${review.title}</h4>` : ''}
                                    <p class="review-text">"${review.comment || 'Great product!'}"</p>
                                    <div class="review-footer">
                                        <div class="reviewer-info">
                                            <span class="reviewer-name">${review.customerName || 'Anonymous'}</span>
                                            <span class="review-date">${review.dateAgo || 'Recent'}</span>
                                        </div>
                                        ${review.helpfulCount !== undefined ? `
                                            <button class="helpful-btn" onclick="markHelpful('${review.id}')">
                                                <i class="far fa-thumbs-up"></i>
                                                <span>Helpful ${review.helpfulCount || 0}</span>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <button class="carousel-btn carousel-next" aria-label="Next reviews">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="carousel-pagination" id="carousel-pagination"></div>
            </div>
        </section>
    `;
}

function initReviewCarousel() {
    const track = document.getElementById('review-carousel-track');
    if (!track) return;
    
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const paginationContainer = document.getElementById('carousel-pagination');
    
    let currentIndex = 0;
    let cardsPerView = getCardsPerView();
    let totalCards = reviews.length;
    let maxIndex = Math.max(0, totalCards - cardsPerView);
    
    function updateCarousel() {
        const cardWidth = track.querySelector('.review-card').offsetWidth + 24;
        track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= maxIndex;
        
        updatePagination();
    }
    
    function getCardsPerView() {
        if (window.innerWidth >= 1024) return 3;
        if (window.innerWidth >= 768) return 2;
        return 1;
    }
    
    function updatePagination() {
        if (!paginationContainer) return;
        const totalPages = Math.ceil(totalCards / cardsPerView);
        const currentPage = Math.floor(currentIndex / cardsPerView) + 1;
        
        paginationContainer.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.className = `pagination-dot ${i === currentPage - 1 ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Go to page ${i + 1}`);
            dot.onclick = () => {
                currentIndex = i * cardsPerView;
                updateCarousel();
            };
            paginationContainer.appendChild(dot);
        }
    }
    
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentIndex < maxIndex) {
            currentIndex++;
            updateCarousel();
        }
    });
    
    let startX = 0;
    let isDragging = false;
    
    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
    }, { passive: true });
    
    track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        
        if (Math.abs(diff) > 50) {
            isDragging = false;
            if (diff > 0 && currentIndex < maxIndex) {
                currentIndex++;
            } else if (diff < 0 && currentIndex > 0) {
                currentIndex--;
            }
            updateCarousel();
        }
    }, { passive: true });
    
    track.addEventListener('touchend', () => {
        isDragging = false;
    });
    
    track.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        track.style.cursor = 'grabbing';
    });
    
    track.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        const diff = startX - e.clientX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex < maxIndex) {
                currentIndex++;
            } else if (diff < 0 && currentIndex > 0) {
                currentIndex--;
            }
            updateCarousel();
        }
        isDragging = false;
        track.style.cursor = 'grab';
    });
    
    track.addEventListener('mouseleave', () => {
        isDragging = false;
        track.style.cursor = 'grab';
    });
    
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        } else if (e.key === 'ArrowRight' && currentIndex < maxIndex) {
            currentIndex++;
            updateCarousel();
        }
    });
    
    window.addEventListener('resize', () => {
        cardsPerView = getCardsPerView();
        maxIndex = Math.max(0, totalCards - cardsPerView);
        currentIndex = Math.min(currentIndex, maxIndex);
        updateCarousel();
    });
    
    track.style.cursor = 'grab';
    updateCarousel();
}

async function markHelpful(reviewId) {
    if (!currentUser) {
        showToast('Please login to mark reviews as helpful', 'error');
        return;
    }
    
    try {
        const reviewRef = db.collection('reviews').doc(reviewId);
        const reviewDoc = await reviewRef.get();
        
        if (reviewDoc.exists) {
            const data = reviewDoc.data();
            const votedUsers = data.votedUsers || [];
            
            if (!votedUsers.includes(currentUser.uid)) {
                await reviewRef.update({
                    helpfulCount: firebase.firestore.FieldValue.increment(1),
                    votedUsers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
                
                const review = reviews.find(r => r.id === reviewId);
                if (review) {
                    review.helpfulCount = (review.helpfulCount || 0) + 1;
                    if (!review.votedUsers) review.votedUsers = [];
                    review.votedUsers.push(currentUser.uid);
                }
                
                initReviewCarousel();
                showToast('Thank you for your feedback!', 'success');
            }
        }
    } catch (error) {
        console.error('Error marking helpful:', error);
    }
}

function renderHomePage() {
    const container = document.getElementById('app-content');
    
    let html = `
        <div class="container">
            <div class="hero">
                <h1>${siteSettings.siteName || 'Welcome to SXC Shop'}</h1>
                <p>Premium Digital & Physical Products at Best Prices</p>
            </div>
            
            <h2>Featured Products</h2>
            
            ${products.length === 0 ? '<p>No products available</p>' : ''}
            
            <div class="products-grid">
                ${products.slice(0, 8).map(product => `
                    <div class="product-card" onclick="showProductDetail('${product.id}')">
                        <img src="${product.image || 'https://via.placeholder.com/300'}" 
                             alt="${product.name}" class="product-image">
                        <div class="product-info">
                            <h3 class="product-title">${product.name}</h3>
                            <div class="product-price">
                                ৳${product.price}
                                ${product.oldPrice ? `<span class="product-old-price">৳${product.oldPrice}</span>` : ''}
                                ${product.discount > 0 ? `<span class="product-badge">-${product.discount}%</span>` : ''}
                            </div>
                            <p style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                                ${product.type === 'digital' ? '<i class="fas fa-download"></i> Digital' : '<i class="fas fa-truck"></i> Physical'}
                                • Stock: ${product.stock}
                            </p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${renderReviewCarousel()}
    `;
    
    container.innerHTML = html;
    
    setTimeout(() => {
        initReviewCarousel();
    }, 100);
}

function renderProducts(filteredProducts = null) {
    const productList = filteredProducts || products;
    const container = document.getElementById('app-content');
    
    if (currentView === 'products') {
        let html = `
            <div class="container">
                <h2>All Products</h2>
                
                ${productList.length === 0 ? '<p>No products available</p>' : ''}
                
                <div class="products-grid">
                    ${productList.map(product => `
                        <div class="product-card" onclick="showProductDetail('${product.id}')">
                            <img src="${product.image || 'https://via.placeholder.com/300'}" 
                                 alt="${product.name}" class="product-image">
                            <div class="product-info">
                                <h3 class="product-title">${product.name}</h3>
                                <div class="product-price">
                                    ৳${product.price}
                                    ${product.oldPrice ? `<span class="product-old-price">৳${product.oldPrice}</span>` : ''}
                                    ${product.discount > 0 ? `<span class="product-badge">-${product.discount}%</span>` : ''}
                                </div>
                                <p style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                                    ${product.type === 'digital' ? '<i class="fas fa-download"></i> Digital' : '<i class="fas fa-truck"></i> Physical'}
                                    • Stock: ${product.stock}
                                </p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
}

function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-detail-body');
    
    body.innerHTML = `
        <div class="product-detail-grid">
            <img src="${product.image || 'https://via.placeholder.com/300'}" 
                 alt="${product.name}" class="product-detail-image">
            <div>
                <h2>${product.name}</h2>
                <p class="product-detail-description">${product.description || 'No description'}</p>
                <h3 class="product-detail-price">৳${product.price}</h3>
                ${product.oldPrice ? `<p class="product-old-price-inline">৳${product.oldPrice}</p>` : ''}
                <p class="product-detail-meta-item"><strong>Type:</strong> ${product.type === 'digital' ? 'Digital Product' : 'Physical Product'}</p>
                <p class="product-detail-meta-item"><strong>Availability:</strong> ${product.stock > 0 ? 'In Stock (' + product.stock + ')' : 'Out of Stock'}</p>
                
                ${product.category ? `<p class="product-detail-meta-item"><strong>Category:</strong> ${product.category}</p>` : ''}
                
                <button class="btn-primary" 
                        onclick="addToCart('${product.id}')" 
                        ${product.stock <= 0 ? 'disabled' : ''}>
                    ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// ============================================
// SHOPPING CART
// ============================================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showToast('Product out of stock!', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
            showToast('Quantity updated', 'success');
        } else {
            showToast('Cannot add more than available stock', 'error');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            type: product.type,
            quantity: 1,
            maxStock: product.stock
        });
        showToast('Added to cart!', 'success');
    }
    
    updateCartCount();
    closeModal('product-modal');
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    const itemsContainer = document.getElementById('cart-items');
    
    if (modal.classList.contains('hidden')) {
        // Open cart
        if (cart.length === 0) {
            itemsContainer.innerHTML = '<p>Your cart is empty</p>';
        } else {
            itemsContainer.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}">
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>৳${item.price} x ${item.quantity}</p>
                        <div class="cart-item-actions">
                            <div class="cart-quantity-control">
                                <button class="cart-quantity-btn" onclick="updateCartQuantity(${index}, -1)"><i class="fas fa-minus"></i></button>
                                <span class="cart-quantity-display">${item.quantity}</span>
                                <button class="cart-quantity-btn" onclick="updateCartQuantity(${index}, 1)"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>
                    </div>
                    <button class="btn-danger" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const hasPhysical = cart.some(item => item.type === 'physical');
            const shippingFee = hasPhysical ? 60 : 0;
            
            document.getElementById('cart-subtotal').textContent = '৳' + total;
            document.getElementById('cart-shipping').textContent = hasPhysical ? '৳' + shippingFee : 'Free';
            document.getElementById('cart-total-amount').textContent = '৳' + (total + shippingFee);
            
            // Show/hide empty state and summary
            document.getElementById('cart-empty').classList.toggle('hidden', cart.length > 0);
            document.getElementById('cart-summary').classList.toggle('hidden', cart.length === 0);
        }

        modal.classList.remove('hidden');
        }
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    toggleCart();
    toggleCart(); // Re-render
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    if (!currentUser) {
        showToast('Please login first', 'error');
        handleLogin();
        return;
    }
    
    toggleCart();
    document.getElementById('checkout-modal').classList.remove('hidden');
}

function togglePaymentFields() {
    const method = document.getElementById('payment-method').value;
    const manualInfo = document.getElementById('manual-payment-info');
    
    if (method === 'sslcommerz') {
        manualInfo.innerHTML = '<p>You will be redirected to SSLCommerz payment gateway.</p>';
    } else {
        const number = method === 'bkash' ? '01700000000' : '01800000000';
        manualInfo.innerHTML = `
            <p>Send money to: <strong>${number}</strong> (${method.toUpperCase()})</p>
            <p>Reference: Your Phone Number</p>
            <input type="text" id="trx-id" placeholder="Enter Transaction ID (TrxID)" required>
        `;
    }
}

// ============================================
// CHECKOUT & ORDER PROCESSING
// ============================================
async function handleCheckout(e) {
    e.preventDefault();
    toggleLoader(true);
    
    try {
        const customerName = document.getElementById('cust-name').value;
        const customerPhone = document.getElementById('cust-phone').value;
        const customerAddress = document.getElementById('cust-address').value;
        const paymentMethod = document.getElementById('payment-method').value;
        const trxId = document.getElementById('trx-id')?.value || '';
        
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = cart.some(item => item.type === 'physical') ? 60 : 0;
        const discount = 0; // Can implement coupon system
        const tax = 0; // Can implement tax system
        const total = subtotal + shippingFee - discount + tax;
        
        // Create order
        const orderData = {
            customerId: currentUser.uid,
            customerEmail: currentUser.email,
            customerName,
            customerPhone,
            customerAddress,
            items: cart,
            subtotal,
            shippingFee,
            discount,
            tax,
            total,
            paymentMethod,
            paymentStatus: paymentMethod === 'sslcommerz' ? 'pending' : 'pending_verification',
            trxId,
            deliveryStatus: 'pending',
            orderDate: firebase.firestore.FieldValue.serverTimestamp(),
            fulfillmentStatus: 'pending',
            isDigitalOnly: cart.every(item => item.type === 'digital'),
            trackingNumber: '',
            courierInfo: ''
        };
        
        const orderRef = await db.collection('orders').add(orderData);
        
        // If SSLCommerz, redirect to payment gateway
        if (paymentMethod === 'sslcommerz') {
            // Implement SSLCommerz payment initiation here
            // For now, we'll simulate success
            await verifyAndFulfillOrder(orderRef.id);
        } else {
            // Manual payment methods (bKash/Nagad)
            showToast('Order placed! Waiting for payment verification.', 'success');
        }
        
        // Clear cart
        cart = [];
        updateCartCount();
        closeModal('checkout-modal');
        document.getElementById('checkout-form').reset();
        
        toggleLoader(false);
        
        // Show order confirmation
        alert(`Order placed successfully!\nOrder ID: ${orderRef.id}\nTotal: ৳${total}`);
        
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Checkout failed: ' + error.message, 'error');
        toggleLoader(false);
    }
}

// ============================================
// INTELLIGENT FULFILLMENT SYSTEM
// ============================================
async function verifyAndFulfillOrder(orderId) {
    try {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        
        if (!orderSnap.exists) return;
        
        const order = orderSnap.data();
        
        // Step 1: Verify Payment
        let paymentVerified = false;
        
        if (order.paymentMethod === 'sslcommerz') {
            // Call SSLCommerz validation API
            paymentVerified = true; // Simulated
        } else {
            // Manual verification (admin will verify via TrxID)
            // For demo, auto-verify if TrxID provided
            paymentVerified = order.trxId && order.trxId.length > 6;
        }
        
        if (!paymentVerified) {
            await orderRef.update({ paymentStatus: 'failed' });
            return;
        }
        
        // Step 2: Update Payment Status
        await orderRef.update({ paymentStatus: 'paid' });
        
        // Step 3: Process Each Item
        const digitalDeliveryInfo = [];
        let allDigitalDelivered = true;
        
        for (const item of order.items) {
            const productRef = db.collection('products').doc(item.id);
            const productSnap = await productRef.get();
            
            if (!productSnap.exists) continue;
            
            const product = productSnap.data();
            
            // Step 4: Reserve/Reduce Inventory
            const newStock = product.stock - item.quantity;
            
            if (newStock < 0) {
                // Insufficient stock
                await orderRef.update({ 
                    fulfillmentStatus: 'failed',
                    failureReason: `Insufficient stock for ${item.name}`
                });
                return;
            }
            
            await productRef.update({ stock: newStock });
            
            // Step 5: Handle Based on Product Type
            if (product.type === 'digital') {
                // Automatic Digital Delivery
                const deliveryResult = await deliverDigitalProduct(item.id, item.quantity, order);
                
                if (deliveryResult.success) {
                    digitalDeliveryInfo.push({
                        productName: item.name,
                        deliveredItems: deliveryResult.items
                    });
                } else {
                    allDigitalDelivered = false;
                }
            }
            // Physical products handled by admin manually
        }
        
        // Step 6: Update Fulfillment Status
        if (order.isDigitalOnly && allDigitalDelivered) {
            await orderRef.update({
                fulfillmentStatus: 'fulfilled',
                deliveryStatus: 'delivered',
                digitalDeliveryInfo: digitalDeliveryInfo,
                fulfilledAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Step 7: Send Customer Notification
            sendCustomerNotification(order.customerEmail, 'order_fulfilled', {
                orderId: orderId,
                deliveryInfo: digitalDeliveryInfo
            });
        } else if (!order.isDigitalOnly) {
            await orderRef.update({
                fulfillmentStatus: 'processing',
                deliveryStatus: 'processing'
            });
            
            sendCustomerNotification(order.customerEmail, 'order_confirmed', {
                orderId: orderId,
                estimatedDelivery: '3-5 business days'
            });
        }
        
    } catch (error) {
        console.error('Fulfillment error:', error);
    }
}

async function deliverDigitalProduct(productId, quantity, order) {
    try {
        const stockRef = db.collection('products').doc(productId).collection('digital_stock');
        
        // Get unused stock items
        const unusedStock = await stockRef
            .where('status', '==', 'unused')
            .limit(quantity)
            .get();
        
        if (unusedStock.empty || unusedStock.docs.length < quantity) {
            return { success: false, error: 'Insufficient digital stock' };
        }
        
        const deliveredItems = [];
        const batch = db.batch();
        
        // Mark stock as used and assign to customer
        unusedStock.docs.forEach((doc, index) => {
            const stockData = doc.data();
            batch.update(doc.ref, {
                status: 'used',
                assignedTo: order.customerId,
                assignedToEmail: order.customerEmail,
                orderId: order.orderId || '',
                usedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            deliveredItems.push({
                key: stockData.key || stockData.code || stockData.content,
                note: stockData.note || ''
            });
        });
        
        await batch.commit();
        
        return { success: true, items: deliveredItems };
        
    } catch (error) {
        console.error('Digital delivery error:', error);
        return { success: false, error: error.message };
    }
}

function sendCustomerNotification(email, type, data) {
    // In production, use a cloud function or email service
    console.log('Sending notification to', email, type, data);
    
    // Store notification in database
    db.collection('notifications').add({
        email,
        type,
        data,
        sent: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ============================================
// ADMIN PANEL
// ============================================
let currentView = 'home';
let currentAdminView = 'dashboard';
let reviews = [];

function router(view) {
    currentView = view;
    const container = document.getElementById('app-content');
    
    if (view === 'admin') {
        if (!isAdmin) {
            showToast('Access denied', 'error');
            return;
        }
        renderAdminPanel();
    } else if (view === 'home') {
        renderHomePage();
    } else if (view === 'products') {
        renderProducts();
    } else if (view === 'support') {
        renderSupportPage();
    }
}

function renderAdminPanel() {
    const container = document.getElementById('app-content');
    
    container.innerHTML = `
        <div class="container">
            <div class="admin-dashboard">
                <div class="admin-sidebar">
                    <h3>Admin Panel</h3>
                    <ul>
                        <li onclick="switchAdminView('dashboard')" class="${currentAdminView === 'dashboard' ? 'active' : ''}">Dashboard</li>
                        <li onclick="switchAdminView('products')" class="${currentAdminView === 'products' ? 'active' : ''}">Products</li>
                        <li onclick="switchAdminView('orders')" class="${currentAdminView === 'orders' ? 'active' : ''}">Orders</li>
                        <li onclick="switchAdminView('inventory')" class="${currentAdminView === 'inventory' ? 'active' : ''}">Digital Stock</li>
                        <li onclick="switchAdminView('customers')" class="${currentAdminView === 'customers' ? 'active' : ''}">Customers</li>
                        <li onclick="switchAdminView('settings')" class="${currentAdminView === 'settings' ? 'active' : ''}">Settings</li>
                        <li onclick="switchAdminView('admins')" class="${currentAdminView === 'admins' ? 'active' : ''}">Admin Access</li>
                    </ul>
                </div>
                <div class="admin-content" id="admin-view-content">
                    <!-- Content loaded dynamically -->
                </div>
            </div>
        </div>
    `;
    
    switchAdminView(currentAdminView);
}

async function switchAdminView(view) {
    currentAdminView = view;
    const content = document.getElementById('admin-view-content');
    
    // Update sidebar active state
    document.querySelectorAll('.admin-sidebar li').forEach(li => {
        li.classList.remove('active');
        if (li.textContent.toLowerCase().includes(view)) {
            li.classList.add('active');
        }
    });
    
    toggleLoader(true);
    
    switch(view) {
        case 'dashboard':
            await renderAdminDashboard(content);
            break;
        case 'products':
            await renderAdminProducts(content);
            break;
        case 'orders':
            await renderAdminOrders(content);
            break;
        case 'inventory':
            await renderAdminInventory(content);
            break;
        case 'customers':
            await renderAdminCustomers(content);
            break;
        case 'settings':
            await renderAdminSettings(content);
            break;
        case 'admins':
            await renderAdminAccess(content);
            break;
    }
    
    toggleLoader(false);
}

// Dashboard
async function renderAdminDashboard(container) {
    const ordersSnap = await db.collection('orders').get();
    const productsSnap = await db.collection('products').get();
    const customersSnap = await db.collection('users').get();
    
    let totalRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    
    ordersSnap.forEach(doc => {
        const order = doc.data();
        if (order.paymentStatus === 'paid') {
            totalRevenue += order.total || 0;
        }
        if (order.deliveryStatus === 'pending') pendingOrders++;
        if (order.deliveryStatus === 'delivered') completedOrders++;
    });
    
    container.innerHTML = `
        <div class="admin-header">
            <h2>Dashboard</h2>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Revenue</h3>
                <div class="stat-number">৳${totalRevenue.toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <h3>Total Orders</h3>
                <div class="stat-number">${ordersSnap.size}</div>
            </div>
            <div class="stat-card">
                <h3>Pending Orders</h3>
                <div class="stat-number">${pendingOrders}</div>
            </div>
            <div class="stat-card">
                <h3>Products</h3>
                <div class="stat-number">${productsSnap.size}</div>
            </div>
        </div>
        
        <h3>Recent Orders</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${ordersSnap.docs.slice(0, 5).map(doc => {
                    const order = doc.data();
                    return `
                        <tr>
                            <td>${doc.id.substring(0, 8)}...</td>
                            <td>${order.customerName}</td>
                            <td>৳${order.total}</td>
                            <td><span class="status-badge status-${order.paymentStatus}">${order.paymentStatus}</span></td>
                            <td>${order.orderDate ? new Date(order.orderDate.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Products Management
async function renderAdminProducts(container) {
    const productsSnap = await db.collection('products').get();
    
    container.innerHTML = `
        <div class="admin-header">
            <h2>Products Management</h2>
            <button class="btn-primary" onclick="showAddProductForm()" style="width: auto;">
                <i class="fas fa-plus"></i> Add Product
            </button>
        </div>
        
        <div id="add-product-form" class="hidden" style="background: #f9f9f9; padding: 20px; margin-bottom: 20px; border-radius: 10px;">
            <h3>Add/Edit Product</h3>
            <form id="product-form" onsubmit="handleProductSubmit(event)">
                <input type="hidden" id="prod-id">
                <input type="text" id="prod-name" placeholder="Product Name" required>
                <textarea id="prod-desc" placeholder="Description"></textarea>
                <input type="number" id="prod-price" placeholder="Price (BDT)" required>
                <input type="number" id="prod-old-price" placeholder="Old Price (optional)">
                <input type="number" id="prod-discount" placeholder="Discount %" min="0" max="100">
                <input type="number" id="prod-stock" placeholder="Stock Quantity" required>
                <select id="prod-type" onchange="toggleDigitalFields()">
                    <option value="physical">Physical Product</option>
                    <option value="digital">Digital Product</option>
                </select>
                <input type="text" id="prod-category" placeholder="Category">
                <input type="text" id="prod-image" placeholder="Image URL">
                <select id="prod-status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <button type="submit" class="btn-primary">Save Product</button>
                <button type="button" class="btn-danger" onclick="document.getElementById('add-product-form').classList.add('hidden')">Cancel</button>
            </form>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${productsSnap.docs.map(doc => {
                    const prod = doc.data();
                    return `
                        <tr>
                            <td>${prod.name}</td>
                            <td>${prod.type}</td>
                            <td>৳${prod.price}</td>
                            <td>${prod.stock}</td>
                            <td>${prod.status}</td>
                            <td>
                                <button class="btn-primary" onclick="editProduct('${doc.id}')" style="width: auto; padding: 5px 10px;">Edit</button>
                                <button class="btn-danger" onclick="deleteProduct('${doc.id}')" style="width: auto; padding: 5px 10px;">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function toggleDigitalFields() {
    // Can add additional fields for digital products if needed
}

function showAddProductForm() {
    document.getElementById('add-product-form').classList.remove('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    toggleLoader(true);
    
    const productId = document.getElementById('prod-id').value;
    const productData = {
        name: document.getElementById('prod-name').value,
        description: document.getElementById('prod-desc').value,
        price: parseFloat(document.getElementById('prod-price').value),
        oldPrice: parseFloat(document.getElementById('prod-old-price').value) || 0,
        discount: parseInt(document.getElementById('prod-discount').value) || 0,
        stock: parseInt(document.getElementById('prod-stock').value),
        type: document.getElementById('prod-type').value,
        category: document.getElementById('prod-category').value,
        image: document.getElementById('prod-image').value,
        status: document.getElementById('prod-status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (productId) {
            await db.collection('products').doc(productId).update(productData);
            showToast('Product updated!', 'success');
        } else {
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('products').add(productData);
            showToast('Product created!', 'success');
        }
        
        document.getElementById('add-product-form').classList.add('hidden');
        renderAdminProducts(document.getElementById('admin-view-content'));
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
    
    toggleLoader(false);
}

async function editProduct(productId) {
    const doc = await db.collection('products').doc(productId).get();
    const prod = doc.data();
    
    document.getElementById('prod-id').value = productId;
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-desc').value = prod.description || '';
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-old-price').value = prod.oldPrice || '';
    document.getElementById('prod-discount').value = prod.discount || 0;
    document.getElementById('prod-stock').value = prod.stock;
    document.getElementById('prod-type').value = prod.type;
    document.getElementById('prod-category').value = prod.category || '';
    document.getElementById('prod-image').value = prod.image || '';
    document.getElementById('prod-status').value = prod.status;
    
    document.getElementById('add-product-form').classList.remove('hidden');
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await db.collection('products').doc(productId).delete();
        showToast('Product deleted!', 'success');
        renderAdminProducts(document.getElementById('admin-view-content'));
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Orders Management
async function renderAdminOrders(container) {
    const ordersSnap = await db.collection('orders')
        .orderBy('orderDate', 'desc')
        .get();
    
    container.innerHTML = `
        <div class="admin-header">
            <h2>Orders Management</h2>
            <div>
                <select onchange="filterOrders(this.value)" style="width: auto;">
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Delivery</th>
                    <th>Fulfillment</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${ordersSnap.docs.map(doc => {
                    const order = doc.data();
                    return `
                        <tr>
                            <td>${doc.id.substring(0, 8)}...</td>
                            <td>
                                ${order.customerName}<br>
                                <small>${order.customerEmail}</small>
                            </td>
                            <td>${order.items.length} items</td>
                            <td>৳${order.total}</td>
                            <td><span class="status-badge status-${order.paymentStatus}">${order.paymentStatus}</span></td>
                            <td><span class="status-badge status-${order.deliveryStatus}">${order.deliveryStatus}</span></td>
                            <td><span class="status-badge status-${order.fulfillmentStatus}">${order.fulfillmentStatus}</span></td>
                            <td>
                                <button class="btn-primary" onclick="viewOrderDetails('${doc.id}')" style="width: auto; padding: 5px 10px;">View</button>
                                ${order.paymentStatus === 'paid' && order.fulfillmentStatus !== 'fulfilled' ? `
                                    <button class="btn-primary" onclick="manualFulfill('${doc.id}')" style="width: auto; padding: 5px 10px;">Fulfill</button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function viewOrderDetails(orderId) {
    const doc = await db.collection('orders').doc(orderId).get();
    const order = doc.data();
    
    const digitalInfo = order.digitalDeliveryInfo ? `
        <div style="background: #e8f5e9; padding: 15px; margin-top: 15px; border-radius: 5px;">
            <h4>Digital Delivery Information</h4>
            ${order.digitalDeliveryInfo.map(item => `
                <div style="margin: 10px 0;">
                    <strong>${item.productName}:</strong><br>
                    ${item.deliveredItems.map(di => `
                        <code style="background: #fff; padding: 5px; display: block; margin: 5px 0;">${di.key}</code>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    ` : '';
    
    alert(`Order Details:
    
Order ID: ${orderId}
Customer: ${order.customerName} (${order.customerEmail})
Phone: ${order.customerPhone}
Address: ${order.customerAddress}

Items:
${order.items.map(i => `- ${i.name} x ${i.quantity} = ৳${i.price * i.quantity}`).join('\n')}

Subtotal: ৳${order.subtotal}
Shipping: ৳${order.shippingFee}
Total: ৳${order.total}

Payment Method: ${order.paymentMethod}
TrxID: ${order.trxId || 'N/A'}
Payment Status: ${order.paymentStatus}
Delivery Status: ${order.deliveryStatus}
Fulfillment: ${order.fulfillmentStatus}

${digitalInfo}
    `);
}

async function manualFulfill(orderId) {
    if (!confirm('Mark this order as fulfilled?')) return;
    
    try {
        await db.collection('orders').doc(orderId).update({
            fulfillmentStatus: 'fulfilled',
            deliveryStatus: 'delivered',
            fulfilledAt: firebase.firestore.FieldValue.serverTimestamp(),
            fulfilledBy: currentUser.email
        });
        
        showToast('Order fulfilled!', 'success');
        renderAdminOrders(document.getElementById('admin-view-content'));
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Digital Inventory Management
async function renderAdminInventory(container) {
    const productsSnap = await db.collection('products')
        .where('type', '==', 'digital')
        .get();
    
    let productsHtml = '';
    
    for (const doc of productsSnap.docs) {
        const product = doc.data();
        const stockSnap = await db.collection('products').doc(doc.id).collection('digital_stock').get();
        
        let stockItems = [];
        stockSnap.forEach(sDoc => {
            stockItems.push({ id: sDoc.id, ...sDoc.data() });
        });
        
        productsHtml += `
            <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 10px;">
                <h3>${product.name}</h3>
                <p>Available Stock: ${stockItems.filter(s => s.status === 'unused').length}</p>
                
                <div style="margin: 15px 0;">
                    <textarea id="bulk-stock-${doc.id}" placeholder="Enter stock items (one per line):&#10;KEY-001&#10;KEY-002&#10;LICENSE-XYZ"></textarea>
                    <button class="btn-primary" onclick="addBulkStock('${doc.id}')" style="width: auto; margin-top: 10px;">
                        Add Stock
                    </button>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Key/Code</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stockItems.map(item => `
                            <tr>
                                <td><code>${item.key || item.code || 'N/A'}</code></td>
                                <td>
                                    <span class="status-badge ${item.status === 'unused' ? 'status-fulfilled' : 'status-cancelled'}">
                                        ${item.status}
                                    </span>
                                </td>
                                <td>${item.assignedToEmail || 'N/A'}</td>
                                <td>${item.usedAt ? new Date(item.usedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="admin-header">
            <h2>Digital Stock Inventory</h2>
        </div>
        ${productsHtml || '<p>No digital products found.</p>'}
    `;
}

async function addBulkStock(productId) {
    const textarea = document.getElementById(`bulk-stock-${productId}`);
    const lines = textarea.value.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        showToast('No stock items entered', 'error');
        return;
    }
    
    toggleLoader(true);
    
    try {
        const batch = db.batch();
        const stockRef = db.collection('products').doc(productId).collection('digital_stock');
        
        lines.forEach(line => {
            const docRef = stockRef.doc();
            batch.set(docRef, {
                key: line.trim(),
                status: 'unused',
                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                addedBy: currentUser.email
            });
        });
        
        await batch.commit();
        
        // Update product stock count
        const productRef = db.collection('products').doc(productId);
        const productSnap = await productRef.get();
        const currentStock = productSnap.data().stock || 0;
        await productRef.update({ stock: currentStock + lines.length });
        
        showToast(`${lines.length} stock items added!`, 'success');
        textarea.value = '';
        renderAdminInventory(document.getElementById('admin-view-content'));
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
    
    toggleLoader(false);
}

// Customers
async function renderAdminCustomers(container) {
    const usersSnap = await db.collection('users').get();
    
    container.innerHTML = `
        <div class="admin-header">
            <h2>Customers</h2>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Orders</th>
                    <th>Joined</th>
                </tr>
            </thead>
            <tbody>
                ${usersSnap.docs.map(doc => {
                    const user = doc.data();
                    return `
                        <tr>
                            <td>${user.name || 'N/A'}</td>
                            <td>${doc.id}</td>
                            <td>-</td>
                            <td>${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Settings
async function renderAdminSettings(container) {
    container.innerHTML = `
        <div class="admin-header">
            <h2>Site Settings</h2>
        </div>
        <form onsubmit="saveSettings(event)" style="max-width: 600px;">
            <label>Site Name</label>
            <input type="text" id="set-name" value="${siteSettings.siteName || ''}" required>
            
            <label>Primary Color</label>
            <input type="color" id="set-color" value="${siteSettings.primaryColor || '#6c5ce7'}" style="height: 50px;">
            
            <label>Contact Info</label>
            <input type="text" id="set-contact" value="${siteSettings.contactInfo || ''}">
            
            <label>Logo URL</label>
            <input type="text" id="set-logo" value="${siteSettings.logoUrl || ''}">
            
            <label>Facebook URL</label>
            <input type="text" id="set-fb" value="${siteSettings.socialLinks?.facebook || ''}">
            
            <label>Twitter URL</label>
            <input type="text" id="set-tw" value="${siteSettings.socialLinks?.twitter || ''}">
            
            <label>Instagram URL</label>
            <input type="text" id="set-ig" value="${siteSettings.socialLinks?.instagram || ''}">
            
            <button type="submit" class="btn-primary">Save Settings</button>
        </form>
    `;
}

async function saveSettings(e) {
    e.preventDefault();
    toggleLoader(true);
    
    const settingsData = {
        siteName: document.getElementById('set-name').value,
        primaryColor: document.getElementById('set-color').value,
        contactInfo: document.getElementById('set-contact').value,
        logoUrl: document.getElementById('set-logo').value,
        socialLinks: {
            facebook: document.getElementById('set-fb').value,
            twitter: document.getElementById('set-tw').value,
            instagram: document.getElementById('set-ig').value
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('settings').doc('site').set(settingsData, { merge: true });
        showToast('Settings saved!', 'success');
        siteSettings = settingsData;
        applySiteSettings();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
    
    toggleLoader(false);
}

// Admin Access Management
async function renderAdminAccess(container) {
    const adminsSnap = await db.collection('admins').get();
    
    container.innerHTML = `
        <div class="admin-header">
            <h2>Admin Access Control</h2>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <strong>Important:</strong> Add Gmail addresses that should have admin access.
            Only these emails can access the admin panel.
        </div>
        <form onsubmit="addAdmin(event)" style="margin-bottom: 20px;">
            <input type="email" id="admin-email" placeholder="admin@gmail.com" required>
            <button type="submit" class="btn-primary" style="width: auto;">Add Admin</button>
        </form>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${adminsSnap.docs.map(doc => {
                    const admin = doc.data();
                    return `
                        <tr>
                            <td>${doc.id}</td>
                            <td>
                                <span class="status-badge ${admin.isAllowed ? 'status-fulfilled' : 'status-cancelled'}">
                                    ${admin.isAllowed ? 'Allowed' : 'Blocked'}
                                </span>
                            </td>
                            <td>${admin.addedAt ? new Date(admin.addedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                            <td>
                                <button class="btn-danger" onclick="removeAdmin('${doc.id}')" style="width: auto; padding: 5px 10px;">
                                    Remove
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function addAdmin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim().toLowerCase();
    
    if (!email.includes('@gmail.com')) {
        showToast('Please enter a valid Gmail address', 'error');
        return;
    }
    
    try {
        await db.collection('admins').doc(email).set({
            email,
            isAllowed: true,
            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: currentUser.email
        });
        
        showToast('Admin added!', 'success');
        document.getElementById('admin-email').value = '';
        renderAdminAccess(document.getElementById('admin-view-content'));
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function removeAdmin(email) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    
    try {
        await db.collection('admins').doc(email).delete();
        showToast('Admin removed!', 'success');
        renderAdminAccess(document.getElementById('admin-view-content'));
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Support Page
function renderSupportPage() {
    const container = document.getElementById('app-content');
    
    container.innerHTML = `
        <div class="container">
            <div style="max-width: 600px; margin: 0 auto;">
                <h2>Support Center</h2>
                <p>Need help? Contact us or submit a ticket.</p>
                
                <form onsubmit="submitTicket(event)" style="margin-top: 30px;">
                    <input type="text" id="ticket-subject" placeholder="Subject" required>
                    <textarea id="ticket-message" placeholder="Your message..." required></textarea>
                    <input type="email" id="ticket-email" placeholder="Your email" value="${currentUser?.email || ''}" required>
                    <button type="submit" class="btn-primary">Submit Ticket</button>
                </form>
            </div>
        </div>
    `;
}

async function submitTicket(e) {
    e.preventDefault();
    
    const ticketData = {
        subject: document.getElementById('ticket-subject').value,
        message: document.getElementById('ticket-message').value,
        email: document.getElementById('ticket-email').value,
        status: 'open',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('tickets').add(ticketData);
        showToast('Ticket submitted! We will contact you soon.', 'success');
        e.target.reset();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Filter orders by status
async function filterOrders(status) {
    const content = document.getElementById('admin-view-content');
    
    if (status === 'all') {
        renderAdminOrders(content);
        return;
    }
    
    toggleLoader(true);
    
    const query = status === 'fulfilled' 
        ? db.collection('orders').where('fulfillmentStatus', '==', status)
        : db.collection('orders').where('deliveryStatus', '==', status);
    
    const ordersSnap = await query.get();
    
    // Render filtered results (similar to renderAdminOrders)
    // For brevity, calling full render
    renderAdminOrders(content);
    
    toggleLoader(false);
}

// ============================================
// NEW CHECKOUT STEP NAVIGATION
// ============================================
let currentCheckoutStep = 1;

function changeCheckoutStep(direction) {
    const totalSteps = 3;
    const newStep = currentCheckoutStep + direction;
    
    if (newStep < 1 || newStep > totalSteps) return;
    
    // Validate current step before moving forward
    if (direction === 1 && !validateCheckoutStep(currentCheckoutStep)) {
        return;
    }
    
    // Update step display
    document.querySelectorAll('.checkout-step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < newStep) {
            step.classList.add('completed');
        } else if (stepNum === newStep) {
            step.classList.add('active');
        }
    });
    
    // Show/hide sections
    document.getElementById('shipping-fields').classList.toggle('hidden', newStep !== 1);
    document.getElementById('payment-fields').classList.toggle('hidden', newStep !== 2);
    document.getElementById('review-fields').classList.toggle('hidden', newStep !== 3);
    
    // Update buttons
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const confirmBtn = document.getElementById('confirm-order');
    
    prevBtn.hidden = newStep === 1;
    nextBtn.hidden = newStep === 3;
    confirmBtn.hidden = newStep !== 3;
    
    // Populate review on step 3
    if (newStep === 3) {
        populateOrderReview();
    }
    
    currentCheckoutStep = newStep;
}

function validateCheckoutStep(step) {
    if (step === 1) {
        const name = document.getElementById('cust-name').value.trim();
        const phone = document.getElementById('cust-phone').value.trim();
        const address = document.getElementById('cust-address').value.trim();
        
        if (!name || !phone || !address) {
            showToast('Please fill in all shipping information', 'error');
            return false;
        }
        
        if (phone.length < 10) {
            showToast('Please enter a valid phone number', 'error');
            return false;
        }
    }
    
    if (step === 2) {
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
        
        if (!paymentMethod) {
            showToast('Please select a payment method', 'error');
            return false;
        }
        
        if (paymentMethod.value !== 'sslcommerz') {
            const trxId = document.getElementById('trx-id')?.value.trim();
            
            if (!trxId || trxId.length < 6) {
                showToast('Please enter a valid Transaction ID', 'error');
                return false;
            }
        }
    }
    
    return true;
}

function populateOrderReview() {
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const hasPhysical = cart.some(item => item.type === 'physical');
    const shippingFee = hasPhysical ? 60 : 0;
    const total = cartTotal + shippingFee;
    
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethodName = paymentMethod ? paymentMethod.nextElementSibling.querySelector('span').textContent : '';
    
    let reviewHtml = `
        <div class="order-review-items">
            <h4>Items (${cart.length})</h4>
            ${cart.map(item => `
                <div class="review-item">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}">
                    <div class="review-item-details">
                        <p class="review-item-name">${item.name}</p>
                        <p class="review-item-meta">Qty: ${item.quantity} × ৳${item.price}</p>
                    </div>
                    <p class="review-item-total">৳${item.price * item.quantity}</p>
                </div>
            `).join('')}
        </div>
        
        <div class="order-review-summary">
            <div class="summary-row">
                <span>Subtotal</span>
                <span>৳${cartTotal}</span>
            </div>
            <div class="summary-row">
                <span>Shipping</span>
                <span>${shippingFee > 0 ? '৳' + shippingFee : 'Free'}</span>
            </div>
            <div class="summary-row grand-total">
                <span>Total</span>
                <span>৳${total}</span>
            </div>
        </div>
        
        <div class="order-review-shipping">
            <h4>Shipping Information</h4>
            <p><strong>${document.getElementById('cust-name').value}</strong></p>
            <p>${document.getElementById('cust-phone').value}</p>
            <p>${document.getElementById('cust-address').value}</p>
        </div>
        
        <div class="order-review-payment">
            <h4>Payment Method</h4>
            <p><i class="fas fa-${paymentMethod.value === 'sslcommerz' ? 'credit-card' : 'mobile-alt'}"></i> ${paymentMethodName}</p>
        </div>
    `;
    
    document.getElementById('order-review').innerHTML = reviewHtml;
}

// Enhanced togglePaymentFields for radio buttons
function togglePaymentFields() {
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
    const manualInfo = document.getElementById('manual-payment-info');
    const sslInfo = document.getElementById('ssl-info');
    
    if (!paymentMethod) return;
    
    const method = paymentMethod.value;
    
    if (method === 'sslcommerz') {
        manualInfo.classList.add('hidden');
        sslInfo.classList.remove('hidden');
    } else {
        const number = method === 'bkash' ? '01700000000' : '01800000000';
        manualInfo.innerHTML = `
            <div class="info-box">
                <i class="fas fa-info-circle"></i>
                <p>Send money to: <strong>${number}</strong> (${method.toUpperCase()})</p>
                <p>Reference: Your Phone Number</p>
            </div>
            <input type="text" id="trx-id" placeholder="Transaction ID (TrxID) *" required>
        `;
        manualInfo.classList.remove('hidden');
        sslInfo.classList.add('hidden');
    }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
            navLinks.classList.toggle('active');
        });
    }
    
    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchBarContainer = document.getElementById('search-bar-container');
    const searchClose = document.getElementById('search-close');
    const searchInput = document.getElementById('search-input');
    
    if (searchBtn && searchBarContainer) {
        searchBtn.addEventListener('click', () => {
            searchBarContainer.classList.remove('hidden');
            setTimeout(() => searchInput?.focus(), 100);
        });
    }
    
    if (searchClose && searchBarContainer) {
        searchClose.addEventListener('click', () => {
            searchBarContainer.classList.add('hidden');
            if (searchInput) searchInput.value = '';
        });
    }
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 10) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });
});

// Add styles for order review
const orderReviewStyles = `
<style>
.order-review-items h4,
.order-review-shipping h4,
.order-review-payment h4 {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-gray-800);
    margin-bottom: var(--spacing-3);
}

.review-item {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3) 0;
    border-bottom: 1px solid var(--color-gray-100);
}

.review-item:last-child {
    border-bottom: none;
}

.review-item img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: var(--radius-md);
}

.review-item-details {
    flex: 1;
}

.review-item-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-800);
    margin-bottom: var(--spacing-1);
}

.review-item-meta {
    font-size: var(--font-size-xs);
    color: var(--color-gray-500);
}

.review-item-total {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary);
}

.order-review-summary {
    margin: var(--spacing-6) 0;
    padding: var(--spacing-4);
    background-color: var(--color-gray-50);
    border-radius: var(--radius-md);
}

.summary-row {
    display: flex;
    justify-content: space-between;
    padding: var(--spacing-2) 0;
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
}

.summary-row.grand-total {
    border-top: 1px solid var(--color-gray-200);
    padding-top: var(--spacing-3);
    margin-top: var(--spacing-2);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-800);
}

.order-review-shipping,
.order-review-payment {
    margin-top: var(--spacing-4);
    padding: var(--spacing-4);
    background-color: var(--color-gray-50);
    border-radius: var(--radius-md);
}

.order-review-shipping p,
.order-review-payment p {
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
    margin-bottom: var(--spacing-1);
    line-height: var(--line-height-relaxed);
}

.order-review-payment i {
    color: var(--color-primary);
    margin-right: var(--spacing-2);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', orderReviewStyles);
