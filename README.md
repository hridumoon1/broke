# SXC Shop - E-commerce Platform with Firebase

A complete e-commerce solution built with HTML, CSS, JavaScript and Firebase. Features automatic digital product delivery, inventory management, and a comprehensive admin panel.

## Features

### Customer Features
- Browse products (Digital & Physical)
- Shopping cart system
- Multiple payment methods (bKash, Nagad, SSLCommerz)
- Order tracking
- Support ticket system
- User authentication via Google

### Admin Panel Features
- **Dashboard**: Revenue stats, order overview
- **Products Management**: Create, edit, delete products
- **Orders Management**: View, filter, fulfill orders
- **Digital Stock Inventory**: Upload license keys, codes, credentials
- **Customers**: View customer list
- **Settings**: Customize site name, logo, colors, social links
- **Admin Access Control**: Add/remove admin emails

### Intelligent Fulfillment System
- Automatic payment verification
- Inventory reservation
- **Digital Products**: Auto-delivery of keys/codes
- **Physical Products**: Manual fulfillment workflow
- Never deliver same digital stock twice
- Track used/unused digital items

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication** → Enable Google Sign-in
   - **Firestore Database** → Create database in production mode
   - **Storage** → Enable for logo/product images

4. Get your Firebase config:
   - Project Settings → General → Your apps → SDK setup and configuration
   - Copy the config object

5. Update `app.js` line 7-13 with your config:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

### 2. Firestore Security Rules

Set these rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public read access for products and settings
    match /products/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true;
    }
    
    match /settings/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true;
    }
    
    // Orders: users can read their own, admins can read all
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (resource.data.customerId == request.auth.uid || 
         get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true;
    }
    
    // Admins collection - only admins can read
    match /admins/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true);
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tickets
    match /tickets/{ticketId} {
      allow read, write: if request.auth != null;
    }
    
    // Notifications
    match /notifications/{notifId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true;
    }
    
    // Digital stock subcollection
    match /products/{productId}/digital_stock/{stockId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.isAllowed == true;
    }
  }
}
```

### 3. Create First Admin

After deploying, you need to manually add your first admin in Firestore:

1. Go to Firebase Console → Firestore Database
2. Create collection: `admins`
3. Add document with ID: `your-email@gmail.com`
4. Add fields:
   - `email`: "your-email@gmail.com" (string)
   - `isAllowed`: true (boolean)
   - `addedAt`: [current timestamp] (timestamp)
   - `addedBy`: "system" (string)

### 4. Deploy the Website

You can deploy using:

#### Option A: Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your project, set public directory as current folder
firebase deploy
```

#### Option B: Netlify
1. Drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)

#### Option C: Vercel
```bash
npm install -g vercel
vercel
```

#### Option D: Local Testing
Use Live Server extension in VS Code or:
```bash
npx http-server -p 8080
```

### 5. Payment Gateway Integration

#### bKash/Nagad (Manual)
- Already configured for manual payment
- Update phone numbers in `app.js` line 537

#### SSLCommerz (Automatic)
1. Register at [SSLCommerz](https://sslcommerz.com/)
2. Get Store ID and API Key
3. Implement payment initiation in `handleCheckout()` function
4. Add validation endpoint (requires backend/Cloud Functions)

## Usage Guide

### For Customers
1. Visit the website
2. Browse products
3. Add to cart
4. Login with Google
5. Checkout with payment method
6. For digital products: receive keys instantly after payment
7. Track orders in profile

### For Admins
1. Login with approved Gmail account
2. Click "Admin Panel" button
3. Manage:
   - **Products**: Add/Edit/Delete products
   - **Digital Stock**: Upload keys (one per line)
   - **Orders**: View, filter, manually fulfill
   - **Settings**: Change site appearance
   - **Admin Access**: Add other admin emails

### Adding Digital Stock
1. Go to Admin Panel → Digital Stock
2. Select a digital product
3. Enter keys/codes (one per line):
```
KEY-001-ABC
KEY-002-XYZ
LICENSE-12345
```
4. Click "Add Stock"
5. System automatically delivers unused keys on purchase

## Database Structure

```
Firestore Collections:
├── admins/{email}
│   ├── email: string
│   ├── isAllowed: boolean
│   ├── addedAt: timestamp
│   └── addedBy: string
│
├── products/{productId}
│   ├── name: string
│   ├── description: string
│   ├── price: number
│   ├── oldPrice: number
│   ├── discount: number
│   ├── stock: number
│   ├── type: "digital" | "physical"
│   ├── category: string
│   ├── image: string
│   ├── status: "active" | "inactive"
│   └── createdAt: timestamp
│   └── digital_stock/{stockId} (subcollection)
│       ├── key: string
│       ├── status: "unused" | "used"
│       ├── assignedTo: string
│       ├── assignedToEmail: string
│       ├── orderId: string
│       └── usedAt: timestamp
│
├── orders/{orderId}
│   ├── customerId: string
│   ├── customerEmail: string
│   ├── customerName: string
│   ├── customerPhone: string
│   ├── customerAddress: string
│   ├── items: array
│   ├── subtotal: number
│   ├── shippingFee: number
│   ├── discount: number
│   ├── tax: number
│   ├── total: number
│   ├── paymentMethod: string
│   ├── paymentStatus: "pending" | "paid" | "failed"
│   ├── trxId: string
│   ├── deliveryStatus: "pending" | "processing" | "delivered" | "cancelled"
│   ├── fulfillmentStatus: "pending" | "processing" | "fulfilled" | "failed"
│   ├── isDigitalOnly: boolean
│   ├── digitalDeliveryInfo: array
│   ├── orderDate: timestamp
│   └── fulfilledAt: timestamp
│
├── settings/site
│   ├── siteName: string
│   ├── primaryColor: string
│   ├── logoUrl: string
│   ├── contactInfo: string
│   └── socialLinks: object
│
├── users/{userId}
│   ├── name: string
│   ├── email: string
│   └── createdAt: timestamp
│
├── tickets/{ticketId}
│   ├── subject: string
│   ├── message: string
│   ├── email: string
│   ├── status: "open" | "closed"
│   └── createdAt: timestamp
│
└── notifications/{notifId}
    ├── email: string
    ├── type: string
    ├── data: object
    └── sent: boolean
```

## Customization

### Change Colors
Admin Panel → Settings → Primary Color

### Add Logo
Admin Panel → Settings → Logo URL (upload image to Firebase Storage first)

### Update Contact Info
Admin Panel → Settings → Contact Info & Social Links

### Add More Admin Emails
Admin Panel → Admin Access → Add Admin Email

## Troubleshooting

### Admin Button Not Showing
- Check if your email is added to `admins` collection
- Verify `isAllowed` field is `true`
- Logout and login again

### Products Not Loading
- Check Firestore rules
- Ensure products have `status: "active"`
- Check browser console for errors

### Digital Delivery Not Working
- Ensure product type is "digital"
- Check if digital_stock subcollection has unused items
- Verify Firestore security rules allow writing to subcollections

### Payment Verification Issues
- For manual payments, admin must verify TrxID
- For SSLCommerz, implement proper callback handling

## Security Notes

1. **Never commit Firebase config with real keys to public repositories**
2. Use environment variables in production
3. Keep Firestore rules updated
4. Regularly backup your database
5. Monitor admin access logs

## Support

For issues or questions:
- Check browser console for errors
- Review Firebase Console logs
- Contact: support@sxc-shop.xyz

## License

This project is proprietary software for SXC Shop.

---

Built with ❤️ using HTML, CSS, JavaScript & Firebase
