# fibb

Page web simple pour visualiser son patrimoine net et brut en un coup d'œil. Pas de base de
données : tout est déclaratif dans `data/patrimoine.yaml`. Pas d'authentification — à réserver à
un réseau local de confiance.

## Lancer en local

```bash
pip install -r requirements.txt
cp data/patrimoine.example.yaml data/patrimoine.yaml   # première utilisation
uvicorn app.main:app --reload
```

Puis ouvrir http://localhost:8000.

## Lancer avec Docker

```bash
docker build -t fibb .
docker run -p 8000:8000 -v $(pwd)/data:/app/data fibb
```

Ou avec `docker-compose.yml` :

```bash
docker compose up -d --build
```

## Éditer le patrimoine

Via l'UI (bouton "+ Ajouter" et icônes ✎ / 🗑 sur chaque ligne), ou en modifiant
`data/patrimoine.yaml` à la main. Chaque élément :

```yaml
- nom: Livret A
  categorie: epargne          # comptes | investissements | epargne | credits
  montant: 22950
  etablissement: Ma Banque    # optionnel
  taux: 3.0                   # optionnel, en %
  echeance: "2045-06"         # optionnel
```

Patrimoine brut = comptes + investissements + épargne. Patrimoine net = brut - crédits.

⚠️ `data/patrimoine.yaml` est gitignored : ne jamais committer de vraies données financières sur
ce repo public. Utiliser `data/patrimoine.example.yaml` comme modèle.
