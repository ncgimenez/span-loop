// Supabase Edge Function: daily-email-alerts
// Déclenchée quotidiennement à 08h00 via pg_cron ou webhook externe
// Utilise Resend pour délivrer des emails transactionnels 100% fiables

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_PUBLIC_URL = Deno.env.get("APP_PUBLIC_URL") || "https://loop.span.app";

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req: Request) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 1. Récupérer toutes les échéances actives
    const { data: deadlines, error } = await supabase
      .from("deadlines")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    let emailsSent = 0;
    const results: any[] = [];

    for (const item of (deadlines || [])) {
      if (!item.notification_email) continue;

      const dueDate = new Date(item.next_due_date);
      dueDate.setUTCHours(0, 0, 0, 0);

      // Différence en jours
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Vérifier si diffDays fait partie des règles d'alerte (ex: J-14, J-7, J-1, Jour J: 0)
      const rules = item.reminder_rules || [7, 1, 0];
      if (!rules.includes(diffDays)) continue;

      // 2. Vérifier si un email n'a pas déjà été envoyé pour cette échéance + ce palier
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("id")
        .eq("deadline_id", item.id)
        .eq("reminder_day", diffDays)
        .eq("target_due_date", item.next_due_date)
        .maybeSingle();

      if (existingLog) continue; // Déjà envoyé

      // 3. Générer le contenu de l'email
      const validateUrl = `${APP_PUBLIC_URL}/?action=validate&id=${item.id}&token=${item.validation_token}`;
      const subjectTag = diffDays === 0 ? "🚨 JOUR J" : diffDays <= 2 ? "⚡ URGENT" : `J-${diffDays}`;
      const subject = `[Span Loop] ${subjectTag} : ${item.title}`;

      const emailHtml = `
        <div style="background-color: #0b0f19; font-family: sans-serif; padding: 40px; color: #e2e8f0;">
          <div style="max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
            <div style="color: #10b981; font-weight: bold; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
              Span Loop · ${subjectTag}
            </div>
            <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0;">${item.title}</h1>
            <p style="color: #94a3b8; font-size: 14px;">
              Date limite : <strong>${item.next_due_date}</strong> (${diffDays === 0 ? "Aujourd'hui" : "dans " + diffDays + " jours"}).
            </p>
            ${item.amount ? `<p style="font-size: 16px; color: #34d399; font-weight: bold;">Montant : ${item.amount} €</p>` : ''}
            ${item.notes ? `<p style="color: #cbd5e1; font-size: 13px; background: #1e293b; padding: 12px; border-radius: 8px;">${item.notes}</p>` : ''}
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${validateUrl}" style="background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                ✓ Marquer comme fait (1 clic)
              </a>
              <p style="color: #64748b; font-size: 12px; margin-top: 10px;">
                Reprogramme automatiquement le prochain cycle (${item.frequency}).
              </p>
            </div>
          </div>
        </div>
      `;

      // 4. Envoyer via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Span Loop <notifications@span.app>",
          to: [item.notification_email],
          subject: subject,
          html: emailHtml
        })
      });

      if (resendRes.ok) {
        // Enregistrer le log
        await supabase.from("email_logs").insert({
          deadline_id: item.id,
          user_id: item.user_id,
          recipient_email: item.notification_email,
          reminder_day: diffDays,
          target_due_date: item.next_due_date
        });
        emailsSent++;
        results.push({ id: item.id, title: item.title, status: "sent", day: diffDays });
      } else {
        const errText = await resendRes.text();
        results.push({ id: item.id, title: item.title, status: "error", error: errText });
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent, results }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
});
