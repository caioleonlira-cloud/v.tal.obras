import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, missingFirebaseEnvVars } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  Registro,
  RegistroBloco1,
  RegistroBloco2,
  Segmentacao,
  SegmentacaoKey,
  DEFAULT_SEGMENTATIONS,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  ALL_COLUMNS,
  ImportMetadata,
  HistoricoEdicaoItem,
  isSystemAdminEmail,
} from '../types';
import { matchCanonicalColumn, exportarRelatorioHistoricoParaExcel } from '../utils/excel';

interface ImportPadraoDiff {
  novas: RegistroBloco1[];
  removidas: Registro[];
  atualizadas: {
    dc: string;
    antigoBloco1: Partial<RegistroBloco1>;
    novoBloco1: RegistroBloco1;
    bloco2Existente: RegistroBloco2;
  }[];
}

interface ImportMassivaResult {
  totalRows: number;
  updatedRows: number;
  notFoundRows: { dc: string; rowData: any }[];
  updatedColumns: string[];
}

interface DataContextType {
  registros: Registro[];
  segmentacoes: Record<SegmentacaoKey, string[]>;
  lastImportInfo: ImportMetadata | null;
  historicoEdicoes: HistoricoEdicaoItem[];
  loadingRegistros: boolean;
  loadingSegmentacoes: boolean;
  isRealtimeConnected: boolean;
  realtimeStatus: 'connected' | 'syncing' | 'reconnecting' | 'offline';
  lastSyncTimestamp: number | null;
  quotaExhausted: boolean;
  quotaErrorMessage: string | null;
  error: string | null;
  clearQuotaError: () => void;
  refreshRegistros: () => Promise<void>;
  fetchHistoricoForDC: (dc: string) => Promise<HistoricoEdicaoItem[]>;
  exportarAuditoriaGeral: (limite?: number) => Promise<void>;
  arquivarELimparHistorico: (diasRetencao?: number) => Promise<{ exportados: number; removidos: number }>;
  updateRegistroBloco2: (dc: string, bloco2: Partial<RegistroBloco2>) => Promise<void>;
  addSegmentacaoOpcao: (segKey: SegmentacaoKey, novaOpcao: string) => Promise<void>;
  addMultiplasSegmentacaoOpcoes: (segKey: SegmentacaoKey, novasOpcoes: string[]) => Promise<void>;
  editSegmentacaoOpcao: (segKey: SegmentacaoKey, index: number, novoValor: string) => Promise<void>;
  removeSegmentacaoOpcao: (segKey: SegmentacaoKey, index: number) => Promise<void>;
  limparSegmentacao: (segKey: SegmentacaoKey) => Promise<void>;
  reorderSegmentacaoOpcoes: (segKey: SegmentacaoKey, novasOpcoes: string[]) => Promise<void>;
  restaurarSegmentacoesPadrao: () => Promise<void>;
  analisarImportacaoPadrao: (planilhaLinhas: Record<string, any>[]) => ImportPadraoDiff;
  executarImportacaoPadrao: (
    diff: ImportPadraoDiff,
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => Promise<void>;
  executarImportacaoMassiva: (
    planilhaLinhas: Record<string, any>[],
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => Promise<ImportMassivaResult>;
  popularDadosExemplo: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to sanitize Firestore document IDs
function getSafeDocId(dc: string, fallbackIdx?: number): string {
  const raw = String(dc || '').trim();
  const cleaned = raw
    .replace(/[\/\\]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  if (!cleaned || cleaned === '.' || cleaned === '..' || cleaned.startsWith('__')) {
    return `dc_${fallbackIdx ?? Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }
  return cleaned;
}

const LOCAL_STORAGE_REGISTROS_KEY = 'vtal_local_registros_backup';
const LOCAL_STORAGE_SEG_KEY = 'vtal_local_segmentacoes_backup';
const LOCAL_STORAGE_META_KEY = 'vtal_local_import_metadata';
const LOCAL_STORAGE_HISTORICO_KEY = 'vtal_local_historico_edicoes';

function deduplicateHistorico(list: HistoricoEdicaoItem[]): HistoricoEdicaoItem[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: HistoricoEdicaoItem[] = [];
  for (const item of list) {
    if (!item) continue;
    const key = item.id || `hist_${item.dc}_${item.colunaEditada || item.coluna}_${item.timestamp}_${item.valorNovo}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function getLocalStoredHistorico(): HistoricoEdicaoItem[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_HISTORICO_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return deduplicateHistorico(parsed);
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function saveLocalHistorico(list: HistoricoEdicaoItem[]) {
  try {
    if (typeof window !== 'undefined') {
      const deduped = deduplicateHistorico(list);
      localStorage.setItem(LOCAL_STORAGE_HISTORICO_KEY, JSON.stringify(deduped.slice(0, 1000)));
    }
  } catch (e) {
    console.warn('Erro ao salvar historico no cache local:', e);
  }
}

function getLocalStoredRegistros(): Registro[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_REGISTROS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function saveLocalRegistros(list: Registro[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_REGISTROS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Erro ao salvar no cache local:', e);
  }
}

// Helper to commit Firestore batch with safety timeout (prevents hanging indefinitely on network/permission stalls)
async function commitBatchWithTimeout(
  batch: ReturnType<typeof writeBatch>,
  timeoutMs = 30000,
  contextLabel = 'gravação em lote'
): Promise<void> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `Tempo esgotado (${Math.round(timeoutMs / 1000)}s) ao executar ${contextLabel} no Firestore. Verifique a conexão e as credenciais do Firebase.`
        )
      );
    }, timeoutMs);
  });

  try {
    await Promise.race([batch.commit(), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// Helper to clean objects so Firestore never receives `undefined`
function sanitizeRecord<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val === undefined || val === null) {
      clean[key] = '';
    } else if (typeof val === 'number') {
      clean[key] = isNaN(val) ? 0 : val;
    } else {
      clean[key] = typeof val === 'string' ? val.trim() : String(val).trim();
    }
  });
  return clean;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin } = useAuth();
  const isAdminRef = React.useRef(isAdmin);
  const userRef = React.useRef(user);
  const profileRef = React.useRef(profile);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const checkIsAdmin = useCallback(() => {
    return (
      isAdmin ||
      isAdminRef.current ||
      profile?.role === 'ADM' ||
      profileRef.current?.role === 'ADM' ||
      isSystemAdminEmail(user?.email) ||
      isSystemAdminEmail(userRef.current?.email) ||
      isSystemAdminEmail(profile?.email) ||
      isSystemAdminEmail(profileRef.current?.email)
    );
  }, [isAdmin, profile, user]);

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [segmentacoes, setSegmentacoes] = useState<Record<SegmentacaoKey, string[]>>(DEFAULT_SEGMENTATIONS);
  const [lastImportInfo, setLastImportInfo] = useState<ImportMetadata | null>(null);
  const [historicoEdicoes, setHistoricoEdicoes] = useState<HistoricoEdicaoItem[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState<boolean>(true);
  const [loadingSegmentacoes, setLoadingSegmentacoes] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'syncing' | 'reconnecting' | 'offline'>('syncing');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState<boolean>(false);
  const [quotaErrorMessage, setQuotaErrorMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearQuotaError = () => {
    setQuotaExhausted(false);
    setQuotaErrorMessage(null);
  };

  const checkQuotaError = (err: any) => {
    if (!err) return false;
    const code = String(err?.code || '');
    const msg = String(err?.message || '').toLowerCase();
    const isExhausted =
      code === 'resource-exhausted' ||
      code === 'quota-exceeded' ||
      code === '8' ||
      msg.includes('resource-exhausted') ||
      msg.includes('resource_exhausted') ||
      msg.includes('quota exceeded') ||
      msg.includes('quota') ||
      msg.includes('limit exceeded');

    if (isExhausted) {
      setQuotaExhausted(true);
      setQuotaErrorMessage(
        'Limite diário de operações do Firestore atingido (Cota Gratuita Spark: 50.000 leituras/dia). O banco pausou temporariamente as leituras remotas. O sistema continuará operando com segurança no modo cache local.'
      );
    }
    return isExhausted;
  };

  // 1. Fetch & continuous real-time sync for registros with Delta-Reading optimization
  useEffect(() => {
    if (!user) {
      setRegistros([]);
      setLoadingRegistros(false);
      setIsRealtimeConnected(false);
      setRealtimeStatus('offline');
      return;
    }

    // 1.1 Fast local storage hydration (zero-delay initial UI render)
    const cached = getLocalStoredRegistros();
    let hasLocalData = false;
    if (cached && cached.length > 0) {
      setRegistros(cached);
      setLoadingRegistros(false);
      hasLocalData = true;
    } else {
      setLoadingRegistros(true);
    }

    if (!isFirebaseConfigured) {
      setRealtimeStatus('offline');
      setIsRealtimeConnected(false);
      setLoadingRegistros(false);
      return;
    }

    setRealtimeStatus('syncing');

    const regCol = collection(db, 'registros');
    let unsubDelta: (() => void) | null = null;
    let isCancelled = false;

    // 1.2 Smart Initial Load:
    // If local cache exists, fetch only documents changed recently (saving thousands of reads)
    // If cache is empty, fetch the full collection once to populate IndexedDB and state
    const initSync = async () => {
      try {
        if (hasLocalData) {
          // Find most recent updatedAt in local cache or fallback to 24h ago
          let latestUpdated = '';
          for (const r of cached) {
            if (r._updatedAt && r._updatedAt > latestUpdated) {
              latestUpdated = r._updatedAt;
            }
          }
          const cutoff = latestUpdated || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

          // Fetch only modified documents since cache timestamp
          const deltaQuery = query(regCol, where('_updatedAt', '>', cutoff));
          const deltaSnap = await getDocs(deltaQuery);

          if (!isCancelled && !deltaSnap.empty) {
            setRegistros((prev) => {
              const docMap = new Map<string, Registro>();
              for (const r of prev) {
                const key = r._id || getSafeDocId(r.DC);
                docMap.set(key, r);
              }
              deltaSnap.forEach((docSnap) => {
                const docData = { _id: docSnap.id, ...docSnap.data() } as Registro;
                docMap.set(docSnap.id, docData);
              });
              const nextList = Array.from(docMap.values());
              saveLocalRegistros(nextList);
              return nextList;
            });
          }
        } else {
          // Initial bootstrap for clean devices: fetch full collection
          const fullSnap = await getDocs(regCol);
          if (!isCancelled) {
            const list: Registro[] = [];
            fullSnap.forEach((docSnap) => {
              list.push({ _id: docSnap.id, ...docSnap.data() } as Registro);
            });
            if (list.length > 0) {
              setRegistros(list);
              saveLocalRegistros(list);
            }
          }
        }

        if (!isCancelled) {
          setIsRealtimeConnected(true);
          setRealtimeStatus('connected');
          setLastSyncTimestamp(Date.now());
          setLoadingRegistros(false);
          setError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          checkQuotaError(err);
          console.warn('Erro na sincronização inicial:', err?.message);
          setLoadingRegistros(false);
        }
      }

      // 1.3 Lightweight Real-Time Listener (Google Sheets Style):
      // Listens ONLY to documents updated from this session start onwards.
      // Idle cost = 0 reads! Every saved DC emits only 1 document read to other connected peers.
      const sessionStartIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      try {
        const liveQuery = query(regCol, where('_updatedAt', '>=', sessionStartIso));
        unsubDelta = onSnapshot(
          liveQuery,
          (snapshot) => {
            if (isCancelled) return;
            const changes = snapshot.docChanges();
            if (changes.length === 0) return;

            setRegistros((prev) => {
              const docMap = new Map<string, Registro>();
              for (const r of prev) {
                const key = r._id || getSafeDocId(r.DC);
                docMap.set(key, r);
              }

              for (const change of changes) {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                  docMap.delete(docId);
                } else {
                  const docData = { _id: docId, ...change.doc.data() } as Registro;
                  docMap.set(docId, docData);
                }
              }

              const nextList = Array.from(docMap.values());
              saveLocalRegistros(nextList);
              return nextList;
            });

            setIsRealtimeConnected(true);
            setRealtimeStatus('connected');
            setLastSyncTimestamp(Date.now());
          },
          (err) => {
            if (!isCancelled) {
              checkQuotaError(err);
              console.warn('Realtime delta listener aviso:', err?.message);
            }
          }
        );
      } catch (e: any) {
        console.warn('Erro ao configurar listener delta:', e?.message);
      }
    };

    initSync();

    // 1.4 Background Polling: light safety check every 3 minutes (zero impact if no changes)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp).toISOString() : '';
        if (lastSync) {
          getDocs(query(regCol, where('_updatedAt', '>', lastSync)))
            .then((snap) => {
              if (!snap.empty) {
                setRegistros((prev) => {
                  const docMap = new Map<string, Registro>();
                  for (const r of prev) {
                    const key = r._id || getSafeDocId(r.DC);
                    docMap.set(key, r);
                  }
                  snap.forEach((docSnap) => {
                    docMap.set(docSnap.id, { _id: docSnap.id, ...docSnap.data() } as Registro);
                  });
                  const nextList = Array.from(docMap.values());
                  saveLocalRegistros(nextList);
                  return nextList;
                });
                setLastSyncTimestamp(Date.now());
              }
            })
            .catch(() => {});
        }
      }
    }, 3 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      if (unsubDelta) unsubDelta();
    };
  }, [user]);

  // Manual refresh fallback (optional force sync)
  const refreshRegistros = useCallback(async () => {
    if (!user) return;
    setLoadingRegistros(true);
    setRealtimeStatus('syncing');

    if (isFirebaseConfigured) {
      try {
        const regCol = collection(db, 'registros');
        const snapshot = await getDocs(regCol);
        const list: Registro[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ _id: docSnap.id, ...docSnap.data() } as Registro);
        });
        if (list.length > 0) {
          setRegistros(list);
          saveLocalRegistros(list);
        }
        setIsRealtimeConnected(true);
        setRealtimeStatus('connected');
        setLastSyncTimestamp(Date.now());
      } catch (err: any) {
        checkQuotaError(err);
        console.warn('Erro ao forçar refresh registros:', err);
      }
    }
    setLoadingRegistros(false);
  }, [user]);

  // Load local audit history cache on session startup
  useEffect(() => {
    if (!user) {
      setHistoricoEdicoes([]);
      return;
    }
    const cachedHist = getLocalStoredHistorico();
    if (cachedHist.length > 0) {
      setHistoricoEdicoes(cachedHist);
    }
  }, [user]);

  // Fetch audit history on-demand for a single specific DC (Saves thousands of reads)
  const fetchHistoricoForDC = useCallback(
    async (dc: string): Promise<HistoricoEdicaoItem[]> => {
      if (!dc) return [];
      const targetDC = String(dc).trim();
      const localCached = getLocalStoredHistorico().filter(
        (item) => (item.dc || '').trim().toLowerCase() === targetDC.toLowerCase()
      );

      if (!isFirebaseConfigured) {
        return localCached;
      }

      try {
        const histCol = collection(db, 'historico_edicoes');
        const q = query(histCol, where('dc', '==', targetDC), limit(100));
        const snap = await getDocs(q);
        const remoteItems: HistoricoEdicaoItem[] = [];
        snap.forEach((d) => {
          const docData = d.data() as any;
          remoteItems.push({ id: d.id, ...docData } as HistoricoEdicaoItem);
        });

        const merged = deduplicateHistorico([...remoteItems, ...localCached]);
        merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return merged;
      } catch (err: any) {
        checkQuotaError(err);
        console.warn('Consulta histórico sob demanda DC:', dc, err?.message);
        return localCached;
      }
    },
    []
  );

  // On-demand export for general audit report (only executes when requested by ADM)
  const exportarAuditoriaGeral = useCallback(async (limite = 1000) => {
    if (!checkIsAdmin()) {
      throw new Error('Acesso restrito: Apenas administradores possuem permissão para exportar o relatório de auditoria.');
    }

    const cached = getLocalStoredHistorico();
    if (!isFirebaseConfigured) {
      exportarRelatorioHistoricoParaExcel(cached, 'VTAL_Relatorio_Auditoria_Edicoes');
      return;
    }

    try {
      const histCol = collection(db, 'historico_edicoes');
      let snap;
      try {
        const q = query(histCol, orderBy('timestamp', 'desc'), limit(limite));
        snap = await getDocs(q);
      } catch (queryErr) {
        const q = query(histCol, limit(limite));
        snap = await getDocs(q);
      }

      const remoteList: HistoricoEdicaoItem[] = [];
      snap.forEach((docSnap) => {
        const docData = docSnap.data() as any;
        remoteList.push({ id: docSnap.id, ...docData } as HistoricoEdicaoItem);
      });

      const merged = deduplicateHistorico([...remoteList, ...cached]);
      merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      exportarRelatorioHistoricoParaExcel(merged, 'VTAL_Relatorio_Auditoria_Edicoes');
    } catch (err: any) {
      checkQuotaError(err);
      console.warn('Erro ao exportar auditoria sob demanda:', err?.message);
      exportarRelatorioHistoricoParaExcel(cached, 'VTAL_Relatorio_Auditoria_Edicoes');
    }
  }, [checkIsAdmin]);

  // Routine to archive and purge legacy edit history (> X days, default 90 days / 3 months)
  const arquivarELimparHistorico = useCallback(
    async (diasRetencao = 90): Promise<{ exportados: number; removidos: number }> => {
      if (!checkIsAdmin()) {
        throw new Error('Acesso restrito: Apenas administradores possuem permissão para arquivar o histórico de auditoria.');
      }

      const cutoffTimestamp = Date.now() - diasRetencao * 24 * 60 * 60 * 1000;
      const cached = getLocalStoredHistorico();
      const oldCachedItems = cached.filter((item) => (item.timestamp || 0) < cutoffTimestamp);

      let remoteOldItems: HistoricoEdicaoItem[] = [];

      if (isFirebaseConfigured) {
        try {
          const histCol = collection(db, 'historico_edicoes');
          const q = query(histCol, where('timestamp', '<', cutoffTimestamp));
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            remoteOldItems.push({ id: docSnap.id, ...docSnap.data() } as HistoricoEdicaoItem);
          });

          // 1. Export Excel backup of all old items to be archived
          const allOldItems = deduplicateHistorico([...remoteOldItems, ...oldCachedItems]);
          if (allOldItems.length > 0) {
            exportarRelatorioHistoricoParaExcel(
              allOldItems,
              `VTAL_Backup_Auditoria_Arquivada_${new Date().toLocaleDateString('sv')}`
            );

            // 2. Batch purge from Firestore (in chunks of 200)
            const BATCH_SIZE = 200;
            for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
              const chunk = snap.docs.slice(i, i + BATCH_SIZE);
              const batch = writeBatch(db);
              chunk.forEach((d) => batch.delete(d.ref));
              await commitBatchWithTimeout(batch, 15000, 'limpeza de histórico arquivado');
            }
          }
        } catch (err: any) {
          checkQuotaError(err);
          console.warn('Erro ao arquivar/limpar histórico antigo:', err?.message);
        }
      }

      // 3. Purge from local cache and state
      const remainingItems = cached.filter((item) => (item.timestamp || 0) >= cutoffTimestamp);
      setHistoricoEdicoes(remainingItems);
      saveLocalHistorico(remainingItems);

      return {
        exportados: remoteOldItems.length || oldCachedItems.length,
        removidos: remoteOldItems.length || oldCachedItems.length,
      };
    },
    [checkIsAdmin]
  );

  // 2. Subscribe to metadata/importInfo and trigger refresh if a new import happens
  const lastImportTimestampRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLastImportInfo(null);
      return;
    }
    const metaDocRef = doc(db, 'metadata', 'importInfo');
    const unsubMeta = onSnapshot(
      metaDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ImportMetadata;
          setLastImportInfo(data);
          if (data.dataHora) {
            if (lastImportTimestampRef.current && lastImportTimestampRef.current !== data.dataHora) {
              // Remote import detected from another session: refresh records
              refreshRegistros();
            }
            lastImportTimestampRef.current = data.dataHora;
          }
        }
      },
      (err) => {
        checkQuotaError(err);
        console.warn('Erro ao ler metadata de importação:', err?.message);
      }
    );
    return () => unsubMeta();
  }, [user, refreshRegistros]);

  // 3. Subscribe to segmentacoes
  useEffect(() => {
    if (!user) {
      setLoadingSegmentacoes(false);
      return;
    }

    const segCol = collection(db, 'segmentacoes');
    const unsub = onSnapshot(
      segCol,
      async (snapshot) => {
        if (snapshot.empty) {
          // Initialize default segmentations if not created in Firestore yet
          if (isAdmin) {
            try {
              const batch = writeBatch(db);
              (Object.keys(DEFAULT_SEGMENTATIONS) as SegmentacaoKey[]).forEach((key) => {
                const docRef = doc(db, 'segmentacoes', key);
                batch.set(docRef, {
                  id: key,
                  nome: key,
                  opcoes: DEFAULT_SEGMENTATIONS[key],
                });
              });
              await batch.commit();
            } catch (e: any) {
              checkQuotaError(e);
              console.warn('Erro ao inicializar segmentações:', e?.message);
            }
          }
          setSegmentacoes(DEFAULT_SEGMENTATIONS);
        } else {
          const segData: Partial<Record<SegmentacaoKey, string[]>> = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && Array.isArray(data.opcoes)) {
              segData[docSnap.id as SegmentacaoKey] = data.opcoes;
            }
          });
          setSegmentacoes((prev) => ({
            ...DEFAULT_SEGMENTATIONS,
            ...segData,
          }));
        }
        setLoadingSegmentacoes(false);
      },
      (err) => {
        checkQuotaError(err);
        console.warn('Snapshot segmentacoes erro:', err?.message);
        setLoadingSegmentacoes(false);
      }
    );

    return () => unsub();
  }, [user, isAdmin]);

  // 4. Update single registro Bloco 2 with audit logging
  const updateRegistroBloco2 = async (dc: string, bloco2: Partial<RegistroBloco2>) => {
    if (!dc) return;
    const docId = getSafeDocId(dc);
    const docRef = doc(db, 'registros', docId);
    const updatePayload: Record<string, any> = sanitizeRecord({
      ...bloco2,
      _updatedAt: new Date().toISOString(),
      _updatedBy: user?.email || '',
    });

    const existingItem = registros.find((r) => r.DC === dc);
    const logItems: HistoricoEdicaoItem[] = [];

    if (existingItem) {
      Object.keys(bloco2).forEach((k) => {
        const colKey = k as keyof RegistroBloco2;
        const oldVal = (existingItem as any)[colKey] || '';
        const newVal = (bloco2 as any)[colKey] || '';
        if (oldVal !== newVal) {
          const uName = profile?.name || user?.displayName || user?.email || 'Usuário';
          const uEmail = user?.email || '';
          const logId = `hist_${getSafeDocId(dc)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          logItems.push({
            id: logId,
            dc,
            userEmail: uEmail,
            userName: uName,
            usuario: uEmail ? `${uName} (${uEmail})` : uName,
            usuarioNome: uName,
            colunaEditada: colKey,
            coluna: colKey,
            valorAnterior: oldVal,
            valorNovo: newVal,
            dataHora: new Date().toLocaleString('pt-BR'),
            timestamp: Date.now(),
          });
        }
      });
    }

    // Atomic batch update: record update + all history audit logs in a single network round-trip commit
    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.set(docRef, updatePayload, { merge: true });

        if (logItems.length > 0) {
          for (const logItem of logItems) {
            const histRef = doc(db, 'historico_edicoes', logItem.id!);
            batch.set(histRef, logItem);
          }
        }

        await commitBatchWithTimeout(batch, 15000, 'atualização de registro e histórico');
      } catch (e: any) {
        checkQuotaError(e);
        console.warn('Erro ao salvar no Firestore via batch:', e?.message);
        throw e;
      }
    }

    // Save history items to local state & storage
    if (logItems.length > 0) {
      setHistoricoEdicoes((prev) => {
        const next = deduplicateHistorico([...logItems, ...prev]);
        saveLocalHistorico(next);
        return next;
      });
    }

    // Optimistic local state update
    setRegistros((prev) =>
      prev.map((item) =>
        item.DC === dc
          ? {
              ...item,
              ...bloco2,
              _updatedAt: updatePayload._updatedAt,
              _updatedBy: updatePayload._updatedBy,
            }
          : item
      )
    );
  };

  // 5. Manage Segmentations
  const addSegmentacaoOpcao = async (segKey: SegmentacaoKey, novaOpcao: string) => {
    const limpa = novaOpcao.trim().toUpperCase();
    if (!limpa) return;
    const opcoesAtuais = segmentacoes[segKey] || [];
    if (opcoesAtuais.includes(limpa)) return;

    const novasOpcoes = [...opcoesAtuais, limpa];
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: novasOpcoes }, { merge: true });
    setSegmentacoes((prev) => ({ ...prev, [segKey]: novasOpcoes }));
  };

  const addMultiplasSegmentacaoOpcoes = async (segKey: SegmentacaoKey, novasOpcoes: string[]) => {
    const opcoesAtuais = [...(segmentacoes[segKey] || [])];
    const setExistente = new Set(opcoesAtuais.map((o) => o.trim().toUpperCase()));

    novasOpcoes.forEach((item) => {
      const limpa = item.trim().toUpperCase();
      if (limpa && !setExistente.has(limpa)) {
        opcoesAtuais.push(limpa);
        setExistente.add(limpa);
      }
    });

    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: opcoesAtuais }, { merge: true });
    setSegmentacoes((prev) => ({ ...prev, [segKey]: opcoesAtuais }));
  };

  const editSegmentacaoOpcao = async (segKey: SegmentacaoKey, index: number, novoValor: string) => {
    const limpa = novoValor.trim().toUpperCase();
    if (!limpa) return;
    const opcoesAtuais = [...(segmentacoes[segKey] || [])];
    opcoesAtuais[index] = limpa;

    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: opcoesAtuais }, { merge: true });
    setSegmentacoes((prev) => ({ ...prev, [segKey]: opcoesAtuais }));
  };

  const removeSegmentacaoOpcao = async (segKey: SegmentacaoKey, index: number) => {
    const opcoesAtuais = (segmentacoes[segKey] || []).filter((_, i) => i !== index);
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: opcoesAtuais }, { merge: true });
    setSegmentacoes((prev) => ({ ...prev, [segKey]: opcoesAtuais }));
  };

  const limparSegmentacao = async (segKey: SegmentacaoKey) => {
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: [] }, { merge: true });
    setSegmentacoes((prev) => ({ ...prev, [segKey]: [] }));
  };

  const reorderSegmentacaoOpcoes = async (segKey: SegmentacaoKey, novasOpcoes: string[]) => {
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: novasOpcoes }, { merge: true });
    setSegmentacoes((prev) => ({ ...prev, [segKey]: novasOpcoes }));
  };

  const restaurarSegmentacoesPadrao = async () => {
    const batch = writeBatch(db);
    (Object.keys(DEFAULT_SEGMENTATIONS) as SegmentacaoKey[]).forEach((key) => {
      const docRef = doc(db, 'segmentacoes', key);
      batch.set(docRef, { id: key, nome: key, opcoes: DEFAULT_SEGMENTATIONS[key] });
    });
    await batch.commit();
    setSegmentacoes(DEFAULT_SEGMENTATIONS);
  };

  // Helper to extract a field from a row using aliases
  const extractRowField = (row: Record<string, any>, canonicalKey: string): string => {
    if (row[canonicalKey] !== undefined && row[canonicalKey] !== null) {
      return String(row[canonicalKey]).trim();
    }
    // Search by key aliases in row
    for (const key of Object.keys(row)) {
      const matched = matchCanonicalColumn(key);
      if (matched === canonicalKey && row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  // 6. Analisar Importação Padrão (Base Matriz)
  const analisarImportacaoPadrao = (planilhaLinhas: Record<string, any>[]): ImportPadraoDiff => {
    const dcMapAtual = new Map<string, Registro>();
    registros.forEach((r) => {
      if (r.DC) {
        dcMapAtual.set(String(r.DC).trim().toUpperCase(), r);
      }
    });

    const novas: RegistroBloco1[] = [];
    const atualizadas: {
      dc: string;
      antigoBloco1: Partial<RegistroBloco1>;
      novoBloco1: RegistroBloco1;
      bloco2Existente: RegistroBloco2;
    }[] = [];

    const planDcsEncontradas = new Set<string>();

    planilhaLinhas.forEach((linha) => {
      const dcVal = extractRowField(linha, 'DC');
      if (!dcVal) return;

      const dcUpper = dcVal.toUpperCase();
      planDcsEncontradas.add(dcUpper);

      // Extract only Bloco 1 fields
      const bloco1: RegistroBloco1 = {
        'DC': dcVal,
        'REG': extractRowField(linha, 'REG'),
        'TIPO (Cateira)': extractRowField(linha, 'TIPO (Cateira)'),
        'DR': extractRowField(linha, 'DR'),
        'Seq': extractRowField(linha, 'Seq'),
        'Dc Simulação': extractRowField(linha, 'Dc Simulação'),
        'Orçamento': extractRowField(linha, 'Orçamento'),
        'Status Med. Parcial': extractRowField(linha, 'Status Med. Parcial'),
        'Valor Parcial R$': extractRowField(linha, 'Valor Parcial R$'),
        'Status Med. Final': extractRowField(linha, 'Status Med. Final'),
        'Valor Final R$': extractRowField(linha, 'Valor Final R$'),
        'Tempo': extractRowField(linha, 'Tempo'),
        'AGING': extractRowField(linha, 'AGING'),
        'Data Status': extractRowField(linha, 'Data Status'),
        'UF': extractRowField(linha, 'UF').toUpperCase(),
        'Localidade': extractRowField(linha, 'Localidade'),
        'Tipo de Projeto': extractRowField(linha, 'Tipo de Projeto'),
        'Descricao': extractRowField(linha, 'Descricao'),
        'Status da DC (Atual)': extractRowField(linha, 'Status da DC (Atual)'),
        'Backlog/Input?': extractRowField(linha, 'Backlog/Input?'),
      };

      if (dcMapAtual.has(dcUpper)) {
        const existente = dcMapAtual.get(dcUpper)!;
        // Bloco 2 is carefully preserved
        const bloco2: RegistroBloco2 = {
          'Status Informe (Campo)': existente['Status Informe (Campo)'] || '',
          'Resp.Medição': existente['Resp.Medição'] || '',
          'Pendência (Implantação)': existente['Pendência (Implantação)'] || '',
          'Pendência (Celula Sap)': existente['Pendência (Celula Sap)'] || '',
          'Pendência (Projetos)': existente['Pendência (Projetos)'] || '',
          'Data Previsão Entrega (Medição)': existente['Data Previsão Entrega (Medição)'] || '',
          'Data Previsão Entrega (Projeto)': existente['Data Previsão Entrega (Projeto)'] || '',
          'Responsavel': existente['Responsavel'] || '',
          'Data Tratativa': existente['Data Tratativa'] || '',
          'OBS (Medição)': existente['OBS (Medição)'] || '',
        };

        atualizadas.push({
          dc: existente.DC || dcVal,
          antigoBloco1: existente,
          novoBloco1: bloco1,
          bloco2Existente: bloco2,
        });
      } else {
        novas.push(bloco1);
      }
    });

    // Removidas: DCs que existem no DB mas NÃO vieram na nova planilha
    const removidas: Registro[] = [];
    registros.forEach((r) => {
      const dcUpper = String(r.DC || '').trim().toUpperCase();
      if (dcUpper && !planDcsEncontradas.has(dcUpper)) {
        removidas.push(r);
      }
    });

    return {
      novas,
      removidas,
      atualizadas,
    };
  };

  // 7. Executar Importação Padrão no Firestore
  const executarImportacaoPadrao = async (
    diff: ImportPadraoDiff,
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => {
    const totalOps = diff.novas.length + diff.removidas.length + diff.atualizadas.length;
    let completedOps = 0;

    const reportProgress = (msg: string) => {
      const pct = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 100;
      onProgress?.(pct, msg);
    };

    reportProgress('Iniciando processamento da base de dados...');

    // 1. Compute updated records map
    const updatedMap = new Map<string, Registro>();
    registros.forEach((r) => {
      if (r.DC) updatedMap.set(String(r.DC).trim().toUpperCase(), r);
    });

    diff.removidas.forEach((r) => {
      if (r.DC) updatedMap.delete(String(r.DC).trim().toUpperCase());
    });

    diff.novas.forEach((n, idx) => {
      const dcUpper = String(n.DC).trim().toUpperCase();
      const docId = getSafeDocId(n.DC, idx);
      updatedMap.set(dcUpper, {
        ...n,
        'Status Informe (Campo)': '',
        'Resp.Medição': '',
        'Pendência (Implantação)': '',
        'Pendência (Celula Sap)': '',
        'Pendência (Projetos)': '',
        'Data Previsão Entrega (Medição)': '',
        'Data Previsão Entrega (Projeto)': '',
        'Responsavel': '',
        'Data Tratativa': '',
        'OBS (Medição)': '',
        _id: docId,
        _updatedAt: new Date().toISOString(),
        _updatedBy: user?.email || 'Importação Padrão',
      });
    });

    diff.atualizadas.forEach((a) => {
      const dcUpper = String(a.dc).trim().toUpperCase();
      const existing = updatedMap.get(dcUpper) || ({} as Registro);
      updatedMap.set(dcUpper, {
        ...existing,
        ...a.novoBloco1,
        _updatedAt: new Date().toISOString(),
        _updatedBy: user?.email || 'Importação Padrão',
      });
    });

    const finalRegistros = Array.from(updatedMap.values());
    setRegistros(finalRegistros);
    saveLocalRegistros(finalRegistros);

    // 2. Prepare metadata
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const metaInfo: ImportMetadata = {
      dataHora: now.toISOString(),
      dataHoraFormatada: formattedDate,
      totalRegistros: diff.novas.length + diff.atualizadas.length,
      tipo: 'padrao',
      usuario: user?.email || 'Administrador',
      novas: diff.novas.length,
      atualizadas: diff.atualizadas.length,
      removidas: diff.removidas.length,
    };
    setLastImportInfo(metaInfo);
    try {
      localStorage.setItem(LOCAL_STORAGE_META_KEY, JSON.stringify(metaInfo));
    } catch (e) {}

    // 3. If Firebase is configured, sync to Firestore
    if (isFirebaseConfigured) {
      const BATCH_SIZE = 200;

      // Delete removed records
      if (diff.removidas.length > 0) {
        reportProgress(`Removendo ${diff.removidas.length} registros no Firestore...`);
        for (let i = 0; i < diff.removidas.length; i += BATCH_SIZE) {
          const chunk = diff.removidas.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((item, idx) => {
            const docId = item._id || getSafeDocId(item.DC, i + idx);
            const docRef = doc(db, 'registros', docId);
            batch.delete(docRef);
          });
          try {
            await commitBatchWithTimeout(batch, 30000, 'exclusão de registros removidos');
          } catch (err: any) {
            console.warn('Aviso exclusão Firestore:', err?.message);
          }
          completedOps += chunk.length;
          reportProgress(`Excluindo registros... (${completedOps}/${totalOps})`);
        }
      }

      // Insert new records
      if (diff.novas.length > 0) {
        reportProgress(`Gravando ${diff.novas.length} novos registros no Firestore...`);
        for (let i = 0; i < diff.novas.length; i += BATCH_SIZE) {
          const chunk = diff.novas.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((item, idx) => {
            const docId = getSafeDocId(item.DC, i + idx);
            const docRef = doc(db, 'registros', docId);
            const fullDoc: Registro = sanitizeRecord({
              ...item,
              'Status Informe (Campo)': '',
              'Resp.Medição': '',
              'Pendência (Implantação)': '',
              'Pendência (Celula Sap)': '',
              'Pendência (Projetos)': '',
              'Data Previsão Entrega (Medição)': '',
              'Data Previsão Entrega (Projeto)': '',
              'Responsavel': '',
              'Data Tratativa': '',
              'OBS (Medição)': '',
              _updatedAt: new Date().toISOString(),
              _updatedBy: user?.email || 'Importação Padrão',
            });
            batch.set(docRef, fullDoc);
          });
          try {
            await commitBatchWithTimeout(batch, 30000, 'inserção de novos registros');
          } catch (err: any) {
            console.warn('Aviso inserção Firestore:', err?.message);
          }
          completedOps += chunk.length;
          reportProgress(`Gravando novos registros... (${completedOps}/${totalOps})`);
        }
      }

      // Update existing records
      if (diff.atualizadas.length > 0) {
        reportProgress(`Atualizando ${diff.atualizadas.length} registros no Firestore...`);
        for (let i = 0; i < diff.atualizadas.length; i += BATCH_SIZE) {
          const chunk = diff.atualizadas.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((item, idx) => {
            const docId = getSafeDocId(item.dc, i + idx);
            const docRef = doc(db, 'registros', docId);
            const updateData = sanitizeRecord({
              ...item.novoBloco1,
              _updatedAt: new Date().toISOString(),
              _updatedBy: user?.email || 'Importação Padrão',
            });
            batch.set(docRef, updateData, { merge: true });
          });
          try {
            await commitBatchWithTimeout(batch, 30000, 'atualização de base matriz');
          } catch (err: any) {
            console.warn('Aviso atualização Firestore:', err?.message);
          }
          completedOps += chunk.length;
          reportProgress(`Atualizando base matriz... (${completedOps}/${totalOps})`);
        }
      }

      try {
        await setDoc(doc(db, 'metadata', 'importInfo'), metaInfo, { merge: true });
      } catch (e) {
        console.warn('Erro ao gravar metadados no Firestore:', e);
      }
    } else {
      // Local fallback progress simulation
      reportProgress('Processando e salvando registros localmente...');
      completedOps = totalOps;
    }

    reportProgress('Finalizando sincronização...');
    onProgress?.(100, 'Importação concluída com sucesso!');
  };

  // 8. Executar Importação Massiva Dinâmica (Reconhece DC e QUALQUER coluna alterada)
  const executarImportacaoMassiva = async (
    planilhaLinhas: Record<string, any>[],
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<ImportMassivaResult> => {
    const dcMapAtual = new Map<string, Registro>();
    registros.forEach((r) => {
      if (r.DC) {
        dcMapAtual.set(String(r.DC).trim().toUpperCase(), r);
      }
    });

    const notFoundRows: { dc: string; rowData: any }[] = [];
    const validUpdates: { dc: string; docId: string; campos: Record<string, any> }[] = [];
    const columnsDetected = new Set<string>();

    planilhaLinhas.forEach((linha) => {
      const dcVal = extractRowField(linha, 'DC');
      if (!dcVal) return;

      const dcUpper = dcVal.toUpperCase();
      const registroExistente = dcMapAtual.get(dcUpper);

      if (!registroExistente) {
        notFoundRows.push({ dc: dcVal, rowData: linha });
      } else {
        const docId = registroExistente._id || getSafeDocId(registroExistente.DC || dcVal);
        const camposParaAtualizar: Record<string, any> = {};

        // Iterate through all columns in the uploaded row
        Object.keys(linha).forEach((rawKey) => {
          const canonical = matchCanonicalColumn(rawKey);
          if (canonical && canonical !== 'DC') {
            columnsDetected.add(canonical);
            const val = linha[rawKey];
            if (val !== undefined && val !== null) {
              camposParaAtualizar[canonical] = typeof val === 'string' ? val.trim() : String(val).trim();
            }
          }
        });

        if (Object.keys(camposParaAtualizar).length > 0) {
          validUpdates.push({
            dc: registroExistente.DC || dcVal,
            docId,
            campos: camposParaAtualizar,
          });
        }
      }
    });

    const totalOps = validUpdates.length;
    let completedOps = 0;

    const reportProgress = (msg: string) => {
      const pct = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 100;
      onProgress?.(pct, msg);
    };

    reportProgress('Processando atualizações massivas...');

    // Optimistically update local state & cache
    const updatedList = registros.map((item) => {
      const dcUpper = String(item.DC || '').trim().toUpperCase();
      const foundUpdate = validUpdates.find((u) => u.dc.toUpperCase() === dcUpper);
      if (foundUpdate) {
        return { ...item, ...foundUpdate.campos };
      }
      return item;
    });

    setRegistros(updatedList);
    saveLocalRegistros(updatedList);

    // Save metadata
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const metaInfo: ImportMetadata = {
      dataHora: now.toISOString(),
      dataHoraFormatada: formattedDate,
      totalRegistros: registros.length,
      tipo: 'massiva',
      usuario: user?.email || 'Administrador',
      atualizadas: validUpdates.length,
    };
    setLastImportInfo(metaInfo);
    try {
      localStorage.setItem(LOCAL_STORAGE_META_KEY, JSON.stringify(metaInfo));
    } catch (e) {}

    // If Firebase is configured, sync to Firestore
    if (isFirebaseConfigured && validUpdates.length > 0) {
      const BATCH_SIZE = 200;
      for (let i = 0; i < validUpdates.length; i += BATCH_SIZE) {
        const chunk = validUpdates.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const docRef = doc(db, 'registros', item.docId);
          const payload = sanitizeRecord({
            ...item.campos,
            _updatedAt: new Date().toISOString(),
            _updatedBy: user?.email || 'Importação Massiva',
          });
          batch.set(docRef, payload, { merge: true });
        });
        try {
          await commitBatchWithTimeout(batch, 30000, 'atualização massiva de registros');
        } catch (e: any) {
          console.warn('Aviso atualização massiva Firestore:', e?.message);
        }
        completedOps += chunk.length;
        reportProgress(`Gravando registros... (${completedOps}/${totalOps})`);
      }

      try {
        await setDoc(doc(db, 'metadata', 'importInfo'), metaInfo, { merge: true });
      } catch (e) {
        console.warn('Erro ao gravar metadados de importação massiva:', e);
      }
    }

    reportProgress('Atualizando lista...');
    onProgress?.(100, 'Importação massiva concluída com sucesso!');

    return {
      totalRows: planilhaLinhas.length,
      updatedRows: validUpdates.length,
      notFoundRows,
      updatedColumns: Array.from(columnsDetected),
    };
  };

  // 9. Popular Dados de Exemplo (Seed inicial de demonstração)
  const popularDadosExemplo = async () => {
    const amostras: Registro[] = [
      {
        'DC': 'DC-904120',
        'REG': 'SUL',
        'TIPO (Cateira)': 'FTTH EXPANSÃO',
        'DR': 'PR',
        'Seq': '1',
        'Dc Simulação': 'SIM-904120',
        'Orçamento': 'ORC-2024-001',
        'Status Med. Parcial': 'APROVADA',
        'Valor Parcial R$': '18.450,00',
        'Status Med. Final': 'EM ANÁLISE',
        'Valor Final R$': '42.300,00',
        'Tempo': '45',
        'AGING': '12',
        'Data Status': '28/08/2024',
        'UF': 'PR',
        'Localidade': 'CURITIBA',
        'Tipo de Projeto': 'EXPANSÃO PON',
        'Descricao': 'IMPLANTAÇÃO REDE ÓPTICA BAIRRO BATEL - ETAPA 2',
        'Status da DC (Atual)': 'EM ANDAMENTO',
        'Backlog/Input?': 'INPUT',
        'Status Informe (Campo)': 'EM EXECUÇÃO',
        'Resp.Medição': 'PATRICK',
        'Pendência (Implantação)': 'OK',
        'Pendência (Celula Sap)': 'OK',
        'Pendência (Projetos)': 'OK',
        'Data Previsão Entrega (Medição)': '15/09/2024',
        'Data Previsão Entrega (Projeto)': '10/09/2024',
        'Responsavel': 'MEDIÇÃO',
        'Data Tratativa': '30/08/2024',
        'OBS (Medição)': 'Obra em ritmo acelerado. Medição parcial liberada.',
      },
      {
        'DC': 'DC-904121',
        'REG': 'SUL',
        'TIPO (Cateira)': 'REDE PRIMÁRIA',
        'DR': 'SC',
        'Seq': '2',
        'Dc Simulação': 'SIM-904121',
        'Orçamento': 'ORC-2024-002',
        'Status Med. Parcial': 'PENDENTE',
        'Valor Parcial R$': '8.200,00',
        'Status Med. Final': 'NÃO INICIADA',
        'Valor Final R$': '26.800,00',
        'Tempo': '62',
        'AGING': '25',
        'Data Status': '20/08/2024',
        'UF': 'SC',
        'Localidade': 'JOINVILLE',
        'Tipo de Projeto': 'ANEL ÓPTICO',
        'Descricao': 'LANÇAMENTO DE CABO 72 FO TRECHO ZONA INDUSTRIAL',
        'Status da DC (Atual)': 'PENDÊNCIA DOC',
        'Backlog/Input?': 'BACKLOG',
        'Status Informe (Campo)': 'PARALISADA',
        'Resp.Medição': 'SHEILA',
        'Pendência (Implantação)': 'FOTOS',
        'Pendência (Celula Sap)': 'BAIXA PARCIAL',
        'Pendência (Projetos)': 'ASBUILT',
        'Data Previsão Entrega (Medição)': '22/09/2024',
        'Data Previsão Entrega (Projeto)': '18/09/2024',
        'Responsavel': 'IMPLANTAÇÃO',
        'Data Tratativa': '29/08/2024',
        'OBS (Medição)': 'Aguardando envio das fotos de campo e atualização do As-Built.',
      },
      {
        'DC': 'DC-904122',
        'REG': 'SUL',
        'TIPO (Cateira)': 'FTTH SOBRADA',
        'DR': 'RS',
        'Seq': '3',
        'Dc Simulação': 'SIM-904122',
        'Orçamento': 'ORC-2024-003',
        'Status Med. Parcial': 'APROVADA',
        'Valor Parcial R$': '12.000,00',
        'Status Med. Final': 'APROVADA',
        'Valor Final R$': '15.500,00',
        'Tempo': '30',
        'AGING': '5',
        'Data Status': '30/08/2024',
        'UF': 'RS',
        'Localidade': 'PORTO ALEGRE',
        'Tipo de Projeto': 'CONEXÃO B2B',
        'Descricao': 'ATENDIMENTO DEDICADO POLO TECNOLÓGICO',
        'Status da DC (Atual)': 'CONCLUÍDA',
        'Backlog/Input?': 'INPUT',
        'Status Informe (Campo)': 'CONCLUÍDO',
        'Resp.Medição': 'LEANDRO',
        'Pendência (Implantação)': 'OK',
        'Pendência (Celula Sap)': 'OK',
        'Pendência (Projetos)': 'OK',
        'Data Previsão Entrega (Medição)': '05/09/2024',
        'Data Previsão Entrega (Projeto)': '02/09/2024',
        'Responsavel': 'FINALIZADO',
        'Data Tratativa': '30/08/2024',
        'OBS (Medição)': 'Documentação completa e medição final deferida.',
      },
      {
        'DC': 'DC-904123',
        'REG': 'SUDESTE',
        'TIPO (Cateira)': 'FTTA CONDOMÍNIO',
        'DR': 'SP',
        'Seq': '4',
        'Dc Simulação': 'SIM-904123',
        'Orçamento': 'ORC-2024-004',
        'Status Med. Parcial': 'NÃO APLICÁVEL',
        'Valor Parcial R$': '0,00',
        'Status Med. Final': 'PENDENTE',
        'Valor Final R$': '34.900,00',
        'Tempo': '80',
        'AGING': '40',
        'Data Status': '15/08/2024',
        'UF': 'SP',
        'Localidade': 'CAMPINAS',
        'Tipo de Projeto': 'FTTA VERTICAL',
        'Descricao': 'PASSAGEM DE CABO PRUMADA EDIFÍCIO HORIZONTE',
        'Status da DC (Atual)': 'AGUARDANDO SAP',
        'Backlog/Input?': 'BACKLOG',
        'Status Informe (Campo)': 'EM EXECUÇÃO',
        'Resp.Medição': 'MARIANA',
        'Pendência (Implantação)': 'VALIDAÇÃO APP DE OBRAS',
        'Pendência (Celula Sap)': 'TRATATIVA SAP HANNA',
        'Pendência (Projetos)': 'CADASTRO NETWIN',
        'Data Previsão Entrega (Medição)': '28/09/2024',
        'Data Previsão Entrega (Projeto)': '25/09/2024',
        'Responsavel': 'CELULA SAP',
        'Data Tratativa': '31/08/2024',
        'OBS (Medição)': 'Reserva de material travada no SAP Hanna.',
      },
      {
        'DC': 'DC-904124',
        'REG': 'SUL',
        'TIPO (Cateira)': 'INFRAESTRUTURA',
        'DR': 'PR',
        'Seq': '5',
        'Dc Simulação': 'SIM-904124',
        'Orçamento': 'ORC-2024-005',
        'Status Med. Parcial': 'APROVADA',
        'Valor Parcial R$': '5.400,00',
        'Status Med. Final': 'NÃO INICIADA',
        'Valor Final R$': '19.200,00',
        'Tempo': '22',
        'AGING': '8',
        'Data Status': '25/08/2024',
        'UF': 'PR',
        'Localidade': 'LONDRINA',
        'Tipo de Projeto': 'ADEQUAÇÃO DE POSTEAMENTO',
        'Descricao': 'SUBSTITUIÇÃO DE BRAÇADEIRAS E ESPALHAMENTO DE CABO',
        'Status da DC (Atual)': 'EM ANDAMENTO',
        'Backlog/Input?': 'INPUT',
        'Status Informe (Campo)': 'EM EXECUÇÃO',
        'Resp.Medição': 'VAGNER',
        'Pendência (Implantação)': 'DIARIO/TESTE',
        'Pendência (Celula Sap)': 'OK',
        'Pendência (Projetos)': 'OK',
        'Data Previsão Entrega (Medição)': '12/09/2024',
        'Data Previsão Entrega (Projeto)': '08/09/2024',
        'Responsavel': 'PROJETO',
        'Data Tratativa': '27/08/2024',
        'OBS (Medição)': 'Diário de obras recebido, pendente teste OTDR.',
      },
    ];

    const finalAmostras = amostras.map((item) => ({
      ...sanitizeRecord(item),
      _id: getSafeDocId(item.DC),
      _updatedAt: new Date().toISOString(),
      _updatedBy: 'Seed Inicial',
    }));

    setRegistros(finalAmostras);
    saveLocalRegistros(finalAmostras);

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const metaInfo: ImportMetadata = {
      dataHora: now.toISOString(),
      dataHoraFormatada: formattedDate,
      totalRegistros: amostras.length,
      tipo: 'padrao',
      usuario: 'Demonstração Inicial',
    };
    setLastImportInfo(metaInfo);
    try {
      localStorage.setItem(LOCAL_STORAGE_META_KEY, JSON.stringify(metaInfo));
    } catch (e) {}

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        finalAmostras.forEach((item) => {
          const docRef = doc(db, 'registros', item._id);
          batch.set(docRef, item);
        });
        await commitBatchWithTimeout(batch, 15000, 'popular dados de exemplo');
        await setDoc(doc(db, 'metadata', 'importInfo'), metaInfo, { merge: true });
      } catch (e) {
        console.warn('Aviso ao sincronizar dados de exemplo no Firestore:', e);
      }
    }
  };

  return (
    <DataContext.Provider
      value={{
        registros,
        segmentacoes,
        lastImportInfo,
        historicoEdicoes,
        loadingRegistros,
        loadingSegmentacoes,
        isRealtimeConnected,
        realtimeStatus,
        lastSyncTimestamp,
        quotaExhausted,
        quotaErrorMessage,
        error,
        clearQuotaError,
        refreshRegistros,
        fetchHistoricoForDC,
        exportarAuditoriaGeral,
        arquivarELimparHistorico,
        updateRegistroBloco2,
        addSegmentacaoOpcao,
        addMultiplasSegmentacaoOpcoes,
        editSegmentacaoOpcao,
        removeSegmentacaoOpcao,
        limparSegmentacao,
        reorderSegmentacaoOpcoes,
        restaurarSegmentacoesPadrao,
        analisarImportacaoPadrao,
        executarImportacaoPadrao,
        executarImportacaoMassiva,
        popularDadosExemplo,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
