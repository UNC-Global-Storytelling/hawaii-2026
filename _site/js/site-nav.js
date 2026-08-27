(function () {
  var nav = document.querySelector('.site-nav');
  if (!nav) return;

  var lastY = window.scrollY || 0;
  var minDelta = 6;
  var showAtTop = 60;
  var isHome = document.body && document.body.classList.contains('page-home');
  var heroWait = isHome;
  var heroWaitMs = 3000;

  if (isHome) {
    nav.classList.add('site-nav--hidden');
    nav.classList.add('site-nav--hero-wait');
    setTimeout(function () {
      heroWait = false;
      nav.classList.remove('site-nav--hero-wait');
      if ((window.scrollY || 0) <= showAtTop) {
        nav.classList.remove('site-nav--hidden');
      }
    }, heroWaitMs);
  }

  function onScroll() {
    var currentY = window.scrollY || 0;
    var delta = currentY - lastY;

    if (heroWait) {
      lastY = currentY;
      return;
    }

    if (currentY <= showAtTop) {
      nav.classList.remove('site-nav--hidden');
      lastY = currentY;
      return;
    }

    if (Math.abs(delta) < minDelta) return;

    if (delta > 0) {
      nav.classList.add('site-nav--hidden');
    } else {
      nav.classList.remove('site-nav--hidden');
    }

    lastY = currentY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();
