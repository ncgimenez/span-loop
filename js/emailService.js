// Span Loop - Email Notification Engine & Template Builder
import { Recurrence } from './recurrence.js';

export const EmailService = {
  // Generate a mock or real JWT-like signature token for 1-click validation
  generateValidationToken(itemId, secret = 'span-secret') {
    const payload = `${itemId}:${Date.now()}`;
    return btoa(payload);
  },

  // Builds a clean, minimal, responsive HTML transactional email
  generateEmailHtml(item, daysRemaining = 0, appUrl = window.location.origin + window.location.pathname) {
    const token = this.generateValidationToken(item.id);
    const validateUrl = `${appUrl}?action=validate&id=${encodeURIComponent(item.id)}&token=${token}`;
    const formattedDate = Recurrence.formatDisplayDate(item.nextDueDate);
    
    let urgencyBadge = 'ANTICIPATION';
    let urgencyColor = '#10b981'; // Mint / Emerald
    let urgencyBg = '#ecfdf5';
    let urgencyBorder = '#a7f3d0';

    if (daysRemaining <= 0) {
      urgencyBadge = 'JOUR J — ACTION REQUISE';
      urgencyColor = '#ef4444';
      urgencyBg = '#fef2f2';
      urgencyBorder = '#fecaca';
    } else if (daysRemaining <= 2) {
      urgencyBadge = `URGENT — DANS ${daysRemaining} JOUR${daysRemaining > 1 ? 'S' : ''}`;
      urgencyColor = '#f59e0b';
      urgencyBg = '#fffbeb';
      urgencyBorder = '#fde68a';
    } else {
      urgencyBadge = `RAPPEL ANTICIPÉ — J-${daysRemaining}`;
    }

    const categoryNames = {
      finance: 'Finances & Factures',
      subscription: 'Abonnement & Résiliation',
      admin: 'Administratif & Légal',
      health: 'Santé & Rituel de vie'
    };
    const catName = categoryNames[item.category] || 'Échéance';

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Span Loop - ${item.title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b0f19;
      padding: 40px 10px;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 28px 32px;
      border-bottom: 1px solid #1f2937;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .brand-accent {
      color: #10b981;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background-color: ${urgencyBg};
      color: ${urgencyColor};
      border: 1px solid ${urgencyBorder};
    }
    .content {
      padding: 32px;
    }
    .headline {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 12px;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .category-label {
      font-size: 13px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .card-meta {
      background-color: #1a2234;
      border: 1px solid #283548;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 14px;
      border-bottom: 1px solid #233044;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .meta-label {
      color: #94a3b8;
    }
    .meta-value {
      font-weight: 600;
      color: #ffffff;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 16px;
    }
    .btn-validate {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 10px;
      box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39);
    }
    .btn-notes {
      margin-top: 16px;
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer {
      padding: 20px 32px;
      background-color: #0d131f;
      border-top: 1px solid #1f2937;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand">SPAN <span class="brand-accent">LOOP</span></div>
        <div class="badge">${urgencyBadge}</div>
      </div>
      <div class="content">
        <div class="category-label">${catName}</div>
        <div class="headline">${item.title}</div>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">
          ${daysRemaining === 0 ? "Cette échéance arrive à terme aujourd'hui." : `Échéance prévue le <strong>${formattedDate}</strong> (${Recurrence.formatHumanDays(item.nextDueDate)}).`}
        </p>

        <div class="card-meta">
          <div class="meta-row">
            <span class="meta-label">Date limite :</span>
            <span class="meta-value">${formattedDate}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Fréquence :</span>
            <span class="meta-value">${Recurrence.frequencyLabel(item.frequency, item.customDays)}</span>
          </div>
          ${item.amount ? `
          <div class="meta-row">
            <span class="meta-label">Montant :</span>
            <span class="meta-value" style="color: #34d399;">${item.amount} €</span>
          </div>
          ` : ''}
          ${item.notes ? `
          <div class="meta-row">
            <span class="meta-label">Note :</span>
            <span class="meta-value" style="font-weight: normal; color: #cbd5e1;">${item.notes}</span>
          </div>
          ` : ''}
        </div>

        <div class="cta-container">
          <a href="${validateUrl}" class="btn-validate" target="_blank">
            ✓ Marquer comme fait (1 clic)
          </a>
          <div class="btn-notes">
            En cliquant, votre échéance sera automatiquement reportée au prochain cycle (${Recurrence.frequencyLabel(item.frequency, item.customDays)}).
          </div>
        </div>

        ${item.link ? `
        <div style="text-align: center; margin-top: 10px;">
          <a href="${item.link}" target="_blank" style="color: #38bdf8; font-size: 13px; text-decoration: none;">
            Accéder au portail ou à l'espace client →
          </a>
        </div>
        ` : ''}
      </div>
      <div class="footer">
        Span Loop — La boucle sereine de vos échéances récurrentes.<br>
        Vous recevez cet email car vous avez configuré des rappels d'anticipation pour cette obligation.
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  // Test sending using Resend API directly from the browser (or simulation)
  async sendTestEmail(item, resendApiKey, destinationEmail) {
    if (!resendApiKey) {
      console.log('Mode démo : simulation de l\'envoi d\'email via Resend.');
      return {
        success: true,
        mode: 'simulated',
        message: `Simulation réussie : alerte pour "${item.title}" envoyée à ${destinationEmail || 'votre email'}.`
      };
    }

    try {
      const days = Recurrence.getDaysRemaining(item.nextDueDate);
      const html = this.generateEmailHtml(item, days);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Span Loop <notifications@span.app>',
          to: [destinationEmail],
          subject: `[Span Loop] Rappel : ${item.title} (${Recurrence.formatHumanDays(item.nextDueDate)})`,
          html: html
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur Resend API');
      }

      const data = await response.json();
      return { success: true, mode: 'resend', data };
    } catch (err) {
      console.error('Erreur lors de l\'envoi email:', err);
      return { success: false, error: err.message };
    }
  }
};
