const hideAlert = () => {
  const el = document.querySelector('.alert');

  // Wenn el existiert springen ein hoch in das parentelement und löschen von dort aus das Child!
  if (el) el.parentElement.removeChild(el);
};

// type is 'success' or 'error'
export const showAlert = (type, msg) => {
  // immer erst vorhandene Alerts löschen
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);

  // Lösche den Alert nach 5000ms wieder!
  window.setTimeout(hideAlert, 5000);
};
