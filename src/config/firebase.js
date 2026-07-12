import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

// Config comes from .env (gitignored) — see .env.example for the shape. A
// Firebase web apiKey isn't a secret (it's scoped by Firestore security
// rules, not by hiding it), but env vars keep it out of source anyway.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

// Analytics requires browser support checks (fails in some embedded/webview
// contexts) and is irrelevant outside a real browser tab, so it's resolved
// lazily via a promise rather than a plain export.
export const analyticsReady = analyticsIsSupported().then((ok) => (ok ? getAnalytics(firebaseApp) : null));
