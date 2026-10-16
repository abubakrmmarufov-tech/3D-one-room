// Keep accent materials in step with optional maps loaded after a room opens.
const variants = new WeakMap();
const channels = ['map', 'normalMap', 'roughnessMap'];

export function materialVariant(source, parameters) {
  const material = source.clone();
  material.setValues(parameters);
  if (!variants.has(source)) variants.set(source, new Set());
  variants.get(source).add(material);
  return material;
}

export function refreshMaterialVariants(source) {
  for (const material of variants.get(source) ?? []) {
    for (const channel of channels) material[channel] = source[channel];
    material.needsUpdate = true;
  }
}
