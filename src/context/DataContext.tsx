import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  deleteField,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured, missingFirebaseEnvVars } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
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
  FRRegistro,
  ImportInfoFR,
  getRegistroRegional,
  SegmentacaoDivergencia,
  COLUNAS_SEGMENTADAS_MASSIVA,
  ColunaSegmentadaMassiva,
} from '../types';
import {
  matchCanonicalColumn,
  exportarRelatorioHistoricoParaExcel,
  cleanDC,
  isValidDC,
  validarColunasSegmentadas,
  verificarColunasLeituraMatriz,
  getOpcoesSegmentacaoParaColuna,
  getSafeFRDocId,
  buildFRCompositeKey,
} from '../utils/excel';

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
  frRegistros: FRRegistro[];
  segmentacoes: Record<SegmentacaoKey, string[]>;
  lastImportInfo: ImportMetadata | null;
  importInfoFR: ImportInfoFR | null;
  historicoEdicoes: HistoricoEdicaoItem[];
  loadingRegistros: boolean;
  loadingFRs: boolean;
  loadingSegmentacoes: boolean;
  isRealtimeConnected: boolean;
  realtimeStatus: 'connected' | 'syncing' | 'reconnecting' | 'offline';
  lastSyncTimestamp: number | null;
  quotaExhausted: boolean;
  quotaErrorMessage: string | null;
  error: string | null;
  clearQuotaError: () => void;
  refreshRegistros: () => Promise<void>;
  refreshFRs: () => Promise<void>;
  migrarNomesDeCampos: (
    onProgress?: (processados: number, total: number) => void
  ) => Promise<{ migrados: number; jaOk: number; total: number; erro?: string }>;
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
  analisarImportacaoPadrao: (
    planilhaLinhas: Record<string, any>[],
    detectedColumns?: string[]
  ) => ImportPadraoDiff;
  executarImportacaoPadrao: (
    diff: ImportPadraoDiff,
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => Promise<void>;
  executarImportacaoMassiva: (
    planilhaLinhas: Record<string, any>[],
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => Promise<ImportMassivaResult>;
  executarImportacaoFR: (
    dados: Omit<FRRegistro, 'id'>[],
    fileName: string,
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => Promise<{ total: number; totalImportados?: number; totalIgnorados?: number; erro?: string }>;
  sincronizarFRLocalParaFirestore: (
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => Promise<{ success: boolean; total?: number; erro?: string }>;
  apagarTodaBaseFR: (
    onProgress?: (porcentagem: number, etapa: string) => void
  ) => Promise<{ success: boolean; apagados?: number; restantes?: number; erro?: string }>;
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

const LOCAL_STORAGE_REGISTROS_KEY = 'vtal_local_registros_backup_v5';
const LOCAL_STORAGE_FR_KEY = 'vtal_local_fr_registros_backup_v5';
const LOCAL_STORAGE_FR_META_KEY = 'vtal_local_fr_metadata_v5';
const LOCAL_STORAGE_SEG_KEY = 'vtal_local_segmentacoes_backup';
const LOCAL_STORAGE_META_KEY = 'vtal_local_import_metadata';
const LOCAL_STORAGE_HISTORICO_KEY = 'vtal_local_historico_edicoes';

export function normalizeRegistroData(data: any, docId: string): Registro {
  const norm = { _id: docId, ...data } as any;
  if (norm['TIPO (Carteira)'] === undefined && norm['TIPO (Cateira)'] !== undefined) {
    norm['TIPO (Carteira)'] = norm['TIPO (Cateira)'];
  }
  if (norm['Plan. Estruturante'] === undefined && norm['Backlog/Input?'] !== undefined) {
    norm['Plan. Estruturante'] = norm['Backlog/Input?'];
  }
  const regResolved = getRegistroRegional(norm);
  if (regResolved) {
    norm.REG = regResolved;
  }
  return norm as Registro;
}

function getLocalStoredFR(): FRRegistro[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_FR_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveLocalFR(list: FRRegistro[]) {
  try {
    if (typeof window !== 'undefined') {
      if (!list || list.length === 0) {
        localStorage.removeItem(LOCAL_STORAGE_FR_KEY);
      } else {
        localStorage.setItem(LOCAL_STORAGE_FR_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {}
}

function getLocalStoredFRMeta(): ImportInfoFR | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_FR_META_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

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
      if (Array.isArray(parsed)) {
        return parsed.filter((r) => r && isValidDC(r.DC));
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function saveLocalRegistros(list: Registro[]) {
  try {
    if (typeof window !== 'undefined') {
      const validOnly = list.filter((r) => r && isValidDC(r.DC));
      localStorage.setItem(LOCAL_STORAGE_REGISTROS_KEY, JSON.stringify(validOnly));
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
  let timeoutFired = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timeoutFired = true;
      reject(
        new Error(
          `Tempo esgotado (${Math.round(timeoutMs / 1000)}s) ao executar ${contextLabel} no Firestore. Verifique a conexão e as credenciais do Firebase.`
        )
      );
    }, timeoutMs);
  });

  const commitPromise = batch.commit().catch((err) => {
    if (timeoutFired) {
      console.warn(`Firestore commit completou com erro após timeout (${contextLabel}):`, err?.message);
      return;
    }
    throw err;
  });

  try {
    await Promise.race([commitPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// Helper to format detailed batch errors preserving exact Firebase error code and message
function formatBatchErrorMessage(
  err: any,
  successBatches: number,
  failedBatches: number,
  totalBatches: number,
  context: string
): string {
  const code = err?.code ? `${err.code}: ` : (err?.name && err.name !== 'Error' ? `${err.name}: ` : 'permission-denied: ');
  const message = err?.message || 'Missing or insufficient permissions / Falha na comunicação com o Firestore.';
  return `${code}${message} (${successBatches} lote(s) gravado(s) com sucesso, ${failedBatches} de ${totalBatches} lote(s) falharam no Firestore durante ${context}). Atenção: Os dados foram salvos temporariamente apenas na memória local deste navegador e NÃO foram gravados no banco de dados Firestore.`;
}

function createBatchError(
  err: any,
  successBatches: number,
  failedBatches: number,
  totalBatches: number,
  context: string
): Error {
  const code = err?.code || 'permission-denied';
  const message = err?.message || 'Missing or insufficient permissions';
  const fullMsg = formatBatchErrorMessage(err, successBatches, failedBatches, totalBatches, context);
  const errorObj = new Error(fullMsg);
  (errorObj as any).code = code;
  (errorObj as any).originalMessage = message;
  (errorObj as any).successBatches = successBatches;
  (errorObj as any).failedBatches = failedBatches;
  (errorObj as any).totalBatches = totalBatches;
  return errorObj;
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
  const [frRegistros, setFrRegistros] = useState<FRRegistro[]>([]);
  const frRegistrosRef = useRef<FRRegistro[]>(frRegistros);
  useEffect(() => {
    frRegistrosRef.current = frRegistros;
  }, [frRegistros]);
  const [segmentacoes, setSegmentacoes] = useState<Record<SegmentacaoKey, string[]>>(DEFAULT_SEGMENTATIONS);
  const [lastImportInfo, setLastImportInfo] = useState<ImportMetadata | null>(null);
  const [importInfoFR, setImportInfoFR] = useState<ImportInfoFR | null>(null);
  const [historicoEdicoes, setHistoricoEdicoes] = useState<HistoricoEdicaoItem[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState<boolean>(true);
  const [loadingFRs, setLoadingFRs] = useState<boolean>(true);
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
      setRegistros(cached.map((r, idx) => normalizeRegistroData(r, r._id || getSafeDocId(r.DC, idx))));
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
                if (isValidDC(r.DC)) {
                  const key = r._id || getSafeDocId(r.DC);
                  docMap.set(key, r);
                }
              }
              deltaSnap.forEach((docSnap) => {
                const docData = normalizeRegistroData(docSnap.data(), docSnap.id);
                if (isValidDC(docData.DC)) {
                  docMap.set(docSnap.id, docData);
                } else {
                  // Purge phantom/blank document from Firestore
                  deleteDoc(doc(db, 'registros', docSnap.id)).catch(console.warn);
                }
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
              const docData = normalizeRegistroData(docSnap.data(), docSnap.id);
              if (isValidDC(docData.DC)) {
                list.push(docData);
              } else {
                // Purge phantom/blank document from Firestore
                deleteDoc(doc(db, 'registros', docSnap.id)).catch(console.warn);
              }
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
                if (isValidDC(r.DC)) {
                  const key = r._id || getSafeDocId(r.DC);
                  docMap.set(key, r);
                }
              }

              for (const change of changes) {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                  docMap.delete(docId);
                } else {
                  const docData = normalizeRegistroData(change.doc.data(), docId);
                  if (isValidDC(docData.DC)) {
                    docMap.set(docId, docData);
                  } else {
                    docMap.delete(docId);
                  }
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
                    docMap.set(docSnap.id, normalizeRegistroData(docSnap.data(), docSnap.id));
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

  // 1.5 Fetch & continuous real-time sync for FRs
  useEffect(() => {
    if (!user) {
      setFrRegistros([]);
      setLoadingFRs(false);
      return;
    }

    const cachedFR = getLocalStoredFR();
    if (cachedFR && cachedFR.length > 0) {
      setFrRegistros(cachedFR);
      setLoadingFRs(false);
    } else {
      setLoadingFRs(true);
    }

    const cachedMeta = getLocalStoredFRMeta();
    if (cachedMeta) {
      setImportInfoFR(cachedMeta);
    }

    if (!isFirebaseConfigured) {
      setLoadingFRs(false);
      return;
    }

    const frCol = collection(db, 'fr_registros');
    let isCancelled = false;

    // Helper: se a base remota no Firebase estiver vazia, mas houver dados importados localmente,
    // sincroniza automaticamente com o Firestore em segundo plano sem exigir ação manual
    const autoSyncLocalToRemote = async (localList: FRRegistro[]) => {
      if (!localList || localList.length === 0) return;
      try {
        const nowIso = new Date().toISOString();
        const updatedBy = user?.email || auth?.currentUser?.email || 'Sistema (Auto-Sync)';
        const BATCH_SIZE = 100;

        for (let i = 0; i < localList.length; i += BATCH_SIZE) {
          const slice = localList.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          for (const item of slice) {
            const docId = item.id && !item.id.startsWith('fr_local_') ? item.id : doc(frCol).id;
            const docRef = doc(db, 'fr_registros', docId);
            batch.set(docRef, {
              ...sanitizeRecord(item),
              _updatedAt: item._updatedAt || nowIso,
              _updatedBy: item._updatedBy || updatedBy,
            });
          }
          await commitBatchWithTimeout(batch, 30000, `auto-sync lote FR (${i + 1}-${i + slice.length})`);
        }

        const metaInfo: ImportInfoFR = cachedMeta || {
          fileName: 'Auto-sincronizado da base local',
          importedAt: nowIso,
          importedBy: updatedBy,
          totalLinhas: localList.length,
        };
        await setDoc(doc(db, 'metadata', 'importInfoFR'), metaInfo);
        console.log(`[Auto-Sync] ${localList.length} registros de FR sincronizados automaticamente com o Firestore.`);
      } catch (autoErr: any) {
        console.warn('[Auto-Sync] Tentativa de sincronização automática de FR:', autoErr?.message);
      }
    };

    let hasReceivedInitialSnapshot = false;

    const unsub = onSnapshot(
      frCol,
      (snap) => {
        if (isCancelled) return;
        const list: FRRegistro[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as FRRegistro);
        });

        if (list.length > 0) {
          // Nuvem tem dados atualizados: atualiza o estado e armazena no cache local
          setFrRegistros(list);
          saveLocalFR(list);
        } else {
          setFrRegistros([]);
          saveLocalFR([]);
        }

        hasReceivedInitialSnapshot = true;
        setLoadingFRs(false);
      },
      (err) => {
        if (!isCancelled) {
          console.warn('Aviso ao sincronizar FRs em tempo real, tentando consulta direta getDocs:', err?.message);
          getDocs(frCol)
            .then((snap) => {
              if (isCancelled) return;
              const list: FRRegistro[] = [];
              snap.forEach((d) => {
                list.push({ id: d.id, ...d.data() } as FRRegistro);
              });
              if (list.length > 0) {
                setFrRegistros(list);
                saveLocalFR(list);
              } else {
                setFrRegistros([]);
                saveLocalFR([]);
              }
            })
            .catch((e2) => console.warn('Falha também no fallback getDocs de FR:', e2?.message))
            .finally(() => setLoadingFRs(false));
        }
      }
    );

    getDoc(doc(db, 'metadata', 'importInfoFR'))
      .then((metaSnap) => {
        if (!isCancelled && metaSnap.exists()) {
          const meta = metaSnap.data() as ImportInfoFR;
          setImportInfoFR(meta);
          try {
            localStorage.setItem(LOCAL_STORAGE_FR_META_KEY, JSON.stringify(meta));
          } catch (e) {}
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
      unsub();
    };
  }, [user]);

  const refreshFRs = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      setLoadingFRs(true);
      const snap = await getDocs(collection(db, 'fr_registros'));
      const list: FRRegistro[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as FRRegistro);
      });
      setFrRegistros(list);
      saveLocalFR(list);

      const metaSnap = await getDoc(doc(db, 'metadata', 'importInfoFR'));
      if (metaSnap.exists()) {
        const meta = metaSnap.data() as ImportInfoFR;
        setImportInfoFR(meta);
        try {
          localStorage.setItem(LOCAL_STORAGE_FR_META_KEY, JSON.stringify(meta));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Erro ao atualizar FRs:', err);
    } finally {
      setLoadingFRs(false);
    }
  }, []);

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
          list.push(normalizeRegistroData(docSnap.data(), docSnap.id));
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

  // Routine to archive and purge edit history (diasRetencao = 0 means purge ALL, or > 0 for retention)
  const arquivarELimparHistorico = useCallback(
    async (diasRetencao = 0): Promise<{ exportados: number; removidos: number }> => {
      if (!checkIsAdmin()) {
        throw new Error('Acesso restrito: Apenas administradores possuem permissão para arquivar o histórico de auditoria.');
      }

      const hasRetention = typeof diasRetencao === 'number' && diasRetencao > 0;
      const cutoffTimestamp = hasRetention ? Date.now() - diasRetencao * 24 * 60 * 60 * 1000 : Infinity;
      const cached = getLocalStoredHistorico();
      const targetCachedItems = hasRetention
        ? cached.filter((item) => (item.timestamp || 0) < cutoffTimestamp)
        : [...cached];

      let remoteItems: HistoricoEdicaoItem[] = [];
      let totalDeletedFirestore = 0;

      if (isFirebaseConfigured) {
        try {
          const histCol = collection(db, 'historico_edicoes');
          const q = hasRetention
            ? query(histCol, where('timestamp', '<', cutoffTimestamp))
            : query(histCol);
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            remoteItems.push({ id: docSnap.id, ...docSnap.data() } as HistoricoEdicaoItem);
          });

          // Delete from Firestore in batches of 200
          const BATCH_SIZE = 200;
          for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
            const chunk = snap.docs.slice(i, i + BATCH_SIZE);
            const batch = writeBatch(db);
            chunk.forEach((d) => batch.delete(d.ref));
            await commitBatchWithTimeout(batch, 20000, 'limpeza de histórico');
            totalDeletedFirestore += chunk.length;
          }
        } catch (err: any) {
          checkQuotaError(err);
          console.warn('Erro ao arquivar/limpar histórico remoto:', err?.message);
        }
      }

      // 1. Export Excel backup of all items to be purged if any exist
      const allItemsToPurge = deduplicateHistorico([...remoteItems, ...targetCachedItems]);
      if (allItemsToPurge.length > 0) {
        const fileName = hasRetention
          ? `VTAL_Backup_Auditoria_Arquivada_${diasRetencao}d_${new Date().toLocaleDateString('sv')}`
          : `VTAL_Backup_Auditoria_Completo_${new Date().toLocaleDateString('sv')}`;
        exportarRelatorioHistoricoParaExcel(allItemsToPurge, fileName);
      }

      // 2. Purge from local cache and state
      const remainingItems = hasRetention
        ? cached.filter((item) => (item.timestamp || 0) >= cutoffTimestamp)
        : [];
      setHistoricoEdicoes(remainingItems);
      saveLocalHistorico(remainingItems);

      const totalRemoved = Math.max(
        totalDeletedFirestore,
        remoteItems.length,
        targetCachedItems.length
      );

      return {
        exportados: allItemsToPurge.length,
        removidos: totalRemoved,
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
          const rawResp = segData['Resp.Medição'] || segData['Resp.Medição (Sul)'];
          if (rawResp) {
            segData['Resp.Medição'] = rawResp;
            segData['Resp.Medição (Sul)'] = rawResp;
          }
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
  const syncSegState = (prev: Record<SegmentacaoKey, string[]>, key: SegmentacaoKey, opts: string[]) => {
    const next = { ...prev, [key]: opts };
    if (key === 'Resp.Medição (Sul)') next['Resp.Medição'] = opts;
    if (key === 'Resp.Medição') next['Resp.Medição (Sul)'] = opts;
    return next;
  };

  const addSegmentacaoOpcao = async (segKey: SegmentacaoKey, novaOpcao: string) => {
    const limpa = novaOpcao.trim().toUpperCase();
    if (!limpa) return;
    const opcoesAtuais = segmentacoes[segKey] || [];
    if (opcoesAtuais.includes(limpa)) return;

    const novasOpcoes = [...opcoesAtuais, limpa];
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: novasOpcoes }, { merge: true });
    setSegmentacoes((prev) => syncSegState(prev, segKey, novasOpcoes));
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
    setSegmentacoes((prev) => syncSegState(prev, segKey, opcoesAtuais));
  };

  const editSegmentacaoOpcao = async (segKey: SegmentacaoKey, index: number, novoValor: string) => {
    const limpa = novoValor.trim().toUpperCase();
    if (!limpa) return;
    const opcoesAtuais = [...(segmentacoes[segKey] || [])];
    opcoesAtuais[index] = limpa;

    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: opcoesAtuais }, { merge: true });
    setSegmentacoes((prev) => syncSegState(prev, segKey, opcoesAtuais));
  };

  const removeSegmentacaoOpcao = async (segKey: SegmentacaoKey, index: number) => {
    const opcoesAtuais = (segmentacoes[segKey] || []).filter((_, i) => i !== index);
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: opcoesAtuais }, { merge: true });
    setSegmentacoes((prev) => syncSegState(prev, segKey, opcoesAtuais));
  };

  const limparSegmentacao = async (segKey: SegmentacaoKey) => {
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: [] }, { merge: true });
    setSegmentacoes((prev) => syncSegState(prev, segKey, []));
  };

  const reorderSegmentacaoOpcoes = async (segKey: SegmentacaoKey, novasOpcoes: string[]) => {
    const docRef = doc(db, 'segmentacoes', segKey);
    await setDoc(docRef, { id: segKey, nome: segKey, opcoes: novasOpcoes }, { merge: true });
    setSegmentacoes((prev) => syncSegState(prev, segKey, novasOpcoes));
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
    // Direct alias handling for REG
    if (canonicalKey === 'REG') {
      const regResolved = getRegistroRegional(row);
      if (regResolved) return regResolved;
    }
    // Direct alias handling for Plan. Estruturante / Backlog/Input?
    if (canonicalKey === 'Plan. Estruturante' || canonicalKey === 'Backlog/Input?') {
      const planVal =
        row['Plan. Estruturante'] ??
        row['Plan Estruturante'] ??
        row['Planejamento Estruturante'] ??
        row['Backlog/Input?'] ??
        row['Backlog/Input'] ??
        row['BACKLOG/INPUT?'];
      if (planVal !== undefined && planVal !== null) {
        return String(planVal).trim();
      }
    }
    // Direct alias handling for TIPO (Carteira)
    if (canonicalKey === 'TIPO (Carteira)' || canonicalKey === 'TIPO (Cateira)') {
      const cartVal =
        row['TIPO (Carteira)'] ??
        row['TIPO (Cateira)'] ??
        row['TIPO (CARTEIRA)'] ??
        row['Tipo (Carteira)'] ??
        row['Carteira'] ??
        row['CARTEIRA'];
      if (cartVal !== undefined && cartVal !== null) {
        return String(cartVal).trim();
      }
    }
    // Direct alias handling for Tipo de DC
    if (canonicalKey === 'Tipo de DC') {
      const tdcVal =
        row['Tipo de DC'] ??
        row['Tipo DC'] ??
        row['TIPO DE DC'] ??
        row['TIPO DC'];
      if (tdcVal !== undefined && tdcVal !== null) {
        return String(tdcVal).trim();
      }
    }
    // Direct alias handling for Mês Input
    if (canonicalKey === 'Mês Input') {
      const miVal =
        row['Mês Input'] ??
        row['Mes Input'] ??
        row['MES INPUT'] ??
        row['MÊS INPUT'];
      if (miVal !== undefined && miVal !== null) {
        return String(miVal).trim();
      }
    }
    // Direct alias handling for R$ Produção BI.
    if (canonicalKey === 'R$ Produção BI.') {
      const prodVal =
        row['R$ Produção BI.'] ??
        row['R$ Produção BI'] ??
        row['R$ Producao BI.'] ??
        row['R$ Producao BI'] ??
        row['Produção BI.'] ??
        row['Produção BI'] ??
        row['Producao BI'];
      if (prodVal !== undefined && prodVal !== null) {
        return String(prodVal).trim();
      }
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
  const analisarImportacaoPadrao = (
    planilhaLinhas: Record<string, any>[],
    detectedColumns?: string[]
  ): ImportPadraoDiff => {
    // 2) Atualização dos registros da matriz:
    // O sistema só pode atualizar os registros da matriz quando identificar corretamente TODAS as colunas de Leitura da aba "Registros".
    const colsInFile = new Set<string>();
    if (detectedColumns && detectedColumns.length > 0) {
      detectedColumns.forEach((c) => colsInFile.add(c));
    }
    planilhaLinhas.forEach((linha) => {
      Object.keys(linha).forEach((k) => {
        if (k === '_rowNumber') return;
        const matched = matchCanonicalColumn(k);
        if (matched) colsInFile.add(matched);
      });
    });

    const checkMatriz = verificarColunasLeituraMatriz(Array.from(colsInFile));
    if (!checkMatriz.todasPresentes) {
      throw new Error(
        `Não é possível atualizar os registros da matriz: todas as 26 colunas de Leitura da aba "Registros" devem ser identificadas na planilha com os nomes corretos. A atualização é tudo ou nada. Colunas ausentes ou com nome divergente:\n• ${checkMatriz.ausentes.join(
          '\n• '
        )}`
      );
    }

    const dcMapAtual = new Map<string, Registro>();
    registros.forEach((r) => {
      const cleaned = cleanDC(r.DC);
      if (cleaned) {
        dcMapAtual.set(cleaned.toUpperCase(), r);
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
      const rawDc = extractRowField(linha, 'DC');
      const dcVal = cleanDC(rawDc);
      if (!dcVal) return;

      const dcUpper = dcVal.toUpperCase();
      planDcsEncontradas.add(dcUpper);

      // Extract only Bloco 1 fields
      const bloco1: RegistroBloco1 = {
        'DC': dcVal,
        'REG': getRegistroRegional(linha) || extractRowField(linha, 'REG') || 'RSUL',
        'TIPO (Carteira)': extractRowField(linha, 'TIPO (Carteira)') || extractRowField(linha, 'TIPO (Cateira)'),
        'Tipo de DC': extractRowField(linha, 'Tipo de DC'),
        'DR': extractRowField(linha, 'DR'),
        'Seq': extractRowField(linha, 'Seq'),
        'Dc Simulação': extractRowField(linha, 'Dc Simulação'),
        'Orçamento': extractRowField(linha, 'Orçamento'),
        'Status Med. Parcial': extractRowField(linha, 'Status Med. Parcial'),
        'Valor Parcial R$': extractRowField(linha, 'Valor Parcial R$'),
        'Status Med. Final': extractRowField(linha, 'Status Med. Final'),
        'Valor Final R$': extractRowField(linha, 'Valor Final R$'),
        'Pedido': extractRowField(linha, 'Pedido'),
        'Valor Faturado': extractRowField(linha, 'Valor Faturado'),
        'Saldo': extractRowField(linha, 'Saldo'),
        'Tempo': extractRowField(linha, 'Tempo'),
        'AGING': extractRowField(linha, 'AGING'),
        'Data Status': extractRowField(linha, 'Data Status'),
        'UF': extractRowField(linha, 'UF').toUpperCase(),
        'Localidade': extractRowField(linha, 'Localidade'),
        'Tipo de Projeto': extractRowField(linha, 'Tipo de Projeto'),
        'Descricao': extractRowField(linha, 'Descricao'),
        'Status da DC (Atual)': extractRowField(linha, 'Status da DC (Atual)'),
        'Plan. Estruturante': extractRowField(linha, 'Plan. Estruturante') || extractRowField(linha, 'Backlog/Input?'),
        'Mês Input': extractRowField(linha, 'Mês Input'),
        'R$ Produção BI.': extractRowField(linha, 'R$ Produção BI.') || '0,00',
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

    // Removidas: DCs que existem no DB mas NÃO vieram na nova planilha, ou documentos sem DC válida
    const removidas: Registro[] = [];
    registros.forEach((r) => {
      const cleaned = cleanDC(r.DC);
      if (cleaned) {
        if (!planDcsEncontradas.has(cleaned.toUpperCase())) {
          removidas.push(r);
        }
      } else {
        // Documento sem DC válida (fantasma/linha em branco) é automaticamente marcado para remoção e exclusão do Firestore
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
      const cleaned = cleanDC(r.DC);
      if (cleaned) updatedMap.set(cleaned.toUpperCase(), r);
    });

    diff.removidas.forEach((r) => {
      const cleaned = cleanDC(r.DC);
      if (cleaned) updatedMap.delete(cleaned.toUpperCase());
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
      const numBatchesRemovidas = diff.removidas.length > 0 ? Math.ceil(diff.removidas.length / BATCH_SIZE) : 0;
      const numBatchesNovas = diff.novas.length > 0 ? Math.ceil(diff.novas.length / BATCH_SIZE) : 0;
      const numBatchesAtualizadas = diff.atualizadas.length > 0 ? Math.ceil(diff.atualizadas.length / BATCH_SIZE) : 0;
      const totalBatches = numBatchesRemovidas + numBatchesNovas + numBatchesAtualizadas;

      let successBatches = 0;
      let failedBatches = 0;
      let lastBatchError: any = null;

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
            successBatches++;
          } catch (err: any) {
            failedBatches++;
            lastBatchError = err;
            console.error('Falha de gravação no Firestore (exclusão lote):', err);
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
            successBatches++;
          } catch (err: any) {
            failedBatches++;
            lastBatchError = err;
            console.error('Falha de gravação no Firestore (inserção lote):', err);
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
            successBatches++;
          } catch (err: any) {
            failedBatches++;
            lastBatchError = err;
            console.error('Falha de gravação no Firestore (atualização lote):', err);
          }
          completedOps += chunk.length;
          reportProgress(`Atualizando base matriz... (${completedOps}/${totalOps})`);
        }
      }

      // Se algum lote falhou no Firestore, interrompe e lança o erro real
      if (failedBatches > 0) {
        throw createBatchError(
          lastBatchError,
          successBatches,
          failedBatches,
          totalBatches,
          'importação padrão da base matriz'
        );
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
    if (!isAdminRef.current) {
      throw new Error(
        'Você precisa de privilégios de Administrador para confirmar a importação massiva no banco de dados.'
      );
    }

    // 1) Validação das colunas segmentadas na importação massiva
    const divergencias = validarColunasSegmentadas(planilhaLinhas, segmentacoes);
    if (divergencias.length > 0) {
      const primeiroErro = divergencias[0];
      const detalhe = `Linha ${primeiroErro.linha} | Coluna: "${primeiroErro.coluna}" | Valor informado: "${primeiroErro.valorInformado}" — ${primeiroErro.mensagem}${
        primeiroErro.sugestao ? ` (Sugestão: "${primeiroErro.sugestao}")` : ''
      }`;
      throw new Error(
        `Importação massiva bloqueada: foram encontradas ${divergencias.length} divergência(s) com a aba "Segmentação". Nenhum dado foi gravado.\nExemplo: ${detalhe}`
      );
    }

    // 2) Atualização dos registros da matriz na massiva:
    // O sistema só pode atualizar os registros da matriz quando identificar corretamente TODAS as colunas de Leitura da aba "Registros".
    const columnsInFile = new Set<string>();
    planilhaLinhas.forEach((linha) => {
      Object.keys(linha).forEach((k) => {
        if (k === '_rowNumber') return;
        const canonical = matchCanonicalColumn(k);
        if (canonical && canonical !== 'DC') {
          columnsInFile.add(canonical);
        }
      });
    });

    const matrizColsInFile = Array.from(columnsInFile).filter((col) =>
      (BLOCO_1_KEYS as string[]).includes(col)
    );

    if (matrizColsInFile.length > 0) {
      const checkMatriz = verificarColunasLeituraMatriz(['DC', ...Array.from(columnsInFile)]);
      if (!checkMatriz.todasPresentes) {
        throw new Error(
          `Não é possível atualizar os registros da matriz: todas as 26 colunas de Leitura da aba "Registros" devem ser identificadas na planilha com os nomes corretos. A atualização é tudo ou nada. Colunas de Leitura ausentes ou com nome divergente:\n• ${checkMatriz.ausentes.join(
            '\n• '
          )}`
        );
      }
    }

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
          if (rawKey === '_rowNumber') return;
          const canonical = matchCanonicalColumn(rawKey);
          if (canonical && canonical !== 'DC') {
            columnsDetected.add(canonical);
            const val = linha[rawKey];
            if (val !== undefined && val !== null) {
              const strVal = typeof val === 'string' ? val.trim() : String(val).trim();

              // Se a coluna for uma das 6 com segmentação:
              if ((COLUNAS_SEGMENTADAS_MASSIVA as readonly string[]).includes(canonical)) {
                // Célula vazia: não altera o preenchimento existente daquele campo
                if (!strVal) return;
                // Valor divergente: não deve alterar o preenchimento existente
                const opcoesValidas = getOpcoesSegmentacaoParaColuna(
                  canonical as ColunaSegmentadaMassiva,
                  segmentacoes
                );
                if (!opcoesValidas.includes(strVal)) return;
              }

              camposParaAtualizar[canonical] = strVal;
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
      const totalBatches = Math.ceil(validUpdates.length / BATCH_SIZE);
      let successBatches = 0;
      let failedBatches = 0;
      let lastBatchError: any = null;

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
          successBatches++;
        } catch (e: any) {
          failedBatches++;
          lastBatchError = e;
          console.error('Falha de gravação no Firestore (lote massivo):', e);
        }
        completedOps += chunk.length;
        reportProgress(`Gravando registros... (${completedOps}/${totalOps})`);
      }

      if (failedBatches > 0) {
        throw createBatchError(
          lastBatchError,
          successBatches,
          failedBatches,
          totalBatches,
          'importação massiva de registros'
        );
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
        'TIPO (Carteira)': 'FTTH EXPANSÃO',
        'DR': 'PR',
        'Seq': '1',
        'Dc Simulação': 'SIM-904120',
        'Orçamento': 'ORC-2024-001',
        'Status Med. Parcial': 'APROVADA',
        'Valor Parcial R$': '18.450,00',
        'Status Med. Final': 'EM ANÁLISE',
        'Valor Final R$': '42.300,00',
        'Pedido': 'PED-904120',
        'Valor Faturado': '18.450,00',
        'Saldo': '23.850,00',
        'Tempo': '45',
        'AGING': '12',
        'Data Status': '28/08/2024',
        'UF': 'PR',
        'Localidade': 'CURITIBA',
        'Tipo de Projeto': 'EXPANSÃO PON',
        'Descricao': 'IMPLANTAÇÃO REDE ÓPTICA BAIRRO BATEL - ETAPA 2',
        'Status da DC (Atual)': 'EM ANDAMENTO',
        'Plan. Estruturante': 'INPUT',
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
        'TIPO (Carteira)': 'REDE PRIMÁRIA',
        'DR': 'SC',
        'Seq': '2',
        'Dc Simulação': 'SIM-904121',
        'Orçamento': 'ORC-2024-002',
        'Status Med. Parcial': 'PENDENTE',
        'Valor Parcial R$': '8.200,00',
        'Status Med. Final': 'NÃO INICIADA',
        'Valor Final R$': '26.800,00',
        'Pedido': 'PED-904121',
        'Valor Faturado': '0,00',
        'Saldo': '26.800,00',
        'Tempo': '62',
        'AGING': '25',
        'Data Status': '20/08/2024',
        'UF': 'SC',
        'Localidade': 'JOINVILLE',
        'Tipo de Projeto': 'ANEL ÓPTICO',
        'Descricao': 'LANÇAMENTO DE CABO 72 FO TRECHO ZONA INDUSTRIAL',
        'Status da DC (Atual)': 'PENDÊNCIA DOC',
        'Plan. Estruturante': 'BACKLOG',
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
        'TIPO (Carteira)': 'FTTH SOBRADA',
        'DR': 'RS',
        'Seq': '3',
        'Dc Simulação': 'SIM-904122',
        'Orçamento': 'ORC-2024-003',
        'Status Med. Parcial': 'APROVADA',
        'Valor Parcial R$': '12.000,00',
        'Status Med. Final': 'APROVADA',
        'Valor Final R$': '15.500,00',
        'Pedido': 'PED-904122',
        'Valor Faturado': '27.500,00',
        'Saldo': '0,00',
        'Tempo': '30',
        'AGING': '5',
        'Data Status': '30/08/2024',
        'UF': 'RS',
        'Localidade': 'PORTO ALEGRE',
        'Tipo de Projeto': 'CONEXÃO B2B',
        'Descricao': 'ATENDIMENTO DEDICADO POLO TECNOLÓGICO',
        'Status da DC (Atual)': 'CONCLUÍDA',
        'Plan. Estruturante': 'INPUT',
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
        'TIPO (Carteira)': 'FTTA CONDOMÍNIO',
        'DR': 'SP',
        'Seq': '4',
        'Dc Simulação': 'SIM-904123',
        'Orçamento': 'ORC-2024-004',
        'Status Med. Parcial': 'NÃO APLICÁVEL',
        'Valor Parcial R$': '0,00',
        'Status Med. Final': 'PENDENTE',
        'Valor Final R$': '34.900,00',
        'Pedido': 'PED-904123',
        'Valor Faturado': '0,00',
        'Saldo': '34.900,00',
        'Tempo': '80',
        'AGING': '40',
        'Data Status': '15/08/2024',
        'UF': 'SP',
        'Localidade': 'CAMPINAS',
        'Tipo de Projeto': 'FTTA VERTICAL',
        'Descricao': 'PASSAGEM DE CABO PRUMADA EDIFÍCIO HORIZONTE',
        'Status da DC (Atual)': 'AGUARDANDO SAP',
        'Plan. Estruturante': 'BACKLOG',
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
        'TIPO (Carteira)': 'INFRAESTRUTURA',
        'DR': 'PR',
        'Seq': '5',
        'Dc Simulação': 'SIM-904124',
        'Orçamento': 'ORC-2024-005',
        'Status Med. Parcial': 'APROVADA',
        'Valor Parcial R$': '5.400,00',
        'Status Med. Final': 'NÃO INICIADA',
        'Valor Final R$': '19.200,00',
        'Pedido': 'PED-904124',
        'Valor Faturado': '5.400,00',
        'Saldo': '19.200,00',
        'Tempo': '22',
        'AGING': '8',
        'Data Status': '25/08/2024',
        'UF': 'PR',
        'Localidade': 'LONDRINA',
        'Tipo de Projeto': 'ADEQUAÇÃO DE POSTEAMENTO',
        'Descricao': 'SUBSTITUIÇÃO DE BRAÇADEIRAS E ESPALHAMENTO DE CABO',
        'Status da DC (Atual)': 'EM ANDAMENTO',
        'Plan. Estruturante': 'INPUT',
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

  // 10. Migração única de nomes de campos legados (TIPO (Cateira) -> TIPO (Carteira), Backlog/Input? -> Plan. Estruturante)
  const migrarNomesDeCampos = async (
    onProgress?: (processados: number, total: number) => void
  ): Promise<{ migrados: number; jaOk: number; total: number; erro?: string }> => {
    if (!isFirebaseConfigured) {
      return { migrados: 0, jaOk: 0, total: 0, erro: 'Firebase não está configurado.' };
    }

    try {
      const regCol = collection(db, 'registros');
      const snapshot = await getDocs(regCol);
      const total = snapshot.size;

      const toMigrateDocs: { docId: string; payload: Record<string, any> }[] = [];
      let jaOkCount = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let needsMigration = false;
        const payload: Record<string, any> = {
          _updatedAt: new Date().toISOString(),
          _updatedBy: user?.email || 'Migração ADM',
        };

        if (data['TIPO (Cateira)'] !== undefined) {
          needsMigration = true;
          if (data['TIPO (Carteira)'] === undefined || data['TIPO (Carteira)'] === '') {
            payload['TIPO (Carteira)'] = data['TIPO (Cateira)'];
          }
          payload['TIPO (Cateira)'] = deleteField();
        }

        if (data['Backlog/Input?'] !== undefined) {
          needsMigration = true;
          if (data['Plan. Estruturante'] === undefined || data['Plan. Estruturante'] === '') {
            payload['Plan. Estruturante'] = data['Backlog/Input?'];
          }
          payload['Backlog/Input?'] = deleteField();
        }

        if (needsMigration) {
          toMigrateDocs.push({ docId: docSnap.id, payload });
        } else {
          jaOkCount++;
        }
      });

      if (toMigrateDocs.length === 0) {
        return { migrados: 0, jaOk: jaOkCount, total };
      }

      const BATCH_SIZE = 200;
      let processed = 0;
      for (let i = 0; i < toMigrateDocs.length; i += BATCH_SIZE) {
        const slice = toMigrateDocs.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const item of slice) {
          const docRef = doc(db, 'registros', item.docId);
          batch.set(docRef, item.payload, { merge: true });
        }
        await commitBatchWithTimeout(batch, 35000, `migração lote ${Math.floor(i / BATCH_SIZE) + 1}`);
        processed += slice.length;
        onProgress?.(processed, toMigrateDocs.length);
      }

      await refreshRegistros();
      return {
        migrados: toMigrateDocs.length,
        jaOk: jaOkCount,
        total,
      };
    } catch (err: any) {
      console.error('Erro na migração de campos:', err);
      return {
        migrados: 0,
        jaOk: 0,
        total: 0,
        erro: err.message || 'Erro inesperado ao executar migração no Firestore.',
      };
    }
  };

  // 11. Executar Importação Incremental de FR (Grava apenas novos FRs e ignora duplicados)
  const executarImportacaoFR = async (
    dados: Omit<FRRegistro, 'id'>[],
    fileName: string,
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<{ total: number; totalImportados?: number; totalIgnorados?: number; erro?: string }> => {
    onProgress?.(10, 'Iniciando conexão direta com o Firebase...');

    try {
      const nowIso = new Date().toISOString();
      const updatedBy = user?.email || auth?.currentUser?.email || 'ADM';

      if (isFirebaseConfigured) {
        const frCol = collection(db, 'fr_registros');

        // Verificação prévia: usuário precisa ter role 'ADM' no Firestore
        onProgress?.(15, 'Validando permissão de Administrador no Firestore...');
        let currentAuthUser = auth.currentUser;
        if (!currentAuthUser && typeof (auth as any).authStateReady === 'function') {
          await (auth as any).authStateReady().catch(() => {});
          currentAuthUser = auth.currentUser;
        }

        if (!currentAuthUser) {
          return {
            total: 0,
            erro: 'permission-denied: Sessão de autenticação não encontrada no Firebase Authentication. Para gravar dados no Firestore, sua conta precisa estar conectada. Por favor, saia do sistema e faça login novamente com seu e-mail e senha.',
          };
        }

        // Renova o token do Firebase Auth
        try {
          await currentAuthUser.getIdToken(true);
        } catch (tokenErr) {
          console.warn('Aviso ao renovar token do Firebase Auth:', tokenErr);
        }

        const realAuthUid = currentAuthUser.uid;
        const currentEmail = (currentAuthUser.email || user?.email || profile?.email || '').trim().toLowerCase();
        const isMaster = isSystemAdminEmail(currentEmail) || isSystemAdminEmail(user?.email);

        try {
          const userDocRef = doc(db, 'users', realAuthUid);
          let userDocSnap = await getDoc(userDocRef);

          if ((!userDocSnap.exists() || userDocSnap.data()?.role !== 'ADM') && isMaster) {
            try {
              await setDoc(
                userDocRef,
                {
                  uid: realAuthUid,
                  email: currentEmail,
                  name: currentAuthUser.displayName || user?.displayName || profile?.name || 'Caio Lira',
                  role: 'ADM',
                  status: 'active',
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
              userDocSnap = await getDoc(userDocRef);
            } catch (initErr) {
              console.warn('Aviso ao sincronizar documento de administrador no Firestore:', initErr);
            }
          }

          const userData = userDocSnap.exists() ? userDocSnap.data() : null;
          const isAdm = checkIsAdmin() || isMaster || userData?.role === 'ADM' || profile?.role === 'ADM' || isAdmin;
          if (!isAdm) {
            return {
              total: 0,
              erro: `permission-denied: Permissão insuficiente. Para importar a base de FR, o seu usuário (${currentEmail || realAuthUid}) precisa ter perfil de Administrador (role: 'ADM') no Firestore.`,
            };
          }
        } catch (permErr: any) {
          const isAdmFallback = checkIsAdmin() || isMaster || profile?.role === 'ADM' || isAdmin;
          if (!isAdmFallback) {
            const code = permErr?.code || 'permission-denied';
            const msg = permErr?.message || 'Erro ao validar perfil de administrador no Firestore';
            return {
              total: 0,
              erro: `${code}: ${msg}. Falha ao verificar perfil em users/${realAuthUid}.`,
            };
          }
        }

        // 1. Identificar registros existentes usando a lista em memória (frRegistros)
        onProgress?.(20, 'Verificando registros existentes na base...');
        let currentExistingFRs = frRegistrosRef.current;
        // Se a lista em memória estiver vazia, faz uma checagem remota rápida
        if (currentExistingFRs.length === 0) {
          try {
            const snap = await getDocs(frCol);
            if (!snap.empty) {
              const list: FRRegistro[] = [];
              snap.forEach((d) => list.push({ id: d.id, ...d.data() } as FRRegistro));
              currentExistingFRs = list;
              setFrRegistros(list);
              saveLocalFR(list);
            }
          } catch (e) {
            console.warn('Checagem de registros existentes:', e);
          }
        }

        const existingFrSet = new Set<string>();
        currentExistingFRs.forEach((r) => {
          const frVal = String(r.FR || r.id || '').trim();
          if (frVal) {
            existingFrSet.add(buildFRCompositeKey(frVal, r['DC MIGRADA/OPERAÇÃO']));
          }
        });

        // 2. Filtro incremental: apenas combinações (FR + DC MIGRADA/OPERAÇÃO) válidas, inéditas e deduplicadas dentro do próprio CSV
        const seenInCsv = new Set<string>();
        const toInsert: Omit<FRRegistro, 'id'>[] = [];
        let totalIgnorados = 0;

        for (const item of dados) {
          const rawFr = String(item.FR || '').trim();
          if (!rawFr) {
            totalIgnorados++;
            continue;
          }
          const compositeKey = buildFRCompositeKey(item.FR, item['DC MIGRADA/OPERAÇÃO']);
          if (existingFrSet.has(compositeKey)) {
            totalIgnorados++;
            continue;
          }
          if (seenInCsv.has(compositeKey)) {
            totalIgnorados++;
            continue;
          }
          seenInCsv.add(compositeKey);
          toInsert.push(item);
        }

        // Se nenhum registro novo foi identificado
        if (toInsert.length === 0) {
          const metaInfo: ImportInfoFR = {
            fileName,
            importedAt: nowIso,
            importedBy: updatedBy,
            totalLinhas: dados.length,
            totalImportado: 0,
            totalIgnorado: totalIgnorados,
          };
          try {
            await setDoc(doc(db, 'metadata', 'importInfoFR'), metaInfo, { merge: true });
          } catch (e) {}
          setImportInfoFR(metaInfo);
          try {
            localStorage.setItem(LOCAL_STORAGE_FR_META_KEY, JSON.stringify(metaInfo));
          } catch (e) {}

          onProgress?.(100, `Importação concluída: 0 novos registros gravados, ${totalIgnorados} ignorados (já existentes).`);
          return {
            total: 0,
            totalImportados: 0,
            totalIgnorados,
          };
        }

        // 3. Gravação incremental em lotes de até 150 documentos
        const newlyCreatedRefs: any[] = [];
        const newlyCreatedList: FRRegistro[] = [];
        const BATCH_SIZE = 150;
        const totalBatches = Math.ceil(toInsert.length / BATCH_SIZE);
        let successBatches = 0;
        let failedBatches = 0;
        let lastBatchError: any = null;

        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const slice = toInsert.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const pct = 25 + Math.round(((i + slice.length) / toInsert.length) * 65);
          onProgress?.(
            pct,
            `Gravando novos registros (lote ${batchNum} de ${totalBatches})...`
          );

          const batch = writeBatch(db);
          const batchRefs: any[] = [];
          const batchItems: FRRegistro[] = [];

          for (const item of slice) {
            const docId = getSafeFRDocId(item.FR, item['DC MIGRADA/OPERAÇÃO']);
            const docRef = doc(frCol, docId);
            const sanitized = sanitizeRecord(item);
            batch.set(
              docRef,
              {
                ...sanitized,
                _updatedAt: nowIso,
                _updatedBy: updatedBy,
              },
              { merge: true }
            );
            batchRefs.push(docRef);
            batchItems.push({
              id: docId,
              ...item,
              _updatedAt: nowIso,
              _updatedBy: updatedBy,
            });
          }

          try {
            await commitBatchWithTimeout(batch, 25000, `gravação lote ${batchNum} FR`);
            successBatches++;
            newlyCreatedRefs.push(...batchRefs);
            newlyCreatedList.push(...batchItems);
          } catch (batchErr: any) {
            failedBatches++;
            lastBatchError = batchErr;
            console.error(`Falha no lote ${batchNum} de FR:`, batchErr);
            break;
          }
        }

        // 4. Se algum lote falhar, interrompe e faz rollback APENAS dos documentos novos desta tentativa
        if (failedBatches > 0) {
          onProgress?.(90, 'Interrompendo e desfazendo registros parciais desta importação...');
          if (newlyCreatedRefs.length > 0) {
            const BATCH_SIZE_RB = 150;
            for (let i = 0; i < newlyCreatedRefs.length; i += BATCH_SIZE_RB) {
              const slice = newlyCreatedRefs.slice(i, i + BATCH_SIZE_RB);
              const rbBatch = writeBatch(db);
              for (const r of slice) {
                rbBatch.delete(r);
              }
              try {
                await commitBatchWithTimeout(rbBatch, 20000, 'rollback lote parcial FR');
              } catch (rbErr) {
                console.warn('Aviso no rollback parcial:', rbErr);
              }
            }
          }

          const errCode = lastBatchError?.code || 'write-failed';
          const errMsg = lastBatchError?.message || 'Erro ao gravar registros no Firestore';
          return {
            total: 0,
            totalImportados: 0,
            totalIgnorados,
            erro: `Importação interrompida no lote ${successBatches + 1} (${errCode}: ${errMsg}). Os registros gravados nesta tentativa foram revertidos e a base existente de FR foi preservada intacta.`,
          };
        }

        // 5. Sucesso: nenhum documento antigo é apagado. Atualiza metadados e estado incrementalmente
        const metaInfo: ImportInfoFR = {
          fileName,
          importedAt: nowIso,
          importedBy: updatedBy,
          totalLinhas: dados.length,
          totalImportado: newlyCreatedList.length,
          totalIgnorado: totalIgnorados,
        };
        try {
          await setDoc(doc(db, 'metadata', 'importInfoFR'), metaInfo, { merge: true });
        } catch (metaErr: any) {
          console.warn('Aviso ao gravar metadados de FR:', metaErr?.message);
        }

        // Soma os novos aos existentes, sem substituir
        const mergedList = [...currentExistingFRs, ...newlyCreatedList];
        setFrRegistros(mergedList);
        saveLocalFR(mergedList);
        setImportInfoFR(metaInfo);
        try {
          localStorage.setItem(LOCAL_STORAGE_FR_META_KEY, JSON.stringify(metaInfo));
        } catch (e) {}

        onProgress?.(100, `Importação concluída: ${newlyCreatedList.length} novos registros gravados, ${totalIgnorados} ignorados (já existentes).`);
        return {
          total: newlyCreatedList.length,
          totalImportados: newlyCreatedList.length,
          totalIgnorados,
        };
      } else {
        // Fallback local se Firebase não estiver configurado
        const existingFrSet = new Set<string>();
        frRegistrosRef.current.forEach((r) => {
          const frVal = String(r.FR || r.id || '').trim();
          if (frVal) {
            existingFrSet.add(buildFRCompositeKey(frVal, r['DC MIGRADA/OPERAÇÃO']));
          }
        });

        const seenInCsv = new Set<string>();
        const toInsert: Omit<FRRegistro, 'id'>[] = [];
        let totalIgnorados = 0;

        for (const item of dados) {
          const rawFr = String(item.FR || '').trim();
          if (!rawFr) {
            totalIgnorados++;
            continue;
          }
          const compositeKey = buildFRCompositeKey(item.FR, item['DC MIGRADA/OPERAÇÃO']);
          if (existingFrSet.has(compositeKey)) {
            totalIgnorados++;
            continue;
          }
          if (seenInCsv.has(compositeKey)) {
            totalIgnorados++;
            continue;
          }
          seenInCsv.add(compositeKey);
          toInsert.push(item);
        }

        const localList: FRRegistro[] = toInsert.map((item) => ({
          id: getSafeFRDocId(item.FR, item['DC MIGRADA/OPERAÇÃO']),
          ...item,
          _updatedAt: nowIso,
          _updatedBy: updatedBy,
        }));

        const mergedLocal = [...frRegistrosRef.current, ...localList];
        const metaInfo: ImportInfoFR = {
          fileName,
          importedAt: nowIso,
          importedBy: updatedBy,
          totalLinhas: dados.length,
          totalImportado: localList.length,
          totalIgnorado: totalIgnorados,
        };
        setFrRegistros(mergedLocal);
        saveLocalFR(mergedLocal);
        setImportInfoFR(metaInfo);
        onProgress?.(100, `Importação concluída: ${localList.length} novos registros gravados, ${totalIgnorados} ignorados.`);
        return {
          total: localList.length,
          totalImportados: localList.length,
          totalIgnorados,
        };
      }
    } catch (err: any) {
      console.error('Erro na gravação de FR:', err);
      return { total: 0, erro: `${err?.code || 'error'}: ${err?.message || 'Falha ao processar arquivo.'}` };
    }
  };

  // 12. Apagar Toda a Base de FR (Exclusão Completa em Lotes pelo ADM)
  const apagarTodaBaseFR = async (
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<{ success: boolean; apagados?: number; restantes?: number; erro?: string }> => {
    onProgress?.(5, 'Validando permissão de Administrador...');

    if (isFirebaseConfigured) {
      let currentAuthUser = auth.currentUser;
      if (!currentAuthUser && typeof (auth as any).authStateReady === 'function') {
        await (auth as any).authStateReady().catch(() => {});
        currentAuthUser = auth.currentUser;
      }

      if (!currentAuthUser) {
        return {
          success: false,
          erro: 'permission-denied: Sessão de autenticação não encontrada no Firebase. Faça login novamente.',
        };
      }

      try {
        await currentAuthUser.getIdToken(true);
      } catch (e) {}

      const realAuthUid = currentAuthUser.uid;
      const currentEmail = (currentAuthUser.email || user?.email || profile?.email || '').trim().toLowerCase();
      const isMaster = isSystemAdminEmail(currentEmail) || isSystemAdminEmail(user?.email);
      const isAdm = checkIsAdmin() || isMaster || profile?.role === 'ADM' || isAdmin;

      if (!isAdm) {
        return {
          success: false,
          erro: 'permission-denied: Apenas Administradores têm permissão para apagar a base de FR.',
        };
      }

      onProgress?.(15, 'Consultando todos os registros de FR no Firebase...');
      const frCol = collection(db, 'fr_registros');
      let allDocs: any[] = [];
      try {
        const snap = await getDocs(frCol);
        allDocs = snap.docs;
      } catch (getErr: any) {
        try {
          await currentAuthUser.getIdToken(true);
          const snap2 = await getDocs(frCol);
          allDocs = snap2.docs;
        } catch (getErr2: any) {
          return {
            success: false,
            erro: `Falha ao consultar documentos para exclusão: ${getErr2?.message || 'Erro de conexão com o Firestore.'}`,
          };
        }
      }

      const totalToDelete = allDocs.length;
      if (totalToDelete === 0) {
        setFrRegistros([]);
        saveLocalFR([]);
        setImportInfoFR(null);
        try {
          localStorage.removeItem(LOCAL_STORAGE_FR_KEY);
          localStorage.removeItem(LOCAL_STORAGE_FR_META_KEY);
          await deleteDoc(doc(db, 'metadata', 'importInfoFR'));
        } catch (e) {}
        onProgress?.(100, 'A base de FR já está vazia.');
        return { success: true, apagados: 0, restantes: 0 };
      }

      const BATCH_SIZE = 150;
      const totalBatches = Math.ceil(totalToDelete / BATCH_SIZE);
      let deletedCount = 0;
      let lastErr: any = null;

      for (let i = 0; i < totalToDelete; i += BATCH_SIZE) {
        const slice = allDocs.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = writeBatch(db);
        for (const d of slice) {
          batch.delete(d.ref);
        }

        try {
          await commitBatchWithTimeout(batch, 25000, `exclusão lote ${batchNum} de ${totalBatches} FR`);
          deletedCount += slice.length;
        } catch (delErr: any) {
          lastErr = delErr;
          console.error(`Falha ao apagar lote ${batchNum} de FR:`, delErr);
          break; // Interrompe para reportar o progresso
        }

        const pct = 20 + Math.round((deletedCount / totalToDelete) * 75);
        onProgress?.(pct, `Apagando registros (${deletedCount} de ${totalToDelete})...`);
      }

      if (deletedCount < totalToDelete) {
        const remaining = totalToDelete - deletedCount;
        const remainingIds = new Set(allDocs.slice(deletedCount).map((d) => d.id));
        const updatedLocal = frRegistrosRef.current.filter((r) => remainingIds.has(r.id));
        setFrRegistros(updatedLocal);
        saveLocalFR(updatedLocal);
        return {
          success: false,
          apagados: deletedCount,
          restantes: remaining,
          erro: `A exclusão foi interrompida: ${deletedCount} registros foram apagados, mas restam ${remaining} no banco de dados. (${lastErr?.message || 'Falha no lote'})`,
        };
      }

      // Limpeza completa bem-sucedida
      try {
        await deleteDoc(doc(db, 'metadata', 'importInfoFR'));
      } catch (e) {}

      setFrRegistros([]);
      saveLocalFR([]);
      setImportInfoFR(null);
      try {
        localStorage.removeItem(LOCAL_STORAGE_FR_KEY);
        localStorage.removeItem(LOCAL_STORAGE_FR_META_KEY);
      } catch (e) {}

      onProgress?.(100, 'Base de FR completamente apagada com sucesso!');
      return { success: true, apagados: deletedCount, restantes: 0 };
    } else {
      const prevTotal = frRegistros.length;
      setFrRegistros([]);
      saveLocalFR([]);
      setImportInfoFR(null);
      try {
        localStorage.removeItem(LOCAL_STORAGE_FR_KEY);
        localStorage.removeItem(LOCAL_STORAGE_FR_META_KEY);
      } catch (e) {}
      onProgress?.(100, 'Base de FR local apagada com sucesso!');
      return { success: true, apagados: prevTotal, restantes: 0 };
    }
  };

  // 13. Sincronizar FR Local para Firestore (Não destrutivo: apenas envia registros pendentes)
  const sincronizarFRLocalParaFirestore = useCallback(
    async (
      onProgress?: (porcentagem: number, etapa: string) => void
    ): Promise<{ success: boolean; total?: number; erro?: string }> => {
      if (!isFirebaseConfigured) {
        return { success: false, erro: 'Firebase não está configurado.' };
      }
      const localData = frRegistrosRef.current.length > 0 ? frRegistrosRef.current : getLocalStoredFR();
      if (!localData || localData.length === 0) {
        return { success: false, erro: 'Nenhum registro de FR encontrado localmente para sincronizar.' };
      }

      try {
        const nowIso = new Date().toISOString();
        const updatedBy = user?.email || auth?.currentUser?.email || 'ADM';
        const frCol = collection(db, 'fr_registros');

        let currentAuthUser = auth.currentUser;
        if (!currentAuthUser && typeof (auth as any).authStateReady === 'function') {
          await (auth as any).authStateReady().catch(() => {});
          currentAuthUser = auth.currentUser;
        }

        if (!currentAuthUser) {
          return {
            success: false,
            erro: 'permission-denied: Sessão de autenticação não encontrada. Faça login novamente.',
          };
        }

        try {
          await currentAuthUser.getIdToken(true);
        } catch (tokenErr) {}

        const realAuthUid = currentAuthUser.uid;
        const currentEmail = (currentAuthUser.email || user?.email || profile?.email || '').trim().toLowerCase();
        const isMaster = isSystemAdminEmail(currentEmail) || isSystemAdminEmail(user?.email);
        const isAdm = checkIsAdmin() || isMaster || profile?.role === 'ADM' || isAdmin;

        if (!isAdm) {
          return {
            success: false,
            erro: `permission-denied: Permissão insuficiente. Para sincronizar a base de FR no Firestore, o seu usuário precisa ter perfil de Administrador.`,
          };
        }

        onProgress?.(10, 'Sincronizando registros com o Firebase...');
        const BATCH_SIZE = 150;
        let syncedCount = 0;
        const syncedList: FRRegistro[] = [];

        for (let i = 0; i < localData.length; i += BATCH_SIZE) {
          const slice = localData.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);

          for (const item of slice) {
            const docId = getSafeFRDocId(item.FR || item.id, item['DC MIGRADA/OPERAÇÃO']);
            const docRef = doc(frCol, docId);
            batch.set(
              docRef,
              {
                ...sanitizeRecord(item),
                _updatedAt: item._updatedAt || nowIso,
                _updatedBy: item._updatedBy || updatedBy,
              },
              { merge: true }
            );
            syncedList.push({
              ...item,
              id: docId,
              _updatedAt: item._updatedAt || nowIso,
              _updatedBy: item._updatedBy || updatedBy,
            });
          }

          await commitBatchWithTimeout(batch, 25000, `sincronização FR (${i + 1}-${i + slice.length})`);
          syncedCount += slice.length;
          const pct = Math.round((syncedCount / localData.length) * 100);
          onProgress?.(pct, `Sincronizando com o Firebase (${syncedCount} de ${localData.length})...`);
        }

        setFrRegistros(syncedList);
        saveLocalFR(syncedList);
        onProgress?.(100, 'Sincronização com o Firebase concluída com sucesso!');
        return { success: true, total: syncedCount };
      } catch (err: any) {
        console.error('Erro ao sincronizar FR com Firebase:', err);
        return { success: false, erro: err?.message || 'Falha ao sincronizar com o Firebase.' };
      }
    },
    [user, isFirebaseConfigured, isAdmin, profile]
  );

  return (
    <DataContext.Provider
      value={{
        registros,
        frRegistros,
        segmentacoes,
        lastImportInfo,
        importInfoFR,
        historicoEdicoes,
        loadingRegistros,
        loadingFRs,
        loadingSegmentacoes,
        isRealtimeConnected,
        realtimeStatus,
        lastSyncTimestamp,
        quotaExhausted,
        quotaErrorMessage,
        error,
        clearQuotaError,
        refreshRegistros,
        refreshFRs,
        migrarNomesDeCampos,
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
        executarImportacaoFR,
        sincronizarFRLocalParaFirestore,
        apagarTodaBaseFR,
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
