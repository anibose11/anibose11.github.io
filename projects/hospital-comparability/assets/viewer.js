/*
 * Hospital comparability viewer.
 * Mounts into <section id="viewer" data-base="assets/data/"> and reads the
 * JSON files written by hospcomp.viewer.export. The browser only filters and
 * sorts the frozen snapshot; every number shown comes from those files.
 * Plain ES2019, no dependencies, no network requests beyond the data folder.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SRC_COLS = { score_src: true, lower_src: true, upper_src: true };
  var uid = 0;

  /* ---------- small helpers ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    setAttrs(node, attrs);
    append(node, children);
    return node;
  }

  function svg(tag, attrs, children) {
    var node = document.createElementNS(SVG_NS, tag);
    setAttrs(node, attrs);
    append(node, children);
    return node;
  }

  function setAttrs(node, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = String(v);
      else if (k === 'className') node.setAttribute('class', v);
      else node.setAttribute(k, v === true ? '' : String(v));
    });
  }

  function append(node, children) {
    if (children === null || children === undefined) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function fmt(v, d) {
    if (v === null || v === undefined) return '';
    var s = Number(v).toFixed(d);
    return s === '-' + (0).toFixed(d) ? (0).toFixed(d) : s;
  }

  function int(n) {
    return Number(n).toLocaleString('en-US');
  }

  function pct(share) {
    return (share * 100).toFixed(1) + '%';
  }

  function capital(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function cmpText(a, b) {
    a = a || '';
    b = b || '';
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function cmpNum(a, b) {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  }

  function getJSON(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.json();
    });
  }

  function niceStep(span, target) {
    var raw = span / Math.max(1, target);
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var m = raw / p;
    var s = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
    return s * p;
  }

  function stepDecimals(step) {
    var s = String(Number(step.toFixed(6)));
    var dot = s.indexOf('.');
    return dot < 0 ? 0 : Math.min(4, s.length - dot - 1);
  }

  var measureCtx = null;

  function textWidth(text, font) {
    if (!measureCtx) {
      var canvas = document.createElement('canvas');
      measureCtx = canvas.getContext ? canvas.getContext('2d') : null;
    }
    if (!measureCtx) return text.length * 7.5;
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }

  function fitText(text, maxWidth, font) {
    if (textWidth(text, font) <= maxWidth) return text;
    var lo = 1;
    var hi = text.length;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      if (textWidth(text.slice(0, mid).replace(/\s+$/, '') + '\u2026', font) <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo).replace(/\s+$/, '') + '\u2026';
  }

  /* ---------- data decoding ---------- */

  function decodeState(file, state) {
    var block = file.states[state];
    if (!block) return { rows: [], pairs: null };
    var cols = file.cols;
    var lk = file.lk;
    var rows = block.r.map(function (a) {
      var o = {};
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        var v = i < a.length ? a[i] : null;
        if (v === undefined) v = null;
        if (SRC_COLS[c]) {
          v = typeof v === 'number' ? lk.src[v] : v === null ? '' : v;
        } else if (lk[c] && v !== null) {
          v = lk[c][v];
        }
        o[c] = v;
      }
      o.state = state;
      return o;
    });
    return { rows: rows, pairs: block.pairs || null };
  }

  function footnoteCodes(src) {
    if (!src) return [];
    return String(src).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* ---------- the viewer ---------- */

  function Viewer(root) {
    this.root = root;
    this.base = root.getAttribute('data-base') || 'assets/data/';
    if (this.base.charAt(this.base.length - 1) !== '/') this.base += '/';
    this.id = 'hcv' + (++uid);
    this.cache = {};
    this.sort = { key: 'score', dir: 1 };
    this.activeRow = 0;
    this.lastWidth = 0;
    this.build();
    this.loadIndex();
  }

  Viewer.prototype.build = function () {
    var id = this.id;
    this.root.classList.add('hc-viewer');
    this.app = el('div', { className: 'hc-app', 'aria-busy': 'true' });

    this.selRelease = el('select', { id: id + '-release', className: 'hc-select' });
    this.selMeasure = el('select', { id: id + '-measure', className: 'hc-select' });
    this.selState = el('select', { id: id + '-state', className: 'hc-select' });
    var controls = el('div', { className: 'hc-controls' }, [
      el('div', { className: 'hc-control' }, [
        el('label', { 'for': id + '-release', text: 'Release' }), this.selRelease]),
      el('div', { className: 'hc-control' }, [
        el('label', { 'for': id + '-measure', text: 'Measure' }), this.selMeasure]),
      el('div', { className: 'hc-control' }, [
        el('label', { 'for': id + '-state', text: 'State or territory' }), this.selState])
    ]);

    this.status = el('div', { className: 'hc-status', role: 'status', 'aria-live': 'polite' },
      el('p', { text: 'Loading the snapshot files.' }));
    this.notice = el('div', { className: 'hc-notice', role: 'note', hidden: true });
    this.chartBlock = el('div', { className: 'hc-chart-block' });
    this.tableBlock = el('div', { className: 'hc-table-block' });
    this.otherBlock = el('div', { className: 'hc-table-block' });
    this.defs = el('div', { className: 'hc-defs' });

    append(this.app, [controls, this.status, this.notice, this.chartBlock, this.tableBlock, this.otherBlock, this.defs]);
    this.root.appendChild(this.app);

    var self = this;
    this.selRelease.addEventListener('change', function () { self.onRelease(); });
    this.selMeasure.addEventListener('change', function () { self.onMeasure(); });
    this.selState.addEventListener('change', function () { self.render(); });
    var timer = null;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var w = self.chartWidth();
        if (self.current && Math.abs(w - self.lastWidth) > 24) self.renderChart();
      }, 150);
    });
  };

  Viewer.prototype.fail = function (err) {
    this.app.setAttribute('aria-busy', 'false');
    this.app.classList.remove('hc-loading');
    clear(this.status);
    append(this.status, el('p', { className: 'hc-error',
      text: 'The snapshot files could not be loaded, so the views are not available here. ' +
        'The full tables are in the downloads on this page.' }));
    if (window.console && err) window.console.error(err);
  };

  Viewer.prototype.loadIndex = function () {
    var self = this;
    getJSON(this.base + 'viewer_index.json').then(function (index) {
      self.index = index;
      self.releaseByKey = {};
      index.releases.forEach(function (r) { self.releaseByKey[r.key] = r; });
      self.measureById = {};
      index.measures.forEach(function (m) { self.measureById[m.id] = m; });
      self.fillReleases();
      self.selRelease.value = index.default_release;
      self.fillMeasures(index.default_measure);
      self.fillStates(index.default_state);
      self.render();
    }).catch(function (err) { self.fail(err); });
  };

  Viewer.prototype.releaseOptionLabel = function (r) {
    var role = r.role === 'primary' ? 'primary release' : r.role === 'current' ? 'current release' : r.role + ' release';
    var status = r.interval_status === 'published' ? 'intervals published'
      : r.interval_status === 'suppressed_by_cms_notice' ? 'intervals suppressed by CMS'
      : r.interval_status === 'flagged_by_cms_notice' ? 'intervals flagged by CMS' : r.interval_status;
    return r.key + ', ' + role + ', ' + status;
  };

  Viewer.prototype.fillReleases = function () {
    var self = this;
    clear(this.selRelease);
    this.index.releases.forEach(function (r) {
      if (!r.measures || !r.measures.length) return;
      self.selRelease.appendChild(el('option', { value: r.key, text: self.releaseOptionLabel(r) }));
    });
  };

  Viewer.prototype.fillMeasures = function (preferred) {
    var self = this;
    var rel = this.releaseByKey[this.selRelease.value];
    clear(this.selMeasure);
    rel.measures.forEach(function (mid) {
      var m = self.measureById[mid];
      self.selMeasure.appendChild(el('option', { value: mid, text: m.label + ' (' + mid + ')' }));
    });
    var pick = rel.measures.indexOf(preferred) >= 0 ? preferred
      : rel.measures.indexOf(this.index.default_measure) >= 0 ? this.index.default_measure : rel.measures[0];
    this.selMeasure.value = pick;
  };

  Viewer.prototype.stateList = function () {
    var byRel = this.index.states[this.selRelease.value] || {};
    return byRel[this.selMeasure.value] || [];
  };

  Viewer.prototype.fillStates = function (preferred) {
    var rel = this.releaseByKey[this.selRelease.value];
    var list = this.stateList().slice().sort(function (p, q) { return cmpText(p.name, q.name); });
    var self = this;
    clear(this.selState);
    list.forEach(function (s) {
      var tail = rel.intervals_usable
        ? int(s.compatible) + ' of ' + int(s.requested) + ' compatible'
        : int(s.scored || 0) + ' of ' + int(s.requested) + ' with a published score';
      self.selState.appendChild(el('option', { value: s.s, text: s.name + ' (' + s.s + '), ' + tail }));
    });
    var codes = list.map(function (s) { return s.s; });
    this.selState.value = codes.indexOf(preferred) >= 0 ? preferred
      : codes.indexOf(this.index.default_state) >= 0 ? this.index.default_state : codes[0];
  };

  Viewer.prototype.onRelease = function () {
    var keepMeasure = this.selMeasure.value;
    var keepState = this.selState.value;
    this.fillMeasures(keepMeasure);
    this.fillStates(keepState);
    this.render();
  };

  Viewer.prototype.onMeasure = function () {
    var keepState = this.selState.value;
    this.fillStates(keepState);
    this.render();
  };

  Viewer.prototype.loadFile = function (rk, mid) {
    var name = this.index.files[rk][mid];
    if (!this.cache[name]) {
      var self = this;
      this.cache[name] = getJSON(this.base + name).catch(function (err) {
        delete self.cache[name];
        throw err;
      });
    }
    return this.cache[name];
  };

  Viewer.prototype.render = function () {
    var self = this;
    var rk = this.selRelease.value;
    var mid = this.selMeasure.value;
    var st = this.selState.value;
    var token = rk + '|' + mid + '|' + st;
    this.token = token;
    this.app.classList.add('hc-loading');
    this.app.setAttribute('aria-busy', 'true');
    this.loadFile(rk, mid).then(function (file) {
      if (self.token !== token) return;
      var decoded = decodeState(file, st);
      var counts = null;
      self.stateList().forEach(function (s) { if (s.s === st) counts = s; });
      self.current = {
        release: self.releaseByKey[rk],
        measure: self.measureById[mid],
        file: file,
        state: st,
        counts: counts,
        rows: decoded.rows,
        pairs: decoded.pairs
      };
      self.activeRow = 0;
      self.renderAll();
      self.app.classList.remove('hc-loading');
      self.app.setAttribute('aria-busy', 'false');
    }).catch(function (err) { if (self.token === token) self.fail(err); });
  };

  Viewer.prototype.renderAll = function () {
    var c = this.current;
    var usable = c.release.intervals_usable;
    var rows = c.rows;
    c.compatible = rows.filter(function (r) { return r.compatible === 1; });
    if (usable) {
      c.listed = c.compatible;
      c.excluded = rows.filter(function (r) { return r.compatible !== 1; });
    } else {
      c.listed = rows.filter(function (r) { return r.score !== null && !r.other_gate; });
      c.excluded = rows;
    }
    this.renderStatus();
    this.renderNotice();
    this.renderChart();
    this.renderTable();
    this.renderExcluded();
    this.renderDefs();
  };

  Viewer.prototype.stateName = function () {
    var c = this.current;
    return c.counts ? c.counts.name : c.state;
  };

  Viewer.prototype.renderStatus = function () {
    var c = this.current;
    var m = c.measure;
    var rk = c.release.key;
    var win = m.windows[rk];
    var counts = c.counts || { requested: c.rows.length, compatible: c.compatible.length };
    var lines = [];

    lines.push(el('p', null, [
      el('strong', { text: 'Release: ' }), c.release.label + '. ',
      el('strong', { text: 'Window: ' }),
      win ? win.start + ' to ' + win.end + ' (' + win.months + ' months). ' : 'not recorded. ',
      el('strong', { text: 'Quantity: ' }),
      m.quantity + ', ' + m.unit + '; ' + m.favorable + ' values are more favorable.'
    ]));

    var countText = int(counts.requested) + ' requested, ' + int(counts.compatible) + ' compatible';
    if (!c.release.intervals_usable) countText += ', ' + int(counts.scored || 0) + ' with a published score';
    countText += '. ';

    var pairText;
    if (!c.release.intervals_usable) {
      pairText = 'none, because no record in this release passes the release gate (G0).';
    } else if (!c.pairs || c.compatible.length < 2) {
      pairText = 'none, because fewer than two hospitals in this state are compatible.';
    } else {
      var p = c.pairs;
      pairText = int(p.pairs) + ' same-state pairs, ' + int(p.point_ordered_pairs) + ' point-ordered, ' +
        int(p.sep_r1_count) + ' separated under R1 (strict non-overlap)';
      pairText += p.point_ordered_pairs > 0 && p.not_separated_r1_share !== null
        ? '; ' + pct(p.not_separated_r1_share) + ' of point-ordered pairs not separated.'
        : '; no point-ordered pairs.';
    }
    lines.push(el('p', null, [
      el('strong', { text: 'Records in ' + this.stateName() + ': ' }), countText,
      el('strong', { text: 'Pairs: ' }), pairText
    ]));
    lines.push(el('p', { className: 'hc-snapshot' }, [
      'These views filter a frozen snapshot (run ', el('code', { text: this.index.run_id }),
      '); nothing is recomputed in the browser.'
    ]));
    clear(this.status);
    append(this.status, lines);
  };

  Viewer.prototype.renderNotice = function () {
    var r = this.current.release;
    clear(this.notice);
    if (r.intervals_usable) {
      this.notice.hidden = true;
      return;
    }
    this.notice.hidden = false;
    var source = r.notice
      ? (r.notice_url
        ? el('a', { href: r.notice_url, rel: 'noopener', text: r.notice })
        : document.createTextNode(r.notice))
      : null;
    append(this.notice, [
      el('p', { className: 'hc-notice-title', text: 'Intervals are not usable in this release.' }),
      el('p', null, ['Release status note: \u201c' + r.status_note + '\u201d',
        source ? ' Source: ' : null, source, source ? '.' : null]),
      el('p', { text: 'The table lists the published scores with their intervals marked as not published. ' +
        'There is no interval chart and no rank: a rank is shown only with its interval-compatible range, ' +
        'and that range needs published intervals.' })
    ]);
  };

  /* ---------- chart ---------- */

  Viewer.prototype.chartWidth = function () {
    var w = this.chartBlock.clientWidth || this.root.clientWidth || 640;
    return Math.max(300, Math.min(1200, Math.round(w)));
  };

  Viewer.prototype.renderChart = function () {
    var self = this;
    var c = this.current;
    var block = this.chartBlock;
    clear(block);
    this.rowNodes = [];
    if (!c.release.intervals_usable) {
      block.hidden = true;
      return;
    }
    block.hidden = false;
    var m = c.measure;
    var d = c.file.decimals;
    var stateName = this.stateName();
    append(block, el('h3', { className: 'hc-h', text: 'Published scores and 95% intervals in ' + stateName }));

    var rows = c.compatible.slice().sort(function (a, b) {
      return cmpNum(a.score, b.score) || cmpText(a.facility_id, b.facility_id);
    });
    if (!rows.length) {
      append(block, el('p', { className: 'hc-empty',
        text: 'No hospital in this state passes every gate for this measure, so there is no chart.' }));
      return;
    }

    var ref = m.national ? m.national[c.release.key] : null;
    append(block, el('p', { className: 'hc-legend' }, [
      el('span', { className: 'hc-key' }, [el('span', { className: 'hc-key-dot', 'aria-hidden': 'true' }), 'Published score']),
      el('span', { className: 'hc-key' }, [el('span', { className: 'hc-key-line', 'aria-hidden': 'true' }), '95% interval']),
      ref ? el('span', { className: 'hc-key' }, [el('span', { className: 'hc-key-ref', 'aria-hidden': 'true' }), ref.label]) : null
    ]));

    var W = this.chartWidth();
    this.lastWidth = W;
    var n = rows.length;
    var labelW = W >= 620 ? Math.round(Math.min(260, W * 0.3)) : 0;
    var rowH = n <= 40 ? 18 : n <= 90 ? 15 : n <= 160 ? 12 : 10;
    var topAxis = n > 25;
    var mL = labelW + 12;
    var mR = 18;
    var mT = topAxis ? 30 : 12;
    var mB = 62;
    var plotW = W - mL - mR;
    var H = mT + n * rowH + mB;

    var lo = Infinity;
    var hi = -Infinity;
    rows.forEach(function (r) {
      lo = Math.min(lo, r.lower, r.score);
      hi = Math.max(hi, r.upper, r.score);
    });
    if (ref) {
      lo = Math.min(lo, ref.value);
      hi = Math.max(hi, ref.value);
    }
    if (hi === lo) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.04;
    var x0 = lo - pad;
    var x1 = hi + pad;
    var step = niceStep(x1 - x0, W < 480 ? 4 : 7);
    var tickDec = stepDecimals(step);
    var x = function (v) { return mL + (v - x0) / (x1 - x0) * plotW; };
    var y = function (i) { return mT + i * rowH + rowH / 2; };

    var chartLabel = 'Interval chart of ' + n + ' compatible hospitals in ' + stateName + ' for ' + m.label +
      ', sorted by score with the lowest at the top. Use the arrow keys to move between hospitals.';
    var root = svg('svg', {
      className: 'hc-chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H,
      role: 'group', 'aria-label': chartLabel, preserveAspectRatio: 'xMidYMin meet'
    });

    var grid = svg('g', { className: 'hc-grid', 'aria-hidden': 'true' });
    var ticks = [];
    for (var k = Math.ceil(x0 / step); k * step <= x1; k++) ticks.push(k * step);
    ticks.forEach(function (tv) {
      var gx = x(tv);
      grid.appendChild(svg('line', { x1: gx, x2: gx, y1: mT, y2: mT + n * rowH, className: 'hc-gridline' }));
      grid.appendChild(svg('text', { x: gx, y: mT + n * rowH + 16, className: 'hc-tick', 'text-anchor': 'middle',
        text: fmt(tv, tickDec) }));
      if (topAxis) {
        grid.appendChild(svg('text', { x: gx, y: mT - 10, className: 'hc-tick', 'text-anchor': 'middle',
          text: fmt(tv, tickDec) }));
      }
    });
    grid.appendChild(svg('line', { x1: mL, x2: mL + plotW, y1: mT + n * rowH, y2: mT + n * rowH, className: 'hc-axisline' }));
    grid.appendChild(svg('text', { x: mL + plotW / 2, y: mT + n * rowH + 52, className: 'hc-axis-label',
      'text-anchor': 'middle', text: capital(m.unit) + ' (' + m.favorable + ' is more favorable)' }));
    root.appendChild(grid);

    if (ref) {
      var rx = x(ref.value);
      root.appendChild(svg('line', { x1: rx, x2: rx, y1: mT - (topAxis ? 0 : 4), y2: mT + n * rowH,
        className: 'hc-ref', 'aria-hidden': 'true' }));
    }

    var labelFont = '11px ' + (window.getComputedStyle(this.root).fontFamily || 'sans-serif');
    var dotR = Math.max(3, Math.min(4, rowH * 0.28));
    var group = svg('g', { className: 'hc-rows' });
    this.activeRow = Math.max(0, Math.min(n - 1, this.activeRow || 0));
    var active = this.activeRow;
    rows.forEach(function (r, i) {
      var cy = y(i);
      var g = svg('g', {
        className: 'hc-row', tabindex: i === active ? '0' : '-1', role: 'img',
        'aria-label': self.rowSentence(r, d)
      });
      g.appendChild(svg('rect', { className: 'hc-hit', x: 0, y: cy - rowH / 2, width: W, height: rowH }));
      if (labelW) {
        g.appendChild(svg('text', { className: 'hc-row-label', x: labelW, y: cy + 4, 'text-anchor': 'end',
          text: fitText(r.facility_name || r.facility_id, labelW - 6, labelFont) }));
      }
      g.appendChild(svg('line', { className: 'hc-interval', x1: x(r.lower), x2: x(r.upper), y1: cy, y2: cy }));
      g.appendChild(svg('circle', { className: 'hc-dot', cx: x(r.score), cy: cy, r: dotR }));
      g.addEventListener('mouseenter', function (ev) { self.showTip(r, g, ev); });
      g.addEventListener('mousemove', function (ev) { self.moveTip(ev); });
      g.addEventListener('mouseleave', function () { if (document.activeElement !== g) self.hideTip(); });
      g.addEventListener('focus', function () {
        var prev = self.rowNodes[self.activeRow];
        if (prev && prev !== g) prev.setAttribute('tabindex', '-1');
        g.setAttribute('tabindex', '0');
        self.activeRow = i;
        self.showTip(r, g, null);
      });
      g.addEventListener('blur', function () { self.hideTip(); });
      group.appendChild(g);
      self.rowNodes.push(g);
    });
    root.appendChild(group);

    if (ref) {
      var lx = x(ref.value);
      var anchor = lx > mL + plotW * 0.75 ? 'end' : lx < mL + plotW * 0.25 ? 'start' : 'middle';
      root.appendChild(svg('text', { x: anchor === 'end' ? lx - 4 : anchor === 'start' ? lx + 4 : lx,
        y: mT + n * rowH + 32, className: 'hc-ref-label', 'text-anchor': anchor, 'aria-hidden': 'true',
        text: ref.kind === 'national_rate' ? 'National ' + ref.src : 'No excess days' }));
    }

    root.addEventListener('keydown', function (ev) { self.onChartKey(ev); });

    this.tip = el('div', { className: 'hc-tip', 'aria-hidden': 'true', hidden: true });
    var wrap = el('div', { className: 'hc-chart-wrap' }, [root, this.tip]);
    this.chartWrap = wrap;
    append(block, wrap);
    append(block, el('p', { className: 'hc-hint', text: 'Hover over a row, or press Tab to reach the chart and use the ' +
      'arrow keys, to see the hospital, its interval, its point rank and its interval-compatible rank range. ' +
      'The same values are in the table below.' }));
  };

  Viewer.prototype.rowSentence = function (r, d) {
    var c = this.current;
    return r.facility_name + ', ID ' + r.facility_id + '. Score ' + fmt(r.score, d) + ', 95% interval ' +
      fmt(r.lower, d) + ' to ' + fmt(r.upper, d) + ' ' + c.measure.unit + '. Point rank ' + r.point_rank + ' of ' +
      r.n + '; interval-compatible rank range ' + r.best_rank + ' to ' + r.worst_rank + '. CMS category: ' +
      (r.compared_to_national_src || 'none') + '.';
  };

  Viewer.prototype.onChartKey = function (ev) {
    var nodes = this.rowNodes || [];
    if (!nodes.length) return;
    var i = this.activeRow;
    var next = i;
    var page = 10;
    switch (ev.key) {
      case 'ArrowDown': case 'Down': next = i + 1; break;
      case 'ArrowUp': case 'Up': next = i - 1; break;
      case 'PageDown': next = i + page; break;
      case 'PageUp': next = i - page; break;
      case 'Home': next = 0; break;
      case 'End': next = nodes.length - 1; break;
      case 'Escape': case 'Esc': this.hideTip(); return;
      default: return;
    }
    ev.preventDefault();
    next = Math.max(0, Math.min(nodes.length - 1, next));
    if (next === i && document.activeElement === nodes[i]) return;
    nodes[i].setAttribute('tabindex', '-1');
    nodes[next].setAttribute('tabindex', '0');
    this.activeRow = next;
    nodes[next].focus();
  };

  Viewer.prototype.tipContent = function (r) {
    var c = this.current;
    var d = c.file.decimals;
    var fn = footnoteCodes(r.footnote_src);
    return [
      el('p', { className: 'hc-tip-value' }, [
        el('strong', { text: fmt(r.score, d) }),
        ' (95% interval ' + fmt(r.lower, d) + ' to ' + fmt(r.upper, d) + ')']),
      el('p', { className: 'hc-tip-unit', text: capital(c.measure.unit) }),
      el('p', { className: 'hc-tip-name', text: r.facility_name }),
      el('p', { text: 'ID ' + r.facility_id + ', ' + (r.hospital_type || 'type not recorded') }),
      el('p', { text: 'Point rank ' + r.point_rank + ' of ' + r.n }),
      el('p', { text: 'Interval-compatible rank range ' + r.best_rank + ' to ' + r.worst_rank }),
      el('p', { text: 'CMS category: ' + (r.compared_to_national_src || 'none') }),
      r.caution_flag && fn.length ? el('p', { text: 'Caution footnote ' + fn.join(', ') }) : null
    ];
  };

  Viewer.prototype.showTip = function (r, g, ev) {
    if (!this.tip) return;
    clear(this.tip);
    append(this.tip, this.tipContent(r));
    this.tip.hidden = false;
    var cls = this.rowNodes;
    for (var k = 0; k < cls.length; k++) cls[k].classList.toggle('hc-row--active', cls[k] === g);
    if (ev) {
      this.moveTip(ev);
    } else {
      var wr = this.chartWrap.getBoundingClientRect();
      var dot = g.querySelector('.hc-dot').getBoundingClientRect();
      var hit = g.querySelector('.hc-hit').getBoundingClientRect();
      this.placeTip(dot.left - wr.left, hit.bottom - wr.top + 6);
    }
  };

  Viewer.prototype.moveTip = function (ev) {
    if (!this.tip || this.tip.hidden) return;
    var wr = this.chartWrap.getBoundingClientRect();
    this.placeTip(ev.clientX - wr.left + 14, ev.clientY - wr.top + 16);
  };

  Viewer.prototype.placeTip = function (left, top) {
    var wrapW = this.chartWrap.clientWidth;
    var wrapH = this.chartWrap.clientHeight;
    var tw = this.tip.offsetWidth;
    var th = this.tip.offsetHeight;
    var l = Math.max(4, Math.min(left, wrapW - tw - 4));
    var t = top;
    if (t + th > wrapH - 4) t = Math.max(4, top - th - 34);
    this.tip.style.left = l + 'px';
    this.tip.style.top = t + 'px';
  };

  Viewer.prototype.hideTip = function () {
    if (this.tip) this.tip.hidden = true;
    var cls = this.rowNodes || [];
    for (var k = 0; k < cls.length; k++) cls[k].classList.remove('hc-row--active');
  };

  /* ---------- tables ---------- */

  Viewer.prototype.tableWrap = function (label, table) {
    return el('div', { className: 'hc-table-wrap', tabindex: '0', role: 'region', 'aria-label': label }, table);
  };

  Viewer.prototype.renderTable = function () {
    var self = this;
    var c = this.current;
    var d = c.file.decimals;
    var usable = c.release.intervals_usable;
    var block = this.tableBlock;
    clear(block);
    var title = usable ? 'Compatible hospitals in ' + this.stateName()
      : 'Published scores in ' + this.stateName();
    append(block, el('h3', { className: 'hc-h', text: title }));
    if (!usable) {
      append(block, el('p', { className: 'hc-sub', text: 'Records with a numeric score that pass every gate except the ' +
        'release gate (G0) and the interval gate (G5). They are listed for reference and are not compared.' }));
    }

    var cols = [
      { key: 'facility', label: 'Facility', get: function (r) { return r.facility_name || ''; }, text: true },
      { key: 'id', label: 'ID', get: function (r) { return r.facility_id; }, text: true },
      { key: 'type', label: 'Type', get: function (r) { return r.hospital_type || ''; }, text: true },
      { key: 'score', label: 'Score', get: function (r) { return r.score; }, num: true },
      { key: 'interval', label: 'Interval', get: function (r) { return r.lower; }, num: usable, nosort: !usable }
    ];
    if (usable) {
      cols.push({ key: 'point', label: 'Point rank', get: function (r) { return r.point_rank; }, num: true });
      cols.push({ key: 'range', label: 'Compatible rank range', get: function (r) { return r.best_rank; }, num: true,
        tie: function (r) { return r.worst_rank; } });
    }
    cols.push({ key: 'cat', label: 'CMS category (source)', get: function (r) { return r.compared_to_national_src || ''; },
      text: true });

    var sort = this.sort;
    var known = cols.some(function (col) { return col.key === sort.key && !col.nosort; });
    if (!known) sort = this.sort = { key: 'score', dir: 1 };
    var sortCol = cols.filter(function (col) { return col.key === sort.key; })[0];
    var rows = c.listed.slice().sort(function (a, b) {
      var va = sortCol.get(a);
      var vb = sortCol.get(b);
      var r = sortCol.text ? cmpText(va, vb) : cmpNum(va, vb);
      if (!r && sortCol.tie) r = cmpNum(sortCol.tie(a), sortCol.tie(b));
      if (!r) r = cmpNum(a.score, b.score) || cmpText(a.facility_id, b.facility_id);
      return r * sort.dir;
    });

    var headRow = el('tr');
    cols.forEach(function (col) {
      var th = el('th', { scope: 'col', className: col.num ? 'hc-num' : null });
      if (col.nosort) {
        th.textContent = col.label;
      } else {
        var active = sort.key === col.key;
        th.setAttribute('aria-sort', active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none');
        var btn = el('button', { type: 'button', className: 'hc-sort' }, [
          col.label,
          el('span', { className: 'hc-sort-mark', 'aria-hidden': 'true', text: active ? (sort.dir === 1 ? ' \u2191' : ' \u2193') : '' })
        ]);
        btn.addEventListener('click', function () {
          self.sort = { key: col.key, dir: active ? -sort.dir : 1 };
          self.renderTable();
          var again = self.tableBlock.querySelector('th[aria-sort]:not([aria-sort="none"]) button');
          if (again) again.focus();
        });
        th.appendChild(btn);
      }
      headRow.appendChild(th);
    });

    var tbody = el('tbody');
    if (!rows.length) {
      tbody.appendChild(el('tr', null, el('td', { colspan: cols.length, className: 'hc-empty',
        text: usable ? 'No hospital in this state passes every gate for this measure.'
          : 'No record in this state has a published score that passes the other gates.' })));
    }
    rows.forEach(function (r) {
      var fn = footnoteCodes(r.footnote_src);
      var nameCell = el('th', { scope: 'row', className: 'hc-facility' }, [r.facility_name || r.facility_id]);
      if (r.caution_flag && fn.length) {
        nameCell.appendChild(el('span', { className: 'hc-flag', text: 'Caution footnote ' + fn.join(', ') }));
      }
      var cells = [
        nameCell,
        el('td', { className: 'hc-mono', text: r.facility_id }),
        el('td', { className: 'hc-type', text: r.hospital_type || '' }),
        el('td', { className: 'hc-num', text: fmt(r.score, d) }),
        el('td', { className: usable ? 'hc-num' : 'hc-muted',
          text: usable ? fmt(r.lower, d) + ' to ' + fmt(r.upper, d) : 'Not published in this release' })
      ];
      if (usable) {
        cells.push(el('td', { className: 'hc-num', text: r.point_rank + ' of ' + r.n }));
        cells.push(el('td', { className: 'hc-num', text: r.best_rank + ' to ' + r.worst_rank }));
      }
      cells.push(el('td', { text: r.compared_to_national_src || '' }));
      tbody.appendChild(el('tr', null, cells));
    });

    var caption = usable
      ? 'Compatible hospitals in ' + this.stateName() + ', ' + c.measure.label + ', release ' + c.release.key +
        '. Scores and intervals in ' + c.measure.unit + '.'
      : 'Published scores in ' + this.stateName() + ', ' + c.measure.label + ', release ' + c.release.key +
        '. Scores in ' + c.measure.unit + '.';
    var table = el('table', { className: 'hc-table' }, [
      el('caption', { className: 'hc-caption', text: caption }),
      el('thead', null, headRow), tbody]);
    append(block, this.tableWrap(title + ' (table scrolls sideways)', table));
  };

  Viewer.prototype.reasonText = function (r) {
    var labels = this.index.reasons;
    var gates = this.index.gates;
    var text = labels[r.reason_code] || r.reason_code || '';
    if (r.other_gate) {
      text += '. Also fails ' + (gates[r.other_gate] || r.other_gate) + ': ' +
        (labels[r.other_reason] || r.other_reason || '').replace(/^./, function (s) { return s.toLowerCase(); });
    }
    return text;
  };

  Viewer.prototype.renderExcluded = function () {
    var self = this;
    var c = this.current;
    var block = this.otherBlock;
    var gates = this.index.gates;
    var order = this.index.gate_order;
    clear(block);
    append(block, el('h3', { className: 'hc-h', text: 'Records not compared and why' }));
    var rows = c.excluded.slice().sort(function (a, b) {
      return (order.indexOf(a.first_failed_gate) - order.indexOf(b.first_failed_gate)) ||
        cmpText(a.other_gate || '', b.other_gate || '') ||
        cmpText(a.facility_name, b.facility_name) || cmpText(a.facility_id, b.facility_id);
    });
    append(block, el('p', { className: 'hc-sub', text: int(rows.length) + ' of ' + int(c.rows.length) +
      ' records in ' + this.stateName() + ' for this measure and release. Each record is listed at the first gate it ' +
      'fails, with the source text as published.' }));

    var head = el('tr', null, ['Facility', 'ID', 'Type', 'Gate', 'Reason', 'Score (source)', 'Interval (source)',
      'Footnote (source)'].map(function (h) { return el('th', { scope: 'col', text: h }); }));
    var tbody = el('tbody');
    var codes = {};
    if (!rows.length) {
      tbody.appendChild(el('tr', null, el('td', { colspan: 8, className: 'hc-empty',
        text: 'Every record in this state passes every gate.' })));
    }
    rows.forEach(function (r) {
      var interval = '';
      if (r.lower_src || r.upper_src) {
        interval = r.lower_src === r.upper_src && r.lower === null ? r.lower_src : r.lower_src + ' to ' + r.upper_src;
      }
      footnoteCodes(r.footnote_src).forEach(function (code) { codes[code] = true; });
      tbody.appendChild(el('tr', null, [
        el('th', { scope: 'row', className: 'hc-facility', text: r.facility_name || r.facility_id }),
        el('td', { className: 'hc-mono', text: r.facility_id }),
        el('td', { className: 'hc-type', text: r.hospital_type || '' }),
        el('td', { className: 'hc-nowrap', text: gates[r.first_failed_gate] || r.first_failed_gate || '' }),
        el('td', { className: 'hc-reason', text: self.reasonText(r) }),
        el('td', { className: 'hc-mono', text: r.score_src }),
        el('td', { className: 'hc-mono', text: interval }),
        el('td', { className: 'hc-mono', text: r.footnote_src || '' })
      ]));
    });
    var table = el('table', { className: 'hc-table hc-table--reasons' }, [
      el('caption', { className: 'hc-caption', text: 'Records not compared in ' + this.stateName() + ', ' +
        c.measure.label + ', release ' + c.release.key + ', with the first failing gate and the source text.' }),
      el('thead', null, head), tbody]);
    append(block, this.tableWrap('Records not compared and why (table scrolls sideways)', table));

    var fnText = (this.index.footnotes || {})[c.release.key] || {};
    var listed = c.listed.concat(rows);
    listed.forEach(function (r) { footnoteCodes(r.footnote_src).forEach(function (code) { codes[code] = true; }); });
    var keys = Object.keys(codes).filter(function (k) { return fnText[k]; }).sort(function (a, b) {
      return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || cmpText(a, b);
    });
    if (keys.length) {
      var dl = el('dl', { className: 'hc-footnotes' });
      keys.forEach(function (k) {
        dl.appendChild(el('dt', { text: 'Footnote ' + k }));
        dl.appendChild(el('dd', { text: fnText[k] }));
      });
      append(block, [el('p', { className: 'hc-sub', text: 'Footnote text from the CMS footnote crosswalk:' }), dl]);
    }
  };

  Viewer.prototype.renderDefs = function () {
    var c = this.current;
    clear(this.defs);
    var items = [
      el('p', { text: 'Gates are applied in a fixed order: ' + this.index.gate_order.map(function (g) {
        return this.index.gates[g];
      }, this).join(', ') + '. A record is compatible only when it passes all of them. ' +
        'Caution footnotes 11, 23 and 28 do not block a record; they are marked in the table.' })
    ];
    if (c.release.intervals_usable) {
      items.push(el('p', { text: 'R1 counts a pair as separated only when the two published 95% intervals do not overlap; ' +
        'intervals that touch at an endpoint count as overlapping. A pair is point-ordered when the two published scores differ.' }));
      items.push(el('p', { text: 'Point rank orders hospitals in the state by published score alone, with tied scores ' +
        'sharing a rank. The interval-compatible rank range runs from 1 plus the number of hospitals whose upper limit is ' +
        'below this hospital\u2019s lower limit, to n minus the number of hospitals whose lower limit is above this ' +
        'hospital\u2019s upper limit. Rank ranges are not confidence sets and carry no probability.' }));
      items.push(el('p', { text: 'CMS category is the comparison with the national rate as published by CMS and is ' +
        'shown for reference only.' }));
    }
    append(this.defs, [el('h3', { className: 'hc-h', text: 'How to read these views' })].concat(items));
  };

  /* ---------- mount ---------- */

  function mount() {
    var roots = document.querySelectorAll('section#viewer[data-base], [data-hc-viewer]');
    for (var i = 0; i < roots.length; i++) {
      if (!roots[i].__hcViewer) roots[i].__hcViewer = new Viewer(roots[i]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
