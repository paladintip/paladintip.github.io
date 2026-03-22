/**
 * nav.js — injects the unified site nav bar and profile management UI
 * into every page. Depends on profile-manager.js being loaded first.
 */
(function () {
  /* ── Tool definitions ─────────────────────────────────────────── */
  const TOOLS = [
    { file: 'index.html',               label: 'Home' },
    { file: 'piti.html',                label: 'Affordability' },
    { file: 'break-even.html',          label: 'Break Even' },
    { file: 'recast-calculator.html',   label: 'Recast' },
    { file: 'down-pay-v-rate-buy.html', label: 'Down Pay vs Rate' },
  ];

  /* ── Helpers ──────────────────────────────────────────────────── */

  function currentFile() {
    return location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  }

  function isCalcPage() {
    const f = currentFile();
    return f !== 'index.html' && f !== 'profile-edit.html';
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  }

  /* ── Toast notification ───────────────────────────────────────── */

  function showToast(msg) {
    const existing = document.querySelector('.profile-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'profile-toast';
    t.innerHTML = `<span class="toast-dot"></span>${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── Profile modal ────────────────────────────────────────────── */

  function createModal() {
    const overlay = document.createElement('div');
    overlay.className = 'profile-modal-overlay';
    overlay.id = 'profile-modal-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="profile-modal-box">
        <h3>Save Current State as Profile</h3>
        <p>Give this scenario a name so you can reload it on any tool page.</p>
        <input
          type="text"
          class="profile-modal-input"
          id="profile-name-input"
          placeholder="e.g. First-time buyer 7% rate"
          maxlength="60"
          autocomplete="off"
        />
        <div class="profile-modal-actions">
          <button class="btn-ghost" id="profile-modal-cancel">Cancel</button>
          <button class="btn-primary" id="profile-modal-save">Save Profile</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById('profile-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('profile-modal-save').addEventListener('click', doSave);
    document.getElementById('profile-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') doSave();
      if (e.key === 'Escape') closeModal();
    });
  }

  function openModal() {
    const overlay = document.getElementById('profile-modal-overlay');
    const input = document.getElementById('profile-name-input');
    overlay.hidden = false;
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }

  function closeModal() {
    document.getElementById('profile-modal-overlay').hidden = true;
  }

  function doSave() {
    const input = document.getElementById('profile-name-input');
    const name = input.value.trim();
    if (!name) {
      input.focus();
      input.style.borderColor = 'var(--red)';
      setTimeout(() => input.style.borderColor = '', 1000);
      return;
    }
    const PM = window.ProfileManager;
    const data = PM.extractProfileFromPage();
    const profile = Object.assign({}, data, {
      id: PM.generateId(),
      name,
      createdAt: new Date().toISOString(),
    });
    PM.saveProfile(profile);
    closeModal();
    refreshDropdown();
    showToast(`Profile "${name}" saved`);
  }

  /* ── Profile dropdown ─────────────────────────────────────────── */

  function renderDropdown() {
    const PM = window.ProfileManager;
    const profiles = PM.listProfiles();
    const count = profiles.length;
    const isCalc = isCalcPage();

    let html = `<div class="profile-dropdown-header">
      <span>Saved Profiles (${count})</span>`;

    if (isCalc) {
      html += `<button class="profile-save-btn" id="profile-save-trigger">+ Save current</button>`;
    }
    html += `</div>`;

    if (count === 0) {
      html += `<div class="profile-empty">
        No saved profiles yet.<br/>
        ${isCalc ? 'Fill in the form and click <strong>"+ Save current"</strong> to create one.' : 'Navigate to a calculator page to save a profile.'}
      </div>`;
    } else {
      html += `<div class="profile-list">`;
      profiles.forEach(p => {
        const price = p.homePrice ? `$${Math.round(p.homePrice).toLocaleString()}` : '';
        const rate  = p.rate      ? `${(+p.rate).toFixed(3)}%` : '';
        const meta  = [price, rate, fmtDate(p.createdAt)].filter(Boolean).join(' · ');
        html += `<div class="profile-item" data-id="${p.id}">
          <div class="profile-item-info">
            <div class="profile-item-name">${escHtml(p.name)}</div>
            <div class="profile-item-meta">${meta}</div>
          </div>
          ${isCalc ? `<button class="profile-load-btn" data-load="${p.id}">Load</button>` : ''}
          <a class="profile-edit-btn" href="profile-edit.html?id=${p.id}" title="Edit profile">✎</a>
          <button class="profile-delete-btn" data-del="${p.id}" title="Delete">✕</button>
        </div>`;
      });
      html += `</div>`;
    }

    return html;
  }

  function refreshDropdown() {
    const dd = document.getElementById('profile-dropdown');
    if (!dd) return;
    dd.innerHTML = renderDropdown();
    attachDropdownEvents();
    // Update profile count badge
    const btn = document.getElementById('profile-btn');
    const count = window.ProfileManager.listProfiles().length;
    const badge = btn.querySelector('.profile-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
  }

  function attachDropdownEvents() {
    const dd = document.getElementById('profile-dropdown');
    if (!dd) return;

    const saveTrigger = dd.querySelector('#profile-save-trigger');
    if (saveTrigger) {
      saveTrigger.addEventListener('click', () => {
        closeDropdown();
        openModal();
      });
    }

    dd.querySelectorAll('[data-load]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.load;
        const profile = window.ProfileManager.loadProfile(id);
        if (!profile) return;
        window.ProfileManager.applyProfileToPage(profile);
        closeDropdown();
        showToast(`Profile "${profile.name}" loaded`);
      });
    });

    dd.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.del;
        const profile = window.ProfileManager.loadProfile(id);
        if (!profile) return;
        if (!confirm(`Delete profile "${profile.name}"?`)) return;
        window.ProfileManager.deleteProfile(id);
        refreshDropdown();
      });
    });
  }

  function openDropdown() {
    const dd = document.getElementById('profile-dropdown');
    refreshDropdown();
    dd.hidden = false;
  }

  function closeDropdown() {
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.hidden = true;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Build nav HTML ───────────────────────────────────────────── */

  function buildNav() {
    const cur = currentFile();
    const profileCount = window.ProfileManager ? window.ProfileManager.listProfiles().length : 0;

    const links = TOOLS.map(t => {
      const active = (t.file === cur || (cur === '' && t.file === 'index.html'))
        ? ' active' : '';
      // Resolve relative URL — tools are all in the same directory
      return `<a href="${t.file}" class="nav-link${active}">${t.label}</a>`;
    }).join('');

    const nav = document.createElement('div');
    nav.className = 'site-nav';
    nav.innerHTML = `
      <div class="site-nav-inner">
        <a href="index.html" class="site-nav-brand">Paladin Tip</a>
        <div class="site-nav-links">${links}</div>
        <div class="site-nav-profile">
          <button class="profile-btn" id="profile-btn" aria-haspopup="true" aria-expanded="false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profiles
            <span class="profile-count" style="${profileCount === 0 ? 'display:none' : ''}">${profileCount}</span>
          </button>
          <div class="profile-dropdown" id="profile-dropdown" hidden></div>
        </div>
      </div>
    `;
    return nav;
  }

  /* ── Init ─────────────────────────────────────────────────────── */

  function init() {
    if (!window.ProfileManager) {
      console.warn('nav.js: ProfileManager not found — load profile-manager.js first');
    }

    // Inject nav
    const nav = buildNav();
    document.body.insertBefore(nav, document.body.firstChild);

    // Push body content below nav
    document.body.style.paddingTop = 'calc(var(--nav-height, 56px) + 24px)';

    // Create modal
    createModal();

    // Profile button toggle
    const profileBtn = document.getElementById('profile-btn');
    const profileDd  = document.getElementById('profile-dropdown');

    profileBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !profileDd.hidden;
      if (isOpen) {
        closeDropdown();
        profileBtn.setAttribute('aria-expanded', 'false');
      } else {
        openDropdown();
        profileBtn.setAttribute('aria-expanded', 'true');
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!profileDd.hidden && !profileDd.contains(e.target) && e.target !== profileBtn) {
        closeDropdown();
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeDropdown();
        closeModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
