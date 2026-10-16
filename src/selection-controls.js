// On small screens, selection is an optional sheet rather than two permanent overlays.
export function createSelectionControls(getContext, onClose, onShowDetails, onOpen = () => {}) {
  const $ = selector => document.querySelector(selector);
  const compact = matchMedia('(max-width: 900px)');
  const panel = $('#selection-panel'), toggle = $('#selection-toggle');
  let open = false;

  function sync() {
    const {mode, floor, apt} = getContext();
    $('#selection-label').textContent = apt ? `Этаж ${floor} · № ${apt.number}` : mode === 'floor' ? `Этаж ${floor} · выбрать квартиру` : 'Выбрать квартиру';
    toggle.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    for (const button of panel.querySelectorAll('[data-selection-view]')) {
      button.setAttribute('aria-pressed', String(button.dataset.selectionView === panel.dataset.view));
    }
  }
  function close(restoreFocus = false) {
    const wasOpen = open;
    open = false;
    if (wasOpen) onClose();
    sync();
    if (wasOpen && restoreFocus && compact.matches) toggle.focus({preventScroll:true});
    return wasOpen && compact.matches;
  }
  function show(view) {
    if (!compact.matches) return;
    onOpen();
    panel.dataset.view = view;
    open = true;
    sync();
    if (view === 'apartments') onShowDetails();
  }
  toggle.onclick = () => open ? close() : show(getContext().mode === 'floor' ? 'apartments' : 'floors');
  $('#selection-close').onclick = () => close(true);
  panel.querySelector('.selection-views').onclick = event => {
    const button = event.target.closest('[data-selection-view]');
    if (button) show(button.dataset.selectionView);
  };
  compact.addEventListener('change', () => close());
  document.addEventListener('pointerdown', event => {
    if (compact.matches && open && !panel.contains(event.target) && !toggle.contains(event.target) && !$('#stage').contains(event.target)) close();
  });
  sync();
  return {sync, close, showDetails:() => show('apartments'), dismissFromCanvas:() => compact.matches && open ? close() : false};
}
