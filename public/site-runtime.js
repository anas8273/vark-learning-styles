(() => {
  const params = new URLSearchParams(location.search);
  const isAdmin = params.get('view') === 'admin';
  const brainIconSvg = `<svg class="brain-circuit-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M9.5 3.8A3.3 3.3 0 0 0 6.3 7a3.6 3.6 0 0 0-1.8 6.7A4 4 0 0 0 8.8 19 3.6 3.6 0 0 0 12 17V6.8a3 3 0 0 0-2.5-3Z"/>
    <path d="M14.5 3.8A3.3 3.3 0 0 1 17.7 7a3.6 3.6 0 0 1 1.8 6.7A4 4 0 0 1 15.2 19 3.6 3.6 0 0 1 12 17V6.8a3 3 0 0 1 2.5-3Z"/>
    <path d="M6.8 9h2.4v2H12M17.2 9h-2.4v2H12M7.8 14H12m4.2 0H12"/>
    <circle cx="6" cy="9" r=".72"/><circle cx="18" cy="9" r=".72"/><circle cx="7" cy="14" r=".72"/><circle cx="17" cy="14" r=".72"/>
  </svg>`;

  function polishStudent() {
    if (isAdmin) return;
    const brandTitle = document.querySelector('.brand-button b');
    if (brandTitle) brandTitle.textContent = 'اختبار أنماط التعلّم';
    const brandSmall = document.querySelector('.brand-button small');
    if (brandSmall && /VARK/i.test(brandSmall.textContent || '')) brandSmall.textContent = 'VARK Learning Profile';
    const brain = document.querySelector('.brain-icon');
    if (brain && !brain.querySelector('.brain-circuit-icon')) brain.innerHTML = brainIconSvg;
    const shell = document.querySelector('.student-shell');
    if (shell && !shell.querySelector('.student-runtime-footer')) {
      const footer = document.createElement('footer');
      footer.className = 'student-runtime-footer';
      footer.textContent = 'اختبار مدرسي إرشادي لأنماط التعلّم، وليس تشخيصًا أو تصنيفًا ثابتًا للقدرات.';
      shell.appendChild(footer);
    }
  }

  document.addEventListener('DOMContentLoaded', polishStudent, { once: true });
})();
