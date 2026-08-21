# SXC Shop - Customer Review Carousel

## Overview

A premium, responsive, horizontal review carousel has been implemented for the SXC Shop website. The carousel displays customer reviews in a modern, swipeable interface that works seamlessly across desktop, tablet, and mobile devices.

## Features

### Visual Design
- **Premium Card Design**: Clean, minimal cards with subtle borders and shadows
- **Star Ratings**: Visual 5-star rating system using Font Awesome icons
- **Verified Purchase Badge**: Shows verified purchase status when applicable
- **Responsive Layout**: 
  - Desktop (≥1024px): 3 cards visible
  - Tablet (768px-1023px): 2 cards visible  
  - Mobile (≤767px): 1 card visible

### Interaction
- **Navigation Buttons**: Previous/Next buttons with hover states
- **Touch/Swipe Support**: Swipe left/right on touch devices
- **Mouse Drag**: Click and drag on desktop
- **Keyboard Navigation**: Arrow keys for accessibility
- **Pagination Dots**: Visual indicators on mobile
- **Smooth Transitions**: CSS transitions with proper easing

### Functionality
- **Average Rating Display**: Shows overall rating summary
- **Helpful Button**: Users can mark reviews as helpful (requires login)
- **Dynamic Loading**: Reviews loaded from Firebase Firestore
- **No Horizontal Scroll**: Prevents accidental page scrolling

## Firestore Database Structure

To add reviews to your store, create a `reviews` collection in Firebase Firestore with the following structure:

```javascript
{
  // Required fields
  rating: 5,                    // Number 1-5
  comment: "Great product!",    // Review text
  customerName: "John Doe",     // Customer name
  createdAt: Timestamp,         // Firebase timestamp
  
  // Optional fields
  title: "Excellent Quality",   // Review title
  verifiedPurchase: true,       // Boolean
  dateAgo: "2 days ago",        // String
  helpfulCount: 12,             // Number
  votedUsers: ["uid1", "uid2"], // Array of user IDs who voted
  productId: "product123",      // Associated product ID
  customerId: "customer-uid"    // Firebase auth UID
}
```

## How to Add Reviews

### Option 1: Firebase Console
1. Go to Firebase Console → Firestore Database
2. Create a new collection called `reviews`
3. Add documents with the structure above

### Option 2: Admin Panel (Future Enhancement)
You can extend the admin panel to include review management where admins can:
- Add manual reviews
- Import reviews from CSV
- Moderate pending reviews
- Respond to reviews

## Code Files Modified

### 1. `/app.js`
Added the following functions:
- `loadReviews()` - Fetches reviews from Firestore
- `calculateAverageRating()` - Calculates average star rating
- `renderStars(rating)` - Generates star HTML
- `renderReviewCarousel()` - Creates carousel HTML
- `initReviewCarousel()` - Initializes carousel interactions
- `markHelpful(reviewId)` - Handles helpful votes
- `renderHomePage()` - Updated to include review carousel

### 2. `/style.css`
Added comprehensive styles for:
- `.reviews-section` - Main section container
- `.carousel-container` - Navigation and track
- `.review-card` - Individual review cards
- `.carousel-btn` - Previous/Next buttons
- `.pagination-dot` - Mobile pagination
- Responsive breakpoints for all screen sizes

### 3. `/index.html`
No changes required - carousel is injected dynamically via JavaScript

## Usage

The review carousel automatically appears on the homepage below the featured products section when reviews exist in the database.

If no reviews exist, the section will not be displayed.

## Accessibility

- ✅ Keyboard navigation (Arrow keys)
- ✅ Screen reader friendly (ARIA labels)
- ✅ Focus states for interactive elements
- ✅ Semantic HTML structure
- ✅ Touch-friendly targets (44px minimum)

## Performance

- Lightweight implementation (no external carousel libraries)
- CSS hardware acceleration (`will-change: transform`)
- Passive event listeners for touch events
- Efficient DOM updates

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customization

### Change Cards Per View
Edit `getCardsPerView()` function in `initReviewCarousel()`:

```javascript
function getCardsPerView() {
    if (window.innerWidth >= 1024) return 3; // Desktop
    if (window.innerWidth >= 768) return 2;  // Tablet
    return 1;                                 // Mobile
}
```

### Modify Styling
Update CSS variables in `style.css`:
- Colors: `--color-primary`, `--color-accent`
- Spacing: `--spacing-*` variables
- Border radius: `--radius-*` variables
- Shadows: `--shadow-*` variables

### Animation Speed
Modify transition duration in `.carousel-track`:
```css
.carousel-track {
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Future Enhancements

Potential features to add:
1. **Photo Reviews**: Support customer-uploaded images in reviews
2. **Review Replies**: Allow admin responses to reviews
3. **Review Filtering**: Filter by rating, verified purchase, etc.
4. **Product-Specific Reviews**: Show reviews per product page
5. **Review Submission Form**: Allow customers to submit reviews
6. **Email Notifications**: Notify admins of new reviews
7. **Review Moderation**: Approve/review before publishing

## Troubleshooting

### Carousel Not Showing
- Check if reviews exist in Firestore
- Verify Firebase configuration is correct
- Check browser console for errors

### Swipe Not Working
- Ensure touch events are not blocked by other scripts
- Test on actual touch device (some emulators don't support touch)

### Styling Issues
- Clear browser cache
- Verify `style.css` is properly linked
- Check for CSS conflicts with other styles

## Support

For issues or questions, contact: support@sxc-shop.xyz

---

**Version**: 1.0  
**Last Updated**: 2024  
**Author**: SXC Shop Development Team
