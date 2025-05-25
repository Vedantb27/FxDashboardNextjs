import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCbwGQNSHp-cHNv3FhRvUP78ot8vWDNCgg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tradeauth-81fcd.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tradeauth-81fcd",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tradeauth-81fcd.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "116898791616",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:116898791616:web:0364408131c87fbad2ad25",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-JBNEQR2CNB",
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