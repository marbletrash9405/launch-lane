// Firebase web app config (Firebase console → Project settings → Your apps → Web app → "SDK setup and configuration").
// These values are meant to be public: they identify the Firebase project, they don't grant access.
// Security comes from Firebase Authentication's authorized domains and the Firestore rules in firestore.rules.
//
// Paste the values from your firebaseConfig below, OR set NEXT_PUBLIC_FIREBASE_* variables in Vercel.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);
