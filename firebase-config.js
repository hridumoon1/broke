// =========================================
// FIREBASE CONFIGURATION
// =========================================
// IMPORTANT: This file should NOT be committed to GitHub
// Add your Firebase configuration below

const firebaseConfig = {
  // TODO: Replace with your Firebase project config
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (only if Firebase SDK is loaded)
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
}
