// Firebase web app config (Firebase console → Project settings → Your apps → Web app → "SDK setup and configuration").
// These values are meant to be public: they identify the Firebase project, they don't grant access.
// Security comes from Firebase Authentication's authorized domains and the Firestore rules in firestore.rules.
//
// Public Firebase web-app settings can be supplied through VITE_FIREBASE_* variables.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);
