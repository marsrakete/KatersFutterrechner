import { defaults, addPresetFoods } from './data.js';
import { text } from './texts.js';
import { calculate } from './calculation.js';
import { openDatabase, readState, writeState, migrate } from './storage.js';

const $ = id => document.getElementById(id);
const format = value => value.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const formatCalories = value => value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
const unitText = food => food.unit === 'g' ? '100 g' : 'Stück';
let state;
let database;
let editingId = '';
let saveQueue = Promise.resolve();
let installPrompt;

function notice(message) { $('notice').textContent = message; }
function element(tag, label, className) {
  const node = document.createElement(tag);
  if (label !== undefined) node.textContent = label;
  if (className) node.className = className;
  return node;
}
function option(select, value, label) {
  const node = element('option', label);
  node.value = value;
  select.append(node);
}
function button(label, handler, secondary = true) {
  const node = element('button', label, secondary ? 'secondary' : '');
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}
function field(label, control) {
  const node = element('label', label);
  node.append(control);
  return node;
}
function save() {
  const snapshot = structuredClone(state);
  saveQueue = saveQueue.then(() => writeState(database, snapshot)).catch(() => notice(text.storageError));
}
function commit() { save(); render(); }

function refreshTotals() {
  const { lines, total } = calculate(state);
  $('total').textContent = format(total);
  $('progress').max = state.budget;
  $('progress').value = Math.min(total, state.budget);
  const remaining = state.budget - total;
  $('balance').textContent = remaining < -0.001 ? text.exceeded(format(-remaining)) : text.remaining(format(Math.max(0, remaining)));
  $('balance').classList.toggle('over', remaining < -0.001);
  for (const line of lines) {
    const row = document.getElementById(`item-${line.item.id}`);
    if (!row) continue;
    row.querySelector('.calories').textContent = `${format(line.kcal)} kcal`;
    if (line.item.id === state.auto) row.querySelector('input').value = line.qty;
  }
}

function renderItems() {
  const select = $('auto');
  select.replaceChildren();
  option(select, '', text.manual);
  const { lines } = calculate(state);
  const container = $('items');
  container.replaceChildren();
  if (!lines.length) container.append(element('p', text.empty));
  lines.forEach((line, index) => {
    option(select, line.item.id, `${line.food.name} (${index + 1})`);
    const row = element('div', undefined, 'item');
    row.id = `item-${line.item.id}`;
    const fields = element('div', undefined, 'item-fields');
    const foodSelect = element('select');
    for (const food of state.foods) option(foodSelect, food.id, `${food.name} · ${formatCalories(food.cal)} kcal/${unitText(food)}`);
    foodSelect.value = line.food.id;
    foodSelect.addEventListener('change', () => {
      line.item.foodId = foodSelect.value;
      line.item.qty = 0;
      commit();
    });
    const qty = element('input');
    qty.type = 'number';
    qty.min = '0';
    qty.step = line.food.unit === 'piece' ? '1' : '0.1';
    qty.required = true;
    qty.value = line.qty;
    qty.disabled = line.item.id === state.auto;
    qty.addEventListener('input', () => {
      if (!qty.checkValidity() || !Number.isFinite(qty.valueAsNumber)) return;
      line.item.qty = qty.valueAsNumber;
      save();
      refreshTotals();
    });
    qty.addEventListener('change', () => { qty.value = line.item.qty; });
    fields.append(field(text.food, foodSelect), field(line.food.unit === 'g' ? text.grams : text.pieces, qty), button(text.remove, () => {
      state.items = state.items.filter(item => item.id !== line.item.id);
      if (state.auto === line.item.id) state.auto = '';
      commit();
    }));
    const meta = element('div', undefined, 'item-meta');
    meta.append(element('span', qty.disabled ? text.automatic : text.manualQuantity), element('strong', '', 'calories'));
    row.append(fields, meta);
    container.append(row);
  });
  select.value = state.auto;
}

function cancelEdit() {
  editingId = '';
  $('food-form').reset();
  $('save-food').textContent = text.save;
  $('cancel-edit').hidden = true;
}

function renderFoods() {
  $('foods').replaceChildren();
  for (const food of state.foods) {
    const row = element('div', undefined, 'food-row');
    const description = element('div');
    const category = state.categories.find(entry => entry.id === food.categoryId);
    description.append(element('strong', food.name), element('small', `${category.name} · ${formatCalories(food.cal)} kcal/${unitText(food)}`));
    const actions = element('div', undefined, 'actions');
    actions.append(button(text.edit, () => {
      editingId = food.id;
      $('food-name').value = food.name;
      $('food-category').value = food.categoryId;
      $('food-unit').value = food.unit;
      $('food-cal').value = food.cal;
      $('save-food').textContent = text.update;
      $('cancel-edit').hidden = false;
      $('food-name').focus();
    }), button(text.delete, () => {
      if (state.items.some(item => item.foodId === food.id)) return notice(text.foodUsed);
      if (!confirm(text.deleteConfirm)) return;
      state.foods = state.foods.filter(entry => entry.id !== food.id);
      if (editingId === food.id) cancelEdit();
      commit();
    }));
    row.append(description, actions);
    $('foods').append(row);
  }
}

function renderCategories() {
  const previous = $('food-category').value;
  $('food-category').replaceChildren();
  $('categories').replaceChildren();
  for (const category of state.categories) {
    option($('food-category'), category.id, category.name);
    const chip = element('div', undefined, 'chip');
    const remove = button('×', () => {
      if (state.foods.some(food => food.categoryId === category.id)) return notice(text.categoryUsed);
      if (!confirm(text.deleteConfirm)) return;
      state.categories = state.categories.filter(entry => entry.id !== category.id);
      commit();
    });
    remove.setAttribute('aria-label', `${category.name}: ${text.delete}`);
    chip.append(element('span', category.name), remove);
    $('categories').append(chip);
  }
  if (state.categories.some(category => category.id === previous)) $('food-category').value = previous;
}

function render() {
  $('budget').value = state.budget;
  renderCategories();
  renderItems();
  renderFoods();
  refreshTotals();
}

function bindEvents() {
  $('budget').addEventListener('change', event => {
    const input = event.target;
    if (!input.checkValidity() || !Number.isFinite(input.valueAsNumber)) {
      input.reportValidity();
      input.value = state.budget;
      return;
    }
    state.budget = input.valueAsNumber;
    save();
    refreshTotals();
  });
  $('auto').addEventListener('change', event => {
    // Preserve the current automatic amount when switching it to manual.
    for (const line of calculate(state).lines) line.item.qty = line.qty;
    state.auto = event.target.value;
    commit();
  });
  $('add-item').addEventListener('click', () => {
    if (!state.foods.length) return notice(text.noFoods);
    state.items.push({ id: crypto.randomUUID(), foodId: state.foods[0].id, qty: 0 });
    commit();
  });
  $('clear').addEventListener('click', () => {
    if (!confirm(text.clearConfirm)) return;
    state.items = [];
    state.auto = '';
    commit();
  });
  $('cancel-edit').addEventListener('click', cancelEdit);
  $('food-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('food-name').value.trim();
    if (!name || !$('food-category').value) return notice(text.invalid);
    const food = { id: editingId || crypto.randomUUID(), name, categoryId: $('food-category').value, unit: $('food-unit').value, cal: $('food-cal').valueAsNumber };
    const existing = state.foods.find(entry => entry.id === editingId);
    if (existing) Object.assign(existing, food);
    else state.foods.push(food);
    if (food.unit === 'piece') {
      for (const item of state.items.filter(entry => entry.foodId === food.id)) item.qty = Math.floor(item.qty);
    }
    cancelEdit();
    commit();
  });
  $('category-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('category-name').value.trim();
    if (!name) return notice(text.invalid);
    if (state.categories.some(category => category.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'))) return notice(text.categoryDuplicate);
    const category = { id: crypto.randomUUID(), name };
    state.categories.push(category);
    $('category-form').reset();
    commit();
    $('food-category').value = category.id;
  });
  $('export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const link = element('a');
    link.href = url;
    link.download = 'katers-futterrechner-backup.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw Error('invalid');
      const imported = migrate(JSON.parse(await file.text()));
      if (!confirm(text.importConfirm)) return;
      await saveQueue;
      await writeState(database, imported);
      state = imported;
      cancelEdit();
      render();
      notice(text.imported);
    } catch { notice(text.invalid); }
    finally { event.target.value = ''; }
  });
  $('copy').addEventListener('click', async () => {
    const { lines, total } = calculate(state);
    const output = [text.rationTitle(format(state.budget)), ...lines.map(line => `${line.food.name}: ${format(line.qty)} ${line.food.unit === 'g' ? 'g' : text.pieceUnit} = ${format(line.kcal)} kcal`), text.rationTotal(format(total))].join('\n');
    try { await navigator.clipboard.writeText(output); notice(text.copied); }
    catch { prompt(text.copyFallback, output); }
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  $('install').hidden = false;
});
$('install').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  $('install').hidden = true;
});
window.addEventListener('appinstalled', () => { $('install').hidden = true; });

async function start() {
  try {
    database = await openDatabase();
    database.onversionchange = () => database.close();
    const stored = await readState(database);
    if (stored !== undefined) {
      state = migrate(stored);
      if (addPresetFoods(state)) {
        await writeState(database, state);
        notice(text.foodsAdded);
      }
    }
    else {
      let legacy;
      try { legacy = localStorage.getItem('katers-futterrechner-v1'); } catch { /* IndexedDB remains usable without localStorage. */ }
      state = legacy ? migrate(JSON.parse(legacy)) : defaults();
      addPresetFoods(state);
      await writeState(database, state);
      notice(legacy ? text.migrated : text.example);
    }
    bindEvents();
    render();
  } catch {
    notice(text.loadError);
    for (const input of document.querySelectorAll('button,input,select')) input.disabled = true;
  }
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
    } catch { notice(text.offlineError); }
  }
}
start();
