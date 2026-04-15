import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';

// Debug logging for configuration (Redacted)
if (isFirebaseConfigured && typeof window !== 'undefined') {
  console.log('Firebase Configuration Detected:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    databaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)',
    hasApiKey: !!firebaseConfig.apiKey,
    hasAppId: !!firebaseConfig.appId
  });
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase API Key is missing. Please check your environment variables.');
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    dbInstance = getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)');
  }
  return dbInstance;
}

export function getAuthInstance(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

// Connection Test
export async function testFirestoreConnection() {
  if (!isFirebaseConfigured) return;
  try {
    const db = getDb();
    // Try to get a non-existent doc to test connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log('Firestore Connection: SUCCESS');
  } catch (error: any) {
    if (error.message?.includes('offline')) {
      console.error('Firestore Connection: FAILED (Offline). This usually means the Project ID is incorrect or the database has not been created in the Firebase Console.');
    } else {
      console.warn('Firestore Connection Test:', error.message);
    }
  }
}

// Run test on load
if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

// Exporting instances for backward compatibility, but they might throw if not configured
export const db = isFirebaseConfigured ? getDb() : null as unknown as Firestore;
export const auth = isFirebaseConfigured ? getAuthInstance() : null as unknown as Auth;

export default app;
