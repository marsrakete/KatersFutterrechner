import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, addPresetFoods, presetFoods } from './data.js';
import { calculate } from './calculation.js';
import { migrate, validate } from './storage.js';

test('85 g Ente pur und zwei Dreamies lassen 49,2 g Trockenfutter Huhn übrig', () => {
  const result = calculate(defaults());
  assert.ok(Math.abs(result.total - 299.6821) < 1e-8);
  assert.equal(result.lines[1].qty, 49.2);
});
test('manuelle Überschreitung erzeugt keine negative automatische Menge', () => {
  const state = defaults();
  state.items[0].qty = 300;
  const result = calculate(state);
  assert.equal(result.lines[1].qty, 0);
  assert.ok(Math.abs(result.total - 364.63) < 1e-8);
});
test('automatische Snacks sind ganzzahlig und überschreiten das Budget nicht', () => {
  const state = defaults();
  state.auto = 'c';
  state.items[1].qty = 49;
  const result = calculate(state);
  assert.equal(result.lines[2].qty, 2);
  assert.ok(result.total < 300);
});
test('freie Kategorien und Einheiten funktionieren unabhängig voneinander', () => {
  const state = defaults();
  state.foods.push({ id: 'p', name: 'Paste', categoryId: 'paste', unit: 'g', cal: 200 });
  state.items.push({ id: 'paste-item', foodId: 'p', qty: 10 });
  validate(state);
  const result = calculate(state);
  assert.equal(result.lines[4].kcal, 20);
  assert.ok(result.total <= 300);
});

test('Schleckpaste und Dreamies werden getrennt nach Gramm und Stück berechnet', () => {
  const state = defaults();
  state.items[3].qty = 15;
  const result = calculate(state);
  assert.equal(result.lines[2].kcal, 4);
  assert.equal(result.lines[3].kcal, 7.35);
  assert.ok(result.total <= 300);
  assert.equal(state.foods.length, 9);
});

test('Daten-Ergänzung erhält vorhandene Werte und Ration und läuft nur einmal', () => {
  const state = defaults();
  delete state.foodDataRevision;
  state.foods[0].cal = 390;
  state.foods = state.foods.slice(0, 1);
  state.items = [];
  state.auto = '';
  assert.equal(addPresetFoods(state), true);
  assert.equal(state.foods[0].cal, 390);
  assert.equal(state.foods.length, presetFoods.length);
  assert.deepEqual(state.items, []);
  state.foods.pop();
  assert.equal(addPresetFoods(state), false);
  assert.equal(state.foods.length, 8);
  validate(state);
});
test('alte Backups werden einschließlich Kategorien übernommen', () => {
  const state = migrate({ budget: 300, foods: [{ id: 's', name: 'Snack', type: 'snack', cal: 4 }], items: [{ id: 'i', foodId: 's', qty: 2 }], auto: '' });
  assert.equal(state.foods[0].unit, 'piece');
  assert.ok(state.categories.some(category => category.id === 'paste'));
});
test('ungültige Sicherungen werden abgewiesen', () => {
  for (const mutate of [
    state => { state.budget = 0; },
    state => { state.foods[0].cal = Infinity; },
    state => { state.items[0].foodId = 'missing'; },
    state => { state.categories.push(state.categories[0]); },
    state => { state.auto = 'missing'; },
    state => { state.items[2].qty = 0.5; },
  ]) {
    const state = defaults();
    mutate(state);
    assert.throws(() => validate(state));
  }
});
