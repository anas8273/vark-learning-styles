(() => {
  const params = new URLSearchParams(location.search);
  const isAdmin = params.get('view') === 'admin';
  function polishStudent() {
    if (isAdmin) return;
    const brandTitle = document.querySelector('.brand-button b');
    if (brandTitle) brandTitle.textContent = 'اختبار أنماط التعلّم';
    const brandSmall = document.querySelector('.brand-button small');
    if (brandSmall && /VARK/i.test(brandSmall.textContent || '')) brandSmall.textContent = 'VARK Learning Profile';
    const brain = document.querySelector('.brain-icon');
    if (brain && brain.textContent !== 'V · A · R · K') brain.textContent = 'V · A · R · K';
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
