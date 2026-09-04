import { useEffect, useRef, useState, useCallback } from 'react';
import { Registro } from '../types';
import { exportarRegistrosParaExcel } from '../utils/excel';

interface UseAutoExportADMProps {
  isAdmin: boolean;
  userEmail?: string | null;
  userId?: string | null;
  registros: Registro[];
  loadingRegistros: boolean;
}

export interface AutoExportStatus {
  hasExported0815: boolean;
  hasExported1600: boolean;
  lastMessage: string | null;
  clearLastMessage: () => void;
}

// Fixed times in minutes from midnight (local browser/device time)
// 08:15 -> 8 * 60 + 15 = 495
const SLOT_0815_MINUTES = 8 * 60 + 15;
// 16:00 -> 16 * 60 = 960
const SLOT_1600_MINUTES = 16 * 60;

/**
 * Hook to manage automatic downloads of Registros tab data for ADM profile:
 * - Fixed times: 08:15 and 16:00 in user's local timezone.
 * - Missed slot on login:
 *   - After 08:15 and before 16:00: triggers 1 download for 08:15 if not already done today.
 *   - After 16:00: triggers 1 download for 16:00 if not already done today.
 * - Anti-duplication: each slot can only trigger 1 download per day per ADM.
 * - Persistence: tracked in localStorage with date + ADM identifier.
 */
export function useAutoExportADM({
  isAdmin,
  userEmail,
  userId,
  registros,
  loadingRegistros,
}: UseAutoExportADMProps): AutoExportStatus {
  const isExecutingRef = useRef(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  // Helper to compute local date and storage keys
  const getKeys = useCallback(() => {
    const now = new Date();
    // Local date YYYY-MM-DD in user device's timezone
    const todayDateStr = now.toLocaleDateString('sv');
    const adminKey = (userEmail || userId || 'adm').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
      todayDateStr,
      currentMinutes: now.getHours() * 60 + now.getMinutes(),
      key0815: `vtal_auto_download_0815_${todayDateStr}_${adminKey}`,
      key1600: `vtal_auto_download_1600_${todayDateStr}_${adminKey}`,
    };
  }, [userEmail, userId]);

  // Read current day status from localStorage for UI indicators
  const [hasExported0815, setHasExported0815] = useState(false);
  const [hasExported1600, setHasExported1600] = useState(false);

  const refreshStatus = useCallback(() => {
    if (!isAdmin) {
      setHasExported0815(false);
      setHasExported1600(false);
      return;
    }
    const { key0815, key1600 } = getKeys();
    setHasExported0815(!!localStorage.getItem(key0815));
    setHasExported1600(!!localStorage.getItem(key1600));
  }, [isAdmin, getKeys]);

  const checkAndTriggerExport = useCallback(() => {
    // Only ADM profile
    if (!isAdmin) return;

    // Do not export while initial data is loading or empty
    if (loadingRegistros || registros.length === 0) return;

    // Prevent concurrent execution in same tick
    if (isExecutingRef.current) return;

    const { currentMinutes, key0815, key1600 } = getKeys();
    const downloaded0815 = !!localStorage.getItem(key0815);
    const downloaded1600 = !!localStorage.getItem(key1600);

    // Case 1: Current time is between 08:15 and 15:59 local time
    if (currentMinutes >= SLOT_0815_MINUTES && currentMinutes < SLOT_1600_MINUTES) {
      if (!downloaded0815) {
        isExecutingRef.current = true;
        try {
          // Immediately persist to prevent double triggers
          localStorage.setItem(key0815, new Date().toISOString());
          refreshStatus();

          // Export full registros dataset
          exportarRegistrosParaExcel(registros, 'VTAL_OBRAS_Auto_08h15');

          const isMissedSlot = currentMinutes > SLOT_0815_MINUTES;
          const msg = isMissedSlot
            ? 'Download automático das 08:15 executado no login (horário recuperado).'
            : 'Download automático das 08:15 executado com sucesso.';
          setLastMessage(msg);
        } catch (err) {
          console.error('Erro ao executar exportação automática das 08:15:', err);
        } finally {
          setTimeout(() => {
            isExecutingRef.current = false;
          }, 1500);
        }
      }
    }

    // Case 2: Current time is 16:00 or later local time
    else if (currentMinutes >= SLOT_1600_MINUTES) {
      if (!downloaded1600) {
        isExecutingRef.current = true;
        try {
          // Immediately persist to prevent double triggers
          localStorage.setItem(key1600, new Date().toISOString());
          // If 08:15 wasn't logged today, mark it as covered by 16:00 to prevent separate duplicate run
          if (!downloaded0815) {
            localStorage.setItem(key0815, 'covered_by_1600');
          }
          refreshStatus();

          // Export full registros dataset
          exportarRegistrosParaExcel(registros, 'VTAL_OBRAS_Auto_16h00');

          const isMissedSlot = currentMinutes > SLOT_1600_MINUTES;
          const msg = isMissedSlot
            ? 'Download automático das 16:00 executado no login (horário recuperado).'
            : 'Download automático das 16:00 executado com sucesso.';
          setLastMessage(msg);
        } catch (err) {
          console.error('Erro ao executar exportação automática das 16:00:', err);
        } finally {
          setTimeout(() => {
            isExecutingRef.current = false;
          }, 1500);
        }
      }
    }
  }, [isAdmin, loadingRegistros, registros, getKeys, refreshStatus]);

  // Main monitoring effect
  useEffect(() => {
    if (!isAdmin) return;

    // Refresh UI status
    refreshStatus();

    // Run check immediately on mount or when data becomes ready
    checkAndTriggerExport();

    // Check periodically every 15 seconds
    const interval = setInterval(() => {
      checkAndTriggerExport();
      refreshStatus();
    }, 15000);

    // Also check on tab focus or visibility changes
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndTriggerExport();
        refreshStatus();
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAdmin, checkAndTriggerExport, refreshStatus]);

  return {
    hasExported0815,
    hasExported1600,
    lastMessage,
    clearLastMessage: () => setLastMessage(null),
  };
}
