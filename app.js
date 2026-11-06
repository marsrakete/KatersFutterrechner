import { defaults, addPresetFoods } from './data.js';
import { text } from './texts.js';
import { appearance } from './presentation.js';
import { setupUpdates } from './updates.js';
import { calculate } from './calculation.js';
import { openDatabase, readState, writeState, migrate } from './storage.js';

const $ = id => document.getElementById(id);
const format = value => value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
  const remaining = state.budget - total;
  $('balance').textContent = format(Math.abs(remaining));
  $('balance-label').textContent = remaining < -0.001 ? text.overBudget : text.available;
  $('balance').classList.toggle('over', remaining < -0.001);
  $('target-check').hidden = Math.abs(remaining) >= 0.1;
  $('progress').replaceChildren();
  $('legend').replaceChildren();
  const denominator = Math.max(state.budget, total);
  for (const category of state.categories) {
    const categoryTotal = lines.filter(line => line.food.categoryId === category.id).reduce((sum, line) => sum + line.kcal, 0);
    const headingTotal = document.getElementById(`category-total-${category.id}`);
    if (headingTotal) headingTotal.textContent = `${format(categoryTotal)} kcal`;
    if (categoryTotal <= 0) continue;
    const color = appearance(category.id).color;
    const segment = element('span');
    segment.style.width = `${categoryTotal / denominator * 100}%`;
    segment.style.backgroundColor = color;
    $('progress').append(segment);
    const entry = element('span', undefined, 'legend-entry');
    const dot = element('span', undefined, 'legend-dot');
    dot.style.backgroundColor = color;
    entry.append(dot, document.createTextNode(`${category.name}: ${format(categoryTotal)} kcal (${format(categoryTotal / Math.max(total, 1) * 100)} %)`));
    $('legend').append(entry);
  }
  $('progress').setAttribute('aria-label', text.rationTotal(format(total)));
  for (const line of lines) {
    const row = document.getElementById(`item-${line.item.id}`);
    if (!row) continue;
    row.querySelector('.calories').textContent = `${format(line.kcal)} kcal`;
    if (line.item.id === state.auto) row.querySelector('.quantity').value = line.qty;
  }
}

function selectAutomatic(id) {
  // Preserve the calculated amount when switching a position back to manual.
  for (const line of calculate(state).lines) line.item.qty = line.qty;
  state.auto = id;
  commit();
}

function renderItems() {
  const auto = $('auto');
  auto.replaceChildren();
  const { lines } = calculate(state);
  const container = $('items');
  container.replaceChildren();
  function autoOption(id, label) {
    const radio = element('input');
    radio.type = 'radio';
    radio.name = 'automatic-item';
    radio.value = id;
    radio.checked = state.auto === id;
    radio.addEventListener('change', () => selectAutomatic(id));
    const choice = element('label', undefined, 'radio-option');
    choice.append(radio, document.createTextNode(label));
    auto.append(choice);
  }
  if (!lines.length) container.append(element('p', text.empty));
  for (const category of state.categories) {
    const categoryLines = lines.filter(line => line.food.categoryId === category.id);
    if (!categoryLines.length) continue;
    const group = element('section', undefined, 'food-group');
    const heading = element('div', undefined, 'group-heading');
    const title = element('h2');
    const icon = element('span', appearance(category.id).icon, 'category-icon');
    icon.setAttribute('aria-hidden', 'true');
    title.append(icon, document.createTextNode(category.name));
    const subtotal = element('strong', '', 'group-total');
    subtotal.id = `category-total-${category.id}`;
    heading.append(title, subtotal);
    group.append(heading);
    for (const line of categoryLines) {
      const label = categoryLines.length > 1 ? `${category.name} · ${line.food.name}` : category.name;
      autoOption(line.item.id, label);
      const row = element('div', undefined, 'item');
      row.id = `item-${line.item.id}`;
      const fields = element('div', undefined, 'item-fields');
      const foodSelect = element('select');
      for (const foodCategory of state.categories) {
        const foods = state.foods.filter(food => food.categoryId === foodCategory.id);
        if (!foods.length) continue;
        const group = element('optgroup');
        group.label = foodCategory.name;
        for (const food of foods) option(group, food.id, text.foodOption(foodCategory.name, food.name));
        foodSelect.append(group);
      }
      foodSelect.value = line.food.id;
      foodSelect.addEventListener('change', () => {
        line.item.foodId = foodSelect.value;
        line.item.qty = 0;
        commit();
      });
      const foodField = field(text.variety, foodSelect);
      foodField.append(element('small', text.foodEnergy(formatCalories(line.food.cal), unitText(line.food)), 'food-energy'));
      fields.append(foodField);
      const qty = element('input', undefined, 'quantity');
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
      const amountField = element('label', undefined, 'amount-field');
      const caption = element('span', undefined, 'quantity-caption');
      caption.append(element('span', line.food.unit === 'g' ? text.quantityGrams : text.quantityPieces));
      if (qty.disabled) caption.append(element('span', text.automaticBadge, 'auto-badge'));
      amountField.append(caption);
      if (line.food.unit === 'piece') {
        const stepper = element('span', undefined, 'stepper');
        function adjust(delta) {
          line.item.qty = Math.max(0, line.item.qty + delta);
          qty.value = line.item.qty;
          save();
          refreshTotals();
        }
        const minus = button('−', () => adjust(-1));
        const plus = button('+', () => adjust(1));
        minus.setAttribute('aria-label', text.reduce);
        plus.setAttribute('aria-label', text.increase);
        minus.disabled = qty.disabled;
        plus.disabled = qty.disabled;
        stepper.append(minus, qty, plus);
        amountField.append(stepper);
      } else amountField.append(qty);
      const meta = element('div', undefined, 'item-meta');
      meta.append(button(text.remove, () => {
        state.items = state.items.filter(item => item.id !== line.item.id);
        if (state.auto === line.item.id) state.auto = '';
        commit();
      }), element('span', '', 'calories'));
      row.append(fields, amountField, meta);
      group.append(row);
    }
    container.append(group);
  }
  autoOption('', text.manual);
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
  for (const [id, delta] of [['budget-minus', -10], ['budget-plus', 10]]) {
    $(id).addEventListener('click', () => {
      state.budget = Math.max(1, state.budget + delta);
      $('budget').value = state.budget;
      save();
      refreshTotals();
    });
  }
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
      if (legacy) notice(text.migrated);
    }
    bindEvents();
    render();
  } catch {
    notice(text.loadError);
    for (const input of document.querySelectorAll('button,input,select')) input.disabled = true;
  }
  await setupUpdates(async () => {
    if (!database || !state) throw Error('database unavailable');
    await saveQueue;
    await writeState(database, state);
  });
}
start();
