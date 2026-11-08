const contacts = document.querySelector('.contact-dialog');
let lastTrigger;

document.querySelectorAll('[data-contacts]').forEach(button => {
  button.addEventListener('click', () => {
    lastTrigger = button;
    contacts.showModal();
  });
});

document.querySelector('.close-dialog').addEventListener('click', () => contacts.close());
contacts.addEventListener('click', event => {
  if (event.target !== contacts) return;
  const bounds = contacts.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) contacts.close();
});
contacts.addEventListener('close', () => lastTrigger?.focus());
