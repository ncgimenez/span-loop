// Span Loop - Main Application Controller (Aesthetics & Features)
import { Store } from './store.js';
import { Recurrence } from './recurrence.js';
import { EmailService } from './emailService.js';
import { Icons } from './icons.js';
import { shootConfetti } from './confetti.js';
import { sound } from './sound.js';

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
    this.setupKeyboardShortcuts();
    this.checkUrlActions();

    // Subscribe to store updates
    this.store.subscribe(() => {
      this.render();
    });

    // Initial render
    this.render();

    // Expose app instance globally for inline handlers (Cmd Palette, Presets, Sinking Modal)
    window.app = this;
  }

  // Inject SVG icons into placeholders
  setupIcons() {
    const iconMap = {
      'brand-logo-container': Icons.logo(28),
      'icon-plus': Icons.plus('w-4 h-4'),
      'icon-mail': Icons.mail('w-4 h-4'),
      'icon-trend': Icons.trendUp('w-4 h-4'),
      'icon-settings': Icons.settings('w-4 h-4'),
      'icon-stat-dollar': Icons.dollar('w-4 h-4'),
      'icon-stat-alert': Icons.alert('w-4 h-4'),
      'icon-search-btn': Icons.search('w-3.5 h-3.5'),
      'icon-search-input': Icons.search('w-3.5 h-3.5'),
      'cmd-search-icon': Icons.search('w-4 h-4'),
      'icon-close-modal': Icons.close('w-5 h-5'),
      'icon-close-email-modal': Icons.close('w-5 h-5'),
      'icon-close-history': Icons.close('w-5 h-5'),
      'icon-close-settings': Icons.close('w-5 h-5'),
      'icon-close-sinking': Icons.close('w-5 h-5')
    };

    for (const [id, svg] of Object.entries(iconMap)) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = svg;
    }

    this.updateSoundButtonUI();
  }

  updateSoundButtonUI() {
    const btn = document.getElementById('btn-sound-toggle');
    const icon = document.getElementById('sound-icon');
    if (btn && icon) {
      if (sound.enabled) {
        icon.textContent = '🔔';
        btn.classList.add('text-emerald-400');
        btn.classList.remove('text-slate-500');
        btn.title = 'Son de validation : Actif (cliquer pour couper)';
      } else {
        icon.textContent = '🔕';
        btn.classList.remove('text-emerald-400');
        btn.classList.add('text-slate-500');
        btn.title = 'Son de validation : Muet (cliquer pour activer)';
      }
    }
  }

  // Global Keyboard Shortcuts (Cmd+K, N, S, E, Esc)
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in an input or textarea
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggleCmdPalette();
        return;
      }

      if (e.key === 'Escape') {
        this.closeAllModals();
        return;
      }

      if (isInput) return;

      if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.openDeadlineModal();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.openSinkingModal();
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this.openEmailModal();
      }
    });
  }

  // Check URL query parameters (1-click email action)
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

  // Event Listeners
  setupEventListeners() {
    // Sound toggle
    document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
      sound.toggle();
      this.updateSoundButtonUI();
      this.showToast(sound.enabled ? 'Sons d\'accomplissement activés' : 'Mode silencieux activé');
    });

    // Command palette trigger button
    document.getElementById('btn-trigger-cmd')?.addEventListener('click', () => {
      this.openCmdPalette();
    });

    // Cmd Palette search input
    document.getElementById('cmd-input')?.addEventListener('input', (e) => {
      this.filterCmdPalette(e.target.value.toLowerCase().trim());
    });

    // Sinking Fund card & button
    document.getElementById('btn-sinking-funds')?.addEventListener('click', () => this.openSinkingModal());
    document.getElementById('card-stat-sinking')?.addEventListener('click', () => this.openSinkingModal());

    // Category pills filter
    document.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sound.playPop();
        document.querySelectorAll('.category-pill').forEach(b => {
          b.classList.remove('bg-emerald-500', 'text-white', 'font-semibold');
          b.classList.add('bg-white/[0.04]', 'text-slate-300');
        });
        const target = e.currentTarget;
        target.classList.remove('bg-white/[0.04]', 'text-slate-300');
        target.classList.add('bg-emerald-500', 'text-white', 'font-semibold');
        this.activeCategory = target.dataset.cat;
        this.render();
      });
    });

    // Search input
    const searchInput = document.getElementById('input-search');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    // Modal Add/Edit
    document.getElementById('btn-new-deadline')?.addEventListener('click', () => this.openDeadlineModal());
    document.getElementById('btn-close-deadline-modal')?.addEventListener('click', () => this.closeDeadlineModal());
    document.getElementById('btn-cancel-deadline')?.addEventListener('click', () => this.closeDeadlineModal());
    document.getElementById('form-deadline')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveDeadlineFromForm();
    });

    // Frequency custom days toggle
    document.getElementById('deadline-frequency')?.addEventListener('change', (e) => {
      const customField = document.getElementById('field-custom-days');
      if (e.target.value === 'custom') {
        customField?.classList.remove('hidden');
      } else {
        customField?.classList.add('hidden');
      }
    });

    // Modal Email Preview
    document.getElementById('btn-email-preview')?.addEventListener('click', () => this.openEmailModal());
    document.getElementById('btn-close-email-modal')?.addEventListener('click', () => this.closeEmailModal());
    document.getElementById('email-preview-select')?.addEventListener('change', (e) => this.updateEmailPreview(e.target.value));
    document.getElementById('btn-trigger-test-email')?.addEventListener('click', () => this.triggerTestEmail());

    // Modal History
    document.getElementById('btn-history')?.addEventListener('click', () => this.openHistoryModal());
    document.getElementById('btn-close-history-modal')?.addEventListener('click', () => this.closeHistoryModal());

    // Modal Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => this.openSettingsModal());
    document.getElementById('btn-close-settings-modal')?.addEventListener('click', () => this.closeSettingsModal());
    document.getElementById('form-settings')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettingsFromForm();
    });

    // Export JSON
    document.getElementById('btn-export-data')?.addEventListener('click', () => {
      this.exportDataAsJson();
    });

    // Reset Demo
    document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
      if (confirm('Voulez-vous réinitialiser toutes les données de démo ?')) {
        this.store.resetDefaults();
        this.closeSettingsModal();
        sound.playPop();
        this.showToast('Données de démo réinitialisées.');
      }
    });
  }

  // Quick Preset Handlers (Popular Services)
  applyPreset(presetKey) {
    sound.playPop();
    const presets = {
      netflix: {
        title: 'Abonnement Netflix Standard',
        category: 'subscription',
        amount: 14.99,
        frequency: 'monthly',
        reminderRules: [2, 0],
        notes: 'Résiliation ou prélèvement mensuel automatique.',
        link: 'https://netflix.com/youraccount'
      },
      spotify: {
        title: 'Abonnement Spotify Premium',
        category: 'subscription',
        amount: 10.99,
        frequency: 'monthly',
        reminderRules: [2, 0],
        notes: 'Musique & podcasts sans pub.',
        link: 'https://spotify.com/account'
      },
      rent: {
        title: 'Paiement Loyer & Charges',
        category: 'finance',
        amount: 850,
        frequency: 'monthly',
        reminderRules: [5, 1, 0],
        notes: 'Virement bancaire avant le 1er du mois.'
      },
      tax: {
        title: 'Déclaration TVA / URSSAF Trimestrielle',
        category: 'admin',
        amount: 0,
        frequency: 'quarterly',
        reminderRules: [14, 7, 2, 0],
        notes: 'Rapprocher les factures d\'achat avant soumission.',
        link: 'https://impots.gouv.fr'
      },
      car: {
        title: 'Assurance Auto & Véhicule',
        category: 'finance',
        amount: 600,
        frequency: 'annual',
        reminderRules: [30, 14, 7],
        notes: 'Contrat annuel. Vérifier les offres concurrentes avant tacite reconduction.'
      },
      dentist: {
        title: 'RDV Contrôle Dentiste & Détartrage',
        category: 'health',
        amount: 60,
        frequency: 'annual',
        reminderRules: [14, 3],
        notes: 'Prendre RDV sur Doctolib pour le bilan annuel.',
        link: 'https://doctolib.fr'
      },
      trial: {
        title: 'Résiliation période d\'essai gratuit',
        category: 'subscription',
        amount: 49.99,
        frequency: 'once',
        reminderRules: [3, 1, 0],
        notes: 'Résilier absolument avant le premier prélèvement !'
      }
    };

    const data = presets[presetKey];
    if (data) {
      this.openDeadlineModal();
      document.getElementById('deadline-title').value = data.title;
      document.getElementById('deadline-amount').value = data.amount || '';
      document.getElementById('deadline-frequency').value = data.frequency || 'monthly';
      document.getElementById('deadline-link').value = data.link || '';
      document.getElementById('deadline-notes').value = data.notes || '';

      const catRadio = document.querySelector(`input[name="form-cat"][value="${data.category}"]`);
      if (catRadio) catRadio.checked = true;

      document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]').forEach(cb => {
        cb.checked = (data.reminderRules || [7, 1, 0]).includes(Number(cb.value));
      });
    }
  }

  // Renders the entire dashboard
  render() {
    this.renderMetrics();
    this.renderHorizons();
  }

  renderMetrics() {
    const stats = this.store.getStats();

    // Fixed monthly budget
    document.getElementById('stat-monthly-budget').textContent = `${stats.monthlyBudget.toLocaleString('fr-FR')} €`;
    
    // Sinking Fund Monthly Provision
    const sinking = stats.sinkingFunds;
    document.getElementById('stat-sinking-monthly').textContent = `+${sinking.totalMonthlyProvision.toLocaleString('fr-FR')} €`;
    document.getElementById('stat-sinking-note').textContent = `Pour amortir ${sinking.amortizedItems.length} grosses échéances`;

    // Consistency
    document.getElementById('stat-consistency').textContent = `${stats.consistency}%`;
    document.getElementById('stat-consistency-bar').style.width = `${stats.consistency}%`;
    
    // Urgent count
    const urgentTotal = stats.counts.overdue + stats.counts.urgent;
    const urgentCountEl = document.getElementById('stat-urgent-count');
    urgentCountEl.textContent = urgentTotal;
    
    const urgentStatCard = document.getElementById('card-stat-urgent');
    if (urgentTotal > 0) {
      urgentStatCard?.classList.add('span-card-urgent');
    } else {
      urgentStatCard?.classList.remove('span-card-urgent');
    }
  }

  renderHorizons() {
    const activeItems = this.store.deadlines.filter(item => {
      if (!item.isActive) return false;
      if (this.activeCategory !== 'all' && item.category !== this.activeCategory) return false;
      if (this.searchQuery) {
        const matchTitle = item.title.toLowerCase().includes(this.searchQuery);
        const matchNotes = (item.notes || '').toLowerCase().includes(this.searchQuery);
        if (!matchTitle && !matchNotes) return false;
      }
      return true;
    });

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

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
    }

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
      document.getElementById(`btn-val-${item.id}`)?.addEventListener('click', () => {
        const result = this.store.validateDeadline(item.id);
        sound.playSuccess();
        shootConfetti();
        if (result.nextDate) {
          this.showToast(`✓ "${item.title}" validé ! Reprogrammé au ${Recurrence.formatDisplayDate(result.nextDate)}`);
        } else {
          this.showToast(`✓ "${item.title}" validé et archivé !`);
        }
      });

      // Quick Email Preview
      document.getElementById(`btn-mail-${item.id}`)?.addEventListener('click', () => {
        sound.playPop();
        this.openEmailModal(item.id);
      });

      // Edit Button
      document.getElementById(`btn-edit-${item.id}`)?.addEventListener('click', () => {
        sound.playPop();
        this.openDeadlineModal(item);
      });

      // Delete Button
      document.getElementById(`btn-del-${item.id}`)?.addEventListener('click', () => {
        if (confirm(`Supprimer définitivement l'échéance "${item.title}" ?`)) {
          this.store.deleteDeadline(item.id);
          this.showToast('Échéance supprimée.');
        }
      });
    });
  }

  createCardHtml(item) {
    const days = Recurrence.getDaysRemaining(item.nextDueDate);
    const humanDays = Recurrence.formatHumanDays(item.nextDueDate);
    const formattedDate = Recurrence.formatDisplayDate(item.nextDueDate);
    const isUrgent = days <= 2;
    const isOverdue = days < 0;

    let badgeClass = 'bg-white/[0.05] text-slate-300 border-white/[0.08]';
    if (isOverdue) {
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold';
    } else if (isUrgent) {
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold';
    }

    const rulesList = item.reminderRules || item.reminder_rules || [7, 1, 0];
    const rulesBadges = rulesList
      .map(r => `<span class="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-slate-400 font-medium">J-${r}</span>`)
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
        <div class="space-y-1.5 mb-3">
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
        <div class="pt-2 border-t border-white/[0.06] space-y-2 mb-3 text-xs">
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
            <button id="btn-mail-${item.id}" class="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded transition" title="Aperçu de l'email d'alerte">
              ${Icons.mail('w-3.5 h-3.5')}
            </button>
            <button id="btn-edit-${item.id}" class="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded transition" title="Modifier l'échéance">
              ${Icons.edit('w-3.5 h-3.5')}
            </button>
            <button id="btn-del-${item.id}" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] rounded transition" title="Supprimer">
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

  // Sinking Fund Modal Renderer
  openSinkingModal() {
    sound.playPop();
    const modal = document.getElementById('modal-sinking-funds');
    const stats = this.store.getStats();
    const sinking = stats.sinkingFunds;

    document.getElementById('sinking-modal-monthly').textContent = `+${sinking.totalMonthlyProvision.toLocaleString('fr-FR')} € / mois`;
    document.getElementById('sinking-modal-fixed').textContent = `${sinking.monthlyFixed.toLocaleString('fr-FR')} € / mois`;
    document.getElementById('sinking-modal-total').textContent = `${sinking.totalSanctuary.toLocaleString('fr-FR')} € / mois`;

    const listEl = document.getElementById('sinking-breakdown-list');
    if (sinking.amortizedItems.length === 0) {
      listEl.innerHTML = `
        <div class="py-6 text-center text-slate-500 text-xs">
          Aucune échéance annuelle ou trimestrielle à amortir actuellement.
        </div>
      `;
    } else {
      listEl.innerHTML = sinking.amortizedItems.map(item => `
        <div class="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
          <div>
            <div class="font-bold text-white flex items-center gap-1.5">
              <span>${item.title}</span>
              <span class="text-[10px] text-slate-400 font-normal">(${Recurrence.frequencyLabel(item.frequency)})</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              ${item.totalAmount} € à payer dans ${item.monthsRemaining} mois (${Recurrence.formatDisplayDate(item.nextDueDate)})
            </div>
          </div>
          <div class="text-right">
            <span class="font-bold text-emerald-400 text-sm">+${item.monthlySave} €</span>
            <span class="text-[10px] text-slate-500 block">/ mois</span>
          </div>
        </div>
      `).join('');
    }

    modal?.classList.remove('hidden');
  }

  closeSinkingModal() {
    document.getElementById('modal-sinking-funds')?.classList.add('hidden');
  }

  // Command Palette
  openCmdPalette() {
    sound.playPop();
    const palette = document.getElementById('cmd-palette');
    const input = document.getElementById('cmd-input');
    palette?.classList.remove('hidden');
    input.value = '';
    this.filterCmdPalette('');
    setTimeout(() => input?.focus(), 50);
  }

  closeCmdPalette() {
    document.getElementById('cmd-palette')?.classList.add('hidden');
  }

  toggleCmdPalette() {
    const palette = document.getElementById('cmd-palette');
    if (palette?.classList.contains('hidden')) {
      this.openCmdPalette();
    } else {
      this.closeCmdPalette();
    }
  }

  filterCmdPalette(query = '') {
    const resultsContainer = document.getElementById('cmd-results');
    const allActions = [
      { id: 'new', label: 'Ajouter une nouvelle obligation', icon: '➕', key: 'N', action: () => this.openDeadlineModal() },
      { id: 'sinking', label: 'Matelas de Sérénité (Calcul d\'épargne)', icon: '🛡️', key: 'S', action: () => this.openSinkingModal() },
      { id: 'email', label: 'Simulateur d\'email transactionnel', icon: '✉️', key: 'E', action: () => this.openEmailModal() },
      { id: 'history', label: 'Voir l\'historique d\'accomplissement', icon: '🎯', key: 'H', action: () => this.openHistoryModal() },
      { id: 'cat-finance', label: 'Filtrer : Finances & Factures', icon: '💳', key: '', action: () => this.setCategoryFilter('finance') },
      { id: 'cat-sub', label: 'Filtrer : Abonnements & Essais', icon: '🔄', key: '', action: () => this.setCategoryFilter('subscription') },
      { id: 'cat-admin', label: 'Filtrer : Administratif & Légal', icon: '📁', key: '', action: () => this.setCategoryFilter('admin') },
      { id: 'cat-health', label: 'Filtrer : Rituels & Santé', icon: '🌿', key: '', action: () => this.setCategoryFilter('health') },
      { id: 'bridge-plan', label: 'Ouvrir Span Plan ↗', icon: '📅', key: '', action: () => window.location.href = '/span-plan/' },
      { id: 'bridge-focus', label: 'Ouvrir Span Focus ↗', icon: '⚡', key: '', action: () => window.location.href = '/span-focus/' }
    ];

    const filtered = allActions.filter(a => a.label.toLowerCase().includes(query));

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">Aucune action trouvée.</div>`;
      return;
    }

    resultsContainer.innerHTML = filtered.map((item, idx) => `
      <div class="cmd-item ${idx === 0 ? 'selected' : ''}" data-cmd="${item.id}">
        <div class="flex items-center gap-2.5">
          <span>${item.icon}</span>
          <span>${item.label}</span>
        </div>
        ${item.key ? `<span class="cmd-key">${item.key}</span>` : ''}
      </div>
    `).join('');

    filtered.forEach(item => {
      document.querySelector(`[data-cmd="${item.id}"]`)?.addEventListener('click', () => {
        this.closeCmdPalette();
        item.action();
      });
    });
  }

  setCategoryFilter(cat) {
    this.activeCategory = cat;
    document.querySelectorAll('.category-pill').forEach(btn => {
      const match = btn.dataset.cat === cat;
      btn.className = `category-pill ${match ? 'active bg-emerald-500 text-white font-semibold' : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'} px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.06] transition flex items-center gap-1.5`;
    });
    this.render();
  }

  // Modal Deadline
  openDeadlineModal(item = null) {
    sound.playPop();
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

      const catRadio = document.querySelector(`input[name="form-cat"][value="${item.category}"]`);
      if (catRadio) catRadio.checked = true;

      document.querySelectorAll('#rules-checkbox-group input[type="checkbox"]').forEach(cb => {
        const rules = item.reminderRules || item.reminder_rules || [];
        cb.checked = rules.includes(Number(cb.value));
      });
    } else {
      titleEl.textContent = 'Ajouter une obligation récurrente';
      idInput.value = '';
      titleInput.value = '';
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
      document.getElementById('field-custom-days')?.classList.remove('hidden');
    } else {
      document.getElementById('field-custom-days')?.classList.add('hidden');
    }

    modal?.classList.remove('hidden');
    setTimeout(() => titleInput?.focus(), 50);
  }

  closeDeadlineModal() {
    document.getElementById('modal-deadline')?.classList.add('hidden');
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
    sound.playSuccess();
    this.showToast(`Échéance "${title}" enregistrée.`);
  }

  // Modal Email Preview
  openEmailModal(selectedId = null) {
    sound.playPop();
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
    modal?.classList.remove('hidden');
  }

  closeEmailModal() {
    document.getElementById('modal-email-preview')?.classList.add('hidden');
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
    
    sound.playPop();
    if (res.success) {
      this.showToast(`✓ Alerte simulée avec succès pour "${item.title}"`);
    } else {
      this.showToast(`Erreur : ${res.error}`);
    }
  }

  // Modal History
  openHistoryModal() {
    sound.playPop();
    const modal = document.getElementById('modal-history');
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '';

    if (this.store.history.length === 0) {
      listEl.innerHTML = `
        <div class="py-8 text-center text-slate-500 text-xs">
          Aucun historique d'accomplissement pour l'instant.<br>
          Validez une échéance en 1 clic pour faire grimper votre série !
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
          <div class="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
            <div class="space-y-0.5">
              <div class="font-bold text-white flex items-center gap-1.5">
                <span class="text-emerald-400">✓</span>
                <span>${h.title}</span>
              </div>
              <div class="text-[11px] text-slate-400">
                Honoré le ${dateStr} · Prévu le ${h.dueDate}
              </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${h.wasOnTime ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400'}">
              ${h.wasOnTime ? 'À temps' : 'En retard'}
            </span>
          </div>
        `;
      }).join('');
    }

    modal?.classList.remove('hidden');
  }

  closeHistoryModal() {
    document.getElementById('modal-history')?.classList.add('hidden');
  }

  // Modal Settings
  openSettingsModal() {
    sound.playPop();
    const modal = document.getElementById('modal-settings');
    document.getElementById('settings-email').value = this.store.settings.userEmail || '';
    document.getElementById('settings-supabase-url').value = this.store.settings.supabaseUrl || '';
    document.getElementById('settings-supabase-key').value = this.store.settings.supabaseAnonKey || '';
    document.getElementById('settings-resend-key').value = this.store.settings.resendApiKey || '';
    modal?.classList.remove('hidden');
  }

  closeSettingsModal() {
    document.getElementById('modal-settings')?.classList.add('hidden');
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
    sound.playSuccess();
    this.showToast('Paramètres mis à jour.');
  }

  // Export JSON Backup
  exportDataAsJson() {
    const data = {
      deadlines: this.store.deadlines,
      history: this.store.history,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `span-loop-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Sauvegarde JSON téléchargée.');
  }

  closeAllModals() {
    this.closeCmdPalette();
    this.closeDeadlineModal();
    this.closeEmailModal();
    this.closeHistoryModal();
    this.closeSettingsModal();
    this.closeSinkingModal();
  }

  // Toast Notification
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
