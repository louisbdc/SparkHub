# Guide de migration Vercel → VPS (Sparkhub)

## Contexte

- **VPS** : `51.254.138.230` (Ubuntu, OVH)
- **Projet existant sur le VPS** : `lecarnetenligne.be` (port 3000/4000)
- **Sparkhub** : tourne sur le port **3001** pour éviter tout conflit
- **Reverse proxy** : Caddy (gère le SSL automatiquement via Let's Encrypt)
- **Process manager** : PM2 (redémarrage auto en cas de crash ou reboot)
- **Base de données** : Supabase (externe, rien ne change)

---

## Ce qui a été fait (par Claude)

### 1. Clone du repo

```bash
cd ~
git clone https://github.com/louisbdc/SparkHub.git sparkhub
```

Le repo a été cloné via HTTPS (pas de clé SSH GitHub sur le VPS).
Le code se trouve dans `~/sparkhub/frontend/`.

### 2. Variables d'environnement

Le fichier `~/sparkhub/frontend/.env.local` a été créé avec :

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de ton projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (utilisée côté client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase (côté serveur uniquement) |
| `NEXT_PUBLIC_APP_URL` | `https://sparkhub.fr/` |
| `RESEND_API_KEY` | Clé API pour l'envoi d'emails |
| `RESEND_FROM` | Adresse expéditeur des emails |

> Ces variables sont identiques à celles utilisées sur Vercel.
> La base de données Supabase est externe : les utilisateurs, tickets, workspaces restent intacts.

### 3. Build de l'application

```bash
cd ~/sparkhub/frontend
npm install
npm run build
```

Next.js compile l'app en mode production (SSR + pages statiques).

### 4. Lancement avec PM2

```bash
cd ~/sparkhub/frontend
PORT=3001 pm2 start npm --name sparkhub -- start
pm2 save
```

- `PORT=3001` : évite le conflit avec lecarnetenligne.be (port 3000)
- `pm2 save` : sauvegarde la liste des processus pour qu'ils redémarrent automatiquement au reboot du VPS

**Commandes PM2 utiles :**

```bash
pm2 status              # voir l'état de toutes les apps
pm2 logs sparkhub       # voir les logs en temps réel
pm2 restart sparkhub    # redémarrer l'app
pm2 stop sparkhub       # arrêter l'app
pm2 delete sparkhub     # supprimer l'app de PM2
```

### 5. Configuration Caddy

Le bloc suivant a été ajouté à `/etc/caddy/Caddyfile` :

```caddyfile
# ─── Sparkhub ──────────────────────────────────────────────────────────────────
sparkhub.fr {
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip
}

www.sparkhub.fr {
    redir https://sparkhub.fr{uri} permanent
}
```

**Ce que ça fait :**
- `sparkhub.fr` → redirige vers l'app Next.js sur le port 3001
- `www.sparkhub.fr` → redirige automatiquement vers `sparkhub.fr` (sans www)
- Caddy génère et renouvelle le certificat SSL automatiquement
- `encode gzip` → compression des réponses pour de meilleures performances
- Les blocs existants de `lecarnetenligne.be` n'ont pas été touchés

---

## Ce qu'il te reste à faire (DNS sur OVH)

### Etape 1 : Baisser le TTL (optionnel mais recommandé)

Le TTL (Time To Live) indique aux DNS du monde combien de temps ils doivent garder l'ancienne adresse IP en cache. En le baissant avant le changement, la propagation sera plus rapide.

1. Connecte-toi sur l'interface OVH du domaine `sparkhub.fr`
2. Va dans **Zone DNS**
3. Trouve le record de type **A** pour `sparkhub.fr`
4. Modifie le TTL à **300** (5 minutes)
5. Attends que l'ancien TTL expire (regarde sa valeur actuelle, c'est le temps à attendre)

### Etape 2 : Changer le A record

1. Dans la **Zone DNS** de `sparkhub.fr` sur OVH
2. Modifie le record **A** :
   - **Sous-domaine** : *(vide)* ou `@`
   - **Type** : A
   - **Cible** : `51.254.138.230`
3. Ajoute aussi un record **A** pour `www` :
   - **Sous-domaine** : `www`
   - **Type** : A
   - **Cible** : `51.254.138.230`
4. Supprime tout record **CNAME** existant qui pointerait vers Vercel (ex: `cname.vercel-dns.com`)

> **Propagation DNS** : entre 5 minutes et 2 heures selon les providers DNS.
> Tu peux vérifier la propagation sur https://dnschecker.org/#A/sparkhub.fr

### Etape 3 : Vérifier que tout fonctionne

Une fois le DNS propagé :

1. Ouvre `https://sparkhub.fr` dans ton navigateur
2. Vérifie que le cadenas SSL est bien vert
3. Connecte-toi avec un compte existant
4. Vérifie que les workspaces et tickets sont là
5. Teste l'envoi d'un email (invitation ou reset password)

### Etape 4 : Supprimer le projet Vercel

Une fois que tout est validé :

1. Va sur https://vercel.com/dashboard
2. Trouve le projet Sparkhub
3. Settings → Delete Project

---

## Déploiement automatique (GitHub Actions)

Un workflow GitHub Actions est configuré dans `.github/workflows/deploy.yml`.
A chaque push sur `main`, il se connecte au VPS en SSH et déploie automatiquement.

### Configuration des secrets GitHub (une seule fois)

1. Va sur https://github.com/louisbdc/SparkHub/settings/secrets/actions
2. Ajoute ces 3 secrets :

| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | `51.254.138.230` |
| `VPS_USER` | `ubuntu` |
| `VPS_SSH_KEY` | La clé privée SSH correspondant à `github-deploy` (voir ci-dessous) |

**Pour `VPS_SSH_KEY`** : c'est la clé privée Ed25519 qui correspond à la clé publique `github-deploy` déjà présente sur le VPS. Si tu l'as sur ta machine, copie son contenu. Sinon, il faut en générer une nouvelle :

```bash
# Sur ta machine locale
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github-deploy-sparkhub

# Copie la clé publique sur le VPS
ssh-copy-id -i ~/.ssh/github-deploy-sparkhub.pub ubuntu@51.254.138.230

# Le contenu de ~/.ssh/github-deploy-sparkhub (la clé PRIVÉE) va dans le secret GitHub
cat ~/.ssh/github-deploy-sparkhub
```

### Déploiement manuel (si besoin)

```bash
ssh ubuntu@51.254.138.230

cd ~/sparkhub
git pull

cd frontend
npm install
npm run build
pm2 restart sparkhub
```

---

## Architecture finale

```
Internet
   │
   ▼
Caddy (ports 80/443)
   │
   ├── sparkhub.fr ──────────► localhost:3001 (Next.js / Sparkhub)
   │
   ├── lecarnetenligne.be ──► localhost:3000 (Next.js / Carnet)
   ├── *.lecarnetenligne.be ► localhost:3000
   └── api.lecarnetenligne.be ► localhost:4000
   │
   ▼
Supabase (externe)
   ├── PostgreSQL (base de données)
   ├── Auth (authentification)
   └── Storage (fichiers)
```

---

## En cas de problème

### L'app ne répond pas
```bash
pm2 status                    # vérifier si sparkhub est "online"
pm2 logs sparkhub --lines 50  # voir les dernières erreurs
pm2 restart sparkhub          # relancer
```

### Caddy ne sert pas le site
```bash
sudo caddy validate --config /etc/caddy/Caddyfile   # vérifier la syntaxe
sudo systemctl status caddy                          # vérifier que Caddy tourne
sudo systemctl reload caddy                          # recharger la config
sudo journalctl -u caddy --since "5 min ago"         # voir les logs Caddy
```

### Le SSL ne fonctionne pas
Caddy génère le certificat automatiquement quand le DNS pointe vers le VPS.
Si ça ne marche pas :
1. Vérifie que le DNS est bien propagé : `dig sparkhub.fr +short` doit retourner `51.254.138.230`
2. Vérifie que les ports 80 et 443 sont ouverts sur le VPS
3. Regarde les logs Caddy : `sudo journalctl -u caddy --since "10 min ago"`

### lecarnetenligne.be est cassé
Normalement impossible (on n'a touché à aucun de ses blocs), mais au cas où :
```bash
pm2 status                    # vérifier carnet-frontend et carnet-backend
curl -I https://lecarnetenligne.be   # tester directement
```
