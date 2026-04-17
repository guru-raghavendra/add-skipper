let lastSrc = '';
let observer = null;
let skipTimer = null;      // for debouncing the MutationObserver callback
let observedTarget = null; // tracks the DOM node being observed (for SPA re-attach)

const findAdContainer = (video) => {
  let el = video.parentElement;
  while (el) {
    if (/(ad|ads|advertisement)/i.test(el.id + ' ' + el.className)) {
      return el;
    }
    el = el.parentElement;
  }
  return document.body; // fallback
};

const attachObserver = () => {
  if (observer) observer.disconnect();
  lastSrc = ''; // Reset lastSrc to ensure same-src ads are skipped on new pages

  const video = document.querySelector('video');
  if (!video) return;

  const target = findAdContainer(video);
  observedTarget = target; // keep a reference so pageObserver can check if it's still in the DOM
  console.log('🎯 Observing:', target.id || target.className || 'body');

  observer = new MutationObserver(() => {
    clearTimeout(skipTimer);
    skipTimer = setTimeout(() => {
      const adVideo = target.querySelector('video');
      if (!adVideo) return;

      const src = adVideo.src || adVideo.currentSrc;
      if (!src || src === lastSrc) return;

      lastSrc = src;

      adVideo.addEventListener('loadedmetadata', () => {
        const dur = adVideo.duration;
        if (dur && isFinite(dur) && dur > 0.5) {
          console.log('⏭️ skipped by [loadedmetadata]', { duration: dur });
          adVideo.currentTime = dur - 0.5;
        }
      }, { once: true });
    }, 50); // debounce: wait 50ms before acting on DOM mutations
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  });

  console.log('🛡️ Ad skipper active!');
};

// Re-attach on page navigation (SPA support)
// Triggers when: no observer yet, OR the observed node has been removed from the DOM (SPA nav)
const pageObserver = new MutationObserver(() => {
  const video = document.querySelector('video');
  if (video && (!observer || !document.body.contains(observedTarget))) {
    attachObserver();
  }
});

pageObserver.observe(document.body, { childList: true, subtree: true });

// Initial attach
attachObserver();