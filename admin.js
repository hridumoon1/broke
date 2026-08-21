// admin.js - Admin Panel Logic
import { auth, db, storage, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp, increment, setDoc, getDoc, runTransaction, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

// State Management
let currentUser = null;
let isAdmin = false;
let adminEmails = [];

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initModals();
    loadSettings();
});

// Authentication
function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            await checkAdminAccess(user.email);
        } else {
            showLoginScreen();
        }
    });

    googleLoginBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            await checkAdminAccess(result.user.email);
        } catch (error) {
            console.error('Login error:', error);
            document.getElementById('login-error').textContent = 'Login failed: ' + error.message;
        }
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}

async function checkAdminAccess(email) {
    try {
        // Load admin emails from settings
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            adminEmails = settings.adminEmails ? settings.adminEmails.split(',').map(e => e.trim()) : [];
            
            // Check if user email is in admin list or has admin role in staff collection
            const staffQuery = query(collection(db, 'staff'), where('email', '==', email));
            const staffSnapshot = await getDocs(staffQuery);
            
            if (adminEmails.includes(email) || (!staffSnapshot.empty && staffSnapshot.docs[0].data().role === 'admin')) {
                isAdmin = true;
                showDashboard();
                loadDashboardData();
            } else {
                // Check if user is in staff with any role
                if (!staffSnapshot.empty) {
                    const staffData = staffSnapshot.docs[0].data();
                    if (staffData.status === 'active') {
                        isAdmin = false; // Regular staff
                        showDashboard();
                        loadDashboardData();
                    } else {
                        throw new Error('Your account is inactive');
                    }
                } else {
                    throw new Error('Unauthorized: Your email is not registered as admin or staff');
                }
            }
        } else {
            // First time setup - allow first user as admin
            isAdmin = true;
            adminEmails = [email];
            await setDoc(doc(db, 'settings', 'general'), {
                adminEmails: email,
                createdAt: serverTimestamp()
            });
            showDashboard();
            loadDashboardData();
        }
    } catch (error) {
        console.error('Admin check error:', error);
        document.getElementById('login-error').textContent = error.message;
        signOut(auth);
    }
}

function showLoginScreen() {
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
}

function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'flex';
    
    if (currentUser) {
        document.getElementById('admin-email').textContent = currentUser.email;
        document.getElementById('admin-avatar').src = currentUser.photoURL || 'https://via.placeholder.com/40';
    }
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update active section
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(`${section}-section`).classList.add('active');
            
            // Update page title
            document.getElementById('page-title').textContent = item.textContent.trim();
            
            // Load section data
            loadSectionData(section);
        });
    });

    // Menu toggle for mobile
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
}

// Load section data
function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            loadCategories();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'digital-stock':
            loadDigitalStock();
            loadProductsForDropdown();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'coupons':
            loadCoupons();
            break;
        case 'tickets':
            loadTickets();
            break;
        case 'payments':
            loadPaymentSettings();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'staff':
            loadStaff();
            break;
    }
}

// Dashboard Data
async function loadDashboardData() {
    try {
        // Load orders count
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const totalOrders = ordersSnapshot.size;
        document.getElementById('total-orders').textContent = totalOrders;
        
        // Calculate revenue
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.paymentStatus === 'paid' || order.deliveryStatus === 'delivered') {
                totalRevenue += order.total || 0;
            }
        });
        document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
        
        // Load products count
        const productsSnapshot = await getDocs(collection(db, 'products'));
        document.getElementById('total-products').textContent = productsSnapshot.size;
        
        // Load customers count
        const customersSnapshot = await getDocs(collection(db, 'customers'));
        document.getElementById('total-customers').textContent = customersSnapshot.size;
        
        // Recent orders
        const recentOrdersQuery = query(collection(db, 'orders'), where('createdAt', '>=', serverTimestamp()));
        // Note: For actual recent orders, you'd need to use a proper date query
        const recentBody = document.getElementById('recent-orders-body');
        recentBody.innerHTML = '';
        
        let count = 0;
        ordersSnapshot.forEach(doc => {
            if (count >= 5) return;
            const order = doc.data();
            const row = `
                <tr>
                    <td>#${doc.id.substring(0, 8)}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td>${formatCurrency(order.total || 0)}</td>
                    <td><span class="status-badge ${order.deliveryStatus}">${order.deliveryStatus || 'pending'}</span></td>
                    <td>${formatDate(order.createdAt)}</td>
                </tr>
            `;
            recentBody.innerHTML += row;
            count++;
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Products Management
async function loadProducts() {
    try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsGrid = document.getElementById('products-grid');
        productsGrid.innerHTML = '';
        
        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const card = `
                <div class="product-card" data-id="${doc.id}">
                    <img src="${product.images?.[0] || 'https://via.placeholder.com/200'}" alt="${product.name}">
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p class="product-type">${product.type}</p>
                        <p class="product-price">${formatCurrency(product.price)}</p>
                        <p class="product-stock">Stock: ${product.inventory || 0}</p>
                        <div class="product-actions">
                            <button class="btn-edit" onclick="editProduct('${doc.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete" onclick="deleteProduct('${doc.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
            productsGrid.innerHTML += card;
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Modal Management
function initModals() {
    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // Add Product Button
    document.getElementById('add-product-btn').addEventListener('click', () => {
        document.getElementById('product-modal-title').textContent = 'Add Product';
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-modal').style.display = 'block';
        loadCategoriesForDropdown();
    });

    // Save Product
    document.getElementById('save-product-btn').addEventListener('click', saveProduct);

    // Add Digital Stock Button
    document.getElementById('add-digital-stock-btn').addEventListener('click', () => {
        document.getElementById('digital-stock-modal').style.display = 'block';
        loadProductsForDropdown();
    });

    // Save Digital Stock
    document.getElementById('save-digital-stock-btn').addEventListener('click', saveDigitalStock);

    // Add Category Button
    document.getElementById('add-category-btn').addEventListener('click', () => {
        document.getElementById('category-modal-title').textContent = 'Add Category';
        document.getElementById('category-form').reset();
        document.getElementById('category-id').value = '';
        document.getElementById('category-modal').style.display = 'block';
    });

    // Save Category
    document.getElementById('save-category-btn').addEventListener('click', saveCategory);

    // Add Coupon Button
    document.getElementById('add-coupon-btn').addEventListener('click', () => {
        document.getElementById('coupon-modal-title').textContent = 'Add Coupon';
        document.getElementById('coupon-form').reset();
        document.getElementById('coupon-id').value = '';
        document.getElementById('coupon-modal').style.display = 'block';
    });

    // Save Coupon
    document.getElementById('save-coupon-btn').addEventListener('click', saveCoupon);

    // Add Staff Button
    document.getElementById('add-staff-btn').addEventListener('click', () => {
        document.getElementById('staff-modal-title').textContent = 'Add Staff Member';
        document.getElementById('staff-form').reset();
        document.getElementById('staff-id').value = '';
        document.getElementById('staff-modal').style.display = 'block';
    });

    // Save Staff
    document.getElementById('save-staff-btn').addEventListener('click', saveStaff);

    // Update Order Button
    document.getElementById('update-order-btn').addEventListener('click', updateOrder);

    // Settings tabs
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-settings`).classList.add('active');
        });
    });

    // Save Settings Buttons
    document.getElementById('save-general-settings').addEventListener('click', () => saveSettings('general'));
    document.getElementById('save-appearance-settings').addEventListener('click', () => saveSettings('appearance'));
    document.getElementById('save-notification-settings').addEventListener('click', () => saveSettings('notifications'));
    document.getElementById('save-footer-settings').addEventListener('click', () => saveSettings('footer'));
    document.getElementById('save-social-settings').addEventListener('click', () => saveSettings('social'));
    document.getElementById('save-contact-settings').addEventListener('click', () => saveSettings('contact'));

    // Order tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadOrders(btn.dataset.status);
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Save Product
async function saveProduct() {
    try {
        const productId = document.getElementById('product-id').value;
        const productData = {
            name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value,
            type: document.getElementById('product-type').value,
            sku: document.getElementById('product-sku').value,
            price: parseFloat(document.getElementById('product-price').value),
            discount: parseFloat(document.getElementById('product-discount').value) || 0,
            tax: parseFloat(document.getElementById('product-tax').value) || 0,
            inventory: parseInt(document.getElementById('product-inventory').value) || 0,
            lowStockThreshold: parseInt(document.getElementById('product-low-stock').value) || 5,
            description: document.getElementById('product-description').value,
            images: document.getElementById('product-images').value.split(',').map(url => url.trim()).filter(url => url),
            autoDeliver: document.getElementById('auto-deliver').checked,
            status: document.getElementById('product-status').value,
            updatedAt: serverTimestamp()
        };

        if (productId) {
            await updateDoc(doc(db, 'products', productId), productData);
        } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
        }

        document.getElementById('product-modal').style.display = 'none';
        loadProducts();
        alert('Product saved successfully!');
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product: ' + error.message);
    }
}

// Edit Product (global function)
window.editProduct = async function(productId) {
    try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
            const product = productDoc.data();
            document.getElementById('product-id').value = productId;
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-type').value = product.type || 'physical';
            document.getElementById('product-sku').value = product.sku || '';
            document.getElementById('product-price').value = product.price || 0;
            document.getElementById('product-discount').value = product.discount || 0;
            document.getElementById('product-tax').value = product.tax || 0;
            document.getElementById('product-inventory').value = product.inventory || 0;
            document.getElementById('product-low-stock').value = product.lowStockThreshold || 5;
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-images').value = product.images?.join(', ') || '';
            document.getElementById('auto-deliver').checked = product.autoDeliver || false;
            document.getElementById('product-status').value = product.status || 'active';
            
            document.getElementById('product-modal-title').textContent = 'Edit Product';
            document.getElementById('product-modal').style.display = 'block';
            loadCategoriesForDropdown();
        }
    } catch (error) {
        console.error('Error loading product:', error);
    }
};

// Delete Product (global function)
window.deleteProduct = async function(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            loadProducts();
            alert('Product deleted successfully!');
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product: ' + error.message);
        }
    }
};

// Save Digital Stock
async function saveDigitalStock() {
    try {
        const productId = document.getElementById('stock-product-select').value;
        const itemsText = document.getElementById('stock-items').value;
        
        if (!productId) {
            alert('Please select a product');
            return;
        }

        const items = itemsText.split('\n').map(item => item.trim()).filter(item => item);
        
        if (items.length === 0) {
            alert('Please enter at least one digital item');
            return;
        }

        // Add each item to digital_stock collection
        const batchPromises = items.map(item => 
            addDoc(collection(db, 'digital_stock'), {
                productId: productId,
                itemValue: item,
                status: 'available', // available, used, assigned
                addedAt: serverTimestamp(),
                assignedAt: null,
                orderId: null,
                customerId: null
            })
        );

        await Promise.all(batchPromises);

        document.getElementById('digital-stock-modal').style.display = 'none';
        document.getElementById('stock-items').value = '';
        loadDigitalStock();
        alert(`${items.length} digital items added successfully!`);
    } catch (error) {
        console.error('Error saving digital stock:', error);
        alert('Error saving digital stock: ' + error.message);
    }
}

// Load Digital Stock
async function loadDigitalStock() {
    try {
        const stockSnapshot = await getDocs(collection(db, 'digital_stock'));
        const stockBody = document.getElementById('digital-stock-body');
        stockBody.innerHTML = '';

        // Get product names for display
        const productNames = {};
        const productsSnapshot = await getDocs(collection(db, 'products'));
        productsSnapshot.forEach(doc => {
            productNames[doc.id] = doc.data().name;
        });

        stockSnapshot.forEach(doc => {
            const stock = doc.data();
            const row = `
                <tr>
                    <td>${productNames[stock.productId] || 'Unknown'}</td>
                    <td>${maskSensitiveData(stock.itemValue)}</td>
                    <td><span class="status-badge ${stock.status}">${stock.status}</span></td>
                    <td>${formatDate(stock.addedAt)}</td>
                    <td>${stock.assignedAt ? formatDate(stock.assignedAt) : '-'}</td>
                    <td>
                        ${stock.status === 'available' ? `<button class="btn-delete" onclick="deleteDigitalStock('${doc.id}')"><i class="fas fa-trash"></i></button>` : '-'}
                    </td>
                </tr>
            `;
            stockBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading digital stock:', error);
    }
}

// Delete Digital Stock (global function)
window.deleteDigitalStock = async function(stockId) {
    if (confirm('Are you sure you want to delete this digital item?')) {
        try {
            await deleteDoc(doc(db, 'digital_stock', stockId));
            loadDigitalStock();
        } catch (error) {
            console.error('Error deleting digital stock:', error);
        }
    }
};

// Load Orders
async function loadOrders(status = 'all') {
    try {
        let ordersQuery;
        if (status === 'all') {
            ordersQuery = collection(db, 'orders');
        } else {
            ordersQuery = query(collection(db, 'orders'), where('deliveryStatus', '==', status));
        }

        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersBody = document.getElementById('orders-body');
        ordersBody.innerHTML = '';

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const row = `
                <tr>
                    <td>#${doc.id.substring(0, 8)}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td>${order.totalQuantity || 0}</td>
                    <td>${formatCurrency(order.total || 0)}</td>
                    <td>${formatCurrency(order.discount || 0)}</td>
                    <td>${formatCurrency(order.tax || 0)}</td>
                    <td>${formatCurrency(order.shippingFee || 0)}</td>
                    <td>${order.paymentMethod || 'N/A'}</td>
                    <td><span class="status-badge ${order.paymentStatus}">${order.paymentStatus || 'pending'}</span></td>
                    <td><span class="status-badge ${order.deliveryStatus}">${order.deliveryStatus || 'pending'}</span></td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>
                        <button class="btn-view" onclick="viewOrder('${doc.id}')"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `;
            ordersBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// View Order (global function)
window.viewOrder = async function(orderId) {
    try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (orderDoc.exists()) {
            const order = orderDoc.data();
            
            document.getElementById('order-id').textContent = `#${orderId.substring(0, 8)}`;
            document.getElementById('order-date').textContent = formatDate(order.createdAt);
            document.getElementById('order-status').textContent = order.deliveryStatus || 'pending';
            document.getElementById('order-customer-name').textContent = order.customerName || 'N/A';
            document.getElementById('order-customer-email').textContent = order.customerEmail || 'N/A';
            document.getElementById('order-customer-phone').textContent = order.customerPhone || 'N/A';
            document.getElementById('order-shipping-address').textContent = order.shippingAddress || 'N/A';
            document.getElementById('order-payment-method').textContent = order.paymentMethod || 'N/A';
            document.getElementById('order-payment-status').textContent = order.paymentStatus || 'pending';
            document.getElementById('order-transaction-id').textContent = order.transactionId || 'N/A';
            
            // Order items
            const itemsBody = document.getElementById('order-items-body');
            itemsBody.innerHTML = '';
            
            if (order.items && order.items.length > 0) {
                for (const item of order.items) {
                    // Get delivery info for digital products
                    let deliveryInfo = '-';
                    if (item.type === 'digital' && order.deliveredItems) {
                        const deliveredItem = order.deliveredItems.find(d => d.productId === item.productId);
                        if (deliveredItem) {
                            deliveryInfo = maskSensitiveData(deliveredItem.itemValue);
                        }
                    }
                    
                    const row = `
                        <tr>
                            <td>${item.productName}</td>
                            <td>${item.type}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.price)}</td>
                            <td>${formatCurrency(item.price * item.quantity)}</td>
                            <td>${deliveryInfo}</td>
                        </tr>
                    `;
                    itemsBody.innerHTML += row;
                }
            }
            
            // Totals
            document.getElementById('order-subtotal').textContent = formatCurrency(order.subtotal || 0);
            document.getElementById('order-discount').textContent = formatCurrency(order.discount || 0);
            document.getElementById('order-tax').textContent = formatCurrency(order.tax || 0);
            document.getElementById('order-shipping').textContent = formatCurrency(order.shippingFee || 0);
            document.getElementById('order-total').textContent = formatCurrency(order.total || 0);
            
            document.getElementById('order-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading order:', error);
    }
};

// Update Order
async function updateOrder() {
    try {
        const orderId = document.getElementById('order-id').textContent.replace('#', '').trim();
        const newStatus = document.getElementById('order-status-update').value;
        const trackingNumber = document.getElementById('order-tracking-number').value;
        const courier = document.getElementById('order-courier').value;
        
        if (!newStatus && !trackingNumber && !courier) {
            alert('Please select a status or enter tracking information');
            return;
        }

        const updateData = {};
        if (newStatus) {
            updateData.deliveryStatus = newStatus;
            updateData.updatedAt = serverTimestamp();
        }
        if (trackingNumber) {
            updateData.trackingNumber = trackingNumber;
        }
        if (courier) {
            updateData.courier = courier;
        }

        await updateDoc(doc(db, 'orders', orderId), updateData);
        
        document.getElementById('order-modal').style.display = 'none';
        loadOrders();
        alert('Order updated successfully!');
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Error updating order: ' + error.message);
    }
}

// Load Inventory
async function loadInventory() {
    try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const inventoryBody = document.getElementById('inventory-body');
        inventoryBody.innerHTML = '';

        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const reserved = 0; // You would calculate this from pending orders
            const available = (product.inventory || 0) - reserved;
            const status = available <= (product.lowStockThreshold || 5) ? 'low-stock' : 'in-stock';

            const row = `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.type}</td>
                    <td>${product.sku || 'N/A'}</td>
                    <td>${product.inventory || 0}</td>
                    <td>${reserved}</td>
                    <td>${available}</td>
                    <td><span class="status-badge ${status}">${status}</span></td>
                    <td>
                        <button class="btn-edit" onclick="editProduct('${doc.id}')"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `;
            inventoryBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// Load Customers
async function loadCustomers() {
    try {
        const customersSnapshot = await getDocs(collection(db, 'customers'));
        const customersBody = document.getElementById('customers-body');
        customersBody.innerHTML = '';

        customersSnapshot.forEach(doc => {
            const customer = doc.data();
            const row = `
                <tr>
                    <td>${customer.name || 'N/A'}</td>
                    <td>${customer.email || 'N/A'}</td>
                    <td>${customer.phone || 'N/A'}</td>
                    <td>${customer.totalOrders || 0}</td>
                    <td>${formatCurrency(customer.totalSpent || 0)}</td>
                    <td>${formatDate(customer.registeredAt)}</td>
                    <td>
                        <button class="btn-view" onclick="viewCustomer('${doc.id}')"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `;
            customersBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load Categories
async function loadCategories() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesGrid = document.getElementById('categories-grid');
        categoriesGrid.innerHTML = '';

        categoriesSnapshot.forEach(doc => {
            const category = doc.data();
            const card = `
                <div class="category-card" data-id="${doc.id}">
                    <i class="${category.icon || 'fas fa-tag'}"></i>
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                    <span class="status-badge ${category.status || 'active'}">${category.status || 'active'}</span>
                    <div class="category-actions">
                        <button class="btn-edit" onclick="editCategory('${doc.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" onclick="deleteCategory('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            categoriesGrid.innerHTML += card;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Save Category
async function saveCategory() {
    try {
        const categoryId = document.getElementById('category-id').value;
        const categoryData = {
            name: document.getElementById('category-name').value,
            description: document.getElementById('category-description').value,
            icon: document.getElementById('category-icon').value,
            status: document.getElementById('category-status').value,
            updatedAt: serverTimestamp()
        };

        if (categoryId) {
            await updateDoc(doc(db, 'categories', categoryId), categoryData);
        } else {
            categoryData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'categories'), categoryData);
        }

        document.getElementById('category-modal').style.display = 'none';
        loadCategories();
        alert('Category saved successfully!');
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category: ' + error.message);
    }
}

// Edit Category (global function)
window.editCategory = async function(categoryId) {
    try {
        const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
        if (categoryDoc.exists()) {
            const category = categoryDoc.data();
            document.getElementById('category-id').value = categoryId;
            document.getElementById('category-name').value = category.name || '';
            document.getElementById('category-description').value = category.description || '';
            document.getElementById('category-icon').value = category.icon || '';
            document.getElementById('category-status').value = category.status || 'active';
            
            document.getElementById('category-modal-title').textContent = 'Edit Category';
            document.getElementById('category-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading category:', error);
    }
};

// Delete Category (global function)
window.deleteCategory = async function(categoryId) {
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            await deleteDoc(doc(db, 'categories', categoryId));
            loadCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    }
};

// Load Coupons
async function loadCoupons() {
    try {
        const couponsSnapshot = await getDocs(collection(db, 'coupons'));
        const couponsBody = document.getElementById('coupons-body');
        couponsBody.innerHTML = '';

        couponsSnapshot.forEach(doc => {
            const coupon = doc.data();
            const row = `
                <tr>
                    <td>${coupon.code}</td>
                    <td>${coupon.type}</td>
                    <td>${coupon.type === 'percentage' ? coupon.value + '%' : formatCurrency(coupon.value)}</td>
                    <td>${formatCurrency(coupon.minOrder || 0)}</td>
                    <td>${coupon.usageLimit || 'Unlimited'}</td>
                    <td>${coupon.usedCount || 0}</td>
                    <td>${coupon.validUntil ? formatDate(coupon.validUntil) : 'No expiry'}</td>
                    <td><span class="status-badge ${coupon.status}">${coupon.status}</span></td>
                    <td>
                        <button class="btn-edit" onclick="editCoupon('${doc.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" onclick="deleteCoupon('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            couponsBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading coupons:', error);
    }
}

// Save Coupon
async function saveCoupon() {
    try {
        const couponId = document.getElementById('coupon-id').value;
        const couponData = {
            code: document.getElementById('coupon-code').value.toUpperCase(),
            type: document.getElementById('coupon-type').value,
            value: parseFloat(document.getElementById('coupon-value').value),
            minOrder: parseFloat(document.getElementById('coupon-min-order').value) || 0,
            usageLimit: parseInt(document.getElementById('coupon-usage-limit').value) || null,
            validUntil: document.getElementById('coupon-valid-until').value ? new Date(document.getElementById('coupon-valid-until').value).getTime() : null,
            status: document.getElementById('coupon-status').value,
            usedCount: 0,
            updatedAt: serverTimestamp()
        };

        if (couponId) {
            await updateDoc(doc(db, 'coupons', couponId), couponData);
        } else {
            couponData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'coupons'), couponData);
        }

        document.getElementById('coupon-modal').style.display = 'none';
        loadCoupons();
        alert('Coupon saved successfully!');
    } catch (error) {
        console.error('Error saving coupon:', error);
        alert('Error saving coupon: ' + error.message);
    }
}

// Edit Coupon (global function)
window.editCoupon = async function(couponId) {
    try {
        const couponDoc = await getDoc(doc(db, 'coupons', couponId));
        if (couponDoc.exists()) {
            const coupon = couponDoc.data();
            document.getElementById('coupon-id').value = couponId;
            document.getElementById('coupon-code').value = coupon.code || '';
            document.getElementById('coupon-type').value = coupon.type || 'percentage';
            document.getElementById('coupon-value').value = coupon.value || 0;
            document.getElementById('coupon-min-order').value = coupon.minOrder || 0;
            document.getElementById('coupon-usage-limit').value = coupon.usageLimit || '';
            document.getElementById('coupon-valid-until').value = coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '';
            document.getElementById('coupon-status').value = coupon.status || 'active';
            
            document.getElementById('coupon-modal-title').textContent = 'Edit Coupon';
            document.getElementById('coupon-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading coupon:', error);
    }
};

// Delete Coupon (global function)
window.deleteCoupon = async function(couponId) {
    if (confirm('Are you sure you want to delete this coupon?')) {
        try {
            await deleteDoc(doc(db, 'coupons', couponId));
            loadCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
        }
    }
};

// Load Tickets
async function loadTickets() {
    try {
        const ticketsSnapshot = await getDocs(collection(db, 'support_tickets'));
        const ticketsBody = document.getElementById('tickets-body');
        ticketsBody.innerHTML = '';

        ticketsSnapshot.forEach(doc => {
            const ticket = doc.data();
            const row = `
                <tr>
                    <td>#${doc.id.substring(0, 8)}</td>
                    <td>${ticket.customerName || 'N/A'}</td>
                    <td>${ticket.subject || 'No Subject'}</td>
                    <td><span class="status-badge ${ticket.status}">${ticket.status || 'open'}</span></td>
                    <td><span class="status-badge ${ticket.priority}">${ticket.priority || 'normal'}</span></td>
                    <td>${formatDate(ticket.createdAt)}</td>
                    <td>
                        <button class="btn-view" onclick="viewTicket('${doc.id}')"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `;
            ticketsBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading tickets:', error);
    }
}

// Load Payment Settings
async function loadPaymentSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'payments'));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            document.getElementById('sslcommerz-toggle').checked = settings.sslcommerz?.enabled || false;
            document.getElementById('bkash-toggle').checked = settings.bkash?.enabled || false;
            document.getElementById('nagad-toggle').checked = settings.nagad?.enabled || false;
        }
    } catch (error) {
        console.error('Error loading payment settings:', error);
    }
}

// Load Settings
async function loadSettings() {
    try {
        // General Settings
        const generalDoc = await getDoc(doc(db, 'settings', 'general'));
        if (generalDoc.exists()) {
            const settings = generalDoc.data();
            document.getElementById('site-name').value = settings.siteName || 'SXC Shop';
            document.getElementById('admin-emails').value = settings.adminEmails || '';
            document.getElementById('currency').value = settings.currency || 'BDT';
        }

        // Appearance Settings
        const appearanceDoc = await getDoc(doc(db, 'settings', 'appearance'));
        if (appearanceDoc.exists()) {
            const settings = appearanceDoc.data();
            document.getElementById('logo-url').value = settings.logoUrl || '';
            document.getElementById('favicon-url').value = settings.faviconUrl || '';
            document.getElementById('primary-color').value = settings.primaryColor || '#4f46e5';
            document.getElementById('secondary-color').value = settings.secondaryColor || '#06b6d4';
            document.getElementById('accent-color').value = settings.accentColor || '#f59e0b';
        }

        // Load logo and site name
        if (appearanceDoc.exists()) {
            const settings = appearanceDoc.data();
            document.getElementById('login-logo').src = settings.logoUrl || 'https://via.placeholder.com/100';
            document.getElementById('sidebar-logo').src = settings.logoUrl || 'https://via.placeholder.com/50';
        }
        if (generalDoc.exists()) {
            const settings = generalDoc.data();
            document.getElementById('sidebar-title').textContent = settings.siteName || 'SXC Shop';
            document.getElementById('login-title').textContent = settings.siteName || 'Admin Panel';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save Settings
async function saveSettings(type) {
    try {
        let settingsData = {};
        const collectionName = 'settings';
        const docName = type;

        switch(type) {
            case 'general':
                settingsData = {
                    siteName: document.getElementById('site-name').value,
                    adminEmails: document.getElementById('admin-emails').value,
                    currency: document.getElementById('currency').value,
                    updatedAt: serverTimestamp()
                };
                break;
            case 'appearance':
                settingsData = {
                    logoUrl: document.getElementById('logo-url').value,
                    faviconUrl: document.getElementById('favicon-url').value,
                    primaryColor: document.getElementById('primary-color').value,
                    secondaryColor: document.getElementById('secondary-color').value,
                    accentColor: document.getElementById('accent-color').value,
                    updatedAt: serverTimestamp()
                };
                break;
            case 'notifications':
                settingsData = {
                    newOrder: document.getElementById('notify-new-order').checked,
                    payment: document.getElementById('notify-payment').checked,
                    lowStock: document.getElementById('notify-low-stock').checked,
                    supportTicket: document.getElementById('notify-support-ticket').checked,
                    updatedAt: serverTimestamp()
                };
                break;
            case 'footer':
                settingsData = {
                    footerText: document.getElementById('footer-text').value,
                    copyrightText: document.getElementById('copyright-text').value,
                    updatedAt: serverTimestamp()
                };
                break;
            case 'social':
                settingsData = {
                    facebook: document.getElementById('facebook-url').value,
                    twitter: document.getElementById('twitter-url').value,
                    instagram: document.getElementById('instagram-url').value,
                    linkedin: document.getElementById('linkedin-url').value,
                    youtube: document.getElementById('youtube-url').value,
                    updatedAt: serverTimestamp()
                };
                break;
            case 'contact':
                settingsData = {
                    phone: document.getElementById('contact-phone').value,
                    email: document.getElementById('contact-email').value,
                    address: document.getElementById('contact-address').value,
                    updatedAt: serverTimestamp()
                };
                break;
        }

        await setDoc(doc(db, collectionName, docName), settingsData, { merge: true });
        alert('Settings saved successfully!');
        
        // Reload settings if general or appearance
        if (type === 'general' || type === 'appearance') {
            loadSettings();
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    }
}

// Load Staff
async function loadStaff() {
    try {
        const staffSnapshot = await getDocs(collection(db, 'staff'));
        const staffBody = document.getElementById('staff-body');
        staffBody.innerHTML = '';

        staffSnapshot.forEach(doc => {
            const staff = doc.data();
            const row = `
                <tr>
                    <td>${staff.email}</td>
                    <td>${staff.role}</td>
                    <td>${staff.permissions?.join(', ') || 'All'}</td>
                    <td><span class="status-badge ${staff.status}">${staff.status}</span></td>
                    <td>${formatDate(staff.addedAt)}</td>
                    <td>
                        <button class="btn-edit" onclick="editStaff('${doc.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" onclick="deleteStaff('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            staffBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

// Save Staff
async function saveStaff() {
    try {
        const staffId = document.getElementById('staff-id').value;
        const permissions = Array.from(document.querySelectorAll('.permission-checkbox:checked')).map(cb => cb.value);
        
        const staffData = {
            email: document.getElementById('staff-email').value,
            role: document.getElementById('staff-role').value,
            permissions: permissions,
            status: document.getElementById('staff-status').value,
            updatedAt: serverTimestamp()
        };

        if (staffId) {
            await updateDoc(doc(db, 'staff', staffId), staffData);
        } else {
            staffData.addedAt = serverTimestamp();
            await addDoc(collection(db, 'staff'), staffData);
        }

        document.getElementById('staff-modal').style.display = 'none';
        loadStaff();
        alert('Staff member saved successfully!');
    } catch (error) {
        console.error('Error saving staff:', error);
        alert('Error saving staff: ' + error.message);
    }
}

// Edit Staff (global function)
window.editStaff = async function(staffId) {
    try {
        const staffDoc = await getDoc(doc(db, 'staff', staffId));
        if (staffDoc.exists()) {
            const staff = staffDoc.data();
            document.getElementById('staff-id').value = staffId;
            document.getElementById('staff-email').value = staff.email || '';
            document.getElementById('staff-role').value = staff.role || 'support';
            document.getElementById('staff-status').value = staff.status || 'active';
            
            // Set permissions
            document.querySelectorAll('.permission-checkbox').forEach(cb => {
                cb.checked = staff.permissions?.includes(cb.value) || false;
            });
            
            document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
            document.getElementById('staff-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading staff:', error);
    }
};

// Delete Staff (global function)
window.deleteStaff = async function(staffId) {
    if (confirm('Are you sure you want to remove this staff member?')) {
        try {
            await deleteDoc(doc(db, 'staff', staffId));
            loadStaff();
        } catch (error) {
            console.error('Error deleting staff:', error);
        }
    }
};

// Helper Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT'
    }).format(amount);
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function maskSensitiveData(data) {
    if (!data) return '';
    if (data.length <= 8) return '***';
    return data.substring(0, 3) + '***' + data.substring(data.length - 3);
}

async function loadCategoriesForDropdown() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const select = document.getElementById('product-category');
        select.innerHTML = '<option value="">Select Category</option>';
        
        categoriesSnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadProductsForDropdown() {
    try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const selects = [
            document.getElementById('stock-product-select'),
            document.getElementById('digital-product-select')
        ];
        
        selects.forEach(select => {
            if (!select) return;
            select.innerHTML = '<option value="">Select Product</option>';
            
            productsSnapshot.forEach(doc => {
                const product = doc.data();
                if (product.type === 'digital') {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = product.name;
                    select.appendChild(option);
                }
            });
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Export functions for global access
window.loadDashboardData = loadDashboardData;
window.loadProducts = loadProducts;
window.loadOrders = loadOrders;
window.loadInventory = loadInventory;
window.loadCustomers = loadCustomers;
window.loadCategories = loadCategories;
window.loadCoupons = loadCoupons;
window.loadTickets = loadTickets;
window.loadStaff = loadStaff;
window.loadDigitalStock = loadDigitalStock;
