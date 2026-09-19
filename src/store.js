const items = new Map();
let nextId = 1;

export function listItems() {
  return [...items.values()];
}

export function getItem(id) {
  return items.get(id) ?? null;
}

export function createItem(name) {
  const item = { id: String(nextId++), name };
  items.set(item.id, item);
  return item;
}

export function updateItem(id, name) {
  if (!items.has(id)) return null;
  const item = { id, name };
  items.set(id, item);
  return item;
}

export function deleteItem(id) {
  return items.delete(id);
}

export function reset() {
  items.clear();
  nextId = 1;
}
