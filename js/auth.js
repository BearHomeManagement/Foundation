// ============================================
// BearTrack Auth Module
// Login, logout, session checks, and auth UI
// ============================================

(() => {
  'use strict';

  let currentSession = null;

  async function checkSession() {
    try {
      currentSession = await window.BearTrackDB.getSession();

      if (currentSession) {
        showApp();
        dispatchAuth('signed-in', currentSession);
        return currentSession;
      }

      showLogin();
      dispatchAuth('signed-out', null);
      return null;
    } catch (error) {
      showLogin();
      showMessage(error.message || 'Unable to verify login session.');
      dispatchAuth('error', null, error);
      return null;
    }
  }

  async function login(email, password) {
    const cleanEmail = String(email || '').trim();

    if (!cleanEmail || !password) {
      throw new Error('Email and password are required.');
    }

    const result = await window.BearTrackDB.signIn(cleanEmail, password);
    currentSession = result.session || result.data?.session || null;

    showApp();
    clearMessage();
    dispatchAuth('signed-in', currentSession);

    return result;
  }

  async function logout() {
    await window.BearTrackDB.signOut();
    currentSession = null;
    dispatchAuth('signed-out', null);
    window.location.reload();
  }

  function bind() {
    const loginButton = document.getElementById('loginBtn');
    const logoutButton = document.getElementById('logoutBtn');

    if (loginButton && !loginButton.dataset.boundAuth) {
      loginButton.dataset.boundAuth = 'true';

      loginButton.addEventListener('click', async () => {
        try {
          const email =
            document.getElementById('loginEmail')?.value || '';
          const password =
            document.getElementById('loginPassword')?.value || '';

          setLoginBusy(true);
          await login(email, password);
        } catch (error) {
          showMessage(error.message || 'Unable to log in.');
        } finally {
          setLoginBusy(false);
        }
      });
    }

    if (logoutButton && !logoutButton.dataset.boundAuth) {
      logoutButton.dataset.boundAuth = 'true';

      logoutButton.addEventListener('click', async () => {
        try {
          await logout();
        } catch (error) {
          showMessage(error.message || 'Unable to log out.');
        }
      });
    }

    const passwordInput = document.getElementById('loginPassword');

    if (passwordInput && !passwordInput.dataset.boundAuthEnter) {
      passwordInput.dataset.boundAuthEnter = 'true';

      passwordInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          loginButton?.click();
        }
      });
    }
  }

  function showLogin() {
    document.getElementById('loginView')?.classList.remove('hidden');
    document.getElementById('appView')?.classList.add('hidden');
    document.getElementById('logoutBtn')?.classList.add('hidden');
    document.getElementById('refreshBtn')?.classList.add('hidden');
  }

  function showApp() {
    document.getElementById('loginView')?.classList.add('hidden');
    document.getElementById('appView')?.classList.remove('hidden');
    document.getElementById('logoutBtn')?.classList.remove('hidden');
    document.getElementById('refreshBtn')?.classList.remove('hidden');
  }

  function showMessage(message) {
    const target = document.getElementById('loginMsg');
    if (target) target.textContent = message;
  }

  function clearMessage() {
    const target = document.getElementById('loginMsg');
    if (target) target.textContent = '';
  }

  function setLoginBusy(isBusy) {
    const button = document.getElementById('loginBtn');
    if (!button) return;

    button.disabled = isBusy;
    button.textContent = isBusy ? 'Logging In…' : 'Log In';
  }

  function dispatchAuth(state, session, error = null) {
    document.dispatchEvent(new CustomEvent('beartrack:auth', {
      detail: { state, session, error }
    }));
  }

  function getSession() {
    return currentSession;
  }

  window.BearTrackAuth = {
    bind,
    checkSession,
    login,
    logout,
    showLogin,
    showApp,
    getSession
  };
})();

