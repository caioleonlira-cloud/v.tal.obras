import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import autoConfig from '../../firebase-applet-config.json';

const LOCAL_STORAGE_FIREBASE_KEY = 'vtal_custom_firebase_config';

export interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseId?: string;
}

// Read from localStorage if user saved custom credentials in app
function getStoredConfig(): Partial<FirebaseConfigType> | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_FIREBASE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

const env = (import.meta as any)?.env || {};
const storedConfig = getStoredConfig();

function resolveValue(userVal?: string, envVal?: string, autoVal?: string): string {
  if (userVal && typeof userVal === 'string' && userVal.trim()) return userVal.trim();
  const placeholders = [
    'authdomain',
    'appid',
    'projectid',
    'default',
    'apikey',
    'storagebucket',
    'messagingsenderid',
    'undefined',
    'null',
  ];
  if (envVal && typeof envVal === 'string' && envVal.trim()) {
    const trimmed = envVal.trim();
    if (!placeholders.includes(trimmed.toLowerCase())) {
      return trimmed;
    }
  }
  if (autoVal && typeof autoVal === 'string' && autoVal.trim()) return autoVal.trim();
  return '';
}

export const firebaseConfig: FirebaseConfigType = {
  apiKey: resolveValue(storedConfig?.apiKey, env.VITE_FIREBASE_API_KEY, autoConfig?.apiKey),
  authDomain: resolveValue(storedConfig?.authDomain, env.VITE_FIREBASE_AUTH_DOMAIN, autoConfig?.authDomain),
  projectId: resolveValue(storedConfig?.projectId, env.VITE_FIREBASE_PROJECT_ID, autoConfig?.projectId),
  storageBucket: resolveValue(storedConfig?.storageBucket, env.VITE_FIREBASE_STORAGE_BUCKET, autoConfig?.storageBucket),
  messagingSenderId: resolveValue(storedConfig?.messagingSenderId, env.VITE_FIREBASE_MESSAGING_SENDER_ID, autoConfig?.messagingSenderId),
  appId: resolveValue(storedConfig?.appId, env.VITE_FIREBASE_APP_ID, autoConfig?.appId),
  databaseId: resolveValue(storedConfig?.databaseId, env.VITE_FIREBASE_DATABASE_ID, (autoConfig as any)?.firestoreDatabaseId),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== '' &&
  firebaseConfig.apiKey !== 'undefined' &&
  !firebaseConfig.apiKey.startsWith('dummy-') &&
  !firebaseConfig.apiKey.startsWith('AIzaSyDummy')
);

export const missingFirebaseEnvVars: string[] = [];
if (!firebaseConfig.apiKey) missingFirebaseEnvVars.push('VITE_FIREBASE_API_KEY');
if (!firebaseConfig.authDomain) missingFirebaseEnvVars.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!firebaseConfig.projectId) missingFirebaseEnvVars.push('VITE_FIREBASE_PROJECT_ID');
if (!firebaseConfig.storageBucket) missingFirebaseEnvVars.push('VITE_FIREBASE_STORAGE_BUCKET');
if (!firebaseConfig.messagingSenderId) missingFirebaseEnvVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
if (!firebaseConfig.appId) missingFirebaseEnvVars.push('VITE_FIREBASE_APP_ID');

export function saveCustomFirebaseConfig(config: Partial<FirebaseConfigType>) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_FIREBASE_KEY, JSON.stringify(config));
    window.location.reload();
  }
}

export function clearCustomFirebaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_FIREBASE_KEY);
    window.location.reload();
  }
}

// Safe initial config to avoid throwing if empty
const safeConfig = {
  apiKey: firebaseConfig.apiKey || 'AIzaSyDummyKeyForSafeInitialization00000000',
  authDomain: firebaseConfig.authDomain || 'vtal-obras-app.firebaseapp.com',
  projectId: firebaseConfig.projectId || 'vtal-obras-app',
  storageBucket: firebaseConfig.storageBucket || 'vtal-obras-app.appspot.com',
  messagingSenderId: firebaseConfig.messagingSenderId || '1234567890',
  appId: firebaseConfig.appId || '1:1234567890:web:abcdef1234567890',
};

const rawDatabaseId = firebaseConfig.databaseId;
const firestoreDatabaseId =
  rawDatabaseId &&
  rawDatabaseId.trim() !== '' &&
  rawDatabaseId !== 'undefined' &&
  rawDatabaseId.trim() !== '(default)'
    ? rawDatabaseId.trim()
    : undefined;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(safeConfig) : getApp();
} catch (e) {
  console.warn('Firebase initializeApp fallback:', e);
  app = getApps().length === 0 ? initializeApp({ apiKey: 'AIzaSyDummyKeyForSafeInitialization00000000', projectId: 'vtal-obras-app' }, 'fallback-app') : getApp();
}

try {
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase getAuth fallback:', e);
  auth = getAuth(app);
}

try {
  // Configure persistent IndexedDB cache with multi-tab support
  if (typeof window !== 'undefined') {
    if (firestoreDatabaseId) {
      db = initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        firestoreDatabaseId
      );
    } else {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    }
  } else {
    db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase initializeFirestore persistent cache fallback:', e);
  try {
    db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  } catch (err) {
    console.warn('Firebase getFirestore fallback:', err);
    db = getFirestore(app);
  }
}

export { app, auth, db };
export default app;

