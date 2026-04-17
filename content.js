let lastSrc = '';
let observer = null;
let skipTimer = null;
let observedTarget = null;

const findAdContainer = () => {
  for (const video of document.querySelectorAll('video')) {
    let el = video.parentElement;
    let depth = 0;
    while (el && depth < 5) {
      if (/(ad|ads|advertisement)/i.test(el.id + ' ' + el.className)) {
        return el;
      }
      el = el.parentElement;
      depth++;
    }
  }
  return null;
};

const skipVideo = (adVideo, trigger) => {
  const dur = adVideo.duration;
  if (dur && isFinite(dur) && dur > 0.5) {
    console.log(`⏭️ skipped by [${trigger}]`, { duration: dur });
    adVideo.currentTime = dur - 0.5;
  } else {
    adVideo.addEventListener('loadedmetadata', () => {
      const dur = adVideo.duration;
      if (dur && isFinite(dur) && dur > 0.5) {
        console.log(`⏭️ skipped by [loadedmetadata after ${trigger}]`, { duration: dur });
        adVideo.currentTime = dur - 0.5;
      }
    }, { once: true });
  }
};

const attachObserver = () => {
  if (observer) observer.disconnect();
  lastSrc = '';

  const target = findAdContainer();
  if (!target) {
    console.log('⚠️ No ad container found, skipping attach');
    return;
  }

  observedTarget = target;
  console.log('🎯 Observing:', target.id || target.className);

  observer = new MutationObserver(() => {
    clearTimeout(skipTimer);
    skipTimer = setTimeout(() => {
      const adVideo = target.querySelector('video');
      if (!adVideo) return;

      const src = adVideo.src || adVideo.currentSrc;
      if (!src || src === lastSrc) return;

      lastSrc = src;
      skipVideo(adVideo, 'mutation');
    }, 50);
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  });

  // ✅ Fix: immediately handle video that's already present when observer attaches
  const adVideo = target.querySelector('video');
  if (adVideo) {
    const src = adVideo.src || adVideo.currentSrc;
    if (src) {
      lastSrc = src;
      skipVideo(adVideo, 'attach');
    }
  }

  console.log('🛡️ Ad skipper active!');
};

const pageObserver = new MutationObserver(() => {
  if (!observer || !document.body.contains(observedTarget)) {
    attachObserver();
  }
});

pageObserver.observe(document.body, { childList: true, subtree: true });

attachObserver();