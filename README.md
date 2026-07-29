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

Via l'UI (bouton "+ Ajouter" et icônes ✎ / ✕ sur chaque ligne, ✎ à côté du patrimoine brut), ou
en modifiant `data/patrimoine.yaml` à la main :

```yaml
brut: 58550   # saisi manuellement, ce n'est pas une somme calculée

items:
  - nom: Livret A
    categorie: epargne          # investissements | epargne | emprunts
    montant: 22950
    etablissement: Ma Banque    # optionnel

  - nom: Emprunt immobilier locatif
    categorie: emprunts
    montant: 50000              # reste à rembourser, purement indicatif
    finance: 30000               # optionnel, part déjà financée/couverte (ex. par des loyers)
    exclu: true                  # optionnel, exclut cet emprunt du patrimoine
```

Patrimoine brut : saisi à la main (champ `brut`), valeur indépendante qui n'entre dans aucun
calcul — affichée seule, à côté. Patrimoine net = investissements + épargne + la somme des
`finance` de chaque emprunt (les emprunts cochés `exclu` n'y contribuent pas). Le `montant` d'un
emprunt (reste à rembourser) est purement indicatif : il n'entre dans aucun des deux totaux.

## Import / export CSV

Les boutons "Exporter CSV" et "Importer CSV" de l'en-tête permettent de télécharger le patrimoine
au format CSV, ou de le remplacer entièrement à partir d'un fichier CSV (colonnes : `nom`,
`categorie`, `montant`, `etablissement`, `finance`, `exclu`).

⚠️ `data/patrimoine.yaml` est gitignored : ne jamais committer de vraies données financières sur
ce repo public. Utiliser `data/patrimoine.example.yaml` comme modèle.
