# Modèles des emails de connexion (Supabase Auth)

Emails envoyés par Supabase Auth pour les deux sites (data-dz et New Algeria, même projet Supabase), aux couleurs
des emails de notification (fond beige, en-tête vert, fennec) : français, avec une ligne en anglais.

| Fichier | Modèle Supabase | Objet |
|---|---|---|
| `confirmation.html` | Confirm signup | Confirme ton adresse email · data-dz |
| `magic_link.html` | Magic Link | Ton lien de connexion · data-dz |
| `recovery.html` | Reset Password | Choisis un nouveau mot de passe · data-dz |
| `email_change.html` | Change Email Address | Confirme ta nouvelle adresse email · data-dz |

En local, `supabase/config.toml` les utilise directement (emails visibles dans Mailpit).

## Production (à faire à la main, une fois)
1. **Expéditeur** (recommandé, sinon les emails partent de « Supabase Auth » avec une limite de quelques envois par heure) :
   Supabase → Project Settings → Authentication → **SMTP Settings** → Enable custom SMTP, avec Resend (déjà utilisé
   par la fonction `envoyer-email`) :
   - Host `smtp.resend.com`, port `465`, username `resend`, password : une clé d'API Resend (jamais dans ce dépôt) ;
   - Sender email `notifications@data-dz.com` (domaine vérifié chez Resend), sender name `data-dz`.
2. **Modèles** : Supabase → Authentication → **Emails** → Templates. Pour chaque modèle du tableau : coller l'objet,
   puis tout le contenu du fichier HTML dans « Message body », et enregistrer.

Les variables `{{ .ConfirmationURL }}`, `{{ .Email }}` et `{{ .NewEmail }}` sont remplacées par Supabase. Le lien de
confirmation passe par `/auth/callback` (flux PKCE) : il doit être ouvert dans le navigateur où la demande a été faite,
ce que l'email rappelle.
