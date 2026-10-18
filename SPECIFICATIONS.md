# 📋 Vision & Spécifications Définitives : Span Loop

> **Positionnement dans la suite Span :**
> * **Span Plan (Le Futur) :** La planification de la semaine, la timeline et les blocs de temps prévisionnels (Work / Life / Fun).
> * **Span Focus (Le Présent) :** L'immersion et l'exécution sans distraction (Pomodoro, chrono de temps réel, bruit blanc).
> * **Span Loop (Le Cycle & la Sérénité) :** Le radar passif des échéances récurrentes (admin, finances, abonnements, rituels) + alertes email automatiques en 1 clic + calcul du matelas d'épargne d'anticipation (*Sinking Funds*).

---

## 1. Ce que Span Loop FAIT (Périmètre Validé)

### A. Radar d'échéances récurrentes (4 Horizons)
* 🚨 **En retard & Moins de 48h (Urgent) :** Action immédiate requise.
* ⚡ **Cette semaine (3 à 7 jours) :** Anticipation et préparation des pièces/fonds.
* 📅 **Ce mois-ci (8 à 30 jours) :** Visibilité moyen terme.
* ⏳ **À venir (> 30 jours) :** Veille automatique en arrière-plan.

### B. Validation en 1 Clic (« Noter et Oublier »)
* Un clic valide l'échéance et boucle automatiquement sur le cycle suivant (mensuel, trimestriel, semestriel, annuel, personnalisé).
* Historique d'accomplissement et calcul du score de consistance (% d'échéances honorées à temps).
* Validation directe depuis l'email via URL signée sans connexion requise (`?action=validate&id=...&token=...`).

### C. Moteur d'Alertes Email 100% Automatique
* Paliers d'anticipation configurables par obligation : J-14, J-7, J-3, J-1, Jour J.
* Emails transactionnels minimalistes et responsives via Resend / Brevo.
* Cron quotidien automatisé via Supabase Edge Function (`daily-email-alerts`) programmé à 08h00.

### D. Module Financier & Provisionnement d'Épargne (*Sinking Funds*)
1. **Lissage des charges fixes :** Total des abonnements et factures fixes ramené au mois (€/mois).
2. **Matelas d'épargne d'anticipation (*Sinking Fund*) :** Calcul automatique de la somme mensuelle à mettre de côté pour amortir les grosses échéances annuelles/trimestrielles (assurances, impôts, contrôle technique) sans jamais subir de découvert.
3. **Boucles d'épargne programmée :** « Se payer en premier » via des rappels récurrents de virement vers ses livrets.

---

## 2. Ce que Span Loop NE FAIT PAS (Frontières Produits Claires)

* ❌ **Pas de time-tracking lourd (Work / Life / Fun) :** Le suivi du temps passé et les sessions de chrono appartiennent à **Span Focus** et **Span Plan**. Span Loop reste un outil de charge mentale zéro (on n'a pas besoin d'y aller tous les jours).
* ❌ **Pas d'agrégation bancaire complète :** Pas de catégorisation de chaque dépense de supermarché ni de connexion OpenBanking lourde. On reste sur le prévisionnel et l'anticipation.

---

## 3. Stack Technique & Identité

* **Frontend :** HTML5, Tailwind CSS, Vanilla JS moderne (Dark Mode natif Obsidian `#080c14`, touches de vert Émeraude/Menthe `#10b981`).
* **Backend :** Supabase (PostgreSQL, Row Level Security, Edge Functions Deno, pg_cron).
* **Emails :** API Resend / Brevo (emails transactionnels HTML).
* **Emplacement du projet :** `/Users/ncgimenez/.gemini/antigravity/scratch/span-loop`
