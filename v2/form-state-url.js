// form-state-url.js
(function () {
  "use strict";

  const DEBOUNCE_MS = 300;

  /** Use the element's name, falling back to its id, as the URL param key. */
  function getKey(el) {
    return el.name || el.id || null;
  }

  /** Serialize all form inputs into a URLSearchParams object. */
  function serializeInputs() {
    const params = new URLSearchParams();
    const seenRadio = new Set();

    document.querySelectorAll("input, select, textarea").forEach((el) => {
      const key = getKey(el);
      if (!key) return;

      if (el.type === "checkbox") {
        // Supports checkbox groups with the same name.
        // Uses the checkbox's value, or "1" if no value is set.
        if (el.checked) params.append(key, el.value || "1");
      } else if (el.type === "radio") {
        // Only write the checked radio in each group once.
        if (el.checked && !seenRadio.has(key)) {
          params.set(key, el.value);
          seenRadio.add(key);
        }
      } else if (el.value !== "") {
        params.set(key, el.value);
      }
    });

    return params;
  }

  /** Push the current input state into the URL without a page reload. */
  function saveToURL() {
    const params = serializeInputs();
    const search = params.toString();
    const url =
      location.pathname +
      (search ? "?" + search : "") +
      location.hash;
    history.replaceState(null, "", url);
  }

  /**
   * Read URL params and fill matching inputs.
   * Also dispatches input/change events so any existing calculator
   * logic re-runs with the prefilled values.
   */
  function loadFromURL() {
    const params = new URLSearchParams(location.search);
    if (!params.size) return;

    document.querySelectorAll("input, select, textarea").forEach((el) => {
      const key = getKey(el);
      if (!key || !params.has(key)) return;

      if (el.type === "checkbox") {
        const savedValues = params.getAll(key);
        el.checked = savedValues.includes(el.value || "1");
      } else if (el.type === "radio") {
        el.checked = el.value === params.get(key);
      } else {
        el.value = params.get(key);
      }

      // Fire events so dependent calculator logic reacts to prefilled values.
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  /** Debounce saves so fast typing doesn't spam history.replaceState. */
  let debounceTimer;
  function debouncedSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveToURL, DEBOUNCE_MS);
  }

  function init() {
    loadFromURL();
    document.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("input", debouncedSave);
      el.addEventListener("change", debouncedSave);
    });
  }

  // Works whether the script is in <head> or at the end of <body>.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
