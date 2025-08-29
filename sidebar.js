(function () {
  const sidebar  = document.getElementById('sidebar');
  const toggle   = document.getElementById('sidebarToggle');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (!sidebar || !toggle || !backdrop) return;

  const open = () => {
    sidebar.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
    // lock body scroll while the drawer is open
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    sidebar.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('active');
    isOpen ? close() : open();
  });

  backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Ensure correct state on resize (desktop = open, mobile = closed)
  const syncWithViewport = () => {
    if (window.matchMedia('(max-width: 1024px)').matches) {
      close();
    } else {
      sidebar.classList.remove('active'); // active class not needed on desktop
      backdrop.hidden = true;
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  };
  window.addEventListener('resize', syncWithViewport);
  syncWithViewport();
})();
