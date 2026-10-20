import { Store } from './store.js';
import { Recurrence } from './recurrence.js';
import { EmailService } from './emailService.js';
import { shootConfetti } from './confetti.js';
import { sound } from './sound.js';
import { CloudSync } from './sync.js';

class App {
  constructor() {
    this.store = new Store();
    this.sync = new CloudSync(this.store, {
      onStatusChange: (status) => this.updateCloudStatusBadge(status),
      onSyncSuccess: () => this.render(),
      onSyncError: () => {}
    });
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
    this.renderHeaderMetrics();
    this.renderCategoryCounts();
    this.renderSideWidgets();

    if (this.currentView === 'radar') {
      const gridEl = document.getElementById('cockpitGrid');
      if (gridEl) gridEl.style.display = 'grid';
      const sinkingEl = document.getElementById('view-sinking');
      if (sinkingEl) sinkingEl.style.display = 'none';
      const historyEl = document.getElementById('view-history');
      if (historyEl) historyEl.style.display = 'none';

      this.renderRadar();
    } else if (this.currentView === 'sinking') {
      const gridEl = document.getElementById('cockpitGrid');
      if (gridEl) gridEl.style.display = 'none';
      const sinkingEl = document.getElementById('view-sinking');
      if (sinkingEl) sinkingEl.style.display = 'flex';
      const historyEl = document.getElementById('view-history');
      if (historyEl) historyEl.style.display = 'none';

      this.renderSinkingPanel();
    } else if (this.currentView === 'history') {
      const gridEl = document.getElementById('cockpitGrid');
      if (gridEl) gridEl.style.display = 'none';
      const sinkingEl = document.getElementById('view-sinking');
      if (sinkingEl) sinkingEl.style.display = 'none';
      const historyEl = document.getElementById('view-history');
      if (historyEl) historyEl.style.display = 'flex';

      this.renderHistoryPanel();
    }
  }

  renderHeaderMetrics() {
    const stats = this.store.getStats();
    const sinking = stats.sinkingFunds;
    const active = this.store.deadlines.filter(d => d.isActive);

    let urgentCount = 0;
    let monthCount = 0;
    active.forEach(item => {
      const h = Recurrence.getHorizon(item.nextDueDate);
      if (h === 'overdue' || h === 'urgent') urgentCount++;
      else if (h === 'this_week' || h === 'this_month') monthCount++;
    });

    const urgentBadge = document.getElementById('statUrgentBadge');
    if (urgentBadge) {
      urgentBadge.textContent = `⚡ ${urgentCount} urgente${urgentCount > 1 ? 's' : ''}`;
      urgentBadge.style.display = urgentCount > 0 ? 'inline-flex' : 'none';
    }

    const monthBadge = document.getElementById('statMonthBadge');
    if (monthBadge) {
      monthBadge.textContent = `📅 ${monthCount} ce mois`;
    }

    const budgetBadge = document.getElementById('statBudgetBadge');
    if (budgetBadge) {
      budgetBadge.textContent = `🛡️ +${sinking.totalMonthlyProvision.toLocaleString('fr-FR')} € / m`;
    }

    const cashBadge = document.getElementById('statCashBadge');
    if (cashBadge) {
      cashBadge.textContent = `🐷 ${(stats.totalSavings || 0).toLocaleString('fr-FR')} € épargnés`;
      cashBadge.style.display = 'inline-flex';
      cashBadge.onclick = (e) => {
        e.stopPropagation();
        this.openAdjustSavingsModal();
      };
    }
  }

  renderCategoryCounts() {
    const active = this.store.deadlines.filter(d => d.isActive);
    const countAll = active.length;
    const countFinance = active.filter(d => d.category === 'finance').length;
    const countSub = active.filter(d => d.category === 'subscription').length;
    const countAdmin = active.filter(d => d.category === 'admin').length;
    const countHealth = active.filter(d => d.category === 'health').length;

    const elAll = document.getElementById('catCountAll'); if (elAll) elAll.textContent = countAll;
    const elFin = document.getElementById('catCountFinance'); if (elFin) elFin.textContent = countFinance;
    const elSub = document.getElementById('catCountSub'); if (elSub) elSub.textContent = countSub;
    const elAdm = document.getElementById('catCountAdmin'); if (elAdm) elAdm.textContent = countAdmin;
    const elHea = document.getElementById('catCountHealth'); if (elHea) elHea.textContent = countHealth;
  }

  renderRadar() {
    const active = this.store.deadlines.filter(item => {
      if (!item.isActive) return false;
      if (this.activeCategory !== 'all' && item.category !== this.activeCategory) return false;
      return true;
    });

    const groups = {
      urgent: [],
      this_month: [],
      later: []
    };

    active.forEach(item => {
      const h = Recurrence.getHorizon(item.nextDueDate);
      if (h === 'overdue' || h === 'urgent' || h === 'this_week') groups.urgent.push(item);
      else if (h === 'this_month') groups.this_month.push(item);
      else groups.later.push(item);
    });

    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
    }

    this.renderHorizonList('grid-urgent', 'badge-count-urgent', groups.urgent);
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
        <div style="padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px dashed var(--card-border); color: var(--text-muted); font-size: 12.5px;">
          Rien dans cet horizon. Tout est sous contrôle.
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => this.createTaskCardHtml(item)).join('');

    // Attach click events
    items.forEach(item => {
      // 1-Click Validation Checkbox
      document.getElementById(`btn-check-${item.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.validateDeadline(item.id);
      });

      // Bridge: Send to Plan
      document.getElementById(`btn-bridge-plan-${item.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sendToPlan(item.id);
      });

      // Bridge: Send to Focus
      document.getElementById(`btn-bridge-focus-${item.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sendToFocus(item.id);
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

  createTaskCardHtml(item) {
    const days = Recurrence.getDaysRemaining(item.nextDueDate);
    const humanDays = Recurrence.formatHumanDays(item.nextDueDate);
    const formattedDate = Recurrence.formatDisplayDate(item.nextDueDate);
    const isUrgent = days <= 2;
    const isWeek = days > 2 && days <= 7;

    const catIcons = {
      finance: '💶',
      subscription: '🍿',
      health: '🩺',
      admin: '📋'
    };
    const catLabels = {
      finance: 'Factures',
      subscription: 'Abonnements',
      health: 'Santé',
      admin: 'Admin'
    };

    const icon = catIcons[item.category] || '🔁';
    const catLabel = catLabels[item.category] || 'Loop';
    const countdownClass = isUrgent ? 'urgent' : (isWeek ? 'week' : '');

    return `
      <div class="task-card ${isUrgent ? 'urgent-glow' : ''}" data-cat="${item.category}">
        
        <!-- Left Group: Category Badge + Title & Due Date -->
        <div class="card-left-group" onclick="window.app.openDeadlineModalById('${item.id}')">
          <div class="card-cat-badge ${item.category}" title="${catLabel}">
            ${icon}
          </div>
          <div class="card-text-block">
            <div class="card-title-row">
              <span class="card-title">${item.title}</span>
              ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="card-ext-link" title="Portail client">↗</a>` : ''}
            </div>
            <div class="card-sub-row">
              <span class="card-countdown-badge ${countdownClass}">${humanDays}</span>
              <span class="card-dot">•</span>
              <span class="card-date">${formattedDate}</span>
              <span class="card-dot">•</span>
              <span class="card-cat-name ${item.category}">${catLabel}</span>
            </div>
          </div>
        </div>

        <!-- Right Group: Amount, Frequency, Bridges & Validation -->
        <div class="card-right-group">
          <div class="card-price-block">
            ${item.amount ? `<span class="card-amount">${item.amount} €</span>` : ''}
            <span class="card-frequency">${Recurrence.frequencyLabel(item.frequency)}</span>
          </div>

          <div class="card-actions-row">
            <button type="button" class="bridge-btn plan-btn" id="btn-bridge-plan-${item.id}" title="Planifier dans Span Plan (avec tourbillon Loop)">
              <span>📅</span>
              <span class="bridge-btn-label">Plan</span>
            </button>
            <button type="button" class="bridge-btn focus-btn" id="btn-bridge-focus-${item.id}" title="Régler tout de suite dans Span Focus">
              <span>⚡</span>
              <span class="bridge-btn-label">Focus</span>
            </button>
            <button type="button" class="loop-validate-btn" id="btn-check-${item.id}" title="Valider en 1 clic (reprogramme le cycle)">
              <span>✓</span>
              <span>Fait</span>
            </button>
            <button type="button" class="btn-more-options" id="btn-edit-${item.id}" title="Modifier">✏️</button>
            <button type="button" class="btn-more-options delete" id="btn-del-${item.id}" title="Supprimer">🗑️</button>
          </div>
        </div>

      </div>
    `;
  }

  // 1-Click Validation action with audio & celebration
  validateDeadline(deadlineId) {
    const result = this.store.validateDeadline(deadlineId);
    if (!result) return;

    sound.playSuccess();
    shootConfetti();

    if (result.nextDate) {
      this.showToast(`✓ "${result.item.title}" validé ! Reprogrammé au ${Recurrence.formatDisplayDate(result.nextDate)}`);
    } else {
      this.showToast(`✓ "${result.item.title}" accompli et archivé !`);
    }
  }

  // Bridge: Send to Span Plan
  sendToPlan(deadlineId) {
    const item = this.store.deadlines.find(d => d.id === deadlineId);
    if (!item) return;

    sound.playPop();

    let planCategory = 'life';
    if (item.category === 'admin') planCategory = 'work';
    else if (item.category === 'subscription') planCategory = 'fun';
    else planCategory = 'life';

    const planTitle = `🔁 ${item.title}${item.amount ? ` (${item.amount}€)` : ''}`;
    const newPlanItem = {
      id: 'plan_loop_' + item.id + '_' + Date.now(),
      title: planTitle,
      date: item.nextDueDate,
      startTime: '09:00',
      duration: 30,
      category: planCategory,
      loopId: item.id,
      isLoop: true,
      completed: false
    };

    // Save to localStorage for Span Plan
    try {
      const planTasks = JSON.parse(localStorage.getItem('span_plan_tasks') || '[]');
      const existingIdx = planTasks.findIndex(p => p.loopId === item.id && p.date === item.nextDueDate);
      if (existingIdx !== -1) planTasks[existingIdx] = newPlanItem;
      else planTasks.push(newPlanItem);
      localStorage.setItem('span_plan_tasks', JSON.stringify(planTasks));
    } catch (e) {
      console.warn('LocalStorage Plan write warning:', e);
    }

    // Push to Supabase if connected
    if (this.sync && this.sync.supabaseClient) {
      const syncUserId = this.sync.getSyncUserId();
      this.sync.supabaseClient.from('user_state').select('tasks').eq('id', syncUserId).maybeSingle()
        .then(({ data }) => {
          if (data && data.tasks) {
            const currentPlanItems = Array.isArray(data.tasks.plan_items) ? data.tasks.plan_items : [];
            const idx = currentPlanItems.findIndex(p => p.loopId === item.id && p.date === item.nextDueDate);
            if (idx !== -1) currentPlanItems[idx] = newPlanItem;
            else currentPlanItems.push(newPlanItem);
            return this.sync.supabaseClient.from('user_state').upsert({
              id: syncUserId,
              tasks: { ...data.tasks, plan_items: currentPlanItems },
              updated_at: new Date().toISOString()
            });
          }
        }).catch(err => console.warn('Supabase Plan push error:', err));
    }

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:8081/' 
      : '/span-plan/';

    this.showToast(`
      <span>✓ <strong>${item.title}</strong> planifié pour le ${Recurrence.formatDisplayDate(item.nextDueDate)} !</span>
      <a href="${host}" target="_blank" style="color:var(--color-loop);text-decoration:underline;margin-left:8px;font-weight:700;">Ouvrir Plan ↗</a>
    `);
  }

  // Bridge: Send to Span Focus
  sendToFocus(deadlineId) {
    const item = this.store.deadlines.find(d => d.id === deadlineId);
    if (!item) return;

    sound.playPop();

    let focusCat = 'Home';
    if (item.category === 'admin') focusCat = 'Work';
    else if (item.category === 'subscription') focusCat = 'Fun';
    else focusCat = 'Home';

    const focusTitle = `🔁 ${item.title}${item.amount ? ` (${item.amount}€)` : ''}`;
    const newFocusItem = {
      id: 't_loop_' + item.id + '_' + Date.now(),
      title: focusTitle,
      category: focusCat,
      estimate: 1,
      duration: 30,
      completed: false,
      isFavorite: true,
      loopId: item.id,
      isLoop: true,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage for Span Focus
    try {
      const focusTasks = JSON.parse(localStorage.getItem('span_tasks') || '[]');
      focusTasks.unshift(newFocusItem);
      localStorage.setItem('span_tasks', JSON.stringify(focusTasks));
      localStorage.setItem('span_active_task', JSON.stringify(newFocusItem));
    } catch (e) {
      console.warn('LocalStorage Focus write warning:', e);
    }

    // Push to Supabase if connected
    if (this.sync && this.sync.supabaseClient) {
      const syncUserId = this.sync.getSyncUserId();
      this.sync.supabaseClient.from('user_state').select('tasks').eq('id', syncUserId).maybeSingle()
        .then(({ data }) => {
          if (data && data.tasks) {
            const currentItems = Array.isArray(data.tasks.items) ? data.tasks.items : [];
            currentItems.unshift(newFocusItem);
            return this.sync.supabaseClient.from('user_state').upsert({
              id: syncUserId,
              tasks: { ...data.tasks, items: currentItems },
              timer_state: { activeTask: newFocusItem },
              updated_at: new Date().toISOString()
            });
          }
        }).catch(err => console.warn('Supabase Focus push error:', err));
    }

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:8080/' 
      : '/span-focus/';

    this.showToast(`
      <span>⚡ <strong>${item.title}</strong> envoyé dans Span Focus !</span>
      <a href="${host}" target="_blank" style="color:var(--color-loop);text-decoration:underline;margin-left:8px;font-weight:700;">Démarrer Focus ↗</a>
    `);
  }

  // Sidebar companion widgets rendering
  renderSideWidgets() {
    const stats = this.store.getStats();
    const sinking = stats.sinkingFunds;

    const sideSinkingEl = document.getElementById('sideSinkingAmount');
    if (sideSinkingEl) {
      sideSinkingEl.textContent = `+${sinking.totalMonthlyProvision.toLocaleString('fr-FR')} €/m`;
    }

    const sideTotalEl = document.getElementById('sideMonthlyTotal');
    if (sideTotalEl) {
      sideTotalEl.textContent = `${stats.monthlyBudget.toLocaleString('fr-FR')} € / mois`;
    }

    const miniListEl = document.getElementById('sideSinkingMiniList');
    if (miniListEl) {
      if (sinking.amortizedItems.length === 0) {
        miniListEl.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); padding: 4px 0;">Aucune charge annuelle à amortir.</div>`;
      } else {
        miniListEl.innerHTML = sinking.amortizedItems.slice(0, 3).map(item => `
          <div class="sinking-mini-item">
            <span style="font-weight: 500; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">${item.title}</span>
            <span style="font-weight: 700; color: var(--color-loop-mint);">+${item.monthlyShare} €/m</span>
          </div>
        `).join('');
      }
    }

    const barsEl = document.getElementById('sideCategoryBars');
    if (barsEl) {
      const active = this.store.deadlines.filter(d => d.isActive);
      const cats = [
        { key: 'finance', label: '💶 Factures', color: '#10b981' },
        { key: 'subscription', label: '🍿 Abonnements', color: '#38bdf8' },
        { key: 'health', label: '🩺 Santé', color: '#fb7185' },
        { key: 'admin', label: '📋 Admin', color: '#facc15' }
      ];

      const catTotals = {};
      let totalBudget = 0;
      cats.forEach(c => {
        const sum = active.filter(d => d.category === c.key).reduce((acc, curr) => {
          return acc + Recurrence.normalizeMonthlyAmount(curr.amount, curr.frequency);
        }, 0);
        catTotals[c.key] = sum;
        totalBudget += sum;
      });

      barsEl.innerHTML = cats.map(c => {
        const amount = catTotals[c.key] || 0;
        const pct = totalBudget > 0 ? Math.round((amount / totalBudget) * 100) : 0;
        return `
          <div class="cat-bar-row">
            <div class="cat-bar-header">
              <span>${c.label}</span>
              <span>${amount.toLocaleString('fr-FR')} € (${pct}%)</span>
            </div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width: ${pct}%; background: ${c.color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 0. WIDGET MES ÉCONOMIES (CAGNOTTE TOTALE)
    const savingsAmountEl = document.getElementById('savingsAmountDisplay');
    if (savingsAmountEl) {
      savingsAmountEl.textContent = `${(stats.totalSavings || 0).toLocaleString('fr-FR')} €`;
    }

    const savingsBadgeEl = document.getElementById('savingsMonthlyGainBadge');
    if (savingsBadgeEl) {
      const monthGain = (stats.savingsHistory || [])
        .filter(h => {
          const d = new Date(h.date || 0);
          return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
        })
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      savingsBadgeEl.textContent = `+${monthGain.toLocaleString('fr-FR')} € ce mois`;
    }

    // 0.5. WIDGET TRÉSORERIE DU MOIS & RITUELS
    const targetDisp = document.getElementById('cashflowTargetDisplay');
    if (targetDisp) targetDisp.textContent = `${(stats.monthlyTarget || 1500).toLocaleString('fr-FR')} €`;

    const baseTargetDisp = document.getElementById('cashflowBaseTarget');
    if (baseTargetDisp) baseTargetDisp.textContent = `${(stats.monthlyTarget || 1500).toLocaleString('fr-FR')} €`;

    // Surplus banner (Début de mois si solde > cible)
    const surplusBanner = document.getElementById('surplusBanner');
    if (surplusBanner) {
      if (stats.hasSurplus && stats.surplusAmount > 0) {
        surplusBanner.style.display = 'flex';
        const surplusText = document.getElementById('surplusAmountText');
        if (surplusText) surplusText.textContent = `+${stats.surplusAmount.toLocaleString('fr-FR')} €`;
        const surplusRef = document.getElementById('surplusTargetRef');
        if (surplusRef) surplusRef.textContent = `${stats.monthlyTarget.toLocaleString('fr-FR')} €`;
      } else {
        surplusBanner.style.display = 'none';
      }
    }

    // Formula & Living Remaining
    const billsTotalEl = document.getElementById('cashflowBillsTotal');
    if (billsTotalEl) {
      billsTotalEl.textContent = `-${Math.round(stats.monthlyBudget).toLocaleString('fr-FR')} €`;
    }

    const livingEl = document.getElementById('cashflowLivingRemaining');
    if (livingEl) {
      livingEl.textContent = `${Math.round(stats.safeRemainingForLiving).toLocaleString('fr-FR')} €`;
    }

    const tempoEl = document.getElementById('cashflowTempoText');
    if (tempoEl) {
      tempoEl.textContent = `soit ~${stats.weeklyLiving.toLocaleString('fr-FR')} € / sem · ~${stats.dailyLiving.toLocaleString('fr-FR')} € / jour`;
    }

    const unpaidHintEl = document.getElementById('unpaidBillsHint');
    if (unpaidHintEl) {
      unpaidHintEl.textContent = `dont ${Math.round(stats.pendingBillsThisMonth).toLocaleString('fr-FR')} € de factures restantes`;
    }

    const inputActual = document.getElementById('inputActualChecking');
    if (inputActual && document.activeElement !== inputActual) {
      inputActual.value = stats.currentCheckingBalance || '';
    }

    const leftoverText = document.getElementById('monthEndLeftoverText');
    if (leftoverText) {
      leftoverText.textContent = `Il te reste ${Math.round(stats.safeRemainingForLiving).toLocaleString('fr-FR')} € sur ton compte`;
    }
  }

  executeSurplusTransfer() {
    const surplus = this.store.transferSurplusToSavings();
    if (surplus > 0) {
      sound.playSuccess();
      shootConfetti();
      this.showToast(`🎉 +${surplus.toLocaleString('fr-FR')} € de surplus versés dans tes Économies !`);
      this.render();
    }
  }

  saveActualCheckingBalance() {
    const input = document.getElementById('inputActualChecking');
    if (!input) return;
    const val = parseFloat(input.value) || 0;
    this.store.setCurrentCheckingBalance(val);
    sound.playSuccess();
    this.showToast(`✓ Solde bancaire actualisé : ${val.toLocaleString('fr-FR')} €`);
    this.render();
  }

  promptMonthEndRollover() {
    const stats = this.store.getStats();
    const suggested = Math.round(stats.safeRemainingForLiving);
    const amountStr = prompt(
      `✨ Clôture de fin de mois :\nCombien souhaites-tu mettre de côté parmi les ${suggested} € restants sur ton compte ?`,
      suggested > 0 ? suggested : '50'
    );
    if (!amountStr) return;
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0) return;

    this.store.transferMonthEndLeftover(amount);
    sound.playSuccess();
    shootConfetti();
    this.showToast(`✨ Félicitations ! +${amount.toLocaleString('fr-FR')} € ajoutés à tes Économies !`);
    this.render();
  }

  openAdjustSavingsModal() {
    sound.playPop();
    const modal = document.getElementById('modal-savings-manager');
    const inputTotal = document.getElementById('modal-total-savings-input');
    const inputTarget = document.getElementById('modal-monthly-target-input');
    if (inputTotal) inputTotal.value = this.store.savings?.totalSavings || 0;
    if (inputTarget) inputTarget.value = this.store.savings?.monthlyTarget || 1500;
    this.renderSavingsHistoryList();
    if (modal) modal.classList.add('active');
  }

  openTargetEditModal() {
    this.openAdjustSavingsModal();
    const inputTarget = document.getElementById('modal-monthly-target-input');
    if (inputTarget) setTimeout(() => inputTarget.focus(), 80);
  }

  openSavingsHistoryModal() {
    this.openAdjustSavingsModal();
  }

  closeSavingsModal() {
    document.getElementById('modal-savings-manager')?.classList.remove('active');
  }

  saveTotalSavingsFromModal() {
    const input = document.getElementById('modal-total-savings-input');
    if (!input) return;
    const val = parseFloat(input.value) || 0;
    this.store.setTotalSavings(val);
    sound.playSuccess();
    this.showToast(`✓ Économies totales fixées à ${val.toLocaleString('fr-FR')} €`);
    this.closeSavingsModal();
    this.render();
  }

  saveMonthlyTargetFromModal() {
    const input = document.getElementById('modal-monthly-target-input');
    if (!input) return;
    const val = parseFloat(input.value) || 0;
    this.store.setMonthlyTarget(val);
    sound.playSuccess();
    this.showToast(`✓ Cible mensuelle fixée à ${val.toLocaleString('fr-FR')} €`);
    this.closeSavingsModal();
    this.render();
  }

  renderSavingsHistoryList() {
    const listEl = document.getElementById('modalSavingsHistoryList');
    const countEl = document.getElementById('modalSavingsHistoryCount');
    const history = this.store.savings?.history || [];
    if (countEl) countEl.textContent = `${history.length} versement${history.length > 1 ? 's' : ''}`;
    if (!listEl) return;

    if (history.length === 0) {
      listEl.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); padding: 8px 0;">Aucun versement enregistré pour le moment.</div>`;
      return;
    }

    listEl.innerHTML = history.map(item => {
      const d = new Date(item.date || Date.now());
      const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      const badgeIcon = item.type === 'surplus' ? '🎉' : (item.type === 'month_end' ? '✨' : '💰');
      return `
        <div class="savings-history-item">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>${badgeIcon}</span>
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; color: var(--text-main); font-size: 12px;">${item.label || 'Versement'}</span>
              <span style="font-size: 10.5px; color: var(--text-muted);">${dateStr}</span>
            </div>
          </div>
          <span style="font-weight: 700; color: #10b981; font-size: 13px;">+${(item.amount || 0).toLocaleString('fr-FR')} €</span>
        </div>
      `;
    }).join('');
  }

  togglePresetsModal() {
    sound.playPop();
    const modal = document.getElementById('modal-presets');
    if (modal) modal.classList.toggle('active');
  }

  toggleLaterCollapse() {
    sound.playPop();
    const grid = document.getElementById('grid-later');
    const label = document.getElementById('laterToggleLabel');
    if (!grid) return;
    const isHidden = grid.style.display === 'none';
    grid.style.display = isHidden ? 'flex' : 'none';
    if (label) label.textContent = isHidden ? 'Masquer ▴' : 'Afficher ▾';
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
    const syncKey = this.sync.getSyncUserId();
    const displaySync = document.getElementById('displaySyncKey');
    if (displaySync) displaySync.textContent = syncKey;

    const inputSync = document.getElementById('inputSyncKey');
    if (inputSync) inputSync.value = syncKey;
    const inputSecret = document.getElementById('inputSyncSecret');
    if (inputSecret) inputSecret.value = syncKey;

    this.updateCloudStatusBadge(this.sync.syncStatus);

    const incInput = document.getElementById('settings-monthly-income');
    if (incInput) incInput.value = this.store.settings.monthlyIncome || '';

    document.getElementById('settings-email').value = this.store.settings.userEmail || '';
    document.getElementById('settings-supabase-url').value = this.store.settings.supabaseUrl || '';
    document.getElementById('settings-supabase-key').value = this.store.settings.supabaseAnonKey || '';
    document.getElementById('settings-resend-key').value = this.store.settings.resendApiKey || '';
    modal.classList.add('active');
  }

  updateCloudStatusBadge(status) {
    const badge = document.getElementById('cloudSyncStatusBadge');
    if (!badge) return;
    badge.className = 'cloud-status-badge ' + (status || '');
    if (status === 'connected') {
      badge.textContent = '● Connecté Cloud';
    } else if (status === 'syncing') {
      badge.textContent = '● Synchro en cours...';
    } else if (status === 'error') {
      badge.textContent = '▲ Erreur Cloud';
    } else {
      badge.textContent = '○ Mode Local';
    }
  }

  copySyncKey() {
    const key = this.sync.getSyncUserId();
    navigator.clipboard.writeText(key).then(() => {
      sound.playPop();
      this.showToast('Clé Span Suite copiée dans le presse-papier ! 📋');
    }).catch(() => {
      this.showToast('Échec de la copie de la clé.');
    });
  }

  handleLinkSyncKey() {
    const input = document.getElementById('inputSyncKey');
    const key = input ? input.value.trim() : '';
    if (!key) {
      this.showToast('Veuillez entrer une clé ou un username.');
      return;
    }

    const ok = this.sync.setSyncUserId(key);
    if (ok) {
      const displaySync = document.getElementById('displaySyncKey');
      if (displaySync) displaySync.textContent = key;
      const inputSecret = document.getElementById('inputSyncSecret');
      if (inputSecret) inputSecret.value = key;
      sound.playSuccess();
      this.showToast('Compte Span Suite lié avec succès ! 🔗');
    }
  }

  importDataFromJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const ok = this.store.importData(data);
        if (ok) {
          sound.playSuccess();
          this.showToast('Sauvegarde restaurée avec succès ! 📥');
          this.render();
        } else {
          this.showToast('Format de fichier JSON invalide.');
        }
      } catch (err) {
        this.showToast('Erreur lors de la lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
    // Reset file input value so re-selecting same file triggers change
    event.target.value = '';
  }

  closeSettingsModal() {
    document.getElementById('modal-settings')?.classList.remove('active');
  }

  saveSettingsFromForm() {
    const incInput = document.getElementById('settings-monthly-income');
    const incomeVal = incInput ? (parseFloat(incInput.value) || 0) : this.store.settings.monthlyIncome;

    this.store.saveSettings({
      monthlyIncome: incomeVal,
      userEmail: document.getElementById('settings-email').value.trim(),
      supabaseUrl: document.getElementById('settings-supabase-url').value.trim(),
      supabaseAnonKey: document.getElementById('settings-supabase-key').value.trim(),
      resendApiKey: document.getElementById('settings-resend-key').value.trim()
    });
    this.sync.initClient();
    this.closeSettingsModal();
    sound.playSuccess();
    this.showToast('Paramètres sauvegardés.');
  }

  exportDataAsJson() {
    const data = { deadlines: this.store.deadlines, history: this.store.history, savings: this.store.savings };
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
    this.closeSavingsModal();
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
