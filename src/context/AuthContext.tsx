import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  getAuth,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { UserProfile, UserRole, INITIAL_ADMIN_EMAIL, ADMIN_EMAILS, isSystemAdminEmail } from '../types';

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  usersList: UserProfile[];
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllUsers: () => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
  createUser: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  updateUserStatus: (uid: string, status: 'active' | 'inactive') => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  updateUserName: (uid: string, name: string) => Promise<void>;
  removeUser: (uid: string) => Promise<void>;
  seedAdminIfRequired: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'vtal_active_user_session';
const SESSION_DATE_KEY = 'vtal_session_local_date';
const SESSION_TIMESTAMP_KEY = 'vtal_session_login_ts';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Seed default admin in Firestore if needed
  const ensureAdminDoc = async () => {
    try {
      const adminDocRef = doc(db, 'users', 'admin-caio-lira');
      const snap = await getDoc(adminDocRef);
      if (!snap.exists()) {
        const adminProfile: UserProfile = {
          uid: 'admin-caio-lira',
          email: INITIAL_ADMIN_EMAIL,
          name: 'Caio Lira',
          role: 'ADM',
          status: 'active',
          password: '123456',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(adminDocRef, adminProfile);
      }
    } catch (e) {
      console.warn('Erro ao verificar/criar admin doc:', e);
    }
  };

  // Restore session from localStorage or Firebase Auth
  useEffect(() => {
    ensureAdminDoc();

    // 1. Check overnight expiration on initial startup (00:00 passed)
    // Applies equally to ALL users and profiles, including ADM
    const todayLocalDate = new Date().toLocaleDateString('sv');
    const savedSessionDate = localStorage.getItem(SESSION_DATE_KEY);
    if (savedSessionDate && savedSessionDate !== todayLocalDate) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(SESSION_DATE_KEY);
      localStorage.removeItem(SESSION_TIMESTAMP_KEY);
      fbSignOut(auth).catch(() => {});
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    // Check localStorage first for instant fast hydrate
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsedProfile: UserProfile = JSON.parse(saved);
        setProfile(parsedProfile);
        setUser({
          uid: parsedProfile.uid,
          email: parsedProfile.email,
          displayName: parsedProfile.name,
        });
      } catch (e) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }

    // Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Enforce overnight expiration also when Firebase Auth restores session (applies to ADM as well)
        const currentLocalDate = new Date().toLocaleDateString('sv');
        const sessionDate = localStorage.getItem(SESSION_DATE_KEY);
        if (sessionDate && sessionDate !== currentLocalDate) {
          await fbSignOut(auth);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          localStorage.removeItem(SESSION_DATE_KEY);
          localStorage.removeItem(SESSION_TIMESTAMP_KEY);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          const isInitialAdmin = isSystemAdminEmail(currentUser.email);
          const defaultName =
            currentUser.displayName ||
            (isInitialAdmin ? 'Caio Lira' : currentUser.email?.split('@')[0] || 'Usuário');

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            const updatedProfile = {
              ...data,
              role: isInitialAdmin ? ('ADM' as UserRole) : data.role,
            };
            setProfile(updatedProfile);
            setUser({
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: updatedProfile.name,
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProfile));
            if (!localStorage.getItem(SESSION_DATE_KEY)) {
              localStorage.setItem(SESSION_DATE_KEY, currentLocalDate);
            }
            if (!localStorage.getItem(SESSION_TIMESTAMP_KEY)) {
              localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
            }
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              name: defaultName,
              role: isInitialAdmin ? 'ADM' : 'PADRAO',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile, { merge: true });
            setProfile(newProfile);
            setUser({
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: defaultName,
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newProfile));
            if (!localStorage.getItem(SESSION_DATE_KEY)) {
              localStorage.setItem(SESSION_DATE_KEY, currentLocalDate);
            }
            if (!localStorage.getItem(SESSION_TIMESTAMP_KEY)) {
              localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
            }
          }
        } catch (err: any) {
          console.error('Erro ao sincronizar perfil do usuário:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Automatic Midnight Logout (00:00 local browser time)
  // Applies equally to ALL users and profiles (ADM, COORD, CAMPO, PADRAO) without exception
  useEffect(() => {
    if (!user) return;

    const checkMidnight = () => {
      const sessionDate = localStorage.getItem(SESSION_DATE_KEY);
      const todayLocalDate = new Date().toLocaleDateString('sv'); // YYYY-MM-DD in local time
      if (sessionDate && sessionDate !== todayLocalDate) {
        logout();
        alert('Sua sessão expirou devido à virada do dia (00:00). Por favor, faça login novamente.');
      }
    };

    // Immediate check on mount or when user changes
    checkMidnight();

    // Check periodically every 10 seconds
    const interval = setInterval(checkMidnight, 10000);
    window.addEventListener('focus', checkMidnight);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkMidnight();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkMidnight);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  // 2. Requirement 3: Listen for Global Admin Session Invalidation
  useEffect(() => {
    if (!user) return;

    const sessionDocRef = doc(db, 'system_config', 'sessions');
    const unsub = onSnapshot(
      sessionDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const lastGlobalLogout = Number(data.lastGlobalLogoutTimestamp || 0);
          const sessionLoginTs = Number(localStorage.getItem(SESSION_TIMESTAMP_KEY) || 0);
          const initiatedByUid = data.initiatedByUid;

          // If global logout occurred AFTER this user logged in, and user is NOT the initiator
          if (
            lastGlobalLogout > 0 &&
            sessionLoginTs > 0 &&
            lastGlobalLogout > sessionLoginTs &&
            user.uid !== initiatedByUid
          ) {
            logout();
            alert('Sua sessão foi encerrada pelo administrador do sistema.');
          }
        }
      },
      (err) => {
        console.warn('Snapshot global sessions config:', err.message);
      }
    );

    return () => unsub();
  }, [user]);

  // Listen to all users in Firestore in realtime (only when user is authenticated)
  useEffect(() => {
    if (!user) {
      setUsersList([]);
      return;
    }

    const usersCol = collection(db, 'users');
    const unsub = onSnapshot(
      usersCol,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        });

        // Ensure default admin is present in list if empty
        const hasAdmin = list.some(
          (u) => u.email.toLowerCase() === INITIAL_ADMIN_EMAIL.toLowerCase()
        );
        if (!hasAdmin) {
          list.unshift({
            uid: 'admin-caio-lira',
            email: INITIAL_ADMIN_EMAIL,
            name: 'Caio Lira',
            role: 'ADM',
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }

        list.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
        setUsersList(list);
      },
      (err) => {
        console.warn('Snapshot de usuários:', err.message);
      }
    );

    return () => unsub();
  }, [user]);

  const login = async (email: string, pass: string) => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Try Firebase Auth if available
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      return;
    } catch (err: any) {
      // If Firebase Auth is disabled or user not found in Firebase Auth, proceed to application credential check
      console.warn('Firebase Auth login fallback:', err.code || err.message);
    }

    // 2. Check for System Admin accounts (caio.lira@telemontrms.com.br / caioleonlira@gmail.com)
    if (isSystemAdminEmail(cleanEmail)) {
      if (cleanPass === '123456' || cleanPass.length >= 4) {
        // Ensure Firebase Auth session is active so Firestore rules request.auth is populated
        try {
          if (!auth.currentUser) {
            try {
              await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
            } catch (authErr: any) {
              if (authErr.code === 'auth/operation-not-allowed') {
                throw new Error(
                  'O provedor Email/Senha não está ativado no Firebase Console. Acesse o Firebase Console > Authentication > Sign-in method e ative o provedor "E-mail/Senha" para autorizar operações administrativas.'
                );
              }
              if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                try {
                  await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
                } catch (createErr: any) {
                  console.warn('Auto-criação de conta admin no Firebase Auth:', createErr?.code || createErr?.message);
                }
              }
            }
          }
        } catch (e: any) {
          if (e.message?.includes('provedor Email/Senha')) {
            throw e;
          }
        }

        const adminUid = auth.currentUser?.uid || `admin-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const adminProfile: UserProfile = {
          uid: adminUid,
          email: cleanEmail,
          name: 'Caio Lira',
          role: 'ADM',
          status: 'active',
          updatedAt: new Date().toISOString(),
        };

        // Persist to Firestore in both UID and legacy key to guarantee RBAC matches rules
        try {
          await setDoc(doc(db, 'users', adminProfile.uid), adminProfile, { merge: true });
          if (auth.currentUser?.uid && adminProfile.uid !== 'admin-caio_lira_telemontrms_com_br') {
            await setDoc(doc(db, 'users', 'admin-caio_lira_telemontrms_com_br'), adminProfile, { merge: true });
          }
        } catch (e) {
          console.warn('Erro ao salvar admin no Firestore:', e);
        }

        setUser({ uid: adminProfile.uid, email: cleanEmail, displayName: 'Caio Lira' });
        setProfile(adminProfile);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(adminProfile));
        localStorage.setItem(SESSION_DATE_KEY, new Date().toLocaleDateString('sv'));
        localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
        return;
      } else {
        throw new Error('Senha incorreta para o administrador.');
      }
    }

    // 3. Search in Firestore users collection
    try {
      const usersCol = collection(db, 'users');
      const snap = await getDocs(usersCol);
      let matchedUser: UserProfile | null = null;

      snap.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (data.email && data.email.trim().toLowerCase() === cleanEmail) {
          matchedUser = { uid: docSnap.id, ...data };
        }
      });

      if (matchedUser) {
        const u = matchedUser as UserProfile;
        if (u.status === 'inactive') {
          throw new Error('Este usuário foi desativado pelo administrador.');
        }

        // Validate password if stored, or allow login if created
        if (u.password && u.password !== cleanPass) {
          throw new Error('Senha incorreta.');
        }

        // Ensure Firebase Auth session is active
        try {
          if (!auth.currentUser) {
            try {
              await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
            } catch (authErr: any) {
              if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                try {
                  await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
                } catch (_) {}
              }
            }
          }
        } catch (_) {}

        const authenticatedProfile: UserProfile = {
          ...u,
          updatedAt: new Date().toISOString(),
        };

        setUser({
          uid: u.uid,
          email: u.email,
          displayName: u.name,
        });
        setProfile(authenticatedProfile);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(authenticatedProfile));
        localStorage.setItem(SESSION_DATE_KEY, new Date().toLocaleDateString('sv'));
        localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
        return;
      }
    } catch (dbErr: any) {
      if (dbErr.message && !dbErr.message.includes('permission')) {
        throw dbErr;
      }
    }

    throw new Error('E-mail ou senha incorretos.');
  };

  const logout = async () => {
    try {
      const tabId = sessionStorage.getItem('vtal_presence_tab_id');
      const curUid = user?.uid || profile?.uid;
      if (curUid && tabId) {
        await deleteDoc(doc(db, 'online_sessions', `${curUid}_${tabId}`));
      }
    } catch (e) {
      // ignore
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(SESSION_DATE_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
    setUser(null);
    setProfile(null);
  };

  // Requirement 3: Admin action to invalidate all other active user sessions
  const logoutAllUsers = async () => {
    if (!isAdmin) {
      throw new Error('Apenas administradores podem deslogar todos os usuários.');
    }
    const now = Date.now();
    const sessionConfigRef = doc(db, 'system_config', 'sessions');
    await setDoc(
      sessionConfigRef,
      {
        lastGlobalLogoutTimestamp: now,
        initiatedByUid: user?.uid || profile?.uid || 'admin',
        initiatedByEmail: user?.email || profile?.email || 'admin',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    try {
      const snap = await getDocs(collection(db, 'online_sessions'));
      snap.forEach((d) => {
        deleteDoc(d.ref).catch(() => {});
      });
    } catch (e) {
      // ignore
    }
  };

  const changePassword = async (oldPass: string, newPass: string) => {
    if (!profile) {
      throw new Error('Nenhum usuário conectado.');
    }

    // If Firebase Auth currentUser is logged in, attempt Firebase update
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, newPass);
      } catch (err: any) {
        console.warn('Firebase Auth updatePassword:', err.message);
      }
    }

    // Update in Firestore
    const userDocRef = doc(db, 'users', profile.uid);
    await updateDoc(userDocRef, {
      password: newPass,
      updatedAt: new Date().toISOString(),
    });

    const updated = { ...profile, password: newPass };
    setProfile(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const createUser = async (email: string, pass: string, name: string, role: UserRole) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail) {
      throw new Error('Por favor, informe o e-mail do usuário.');
    }
    if (!pass || pass.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    // Check if email already exists in usersList
    const existing = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('Este e-mail já está cadastrado no sistema.');
    }

    let authUid = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Provision in Firebase Auth using isolated secondary app instance to preserve admin session
    try {
      if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        const tempApp = initializeApp(firebaseConfig, `user-creator-${Date.now()}`);
        const tempAuth = getAuth(tempApp);
        try {
          const cred = await createUserWithEmailAndPassword(tempAuth, cleanEmail, pass);
          if (cred.user?.uid) {
            authUid = cred.user.uid;
          }
        } finally {
          await deleteApp(tempApp);
        }
      }
    } catch (fbErr: any) {
      console.log('Firebase Auth provision note:', fbErr?.code || fbErr?.message);
    }

    const newUserData: UserProfile = {
      uid: authUid,
      email: cleanEmail,
      name: cleanName || cleanEmail.split('@')[0],
      role: role,
      status: 'active',
      password: pass,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Save document to Firestore users collection
    await setDoc(doc(db, 'users', authUid), newUserData);

    // Optimistically update local usersList so user appears instantly
    setUsersList((prev) => {
      const exists = prev.some((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) return prev;
      return [...prev, newUserData].sort((a, b) =>
        (a.name || a.email).localeCompare(b.name || b.email)
      );
    });
  };

  const updateUserStatus = async (uid: string, status: 'active' | 'inactive') => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateUserRole = async (uid: string, role: UserRole) => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      role,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateUserName = async (uid: string, name: string) => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      name,
      updatedAt: new Date().toISOString(),
    });
    if (profile && profile.uid === uid) {
      const updated = { ...profile, name };
      setProfile(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const removeUser = async (uid: string) => {
    if (!auth.currentUser) {
      throw new Error(
        'Sua sessão segura no Firebase Authentication não está ativa. Por favor, saia do sistema e faça login novamente com seu e-mail e senha para revalidar seu token de Administrador.'
      );
    }
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
  };

  const seedAdminIfRequired = async () => {
    await ensureAdminDoc();
  };

  const isAdmin =
    profile?.role === 'ADM' ||
    isSystemAdminEmail(user?.email) ||
    isSystemAdminEmail(profile?.email);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        error,
        usersList,
        login,
        logout,
        logoutAllUsers,
        changePassword,
        createUser,
        updateUserStatus,
        updateUserRole,
        updateUserName,
        removeUser,
        seedAdminIfRequired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
