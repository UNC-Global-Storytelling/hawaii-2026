(function () {
    var videoSections = Array.prototype.slice.call(document.querySelectorAll('.video-block')).filter(function (el) {
      return el.querySelector('iframe');
    });
    var photoSections = Array.prototype.slice.call(document.querySelectorAll('.photo-story'));
    if (!videoSections.length && !photoSections.length) return;

    var ticking = false;

    function getProgress(section) {
      var rect = section.getBoundingClientRect();
      var total = Math.max(1, section.offsetHeight - window.innerHeight);
      return Math.min(1, Math.max(0, -rect.top / total));
    }

    function setupVideoSection(section) {
      var iframe = section.querySelector('iframe');
      if (!iframe) return null;
      var isStopped = false;
      var inTheater = false;

      function postToVimeo(method, value) {
        if (!iframe.contentWindow) return;
        var payload = { method: method };
        if (value !== undefined) payload.value = value;
        iframe.contentWindow.postMessage(JSON.stringify(payload), '*');
      }

      function applyScrollState() {
        var rect = section.getBoundingClientRect();
        var progress = getProgress(section);
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

      return applyScrollState;
    }

    function setupPhotoStorySection(section) {
      var inTheater = false;
      var isAnimating = false;
      var stage = section.querySelector('.photo-story__stage');
      var mediaEl = section.querySelector('.photo-story__media');
      var layerEls = [
        section.querySelector('.photo-story__layer--0'),
        section.querySelector('.photo-story__layer--1')
      ];
      var activeLayerIndex = 0;
      var leftPeekEls = [
        section.querySelector('.photo-story__preview--left .photo-story__peek-layer--0'),
        section.querySelector('.photo-story__preview--left .photo-story__peek-layer--1')
      ];
      var rightPeekEls = [
        section.querySelector('.photo-story__preview--right .photo-story__peek-layer--0'),
        section.querySelector('.photo-story__preview--right .photo-story__peek-layer--1')
      ];
      var activeLeftPeek = 0;
      var activeRightPeek = 0;
      var prevButton = section.querySelector('.photo-story__arrow--left');
      var nextButton = section.querySelector('.photo-story__arrow--right');
      var leftPreviewWrap = section.querySelector('.photo-story__preview--left');
      var rightPreviewWrap = section.querySelector('.photo-story__preview--right');
      var SLIDE_MS = 750;

      var baseImages = [
        '/assets/images/landscape/hero-placeholder.svg',
        '/assets/images/layouts/story-ocean.svg',
        '/assets/images/layouts/mountain-ribbon-home.svg',
        '/assets/images/layouts/wave-intro.svg',
        '/assets/images/layouts/mountain-wave.svg'
      ];
      var images = [];
      for (var i = 0; i < 15; i++) {
        images.push(baseImages[i % baseImages.length]);
      }
      var currentIndex = 0;
      var animTimer = null;

      function clearPhotoAnim() {
        if (animTimer) {
          window.clearTimeout(animTimer);
          animTimer = null;
        }
        if (stage) {
          stage.classList.remove('is-anim-next', 'is-anim-prev', 'is-settling');
        }
        isAnimating = false;
      }

      function updateArrowsOnly() {
        if (prevButton) prevButton.classList.toggle('is-hidden', currentIndex === 0);
        if (nextButton) nextButton.classList.toggle('is-hidden', currentIndex === images.length - 1);
      }

      function decodeWhenReady(img) {
        if (!img) return Promise.resolve();
        if (img.decode) {
          return img.decode().catch(function () {});
        }
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(function (resolve) {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }

      var preloadInflight = {};

      function warmNeighborImages() {
        var want = [currentIndex - 1, currentIndex + 1, currentIndex + 2];
        for (var w = 0; w < want.length; w++) {
          var idx = want[w];
          if (idx < 0 || idx >= images.length) continue;
          var u = images[idx];
          if (!u || preloadInflight[u]) continue;
          preloadInflight[u] = true;
          var im = new Image();
          im.onload = function () {};
          im.onerror = function () {};
          im.src = u;
        }
      }

      /* Keep the hidden main layer src on the true next slide so advancing reuses it (often already decoded). */
      function stageIncomingMainLayer() {
        var inactiveIdx = 1 - activeLayerIndex;
        var inactive = layerEls[inactiveIdx];
        if (!inactive) return;
        var upcoming = currentIndex < images.length - 1 ? images[currentIndex + 1] : '';
        if (upcoming) {
          inactive.src = upcoming;
        } else {
          inactive.removeAttribute('src');
        }
      }

      function finishTheaterSlide(direction) {
        if (!stage || !mediaEl) {
          isAnimating = false;
          animTimer = null;
          return;
        }
        stage.classList.add('is-settling');
        window.requestAnimationFrame(function () {
          if (direction === 'next') {
            currentIndex++;
          } else {
            currentIndex--;
          }
          var nextMain = activeLayerIndex === 0 ? 1 : 0;
          var mainIncoming = layerEls[nextMain];
          var mainUrl = images[currentIndex];
          var prevSrc = currentIndex > 0 ? images[currentIndex - 1] : '';
          var nextSrc = currentIndex < images.length - 1 ? images[currentIndex + 1] : '';
          var nextLeft = 1 - activeLeftPeek;
          var nextRight = 1 - activeRightPeek;

          var tasks = [];

          if (mainIncoming) {
            mainIncoming.src = mainUrl;
            tasks.push(decodeWhenReady(mainIncoming));
          }
          if (prevSrc && leftPeekEls[nextLeft]) {
            leftPeekEls[nextLeft].src = prevSrc;
            tasks.push(decodeWhenReady(leftPeekEls[nextLeft]));
          }
          if (nextSrc && rightPeekEls[nextRight]) {
            rightPeekEls[nextRight].src = nextSrc;
            tasks.push(decodeWhenReady(rightPeekEls[nextRight]));
          }

          Promise.all(tasks).then(function () {
            window.requestAnimationFrame(function () {
              stage.classList.remove('is-anim-next', 'is-anim-prev');
              void stage.offsetWidth;
              activeLayerIndex = nextMain;
              mediaEl.classList.toggle('photo-story__media--show-b', nextMain === 1);
              if (prevSrc) {
                activeLeftPeek = nextLeft;
                if (leftPreviewWrap) {
                  leftPreviewWrap.classList.toggle('photo-story__peek--show-b', activeLeftPeek === 1);
                }
              } else {
                activeLeftPeek = 0;
                if (leftPreviewWrap) leftPreviewWrap.classList.remove('photo-story__peek--show-b');
                leftPeekEls.forEach(function (el) {
                  if (el) el.removeAttribute('src');
                });
              }
              if (nextSrc) {
                activeRightPeek = nextRight;
                if (rightPreviewWrap) {
                  rightPreviewWrap.classList.toggle('photo-story__peek--show-b', activeRightPeek === 1);
                }
              } else {
                activeRightPeek = 0;
                if (rightPreviewWrap) rightPreviewWrap.classList.remove('photo-story__peek--show-b');
                rightPeekEls.forEach(function (el) {
                  if (el) el.removeAttribute('src');
                });
              }
              if (leftPreviewWrap) leftPreviewWrap.classList.toggle('is-hidden', !prevSrc);
              if (rightPreviewWrap) rightPreviewWrap.classList.toggle('is-hidden', !nextSrc);
              updateArrowsOnly();
              warmNeighborImages();
              stageIncomingMainLayer();
              stage.classList.remove('is-settling');
              isAnimating = false;
              animTimer = null;
            });
          });
        });
      }

      function preloadImages() {
        for (var i = 0; i < images.length; i++) {
          var u = images[i];
          if (!preloadInflight[u]) {
            preloadInflight[u] = true;
            var img = new Image();
            img.src = u;
          }
        }
        warmNeighborImages();
      }

      function updateSliderUI(opt) {
        opt = opt || {};
        var currentSrc = images[currentIndex];
        var prevSrc = currentIndex > 0 ? images[currentIndex - 1] : '';
        var nextSrc = currentIndex < images.length - 1 ? images[currentIndex + 1] : '';

        if (opt.mainOnly) {
          var main = layerEls[activeLayerIndex];
          if (main) main.src = currentSrc;
          updateArrowsOnly();
          warmNeighborImages();
          stageIncomingMainLayer();
          return;
        }

        var mainFull = layerEls[activeLayerIndex];
        if (mainFull) mainFull.src = currentSrc;
        if (prevSrc) {
          if (leftPeekEls[activeLeftPeek]) leftPeekEls[activeLeftPeek].src = prevSrc;
        } else {
          leftPeekEls.forEach(function (el) {
            if (el) el.removeAttribute('src');
          });
        }
        if (nextSrc) {
          if (rightPeekEls[activeRightPeek]) rightPeekEls[activeRightPeek].src = nextSrc;
        } else {
          rightPeekEls.forEach(function (el) {
            if (el) el.removeAttribute('src');
          });
        }
        if (leftPreviewWrap) leftPreviewWrap.classList.toggle('is-hidden', !prevSrc);
        if (rightPreviewWrap) rightPreviewWrap.classList.toggle('is-hidden', !nextSrc);
        updateArrowsOnly();
        warmNeighborImages();
        stageIncomingMainLayer();
      }

      function goPrev() {
        if (currentIndex <= 0 || isAnimating) return;
        if (!section.classList.contains('is-stopped')) {
          currentIndex--;
          updateSliderUI();
          return;
        }
        isAnimating = true;
        if (stage) stage.classList.add('is-anim-prev');
        if (animTimer) window.clearTimeout(animTimer);
        animTimer = window.setTimeout(function () {
          animTimer = null;
          finishTheaterSlide('prev');
        }, SLIDE_MS);
      }

      function goNext() {
        if (currentIndex >= images.length - 1 || isAnimating) return;
        if (!section.classList.contains('is-stopped')) {
          currentIndex++;
          updateSliderUI();
          return;
        }
        isAnimating = true;
        if (stage) stage.classList.add('is-anim-next');
        if (animTimer) window.clearTimeout(animTimer);
        animTimer = window.setTimeout(function () {
          animTimer = null;
          finishTheaterSlide('next');
        }, SLIDE_MS);
      }

      function bindSliderControls() {
        if (prevButton) {
          prevButton.addEventListener('click', goPrev);
        }
        if (nextButton) {
          nextButton.addEventListener('click', goNext);
        }
        if (leftPreviewWrap) {
          leftPreviewWrap.addEventListener('click', function () {
            if (leftPreviewWrap.classList.contains('is-hidden')) return;
            goPrev();
          });
        }
        if (rightPreviewWrap) {
          rightPreviewWrap.addEventListener('click', function () {
            if (rightPreviewWrap.classList.contains('is-hidden')) return;
            goNext();
          });
        }
      }

      preloadImages();
      bindSliderControls();
      updateSliderUI();

      function applyScrollState() {
        var rect = section.getBoundingClientRect();
        var progress = getProgress(section);
        var isInSection = rect.top < window.innerHeight && rect.bottom > 0;
        var theaterWindow = isInSection && progress >= 0.2 && progress <= 0.92;

        if (theaterWindow && !inTheater) {
          section.classList.add('is-stopped');
          inTheater = true;
        } else if (!theaterWindow && inTheater) {
          section.classList.remove('is-stopped');
          inTheater = false;
          clearPhotoAnim();
        }
      }

      return applyScrollState;
    }

    var applyFns = videoSections.map(setupVideoSection).concat(photoSections.map(setupPhotoStorySection)).filter(Boolean);

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        for (var i = 0; i < applyFns.length; i++) applyFns[i]();
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    setTimeout(onScroll, 80);
})();
