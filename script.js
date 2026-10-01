const typedLines = [...document.querySelectorAll('[data-type]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const typeLine = (element, speed = 24) => new Promise((resolve) => {
  const text = element.textContent.trim();
  element.setAttribute('aria-label', text);

  if (reducedMotion) {
    resolve();
    return;
  }

  element.textContent = '';
  let index = 0;
  const tick = () => {
    element.textContent = text.slice(0, index);
    index += 1;
    if (index <= text.length) {
      window.setTimeout(tick, speed);
    } else {
      resolve();
    }
  };
  tick();
});

const runIntro = async () => {
  for (const [index, line] of typedLines.entries()) {
    await typeLine(line, index === 1 ? 38 : 18);
    if (!reducedMotion) await new Promise((resolve) => window.setTimeout(resolve, index === 0 ? 220 : 110));
  }
};

runIntro();

const revealItems = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px' });
  revealItems.forEach((item) => observer.observe(item));
}
