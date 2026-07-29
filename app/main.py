from pathlib import Path
from typing import Literal

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "patrimoine.yaml"
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

HEADER = (
    "# Patrimoine personnel. Chaque entrée est déclarative : pas de base de données.\n"
    "# categorie: comptes, investissements, epargne ou credits\n"
    "# etablissement: optionnel\n"
    "# finance: optionnel, pour les credits uniquement (part deja financee/couverte)\n"
    "# exclu: optionnel, pour les credits uniquement (n'apparait pas dans le patrimoine)\n"
)


class Item(BaseModel):
    nom: str
    categorie: Literal["comptes", "investissements", "epargne", "credits"]
    montant: float
    etablissement: str | None = None
    finance: float | None = None
    exclu: bool | None = None


class ItemOut(Item):
    id: int


def read_items() -> list[dict]:
    return yaml.safe_load(DATA_FILE.read_text()) or []


def write_items(items: list[dict]) -> None:
    body = yaml.safe_dump(items, sort_keys=False, allow_unicode=True)
    DATA_FILE.write_text(HEADER + "\n" + body)


def with_ids(items: list[dict]) -> list[ItemOut]:
    return [ItemOut(id=i, **entry) for i, entry in enumerate(items)]


app = FastAPI(title="fibb")


@app.get("/api/patrimoine", response_model=list[ItemOut])
def list_items() -> list[ItemOut]:
    return with_ids(read_items())


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


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
