(function () {
  var btn = document.querySelector('.hero__scroll');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var sel = btn.getAttribute('data-scroll-target');
    var el = sel && document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
})();

(function () {
  var section = document.querySelector('.video-block');
  if (!section) return;

  var iframe = section.querySelector('#featured-vimeo');
  var ticking = false;
  var isStopped = false;
  var inTheater = false;

  function postToVimeo(method, value) {
    if (!iframe || !iframe.contentWindow) return;
    var payload = { method: method };
    if (value !== undefined) payload.value = value;
    iframe.contentWindow.postMessage(JSON.stringify(payload), '*');
  }

  function getProgress() {
    var rect = section.getBoundingClientRect();
    var total = Math.max(1, section.offsetHeight - window.innerHeight);
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  function applyScrollState() {
    var rect = section.getBoundingClientRect();
    var progress = getProgress();
    var ease = 1 - Math.pow(1 - progress, 2);
    var isInSection = rect.top < window.innerHeight && rect.bottom > 0;
    var theaterWindow = isInSection && progress >= 0.2 && progress <= 0.92;

    var rate = Math.max(0.15, 1 - ease * 0.85);
    if (isInSection) {
      postToVimeo('setPlaybackRate', rate);
    } else {
      postToVimeo('setPlaybackRate', 1);
    }

    if (theaterWindow && !inTheater) {
      section.classList.add('is-stopped');
      inTheater = true;
    } else if (!theaterWindow && inTheater) {
      section.classList.remove('is-stopped');
      inTheater = false;
    }

    var shouldStop = theaterWindow && progress >= 0.5 && progress <= 0.86;
    if (shouldStop && !isStopped) {
      postToVimeo('setPlaybackRate', 0.15);
      postToVimeo('pause');
      isStopped = true;
    } else if (!shouldStop && isStopped) {
      postToVimeo('play');
      isStopped = false;
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      applyScrollState();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  setTimeout(onScroll, 80);
})();

(function () {
  var stories = Array.prototype.slice.call(document.querySelectorAll('.story'));
  if (!stories.length) return;

  var ticking = false;

  function setActiveStory() {
    var viewportCenter = window.innerHeight / 2;
    var bestIndex = 0;
    var bestDistance = Infinity;

    for (var i = 0; i < stories.length; i++) {
      var rect = stories[i].getBoundingClientRect();
      var storyCenter = rect.top + rect.height / 2;
      var distance = Math.abs(storyCenter - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    for (var j = 0; j < stories.length; j++) {
      if (j === bestIndex) {
        stories[j].classList.add('story--active');
      } else {
        stories[j].classList.remove('story--active');
      }
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      setActiveStory();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  setTimeout(setActiveStory, 80);
})();
