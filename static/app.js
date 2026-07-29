let items = [];
let brutValue = 0;

const CATEGORY_LABELS = {
  investissements: "Investissements",
  epargne: "Épargne",
  emprunts: "Emprunts",
};

const CATEGORY_ORDER = ["investissements", "epargne", "emprunts"];
const ASSET_CATEGORIES = ["investissements", "epargne"];

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
  const assetTotal = items
    .filter((i) => ASSET_CATEGORIES.includes(i.categorie))
    .reduce((sum, i) => sum + i.montant, 0);
  const financeTotal = items
    .filter((i) => i.categorie === "emprunts" && !i.exclu)
    .reduce((sum, i) => sum + (i.finance || 0), 0);
  const net = assetTotal + financeTotal;

  document.getElementById("total-net").textContent = currency.format(net);
  document.getElementById("total-brut").textContent = currency.format(brutValue);

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
            <button class="delete-btn" data-id="${i.id}" type="button" title="Supprimer">✕</button>
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
  const [itemsData, brutData] = await Promise.all([
    fetch("/api/patrimoine").then((res) => res.json()),
    fetch("/api/brut").then((res) => res.json()),
  ]);
  items = itemsData;
  brutValue = brutData.brut;
  render();
}

document.getElementById("edit-brut").addEventListener("click", async () => {
  const value = prompt("Patrimoine brut :", brutValue);
  if (value === null) return;
  const brut = Number(value);
  if (Number.isNaN(brut)) return;

  const res = await fetch("/api/brut", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brut }),
  });
  if (!res.ok) {
    alert("Erreur lors de la mise à jour du patrimoine brut.");
    return;
  }
  await refresh();
});

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
  form.categorie.value = item ? item.categorie : "investissements";
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

// --- Import / export CSV ---

document.getElementById("export-csv").addEventListener("click", () => {
  window.location.href = "/api/patrimoine/export";
});

const importInput = document.getElementById("import-csv-input");

document.getElementById("import-csv").addEventListener("click", () => {
  importInput.click();
});

importInput.addEventListener("change", async () => {
  const file = importInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/patrimoine/import", { method: "POST", body: formData });
  importInput.value = "";

  if (!res.ok) {
    alert("Erreur lors de l'import du CSV.");
    return;
  }

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
