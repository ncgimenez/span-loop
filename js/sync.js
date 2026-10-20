// Span Loop - Multi-Device Cloud Sync with Supabase (Fully Unified with Span Focus & Span Plan)

export const DEFAULT_SUPABASE_URL = 'https://xzoukiveknyuxmbrcsvb.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_8g571gv3CFOyJ0lMtaAf4w_CcITQovd';

export class CloudSync {
  constructor(store, callbacks = {}) {
    this.store = store;
    this.callbacks = callbacks; // onStatusChange, onSyncSuccess, onSyncError
    this.supabaseClient = null;
    this.realtimeChannel = null;
    this.isSyncing = false;
    this.lastWriteTime = 0;
    this.debounceTimer = null;
    this.syncStatus = 'disconnected'; // 'connected', 'syncing', 'error', 'disconnected'

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

  setSyncUserId(newKey) {
    const cleanKey = (newKey || '').trim();
    if (!cleanKey) return false;
    localStorage.setItem('span_sync_user', cleanKey);
    this.initClient();
    this.setupRealtime();
    this.loadFromCloud();
    return true;
  }

  init() {
    this.initClient();
    this.setupRealtime();
    this.loadFromCloud();

    // Listen to local store changes and push to cloud (debounced)
    this.store.subscribe(() => {
      if (this.isSyncing) return;
      this.scheduleSave();
    });
  }

  initClient() {
    const url = this.store.settings.supabaseUrl || DEFAULT_SUPABASE_URL;
    const key = this.store.settings.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;

    if (typeof window.supabase !== 'undefined' && url && key) {
      try {
        this.supabaseClient = window.supabase.createClient(url, key);
        this.syncStatus = 'connected';
      } catch (err) {
        console.warn('[Span Loop Sync] Supabase init failed:', err);
        this.supabaseClient = null;
        this.syncStatus = 'error';
      }
    } else {
      this.supabaseClient = null;
      this.syncStatus = 'disconnected';
    }
    this.notifyStatus();
  }

  notifyStatus() {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(this.syncStatus);
    }
  }

  setupRealtime() {
    if (!this.supabaseClient) return;
    const syncUserId = this.getSyncUserId();

    if (this.realtimeChannel) {
      try {
        this.supabaseClient.removeChannel(this.realtimeChannel);
      } catch (e) {}
    }

    try {
      this.realtimeChannel = this.supabaseClient
        .channel(`loop_user_state_${syncUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_state',
            filter: `id=eq.${syncUserId}`
          },
          (payload) => {
            if (Date.now() - this.lastWriteTime < 2500) return;
            this.handleRemoteChange(payload.new);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[Span Loop Sync] Realtime error:', err);
    }
  }

  handleRemoteChange(remoteRow) {
    if (!remoteRow || !remoteRow.tasks) return;
    const tasksObj = remoteRow.tasks;
    if (Array.isArray(tasksObj.loop_items)) {
      this.isSyncing = true;
      this.store.mergeRemoteDeadlines(tasksObj.loop_items);
      this.isSyncing = false;
    }
    if (Array.isArray(tasksObj.loop_history)) {
      this.isSyncing = true;
      this.store.mergeRemoteHistory(tasksObj.loop_history);
      this.isSyncing = false;
    }
  }

  async loadFromCloud() {
    if (!this.supabaseClient) return;
    const syncUserId = this.getSyncUserId();

    try {
      this.syncStatus = 'syncing';
      this.notifyStatus();

      const { data, error } = await this.supabaseClient
        .from('user_state')
        .select('tasks')
        .eq('id', syncUserId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[Span Loop Sync] Cloud read warning:', error.message);
        this.syncStatus = 'error';
        this.notifyStatus();
        return;
      }

      if (data && data.tasks) {
        this.isSyncing = true;
        const tasksObj = data.tasks;
        if (Array.isArray(tasksObj.loop_items) && tasksObj.loop_items.length > 0) {
          this.store.mergeRemoteDeadlines(tasksObj.loop_items);
        }
        if (Array.isArray(tasksObj.loop_history) && tasksObj.loop_history.length > 0) {
          this.store.mergeRemoteHistory(tasksObj.loop_history);
        }
        this.isSyncing = false;
      }

      this.syncStatus = 'connected';
      this.notifyStatus();
      if (this.callbacks.onSyncSuccess) this.callbacks.onSyncSuccess();
    } catch (err) {
      this.isSyncing = false;
      this.syncStatus = 'error';
      this.notifyStatus();
      console.warn('[Span Loop Sync] Load error:', err);
    }
  }

  scheduleSave() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.saveToCloud();
    }, 800);
  }

  async saveToCloud() {
    if (!this.supabaseClient || this.isSyncing) return;
    const syncUserId = this.getSyncUserId();

    try {
      this.lastWriteTime = Date.now();
      this.syncStatus = 'syncing';
      this.notifyStatus();

      // Read existing user_state row to preserve Focus & Plan tasks
      const { data: existingData } = await this.supabaseClient
        .from('user_state')
        .select('tasks')
        .eq('id', syncUserId)
        .maybeSingle();

      const existingTasks = (existingData && existingData.tasks && typeof existingData.tasks === 'object' && !Array.isArray(existingData.tasks))
        ? existingData.tasks
        : {};

      const updatedTasks = {
        ...existingTasks,
        loop_items: this.store.deadlines,
        loop_history: this.store.history
      };

      const payload = {
        id: syncUserId,
        tasks: updatedTasks,
        updated_at: new Date().toISOString()
      };

      await this.supabaseClient.from('user_state').upsert(payload);
      this.syncStatus = 'connected';
      this.notifyStatus();
    } catch (err) {
      console.warn('[Span Loop Sync] Cloud write warning:', err);
      this.syncStatus = 'error';
      this.notifyStatus();
    }
  }
}
