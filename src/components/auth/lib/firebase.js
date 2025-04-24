import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBLJN7Hz9V4pUDiYX4jMRWBkbJ5ORPbj40",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "authdummy-819cf.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "authdummy-819cf",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "authdummy-819cf.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "768252241737",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:768252241737:web:32e8d96b266a07cc9a5c98",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-WTVLZKTXPY",
};

// Validate configuration
const requiredConfigFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFields = requiredConfigFields.filter(
  (field) => !firebaseConfig[field]
);
if (missingFields.length > 0) {
  console.error(`Missing Firebase config fields: ${missingFields.join(', ')}`);
  throw new Error(`Missing Firebase config fields: ${missingFields.join(', ')}`);
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };