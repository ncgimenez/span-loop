// Span Loop - Main Application Controller (Fully Unified with Span Suite)
import { Store } from './store.js';
import { Recurrence } from './recurrence.js';
import { EmailService } from './emailService.js';
import { shootConfetti } from './confetti.js';
import { sound } from './sound.js';

class App {
  constructor() {
    this.store = new Store();
    this.activeCategory = 'all';
    this.currentView = 'radar'; // 'radar', 'sinking', 'history'
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.checkUrlActions();

    this.store.subscribe(() => {
      this.render();
    });

    this.render();
    window.app = this;
  }

  setupEventListeners() {
    // Sound Button
    this.updateSoundBtn();

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('quickInputTitle');
        input?.focus();
      }
    });
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (isInput) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.openDeadlineModal();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.setView('sinking');
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.setView('radar');
      }
    });
  }

  checkUrlActions() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');

    if (action === 'validate' && id) {
      setTimeout(() => {
        const result = this.store.validateDeadline(id);
        if (result) {
          sound.playSuccess();
          shootConfetti();
          this.showToast(`✓ Validé en 1 clic ! Reprogrammé au ${Recurrence.formatDisplayDate(result.nextDate)}`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 300);
    }
  }

  setView(viewName) {
    sound.playPop();
    this.currentView = viewName;
    
    // Toggle view containers
    document.getElementById('view-radar').style.display = viewName === 'radar' ? 'flex' : 'none';
    document.getElementById('view-sinking').style.display = viewName === 'sinking' ? 'flex' : 'none';
    document.getElementById('view-history').style.display = viewName === 'history' ? 'flex' : 'none';

    // Update buttons
    document.getElementById('tabRadar')?.classList.toggle('active', viewName === 'radar');
    document.getElementById('tabSinking')?.classList.toggle('active', viewName === 'sinking');
    document.getElementById('tabHistory')?.classList.toggle('active', viewName === 'history');

    this.render();
  }

  setCategoryFilter(cat) {
    sound.playPop();
    this.activeCategory = cat;
    document.querySelectorAll('.cat-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    this.render();
  }

  toggleSound() {
    const active = sound.toggle();
    this.updateSoundBtn();
    this.showToast(active ? 'Sons activés 🔔' : 'Mode muet 🔕');
  }

  updateSoundBtn() {
    const icon = document.getElementById('soundIcon');
    if (icon) icon.textContent = sound.enabled ? '🎧' : '🔇';
  }

  // Quick Add from Top Input Container (Frictionless)
  quickAddFromBar() {
    const titleInput = document.getElementById('quickInputTitle');
    const amountInput = document.getElementById('quickInputAmount');
    const freqInput = document.getElementById('quickInputFreq');
    const catInput = document.getElementById('quickInputCat');

    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }

    const amount = parseFloat(amountInput.value) || 0;
    const frequency = freqInput.value || 'monthly';
    const category = catInput.value || 'finance';

    // Set default due date: today + 7 days
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const nextDueDate = d.toISOString().split('T')[0];

    this.store.saveDeadline({
      title,
      amount,
      frequency,
      category,
      nextDueDate,
      reminderRules: [7, 1, 0]
    });

    titleInput.value = '';
    amountInput.value = '';
    sound.playSuccess();
    shootConfetti();
    this.showToast(`✓ "${title}" ajouté au radar !`);
  }

  // Preset templates
  applyPreset(key) {
    sound.playPop();
    const presets = {
      rent: { title: 'Paiement Loyer & Charges', amount: 850, frequency: 'monthly', category: 'finance' },
      netflix: { title: 'Abonnement Netflix', amount: 14.99, frequency: 'monthly', category: 'subscription' },
      spotify: { title: 'Abonnement Spotify', amount: 10.99, frequency: 'monthly', category: 'subscription' },
      tax: { title: 'Déclaration TVA / URSSAF', amount: 0, frequency: 'quarterly', category: 'admin' },
      car: { title: 'Assurance Auto & Véhicule', amount: 600, frequency: 'annual', category: 'finance' },
      dentist: { title: 'RDV Contrôle Dentiste', amount: 60, frequency: 'annual', category: 'health' },
      trial: { title: 'Résiliation Essai Gratuit', amount: 39.99, frequency: 'once', category: 'subscription' }
    };

    const p = presets[key];
    if (p) {
      document.getElementById('quickInputTitle').value = p.title;
      document.getElementById('quickInputAmount').value = p.amount || '';
      document.getElementById('quickInputFreq').value = p.frequency;
      document.getElementById('quickInputCat').value = p.category;
      document.getElementById('quickInputTitle').focus();
    }
  }

  // Render main state
  render() {
    this.renderHeaderGoal();
    this.renderCategoryCounts();

    if (this.currentView === 'radar') {
      this.renderRadar();
    } else if (this.currentView === 'sinking') {
      this.renderSinkingPanel();
    } else if (this.currentView === 'history') {
      this.renderHistoryPanel();
    }
  }

  renderHeaderGoal() {
    const stats = this.store.getStats();
    const sinking = stats.sinkingFunds;
    
    // Update goal tracker bar below header
    const pill = document.getElementById('sinkingGoalPercent');
    if (pill) {
      pill.textContent = `+${sinking.totalMonthlyProvision.toLocaleString('fr-FR')} € / mois`;
    }

    const bar = document.getElementById('sinkingGoalBar');
    if (bar) {
      const targetPercent = Math.min(100, Math.max(15, (sinking.totalMonthlyProvision / (sinking.totalSanctuary || 1)) * 100));
      bar.style.width = `${targetPercent}%`;
    }
  }

  renderCategoryCounts() {
    const active = this.store.deadlines.filter(d => d.isActive);
    const countAll = active.length;
    const countFinance = active.filter(d => d.category === 'finance').length;
    const countSub = active.filter(d => d.category === 'subscription').length;
    const countAdmin = active.filter(d => d.category === 'admin').length;
    const countHealth = active.filter(d => d.category === 'health').length;

    document.getElementById('catCountAll').textContent = countAll;
    document.getElementById('catCountFinance').textContent = countFinance;
    document.getElementById('catCountSub').textContent = countSub;
    document.getElementById('catCountAdmin').textContent = countAdmin;
    document.getElementById('catCountHealth').textContent = countHealth;
  }

  renderRadar() {
    const active = this.store.deadlines.filter(item => {
      if (!item.isActive) return false;
      if (this.activeCategory !== 'all' && item.category !== this.activeCategory) return false;
      return true;
    });

    const groups = {
      urgent: [],
      this_week: [],
      this_month: [],
      later: []
    };

    active.forEach(item => {
      const h = Recurrence.getHorizon(item.nextDueDate);
      if (h === 'overdue' || h === 'urgent') groups.urgent.push(item);
      else if (h === 'this_week') groups.this_week.push(item);
      else if (h === 'this_month') groups.this_month.push(item);
      else groups.later.push(item);
    });

    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
    }

    this.renderHorizonList('grid-urgent', 'badge-count-urgent', groups.urgent);
    this.renderHorizonList('grid-this-week', 'badge-count-this-week', groups.this_week);
    this.renderHorizonList('grid-this-month', 'badge-count-this-month', groups.this_month);
    this.renderHorizonList('grid-later', 'badge-count-later', groups.later);
  }

  renderHorizonList(containerId, countBadgeId, items) {
    const badge = document.getElementById(countBadgeId);
    if (badge) badge.textContent = items.length;

    const container = document.getElementById(containerId);
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div style="padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px dashed var(--card-border); color: var(--text-muted); font-size: 12px;">
          Rien dans cet horizon. Tout est sous contrôle.
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => this.createTaskItemHtml(item)).join('');

    // Attach click events
    items.forEach(item => {
      // 1-Click Validation Checkbox
      document.getElementById(`btn-check-${item.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = this.store.validateDeadline(item.id);
        sound.playSuccess();
        shootConfetti();
        if (result.nextDate) {
          this.showToast(`✓ "${item.title}" validé ! Reprogrammé au ${Recurrence.formatDisplayDate(result.nextDate)}`);
        } else {
          this.showToast(`✓ "${item.title}" accompli et archivé !`);
        }
      });

      // Email preview
      document.getElementById(`btn-mail-${item.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEmailModal(item.id);
      });

      // Edit item
      document.getElementById(`btn-edit-${item.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDeadlineModal(item);
      });

      // Delete item
      document.getElementById(`btn-del-${item.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer définitivement "${item.title}" ?`)) {
          this.store.deleteDeadline(item.id);
          this.showToast('Échéance supprimée.');
        }
      });
    });
  }

  createTaskItemHtml(item) {
    const days = Recurrence.getDaysRemaining(item.nextDueDate);
    const humanDays = Recurrence.formatHumanDays(item.nextDueDate);
    const formattedDate = Recurrence.formatDisplayDate(item.nextDueDate);
    const isUrgent = days <= 2;
    const isWeek = days > 2 && days <= 7;

    const rules = item.reminderRules || item.reminder_rules || [7, 1, 0];
    const rulesHtml = rules.map(r => `<span class="meta-rule-pill">J-${r}</span>`).join(' ');

    return `
      <div class="task-item-wrapper">
        <div class="task-item ${isUrgent ? 'is-urgent-item' : ''}" data-cat="${item.category}">
          
          <!-- 1-Click Circle Checkbox -->
          <button class="loop-check-btn" id="btn-check-${item.id}" title="Valider en 1 clic (reprogramme le cycle)">
            ✓
          </button>

          <!-- Main Info -->
          <div class="task-main-info" onclick="window.app.openDeadlineModalById('${item.id}')">
            <div class="task-title-row">
              <span class="task-title-text">${item.title}</span>
              ${isUrgent ? `<span class="live-pulse-badge">URGENT</span>` : ''}
              ${item.link ? `
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color: var(--text-muted); font-size: 11px;" title="Portail client">↗</a>
              ` : ''}
            </div>

            <div class="task-meta-sub">
              <span class="meta-due-badge ${isUrgent ? 'urgent' : isWeek ? 'week' : ''}">${humanDays}</span>
              <span>•</span>
              <span>${formattedDate}</span>
              <span>•</span>
              <div style="display: inline-flex; gap: 3px;">${rulesHtml}</div>
            </div>
          </div>

          <!-- Right Meta: Amount, Frequency, Actions -->
          <div class="task-right-meta">
            ${item.amount ? `<span class="task-amount-pill">${item.amount} €</span>` : ''}
            <span class="task-freq-tag">${Recurrence.frequencyLabel(item.frequency)}</span>

            <div class="task-actions-group">
              <button class="btn-item-action" id="btn-mail-${item.id}" title="Aperçu email">✉️</button>
              <button class="btn-item-action" id="btn-edit-${item.id}" title="Modifier">✏️</button>
              <button class="btn-item-action delete" id="btn-del-${item.id}" title="Supprimer">🗑️</button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // Sinking Funds View
  renderSinkingPanel() {
    const stats = this.store.getStats();
    const sinking = stats.sinkingFunds;

    document.getElementById('sinking-panel-monthly').textContent = `+${sinking.totalMonthlyProvision.toLocaleString('fr-FR')} € / mois`;
    document.getElementById('sinking-panel-fixed').textContent = `${sinking.monthlyFixed.toLocaleString('fr-FR')} € / mois`;
    document.getElementById('sinking-panel-total').textContent = `${sinking.totalSanctuary.toLocaleString('fr-FR')} € / mois`;

    const listEl = document.getElementById('sinking-breakdown-list');
    if (sinking.amortizedItems.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
          Aucune échéance annuelle ou trimestrielle à amortir.
        </div>
      `;
      return;
    }

    listEl.innerHTML = sinking.amortizedItems.map(item => `
      <div class="task-item" data-cat="${item.category}" style="cursor: default;">
        <div class="task-main-info">
          <div class="task-title-row">
            <span class="task-title-text">${item.title}</span>
            <span class="task-freq-tag">${Recurrence.frequencyLabel(item.frequency)}</span>
          </div>
          <div class="task-meta-sub">
            <span>Total : <strong>${item.totalAmount} €</strong></span>
            <span>•</span>
            <span>Échéance le ${Recurrence.formatDisplayDate(item.nextDueDate)}</span>
            <span>•</span>
            <span>Reste ${item.monthsRemaining} mois</span>
          </div>
        </div>
        <div class="task-right-meta">
          <div style="text-align: right;">
            <span class="task-amount-pill" style="font-size: 16px;">+${item.monthlySave} €</span>
            <span style="font-size: 11px; color: var(--text-muted); display: block;">/ mois</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // History View
  renderHistoryPanel() {
    const stats = this.store.getStats();
    document.getElementById('historyConsistencyVal').textContent = `${stats.consistency}% à temps (${this.store.history.length} accomplissements)`;

    const listEl = document.getElementById('history-list');
    if (this.store.history.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
          Aucun historique pour l'instant. Validez une obligation en 1 clic pour voir votre série grandir !
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.store.history.map(h => {
      const dateStr = new Date(h.completedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `
        <div class="task-item" style="cursor: default;">
          <span style="color: var(--color-loop); font-weight: bold; font-size: 15px;">✓</span>
          <div class="task-main-info">
            <span class="task-title-text">${h.title}</span>
            <div class="task-meta-sub">
              <span>Honoré le ${dateStr}</span>
              <span>•</span>
              <span>Prévu le ${h.dueDate}</span>
            </div>
          </div>
          <span class="meta-rule-pill" style="${h.wasOnTime ? 'color: var(--color-loop);' : 'color: var(--streak);'}">
            ${h.wasOnTime ? 'À temps' : 'En retard'}
          </span>
        </div>
      `;
    }).join('');
  }

  // Modals
  openDeadlineModalById(id) {
    const item = this.store.deadlines.find(d => d.id === id);
    if (item) this.openDeadlineModal(item);
  }

  openDeadlineModal(item = null) {
    sound.playPop();
    const modal = document.getElementById('modal-deadline');
    const titleEl = document.getElementById('modal-deadline-title');
    const idInput = document.getElementById('deadline-id');
    const titleInput = document.getElementById('deadline-title');
    const dateInput = document.getElementById('deadline-date');
    const freqInput = document.getElementById('deadline-frequency');
    const amountInput = document.getElementById('deadline-amount');
    const linkInput = document.getElementById('deadline-link');
    const notesInput = document.getElementById('deadline-notes');

    if (item) {
      titleEl.textContent = 'Modifier l\'échéance';
      idInput.value = item.id;
      titleInput.value = item.title;
      dateInput.value = item.nextDueDate;
      freqInput.value = item.frequency;
      amountInput.value = item.amount || '';
      linkInput.value = item.link || '';
      notesInput.value = item.notes || '';
      this.selectFormCat(item.category || 'finance');

      const rules = item.reminderRules || item.reminder_rules || [];
      document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]').forEach(cb => {
        cb.checked = rules.includes(Number(cb.value));
        cb.parentElement.classList.toggle('active', cb.checked);
      });
    } else {
      titleEl.textContent = 'Nouvelle obligation récurrente';
      idInput.value = '';
      titleInput.value = '';
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dateInput.value = d.toISOString().split('T')[0];
      freqInput.value = 'monthly';
      amountInput.value = '';
      linkInput.value = '';
      notesInput.value = '';
      this.selectFormCat('finance');

      document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]').forEach(cb => {
        cb.checked = ['7', '1', '0'].includes(cb.value);
        cb.parentElement.classList.toggle('active', cb.checked);
      });
    }

    modal.classList.add('active');
    setTimeout(() => titleInput.focus(), 50);
  }

  closeDeadlineModal() {
    document.getElementById('modal-deadline')?.classList.remove('active');
  }

  selectFormCat(cat) {
    document.getElementById('form-cat-val').value = cat;
    document.querySelectorAll('#form-cat-pills .cat-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
  }

  saveDeadlineFromForm() {
    const id = document.getElementById('deadline-id').value;
    const title = document.getElementById('deadline-title').value.trim();
    const category = document.getElementById('form-cat-val').value;
    const nextDueDate = document.getElementById('deadline-date').value;
    const frequency = document.getElementById('deadline-frequency').value;
    const amount = parseFloat(document.getElementById('deadline-amount').value) || 0;
    const link = document.getElementById('deadline-link').value.trim();
    const notes = document.getElementById('deadline-notes').value.trim();

    const reminderRules = [];
    document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]:checked').forEach(cb => {
      reminderRules.push(Number(cb.value));
    });

    this.store.saveDeadline({
      id: id || undefined,
      title,
      category,
      nextDueDate,
      frequency,
      amount,
      link,
      notes,
      reminderRules
    });

    this.closeDeadlineModal();
    sound.playSuccess();
    this.showToast(`✓ "${title}" enregistré.`);
  }

  // Email Preview Modal
  openEmailModal(selectedId = null) {
    sound.playPop();
    const modal = document.getElementById('modal-email-preview');
    const select = document.getElementById('email-preview-select');
    select.innerHTML = '';

    const active = this.store.deadlines.filter(d => d.isActive);
    if (active.length === 0) {
      alert('Aucune obligation active à prévisualiser.');
      return;
    }

    active.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.title} (${Recurrence.formatHumanDays(item.nextDueDate)})`;
      if (selectedId && item.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = (e) => this.updateEmailIframe(e.target.value);
    this.updateEmailIframe(selectedId || active[0].id);

    modal.classList.add('active');
  }

  closeEmailModal() {
    document.getElementById('modal-email-preview')?.classList.remove('active');
  }

  updateEmailIframe(itemId) {
    const item = this.store.deadlines.find(d => d.id === itemId);
    if (!item) return;
    const days = Recurrence.getDaysRemaining(item.nextDueDate);
    const html = EmailService.generateEmailHtml(item, days);
    document.getElementById('email-preview-iframe').srcdoc = html;
  }

  async triggerTestEmail() {
    const select = document.getElementById('email-preview-select');
    const item = this.store.deadlines.find(d => d.id === select.value);
    if (!item) return;

    const email = item.notificationEmail || this.store.settings.userEmail;
    const res = await EmailService.sendTestEmail(item, this.store.settings.resendApiKey, email);
    sound.playPop();
    this.showToast(res.success ? `✓ Alerte simulée pour "${item.title}"` : `Erreur : ${res.error}`);
  }

  // Settings Modal
  openSettingsModal() {
    sound.playPop();
    const modal = document.getElementById('modal-settings');
    document.getElementById('settings-email').value = this.store.settings.userEmail || '';
    document.getElementById('settings-supabase-url').value = this.store.settings.supabaseUrl || '';
    document.getElementById('settings-supabase-key').value = this.store.settings.supabaseAnonKey || '';
    document.getElementById('settings-resend-key').value = this.store.settings.resendApiKey || '';
    modal.classList.add('active');
  }

  closeSettingsModal() {
    document.getElementById('modal-settings')?.classList.remove('active');
  }

  saveSettingsFromForm() {
    this.store.saveSettings({
      userEmail: document.getElementById('settings-email').value.trim(),
      supabaseUrl: document.getElementById('settings-supabase-url').value.trim(),
      supabaseAnonKey: document.getElementById('settings-supabase-key').value.trim(),
      resendApiKey: document.getElementById('settings-resend-key').value.trim()
    });
    this.closeSettingsModal();
    sound.playSuccess();
    this.showToast('Paramètres sauvegardés.');
  }

  exportDataAsJson() {
    const data = { deadlines: this.store.deadlines, history: this.store.history };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `span-loop-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Sauvegarde JSON téléchargée.');
  }

  resetDemoData() {
    if (confirm('Réinitialiser toutes les données de démo ?')) {
      this.store.resetDefaults();
      this.closeSettingsModal();
      this.showToast('Données réinitialisées.');
    }
  }

  closeAllModals() {
    this.closeDeadlineModal();
    this.closeEmailModal();
    this.closeSettingsModal();
  }

  // Toast Notification (Matching Span Focus)
  showToast(message) {
    const container = document.getElementById('toastContainer');
    const msg = document.createElement('div');
    msg.className = 'toast-msg';
    msg.innerHTML = `<span>${message}</span>`;
    container.appendChild(msg);

    setTimeout(() => {
      msg.remove();
    }, 2800);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
