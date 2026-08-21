# SXC Shop - Complete E-commerce Platform with Admin Panel

A complete e-commerce solution built with HTML, CSS, JavaScript, and Firebase. Features an intelligent fulfillment system for both physical and digital products with automatic delivery.

## 🚀 Features

### Admin Panel
- **Google Authentication** - Secure login with authorized Gmail accounts only
- **Dashboard** - Real-time statistics and recent orders overview
- **Products Management** - Create, edit, delete physical & digital products
- **Orders Management** - Full order lifecycle tracking (Pending → Paid → Processing → Fulfilled → Shipped → Delivered)
- **Inventory Management** - Track stock levels with low-stock alerts
- **Digital Stock System** - Upload and manage digital items (keys, licenses, accounts, etc.)
- **Customers Management** - View customer data and order history
- **Categories Management** - Organize products into categories
- **Coupons System** - Create percentage or fixed discount coupons
- **Support Tickets** - Handle customer support requests
- **Payment Methods** - Configure SSLCommerz, bKash, Nagad
- **Settings** - Customize website name, logo, colors, footer, social links, contact info
- **Staff Permissions** - Add staff with custom roles and permissions

### Intelligent Fulfillment System
**For Digital Products:**
- Automatic delivery upon payment confirmation
- Unique item allocation (keys, licenses, accounts, credentials)
- Never deliver same item twice
- Mark items as USED/ASSIGNED automatically
- Support for multiple item types per product

**For Physical Products:**
- Shipping workflow with tracking
- Courier information management
- Delivery status updates
- Manual fulfillment option

### Payment Integration
- SSLCommerz
- bKash
- Nagad
- Configurable from admin panel without code editing

## 📁 File Structure

```
/workspace
├── firebase-config.js      # Firebase configuration
├── admin.html              # Admin panel interface
├── admin.js                # Admin panel logic
├── admin-style.css         # Admin panel styles
├── index.html              # Main website (to be created)
├── style.css               # Website styles (to be created)
├── app.js                  # Website logic (to be created)
└── README.md               # This file
```

## 🔧 Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the wizard
3. Enable the following services:
   - **Authentication** → Enable Google Sign-in
   - **Firestore Database** → Create database in production mode
   - **Storage** → Enable for file uploads

### Step 2: Configure Firebase

1. In Firebase Console, go to Project Settings
2. Scroll down to "Your apps" section
3. Click the Web icon (`</>`)
4. Register your app and copy the configuration
5. Open `firebase-config.js` and replace:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 3: Set Up Firestore Security Rules

In Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read
    match /{document=**} {
      allow read: if request.auth != null;
    }
    
    // Only admins can write to settings
    match /settings/{document=**} {
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/settings/general).data.adminEmails.contains(request.auth.token.email);
    }
    
    // Staff can manage products, orders, etc.
    match /products/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /orders/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /digital_stock/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /customers/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /categories/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /coupons/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /staff/{document=**} {
      allow write: if request.auth != null;
    }
    
    match /support_tickets/{document=**} {
      allow write: if request.auth != null;
    }
  }
}
```

### Step 4: Enable Google Authentication

1. Firebase Console → Authentication → Sign-in method
2. Click on "Google"
3. Enable it and add your project email
4. Save

### Step 5: First Admin Login

1. Open `admin.html` in your browser (use a local server like Live Server)
2. Click "Sign in with Google"
3. The first user to log in will automatically become the admin
4. Go to Settings → General to add more admin emails

### Step 6: Configure Admin Emails

In the admin panel:
1. Navigate to Settings → General
2. Add authorized admin emails (comma-separated)
3. Save changes

Example: `admin@sxc-shop.xyz, manager@sxc-shop.xyz`

### Step 7: Add Staff Members (Optional)

1. Go to Staff Permissions
2. Click "Add Staff"
3. Enter staff email
4. Select role (Admin, Manager, Support, Fulfillment)
5. Assign specific permissions
6. Save

## 🎨 Customization (Without Code Editing)

All customization can be done from the admin panel:

### Appearance
- Logo URL
- Favicon URL  
- Primary Color
- Secondary Color
- Accent Color

### General
- Website Name
- Admin Emails
- Currency (BDT, USD, EUR, GBP)

### Footer
- Footer Text
- Copyright Text

### Social Links
- Facebook, Twitter, Instagram, LinkedIn, YouTube URLs

### Contact Information
- Phone, Email, Address

### Payment Methods
- Enable/disable SSLCommerz, bKash, Nagad
- Configure payment gateway credentials

## 📦 Product Types

### Physical Products
- Inventory quantity tracking
- Shipping address required
- Delivery charge calculation
- Courier information
- Tracking number
- Order fulfillment workflow

### Digital Products
- Downloadable files
- License keys
- Serial keys
- Accounts/Credentials
- Codes
- Custom text delivery
- Automatic delivery on payment

## 🔐 Digital Stock Management

### How It Works:

1. **Upload Stock:**
   - Select a digital product
   - Enter items one per line:
     ```
     KEY-001
     KEY-002
     LICENSE-ABC-123
     account@example.com:password
     ```
   - Click "Upload Stock"

2. **Automatic Delivery:**
   - When customer purchases, system finds unused items
   - Marks items as "assigned" immediately
   - Sends to customer via email/order details
   - Updates status to "used" after delivery

3. **Stock Protection:**
   - Never delivers same item twice
   - Tracks assignment timestamp
   - Records which order received which item
   - Admin can view all assignments

## 📊 Order Statuses

- **Pending** - Order created, awaiting payment
- **Paid** - Payment confirmed
- **Processing** - Being prepared
- **Fulfilled** - Ready for shipment/delivery
- **Shipped** - On the way (physical products)
- **Delivered** - Customer received
- **Cancelled** - Order cancelled
- **Refunded** - Money returned
- **Failed** - Payment or processing failed

## 👥 Staff Roles & Permissions

### Roles:
- **Admin** - Full access to everything
- **Manager** - Can manage products, orders, customers
- **Support** - Can view orders, manage tickets
- **Fulfillment** - Can update order status, manage inventory

### Permissions:
- Products (create, edit, delete)
- Orders (view, update status)
- Inventory (manage stock)
- Customers (view, edit)
- Settings (modify site settings)
- Staff Management (add/remove staff)

## 🚨 Important Notes

1. **Security**: Always keep your Firebase config private
2. **Backups**: Regularly export Firestore data
3. **Testing**: Test payment integration in sandbox mode first
4. **SSL**: Use HTTPS in production
5. **Admin Emails**: Carefully manage who has admin access

## 🛠️ Troubleshooting

### Login Issues
- Ensure Google Auth is enabled in Firebase
- Check if email is in admin list or staff collection
- Clear browser cache and try again

### Data Not Loading
- Check Firebase security rules
- Verify Firestore is in production mode
- Check browser console for errors

### Digital Stock Not Delivering
- Ensure product type is set to "digital"
- Check if auto-deliver is enabled
- Verify available stock exists

## 📞 Support

For technical support or custom development, contact through the admin panel support ticket system.

---

**Version:** 1.0.0  
**License:** Proprietary  
**Created:** 2024
