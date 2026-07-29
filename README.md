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

- nom: Crédit immobilier locatif
  categorie: credits
  montant: 50000              # reste à rembourser, purement indicatif
  finance: 30000               # optionnel, part déjà financée/couverte (ex. par des loyers)
  exclu: true                  # optionnel, exclut ce crédit du patrimoine
```

Patrimoine brut = comptes + investissements + épargne. Patrimoine net = brut + la somme des
`finance` de chaque crédit (les crédits cochés `exclu` n'y contribuent pas). Le `montant` d'un
crédit (reste à rembourser) est purement indicatif : il n'entre dans aucun des deux totaux.

⚠️ `data/patrimoine.yaml` est gitignored : ne jamais committer de vraies données financières sur
ce repo public. Utiliser `data/patrimoine.example.yaml` comme modèle.
