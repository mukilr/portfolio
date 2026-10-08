const themeDefaults = { primary: '#48ff8b', secondary: '#020604', font: '#a4ffc2' };
const themeStorageKey = 'portfolio-colors';
const themeDialog = document.querySelector('#theme-dialog');
document.querySelector('#theme-close').addEventListener('click', () => themeDialog.close());
const themeInputs = Object.fromEntries(Object.keys(themeDefaults).map((key) => [key, document.querySelector(`#theme-${key}`)]));
let theme = { ...themeDefaults };
try {
  const saved = JSON.parse(localStorage.getItem(themeStorageKey));
  for (const key of Object.keys(themeDefaults)) {
    if (/^#[0-9a-f]{6}$/i.test(saved?.[key])) theme[key] = saved[key];
  }
} catch { /* Color customization also works when browser storage is unavailable. */ }

const applyTheme = () => {
  const root = document.documentElement;
  const custom = Object.keys(themeDefaults).some((key) => theme[key] !== themeDefaults[key]);
  const properties = {
    '--green': theme.primary,
    '--black': theme.secondary,
    '--green-soft': theme.font,
    '--panel': `color-mix(in srgb, ${theme.secondary} 98%, ${theme.primary})`,
    '--panel-2': `color-mix(in srgb, ${theme.secondary} 96%, ${theme.primary})`,
    '--green-muted': `color-mix(in srgb, ${theme.font} 72%, ${theme.secondary})`,
    '--dim': `color-mix(in srgb, ${theme.font} 48%, ${theme.secondary})`,
  };
  for (const [property, value] of Object.entries(properties)) {
    if (custom) root.style.setProperty(property, value);
    else root.style.removeProperty(property);
  }
  for (const [key, input] of Object.entries(themeInputs)) input.value = theme[key];
  document.querySelector('meta[name="theme-color"]').content = theme.secondary;
};
const saveTheme = () => {
  try {
    localStorage.setItem(themeStorageKey, JSON.stringify(theme));
    document.querySelector('#theme-status').textContent = 'Colors saved in this browser.';
  } catch {
    document.querySelector('#theme-status').textContent = 'Colors updated. Browser storage is unavailable; changes last for this visit.';
  }
};
for (const [key, input] of Object.entries(themeInputs)) {
  input.addEventListener('input', () => {
    theme[key] = input.value;
    applyTheme();
  });
  input.addEventListener('change', saveTheme);
}
document.querySelector('#theme-reset').addEventListener('click', () => {
  theme = { ...themeDefaults };
  applyTheme();
  saveTheme();
});
applyTheme();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sequences = [...document.querySelectorAll('.terminal-sequence')];

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const getTextNodes = (element) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => node.nodeValue.length
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
};

const streamElement = async (element) => {
  const delay = Number(element.dataset.delay || 0);
  const speed = Number(element.dataset.speed || (element.closest('.ascii-name') ? 3 : 11));
  const nodes = getTextNodes(element);
  const records = nodes.map((node) => ({ node, text: node.nodeValue }));
  const accessibleText = records.map(({ text }) => text).join(' ').replace(/\s+/g, ' ').trim();

  if (accessibleText) element.setAttribute('aria-label', accessibleText);
  if (reducedMotion) {
    element.classList.add('stream-complete');
    return;
  }

  records.forEach(({ node }) => { node.nodeValue = ''; });
  await wait(delay);

  element.classList.add('stream-active');
  const cursor = document.createElement('i');
  cursor.className = 'stream-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  const cursorHost = records.at(-1)?.node.parentElement || element;
  cursorHost.append(cursor);

  for (const { node, text } of records) {
    for (const character of text) {
      node.nodeValue += character;
      await wait(speed);
    }
  }

  element.classList.remove('stream-active');
  element.classList.add('stream-complete');
  if (!element.hasAttribute('data-persist-cursor')) {
    await wait(180);
    cursor.remove();
  }
};

const startSequence = (sequence) => {
  if (sequence.dataset.started) return;
  sequence.dataset.started = 'true';
  sequence.querySelectorAll('[data-stream]').forEach((element) => streamElement(element));
  const consolePanel = sequence.querySelector('[data-console]');
  if (consolePanel) {
    window.setTimeout(() => consolePanel.classList.add('ready'), reducedMotion ? 0 : 560);
  }
};

if (reducedMotion || !('IntersectionObserver' in window)) {
  sequences.forEach(startSequence);
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      startSequence(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '80px 0px 80px' });

  sequences.forEach((sequence) => observer.observe(sequence));
}

const commandInput = document.querySelector('#terminal-command');
const optionButtons = [...document.querySelectorAll('.quick-options [data-command]')];
const commandStatus = document.querySelector('.command-status');
const robotDialog = document.querySelector('#robot-dialog');
const robotForm = document.querySelector('#robot-form');
const verifyHumanButton = document.querySelector('#verify-human');
const robotMessage = document.querySelector('#robot-message');
const emailReveal = document.querySelector('#email-reveal');
const protectedEmail = document.querySelector('#protected-email');
const copyEmailButton = document.querySelector('#copy-email');
const openEmailLink = document.querySelector('#open-email');
const copyStatus = document.querySelector('#copy-status');
let activeOption = 0;
let recaptchaSiteKey = '';
let recaptchaLoader = null;
let unlockedEmail = '';

optionButtons.forEach((button, index) => {
  button.id = `quick-option-${index}`;
});

const visibleOptions = () => optionButtons.filter((button) => !button.hidden);

const setActiveOption = (index) => {
  const options = visibleOptions();
  optionButtons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-selected', 'false');
  });
  if (!options.length) {
    commandInput.removeAttribute('aria-activedescendant');
    return;
  }
  activeOption = (index + options.length) % options.length;
  const active = options[activeOption];
  active.classList.add('active');
  active.setAttribute('aria-selected', 'true');
  commandInput.setAttribute('aria-activedescendant', active.id);
};

const filterOptions = () => {
  const query = commandInput.value.trim().toLowerCase();
  optionButtons.forEach((button) => {
    button.hidden = !button.textContent.toLowerCase().includes(query);
  });
  setActiveOption(0);
  commandStatus.textContent = visibleOptions().length
    ? 'Press Enter to run the selected command.'
    : `command not found: ${query}`;
};

const loadRecaptcha = (siteKey) => {
  if (recaptchaLoader) return recaptchaLoader;
  recaptchaLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.onload = () => window.grecaptcha.ready(resolve);
    script.onerror = () => {
      script.remove();
      recaptchaLoader = null;
      reject(new Error('Google verification could not be loaded. Please try again.'));
    };
    document.head.append(script);
  });
  return recaptchaLoader;
};

const openRobotCheck = async () => {
  robotForm.hidden = false;
  emailReveal.hidden = true;
  protectedEmail.textContent = '';
  openEmailLink.setAttribute('href', '#');
  copyStatus.textContent = '';
  unlockedEmail = '';
  verifyHumanButton.disabled = true;
  robotMessage.textContent = 'Loading Google reCAPTCHA...';
  robotDialog.showModal();

  try {
    const configResponse = await fetch('/api/contact/config', { cache: 'no-store' });
    if (!configResponse.ok) throw new Error('Secure email verification is not configured.');
    const { siteKey } = await configResponse.json();
    if (!siteKey) throw new Error('Google reCAPTCHA site key is missing.');
    await loadRecaptcha(siteKey);
    recaptchaSiteKey = siteKey;
    verifyHumanButton.disabled = false;
    robotMessage.textContent = '';
  } catch (error) {
    robotMessage.textContent = error.message;
  }
};

const executeCommand = (command) => {
  commandStatus.textContent = `running: ${command}`;
  if (command === 'resume') {
    window.location.href = 'resume.html';
    return;
  }
  if (command === 'replay') {
    const url = new URL(window.location.href);
    url.searchParams.set('replay', Date.now());
    url.hash = '';
    window.location.href = url;
    return;
  }
  if (command === 'customize') themeDialog.showModal();
  if (command === 'email') openRobotCheck();
};

commandInput.addEventListener('input', filterOptions);
commandInput.addEventListener('focus', () => commandInput.setAttribute('aria-expanded', 'true'));
commandInput.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    setActiveOption(activeOption + (event.key === 'ArrowDown' ? 1 : -1));
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const exact = optionButtons.find((button) => button.dataset.command === commandInput.value.trim().toLowerCase());
    const selected = exact || visibleOptions()[activeOption];
    if (selected) executeCommand(selected.dataset.command);
  }
  if (event.key === 'Escape') {
    commandInput.value = '';
    filterOptions();
    commandInput.blur();
  }
});

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => executeCommand(button.dataset.command));
});

robotForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!recaptchaSiteKey || verifyHumanButton.disabled) return;
  verifyHumanButton.disabled = true;
  robotMessage.textContent = 'Verifying securely...';

  try {
    const token = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'contact_unlock' });
    const response = await fetch('/api/contact/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const result = await response.json();
    if (!response.ok || !result.email) throw new Error(result.error || 'Verification failed.');

    unlockedEmail = result.email;
    robotForm.hidden = true;
    emailReveal.hidden = false;
    protectedEmail.textContent = unlockedEmail;
    openEmailLink.setAttribute('href', `mailto:${unlockedEmail}?subject=Portfolio%20inquiry`);
    window.setTimeout(() => copyEmailButton.focus(), 0);
  } catch (error) {
    robotMessage.textContent = error.message;
    verifyHumanButton.disabled = false;
  }
});

const copyUnlockedEmail = async () => {
  if (!unlockedEmail) return;
  try {
    await navigator.clipboard.writeText(unlockedEmail);
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = unlockedEmail;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
  }
  copyStatus.textContent = 'Email address copied.';
};

copyEmailButton.addEventListener('click', copyUnlockedEmail);
document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => robotDialog.close());
});
robotDialog.addEventListener('close', () => {
  unlockedEmail = '';

});
setActiveOption(0);
