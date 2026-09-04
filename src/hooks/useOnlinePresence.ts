import { useEffect, useState, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export interface OnlineUserInfo {
  uid: string;
  email: string;
  name: string;
  role: string;
  connectionsCount: number;
  loginTimestamp?: number;
  isCurrent?: boolean;
}

interface PresenceUserLike {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

interface UseOnlinePresenceProps {
  user: PresenceUserLike | null;
  profile: UserProfile | null;
  isAdmin: boolean;
}

function getTabSessionId(): string {
  try {
    let id = sessionStorage.getItem('vtal_presence_tab_id');
    if (!id) {
      id = `tab_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem('vtal_presence_tab_id', id);
    }
    return id;
  } catch (e) {
    return `tab_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

export function useOnlinePresence({ user, profile, isAdmin }: UseOnlinePresenceProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserInfo[]>([]);
  const tabSessionId = useRef(getTabSessionId()).current;

  // 1. Register presence for ANY user on mount / login, and clean up on beforeunload / unmount
  // NO periodic heartbeat/polling. Only event-based (login/entry, close tab, logout)
  useEffect(() => {
    if (!user || !user.uid) {
      setOnlineUsers([]);
      return;
    }

    const docId = `${user.uid}_${tabSessionId}`;
    const sessionDocRef = doc(db, 'online_sessions', docId);
    const todayLocalDate = new Date().toLocaleDateString('sv'); // YYYY-MM-DD

    const sessionPayload = {
      tabSessionId,
      uid: user.uid,
      email: user.email || profile?.email || '',
      name: profile?.name || user.displayName || user.email || 'Usuário',
      role: profile?.role || 'PADRAO',
      date: todayLocalDate,
      loginTimestamp: Date.now(),
      updatedAt: new Date().toISOString(),
    };

    // Event: Login / Tab entry -> write once
    setDoc(sessionDocRef, sessionPayload, { merge: true }).catch((err) => {
      console.warn('Erro ao registrar sessão no Firestore:', err?.message);
    });

    // Event: Tab close / reload -> remove session doc
    const handleUnload = () => {
      try {
        deleteDoc(sessionDocRef).catch(() => {});
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      try {
        deleteDoc(sessionDocRef).catch(() => {});
      } catch (e) {
        // ignore
      }
    };
  }, [user?.uid, user?.email, profile?.name, profile?.role, tabSessionId]);

  // 2. Real-time subscription ONLY FOR ADM
  // Reads Firestore `online_sessions` collection. Non-ADMs never execute this listener.
  useEffect(() => {
    if (!isAdmin || !user) {
      setOnlineUsers([]);
      return;
    }

    const todayLocalDate = new Date().toLocaleDateString('sv');
    const sessionsCol = collection(db, 'online_sessions');

    const unsubscribe = onSnapshot(
      sessionsCol,
      (snapshot) => {
        const userMap = new Map<string, OnlineUserInfo>();
        const staleDocs: any[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data || !data.uid) return;

          const sessionDate = data.date;
          const loginTs = Number(data.loginTimestamp || 0);

          // Expire sessions from yesterday or older than 24h
          const isStale =
            (sessionDate && sessionDate !== todayLocalDate) ||
            (loginTs > 0 && Date.now() - loginTs > 24 * 60 * 60 * 1000);

          if (isStale) {
            staleDocs.push(docSnap.ref);
            return;
          }

          const existing = userMap.get(data.uid);
          if (existing) {
            existing.connectionsCount += 1;
          } else {
            userMap.set(data.uid, {
              uid: data.uid,
              email: data.email || data.uid,
              name: data.name || data.email || 'Usuário',
              role: data.role || 'PADRAO',
              connectionsCount: 1,
              loginTimestamp: loginTs,
              isCurrent: data.uid === user.uid,
            });
          }
        });

        // Clean up stale sessions in background
        if (staleDocs.length > 0) {
          staleDocs.forEach((ref) => deleteDoc(ref).catch(() => {}));
        }

        const activeList = Array.from(userMap.values());

        // Ensure current ADM user is represented
        if (!activeList.some((u) => u.uid === user.uid)) {
          activeList.unshift({
            uid: user.uid,
            email: user.email || profile?.email || '',
            name: profile?.name || user.displayName || 'Você (ADM)',
            role: profile?.role || 'ADM',
            connectionsCount: 1,
            isCurrent: true,
          });
        }

        // Sort: current user first, then alphabetical by name
        activeList.sort((a, b) => {
          if (a.isCurrent) return -1;
          if (b.isCurrent) return 1;
          return a.name.localeCompare(b.name);
        });

        setOnlineUsers(activeList);
      },
      (err) => {
        console.warn('Erro ao escutar sessões online no Firestore (ADM):', err.message);
        // Fallback: at least current user
        setOnlineUsers([
          {
            uid: user.uid,
            email: user.email || profile?.email || '',
            name: profile?.name || user.displayName || 'Você (ADM)',
            role: profile?.role || 'ADM',
            connectionsCount: 1,
            isCurrent: true,
          },
        ]);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, user?.uid, user?.email, profile?.name, profile?.role]);

  const onlineCount = onlineUsers.length;

  return {
    onlineCount,
    onlineUsers,
  };
}
