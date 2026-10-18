# 🔄 Span Loop — Le Radar des Échéances & Boucles Récurrentes

> **3e pilier de la suite de productivité Span** :
> * **Span Plan (Le Futur) :** La planification de la semaine, la timeline et les blocs de travail.
> * **Span Focus (Le Présent) :** L'immersion et l'exécution sans distraction (Pomodoro & bruit blanc).
> * **Span Loop (La Boucle & la Sérénité) :** Le radar des échéances récurrentes (admin, finances, abonnements) avec alertes email automatiques + validation en 1 clic pour boucler sur le prochain cycle.

---

## 🎯 Fonctionnalités Clés Réalisées

1. **Dashboard épuré par 4 horizons temporels :**
   * 🚨 **En retard & Moins de 48h (Urgent) :** Action immédiate requise, surbrillance rouge/orange pulsée.
   * ⚡ **Cette semaine (3 à 7 jours) :** Préparation et anticipation des documents et fonds.
   * 📅 **Ce mois-ci (8 à 30 jours) :** Visibilité sereine à moyen terme.
   * ⏳ **À venir (> 30 jours) :** Sous radar automatique en arrière-plan.

2. **Validation en 1 Clic & Boucle Automatique :**
   * Un clic sur **"Valider"** reprogramme instantanément l'échéance selon sa fréquence (*mensuelle, trimestrielle, semestrielle, annuelle, personnalisée*).
   * Animation de célébration confettis & mise à jour du **score de consistance** et de l'historique d'accomplissement.
   * Support de l'action via URL : `?action=validate&id=...&token=...` permettant de valider directement depuis un email sans aucune saisie de mot de passe !

3. **Moteur d'Alertes Email 100% Automatique :**
   * Modèle d'email HTML responsive ultra moderne, sombre et épuré.
   * Bouton CTA intégré *"✓ Marquer comme fait (1 clic)"*.
   * Règles d'anticipation configurables par tâche : **J-14, J-7, J-3, J-1, Jour J**.
   * Simulateur intégré dans l'interface pour tester le rendu de vos emails en direct.

4. **Radar Budgétaire & Catégories :**
   * 💳 Finances & Factures (loyer, charges, électricité, internet).
   * 🔄 Abonnements & Résiliations (périodes d'essai, Netflix, logiciels).
   * 📁 Administratif & Légal (impôts, TVA, URSSAF, contrôle technique, carte d'identité).
   * 🌿 Santé & Rituels de vie (dentiste, bilans de santé, rituels mensuels).
   * Calcul en temps réel du budget récurrent mensuel normalisé.

---

## 🚀 Démarrage Rapide en Local

L'application est conçue en Vanilla JS moderne / HTML5 / Tailwind CSS : aucun build complexe ni dépendance lourde requise !

```bash
cd /Users/ncgimenez/Git/span-loop

# Lancer le serveur local (port 8082 pour éviter le conflit avec Span Focus)
python3 -m http.server 8082
# ou via npm :
npm start
```

Ouvrez ensuite votre navigateur sur : [http://localhost:8082](http://localhost:8082)

> L'application démarre immédiatement avec des données réalistes pré-remplies stockées dans votre navigateur (`LocalStorage`).

---

## ⚡ Déploiement Backend Supabase & Resend

### 1. Base de données PostgreSQL & RLS
1. Créez un projet sur [Supabase](https://supabase.com).
2. Ouvrez le **SQL Editor** dans votre tableau de bord Supabase.
3. Copiez-collez l'intégralité du fichier [`supabase/schema.sql`](file:///Users/ncgimenez/.gemini/antigravity/scratch/span-loop/supabase/schema.sql) et cliquez sur **Run**.
4. Cela crée les tables `deadlines`, `deadline_history`, `email_logs`, les politiques de sécurité (RLS) et la fonction de validation en 1 clic.

### 2. Déploiement de l'Edge Function pour les emails quotidiens
L'Edge Function [`supabase/functions/daily-email-alerts/index.ts`](file:///Users/ncgimenez/.gemini/antigravity/scratch/span-loop/supabase/functions/daily-email-alerts/index.ts) scanne les échéances chaque matin et envoie les emails via **Resend** :

```bash
# Installer la CLI Supabase si nécessaire
npm install -g supabase

# Déployer l'Edge Function
supabase functions deploy daily-email-alerts --project-ref <VOTRE-PROJECT-REF>

# Configurer les secrets d'environnement
supabase secrets set RESEND_API_KEY="re_..." APP_PUBLIC_URL="https://loop.span.app"
```

### 3. Programmation du Cron quotidien à 08h00 UTC
Activez l'extension `pg_cron` dans Supabase (Database -> Extensions), puis activez le cron `span-loop-daily-alerts` fourni dans `supabase/schema.sql`.

---

## 🎨 Identité Visuelle Span Loop

* **Logo :** "S" géométrique de Span aux lignes nettes avec dégradé Vert Émeraude / Menthe (`#10b981`).
* **Palette :** Canvas Obsidian `#080c14`, cartes `#0e1626`, accents Menthe `#10b981`, alertes rose néon `#ef4444`.
* **Philosophie :** Zéro friction, « noter et boucler », sérénité absolue.
