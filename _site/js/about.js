(function () {
  var body = document.body;
  if (!body.classList.contains('page-about')) return;

  var nav = document.querySelector('.site-nav');
  if (nav) {
    var lastY = window.scrollY || 0;
    var minDelta = 6;
    var showAtTop = 60;

    function stickyTopPx() {
      return nav.offsetHeight || 143;
    }

    function setDividerTop(navHidden) {
      body.style.setProperty(
        '--about-sticky-top',
        navHidden ? '0px' : stickyTopPx() + 'px'
      );
    }

    function onScroll() {
      var currentY = window.scrollY || 0;
      var delta = currentY - lastY;

      if (currentY <= showAtTop) {
        nav.classList.remove('site-nav--hidden');
        setDividerTop(false);
        lastY = currentY;
        return;
      }

      if (Math.abs(delta) < minDelta) return;

      if (delta > 0) {
        nav.classList.add('site-nav--hidden');
        setDividerTop(true);
      } else {
        nav.classList.remove('site-nav--hidden');
        setDividerTop(false);
      }

      lastY = currentY;
    }

    setDividerTop(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(
      'resize',
      function () {
        setDividerTop(nav.classList.contains('site-nav--hidden'));
      },
      { passive: true }
    );
  }

  var filterBar = document.querySelector('[data-profile-filters]');
  if (!filterBar) return;
  var peopleSection = document.querySelector('.everyone');
  var heading = document.querySelector('[data-people-heading]');
  var buttons = Array.prototype.slice.call(filterBar.querySelectorAll('button[data-filter]'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-profile-card]'));
  var teamsScroll = document.querySelector('[data-teams-scroll]');
  var headingByFilter = {
    everyone: 'Everyone',
    teams: 'Sort by Team',
    reporters: 'Reporters',
    'photo-video': 'Photo/Video',
    interactive: 'Interactive',
    'faculty-coaches': 'Faculty/Coaches',
    'local-producers': 'Local Producers',
  };
  var setFilter = function (key) {
    buttons.forEach(function (btn) {
      var active = btn.getAttribute('data-filter') === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (peopleSection) {
      peopleSection.classList.toggle('is-teams', key === 'teams');
    }
    if (teamsScroll) {
      teamsScroll.hidden = key !== 'teams';
    }
    if (heading && headingByFilter[key]) heading.textContent = headingByFilter[key];
    cards.forEach(function (card) {
      var cardType = card.getAttribute('data-category') || '';
      var cardTypes = cardType.split(/\s+/).filter(Boolean);
      if (key === 'everyone') {
        card.hidden = false;
      } else if (key === 'teams') {
        card.hidden = true;
      } else {
        card.hidden = cardTypes.indexOf(key) === -1;
      }
    });
  };
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setFilter(btn.getAttribute('data-filter'));
    });
  });
  setFilter('everyone');
})();
