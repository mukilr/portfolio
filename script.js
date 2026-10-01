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
const robotQuestion = document.querySelector('#robot-question');
const robotAnswer = document.querySelector('#robot-answer');
const robotMessage = document.querySelector('#robot-message');
const emailReveal = document.querySelector('#email-reveal');
const protectedEmail = document.querySelector('#protected-email');
const copyEmailButton = document.querySelector('#copy-email');
const openEmailLink = document.querySelector('#open-email');
const copyStatus = document.querySelector('#copy-status');
const emailCipher = [55, 47, 49, 51, 54, 40, 26, 61, 55, 59, 51, 54, 116, 57, 53, 55];
let expectedRobotAnswer = 0;
let activeOption = 0;

const unlockEmail = () => String.fromCharCode(...emailCipher.map((value) => value ^ 90));

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

const openRobotCheck = () => {
  const first = Math.floor(Math.random() * 8) + 2;
  const second = Math.floor(Math.random() * 8) + 2;
  expectedRobotAnswer = first + second;
  robotQuestion.textContent = `$ verify-human --answer "${first} + ${second} = ?"`;
  robotAnswer.value = '';
  robotMessage.textContent = '';
  robotForm.hidden = false;
  emailReveal.hidden = true;
  protectedEmail.textContent = '';
  openEmailLink.setAttribute('href', '#');
  copyStatus.textContent = '';
  robotDialog.showModal();
  window.setTimeout(() => robotAnswer.focus(), 0);
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

robotForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (Number(robotAnswer.value.trim()) !== expectedRobotAnswer) {
    robotMessage.textContent = 'Verification failed. Check the answer and try again.';
    robotAnswer.select();
    return;
  }
  const email = unlockEmail();
  robotForm.hidden = true;
  emailReveal.hidden = false;
  protectedEmail.textContent = email;
  openEmailLink.setAttribute('href', `mailto:${email}?subject=Portfolio%20inquiry`);
  window.setTimeout(() => copyEmailButton.focus(), 0);
});

const copyUnlockedEmail = async () => {
  const email = unlockEmail();
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = email;
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
setActiveOption(0);
