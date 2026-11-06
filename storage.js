import { defaultCategories } from './data.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validName = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 120;

export function validate(data) {
  if (!data || data.version !== 2 || !finite(data.budget) || data.budget <= 0) throw Error('invalid');
  for (const key of ['categories', 'foods', 'items']) {
    if (!Array.isArray(data[key]) || data[key].length > 1000) throw Error('invalid');
    const ids = data[key].map(entry => entry?.id);
    if (ids.some(id => !validName(id)) || new Set(ids).size !== ids.length) throw Error('invalid');
  }
  if (!data.categories.every(category => validName(category.name))) throw Error('invalid');
  const categoryIds = new Set(data.categories.map(category => category.id));
  if (!data.foods.every(food => validName(food.name) && categoryIds.has(food.categoryId) && ['g', 'piece'].includes(food.unit) && finite(food.cal) && food.cal > 0)) throw Error('invalid');
  const foodIds = new Set(data.foods.map(food => food.id));
  if (!data.items.every(item => foodIds.has(item.foodId) && finite(item.qty) && item.qty >= 0 && (data.foods.find(food => food.id === item.foodId).unit !== 'piece' || Number.isInteger(item.qty)))) throw Error('invalid');
  if (typeof data.auto !== 'string' || (data.auto && !data.items.some(item => item.id === data.auto))) throw Error('invalid');
  return data;
}

export function migrate(data) {
  if (data?.version === 2) return validate(data);
  if (!data || !Array.isArray(data.foods)) throw Error('invalid');
  return validate({
    version: 2, budget: data.budget, categories: structuredClone(defaultCategories),
    foods: data.foods.map(food => ({ id: food.id, name: food.name, categoryId: food.type, unit: food.type === 'snack' ? 'piece' : 'g', cal: food.cal })),
    items: data.items, auto: data.auto,
  });
}

export async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('katers-futterrechner', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('blocked'));
  });
}

export function readState(database) {
  return new Promise((resolve, reject) => {
    const request = database.transaction('state').objectStore('state').get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function writeState(database, state) {
  validate(state);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('state', 'readwrite');
    transaction.objectStore('state').put(structuredClone(state), 'current');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
