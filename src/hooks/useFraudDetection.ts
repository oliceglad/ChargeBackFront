import { useState, useCallback } from 'react';
import { ReportHistoryEntry } from '../types';

export const useFraudDetection = (maxEntries = 500) => {
  const [history, setHistory] = useState<ReportHistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('wata_reports_history') || '[]');
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((tg: string, ip: string) => {
    if (!tg && !ip) return;
    const newEntry: ReportHistoryEntry = { tg, ip, date: new Date().toISOString() };
    setHistory(prev => {
      const next = [newEntry, ...prev].slice(0, maxEntries);
      localStorage.setItem('wata_reports_history', JSON.stringify(next));
      return next;
    });
  }, [maxEntries]);

  const getFraudCount = useCallback((tg: string, ip: string) => {
    const today = new Date().toDateString();
    return history.filter(h => {
      const isSameDay = new Date(h.date).toDateString() === today;
      const matchTg = tg && h.tg === tg;
      const matchIp = ip && h.ip === ip;
      return isSameDay && (matchTg || matchIp);
    }).length;
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('wata_reports_history');
  }, []);

  return { history, addToHistory, getFraudCount, clearHistory };
};
