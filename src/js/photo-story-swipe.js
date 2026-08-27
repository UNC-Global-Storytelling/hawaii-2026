(function () {
  var minSwipe = 50;

  function bindSwipe(section) {
    var stage = section.querySelector('.photo-story__stage');
    var prev = section.querySelector('.photo-story__arrow--left');
    var next = section.querySelector('.photo-story__arrow--right');
    if (!stage || (!prev && !next)) return;

    stage.querySelectorAll('img').forEach(function (img) {
      img.draggable = false;
    });

    var startX = 0;
    var startY = 0;
    var tracking = false;
    var swiped = false;

    function canClick(btn) {
      return btn && !btn.classList.contains('is-hidden') && !btn.disabled;
    }

    function finish(dx, dy) {
      tracking = false;
      stage.classList.remove('is-dragging');
      if (Math.abs(dx) < minSwipe) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.15) return;
      swiped = true;
      if (dx < 0) {
        if (canClick(next)) next.click();
      } else if (canClick(prev)) {
        prev.click();
      }
    }

    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest && e.target.closest('.photo-story__arrow')) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      swiped = false;
      try {
        stage.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.pointerType === 'mouse') stage.classList.add('is-dragging');
    });

    stage.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      finish(e.clientX - startX, e.clientY - startY);
    });

    stage.addEventListener('pointercancel', function () {
      tracking = false;
      stage.classList.remove('is-dragging');
    });

    stage.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.photo-story__arrow')) return;
      if (!swiped) return;
      swiped = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  document.querySelectorAll('.photo-story').forEach(bindSwipe);
})();
