/* ==========================================================================
   Ремонт квартир и электрика — частный мастер
   script.js
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     Заявка
     -------------------------------------------------------------------------- */

  /* Заявки не уходят на сервер: после валидации показываем окно с готовым
     текстом заявки, который можно скопировать или отправить в мессенджер. */

  var AREA_MIN = 15;
  var AREA_MAX = 150;

  /* --------------------------------------------------------------------------
     Утилиты
     -------------------------------------------------------------------------- */

  var numberFormatter = new Intl.NumberFormat('ru-RU');

  function formatMoney(value) {
    return numberFormatter.format(Math.round(value));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function roundTo(value, step) {
    return Math.round(value / step) * step;
  }

  function plural(count, one, few, many) {
    var mod10 = count % 10;
    var mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function scrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  /* --------------------------------------------------------------------------
     Шапка, меню, кнопка «наверх»
     -------------------------------------------------------------------------- */

  var header = document.getElementById('header');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  var toTop = document.getElementById('to-top');
  var navLinks = Array.prototype.slice.call(nav ? nav.querySelectorAll('.nav__link') : []);
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href');
      return id && id.charAt(0) === '#' ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  function closeMenu() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    document.body.classList.remove('is-locked');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
      document.body.classList.toggle('is-locked', isOpen);
    });

    navLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeMenu();
    });
  }

  function onScroll() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;

    if (header) {
      header.classList.toggle('is-scrolled', scrollY > 20);
    }

    if (toTop) {
      toTop.classList.toggle('is-visible', scrollY > 600);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    });
  }

  /* Подсветка активного пункта меню */

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            var isCurrent = link.getAttribute('href') === '#' + entry.target.id;
            link.classList.toggle('is-active', isCurrent);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  /* --------------------------------------------------------------------------
     Анимация появления блоков
     -------------------------------------------------------------------------- */

  var revealTargets = document.querySelectorAll(
    '.hero__benefits, .hero__stats, .hero__card, .section__head, .service-card, ' +
    '.calc-step, .calc-summary, .process__item, .contact__aside, .contact__card, .services__note'
  );

  if ('IntersectionObserver' in window && !prefersReducedMotion()) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    revealTargets.forEach(function (element, index) {
      element.classList.add('reveal');

      // Блоки, которые уже видны на первом экране, показываем сразу и без анимации.
      var rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        element.classList.add('is-visible');
        return;
      }

      element.classList.add('is-animatable');
      element.style.transitionDelay = (index % 4) * 70 + 'ms';
      revealObserver.observe(element);
    });

    // Страховка: если IntersectionObserver почему-то не сработал
    // (например, при переходе по якорю), показываем блоки, попавшие в область экрана.
    var revealSweep = setInterval(function () {
      var pending = document.querySelectorAll('.reveal.is-animatable:not(.is-visible)');
      if (!pending.length) {
        clearInterval(revealSweep);
        return;
      }
      Array.prototype.forEach.call(pending, function (element) {
        var rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          element.classList.add('is-visible');
          revealObserver.unobserve(element);
        }
      });
    }, 400);

    window.addEventListener('load', function () {
      setTimeout(function () {
        clearInterval(revealSweep);
      }, 20000);
    });
  }
  /* --------------------------------------------------------------------------
     Калькулятор стоимости
     -------------------------------------------------------------------------- */

  var calcForm = document.getElementById('calculator-form');
  var areaRange = document.getElementById('area');
  var areaNumber = document.getElementById('area-number');
  var areaOutput = document.getElementById('area-output');
  var totalPriceEl = document.getElementById('total-price');
  var totalRangeEl = document.getElementById('total-range');
  var summaryWorkEl = document.getElementById('summary-work');
  var summaryRoomEl = document.getElementById('summary-room');
  var summaryBaseEl = document.getElementById('summary-base');
  var summaryExtrasEl = document.getElementById('summary-extras');
  var priceBox = document.querySelector('.calc-summary__price');
  var formCalcText = document.getElementById('form-calc-text');
  var calcCta = document.getElementById('calc-cta');

  var hiddenRoom = document.getElementById('hidden-room');
  var hiddenWork = document.getElementById('hidden-work');
  var hiddenArea = document.getElementById('hidden-area');
  var hiddenExtras = document.getElementById('hidden-extras');
  var hiddenTotal = document.getElementById('hidden-total');

  var calculatorState = {
    roomLabel: 'Студия',
    roomK: 1,
    workLabel: 'Косметический',
    rate: 4500,
    area: 28,
    extras: [],
    base: 0,
    total: 0
  };

  function getChecked(selector) {
    return calcForm ? calcForm.querySelector(selector + ':checked') : null;
  }

  function getCheckedExtras() {
    if (!calcForm) return [];
    return Array.prototype.slice
      .call(calcForm.querySelectorAll('input[name="extras"]:checked'))
      .map(function (input) {
        return {
          label: input.getAttribute('data-label') || input.value,
          price: parseFloat(input.getAttribute('data-price')) || 0,
          perM2: input.getAttribute('data-per-m2') === '1'
        };
      });
  }

  function syncRangeProgress() {
    if (!areaRange) return;
    var min = parseFloat(areaRange.min) || AREA_MIN;
    var max = parseFloat(areaRange.max) || AREA_MAX;
    var value = parseFloat(areaRange.value) || min;
    var progress = ((value - min) / (max - min)) * 100;
    areaRange.style.setProperty('--range-progress', progress + '%');
  }
  function calculate() {
    if (!calcForm) return;

    var roomInput = getChecked('input[name="roomType"]');
    var workInput = getChecked('input[name="workType"]');

    calculatorState.roomLabel = roomInput ? roomInput.getAttribute('data-label') : 'Квартира';
    calculatorState.roomK = roomInput ? parseFloat(roomInput.getAttribute('data-k')) || 1 : 1;
    calculatorState.workLabel = workInput ? workInput.getAttribute('data-label') : 'Ремонт';
    calculatorState.rate = workInput ? parseFloat(workInput.getAttribute('data-rate')) || 0 : 0;
    calculatorState.area = clamp(
      Math.round(parseFloat(areaRange ? areaRange.value : calculatorState.area) || AREA_MIN),
      AREA_MIN,
      AREA_MAX
    );
    calculatorState.extras = getCheckedExtras();

    var base = calculatorState.rate * calculatorState.area * calculatorState.roomK;
    var extrasSum = calculatorState.extras.reduce(function (sum, extra) {
      return sum + (extra.perM2 ? extra.price * calculatorState.area : extra.price);
    }, 0);

    calculatorState.base = roundTo(base, 100);
    calculatorState.total = roundTo(base + extrasSum, 100);

    renderSummary();
    syncFormFields();
  }

  function renderSummary() {
    var total = calculatorState.total;
    var low = roundTo(total * 0.9, 100);
    var high = roundTo(total * 1.125, 100);

    if (areaOutput) areaOutput.textContent = calculatorState.area;

    if (areaRange) {
      areaRange.setAttribute(
        'aria-valuetext',
        calculatorState.area + ' ' +
          plural(calculatorState.area, 'квадратный метр', 'квадратных метра', 'квадратных метров')
      );
    }

    if (totalPriceEl) {
      var pretty = formatMoney(total);
      if (totalPriceEl.textContent !== pretty) {
        totalPriceEl.textContent = pretty;
        if (priceBox && !prefersReducedMotion()) {
          priceBox.classList.remove('is-updated');
          void priceBox.offsetWidth;
          priceBox.classList.add('is-updated');
        }
      }
    }

    if (totalRangeEl) {
      totalRangeEl.textContent = 'от ' + formatMoney(low) + ' до ' + formatMoney(high) + ' ₽';
    }

    if (summaryWorkEl) summaryWorkEl.textContent = calculatorState.workLabel;

    if (summaryRoomEl) {
      summaryRoomEl.textContent = calculatorState.roomLabel + ' · ' + calculatorState.area + ' м²';
    }

    if (summaryBaseEl) summaryBaseEl.textContent = formatMoney(calculatorState.base) + ' ₽';

    if (summaryExtrasEl) {
      summaryExtrasEl.textContent = calculatorState.extras.length
        ? calculatorState.extras
            .map(function (extra) {
              return extra.label;
            })
            .join(', ')
        : 'не выбраны';
    }

    syncRangeProgress();
  }

  function getExtrasText() {
    return calculatorState.extras.length
      ? calculatorState.extras
          .map(function (extra) {
            return extra.label;
          })
          .join(', ')
      : 'не выбраны';
  }

  function syncFormFields() {
    if (hiddenRoom) hiddenRoom.value = calculatorState.roomLabel;
    if (hiddenWork) hiddenWork.value = calculatorState.workLabel;
    if (hiddenArea) hiddenArea.value = String(calculatorState.area);
    if (hiddenExtras) hiddenExtras.value = getExtrasText();
    if (hiddenTotal) hiddenTotal.value = String(calculatorState.total);

    if (formCalcText) {
      formCalcText.textContent =
        calculatorState.roomLabel +
        ' · ' +
        calculatorState.area +
        ' м² · ' +
        calculatorState.workLabel +
        ' · ' +
        formatMoney(calculatorState.total) +
        ' ₽';
    }
  }

  function setArea(rawValue) {
    var value = clamp(Math.round(parseFloat(rawValue) || AREA_MIN), AREA_MIN, AREA_MAX);
    if (areaRange) areaRange.value = String(value);
    if (areaNumber) areaNumber.value = String(value);
    calculatorState.area = value;
    calculate();
  }

  /* Средняя площадь для каждого типа помещения */
  var ROOM_DEFAULT_AREA = {
    studio: 28,
    '1room': 40,
    '2room': 55,
    '3room': 75
  };

  if (calcForm) {
    calcForm.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || !target.name) return;

      // при выборе типа помещения подставляем среднюю площадь и сразу пересчитываем итог
      if (target.name === 'roomType') {
        var defaultArea = ROOM_DEFAULT_AREA[target.value];
        if (defaultArea) {
          setArea(defaultArea);
          return;
        }
      }

      if (target.name === 'roomType' || target.name === 'workType' || target.name === 'extras') {
        calculate();
      }
    });

    calcForm.addEventListener('submit', function (event) {
      event.preventDefault();
      calculate();
      scrollToElement(document.getElementById('contact'));
    });
  }

  if (areaRange) {
    areaRange.addEventListener('input', function () {
      setArea(areaRange.value);
    });
  }

  if (areaNumber) {
    areaNumber.addEventListener('input', function () {
      var digits = digitsOnly(areaNumber.value);
      if (digits === '') return;
      var value = clamp(parseInt(digits, 10), AREA_MIN, AREA_MAX);
      if (areaRange) areaRange.value = String(value);
      calculatorState.area = value;
      calculate();
    });

    areaNumber.addEventListener('blur', function () {
      setArea(areaNumber.value === '' ? AREA_MIN : areaNumber.value);
    });
  }

  if (calcCta) {
    calcCta.addEventListener('click', function () {
      calculate();
    });
  }

  calculate();

  /* Кнопки-пресеты в карточках услуг */

  var presetMap = {
    full: { work: 'capital', extras: ['electric', 'plumbing', 'garbage'] },
    cosmetic: { work: 'cosmetic', extras: [] },
    electric: { work: 'cosmetic', extras: ['electric'] },
    bathroom: { work: 'capital', extras: ['plumbing'] },
    tile: { work: 'cosmetic', extras: ['plumbing'] },
    small: { work: 'cosmetic', extras: [] }
  };

  Array.prototype.forEach.call(
    document.querySelectorAll('[data-preset]'),
    function (button) {
      button.addEventListener('click', function () {
        var preset = presetMap[button.getAttribute('data-preset')];
        if (!preset || !calcForm) return;

        var workInput = calcForm.querySelector(
          'input[name="workType"][value="' + preset.work + '"]'
        );
        if (workInput) workInput.checked = true;

        Array.prototype.forEach.call(
          calcForm.querySelectorAll('input[name="extras"]'),
          function (input) {
            input.checked = preset.extras.indexOf(input.value) !== -1;
          }
        );

        calculate();
      });
    }
  );
  /* --------------------------------------------------------------------------
     Toast-уведомления
     -------------------------------------------------------------------------- */

  var toast = document.getElementById('toast');
  var toastTitle = document.getElementById('toast-title');
  var toastText = document.getElementById('toast-text');
  var toastClose = document.getElementById('toast-close');
  var toastTimer = null;

  function hideToast() {
    if (!toast) return;
    toast.classList.remove('is-visible');
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }

  function showToast(type, title, text) {
    if (!toast) return;

    if (toastTitle) toastTitle.textContent = title;
    if (toastText) toastText.textContent = text;

    toast.classList.remove('is-success', 'is-error', 'is-visible');
    toast.classList.add(type === 'error' ? 'is-error' : 'is-success');

    // перезапуск анимации прогресс-бара
    void toast.offsetWidth;
    toast.classList.add('is-visible');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
  }

  if (toastClose) {
    toastClose.addEventListener('click', hideToast);
  }

  /* --------------------------------------------------------------------------
     Маска телефона +7 (___) ___-__-__
     -------------------------------------------------------------------------- */

  var phoneInput = document.getElementById('phone');

  function formatPhone(value) {
    var digits = digitsOnly(value);

    if (digits.charAt(0) === '8') {
      digits = '7' + digits.slice(1);
    }
    if (digits.charAt(0) !== '7') {
      digits = '7' + digits;
    }
    digits = digits.slice(0, 11);

    var rest = digits.slice(1);
    var result = '+7';

    if (rest.length) result += ' (' + rest.slice(0, 3);
    if (rest.length >= 3) result += ')';
    if (rest.length > 3) result += ' ' + rest.slice(3, 6);
    if (rest.length > 6) result += '-' + rest.slice(6, 8);
    if (rest.length > 8) result += '-' + rest.slice(8, 10);

    return result;
  }

  if (phoneInput) {
    phoneInput.addEventListener('focus', function () {
      if (!phoneInput.value.trim()) phoneInput.value = '+7 (';
    });

    phoneInput.addEventListener('input', function () {
      phoneInput.value = formatPhone(phoneInput.value);
      clearFieldError(phoneInput);
    });

    phoneInput.addEventListener('keydown', function (event) {
      if (event.key !== 'Backspace') return;

      var start = phoneInput.selectionStart;
      var end = phoneInput.selectionEnd;
      if (start !== end || start === 0) return;

      var value = phoneInput.value;
      if (/\D$/.test(value.slice(0, start))) {
        event.preventDefault();
        var prefix = digitsOnly(value.slice(0, start - 1));
        phoneInput.value = formatPhone(prefix + value.slice(end));
        var caret = formatPhone(prefix).length;
        phoneInput.setSelectionRange(caret, caret);
        clearFieldError(phoneInput);
      }
    });

    phoneInput.addEventListener('blur', function () {
      if (digitsOnly(phoneInput.value).length <= 1) {
        phoneInput.value = '';
      }
    });
  }

  /* --------------------------------------------------------------------------
     Валидация формы
     -------------------------------------------------------------------------- */

  var leadForm = document.getElementById('lead-form');
  var nameInput = document.getElementById('name');
  var commentInput = document.getElementById('comment');
  var agreeInput = document.getElementById('agree');
  var agreeError = document.getElementById('agree-error');

  function getFieldWrapper(input) {
    return input ? input.closest('.field') : null;
  }

  function setFieldError(input, message) {
    var wrapper = getFieldWrapper(input);
    var errorEl = wrapper ? wrapper.querySelector('.field__error') : null;
    if (wrapper) wrapper.classList.add('has-error');
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(input) {
    var wrapper = getFieldWrapper(input);
    var errorEl = wrapper ? wrapper.querySelector('.field__error') : null;
    if (wrapper) wrapper.classList.remove('has-error');
    if (errorEl) errorEl.textContent = '';
  }

  function validateName() {
    var value = nameInput ? nameInput.value.trim() : '';
    if (value.length < 2) {
      setFieldError(nameInput, 'Укажите имя — минимум 2 символа');
      return false;
    }
    if (!/^[а-яёa-z\s'-]+$/i.test(value)) {
      setFieldError(nameInput, 'Имя может содержать только буквы');
      return false;
    }
    clearFieldError(nameInput);
    return true;
  }

  function validatePhone() {
    var digits = digitsOnly(phoneInput ? phoneInput.value : '');
    if (digits.length !== 11) {
      setFieldError(phoneInput, 'Введите телефон полностью: +7 (999) 123-45-67');
      return false;
    }
    clearFieldError(phoneInput);
    return true;
  }

  function validateAgree() {
    var ok = agreeInput ? agreeInput.checked : true;
    if (agreeError) {
      agreeError.textContent = ok ? '' : 'Без согласия на обработку данных заявку не отправить';
      agreeError.classList.toggle('is-visible', !ok);
    }
    return ok;
  }

  if (nameInput) {
    nameInput.addEventListener('input', function () {
      clearFieldError(nameInput);
    });
    nameInput.addEventListener('blur', function () {
      if (nameInput.value.trim()) validateName();
    });
  }

  if (agreeInput) {
    agreeInput.addEventListener('change', validateAgree);
  }

  /* --------------------------------------------------------------------------
     Окно успеха: готовый текст заявки + копирование и отправка в мессенджеры
     -------------------------------------------------------------------------- */

  var MASTER_PHONE = '79991234567';

  var successModal = document.getElementById('success-modal');
  var successCard = successModal
    ? successModal.querySelector('.success-modal__card')
    : null;
  var successCloseBtn = document.getElementById('success-modal-close');
  var successOkBtn = document.getElementById('success-modal-ok');
  var successCopyBtn = document.getElementById('success-copy');
  var successWhatsappLink = document.getElementById('success-whatsapp');
  var successTelegramLink = document.getElementById('success-telegram');

  var successTextEl = document.getElementById('success-text');
  var successTotalEl = document.getElementById('success-total');
  var successRangeEl = document.getElementById('success-range');

  var lastFocusedElement = null;
  var lastLeadText = '';

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  /* Готовый текст заявки для копирования и мессенджеров */
  function buildLeadText(data) {
    return [
      'Заявка на ремонт',
      'Имя: ' + (data.name || '—'),
      'Телефон: ' + (data.phone || '—'),
      'Помещение: ' + (data.roomType || '—'),
      'Тип ремонта: ' + (data.workType || '—'),
      'Площадь: ' + (data.area ? data.area + ' м²' : '—'),
      'Доп. работы: ' + (data.extras || 'не выбраны'),
      'Предварительная стоимость: ' + formatMoney(data.total || 0) + ' ₽',
      'Комментарий: ' + (data.comment || 'не указан')
    ].join('\n');
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();

    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }

    document.body.removeChild(area);
    return ok;
  }

  function openSuccessModal(data) {
    if (!successModal) return;

    var total = data.total || 0;
    var text = buildLeadText(data);

    lastLeadText = text;

    if (successTextEl) {
      // сохраняем переводы строк в тексте заявки
      successTextEl.style.whiteSpace = 'pre-line';
      successTextEl.textContent = text;
    }

    setText(successTotalEl, formatMoney(total));
    setText(
      successRangeEl,
      'Вилка по рынку: от ' +
        formatMoney(roundTo(total * 0.9, 100)) +
        ' до ' +
        formatMoney(roundTo(total * 1.125, 100)) +
        ' ₽'
    );

    if (successWhatsappLink) {
      successWhatsappLink.href =
        'https://wa.me/' + MASTER_PHONE + '?text=' + encodeURIComponent(text);
    }

    if (successTelegramLink) {
      successTelegramLink.href =
        'https://t.me/share/url?url=' +
        encodeURIComponent(window.location.href.split('#')[0]) +
        '&text=' +
        encodeURIComponent(text);
    }

    lastFocusedElement = document.activeElement;

    successModal.classList.add('is-open');
    successModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');

    // перезапуск анимации появления карточки
    if (successCard) {
      successCard.classList.remove('is-shown');
      void successCard.offsetWidth;
      successCard.classList.add('is-shown');
    }

    if (successCopyBtn) {
      successCopyBtn.focus();
    } else if (successOkBtn) {
      successOkBtn.focus();
    }
  }

  function closeSuccessModal() {
    if (!successModal || !successModal.classList.contains('is-open')) return;

    successModal.classList.remove('is-open');
    successModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  if (successModal) {
    successModal.addEventListener('click', function (event) {
      if (event.target === successModal || event.target.closest('[data-success-close]')) {
        closeSuccessModal();
      }
    });

    if (successCloseBtn) {
      successCloseBtn.addEventListener('click', closeSuccessModal);
    }

    if (successOkBtn) {
      successOkBtn.addEventListener('click', closeSuccessModal);
    }

    if (successCopyBtn) {
      var copyLabel = successCopyBtn.querySelector('.btn__label');
      var copyLabelDefault = copyLabel ? copyLabel.textContent : '';
      var copyLabelTimer = null;

      var showCopyResult = function (ok) {
        if (!copyLabel) return;
        copyLabel.textContent = ok ? 'Текст скопирован ✓' : 'Не удалось — скопируйте вручную';
        if (copyLabelTimer) clearTimeout(copyLabelTimer);
        copyLabelTimer = setTimeout(function () {
          copyLabel.textContent = copyLabelDefault;
        }, 2500);
      };

      successCopyBtn.addEventListener('click', function () {
        if (!lastLeadText) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lastLeadText).then(
            function () {
              showCopyResult(true);
            },
            function () {
              showCopyResult(fallbackCopy(lastLeadText));
            }
          );
          return;
        }

        showCopyResult(fallbackCopy(lastLeadText));
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (!successModal.classList.contains('is-open')) return;
      event.preventDefault();
      closeSuccessModal();
    });

    // не даём фокусу уйти за пределы окна, пока оно открыто
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab' || !successModal.classList.contains('is-open')) return;
      var focusable = successModal.querySelectorAll('button, [href], input, textarea, [tabindex]');
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function collectFormData() {
    return {
      name: nameInput ? nameInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : '',
      comment: commentInput ? commentInput.value.trim() : '',
      roomType: hiddenRoom ? hiddenRoom.value : '',
      workType: hiddenWork ? hiddenWork.value : '',
      area: hiddenArea ? hiddenArea.value : '',
      extras: hiddenExtras ? hiddenExtras.value : '',
      total: hiddenTotal ? parseInt(hiddenTotal.value, 10) || 0 : 0
    };
  }

  if (leadForm) {
    leadForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var isNameValid = validateName();
      var isPhoneValid = validatePhone();
      var isAgreeValid = validateAgree();

      if (!isNameValid) {
        if (nameInput) nameInput.focus();
        return;
      }
      if (!isPhoneValid) {
        if (phoneInput) phoneInput.focus();
        return;
      }
      if (!isAgreeValid) {
        showToast('error', 'Нужно согласие', 'Отметьте согласие на обработку персональных данных.');
        return;
      }

      // синхронизируем скрытые поля с текущим состоянием калькулятора
      calculate();

      var data = collectFormData();

      // Показываем окно успеха с готовым текстом заявки и кнопками отправки
      openSuccessModal(data);

      leadForm.reset();
      if (phoneInput) phoneInput.value = '';
      if (agreeInput) agreeInput.checked = true;
      clearFieldError(nameInput);
      clearFieldError(phoneInput);
      if (agreeError) {
        agreeError.textContent = '';
        agreeError.classList.remove('is-visible');
      }

      // возвращаем параметры калькулятора в скрытые поля
      calculate();
    });
  }

  /* Год в подвале */

  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
