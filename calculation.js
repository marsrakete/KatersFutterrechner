export function calculate(state) {
  const foods = new Map(state.foods.map(food => [food.id, food]));
  const factor = food => food.unit === 'piece' ? food.cal : food.cal / 100;
  const fixed = state.items.reduce((sum, item) => {
    if (item.id === state.auto) return sum;
    return sum + item.qty * factor(foods.get(item.foodId));
  }, 0);
  const lines = state.items.map(item => {
    const food = foods.get(item.foodId);
    let qty = item.qty;
    if (item.id === state.auto) {
      const raw = Math.max(0, state.budget - fixed) / factor(food);
      const precision = food.unit === 'piece' ? 1 : 10;
      qty = Math.floor(raw * precision + 1e-9) / precision;
    }
    return { item, food, qty, kcal: qty * factor(food) };
  });
  return { lines, total: lines.reduce((sum, line) => sum + line.kcal, 0) };
}
