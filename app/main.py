import csv
import io
from pathlib import Path
from typing import Literal

import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "patrimoine.yaml"
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

HEADER = (
    "# Patrimoine personnel. Chaque entrée est déclarative : pas de base de données.\n"
    "# brut: patrimoine brut, saisi manuellement (ce n'est pas une somme calculée)\n"
    "# categorie: investissements, epargne ou emprunts\n"
    "# etablissement: optionnel\n"
    "# finance: optionnel, pour les emprunts uniquement (part deja financee/couverte)\n"
    "# exclu: optionnel, pour les emprunts uniquement (n'apparait pas dans le patrimoine)\n"
)

CSV_FIELDS = ["nom", "categorie", "montant", "etablissement", "finance", "exclu"]


class Item(BaseModel):
    nom: str
    categorie: Literal["investissements", "epargne", "emprunts"]
    montant: float
    etablissement: str | None = None
    finance: float | None = None
    exclu: bool | None = None


class ItemOut(Item):
    id: int


class Brut(BaseModel):
    brut: float


def read_data() -> dict:
    data = yaml.safe_load(DATA_FILE.read_text()) or {}
    return {"brut": data.get("brut", 0.0), "items": data.get("items", [])}


def write_data(data: dict) -> None:
    body = yaml.safe_dump(data, sort_keys=False, allow_unicode=True)
    DATA_FILE.write_text(HEADER + "\n" + body)


def read_items() -> list[dict]:
    return read_data()["items"]


def write_items(items: list[dict]) -> None:
    data = read_data()
    data["items"] = items
    write_data(data)


def with_ids(items: list[dict]) -> list[ItemOut]:
    return [ItemOut(id=i, **entry) for i, entry in enumerate(items)]


app = FastAPI(title="fibb")


@app.get("/api/patrimoine", response_model=list[ItemOut])
def list_items() -> list[ItemOut]:
    return with_ids(read_items())


@app.get("/api/brut", response_model=Brut)
def get_brut() -> Brut:
    return Brut(brut=read_data()["brut"])


@app.put("/api/brut", response_model=Brut)
def set_brut(value: Brut) -> Brut:
    data = read_data()
    data["brut"] = value.brut
    write_data(data)
    return value


@app.post("/api/patrimoine", response_model=ItemOut, status_code=201)
def create_item(item: Item) -> ItemOut:
    items = read_items()
    items.append(item.model_dump(exclude_none=True))
    write_items(items)
    return ItemOut(id=len(items) - 1, **item.model_dump())


@app.put("/api/patrimoine/{item_id}", response_model=ItemOut)
def update_item(item_id: int, item: Item) -> ItemOut:
    items = read_items()
    if not 0 <= item_id < len(items):
        raise HTTPException(404, f"Aucun élément avec l'id {item_id}")
    items[item_id] = item.model_dump(exclude_none=True)
    write_items(items)
    return ItemOut(id=item_id, **item.model_dump())


@app.delete("/api/patrimoine/{item_id}", status_code=204)
def delete_item(item_id: int) -> None:
    items = read_items()
    if not 0 <= item_id < len(items):
        raise HTTPException(404, f"Aucun élément avec l'id {item_id}")
    del items[item_id]
    write_items(items)


@app.get("/api/patrimoine/export")
def export_csv() -> Response:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_FIELDS)
    writer.writeheader()
    for item in read_items():
        writer.writerow({field: item.get(field, "") for field in CSV_FIELDS})
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=patrimoine.csv"},
    )


@app.post("/api/patrimoine/import", response_model=list[ItemOut])
async def import_csv(file: UploadFile = File(...)) -> list[ItemOut]:
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    items = []
    for row in reader:
        data = {
            "nom": row["nom"],
            "categorie": row["categorie"],
            "montant": float(row["montant"]),
        }
        if row.get("etablissement"):
            data["etablissement"] = row["etablissement"]
        if row.get("finance"):
            data["finance"] = float(row["finance"])
        if row.get("exclu", "").strip().lower() in ("true", "1", "vrai"):
            data["exclu"] = True
        items.append(Item(**data).model_dump(exclude_none=True))
    write_items(items)
    return with_ids(items)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
