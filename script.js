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
