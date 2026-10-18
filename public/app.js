// backspace — tiny progressive touches. The app works fine without JS;
// this just makes the settings page feel alive.
(function () {
  'use strict';

  // Theme preview on the settings page: clicking a swatch tints the preview.
  var swatches = document.querySelectorAll('.swatch');
  var preview = document.getElementById('theme-preview');
  if (swatches.length && preview) {
    swatches.forEach(function (label) {
      label.addEventListener('click', function () {
        var color = label.getAttribute('data-color');
        if (color) preview.style.borderLeftColor = color;
      });
    });
    var checked = document.querySelector('.swatch input:checked');
    if (checked) {
      var c = checked.closest('.swatch').getAttribute('data-color');
      if (c) preview.style.borderLeftColor = c;
    }
  }
})();
