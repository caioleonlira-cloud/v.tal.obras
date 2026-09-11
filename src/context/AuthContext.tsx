import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  User,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
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
  query,
  where,
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
  updateUserPassword: (uid: string, newPassword: string) => Promise<void>;
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
    if (!auth.currentUser || !isSystemAdminEmail(auth.currentUser.email)) {
      return;
    }
    try {
      const adminDocRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(adminDocRef);
      if (!snap.exists()) {
        const adminProfile: UserProfile = {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || INITIAL_ADMIN_EMAIL,
          name: auth.currentUser.displayName || 'Caio Lira',
          role: 'ADM',
          status: 'active',
          password: '123456',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(adminDocRef, adminProfile, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao verificar/criar admin doc:', e);
    }
  };

  // Reusable function to synchronize user profile from Firestore with retry and backoff
  const syncUserProfile = async (currentUser: User | any, attempt = 1): Promise<boolean> => {
    if (!currentUser || !currentUser.uid) return false;

    try {
      const currentLocalDate = new Date().toLocaleDateString('sv');
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      const isInitialAdmin = isSystemAdminEmail(currentUser.email);
      const defaultName =
        currentUser.displayName ||
        (isInitialAdmin ? 'Caio Lira' : currentUser.email?.split('@')[0] || 'Usuário');

      let syncedProfile: UserProfile;

      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        syncedProfile = {
          ...data,
          uid: currentUser.uid,
          role: isInitialAdmin ? ('ADM' as UserRole) : data.role,
        };
        if (isInitialAdmin && data.role !== 'ADM') {
          try {
            await setDoc(userDocRef, { role: 'ADM', updatedAt: new Date().toISOString() }, { merge: true });
          } catch (_) {}
        }
      } else {
        // Look up by email in case admin registered this user earlier under a temporary doc ID
        let existingData: UserProfile | null = null;
        let oldDocId: string | null = null;
        try {
          const cleanEmail = (currentUser.email || '').trim().toLowerCase();
          if (cleanEmail) {
            const usersCol = collection(db, 'users');
            const q = query(usersCol, where('email', '==', cleanEmail));
            const snap = await getDocs(q);
            if (!snap.empty) {
              existingData = snap.docs[0].data() as UserProfile;
              oldDocId = snap.docs[0].id;
            }
          }
        } catch (queryErr) {
          console.warn('Busca fallback de usuário por email:', queryErr);
        }

        // Se o usuário não foi previamente cadastrado pelo Administrador no Firestore e não é o Admin inicial do sistema
        if (!isInitialAdmin && !existingData) {
          await fbSignOut(auth);
          throw new Error('Acesso não autorizado. Usuário não cadastrado pelo Administrador.');
        }

        syncedProfile = {
          uid: currentUser.uid,
          email: currentUser.email?.toLowerCase() || '',
          name: existingData?.name || defaultName,
          role: isInitialAdmin ? 'ADM' : (existingData?.role || 'PADRAO'),
          status: existingData?.status || 'active',
          password: existingData?.password,
          createdAt: existingData?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(userDocRef, syncedProfile, { merge: true });
        } catch (writeErr) {
          console.warn('Tentativa de persistência do perfil no Firestore:', writeErr);
        }

        // Clean up temporary ID if it was different from currentUser.uid
        if (oldDocId && oldDocId !== currentUser.uid) {
          deleteDoc(doc(db, 'users', oldDocId)).catch(() => {});
        }
      }

      if (syncedProfile.status === 'inactive') {
        await fbSignOut(auth);
        throw new Error('Este usuário foi desativado pelo administrador.');
      }

      setProfile(syncedProfile);
      setUser({
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: syncedProfile.name,
      });

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(syncedProfile));
      if (!localStorage.getItem(SESSION_DATE_KEY)) {
        localStorage.setItem(SESSION_DATE_KEY, currentLocalDate);
      }
      if (!localStorage.getItem(SESSION_TIMESTAMP_KEY)) {
        localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
      }

      return true;
    } catch (err: any) {
      if (err.message && err.message.includes('desativado')) {
        throw err;
      }
      console.warn(`Tentativa ${attempt} de sincronizar perfil falhou:`, err?.message || err);
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
        return syncUserProfile(currentUser, attempt + 1);
      }
      console.error('Erro definitivo ao sincronizar perfil do usuário após retries:', err);
      return false;
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

        await syncUserProfile(currentUser);
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

    if (!cleanEmail || !cleanPass) {
      throw new Error('Por favor, informe o e-mail e a senha.');
    }

    let authUser: User | null = null;

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      authUser = cred.user;
    } catch (err: any) {
      const errCode = err?.code;

      if (errCode === 'auth/operation-not-allowed') {
        throw new Error(
          'O provedor Email/Senha não está ativado no Firebase Console. Acesse o Firebase Console > Authentication > Sign-in method e ative o provedor "E-mail/Senha".'
        );
      }

      // Se for primeira inicialização da conta do administrador com a senha padrão inicial 123456
      if (
        (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential') &&
        isSystemAdminEmail(cleanEmail) &&
        cleanPass === '123456'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, '123456');
          authUser = cred.user;
        } catch {
          throw new Error('E-mail ou senha incorretos.');
        }
      } else if (errCode === 'auth/wrong-password' || errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential') {
        throw new Error('E-mail ou senha incorretos.');
      } else if (errCode === 'auth/user-disabled') {
        throw new Error('Este usuário foi desativado pelo administrador.');
      } else if (errCode === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.');
      } else {
        throw new Error(err?.message || 'E-mail ou senha incorretos.');
      }
    }

    if (!authUser) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const synced = await syncUserProfile(authUser);
    if (!synced) {
      throw new Error('Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.');
    }
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

    if (auth.currentUser && auth.currentUser.email) {
      try {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, oldPass);
        await reauthenticateWithCredential(auth.currentUser, cred);
        await updatePassword(auth.currentUser, newPass);
      } catch (err: any) {
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          throw new Error('A senha atual informada está incorreta.');
        }
        if (err.code === 'auth/weak-password') {
          throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
        }
        // Fallback: tentar atualizar direto caso o provedor permita
        try {
          await updatePassword(auth.currentUser, newPass);
        } catch (upErr: any) {
          console.warn('Firebase Auth updatePassword error:', upErr.message);
        }
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

  const updateUserPassword = async (uid: string, newPassword: string) => {
    if (!isAdmin) {
      throw new Error('Apenas administradores podem alterar senhas de outros usuários.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
    }

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      password: newPassword,
      updatedAt: new Date().toISOString(),
    });

    setUsersList((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, password: newPassword } : u))
    );
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
        updateUserPassword,
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
