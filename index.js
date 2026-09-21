'use strict';

// npm version patch
// npm publish --access public

/* ---------- core (framework-agnostic) ---------- */


function buildTreeHtml(value, key, depth) {
  const id = 'n' + Math.random().toString(36).slice(2);
  const isObj = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArr = Array.isArray(value);

  if (!isObj && !isArr) {
    const type = value === null ? 'null'
      : typeof value === 'string' ? 'string'
      : typeof value === 'number' ? 'number'
      : 'boolean';
    const display = type === 'string' ? `"${value}"` : String(value);
    return `
      <div class="ck-node" style="margin-left:${depth * 14}px">
        ${key !== null ? `<span class="ck-key">${key}</span><span class="ck-punct">: </span>` : ''}
        <span class="ck-${type}">${display}</span>
      </div>`;
  }

  const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
  const label = isArr ? `Array(${entries.length})` : `Object`;

  const childrenHtml = entries
    .map(([k, v]) => buildTreeHtml(v, k, depth + 1))
    .join('');

  return `
    <div class="ck-node" style="margin-left:${depth * 14}px">
      <span class="ck-toggle" data-target="${id}">
        <span class="ck-arrow">▶</span>
        ${key !== null ? `<span class="ck-key">${key}</span><span class="ck-punct">: </span>` : ''}
        <span class="ck-label">${label}</span>
      </span>
      <div class="ck-children" id="${id}" style="display:none">
        ${childrenHtml}
      </div>
    </div>`;
}

const STYLE = `
<style>
  body { background:#1e1e1e; margin:0; }
  #ck-root { font-family:'Menlo','Consolas',monospace; font-size:12px; color:#ccc; padding:8px; }
  .ck-node { line-height:20px; white-space:nowrap; }
  .ck-toggle { cursor:pointer; }
  .ck-toggle:hover { background:#2a2a2a; }
  .ck-arrow { display:inline-block; width:10px; color:#888; transition:transform .1s; }
  .ck-arrow.open { transform:rotate(90deg); }
  .ck-key { color:#9cdcfe; }
  .ck-punct { color:#808080; }
  .ck-label { color:#888; }
  .ck-string { color:#ce9178; }
  .ck-number { color:#b5cea8; }
  .ck-boolean { color:#569cd6; }
  .ck-null { color:#808080; }
</style>`;

const SCRIPT = `
<script>
  document.getElementById('ck-root').addEventListener('click', (e) => {
    const toggle = e.target.closest('.ck-toggle');
    if (!toggle) return;
    const children = document.getElementById(toggle.dataset.target);
    const arrow = toggle.querySelector('.ck-arrow');
    const open = children.style.display !== 'none';
    children.style.display = open ? 'none' : 'block';
    arrow.classList.toggle('open', !open);
  });
</script>`;

// Main entry point: consoleKit.log(anyObject)
function log(obj, pm) {
  if (!pm.visualizer || typeof pm.visualizer.set !== 'function') return;
  const isObj = obj !== null && typeof obj === 'object' && !Array.isArray(obj);
  const isArr = Array.isArray(obj);

  let rootHtml;
  if (isObj || isArr) {
      // Render children directly, skipping the root Object/Array wrapper
      const entries = isArr
          ? obj.map((v, i) => [i, v])
          : Object.entries(obj);
      rootHtml = entries
          .map(([k, v]) => buildTreeHtml(v, k, 0))
          .join('');
  } else {
      // Primitive root — fall back to single-node render
      rootHtml = buildTreeHtml(obj, null, 0);
  }

  const html = `${STYLE}<div id="ck-root">${rootHtml}</div>${SCRIPT}`;
  if (pm.visualizer && typeof pm.visualizer.set === 'function') {
      pm.visualizer.set(html);
  }
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