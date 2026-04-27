(function () {
  var container = document.querySelector('.portfolio-grid');
  if (!container || typeof mixitup !== 'function') return;

  var mixer = mixitup(container, {
    selectors: { target: '.project-nav' },
    animation: { duration: 350, effects: 'fade scale(0.96)' },
    load: { sort: 'order:asc' }
  });

  var activeCategory = 'all';
  var featuredOnly = false;

  function applyFilter() {
    var parts = [];
    if (activeCategory !== 'all') parts.push(activeCategory);
    if (featuredOnly) parts.push('.featured');
    mixer.filter(parts.length ? parts.join('') : 'all');
  }

  document.querySelectorAll('.filter-group .filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeCategory = btn.dataset.filter;
      document.querySelectorAll('.filter-group .filter').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      applyFilter();
    });
  });

  document.querySelectorAll('.sort-group .sort').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.sort-group .sort').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      mixer.sort(btn.dataset.sort);
    });
  });

  var featuredBtn = document.querySelector('.featured-toggle');
  if (featuredBtn) {
    featuredBtn.addEventListener('click', function () {
      featuredOnly = !featuredOnly;
      featuredBtn.classList.toggle('active', featuredOnly);
      applyFilter();
    });
  }
})();
