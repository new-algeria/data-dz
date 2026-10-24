# Fonction Edge `envoyer-email`

Envoie par email les notifications importantes :

| Notification | Destinataires | Exemple |
|---|---|---|
| `nouvelle_soumission` | tous les modérateurs et admins (sauf l'auteur) | « Nouvelle proposition à relire : … » |
| `revue` | l'auteur de la proposition | acceptée, refusée, modifications demandées, commentaire, complétée par la modération |
| `publiee` | l'auteur de la proposition | « Votre donnée est en ligne : … » |

```
notification insérée ──trigger──▶ pg_net (asynchrone) ──POST + secret──▶ envoyer-email ──▶ Resend ──▶ boîte mail
```

La fonction ne reçoit que l'identifiant de la notification : elle la relit en base, cherche l'email du compte (confirmé uniquement) et construit le message (français puis arabe) dans `contenu.ts`.

## Mise en route (une seule fois)

1. **Resend** : créer un compte gratuit sur https://resend.com (3 000 emails par mois), vérifier le domaine `data-dz.com` (enregistrements DNS) et créer une clé d'API.
2. **Déployer la fonction** :
   ```bash
   npx supabase functions deploy envoyer-email --no-verify-jwt
   ```
3. **Secrets de la fonction** (le secret partagé est une longue chaîne aléatoire, par exemple `openssl rand -hex 32`) :
   ```bash
   npx supabase secrets set EMAILS_SECRET=<secret> RESEND_API_KEY=<clé Resend> \
     EMAIL_EXPEDITEUR="data-dz <notifications@data-dz.com>" URL_SITE=https://data-dz.com
   ```
4. **Migration** `20261024000008_revue_moderateurs.sql` dans le SQL Editor (elle active `pg_net`).
5. **Secrets Vault** (SQL Editor, à ne jamais commiter) :
   ```sql
   select vault.create_secret('https://<projet>.supabase.co/functions/v1/envoyer-email', 'emails_url');
   select vault.create_secret('<secret>', 'emails_secret');
   ```

Tant que l'étape 5 n'est pas faite, le trigger ne fait rien : les notifications du site continuent de marcher, sans email.

## Vérifier

- Appels envoyés par la base : `select id, status_code, content from net._http_response order by created desc limit 10;`
- Journaux de la fonction : Supabase → Edge Functions → `envoyer-email` → Logs.
- Envois : tableau de bord Resend → Emails.

## Sécurité

- Aucun secret dans ce dépôt : tout est dans Supabase (Vault et secrets des fonctions).
- La fonction refuse toute requête sans le bon `x-emails-secret` (comparaison en temps constant).
- Titres et commentaires sont échappés dans le HTML ; les liens ne pointent que vers des chemins du site.
