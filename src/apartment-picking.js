// Shared by canvas hover and click, so both resolve the same apartment.
export function pickApartment(ray, pickables, state, matches) {
  if (state.mode === 'walk') return undefined;
  return ray.intersectObjects(pickables.filter(o => {
    const a = o.userData.apt;
    if (state.mode === 'floor' && (!a || a.tower !== state.tower || a.floor !== state.floor)) return false;
    return !a || matches(a);
  }), false)[0]?.object.userData;
}
