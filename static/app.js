let items = [];

const CATEGORY_LABELS = {
  comptes: "Comptes",
  investissements: "Investissements",
  epargne: "Épargne",
  credits: "Crédits",
};

const CATEGORY_ORDER = ["comptes", "investissements", "epargne", "credits"];
const ASSET_CATEGORIES = ["comptes", "investissements", "epargne"];

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function itemMeta(item) {
  const parts = [];
  if (item.etablissement) parts.push(item.etablissement);
  if (item.finance != null) parts.push(`financé ${currency.format(item.finance)}`);
  if (item.exclu) parts.push("hors patrimoine");
  return parts.join(" · ");
}

function render() {
  const brut = items
    .filter((i) => ASSET_CATEGORIES.includes(i.categorie))
    .reduce((sum, i) => sum + i.montant, 0);
  const financeTotal = items
    .filter((i) => i.categorie === "credits" && !i.exclu)
    .reduce((sum, i) => sum + (i.finance || 0), 0);
  const net = brut + financeTotal;

  document.getElementById("total-net").textContent = currency.format(net);
  document.getElementById("total-brut").textContent = currency.format(brut);

  const container = document.getElementById("categories");
  container.innerHTML = CATEGORY_ORDER.map((cat) => {
    const catItems = items.filter((i) => i.categorie === cat);
    const subtotal = catItems.reduce((sum, i) => sum + i.montant, 0);

    const rows = catItems.length
      ? catItems
          .map(
            (i) => `
        <li class="item-row">
          <div class="item-info">
            <span class="item-name">${i.nom}</span>
            ${itemMeta(i) ? `<span class="item-meta">${itemMeta(i)}</span>` : ""}
          </div>
          <span class="item-amount">${currency.format(i.montant)}</span>
          <span class="item-actions">
            <button class="edit-btn" data-id="${i.id}" type="button" title="Modifier">✎</button>
            <button class="delete-btn" data-id="${i.id}" type="button" title="Supprimer">🗑</button>
          </span>
        </li>`
          )
          .join("")
      : `<li class="empty-state">Aucun élément</li>`;

    return `
      <div class="category-card ${cat}">
        <div class="category-header">
          <span class="category-name">${CATEGORY_LABELS[cat]}</span>
          <span class="category-subtotal">${currency.format(subtotal)}</span>
        </div>
        <ul class="item-list">${rows}</ul>
      </div>`;
  }).join("");
}

async function refresh() {
  items = await fetch("/api/patrimoine").then((res) => res.json());
  render();
}

// --- Ajout / édition ---

const dialog = document.getElementById("item-dialog");
const form = document.getElementById("item-form");
const dialogTitle = document.getElementById("dialog-title");
const dialogError = document.getElementById("dialog-error");
let editingId = null;

function openDialog(item) {
  dialogError.textContent = "";
  editingId = item ? item.id : null;
  dialogTitle.textContent = item ? `Modifier ${item.nom}` : "Ajouter un élément";
  form.nom.value = item ? item.nom : "";
  form.categorie.value = item ? item.categorie : "comptes";
  form.montant.value = item ? item.montant : "";
  form.etablissement.value = item && item.etablissement ? item.etablissement : "";
  form.finance.value = item && item.finance != null ? item.finance : "";
  form.exclu.checked = item ? !!item.exclu : false;
  dialog.showModal();
}

document.getElementById("add-item").addEventListener("click", () => openDialog(null));
document.getElementById("dialog-cancel").addEventListener("click", () => dialog.close());

document.getElementById("categories").addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const item = items.find((i) => i.id === Number(editBtn.dataset.id));
    if (item) openDialog(item);
    return;
  }

  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.id);
    const item = items.find((i) => i.id === id);
    if (!confirm(`Supprimer "${item ? item.nom : ""}" ?`)) return;
    const res = await fetch(`/api/patrimoine/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  dialogError.textContent = "";

  const payload = {
    nom: form.nom.value.trim(),
    categorie: form.categorie.value,
    montant: Number(form.montant.value),
    etablissement: form.etablissement.value.trim() || null,
    finance: form.finance.value.trim() ? Number(form.finance.value) : null,
    exclu: form.exclu.checked || null,
  };

  const url = editingId != null ? `/api/patrimoine/${editingId}` : "/api/patrimoine";
  const method = editingId != null ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    dialogError.textContent = err.detail || "Erreur lors de l'enregistrement.";
    return;
  }

  dialog.close();
  await refresh();
});

// --- Thème ---

const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
}

applyTheme(localStorage.getItem("fibb-theme") || "dark");

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("fibb-theme", next);
  applyTheme(next);
});

refresh();
