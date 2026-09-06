import { useEffect, useState, useRef, useCallback } from 'react';
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
  lastSeen?: number;
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

interface RawSessionItem {
  id: string;
  ref: any;
  data: any;
}

// Configurações de batimento cardíaco (Heartbeat) e expiração de presença
const HEARTBEAT_INTERVAL_MS = 25 * 1000; // Envia sinal a cada 25 segundos
const PRESENCE_TIMEOUT_MS = 70 * 1000;    // Offline se sem sinal há mais de 70 segundos (tolerância para abas em background)
const STALE_CLEANUP_MS = 120 * 1000;      // Remove do Firestore documentos sem sinal há mais de 2 minutos

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
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const rawSessionsRef = useRef<RawSessionItem[]>([]);

  // 1. Registro e Heartbeat contínuo para QUALQUER usuário logado
  // Mantém 'lastSeen' atualizado no Firestore enquanto a aba estiver aberta.
  useEffect(() => {
    if (!user || !user.uid) {
      setOnlineUsers([]);
      return;
    }

    const docId = `${user.uid}_${tabSessionId}`;
    const sessionDocRef = doc(db, 'online_sessions', docId);
    const todayLocalDate = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
    const now = Date.now();

    const sessionPayload = {
      tabSessionId,
      uid: user.uid,
      email: user.email || profile?.email || '',
      name: profile?.name || user.displayName || user.email || 'Usuário',
      role: profile?.role || 'PADRAO',
      date: todayLocalDate,
      loginTimestamp: now,
      lastSeen: now,
      updatedAt: new Date().toISOString(),
    };

    // Registro inicial de entrada na aba
    setDoc(sessionDocRef, sessionPayload, { merge: true }).catch((err) => {
      console.warn('Erro ao registrar sessão no Firestore:', err?.message);
    });

    // Função de batimento cardíaco (Heartbeat)
    const sendHeartbeat = () => {
      const currentNow = Date.now();
      lastHeartbeatTimeRef.current = currentNow;
      setDoc(
        sessionDocRef,
        {
          lastSeen: currentNow,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    };

    // Intervalo contínuo de Heartbeat (25s)
    const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Heartbeat sob demanda por atividade do usuário (com throttling de 15s)
    const handleUserActivity = () => {
      if (Date.now() - lastHeartbeatTimeRef.current > 15000) {
        sendHeartbeat();
      }
    };

    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });

    // Se a aba voltar a ficar visível após ficar em background, envia heartbeat imediato
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleUserActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Canal entre abas para encerramento instantâneo (se o usuário tiver mais de 1 aba aberta)
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('vtal_presence_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'TAB_CLOSED' && event.data?.docId) {
            // Outra aba aberta no mesmo navegador ajuda a apagar o doc no Firestore
            deleteDoc(doc(db, 'online_sessions', event.data.docId)).catch(() => {});
          }
        };
      } catch (_) {}
    }

    // Evento de fechamento de aba / recarregamento / navegação
    const handleUnload = () => {
      try {
        if (broadcastChannel) {
          broadcastChannel.postMessage({ type: 'TAB_CLOSED', docId });
        }
      } catch (_) {}
      try {
        deleteDoc(sessionDocRef).catch(() => {});
      } catch (_) {}
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);

      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch (_) {}
      }

      try {
        deleteDoc(sessionDocRef).catch(() => {});
      } catch (_) {}
    };
  }, [user?.uid, user?.email, profile?.name, profile?.role, tabSessionId]);

  // Função auxiliar que filtra e computa apenas usuários com sinal ativo nos últimos PRESENCE_TIMEOUT_MS
  const computeActiveUsers = useCallback(
    (rawSessions: RawSessionItem[]): OnlineUserInfo[] => {
      if (!user) return [];

      const now = Date.now();
      const todayLocalDate = new Date().toLocaleDateString('sv');
      const userMap = new Map<string, OnlineUserInfo>();
      const staleRefs: any[] = [];

      rawSessions.forEach(({ ref, data }) => {
        if (!data || !data.uid) return;

        const sessionDate = data.date;
        const lastSeen = Number(data.lastSeen || data.loginTimestamp || 0);
        const ageMs = now - lastSeen;

        // Se o último sinal foi há mais de PRESENCE_TIMEOUT_MS ou é de outro dia, NÃO está online
        const isExpired =
          lastSeen <= 0 ||
          ageMs > PRESENCE_TIMEOUT_MS ||
          (sessionDate && sessionDate !== todayLocalDate);

        if (isExpired) {
          // Se já está morto há mais de 2 minutos ou é de dia anterior, remove do Firestore
          if (ageMs > STALE_CLEANUP_MS || (sessionDate && sessionDate !== todayLocalDate)) {
            staleRefs.push(ref);
          }
          return;
        }

        const existing = userMap.get(data.uid);
        if (existing) {
          existing.connectionsCount += 1;
          if (lastSeen > (existing.lastSeen || 0)) {
            existing.lastSeen = lastSeen;
          }
        } else {
          userMap.set(data.uid, {
            uid: data.uid,
            email: data.email || data.uid,
            name: data.name || data.email || 'Usuário',
            role: data.role || 'PADRAO',
            connectionsCount: 1,
            loginTimestamp: Number(data.loginTimestamp || 0),
            lastSeen,
            isCurrent: data.uid === user.uid,
          });
        }
      });

      // Limpa documentos zumbis do Firestore em segundo plano
      if (staleRefs.length > 0) {
        staleRefs.forEach((r) => deleteDoc(r).catch(() => {}));
      }

      const activeList = Array.from(userMap.values());

      // Garante que o próprio usuário ADM atual apareça como online
      if (!activeList.some((u) => u.uid === user.uid)) {
        activeList.unshift({
          uid: user.uid,
          email: user.email || profile?.email || '',
          name: profile?.name || user.displayName || 'Você (ADM)',
          role: profile?.role || 'ADM',
          connectionsCount: 1,
          lastSeen: now,
          isCurrent: true,
        });
      }

      // Ordena: usuário atual primeiro, depois alfabético
      activeList.sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return a.name.localeCompare(b.name);
      });

      return activeList;
    },
    [user, profile]
  );

  // 2. Inscrição em tempo real e Ticker de expiração (EXCLUSIVO ADM)
  useEffect(() => {
    if (!isAdmin || !user) {
      setOnlineUsers([]);
      return;
    }

    const sessionsCol = collection(db, 'online_sessions');

    // Escuta alterações na coleção
    const unsubscribe = onSnapshot(
      sessionsCol,
      (snapshot) => {
        const rawList: RawSessionItem[] = [];
        snapshot.forEach((docSnap) => {
          rawList.push({
            id: docSnap.id,
            ref: docSnap.ref,
            data: docSnap.data(),
          });
        });

        rawSessionsRef.current = rawList;
        setOnlineUsers(computeActiveUsers(rawList));
      },
      (err) => {
        console.warn('Erro ao escutar sessões online no Firestore (ADM):', err.message);
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

    // Ticker a cada 5 segundos: reavalia se alguma sessão expirou sem precisar esperar nova escrita no Firestore
    const tickerInterval = setInterval(() => {
      if (rawSessionsRef.current.length > 0) {
        setOnlineUsers(computeActiveUsers(rawSessionsRef.current));
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(tickerInterval);
    };
  }, [isAdmin, user, computeActiveUsers]);

  const onlineCount = onlineUsers.length;

  return {
    onlineCount,
    onlineUsers,
  };
}
