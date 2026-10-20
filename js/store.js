// Span Loop - Reactive State Store & Persistence
import { Recurrence } from './recurrence.js';

const STORAGE_KEY = 'span_loop_deadlines_v1';
const HISTORY_KEY = 'span_loop_history_v1';
const SETTINGS_KEY = 'span_loop_settings_v1';

// Initial realistic seed items for immediate delight
const DEFAULT_DEADLINES = [
  {
    id: 'seed-1',
    title: 'Payer le loyer & charges',
    category: 'finance',
    amount: 890,
    frequency: 'monthly',
    nextDueDate: getRelativeDate(1), // Tomorrow (Urgent)
    reminderRules: [7, 3, 1, 0],
    notificationEmail: 'alexandre@span.app',
    notes: 'Virement automatique à vérifier ou exécuter sur BNP.',
    link: 'https://mabanque.bnpparibas',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-2',
    title: 'Déclaration TVA Trimestrielle',
    category: 'admin',
    amount: 0,
    frequency: 'quarterly',
    nextDueDate: getRelativeDate(4), // This week
    reminderRules: [14, 7, 2, 0],
    notificationEmail: 'alexandre@span.app',
    notes: 'Rapprocher les factures d\'achat sur Pennylane avant soumission.',
    link: 'https://www.impots.gouv.fr',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-3',
    title: 'Résiliation essai Adobe Creative Cloud',
    category: 'subscription',
    amount: 67.50,
    frequency: 'once',
    nextDueDate: getRelativeDate(2), // Urgent (< 48h)
    reminderRules: [3, 1, 0],
    notificationEmail: 'alexandre@span.app',
    notes: 'Résilier avant le prélèvement annuel automatique.',
    link: 'https://account.adobe.com/plans',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-4',
    title: 'Abonnement Netflix Standard',
    category: 'subscription',
    amount: 14.99,
    frequency: 'monthly',
    nextDueDate: getRelativeDate(18), // This month
    reminderRules: [2],
    notificationEmail: 'alexandre@span.app',
    notes: 'Partage de compte familial.',
    link: 'https://netflix.com/youraccount',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-5',
    title: 'Contrôle Technique Véhicule',
    category: 'admin',
    amount: 85,
    frequency: 'biannual',
    nextDueDate: getRelativeDate(45), // Later
    reminderRules: [30, 14, 7],
    notificationEmail: 'alexandre@span.app',
    notes: 'Centre Dekra à 5 min. Penser à vérifier la pression des pneus.',
    link: 'https://dekra-norisko.fr',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-6',
    title: 'Contrôle Annuel Dentiste & Détartrage',
    category: 'health',
    amount: 60,
    frequency: 'annual',
    nextDueDate: getRelativeDate(75), // Later
    reminderRules: [14, 3],
    notificationEmail: 'alexandre@span.app',
    notes: 'Dr. Martin via Doctolib.',
    link: 'https://doctolib.fr',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

function getRelativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export class Store {
  constructor() {
    this.deadlines = [];
    this.history = [];
    this.syncUserId = this.getSyncUserId();
    this.settings = {
      supabaseUrl: 'https://xzoukiveknyuxmbrcsvb.supabase.co',
      supabaseAnonKey: 'sb_publishable_8g571gv3CFOyJ0lMtaAf4w_CcITQovd',
      resendApiKey: '',
      userEmail: 'alexandre@span.app',
      enableDailyCron: true
    };
    this.listeners = new Set();
    this.init();
  }

  getSyncUserId() {
    let id = localStorage.getItem('span_sync_user');
    if (!id) {
      id = 'span_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36);
      localStorage.setItem('span_sync_user', id);
    }
    return id;
  }

  setSyncUserId(newId) {
    const clean = (newId || '').trim();
    if (!clean) return false;
    this.syncUserId = clean;
    localStorage.setItem('span_sync_user', clean);
    this.notify();
    return true;
  }

  init() {
    // Load Settings
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
    } catch (e) {
      console.warn('Error reading settings:', e);
    }

    // Load Deadlines
    try {
      const savedDeadlines = localStorage.getItem(STORAGE_KEY);
      if (savedDeadlines) {
        this.deadlines = JSON.parse(savedDeadlines);
      } else {
        this.deadlines = [...DEFAULT_DEADLINES];
        this.saveDeadlines();
      }
    } catch (e) {
      this.deadlines = [...DEFAULT_DEADLINES];
    }

    // Load History
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      } else {
        // Pre-populate some history items to show consistency score
        this.history = [
          {
            id: 'hist-1',
            deadlineId: 'seed-1',
            title: 'Payer le loyer & charges',
            category: 'finance',
            amount: 890,
            dueDate: getRelativeDate(-29),
            completedAt: new Date(Date.now() - 29 * 86400000).toISOString(),
            wasOnTime: true
          },
          {
            id: 'hist-2',
            deadlineId: 'seed-4',
            title: 'Abonnement Netflix Standard',
            category: 'subscription',
            amount: 14.99,
            dueDate: getRelativeDate(-12),
            completedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
            wasOnTime: true
          },
          {
            id: 'hist-3',
            deadlineId: 'seed-2',
            title: 'Déclaration TVA Trimestrielle',
            category: 'admin',
            amount: 0,
            dueDate: getRelativeDate(-95),
            completedAt: new Date(Date.now() - 93 * 86400000).toISOString(),
            wasOnTime: true
          }
        ];
        this.saveHistory();
      }
    } catch (e) {
      this.history = [];
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    }
  }

  saveDeadlines() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.deadlines));
    } catch (e) {
      console.error('Failed to save deadlines', e);
    }
    this.notify();
  }

  saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch (e) {
      console.error('Failed to save history', e);
    }
    this.notify();
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    this.notify();
  }

  // Add or update a deadline
  saveDeadline(item) {
    if (!item.id) {
      item.id = 'span_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      item.createdAt = new Date().toISOString();
      item.isActive = true;
      this.deadlines.unshift(item);
    } else {
      const idx = this.deadlines.findIndex(d => d.id === item.id);
      if (idx !== -1) {
        this.deadlines[idx] = { ...this.deadlines[idx], ...item, updatedAt: new Date().toISOString() };
      } else {
        this.deadlines.unshift(item);
      }
    }
    this.saveDeadlines();
    return item;
  }

  deleteDeadline(id) {
    this.deadlines = this.deadlines.filter(d => d.id !== id);
    this.saveDeadlines();
  }

  // 1-Click Validation action:
  // Completes current occurrence, shifts date to next cycle, and records to history.
  validateDeadline(id) {
    const item = this.deadlines.find(d => d.id === id);
    if (!item) return null;

    const daysRemaining = Recurrence.getDaysRemaining(item.nextDueDate);
    const wasOnTime = daysRemaining >= 0;

    // Record in history
    const historyEntry = {
      id: 'h_' + Date.now(),
      deadlineId: item.id,
      title: item.title,
      category: item.category,
      amount: item.amount,
      dueDate: item.nextDueDate,
      completedAt: new Date().toISOString(),
      wasOnTime
    };
    this.history.unshift(historyEntry);
    this.saveHistory();

    // Calculate next due date
    const nextDate = Recurrence.calculateNextDueDate(item.nextDueDate, item.frequency, item.customDays);
    if (!nextDate || item.frequency === 'once') {
      // One-time item: deactivate or mark finished
      item.isActive = false;
      item.completedAt = new Date().toISOString();
    } else {
      item.nextDueDate = nextDate;
      item.lastCompletedAt = new Date().toISOString();
    }

    this.saveDeadlines();
    return { item, nextDate, historyEntry };
  }

  // Reset to default seed data
  resetDefaults() {
    this.deadlines = [...DEFAULT_DEADLINES];
    this.saveDeadlines();
  }

  // Merge remote cloud deadlines with local store
  mergeRemoteDeadlines(remoteItems) {
    if (!Array.isArray(remoteItems) || remoteItems.length === 0) return;
    const map = new Map();
    remoteItems.forEach(item => {
      if (item && item.id) map.set(String(item.id), item);
    });
    this.deadlines.forEach(local => {
      if (!local || !local.id) return;
      const remote = map.get(String(local.id));
      if (!remote) {
        map.set(String(local.id), local);
      } else {
        const localT = new Date(local.updatedAt || local.createdAt || 0).getTime();
        const remoteT = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
        if (localT > remoteT) {
          map.set(String(local.id), local);
        }
      }
    });
    this.deadlines = Array.from(map.values());
    this.saveDeadlines();
  }

  // Merge remote cloud history with local store
  mergeRemoteHistory(remoteHistory) {
    if (!Array.isArray(remoteHistory) || remoteHistory.length === 0) return;
    const map = new Map();
    remoteHistory.forEach(h => {
      if (h && h.id) map.set(String(h.id), h);
    });
    this.history.forEach(h => {
      if (h && h.id) map.set(String(h.id), h);
    });
    this.history = Array.from(map.values()).sort((a, b) => {
      return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
    });
    this.saveHistory();
  }

  // Import JSON backup
  importData(data) {
    if (!data) return false;
    if (Array.isArray(data.deadlines)) {
      this.deadlines = data.deadlines;
      this.saveDeadlines();
    }
    if (Array.isArray(data.history)) {
      this.history = data.history;
      this.saveHistory();
    }
    return true;
  }

  // Compute stats
  getStats() {
    const active = this.deadlines.filter(d => d.isActive);
    
    // Total monthly recurring budget
    const monthlyBudget = active.reduce((acc, curr) => {
      return acc + Recurrence.normalizeMonthlyAmount(curr.amount, curr.frequency);
    }, 0);

    // Consistency score (ratio of on-time completions)
    let consistency = 100;
    if (this.history.length > 0) {
      const onTimeCount = this.history.filter(h => h.wasOnTime).length;
      consistency = Math.round((onTimeCount / this.history.length) * 100);
    }

    // Counts by horizon
    const counts = {
      overdue: 0,
      urgent: 0,
      this_week: 0,
      this_month: 0,
      later: 0,
      totalActive: active.length
    };

    active.forEach(item => {
      const h = Recurrence.getHorizon(item.nextDueDate);
      if (counts[h] !== undefined) counts[h]++;
    });

    const sinkingFunds = Recurrence.calculateSinkingFunds(this.deadlines);

    return {
      monthlyBudget,
      consistency,
      totalCompleted: this.history.length,
      counts,
      sinkingFunds
    };
  }
}
