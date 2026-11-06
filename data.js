export const defaultCategories = [
  { id: 'wet', name: 'Nassfutter' },
  { id: 'dry', name: 'Trockenfutter' },
  { id: 'snack', name: 'Snacks' },
  { id: 'paste', name: 'Schleckpaste' },
];

export const presetFoods = [
  { id: 'dry-chicken', name: 'Trockenfutter Huhn', categoryId: 'dry', unit: 'g', cal: 393.3 },
  { id: 'dry-fish', name: 'Trockenfutter Fisch', categoryId: 'dry', unit: 'g', cal: 402 },
  { id: 'wet-duck', name: 'Ente pur', categoryId: 'wet', unit: 'g', cal: 120.21 },
  { id: 'wet-chicken-rabbit', name: 'Huhn mit Kaninchen', categoryId: 'wet', unit: 'g', cal: 115.79 },
  { id: 'wet-chicken', name: 'Huhn pur', categoryId: 'wet', unit: 'g', cal: 115.79 },
  { id: 'wet-beef', name: 'Rind pur', categoryId: 'wet', unit: 'g', cal: 159.91 },
  { id: 'wet-boar', name: 'Wildschwein pur', categoryId: 'wet', unit: 'g', cal: 125.30 },
  { id: 'lick-paste', name: 'Schleckpaste', categoryId: 'paste', unit: 'g', cal: 49 },
  { id: 'dreamies', name: 'Dreamies', categoryId: 'snack', unit: 'piece', cal: 2 },
];

// Add the supplied foods once without changing existing foods or the current ration.
export function addPresetFoods(state) {
  if (state.foodDataRevision === 1) return false;
  for (const category of defaultCategories) {
    if (!state.categories.some(entry => entry.id === category.id)) state.categories.push({ ...category });
  }
  for (const food of presetFoods) {
    const exists = state.foods.some(entry => entry.name === food.name && entry.categoryId === food.categoryId && entry.unit === food.unit);
    if (exists) continue;
    const entry = { ...food };
    if (state.foods.some(existing => existing.id === entry.id)) entry.id = crypto.randomUUID();
    state.foods.push(entry);
  }
  state.foodDataRevision = 1;
  return true;
}

export function defaults() {
  return {
    version: 2,
    foodDataRevision: 1,
    budget: 300,
    categories: structuredClone(defaultCategories),
    foods: structuredClone(presetFoods),
    items: [
      { id: 'a', foodId: 'wet-duck', qty: 85 },
      { id: 'b', foodId: 'dry-chicken', qty: 0 },
      { id: 'c', foodId: 'dreamies', qty: 2 },
      { id: 'p', foodId: 'lick-paste', qty: 0 },
    ],
    auto: 'b',
  };
}
