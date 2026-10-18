// Span Loop - Main Application Controller
import { Store } from './store.js';
import { Recurrence } from './recurrence.js';
import { EmailService } from './emailService.js';
import { Icons } from './icons.js';
import { shootConfetti } from './confetti.js';

class App {
  constructor() {
    this.store = new Store();
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.init();
  }

  init() {
    this.setupIcons();
    this.setupEventListeners();
    this.checkUrlActions();

    // Subscribe to store updates
    this.store.subscribe(() => {
      this.render();
    });

    // Initial render
    this.render();
  }

  // Inject SVG icons into placeholders
  setupIcons() {
    const iconMap = {
      'brand-logo-container': Icons.logo(36),
      'icon-plus': Icons.plus('w-4 h-4'),
      'icon-mail': Icons.mail('w-4 h-4'),
      'icon-trend': Icons.trendUp('w-4 h-4'),
      'icon-settings': Icons.settings('w-4 h-4'),
      'icon-stat-dollar': Icons.dollar('w-4 h-4'),
      'icon-stat-sparkles': Icons.sparkles('w-4 h-4'),
      'icon-stat-alert': Icons.alert('w-4 h-4'),
      'icon-stat-bell': Icons.bell('w-4 h-4'),
      'icon-search-input': Icons.search('w-4 h-4'),
      'icon-close-modal': Icons.close('w-5 h-5'),
      'icon-close-email-modal': Icons.close('w-5 h-5'),
      'icon-close-history': Icons.close('w-5 h-5'),
      'icon-close-settings': Icons.close('w-5 h-5')
    };

    for (const [id, svg] of Object.entries(iconMap)) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = svg;
    }
  }

  // Check URL query parameters (e.g. from 1-click email action)
  checkUrlActions() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');

    if (action === 'validate' && id) {
      setTimeout(() => {
        const result = this.store.validateDeadline(id);
        if (result) {
          shootConfetti();
          this.showToast(`✓ Validé en 1 clic ! Prochaine date : ${Recurrence.formatDisplayDate(result.nextDate)}`);
        }
        // Clean URL without reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 300);
    }
  }

  // Global event listeners
  setupEventListeners() {
    // Category pills filter
    document.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.category-pill').forEach(b => {
          b.classList.remove('bg-emerald-500', 'text-white', 'font-semibold');
          b.classList.add('bg-slate-800/80', 'text-slate-300');
        });
        const target = e.currentTarget;
        target.classList.remove('bg-slate-800/80', 'text-slate-300');
        target.classList.add('bg-emerald-500', 'text-white', 'font-semibold');
        this.activeCategory = target.dataset.cat;
        this.render();
      });
    });

    // Search input
    const searchInput = document.getElementById('input-search');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    // Modal Add/Edit
    document.getElementById('btn-new-deadline').addEventListener('click', () => {
      this.openDeadlineModal();
    });
    document.getElementById('btn-close-deadline-modal').addEventListener('click', () => {
      this.closeDeadlineModal();
    });
    document.getElementById('btn-cancel-deadline').addEventListener('click', () => {
      this.closeDeadlineModal();
    });
    document.getElementById('form-deadline').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveDeadlineFromForm();
    });

    // Frequency custom days toggle
    document.getElementById('deadline-frequency').addEventListener('change', (e) => {
      const customField = document.getElementById('field-custom-days');
      if (e.target.value === 'custom') {
        customField.classList.remove('hidden');
      } else {
        customField.classList.add('hidden');
      }
    });

    // Modal Email Preview
    document.getElementById('btn-email-preview').addEventListener('click', () => {
      this.openEmailModal();
    });
    document.getElementById('btn-close-email-modal').addEventListener('click', () => {
      this.closeEmailModal();
    });
    document.getElementById('email-preview-select').addEventListener('change', (e) => {
      this.updateEmailPreview(e.target.value);
    });
    document.getElementById('btn-trigger-test-email').addEventListener('click', () => {
      this.triggerTestEmail();
    });

    // Modal History
    document.getElementById('btn-history').addEventListener('click', () => {
      this.openHistoryModal();
    });
    document.getElementById('btn-close-history-modal').addEventListener('click', () => {
      this.closeHistoryModal();
    });

    // Modal Settings
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.openSettingsModal();
    });
    document.getElementById('btn-close-settings-modal').addEventListener('click', () => {
      this.closeSettingsModal();
    });
    document.getElementById('form-settings').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettingsFromForm();
    });
    document.getElementById('btn-reset-demo').addEventListener('click', () => {
      if (confirm('Voulez-vous réinitialiser toutes les données de démo ?')) {
        this.store.resetDefaults();
        this.closeSettingsModal();
        this.showToast('Données de démo réinitialisées.');
      }
    });
  }

  // Renders the full dashboard
  render() {
    this.renderMetrics();
    this.renderHorizons();
  }

  renderMetrics() {
    const stats = this.store.getStats();

    // Budget
    document.getElementById('stat-monthly-budget').textContent = `${stats.monthlyBudget.toLocaleString('fr-FR')} €`;
    
    // Consistency
    document.getElementById('stat-consistency').textContent = `${stats.consistency}%`;
    document.getElementById('stat-consistency-bar').style.width = `${stats.consistency}%`;
    
    // Urgent count
    const urgentTotal = stats.counts.overdue + stats.counts.urgent;
    const urgentCountEl = document.getElementById('stat-urgent-count');
    urgentCountEl.textContent = urgentTotal;
    
    const urgentStatCard = document.getElementById('card-stat-urgent');
    if (urgentTotal > 0) {
      urgentStatCard.classList.add('span-card-urgent');
    } else {
      urgentStatCard.classList.remove('span-card-urgent');
    }
  }

  renderHorizons() {
    const activeItems = this.store.deadlines.filter(item => {
      if (!item.isActive) return false;
      // Category filter
      if (this.activeCategory !== 'all' && item.category !== this.activeCategory) return false;
      // Search filter
      if (this.searchQuery) {
        const matchTitle = item.title.toLowerCase().includes(this.searchQuery);
        const matchNotes = (item.notes || '').toLowerCase().includes(this.searchQuery);
        if (!matchTitle && !matchNotes) return false;
      }
      return true;
    });

    // Group items into the 4 horizons
    const groups = {
      urgent: [],
      this_week: [],
      this_month: [],
      later: []
    };

    activeItems.forEach(item => {
      const h = Recurrence.getHorizon(item.nextDueDate);
      if (h === 'overdue' || h === 'urgent') {
        groups.urgent.push(item);
      } else if (h === 'this_week') {
        groups.this_week.push(item);
      } else if (h === 'this_month') {
        groups.this_month.push(item);
      } else {
        groups.later.push(item);
      }
    });

    // Sort each group by due date ascending
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
    }

    // Render each section
    this.renderHorizonSection('urgent', groups.urgent, 'badge-count-urgent', 'grid-urgent');
    this.renderHorizonSection('this-week', groups.this_week, 'badge-count-this-week', 'grid-this-week');
    this.renderHorizonSection('this-month', groups.this_month, 'badge-count-this-month', 'grid-this-month');
    this.renderHorizonSection('later', groups.later, 'badge-count-later', 'grid-later');
  }

  renderHorizonSection(sectionId, items, badgeId, gridId) {
    const badge = document.getElementById(badgeId);
    if (badge) badge.textContent = items.length;

    const grid = document.getElementById(gridId);
    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-8 text-center border border-dashed border-white/[0.08] rounded-xl text-slate-500 text-xs">
          Aucune échéance dans cet horizon. Tout est sous contrôle.
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => this.createCardHtml(item)).join('');

    // Attach card event listeners
    items.forEach(item => {
      // 1-Click Validate Button
      const validateBtn = document.getElementById(`btn-val-${item.id}`);
      if (validateBtn) {
        validateBtn.addEventListener('click', () => {
          const result = this.store.validateDeadline(item.id);
          shootConfetti();
          if (result.nextDate) {
            this.showToast(`✓ "${item.title}" validé ! Reprogrammé au ${Recurrence.formatDisplayDate(result.nextDate)}`);
          } else {
            this.showToast(`✓ "${item.title}" validé et archivé !`);
          }
        });
      }

      // Quick Preview Email Button
      const mailBtn = document.getElementById(`btn-mail-${item.id}`);
      if (mailBtn) {
        mailBtn.addEventListener('click', () => {
          this.openEmailModal(item.id);
        });
      }

      // Edit Button
      const editBtn = document.getElementById(`btn-edit-${item.id}`);
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.openDeadlineModal(item);
        });
      }

      // Delete Button
      const delBtn = document.getElementById(`btn-del-${item.id}`);
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          if (confirm(`Supprimer définitivement l'échéance "${item.title}" ?`)) {
            this.store.deleteDeadline(item.id);
            this.showToast('Échéance supprimée.');
          }
        });
      }
    });
  }

  createCardHtml(item) {
    const days = Recurrence.getDaysRemaining(item.nextDueDate);
    const humanDays = Recurrence.formatHumanDays(item.nextDueDate);
    const formattedDate = Recurrence.formatDisplayDate(item.nextDueDate);
    const isUrgent = days <= 2;
    const isOverdue = days < 0;

    let badgeClass = 'bg-slate-800 text-slate-300 border-white/[0.08]';
    if (isOverdue) {
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold';
    } else if (isUrgent) {
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold';
    }

    const rulesList = item.reminderRules || item.reminder_rules || [7, 1, 0];
    const rulesBadges = rulesList
      .map(r => `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-medium">J-${r}</span>`)
      .join(' ');

    return `
      <div class="span-card p-4 flex flex-col justify-between ${isUrgent ? 'span-card-urgent' : ''}">
        <!-- Top bar: Category + Days remaining -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span class="p-1 rounded bg-white/[0.05] text-emerald-400">${Icons.category(item.category, 'w-3.5 h-3.5')}</span>
            <span>${Recurrence.frequencyLabel(item.frequency, item.customDays)}</span>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full border ${badgeClass}">
            ${humanDays}
          </span>
        </div>

        <!-- Title & Notes -->
        <div class="space-y-1.5 mb-3.5">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-bold text-white leading-snug tracking-tight">
              ${item.title}
            </h3>
            ${item.link ? `
              <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-sky-400 transition shrink-0 p-0.5" title="Ouvrir le portail">
                ${Icons.externalLink('w-3.5 h-3.5')}
              </a>
            ` : ''}
          </div>
          ${item.notes ? `
            <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal">${item.notes}</p>
          ` : ''}
        </div>

        <!-- Meta specs: Date + Amount + Email rules -->
        <div class="pt-2.5 border-t border-white/[0.06] space-y-2 mb-3.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 flex items-center gap-1">
              ${Icons.calendar('w-3.5 h-3.5')}
              <span>${formattedDate}</span>
            </span>
            ${item.amount ? `
              <span class="font-bold text-emerald-400">${item.amount} €</span>
            ` : '<span class="text-slate-600">—</span>'}
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-500">
            <span class="flex items-center gap-1">
              ${Icons.bell('w-3 h-3')} Rappels email :
            </span>
            <div class="flex items-center gap-1">
              ${rulesBadges}
            </div>
          </div>
        </div>

        <!-- Actions Footer: 1-Click Validate & Tools -->
        <div class="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
          <div class="flex items-center gap-1">
            <button id="btn-mail-${item.id}" class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title="Aperçu de l'email d'alerte">
              ${Icons.mail('w-3.5 h-3.5')}
            </button>
            <button id="btn-edit-${item.id}" class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title="Modifier l'échéance">
              ${Icons.edit('w-3.5 h-3.5')}
            </button>
            <button id="btn-del-${item.id}" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition" title="Supprimer">
              ${Icons.trash('w-3.5 h-3.5')}
            </button>
          </div>

          <!-- The Star CTA: 1-Click Validation Button -->
          <button id="btn-val-${item.id}" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500 transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
            ${Icons.check('w-3.5 h-3.5')}
            <span>Valider</span>
          </button>
        </div>

      </div>
    `;
  }

  // Modal Deadline
  openDeadlineModal(item = null) {
    const modal = document.getElementById('modal-deadline');
    const titleEl = document.getElementById('modal-deadline-title');
    const idInput = document.getElementById('deadline-id');
    const titleInput = document.getElementById('deadline-title');
    const dateInput = document.getElementById('deadline-date');
    const freqInput = document.getElementById('deadline-frequency');
    const customDaysInput = document.getElementById('deadline-custom-days');
    const amountInput = document.getElementById('deadline-amount');
    const emailInput = document.getElementById('deadline-email');
    const linkInput = document.getElementById('deadline-link');
    const notesInput = document.getElementById('deadline-notes');

    if (item) {
      titleEl.textContent = 'Modifier l\'échéance';
      idInput.value = item.id;
      titleInput.value = item.title;
      dateInput.value = item.nextDueDate;
      freqInput.value = item.frequency;
      customDaysInput.value = item.customDays || 30;
      amountInput.value = item.amount || '';
      emailInput.value = item.notificationEmail || this.store.settings.userEmail;
      linkInput.value = item.link || '';
      notesInput.value = item.notes || '';

      // Set category radio
      const catRadio = document.querySelector(`input[name="form-cat"][value="${item.category}"]`);
      if (catRadio) catRadio.checked = true;

      // Set reminder checkboxes
      document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]').forEach(cb => {
        const rules = item.reminderRules || item.reminder_rules || [];
        cb.checked = rules.includes(Number(cb.value));
      });
    } else {
      titleEl.textContent = 'Ajouter une échéance récurrente';
      idInput.value = '';
      titleInput.value = '';
      // Default date: today + 7 days
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dateInput.value = d.toISOString().split('T')[0];
      freqInput.value = 'monthly';
      customDaysInput.value = '30';
      amountInput.value = '';
      emailInput.value = this.store.settings.userEmail;
      linkInput.value = '';
      notesInput.value = '';

      const catRadio = document.querySelector('input[name="form-cat"][value="finance"]');
      if (catRadio) catRadio.checked = true;

      document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]').forEach(cb => {
        cb.checked = ['7', '1', '0'].includes(cb.value);
      });
    }

    if (freqInput.value === 'custom') {
      document.getElementById('field-custom-days').classList.remove('hidden');
    } else {
      document.getElementById('field-custom-days').classList.add('hidden');
    }

    modal.classList.remove('hidden');
    titleInput.focus();
  }

  closeDeadlineModal() {
    document.getElementById('modal-deadline').classList.add('hidden');
  }

  saveDeadlineFromForm() {
    const id = document.getElementById('deadline-id').value;
    const title = document.getElementById('deadline-title').value.trim();
    const cat = document.querySelector('input[name="form-cat"]:checked')?.value || 'finance';
    const nextDueDate = document.getElementById('deadline-date').value;
    const frequency = document.getElementById('deadline-frequency').value;
    const customDays = Number(document.getElementById('deadline-custom-days').value) || 30;
    const amount = parseFloat(document.getElementById('deadline-amount').value) || 0;
    const notificationEmail = document.getElementById('deadline-email').value.trim();
    const link = document.getElementById('deadline-link').value.trim();
    const notes = document.getElementById('deadline-notes').value.trim();

    const reminderRules = [];
    document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]:checked').forEach(cb => {
      reminderRules.push(Number(cb.value));
    });

    const itemData = {
      id: id || undefined,
      title,
      category: cat,
      nextDueDate,
      frequency,
      customDays,
      amount,
      reminderRules,
      notificationEmail,
      link,
      notes
    };

    this.store.saveDeadline(itemData);
    this.closeDeadlineModal();
    this.showToast(`Échéance "${title}" enregistrée.`);
  }

  // Modal Email Preview
  openEmailModal(selectedId = null) {
    const modal = document.getElementById('modal-email-preview');
    const select = document.getElementById('email-preview-select');
    select.innerHTML = '';

    const activeItems = this.store.deadlines.filter(d => d.isActive);
    if (activeItems.length === 0) {
      alert('Aucune échéance active à prévisualiser.');
      return;
    }

    activeItems.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.title} (${Recurrence.formatHumanDays(item.nextDueDate)})`;
      if (selectedId && item.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });

    const currentId = selectedId || activeItems[0].id;
    this.updateEmailPreview(currentId);
    modal.classList.remove('hidden');
  }

  closeEmailModal() {
    document.getElementById('modal-email-preview').classList.add('hidden');
  }

  updateEmailPreview(itemId) {
    const item = this.store.deadlines.find(d => d.id === itemId);
    if (!item) return;

    const days = Recurrence.getDaysRemaining(item.nextDueDate);
    const html = EmailService.generateEmailHtml(item, days);
    
    const iframe = document.getElementById('email-preview-iframe');
    iframe.srcdoc = html;
  }

  async triggerTestEmail() {
    const select = document.getElementById('email-preview-select');
    const item = this.store.deadlines.find(d => d.id === select.value);
    if (!item) return;

    const email = item.notificationEmail || this.store.settings.userEmail;
    const res = await EmailService.sendTestEmail(item, this.store.settings.resendApiKey, email);
    
    if (res.success) {
      this.showToast(`✓ Test d'alerte simulé avec succès pour ${item.title}`);
    } else {
      this.showToast(`Erreur : ${res.error}`);
    }
  }

  // Modal History
  openHistoryModal() {
    const modal = document.getElementById('modal-history');
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '';

    if (this.store.history.length === 0) {
      listEl.innerHTML = `
        <div class="py-8 text-center text-slate-500 text-xs">
          Aucun historique d'accomplissement pour l'instant.<br>
          Validez une échéance en 1 clic pour voir votre série de consistance grandir !
        </div>
      `;
    } else {
      listEl.innerHTML = this.store.history.map(h => {
        const dateStr = new Date(h.completedAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        return `
          <div class="p-3 rounded-lg bg-[#141f33] border border-white/[0.06] flex items-center justify-between text-xs">
            <div class="space-y-0.5">
              <div class="font-bold text-white flex items-center gap-1.5">
                <span class="text-emerald-400">✓</span>
                <span>${h.title}</span>
              </div>
              <div class="text-[11px] text-slate-400">
                Honoré le ${dateStr} · Prévu le ${h.dueDate}
              </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${h.wasOnTime ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'}">
              ${h.wasOnTime ? 'À temps' : 'En retard'}
            </span>
          </div>
        `;
      }).join('');
    }

    modal.classList.remove('hidden');
  }

  closeHistoryModal() {
    document.getElementById('modal-history').classList.add('hidden');
  }

  // Modal Settings
  openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    document.getElementById('settings-email').value = this.store.settings.userEmail || '';
    document.getElementById('settings-supabase-url').value = this.store.settings.supabaseUrl || '';
    document.getElementById('settings-supabase-key').value = this.store.settings.supabaseAnonKey || '';
    document.getElementById('settings-resend-key').value = this.store.settings.resendApiKey || '';
    modal.classList.remove('hidden');
  }

  closeSettingsModal() {
    document.getElementById('modal-settings').classList.add('hidden');
  }

  saveSettingsFromForm() {
    const userEmail = document.getElementById('settings-email').value.trim();
    const supabaseUrl = document.getElementById('settings-supabase-url').value.trim();
    const supabaseAnonKey = document.getElementById('settings-supabase-key').value.trim();
    const resendApiKey = document.getElementById('settings-resend-key').value.trim();

    this.store.saveSettings({
      userEmail,
      supabaseUrl,
      supabaseAnonKey,
      resendApiKey
    });

    this.closeSettingsModal();
    this.showToast('Paramètres mis à jour.');
  }

  // Toast Notification helper
  showToast(message, duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="text-emerald-400">${Icons.check('w-4 h-4')}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
