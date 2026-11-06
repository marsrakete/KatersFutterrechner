export const categoryAppearance = {
  wet: { icon: '🥫', color: '#d9a05d' },
  dry: { icon: '🥣', color: '#6797c4' },
  snack: { icon: '🦴', color: '#94b962' },
  paste: { icon: '◈', color: '#af8acb' },
};
export function appearance(id) {
  return categoryAppearance[id] || { icon: '◇', color: '#8a839a' };
}
