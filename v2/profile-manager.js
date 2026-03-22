/**
 * ProfileManager — shared profile storage and page-field mapping.
 *
 * Profile shape (all fields optional; undefined = not captured from current page):
 * {
 *   id:              string   — uuid-ish timestamp key
 *   name:            string   — user-chosen display name
 *   createdAt:       string   — ISO date string
 *   // Borrower
 *   income:          number   — gross monthly income $
 *   debts:           number   — monthly debt payments $
 *   savings:         number   — total savings $
 *   // Property / Loan
 *   homePrice:       number   — purchase price $
 *   rate:            number   — annual interest rate %
 *   loanType:        string   — 'conventional' | 'fha' | 'va' | 'usda'
 *   loanTermMonths:  number   — loan term in months (360, 180, 240, 84)
 *   downPct:         number   — down payment as % of price
 *   downAmt:         number   — down payment $
 *   taxRate:         number   — property tax %/yr
 *   insuranceAnnual: number   — home insurance $/yr
 *   hoa:             number   — HOA $/mo
 *   closingPct:      number   — closing cost % of price
 * }
 */
window.ProfileManager = (function () {
  const STORAGE_KEY = 'mortgage_profiles';

  /* ── Storage helpers ──────────────────────────────────────────── */

  function listProfiles() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  function saveProfile(profile) {
    const profiles = listProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn('ProfileManager: could not write to localStorage', e);
    }
    return profile;
  }

  function loadProfile(id) {
    return listProfiles().find(p => p.id === id) || null;
  }

  function deleteProfile(id) {
    const profiles = listProfiles().filter(p => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {}
  }

  function generateId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  /* ── Page detection ───────────────────────────────────────────── */

  function getCurrentPage() {
    const path = location.pathname.split('/').filter(Boolean).pop() || '';
    return path || 'index.html';
  }

  /* ── Field mapping ────────────────────────────────────────────── */
  /*
   * Each APPLY entry: { key, id, transform? }
   *   key       = profile property name
   *   id        = DOM element id on this page
   *   transform = optional fn(profileValue) → value to write to input
   *
   * Each EXTRACT entry: { key, id, transform? }
   *   key       = profile property name to write
   *   id        = DOM element id to read from
   *   transform = optional fn(rawInputValue) → profile value
   */

  const APPLY_MAPS = {
    'piti.html': [
      { key: 'homePrice',       id: 'price-input' },
      { key: 'rate',            id: 'rate-input' },
      { key: 'loanType',        id: 'loan-type' },
      { key: 'loanTermMonths',  id: 'loan-term' },
      { key: 'downAmt',         id: 'down-amt' },
      { key: 'taxRate',         id: 'tax-rate' },
      { key: 'insuranceAnnual', id: 'insurance' },
      { key: 'hoa',             id: 'hoa' },
      { key: 'income',          id: 'income' },
      { key: 'debts',           id: 'debts' },
      { key: 'savings',         id: 'savings' },
      { key: 'closingPct',      id: 'closing-pct' },
    ],
    'break-even.html': [
      { key: 'rate',            id: 'rate' },
      { key: 'loanTermMonths',  id: 'term',      transform: v => Math.round(v / 12) },
      { key: 'downPct',         id: 'down' },
      { key: 'closingPct',      id: 'closing' },
      { key: 'taxRate',         id: 'taxRate' },
      // break-even uses $/mo; profile stores $/yr
      { key: 'insuranceAnnual', id: 'insurance', transform: v => Math.round(v / 12) },
      { key: 'hoa',             id: 'hoa' },
      { key: 'savings',         id: 'savings' },
      { key: 'rent',            id: 'rent' },
    ],
    'recast-calculator.html': [
      { key: 'homePrice',       id: 'homePrice' },
      { key: 'downAmt',         id: 'downPayment' },
      { key: 'loanTermMonths',  id: 'loanTerm',  transform: v => Math.round(v / 12) },
      { key: 'rate',            id: 'interestRate' },
      { key: 'insuranceAnnual', id: 'homeInsurance' },
      { key: 'hoa',             id: 'hoa' },
    ],
    'down-pay-v-rate-buy.html': [
      { key: 'homePrice',       id: 'price' },
      { key: 'rate',            id: 'rate' },
      { key: 'loanTermMonths',  id: 'term',      transform: v => Math.round(v / 12) },
      { key: 'downAmt',         id: 'basedp' },
    ],
  };

  const EXTRACT_MAPS = {
    'piti.html': [
      { key: 'homePrice',       id: 'price-input' },
      { key: 'rate',            id: 'rate-input' },
      { key: 'loanType',        id: 'loan-type' },
      { key: 'loanTermMonths',  id: 'loan-term' },
      { key: 'downPct',         id: 'down-pct' },
      { key: 'downAmt',         id: 'down-amt' },
      { key: 'taxRate',         id: 'tax-rate' },
      { key: 'insuranceAnnual', id: 'insurance' },
      { key: 'hoa',             id: 'hoa' },
      { key: 'income',          id: 'income' },
      { key: 'debts',           id: 'debts' },
      { key: 'savings',         id: 'savings' },
      { key: 'closingPct',      id: 'closing-pct' },
    ],
    'break-even.html': [
      { key: 'rate',            id: 'rate' },
      // term field is in years; store as months
      { key: 'loanTermMonths',  id: 'term',      transform: v => +v * 12 },
      { key: 'downPct',         id: 'down' },
      { key: 'closingPct',      id: 'closing' },
      { key: 'taxRate',         id: 'taxRate' },
      // insurance field is $/mo here; store as annual
      { key: 'insuranceAnnual', id: 'insurance', transform: v => +v * 12 },
      { key: 'hoa',             id: 'hoa' },
      { key: 'savings',         id: 'savings' },
      { key: 'rent',            id: 'rent' },
    ],
    'recast-calculator.html': [
      { key: 'homePrice',       id: 'homePrice' },
      { key: 'downAmt',         id: 'downPayment' },
      // loanTerm field is in years
      { key: 'loanTermMonths',  id: 'loanTerm',  transform: v => +v * 12 },
      { key: 'rate',            id: 'interestRate' },
      { key: 'insuranceAnnual', id: 'homeInsurance' },
      { key: 'hoa',             id: 'hoa' },
    ],
    'down-pay-v-rate-buy.html': [
      { key: 'homePrice',       id: 'price' },
      { key: 'rate',            id: 'rate' },
      // term field is in years
      { key: 'loanTermMonths',  id: 'term',      transform: v => +v * 12 },
      { key: 'downAmt',         id: 'basedp' },
    ],
  };

  /* ── Core functions ───────────────────────────────────────────── */

  function fireEvents(el) {
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Apply a saved profile to form inputs on the current page.
   * Only sets fields that exist on this page and have a defined value in the profile.
   * Fires input + change events so calculator logic updates automatically.
   */
  function applyProfileToPage(profile) {
    if (!profile) return;
    const page = getCurrentPage();
    const entries = APPLY_MAPS[page];
    if (!entries) return; // index.html or unknown page — nothing to do

    entries.forEach(({ key, id, transform }) => {
      if (profile[key] === undefined || profile[key] === null) return;
      const el = document.getElementById(id);
      if (!el) return;
      const raw = profile[key];
      el.value = transform ? transform(raw) : raw;
      fireEvents(el);
    });
  }

  /**
   * Read the current form state into a profile object.
   * Returns a partial profile — only fields available on this page are populated.
   */
  function extractProfileFromPage() {
    const page = getCurrentPage();
    const entries = EXTRACT_MAPS[page];
    const profile = {};
    if (!entries) return profile;

    entries.forEach(({ key, id, transform }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const raw = el.value;
      if (raw === '' || raw === null || raw === undefined) return;
      profile[key] = transform ? transform(raw) : (isNaN(+raw) ? raw : +raw);
    });
    return profile;
  }

  /* ── Migrate legacy mortgage_profile ─────────────────────────── */
  (function migrateLegacy() {
    try {
      const legacy = localStorage.getItem('mortgage_profile');
      if (!legacy) return;
      const old = JSON.parse(legacy);
      if (!old || typeof old !== 'object') return;
      // Map old shape → new shape
      const migrated = {
        id:              generateId(),
        name:            old.name || 'Imported Profile',
        createdAt:       new Date().toISOString(),
        income:          old.income,
        debts:           old.debts,
        savings:         old.savings,
        homePrice:       old.homePrice,
        rate:            old.rate,
        loanType:        old.loanType,
        taxRate:         old.taxRate,
        insuranceAnnual: old.insurance,
        hoa:             old.hoa,
      };
      // Only migrate if no profiles exist yet
      if (listProfiles().length === 0) {
        saveProfile(migrated);
      }
      localStorage.removeItem('mortgage_profile');
    } catch (e) {}
  })();

  return {
    listProfiles,
    saveProfile,
    loadProfile,
    deleteProfile,
    generateId,
    getCurrentPage,
    applyProfileToPage,
    extractProfileFromPage,
  };
})();
