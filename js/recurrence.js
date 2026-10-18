// Span Track - Recurrence & Date Calculation Engine

export const Recurrence = {
  // Horizon types: 'urgent' (<48h or overdue), 'this_week' (3-7 days), 'this_month' (8-30 days), 'later' (>30 days)
  getDaysRemaining(dueDateStr) {
    if (!dueDateStr) return 9999;
    const now = new Date();
    // Reset to start of day for clean calculation
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = dueDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  getHorizon(dueDateStr) {
    const days = this.getDaysRemaining(dueDateStr);
    if (days < 0) return 'overdue';
    if (days <= 2) return 'urgent';
    if (days <= 7) return 'this_week';
    if (days <= 30) return 'this_month';
    return 'later';
  },

  formatHumanDays(dueDateStr) {
    const days = this.getDaysRemaining(dueDateStr);
    if (days < -1) return `En retard de ${Math.abs(days)} jours`;
    if (days === -1) return `En retard d'1 jour`;
    if (days === 0) return `Aujourd'hui !`;
    if (days === 1) return `Demain`;
    if (days === 2) return `Après-demain (dans 2 jours)`;
    if (days <= 7) return `Dans ${days} jours`;
    if (days <= 30) {
      const weeks = Math.round(days / 7);
      return `Dans ~${weeks} sem. (${days} j)`;
    }
    return `Dans ${days} jours`;
  },

  formatDisplayDate(dueDateStr) {
    if (!dueDateStr) return '';
    const [y, m, d] = dueDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  },

  // Calculates the next date given current date and frequency rule
  calculateNextDueDate(currentDueDateStr, frequency = 'monthly', customDays = 30) {
    if (frequency === 'once') return null; // One-time deadline completed
    
    const [y, m, d] = (currentDueDateStr || new Date().toISOString().split('T')[0]).split('-').map(Number);
    let nextDate = new Date(y, m - 1, d);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly': {
        const targetDay = d;
        nextDate.setMonth(nextDate.getMonth() + 1);
        // If target day doesn't exist (e.g. Feb 30), set to last day of month
        if (nextDate.getDate() !== targetDay) {
          nextDate.setDate(0);
        }
        break;
      }
      case 'quarterly': {
        const targetDay = d;
        nextDate.setMonth(nextDate.getMonth() + 3);
        if (nextDate.getDate() !== targetDay) {
          nextDate.setDate(0);
        }
        break;
      }
      case 'biannual': {
        const targetDay = d;
        nextDate.setMonth(nextDate.getMonth() + 6);
        if (nextDate.getDate() !== targetDay) {
          nextDate.setDate(0);
        }
        break;
      }
      case 'annual': {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      }
      case 'custom':
        nextDate.setDate(nextDate.getDate() + (Number(customDays) || 30));
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    // Return as YYYY-MM-DD
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextDay = String(nextDate.getDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDay}`;
  },

  // Normalize any cost to estimated monthly cost for budget tracking
  normalizeMonthlyAmount(amount, frequency) {
    const val = parseFloat(amount) || 0;
    if (val <= 0) return 0;
    switch (frequency) {
      case 'weekly':
        return Math.round(val * 4.33);
      case 'monthly':
        return Math.round(val);
      case 'quarterly':
        return Math.round(val / 3);
      case 'biannual':
        return Math.round(val / 6);
      case 'annual':
        return Math.round(val / 12);
      case 'once':
      default:
        return 0;
    }
  },

  frequencyLabel(frequency, customDays) {
    switch (frequency) {
      case 'once': return 'Ponctuelle';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuelle';
      case 'quarterly': return 'Trimestrielle';
      case 'biannual': return 'Semestrielle';
      case 'annual': return 'Annuelle';
      case 'custom': return `Tous les ${customDays || 30} jours`;
      default: return frequency;
    }
  },

  // Sinking Funds / Matelas d'Épargne d'anticipation
  calculateSinkingFunds(deadlines = []) {
    const active = deadlines.filter(d => d.isActive && parseFloat(d.amount) > 0);
    
    // 1. Monthly ongoing fixed costs (loyer, netflix, box)
    let monthlyFixed = 0;
    // 2. Periodic items to amortize (assurance, impots, controle technique, vacances)
    const amortizedItems = [];
    let totalMonthlyProvision = 0;

    active.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      const freq = item.frequency || 'monthly';
      
      if (['weekly', 'monthly'].includes(freq)) {
        monthlyFixed += this.normalizeMonthlyAmount(amt, freq);
      } else if (['quarterly', 'biannual', 'annual', 'custom'].includes(freq)) {
        const days = Math.max(1, this.getDaysRemaining(item.nextDueDate));
        const months = Math.max(1, Math.ceil(days / 30.5));
        const monthlySave = Math.round(amt / months);
        totalMonthlyProvision += monthlySave;

        amortizedItems.push({
          id: item.id,
          title: item.title,
          category: item.category,
          totalAmount: amt,
          nextDueDate: item.nextDueDate,
          daysRemaining: days,
          monthsRemaining: months,
          monthlySave: monthlySave,
          frequency: freq
        });
      }
    });

    // Sort amortized items by nearest due date
    amortizedItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      monthlyFixed: Math.round(monthlyFixed),
      totalMonthlyProvision: Math.round(totalMonthlyProvision),
      totalSanctuary: Math.round(monthlyFixed + totalMonthlyProvision),
      amortizedItems
    };
  }
};
