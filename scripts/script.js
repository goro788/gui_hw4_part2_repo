/* 
 Name: Kevin Tran
 Date: 11/26/2025
 File: script.js
*/

$(function () {
  const LIMIT_MIN = -50;
  const LIMIT_MAX = 50;
  const MAX_CELLS = 20000;

  const $form    = $("#table-form");
  const $errors  = $("#errors");
  const $preview = $("#tableContainer");
  const $clearBtn = $("#clear");
  const $tabs    = $("#tabs");
  const $tabsNav = $("#tabs-nav");

  let tabCounter = 0;

  function clearSummary() {
    $errors.text("");
  }

  function showSummaryError(message) {
    $errors.text(message);
  }

  function showSummaryInfo(message) {
    if (!message) return;
    const note = document.createElement("div");
    note.style.color = "#2563eb";
    note.style.fontWeight = "600";
    note.style.marginTop = "6px";
    note.textContent = message;
    $errors[0].appendChild(note);
  }

  function buildTable(hs, he, vs, ve) {
    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.className = "corner";
    corner.textContent = "×";
    headRow.appendChild(corner);

    for (let x = hs; x <= he; x++) {
      const th = document.createElement("th");
      th.textContent = x;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const frag = document.createDocumentFragment();

    for (let y = vs; y <= ve; y++) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = y;
      tr.appendChild(th);

      for (let x = hs; x <= he; x++) {
        const td = document.createElement("td");
        td.textContent = x * y;
        tr.appendChild(td);
      }

      frag.appendChild(tr);
    }

    tbody.appendChild(frag);
    table.appendChild(tbody);
    return table;
  }

  function getRanges() {
    const hStart = Number($("#hStart").val());
    const hEnd   = Number($("#hEnd").val());
    const vStart = Number($("#vStart").val());
    const vEnd   = Number($("#vEnd").val());

    if ([hStart, hEnd, vStart, vEnd].some(Number.isNaN)) {
      return null;
    }

    const normalize = (a, b) => (a <= b ? [a, b] : [b, a]);

    let [hs, he] = normalize(hStart, hEnd);
    let [vs, ve] = normalize(vStart, vEnd);

    const swapped =
      hs !== hStart || he !== hEnd ||
      vs !== vStart || ve !== vEnd;

    const width  = Math.abs(he - hs) + 1;
    const height = Math.abs(ve - vs) + 1;

    return { hStart, hEnd, vStart, vEnd, hs, he, vs, ve, swapped, width, height };
  }

  // Preview table
  function renderPreview() {
    clearSummary();
    $preview.empty();

    const ranges = getRanges();
    if (!ranges) return null;

    const { hs, he, vs, ve, swapped, width, height } = ranges;

    if (width * height > MAX_CELLS) {
      showSummaryError(
        `Table too large (${width}×${height}). Please use smaller ranges.`
      );
      return null;
    }

    if (swapped) {
      showSummaryInfo(
        "Start/end were reversed; ranges have been auto-corrected."
      );
    }

    const table = buildTable(hs, he, vs, ve);
    $preview.append(table);
    return ranges;
  }

  // Only render preview if the form is valid
  function updatePreviewIfValid() {
    clearSummary();
    if (!$form.valid()) {
      $preview.empty();
      return null;
    }
    return renderPreview();
  }

  //  Tabs: add / delete 

  function addTableTab(ranges) {
    tabCounter++;
    const tabId = "tab-" + tabCounter;

    // Label uses normalized ranges
    const label = `[${ranges.hs},${ranges.he}] × [${ranges.vs},${ranges.ve}]`;

    // Create tab header
    const $li = $(`
      <li>
        <a href="#${tabId}">${label}</a>
        <span class="ui-icon ui-icon-close" role="button" title="Close tab"></span>
      </li>
    `);
    $tabsNav.append($li);

    // Create tab content panel
    const $panel = $(`<div id="${tabId}"></div>`);

    const $wrapper = $('<div class="table-container"></div>');
    $wrapper.html($preview.html());   // copy table markup from preview

    $panel.append($wrapper);
    $tabs.append($panel);

    // Refresh tabs & activate the new one
    $tabs.tabs("refresh");
    const newIndex = $tabsNav.children("li").length - 1;
    $tabs.tabs("option", "active", newIndex);
  }

  // Delete a single tab 
  $tabs.on("click", "span.ui-icon-close", function () {
    const $li = $(this).closest("li");
    const href = $li.find("a").attr("href"); // e.g. "#tab-2"
    const panelId = href && href.startsWith("#") ? href.substring(1) : null;

    if (panelId) {
      $("#" + panelId).remove();
    }
    $li.remove();
    $tabs.tabs("refresh");
  });

  //Sliders

  function setupSliderPair(inputId, sliderId) {
    const $input  = $("#" + inputId);
    const $slider = $("#" + sliderId);

    // Initialize slider
    $slider.slider({
      min: LIMIT_MIN,
      max: LIMIT_MAX,
      step: 1,
      value: $input.val() !== "" ? Number($input.val()) : 0,

      // While sliding, update the input and preview
      slide: function (event, ui) {
        $input.val(ui.value);
        updatePreviewIfValid();
      },

      change: function (event, ui) {
        $input.val(ui.value);
        updatePreviewIfValid();
      },
    });

    // When typing into the input, keep the slider in sync
    $input.on("input", function () {
      const raw = $input.val();

      // If not an integer, let the validator show an error; don't move the slider yet
      if (!/^-?\d+$/.test(raw)) {
        updatePreviewIfValid(); 
        return;
      }

      let num = Number(raw);
      if (num < LIMIT_MIN) num = LIMIT_MIN;
      if (num > LIMIT_MAX) num = LIMIT_MAX;

      if (String(num) !== raw) {
        $input.val(num);
      }

      $slider.slider("value", num);
      updatePreviewIfValid();
    });
  }

  //jQuery Validation setup

  $.validator.addMethod(
    "intRange",
    function (value, element) {
      if (this.optional(element)) return true;
      if (!/^-?\d+$/.test(value)) return false;
      const num = Number(value);
      return num >= LIMIT_MIN && num <= LIMIT_MAX;
    },
    `Please enter an integer between ${LIMIT_MIN} and ${LIMIT_MAX}.`
  );

  $form.validate({
    onkeyup: false,

    errorElement: "div",
    errorClass: "field-error",

    errorPlacement: function (error, element) {
      error.appendTo(element.closest(".field"));
    },

    highlight: function (element) {
      $(element).addClass("input-error");
    },
    unhighlight: function (element) {
      $(element).removeClass("input-error");
    },

    rules: {
      hStart: { required: true, intRange: true },
      hEnd:   { required: true, intRange: true },
      vStart: { required: true, intRange: true },
      vEnd:   { required: true, intRange: true },
    },

    messages: {
      hStart: {
        required: "Please enter a starting value for the horizontal axis.",
        intRange: `Horizontal start must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}.`,
      },
      hEnd: {
        required: "Please enter an ending value for the horizontal axis.",
        intRange: `Horizontal end must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}.`,
      },
      vStart: {
        required: "Please enter a starting value for the vertical axis.",
        intRange: `Vertical start must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}.`,
      },
      vEnd: {
        required: "Please enter an ending value for the vertical axis.",
        intRange: `Vertical end must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}.`,
      },
    },

    submitHandler: function (form, event) {
      if (event) event.preventDefault();

      const ranges = renderPreview();
      if (!ranges) return;

      addTableTab(ranges);
    },
  });

  // Clear button

  $clearBtn.on("click", function () {
    const formEl = $form[0];
    formEl.reset();                        
    $form.validate().resetForm();
    $("input").removeClass("input-error");
    clearSummary();
    $preview.empty();
    $("#hStart").focus();

    // Reset sliders to 0
    $(".slider").each(function () {
      $(this).slider("value", 0);
    });
  });

  // Activate jQuery UI tabs and sliders
  $tabs.tabs();

  setupSliderPair("hStart", "hStart-slider");
  setupSliderPair("hEnd",   "hEnd-slider");
  setupSliderPair("vStart", "vStart-slider");
  setupSliderPair("vEnd",   "vEnd-slider");
});
