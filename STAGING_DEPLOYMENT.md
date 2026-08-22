# Déploiement de préproduction BizIci

Ce document décrit la préproduction hébergée sur Ubuntu 20.04 x86_64 à
`198.46.146.184`.

| Service        | URL                              |
| -------------- | -------------------------------- |
| API            | `https://api-bizici.run.place`   |
| Administration | `https://admin-bizici.run.place` |
| Site vitrine   | `https://site-bizici.run.place`  |

Les applications Expo NearBuy et BizIci Pro ne sont pas déployées sur ce
serveur. La future production devra utiliser un serveur, des domaines, des
secrets et un workflow distincts.

## Architecture

- Nginx termine TLS et sert les deux applications Vite.
- Nginx transmet tout le domaine API à `127.0.0.1:8080`.
- L’API Node.js est gérée par `bizici-api.service` et s’exécute avec
  l’utilisateur non privilégié `bizici`.
- Les releases sont stockées dans `/opt/bizici/releases/<commit>`.
- `/opt/bizici/current` est un lien symbolique basculé atomiquement.
- Les secrets API restent dans `/etc/bizici/api.env`, hors du dépôt et des
  artefacts GitHub.
- GitHub se connecte avec l’utilisateur limité `bizici-deploy`, jamais avec une
  clé SSH root. Cet utilisateur peut seulement lancer le script de release via
  `sudo`.
- GitHub Actions construit les trois artefacts. Le serveur n’a pas besoin de
  lire le dépôt GitHub.

## 1. Prérequis externes

Avant le provisionnement :

1. Les enregistrements DNS A des trois domaines doivent pointer vers
   `198.46.146.184`.
2. Les ports TCP 22, 80 et 443 doivent être accessibles.
3. Dans MongoDB Atlas, ajouter `198.46.146.184/32` à la liste d’accès réseau
   du cluster de test.
4. Préparer les clés Clerk de l’instance de test. La clé publiable et la clé
   secrète doivent provenir de la même instance.
5. Choisir une adresse e-mail opérationnelle pour les alertes Let’s Encrypt.

Ne jamais copier le `.env` local ou une clé privée dans le dépôt, un ticket ou
une conversation.

## 2. Créer une clé SSH dédiée au workflow

Créer une nouvelle clé uniquement pour cette préproduction depuis une machine
de confiance :

```bash
ssh-keygen -t ed25519 -C "github-actions-bizici-staging" \
  -f ~/.ssh/bizici-staging-deploy
```

Vérifier directement sur le serveur l’empreinte de sa clé hôte :

```bash
ssh root@198.46.146.184 \
  'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
```

Après cette vérification indépendante, produire l’entrée `known_hosts` :

```bash
ssh-keyscan -H 198.46.146.184 > /tmp/bizici-staging-known-hosts
```

Dans **GitHub → Settings → Environments → staging**, créer :

- secret `STAGING_SSH_PRIVATE_KEY` : contenu de
  `~/.ssh/bizici-staging-deploy` ;
- secret `STAGING_SSH_KNOWN_HOSTS` : contenu de
  `/tmp/bizici-staging-known-hosts` ;
- variable `STAGING_HOST` : `198.46.146.184` ;
- variable `STAGING_USER` : `bizici-deploy`.

Les deux variables ont déjà ces valeurs par défaut dans le workflow, mais les
déclarer rend la cible visible et facile à modifier.

## 3. Provisionner Ubuntu une seule fois

Depuis la racine du dépôt :

```bash
scp -r deploy/staging root@198.46.146.184:/root/bizici-staging
ssh root@198.46.146.184
cd /root/bizici-staging
LETSENCRYPT_EMAIL=ops@example.com bash bootstrap-ubuntu.sh
```

Le script est idempotent. Il :

- installe Node.js 22, pnpm 10.26.1, Nginx, UFW et Certbot ;
- autorise le port SSH réellement configuré avant d’activer UFW ;
- crée l’utilisateur de service `bizici` ;
- crée l’utilisateur SSH limité `bizici-deploy` et sa règle sudo dédiée ;
- installe systemd et Nginx ;
- obtient et configure les trois certificats Let’s Encrypt ;
- préserve `/etc/bizici/api.env` lors des exécutions suivantes.

Après le bootstrap, installer la clé publique du workflow depuis la machine qui
l’a générée :

```bash
cat ~/.ssh/bizici-staging-deploy.pub | ssh root@198.46.146.184 \
  'install -d -m 700 -o bizici-deploy -g bizici-deploy /home/bizici-deploy/.ssh
   cat > /home/bizici-deploy/.ssh/authorized_keys
   chown bizici-deploy:bizici-deploy /home/bizici-deploy/.ssh/authorized_keys
   chmod 600 /home/bizici-deploy/.ssh/authorized_keys'
```

Vérifier ensuite que la clé privée dédiée ouvre uniquement le compte de
déploiement :

```bash
ssh -i ~/.ssh/bizici-staging-deploy bizici-deploy@198.46.146.184 id
```

### Configurer les secrets sur le serveur

Toujours dans la session SSH :

```bash
nano /etc/bizici/api.env
chown root:bizici /etc/bizici/api.env
chmod 640 /etc/bizici/api.env
```

Remplacer tous les `CHANGE_ME`. Les valeurs obligatoires sont :

- `MONGODB_URI` : URI du cluster Atlas de test ;
- `REQUIRE_DB_READY=true` : empêche l’API de démarrer avant Atlas ;
- `SESSION_SECRET` : secret aléatoire long ;
- `CLERK_SECRET_KEY` et `CLERK_PUBLISHABLE_KEY` : instance Clerk de test ;
- `ADMIN_JWT_SECRET` : secret aléatoire long distinct ;
- `ROOT_ADMIN_PASSWORD` : mot de passe fort du compte administrateur racine.

Pour générer localement un secret aléatoire, utiliser par exemple
`openssl rand -hex 32`, puis le saisir directement dans le fichier serveur. Les
variables OpenAI et Expo restent facultatives.

Le déploiement refusera de démarrer tant qu’une valeur obligatoire est absente
ou vaut encore `CHANGE_ME`.

## 4. Créer la branche de préproduction

La branche distante `test` doit être créée après intégration de ces fichiers :

```bash
git switch main
git pull --ff-only
git switch -c test
git push --set-upstream origin test
```

Le workflow `.github/workflows/deploy-staging.yml` démarre automatiquement sur
chaque push vers `test`. Il peut aussi être lancé avec **Run workflow** dans
l’onglet Actions.

Dans **Settings → Branches**, protéger `test` : interdire les force-pushs,
exiger une pull request et au moins une approbation avant fusion. Dans
l’environnement GitHub `staging`, limiter les branches de déploiement à
`test`. Une approbation d’environnement supplémentaire peut être activée si un
contrôle manuel avant mise en ligne est souhaité.

Avant tout transfert, il exécute :

1. `pnpm install --frozen-lockfile` avec Node.js 22 et pnpm 10.26.1 ;
2. `pnpm run typecheck` ;
3. `pnpm run test:regressions` ;
4. les builds API, admin et site.

L’admin est construit avec
`VITE_API_BASE_URL=https://api-bizici.run.place`. Les deux applications Vite
sont construites avec `BASE_PATH=/`.

## 5. Déroulement d’une release

Le workflow transfère une archive signée par SHA-256, puis le script distant :

1. vérifie le checksum et les chemins de l’archive ;
2. copie les fichiers reçus dans un répertoire root-only avant toute
   validation, pour empêcher leur remplacement pendant l’extraction ;
3. refuse un environnement serveur incomplet ;
4. extrait la release dans un nouveau répertoire ;
5. vérifie les trois points d’entrée et le catalogue pays requis par l’API ;
6. bascule atomiquement `/opt/bizici/current` ;
7. recharge Nginx et redémarre l’API ;
8. attend la connexion MongoDB Atlas, puis vérifie l’API locale et les trois
   URL HTTPS ;
9. restaure automatiquement la release précédente si une vérification échoue ;
10. conserve les cinq releases récentes, plus la précédente si nécessaire.

Une validation ou un build GitHub en échec ne touche pas au serveur.

## 6. Diagnostic

```bash
# État et logs de l’API
systemctl status bizici-api --no-pager
journalctl -u bizici-api -n 200 --no-pager

# Configuration et logs Nginx
nginx -t
tail -n 200 /var/log/nginx/error.log

# Santé locale et publique
curl --fail http://127.0.0.1:8080/api/healthz
curl --fail https://api-bizici.run.place/api/healthz

# Release active et releases disponibles
readlink -f /opt/bizici/current
find /opt/bizici/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n'

# Renouvellement TLS
systemctl status certbot.timer --no-pager
certbot renew --dry-run
```

## 7. Rollback manuel

Choisir un identifiant affiché dans `/opt/bizici/releases`, puis :

```bash
bizici-rollback-release <identifiant-de-release>
```

Le rollback est lui aussi atomique. Il redémarre l’API et vérifie sa santé. Si
la release choisie ne démarre pas, le script restaure la version qui était
active.

Le rollback vers `bootstrap` remet seulement les pages d’attente et arrête
l’API :

```bash
bizici-rollback-release bootstrap
```

## 8. Contrôles après le premier déploiement

- Les trois URL répondent en HTTPS sans avertissement de certificat.
- `https://api-bizici.run.place/api/healthz` renvoie `{"status":"ok"}`.
- Une connexion MongoDB absente fait répondre le healthcheck en HTTP 503 et
  empêche l’activation de la release.
- La connexion à l’administration fonctionne.
- Les appels de l’administration ciblent `api-bizici.run.place`, et non
  `localhost` ou un domaine Replit.
- `systemctl status bizici-api` indique `active (running)`.
- `certbot renew --dry-run` termine avec succès.
