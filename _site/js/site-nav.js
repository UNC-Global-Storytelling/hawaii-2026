(function () {
  var nav = document.querySelector('.site-nav');
  if (!nav) return;

  var lastY = window.scrollY || 0;
  var minDelta = 6;
  var showAtTop = 60;

  function onScroll() {
    var currentY = window.scrollY || 0;
    var delta = currentY - lastY;

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
