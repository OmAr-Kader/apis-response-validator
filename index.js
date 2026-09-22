'use strict';

// npm version patch
// npm publish --access public

/* ---------- core (framework-agnostic) ---------- */

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// "⛔️ => Missing (1), Type Mismatches (1), Extra (9)" -> icon + chip list
function parseHeaderChips(headerStr) {
  let icon = '';
  let rest = headerStr;
  const arrowIdx = headerStr.indexOf('=>');
  if (arrowIdx !== -1) {
    icon = headerStr.slice(0, arrowIdx).trim();
    rest = headerStr.slice(arrowIdx + 2).trim();
  } else {
    const m = headerStr.match(/^(\S+)\s+(.*)$/);
    if (m) { icon = m[1]; rest = m[2]; }
  }
  const parts = rest.split(',').map((s) => s.trim()).filter(Boolean);
  const chips = parts.map((p) => {
    const m = p.match(/^(.*?)\s*\((\d+)\)$/);
    return m ? { label: m[1].trim(), count: parseInt(m[2], 10) } : { label: p, count: null };
  });
  return { icon, chips };
}

function chipTone(label) {
  const l = label.toLowerCase();
  if (l.includes('missing')) return 'danger';
  if (l.includes('mismatch') || l.includes('type')) return 'warning';
  if (l.includes('extra')) return 'info';
  if (l.includes('result') || l.includes('success') || l.includes('all')) return 'success';
  return 'neutral';
}

function buildHeaderCard(headerStr) {
  const { icon, chips } = parseHeaderChips(headerStr);
  const chipsHtml = chips.map((c) => {
    const tone = chipTone(c.label);
    const countHtml = c.count !== null ? `<b>${c.count}</b>` : '';
    return `<span class="ck-chip ck-chip-${tone}">${escapeHtml(c.label)} ${countHtml}</span>`;
  }).join('');
  return `
    <div class="ck-header-card">
      ${icon ? `<span class="ck-header-icon">${escapeHtml(icon)}</span>` : ''}
      <div class="ck-header-chips">${chipsHtml}</div>
    </div>`;
}

function buildTreeHtml(value, key) {
  const id = 'n' + Math.random().toString(36).slice(2);
  const isObj = isPlainObject(value);
  const isArr = Array.isArray(value);
  const keyHtml = key !== null
    ? `<span class="ck-key">${escapeHtml(key)}</span><span class="ck-punct">:</span> `
    : '';

  if (!isObj && !isArr) {
    const type = value === null ? 'null'
      : typeof value === 'string' ? 'string'
      : typeof value === 'number' ? 'number'
      : 'boolean';
    const display = type === 'string' ? `"${escapeHtml(value)}"` : String(value);
    const copyPayload = escapeHtml(JSON.stringify(value));
    return `
      <div class="ck-row ck-leaf">
        ${keyHtml}
        <span class="ck-${type} ck-copyable" data-copy="${copyPayload}">${display}</span>
      </div>`;
  }

  const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
  const count = entries.length;
  const label = isArr ? `Array(${count})` : `Object(${count})`;
  const childrenHtml = entries.map(([k, v]) => buildTreeHtml(v, k)).join('');

  // Copy button on arrays only. Copies each value backtick-quoted, one per
  // line, comma-terminated — no array indices, no brackets:
  //   `message`,
  //   `data.offerings`,
  let copyBtnHtml = '';
  if (isArr && count) {
    const copyText = value
      .map((v) => '`' + (v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)) + '`,')
      .join('\n');
    copyBtnHtml = `<button type="button" class="ck-copy-btn" data-copy="${escapeHtml(copyText)}">Copy</button>`;
  }

  return `
    <div class="ck-row">
      <span class="ck-toggle" data-target="${id}">
        <span class="ck-arrow">&#9656;</span>
        ${keyHtml}
        <span class="ck-label">${label}</span>
      </span>
      ${copyBtnHtml}
    </div>
    <div class="ck-children" id="${id}" style="display:none">
      ${childrenHtml || '<div class="ck-row ck-empty">empty</div>'}
    </div>`;
}

const STYLE = `
<style>
  html, body {
    margin:0; padding:0; min-height:100%;
    background:#111214;
  }
  #ck-root {
    --ck-bg:#111214; --ck-bg2:#17181b; --ck-row-hover:#1b1c1f; --ck-border:#24262b;
    --ck-text:#c6c9ce; --ck-muted:#6b6f76; --ck-key:#6fb4ff;
    --ck-string:#e3b341; --ck-number:#7fe2b8; --ck-bool:#c79dff; --ck-null:#6b6f76;
    --ck-punct:#4d5058; --ck-danger:#ff8a8f; --ck-success:#7fe2b8;
    background:var(--ck-bg); color:var(--ck-text);
    font:12.5px/22px 'JetBrains Mono','SF Mono',Menlo,Consolas,monospace;
    padding:10px 8px 14px; border-radius:0;
    min-height:100vh; box-sizing:border-box;
  }
  #ck-root .ck-header-card { display:flex; align-items:center; gap:10px; background:var(--ck-bg2); border:1px solid var(--ck-border); border-radius:8px; padding:10px 12px; margin-bottom:10px; }
  #ck-root .ck-header-icon { font-size:16px; line-height:1; display:flex; align-items:center; }
  #ck-root .ck-header-chips { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
  #ck-root .ck-chip { display:inline-flex; align-items:center; gap:4px; font-size:11.5px; padding:3px 8px; border-radius:20px; border:1px solid var(--ck-border); background:rgba(255,255,255,0.03); color:var(--ck-muted); line-height:1.4; }
  #ck-root .ck-chip b { font-weight:600; }
  #ck-root .ck-chip-danger { border-color:rgba(255,138,143,.35); background:rgba(255,138,143,.08); color:var(--ck-danger); }
  #ck-root .ck-chip-warning { border-color:rgba(227,179,65,.35); background:rgba(227,179,65,.08); color:var(--ck-string); }
  #ck-root .ck-chip-info { border-color:rgba(111,180,255,.35); background:rgba(111,180,255,.08); color:var(--ck-key); }
  #ck-root .ck-chip-success { border-color:rgba(127,226,184,.35); background:rgba(127,226,184,.08); color:var(--ck-success); }
  #ck-root .ck-toolbar { display:flex; align-items:center; gap:8px; padding:2px 4px 10px; border-bottom:1px solid var(--ck-border); margin-bottom:6px; }
  #ck-root .ck-toolbar button { background:none; border:1px solid var(--ck-border); color:var(--ck-muted); font:inherit; font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; }
  #ck-root .ck-toolbar button:hover { color:var(--ck-text); border-color:#3a3d44; }
  #ck-root .ck-count { color:var(--ck-muted); font-size:11px; margin-left:auto; }
  #ck-root .ck-row { display:flex; align-items:center; padding:0 4px; border-radius:3px; white-space:nowrap; }
  #ck-root .ck-toggle { display:flex; align-items:center; cursor:pointer; flex:0 1 auto; min-width:0; }
  #ck-root .ck-row:hover { background:var(--ck-row-hover); }
  #ck-root .ck-children { margin-left:7px; padding-left:11px; border-left:1px solid var(--ck-border); }
  #ck-root .ck-arrow { display:inline-block; width:12px; color:var(--ck-muted); font-size:10px; transition:transform .12s ease; }
  #ck-root .ck-arrow.open { transform:rotate(90deg); }
  #ck-root .ck-key { color:var(--ck-key); }
  #ck-root .ck-punct { color:var(--ck-punct); }
  #ck-root .ck-label { color:var(--ck-muted); }
  #ck-root .ck-string { color:var(--ck-string); }
  #ck-root .ck-number { color:var(--ck-number); }
  #ck-root .ck-boolean { color:var(--ck-bool); }
  #ck-root .ck-null { color:var(--ck-null); font-style:italic; }
  #ck-root .ck-empty { color:var(--ck-muted); font-style:italic; padding-left:2px; }
  #ck-root .ck-copyable { cursor:pointer; border-radius:3px; }
  #ck-root .ck-copyable:hover { outline:1px dashed #3a3d44; }
  #ck-root .ck-copy-btn { flex:none; margin-left:10px; font:inherit; font-size:10.5px; color:var(--ck-muted); background:none; border:1px solid var(--ck-border); border-radius:4px; padding:2px 7px; cursor:pointer; opacity:0; transition:opacity .1s, color .1s, border-color .1s; }
  #ck-root .ck-row:hover .ck-copy-btn { opacity:1; }
  #ck-root .ck-copy-btn:hover { color:var(--ck-text); border-color:#3a3d44; }
  #ck-root .ck-copy-btn.ck-copied { color:var(--ck-success); border-color:rgba(127,226,184,.35); opacity:1; }
  #ck-root .ck-flash { color:#7fe2b8 !important; }
</style>`;

const SCRIPT = `
<script>
(function(){
  const root = document.getElementById('ck-root');
  if (!root) return;

  function copyText(text) {
    var done = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function(){ }, function(){ fallbackCopy(text); });
        done = true;
      }
    } catch (err) {}
    if (!done) fallbackCopy(text);
  }

  // Clipboard API is blocked or missing in some sandboxed iframes
  // (e.g. Postman's visualizer). execCommand works there instead.
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(ta);
  }

  root.addEventListener('click', function(e){
    const copyBtn = e.target.closest('.ck-copy-btn');
    if (copyBtn) {
      e.stopPropagation();
      copyText(copyBtn.getAttribute('data-copy') || '');
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('ck-copied');
      setTimeout(function(){ copyBtn.textContent = original; copyBtn.classList.remove('ck-copied'); }, 900);
      return;
    }
    const toggle = e.target.closest('.ck-toggle');
    if (toggle) {
      const children = document.getElementById(toggle.dataset.target);
      const arrow = toggle.querySelector('.ck-arrow');
      const open = children.style.display !== 'none';
      children.style.display = open ? 'none' : 'block';
      arrow.classList.toggle('open', !open);
      return;
    }
    const copyable = e.target.closest('.ck-copyable');
    if (copyable) {
      const raw = copyable.getAttribute('data-copy');
      let value = raw;
      try { value = JSON.parse(raw); } catch (err) {}
      const text = typeof value === 'string' ? value : String(value);
      copyText(text);
      copyable.classList.add('ck-flash');
      setTimeout(function(){ copyable.classList.remove('ck-flash'); }, 300);
    }
  });
  const expandAll = document.getElementById('ck-expand-all');
  const collapseAll = document.getElementById('ck-collapse-all');
  function setAll(open) {
    root.querySelectorAll('.ck-children').forEach(function(el){ el.style.display = open ? 'block' : 'none'; });
    root.querySelectorAll('.ck-arrow').forEach(function(el){ el.classList.toggle('open', open); });
  }
  if (expandAll) expandAll.addEventListener('click', function(){ setAll(true); });
  if (collapseAll) collapseAll.addEventListener('click', function(){ setAll(false); });
})();
</script>`;

// Main entry point: consoleKit.log(anyObject)
// Special-cases the { [headerString]: { ...sections } } shape produced by
// formatLog(): the single top-level key becomes a chip-based summary card,
// split on ",", and each section below it (missing/wrongType/extra/etc.)
// renders as a collapsible row with its own "Copy" button.
function log(obj, pm) {
  if (!pm.visualizer || typeof pm.visualizer.set !== 'function') return;

  const rootKeys = isPlainObject(obj) ? Object.keys(obj) : null;
  let headerHtml = '';
  let sectionsObj = obj;

  if (rootKeys && rootKeys.length === 1 && isPlainObject(obj[rootKeys[0]])) {
    headerHtml = buildHeaderCard(rootKeys[0]);
    sectionsObj = obj[rootKeys[0]];
  }

  const isObj = isPlainObject(sectionsObj);
  const isArr = Array.isArray(sectionsObj);

  let bodyHtml;
  let toolbarHtml = '';
  if (isObj || isArr) {
    const entries = isArr ? sectionsObj.map((v, i) => [i, v]) : Object.entries(sectionsObj);
    bodyHtml = entries.map(([k, v]) => buildTreeHtml(v, k)).join('');
    if (entries.length) {
      const noun = isArr ? 'items' : 'sections';
      toolbarHtml = `
        <div class="ck-toolbar">
          <button id="ck-expand-all" type="button">Expand all</button>
          <button id="ck-collapse-all" type="button">Collapse all</button>
          <span class="ck-count">${entries.length} ${noun}</span>
        </div>`;
    }
  } else {
    bodyHtml = buildTreeHtml(sectionsObj, null);
  }

  const html = `${STYLE}<div id="ck-root">${headerHtml}${toolbarHtml}${bodyHtml}</div>${SCRIPT}`;
  pm.visualizer.set(html);
}


const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

const resolve = (obj, path) => {
  let cur = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !has(cur, key)) return { exists: false };
    cur = cur[key];
  }
  return { exists: true, value: cur };
};

// spec: 'type' | 'a|b' | 'type?' (optional) | null/'any' | { type?, items }
const parseSpec = (spec) => {
  if (spec === null || spec === undefined) spec = 'any';
  if (typeof spec === 'string') spec = { type: spec };
  let type = spec.type || (spec.items ? 'array' : 'any');
  const optional = type.endsWith('?');
  if (optional) type = type.slice(0, -1);
  return { types: type.split('|'), optional, items: spec.items };
};

// Tree of declared paths. Each node carries its child paths (`children`) plus,
// when the spec declared `items`, the nested schema to check array elements against.
const buildSchemaTree = (schema) => {
  const root = Object.create(null);
  Object.keys(schema).forEach((path) => {
    const { items } = parseSpec(schema[path]);
    let level = root;
    const parts = path.split('.');
    parts.forEach((key, i) => {
      if (!level[key]) level[key] = { children: Object.create(null), items: null };
      if (i === parts.length - 1 && items) level[key].items = items;
      level = level[key].children;
    });
  });
  return root;
};

// Everything under obj is undeclared: record every key (and recurse through
// nested objects/arrays) as an extra field.
const markAllExtra = (obj, base, out) => {
  if (typeOf(obj) !== 'object') return;
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    const full = base + key;
    out.add(full.replace(/\[\d+\]/g, '[]'));
    if (typeOf(val) === 'object') markAllExtra(val, `${full}.`, out);
    else if (typeOf(val) === 'array') {
      val.forEach((el, i) => { if (typeOf(el) === 'object') markAllExtra(el, `${full}[${i}].`, out); });
    }
  });
};

const findExtras = (obj, tree, base, out) => {
  if (typeOf(obj) !== 'object') return;
  Object.keys(obj).forEach((key) => {
    const node = tree[key];
    const val = obj[key];
    const childBase = `${base}${key}.`;

    if (!node) { out.add((base + key).replace(/\[\d+\]/g, '[]')); return; }

    if (Object.keys(node.children).length) {
      // schema declares this path further (dotted sub-fields) - recurse normally
      findExtras(val, node.children, childBase, out);
    } else if (node.items) {
      // declared as an array with an `items` sub-schema - check()'s own
      // recursion into `items` already walks each element and reports its
      // undeclared fields, so there's nothing extra to do here.
    } else if (typeOf(val) === 'object') {
      // declared as a bare 'object' (or similar) with no inner shape given -
      // everything inside it is undeclared, so surface it as extra
      markAllExtra(val, childBase, out);
    } else if (typeOf(val) === 'array') {
      // declared as a bare 'array' with no `items` shape given - same idea,
      // per element
      val.forEach((el, i) => {
        if (typeOf(el) === 'object') markAllExtra(el, `${base}${key}[${i}].`, out);
      });
    }
  });
};

const check = (node, schema, base, r) => {
  Object.entries(schema).forEach(([path, rawSpec]) => {
    const full = base + path;
    const { types, optional, items } = parseSpec(rawSpec);
    const res = resolve(node, path);

    if (!res.exists) {
      if (!optional) r.missing.push(full);
      return;
    }

    const actual = typeOf(res.value);
    if (!types.includes('any') && !types.includes(actual)) {
      r.wrongType.push(`${full} (expected ${types.join('|')}, got ${actual})`);
      return;
    }

    if (items && actual === 'array') {
      res.value.forEach((el, i) => {
        if (typeOf(el) !== 'object') {
          r.wrongType.push(`${full}[${i}] (expected object, got ${typeOf(el)})`);
          return;
        }
        check(el, items, `${full}[${i}].`, r);
      });
    }
  });

  findExtras(node, buildSchemaTree(schema), base, r.extra);
};

/** Pure function. Never throws on validation failure. */
function validate(body, schema) {
  const r = { missing: [], wrongType: [], extra: new Set() };
  check(body, schema, '', r);
  return {
    valid: r.missing.length === 0 && r.wrongType.length === 0,
    missing: r.missing,
    wrongType: r.wrongType,
    extra: [...r.extra] // informational only, does not affect `valid`
  };
}

/** Human-readable report for a validate() result. */
function formatReport_({ missing, wrongType, extra }) {
  const section = (icon, title, list) =>
    `${icon} ${title} (${list.length}):\n  - ${list.join('\n  - ')}`;
  const out = [];
  if (missing.length) out.push(section('❌ ', 'Missing fields', missing));
  if (wrongType.length) out.push(section('⚠️ ', 'Type mismatches', wrongType));
  if (!missing.length && !wrongType.length) out.push('✅ All fields exist with expected types');
  if (extra.length) out.push(section('ℹ️ ', 'Extra fields not in schema', extra));
  return out.join('\n');
}

function formatReport({ missing, wrongType, extra }) {
  const report = {};

  if (missing.length) {
    report['❌ Missing fields'] = missing;
  }

  if (wrongType.length) {
    report['⚠️ Type mismatches'] = wrongType;
  }

  if (extra.length) {
    report['ℹ️ Extra fields'] = extra;
  }

  if (!Object.keys(report).length) {
    report['✅ Result'] = 'All fields exist with expected types';
  }

  return report;
}

/** Throws an Error carrying the report (and `err.result`) if invalid. Works with any test runner. */
function assertValid(body, schema) {
  const result = validate(body, schema);
  if (!result.valid) {
    const err = new Error(`Response validation failed\n${formatReport(result)}`);
    err.result = result;
    throw err;
  }
  return result;
}

/* ---------- URL spliterator ---------- */

/**
 * Extracts a portion of the request URL based on optional prefix/suffix markers.
 *  - prefix only : returns everything after the first occurrence of prefix
 *  - suffix only : returns everything before the first occurrence of suffix
 *  - both        : returns what lies between prefix and suffix
 *  - neither     : returns null (no URL part is displayed)
 * Returns null when a provided marker cannot be located.
 */
function extractUrlPart(url, prefix, suffix) {
  if (!prefix && !suffix) return null;
  let start = 0;
  let end = url.length;

  if (prefix) {
    const i = url.indexOf(prefix);
    if (i === -1) return null;
    start = i + prefix.length;
  }
  if (suffix) {
    const j = url.indexOf(suffix, start);
    if (j === -1) return null;
    end = j;
  }
  return url.slice(start, end);
}

/* ---------- Postman adapter ---------- */


function formatLog({ header, missing, wrongType, extra }) {
  const report = {};

  if (missing.length) {
    report['❌ Missing fields'] = missing;
  }

  if (wrongType.length) {
    report['⚠️ Type mismatches'] = wrongType;
  }

  if (extra.length) {
    report['ℹ️ Extra fields'] = extra;
  }

  if (!Object.keys(report).length) {
    report['✅ Result'] = 'All fields exist with expected types';
  }


  return {
    [header]: report
  };
}

function createPostmanAsserter(pm, urlPrefix, urlSuffix) {
  const getUrlPart = () => {
    try {
      const url = pm.request.url.toString();
      return extractUrlPart(url, urlPrefix, urlSuffix);
    } catch (_) {
      return null;
    }
  };

  return {
    assertFields(body, schema) {
      const result = validate(body, schema);

      const x = result.missing.length;
      const y = result.wrongType.length;
      const z = result.extra.length;

      // Icon logic:
      //   ⛔️  -> missing (X) is not zero
      //   ⚠️  -> X is zero but Y or Z is not zero
      //   ✅  -> all zero
      let icon;
      if (x > 0) icon = '⛔️ ';
      else if (y > 0 || z > 0) icon = '⚠️ ';
      else icon = '✅ ';

      const urlPart = getUrlPart();
      const label = urlPart ? `\`${urlPart}\`` : '';
      const header = `${icon} ${label} => Missing (${x}), Type Mismatches (${y}), Extra (${z})`.replace(/\s+/g, ' ').trim();

      console.log({[header]: formatReport(result)});
      log(formatLog({ header, ...result }), pm);

      pm.test('All required fields exist', () => {
        pm.expect(result.missing.length, `Missing: ${result.missing.join(', ')}`).to.equal(0);
      });
      pm.test('All fields have expected types', () => {
        pm.expect(result.wrongType.length, `Mismatch: ${result.wrongType.join(', ')}`).to.equal(0);
      });

      return result;
    }
  };
}

module.exports = { validate, formatReport, assertValid, createPostmanAsserter, consoleKit: { log } };