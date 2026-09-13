(() => {
  const params = new URLSearchParams(location.search);
  const isAdmin = params.get('view') === 'admin';
  const nativeFetch = window.fetch.bind(window);
  let adminPin = sessionStorage.getItem('varkAdminPin') || '';
  let pendingPrompt = null;

  function escText(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function askForPin(message = '') {
    if (pendingPrompt) return pendingPrompt;
    pendingPrompt = new Promise(resolve => {
      document.querySelector('#adminAuthOverlay')?.remove();
      const overlay = document.createElement('div');
      overlay.id = 'adminAuthOverlay';
      overlay.className = 'auth-overlay';
      overlay.innerHTML = `<form class="auth-card" id="adminAuthForm">
        <div class="auth-brand"><span class="mark">V</span><div><b>لوحة المعلمة</b><small>وصول محمي إلى النتائج والتقارير</small></div></div>
        <span class="auth-kicker">دخول آمن</span>
        <h1>رمز دخول المعلمة</h1>
        <p>أدخلي الرمز المخصص للوحة الإدارة. لا يظهر الرمز في الرابط ولا يُحفظ بعد إغلاق علامة التبويب.</p>
        ${message ? `<div class="auth-error">${escText(message)}</div>` : ''}
        <label>رمز الدخول<input id="adminAuthPin" type="password" autocomplete="current-password" spellcheck="false" placeholder="••••••••••••"></label>
        <button class="primary wide" type="submit">دخول لوحة النتائج</button>
        <a href="/" class="auth-back">العودة إلى صفحة الطالبات</a>
      </form>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#adminAuthPin');
      if (adminPin) input.value = adminPin;
      setTimeout(() => input.focus(), 0);
      overlay.querySelector('#adminAuthForm').addEventListener('submit', event => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) {
          input.focus();
          return;
        }
        overlay.remove();
        resolve(value);
      });
    }).finally(() => {
      pendingPrompt = null;
    });
    return pendingPrompt;
  }

  if (isAdmin) {
    window.fetch = async (input, init = {}) => {
      const requestUrl = typeof input === 'string' ? input : input?.url || '';
      const sameOriginAdminApi = requestUrl.startsWith('/api/admin/') || requestUrl.startsWith(`${location.origin}/api/admin/`);
      if (!sameOriginAdminApi) return nativeFetch(input, init);

      for (let attempt = 0; attempt < 2; attempt++) {
        if (!adminPin) adminPin = await askForPin(attempt ? 'رمز الدخول غير صحيح. حاولي مرة أخرى.' : '');
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        headers.set('x-admin-pin', adminPin);
        const response = await nativeFetch(input, { ...init, headers });
        if (response.status !== 401) {
          if (response.ok) sessionStorage.setItem('varkAdminPin', adminPin);
          return response;
        }
        sessionStorage.removeItem('varkAdminPin');
        adminPin = '';
      }

      return new Response(JSON.stringify({ error: 'تعذر التحقق من رمز دخول المعلمة.' }), {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    };
  }

  function polishStudent() {
    if (isAdmin) return;
    const brandSmall = document.querySelector('.brand-button small');
    if (brandSmall && /VARK/i.test(brandSmall.textContent || '')) brandSmall.textContent = 'Learning Preferences Profile';
    const brain = document.querySelector('.brain-icon');
    if (brain && brain.textContent !== 'V · A · R · K') brain.textContent = 'V · A · R · K';
    const shell = document.querySelector('.student-shell');
    if (shell && !shell.querySelector('.student-runtime-footer')) {
      const footer = document.createElement('footer');
      footer.className = 'student-runtime-footer';
      footer.textContent = 'أداة مدرسية إرشادية لتفضيلات التعلّم، وليست تشخيصًا أو تصنيفًا ثابتًا للقدرات.';
      shell.appendChild(footer);
    }
  }

  function polishAdmin() {
    if (!isAdmin) return;
    const top = document.querySelector('.admin-top');
    if (!top || top.querySelector('#adminLogout')) return;
    const actions = document.createElement('div');
    actions.className = 'runtime-admin-actions';
    const syncText = [...top.children].find(el => el.tagName === 'SMALL');
    if (syncText) actions.appendChild(syncText);
    const logout = document.createElement('button');
    logout.id = 'adminLogout';
    logout.className = 'runtime-logout';
    logout.type = 'button';
    logout.textContent = 'تسجيل الخروج';
    logout.addEventListener('click', () => {
      sessionStorage.removeItem('varkAdminPin');
      adminPin = '';
      location.reload();
    });
    actions.appendChild(logout);
    top.appendChild(actions);
  }

  const observer = new MutationObserver(() => {
    polishStudent();
    polishAdmin();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => {
    polishStudent();
    polishAdmin();
  });
})();
