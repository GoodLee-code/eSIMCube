(function () {
  "use strict";

  var EMPTY_DOCUMENTATION = {
    title: "",
    description: "",
    page: null,
    fields: [],
    functions: [],
    businessRules: [],
    interactions: []
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, "").replace(/[×xX]$/, "").trim();
  }

  function cleanTitle(value) {
    var text = String(value || "").replace(/[×xX]\s*$/, "").trim();
    if (text.indexOf("/") >= 0) {
      var parts = text.split("/").map(function (item) { return item.trim(); }).filter(Boolean);
      return parts[parts.length - 1] || text;
    }
    return text;
  }

  function getActivePageTitle() {
    var activeTab = document.querySelector(".tabs .tab.current");
    var title = activeTab ? cleanTitle(activeTab.textContent) : "";
    var breadcrumb = document.querySelector(".breadcrumb");
    if (!title && breadcrumb) title = cleanTitle(breadcrumb.textContent);
    return title || "页面说明";
  }

  function getVisiblePageRoot() {
    return document.querySelector(".content-card") || document.querySelector(".main") || document.body;
  }

  function cloneDocumentation(source) {
    return Object.assign({}, EMPTY_DOCUMENTATION, source || {});
  }

  function resolveDocumentation() {
    var currentTitle = getActivePageTitle();
    var configured = window.pageDocumentation;
    var registry = window.productDocRegistry || {};

    if (configured && configured.title) return cloneDocumentation(configured);
    if (registry[currentTitle]) return cloneDocumentation(registry[currentTitle]);

    var alias = Object.keys(registry).find(function (key) {
      return normalizeText(currentTitle).indexOf(normalizeText(key)) >= 0 || normalizeText(key).indexOf(normalizeText(currentTitle)) >= 0;
    });

    if (alias) return cloneDocumentation(registry[alias]);
    return cloneDocumentation({ title: currentTitle });
  }

  function renderSummary(page) {
    if (!page) return "";
    var items = [
      ["页面用途", page.usage],
      ["使用角色", page.roles],
      ["进入条件", page.entry],
      ["页面目标", page.goal]
    ].filter(function (item) { return item[1]; });

    if (!items.length) return "";
    return '<section class="product-doc-section"><h3 class="product-doc-section-title">页面说明</h3><dl class="product-doc-summary-grid">' + items.map(function (item) {
      return "<dt>" + escapeHtml(item[0]) + "</dt><dd>" + escapeHtml(item[1]) + "</dd>";
    }).join("") + "</dl></section>";
  }

  function renderFields(fields) {
    if (!fields || !fields.length) return "";
    return '<section class="product-doc-section"><h3 class="product-doc-section-title">字段说明</h3>' + fields.map(function (item) {
      var meta = [
        ["字段含义", item.description],
        ["数据来源", item.source],
        ["展示格式", item.display],
        ["是否必填", item.required],
        ["空值规则", item.empty],
        ["特殊规则", item.special]
      ].filter(function (row) { return row[1]; });

      return '<div class="product-doc-field">' +
        '<button class="product-doc-field-name js-product-doc-field" type="button" data-field="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + '</button>' +
        (meta.length ? '<dl class="product-doc-meta">' + meta.map(function (row) {
          return "<dt>" + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd>";
        }).join("") + "</dl>" : "") +
      "</div>";
    }).join("") + "</section>";
  }

  function renderFunctions(functions) {
    if (!functions || !functions.length) return "";
    return '<section class="product-doc-section"><h3 class="product-doc-section-title">功能逻辑</h3>' + functions.map(function (item) {
      return '<div class="product-doc-function"><p class="product-doc-function-title">' + escapeHtml(item.title) + '</p>' +
        '<ul class="product-doc-list">' + (item.rules || []).map(function (rule) {
          return "<li>" + escapeHtml(rule) + "</li>";
        }).join("") + "</ul></div>";
    }).join("") + "</section>";
  }

  function renderRules(rules) {
    if (!rules || !rules.length) return "";
    return '<section class="product-doc-section"><h3 class="product-doc-section-title">业务规则</h3>' + rules.map(function (rule) {
      var isWarning = typeof rule === "object" && rule.type === "warning";
      var text = typeof rule === "object" ? rule.text : rule;
      return '<div class="product-doc-rule ' + (isWarning ? "is-warning" : "") + '">' + escapeHtml(text) + '</div>';
    }).join("") + "</section>";
  }

  function renderInteractions(items) {
    if (!items || !items.length) return "";
    return '<section class="product-doc-section"><h3 class="product-doc-section-title">交互说明</h3><ul class="product-doc-list">' + items.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul></section>";
  }

  function render() {
    var docData = resolveDocumentation();
    var drawer = document.querySelector(".product-doc-drawer");
    if (!drawer) return;

    drawer.querySelector(".product-doc-title").textContent = docData.title || "页面说明";
    drawer.querySelector(".product-doc-description").textContent = docData.description || "";
    drawer.querySelector(".product-doc-body").innerHTML =
      renderSummary(docData.page) +
      renderFields(docData.fields) +
      renderFunctions(docData.functions) +
      renderRules(docData.businessRules) +
      renderInteractions(docData.interactions);
  }

  function findFieldTarget(name) {
    var normalized = normalizeText(name);
    var exact = null;

    if (window.CSS && CSS.escape) {
      exact = document.querySelector('[data-doc-field="' + CSS.escape(name) + '"]');
      if (exact) return exact;
    }

    var root = getVisiblePageRoot();
    var candidates = Array.prototype.slice.call(root.querySelectorAll("[data-doc-field], label, th, td, .field, .detail-item, .info-item, .metric-card, .status-card"));
    exact = candidates.find(function (node) {
      return normalizeText(node.getAttribute("data-doc-field") || node.textContent) === normalized;
    });
    if (exact) return exact.closest(".field, th, td, .detail-item, .info-item, .metric-card, .status-card") || exact;

    var loose = candidates.find(function (node) {
      var text = normalizeText(node.getAttribute("data-doc-field") || node.textContent);
      return text.indexOf(normalized) >= 0 || normalized.indexOf(text) >= 0;
    });
    return loose ? (loose.closest(".field, th, td, .detail-item, .info-item, .metric-card, .status-card") || loose) : null;
  }

  function highlightField(name) {
    var target = findFieldTarget(name);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    target.classList.add("product-doc-highlight");
    window.setTimeout(function () {
      target.classList.remove("product-doc-highlight");
    }, 2000);
  }

  function setOpen(open) {
    var trigger = document.querySelector(".product-doc-trigger");
    var drawer = document.querySelector(".product-doc-drawer");
    if (!trigger || !drawer) return;
    if (open) render();
    document.body.classList.toggle("product-doc-panel-open", open);
    trigger.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    drawer.classList.toggle("is-open", open);
    window.setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 260);
  }

  function createPanel() {
    if (document.querySelector(".product-doc-trigger")) return;

    var trigger = document.createElement("button");
    trigger.className = "product-doc-trigger";
    trigger.type = "button";
    trigger.textContent = "页面说明";
    trigger.setAttribute("aria-expanded", "false");

    var drawer = document.createElement("aside");
    drawer.className = "product-doc-drawer";
    drawer.setAttribute("aria-label", "产品说明侧边栏");
    drawer.innerHTML =
      '<div class="product-doc-header">' +
        '<div><h2 class="product-doc-title">页面说明</h2><p class="product-doc-description"></p></div>' +
        '<button class="product-doc-close" type="button" aria-label="关闭页面说明">×</button>' +
      '</div>' +
      '<div class="product-doc-body"></div>';

    document.body.appendChild(trigger);
    document.body.appendChild(drawer);

    trigger.addEventListener("click", function () {
      setOpen(!drawer.classList.contains("is-open"));
    });
    drawer.querySelector(".product-doc-close").addEventListener("click", function () { setOpen(false); });
    drawer.addEventListener("click", function (event) {
      var button = event.target.closest(".js-product-doc-field");
      if (!button) return;
      highlightField(button.getAttribute("data-field"));
    });
  }

  var refreshTimer = null;
  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      if (document.querySelector(".product-doc-drawer.is-open")) render();
    }, 120);
  }

  function init() {
    createPanel();
    render();

    var observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.querySelector(".app") || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "aria-selected"]
    });

    document.addEventListener("click", scheduleRefresh, true);
    window.addEventListener("hashchange", scheduleRefresh);

    window.ProductDocPanel = {
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      refresh: render,
      setDocumentation: function (documentation) {
        window.pageDocumentation = documentation;
        render();
      },
      clearDocumentation: function () {
        window.pageDocumentation = null;
        render();
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
