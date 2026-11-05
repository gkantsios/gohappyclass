/**
 * GoHappyClass Connect for Jackrabbit — shared front-end core.
 *
 * Loads the class snapshot once per page (per org selection), and provides the
 * helpers every widget uses: filtering, formatting, class cards, the details
 * dialog and the filter bar. Widgets register themselves on JRCC.widgets.
 */
(function () {
	'use strict';

	var C = window.JRCC_CONFIG || {};
	var D = C.display || {};
	var L = C.labels || {};
	var T = C.i18n || {};
	var JRCC = (window.JRCC = window.JRCC || {});
	JRCC.widgets = JRCC.widgets || {};
	JRCC.config = C;

	/* ------------------------------------------------------------------ DOM */

	/**
	 * el('div', { class: 'x', onclick: fn }, [ 'text', childNode ])
	 */
	function el(tag, attrs, children) {
		var node = document.createElement(tag);
		if (attrs) {
			Object.keys(attrs).forEach(function (k) {
				var v = attrs[k];
				if (v === null || v === undefined || v === false) return;
				if (k.slice(0, 2) === 'on' && typeof v === 'function') {
					node.addEventListener(k.slice(2), v);
				} else if (k === 'html') {
					node.innerHTML = v; // Only ever used with server-sanitised HTML.
				} else if (k === 'text') {
					node.textContent = v;
				} else if (k === 'style' && typeof v === 'object') {
					Object.keys(v).forEach(function (p) {
						node.style.setProperty(p, v[p]);
					});
				} else {
					node.setAttribute(k, v === true ? '' : v);
				}
			});
		}
		append(node, children);
		return node;
	}

	function append(node, children) {
		if (children === null || children === undefined || children === false) return node;
		if (!Array.isArray(children)) children = [children];
		children.forEach(function (c) {
			if (c === null || c === undefined || c === false || c === '') return;
			if (Array.isArray(c)) return append(node, c);
			node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
		});
		return node;
	}

	function clear(node) {
		while (node.firstChild) node.removeChild(node.firstChild);
		return node;
	}

	function sprintf(str) {
		var args = Array.prototype.slice.call(arguments, 1);
		var i = 0;
		return String(str).replace(/%(\d+\$)?s/g, function (m, pos) {
			return pos ? args[parseInt(pos, 10) - 1] : args[i++];
		});
	}

	var ICONS = {
		clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
		pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
		user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21a8 8 0 0 1 16 0',
		cal: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
		star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
		close: 'M6 6l12 12M18 6L6 18',
		left: 'M15 6l-6 6 6 6',
		right: 'M9 6l6 6-6 6',
		target: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
		search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-5-5'
	};

	function icon(name) {
		var ns = 'http://www.w3.org/2000/svg';
		var svg = document.createElementNS(ns, 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('class', 'jrcc-icon');
		var path = document.createElementNS(ns, 'path');
		path.setAttribute('d', ICONS[name] || '');
		svg.appendChild(path);
		return svg;
	}

	/* ------------------------------------------------------------- Formats */

	function fmtTime(t) {
		if (!t) return '';
		var p = t.split(':');
		var h = parseInt(p[0], 10);
		var m = p[1] || '00';
		if (D.time24) return (h < 10 ? '0' : '') + h + ':' + m;
		var ap = h >= 12 ? 'PM' : 'AM';
		h = h % 12 || 12;
		return h + (m === '00' ? '' : ':' + m) + ' ' + ap;
	}

	function fmtTimeRange(c) {
		if (!c.start) return '';
		if (!c.end) return fmtTime(c.start);
		var a = fmtTime(c.start);
		var b = fmtTime(c.end);
		// "3:30–4:30 PM" when both share AM/PM.
		if (!D.time24 && a.slice(-2) === b.slice(-2)) a = a.slice(0, -3);
		return a + '–' + b;
	}

	function fmtDays(days, long) {
		var names = long ? T.days : T.daysShort;
		return (days || []).map(function (d) {
			return names[d - 1];
		}).join(', ');
	}

	function parseDate(s) {
		if (!s) return null;
		var p = s.split('-');
		return new Date(+p[0], +p[1] - 1, +p[2]);
	}

	function ymd(d) {
		var m = d.getMonth() + 1;
		var day = d.getDate();
		return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
	}

	var locale = document.documentElement.lang || undefined;

	function fmtDate(s, opts) {
		var d = parseDate(s);
		if (!d) return '';
		try {
			return d.toLocaleDateString(locale, opts || { month: 'short', day: 'numeric' });
		} catch (e) {
			return s;
		}
	}

	function fmtDateRange(c) {
		if (!c.sd) return '';
		var thisYear = new Date().getFullYear();
		var withYear = { month: 'short', day: 'numeric', year: 'numeric' };
		var short = { month: 'short', day: 'numeric' };
		var sy = parseDate(c.sd).getFullYear();
		var ey = c.ed ? parseDate(c.ed).getFullYear() : sy;
		var opts = sy === thisYear && ey === thisYear ? short : withYear;
		if (!c.ed || c.ed === c.sd) return fmtDate(c.sd, opts);
		return fmtDate(c.sd, sy === ey ? short : opts) + ' – ' + fmtDate(c.ed, opts);
	}

	function ageNum(m) {
		if (m % 12 === 0) return String(m / 12);
		if (m < 24) return m + ' ' + T.months;
		return String(Math.round((m / 12) * 10) / 10);
	}

	function fmtAges(c) {
		var hasMin = c.min !== null && c.min !== undefined && c.min > 0;
		var hasMax = c.max !== null && c.max !== undefined && c.max > 0;
		if (hasMin && hasMax) {
			// "16 mo–6 yrs" rather than the ambiguous "16 mo–6".
			var hi = ageNum(c.max);
			if (ageNum(c.min).indexOf(T.months) !== -1 && hi.indexOf(T.months) === -1) hi += ' ' + T.years;
			return T.ages + ' ' + ageNum(c.min) + '–' + hi;
		}
		if (hasMin) return T.ages + ' ' + sprintf(T.agePlus, ageNum(c.min));
		if (hasMax) return sprintf(T.ageUnder, ageNum(c.max + 1));
		return '';
	}

	/* -------------------------------------------------------------- Colors */

	var PALETTE = ['#2a9d8f', '#e76f51', '#457b9d', '#e9a03b', '#8e5ea2', '#3a86ff', '#d62868', '#43aa8b', '#b5651d', '#6a4c93', '#118ab2', '#c44536'];

	function hash(s) {
		var h = 0;
		for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
		return Math.abs(h);
	}

	function colorFor(value, index) {
		var key = String(value || '').toLowerCase();
		var custom = D.categoryColors || {};
		if (custom[key]) return custom[key];
		if (typeof index === 'number') return PALETTE[index % PALETTE.length];
		return PALETTE[hash(key) % PALETTE.length];
	}

	/* ---------------------------------------------------------------- Data */

	var cache = {};

	/** REST URL that works with and without pretty permalinks. */
	function api(path, params) {
		var url = C.rest + path;
		var q = Object.keys(params || {}).filter(function (k) { return params[k] !== '' && params[k] !== undefined; }).map(function (k) {
			return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
		}).join('&');
		return q ? url + (url.indexOf('?') === -1 ? '?' : '&') + q : url;
	}

	function load(org) {
		var key = org || '*';
		if (!cache[key] && C.payload) {
			// Data supplied by the page (demos, non-WordPress embeds).
			var copy = JSON.parse(JSON.stringify(C.payload));
			if (org) {
				var keep = String(org).split(',');
				copy.classes = copy.classes.filter(function (c) { return keep.indexOf(String(c.org)) !== -1; });
			}
			cache[key] = Promise.resolve(copy).then(prepare);
		}
		if (!cache[key]) {
			cache[key] = fetch(api('data', { org: org }), { credentials: 'same-origin' })
				.then(function (r) {
					if (!r.ok) throw new Error('HTTP ' + r.status);
					return r.json();
				})
				.then(prepare);
		}
		return cache[key];
	}

	function prepare(payload) {
		var catField = D.categoryField || 'cat1';
		var locs = payload.locations || {};
		var classes = (payload.classes || []).map(function (c) {
			c.location = locs[c.loc] || null;
			c.cat = c[catField] || '';
			c.full = c.open !== null && c.open !== undefined && c.open <= 0;
			c.org_name = payload.orgs && payload.orgs[c.org] ? payload.orgs[c.org].name : '';
			return c;
		});
		classes.sort(byDayTime);
		return { classes: classes, locations: locs, orgs: payload.orgs || {}, generated: payload.generated };
	}

	function firstDay(c) {
		if (!c.days || !c.days.length) return 8;
		var ws = D.weekStart || 7;
		return Math.min.apply(null, c.days.map(function (d) {
			return ws === 7 ? d % 7 : d;
		}));
	}

	function byDayTime(a, b) {
		return firstDay(a) - firstDay(b) || (a.start || '99').localeCompare(b.start || '99') || a.name.localeCompare(b.name);
	}

	var sorters = {
		day: byDayTime,
		date: function (a, b) {
			return (a.sd || '9999').localeCompare(b.sd || '9999') || byDayTime(a, b);
		},
		name: function (a, b) {
			return a.name.localeCompare(b.name);
		},
		age: function (a, b) {
			return (a.min || 0) - (b.min || 0) || (a.max || 999) - (b.max || 999) || byDayTime(a, b);
		}
	};

	function list(str, sep) {
		if (!str) return [];
		return String(str).split(sep || /[,|]/).map(function (s) {
			return s.trim().toLowerCase();
		}).filter(Boolean);
	}

	function containsAny(text, words) {
		text = String(text || '').toLowerCase();
		for (var i = 0; i < words.length; i++) if (text.indexOf(words[i]) !== -1) return true;
		return false;
	}

	/**
	 * The slice a shortcode asks for (category, type, age, keywords …).
	 */
	function applyScope(classes, cfg) {
		var cat = list(cfg.category);
		var c1 = list(cfg.cat1);
		var c2 = list(cfg.cat2);
		var c3 = list(cfg.cat3);
		var cats = list(cfg.categories);
		var excl = list(cfg.exclude);
		var kw = list(cfg.keywords);
		var locq = String(cfg.location || '').toLowerCase().trim();
		var age = parseAgeRange(cfg.age);
		var hideFull = cfg.hide_full === 'yes' || (cfg.hide_full !== 'no' && D.hideFull);

		return classes.filter(function (c) {
			if (cat.length && cat.indexOf(c.cat.toLowerCase()) === -1) return false;
			if (c1.length && c1.indexOf(c.cat1.toLowerCase()) === -1) return false;
			if (c2.length && c2.indexOf(c.cat2.toLowerCase()) === -1) return false;
			if (c3.length && c3.indexOf(c.cat3.toLowerCase()) === -1) return false;
			var catText = c.cat1 + ' ' + c.cat2 + ' ' + c.cat3;
			if (cats.length && !containsAny(catText, cats)) return false;
			if (excl.length && containsAny(c.name + ' ' + catText, excl)) return false;
			if (kw.length && !containsAny(c.name.replace(/\s+/g, ' '), kw)) return false;
			if (locq && !(c.location && (c.location.name + ' ' + c.location.address).toLowerCase().indexOf(locq) !== -1)) return false;
			if (cfg.type && c.type !== cfg.type) return false;
			if (age && !ageOverlaps(c, age[0], age[1])) return false;
			if (hideFull && c.full) return false;
			return true;
		});
	}

	function parseAgeRange(s) {
		if (!s) return null;
		var m = String(s).match(/^\s*(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?))?\s*$/);
		if (!m) return null;
		return [parseFloat(m[1]), m[2] ? parseFloat(m[2]) : parseFloat(m[1])];
	}

	/** Does a child aged between y1 and y2 years fit the class? */
	function ageOverlaps(c, y1, y2) {
		var lo = Math.round(y1 * 12);
		var hi = Math.round(y2 * 12) + 11;
		if (c.min !== null && c.min !== undefined && c.min > hi) return false;
		if (c.max !== null && c.max !== undefined && c.max > 0 && c.max < lo) return false;
		return true;
	}

	function timeOfDay(c) {
		if (!c.start) return '';
		var h = parseInt(c.start, 10);
		return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
	}

	/**
	 * Visitor-chosen filters: { q, cat, age, day, time, loc, type, open,
	 * cat1:[], cat2:[], cat3:[], days:[], ageMin, ageMax, locName }.
	 */
	function matches(c, f) {
		if (!f) return true;
		if (f.q && (c.name + ' ' + c.cat1 + ' ' + c.cat2 + ' ' + c.cat3 + ' ' + (c.location ? c.location.name : '')).toLowerCase().indexOf(f.q.toLowerCase()) === -1) return false;
		if (f.cat && c.cat !== f.cat) return false;
		if (f.age !== undefined && f.age !== '' && f.age !== null && !ageOverlaps(c, +f.age, +f.age)) return false;
		if ((f.ageMin !== undefined && f.ageMin !== '') || (f.ageMax !== undefined && f.ageMax !== '')) {
			if (!ageOverlaps(c, f.ageMin === '' || f.ageMin === undefined ? 0 : +f.ageMin, f.ageMax === '' || f.ageMax === undefined ? 99 : +f.ageMax)) return false;
		}
		if (f.day && (c.days || []).indexOf(+f.day) === -1) return false;
		if (f.days && f.days.length && !(c.days || []).some(function (d) { return f.days.indexOf(d) !== -1; })) return false;
		if (f.time && timeOfDay(c) !== f.time) return false;
		if (f.loc && c.loc !== f.loc) return false;
		if (f.locName && !(c.location && c.location.name.toLowerCase().indexOf(f.locName.toLowerCase()) !== -1)) return false;
		if (f.type && c.type !== f.type) return false;
		if (f.open && c.full) return false;
		var lists = ['cat1', 'cat2', 'cat3'];
		for (var i = 0; i < lists.length; i++) {
			var vals = f[lists[i]];
			if (vals && vals.length && vals.indexOf(c[lists[i]]) === -1) return false;
		}
		if (f.keywords && !containsAny(c.name, list(f.keywords))) return false;
		return true;
	}

	function filter(classes, f) {
		return classes.filter(function (c) {
			return matches(c, f);
		});
	}

	/** Distinct values with counts: [{ value, label, count }]. */
	function facet(classes, getter, sort) {
		var map = {};
		classes.forEach(function (c) {
			[].concat(getter(c)).forEach(function (v) {
				if (v === '' || v === null || v === undefined) return;
				map[v] = (map[v] || 0) + 1;
			});
		});
		var out = Object.keys(map).map(function (v) {
			return { value: v, label: v, count: map[v] };
		});
		out.sort(sort || function (a, b) {
			return a.label.localeCompare(b.label, undefined, { numeric: true });
		});
		return out;
	}

	/** Facet definitions shared by filter bars and the guided finder. */
	var FACETS = {
		category: function (classes) {
			return facet(classes, function (c) { return c.cat; });
		},
		age: function (classes) {
			var out = [];
			for (var y = 0; y <= 18; y++) {
				var n = classes.filter(function (c) { return (c.min || c.max) && ageOverlaps(c, y, y); }).length;
				if (n) out.push({ value: String(y), label: y === 0 ? sprintf(T.ageUnder, 1) : y === 1 ? (T.ageYear1 || sprintf(T.ageYears, y)) : sprintf(T.ageYears, y), count: n });
			}
			return out;
		},
		day: function (classes) {
			var ws = D.weekStart || 7;
			var f = facet(classes, function (c) { return c.days; }, function (a, b) {
				var x = ws === 7 ? +a.value % 7 : +a.value;
				var y = ws === 7 ? +b.value % 7 : +b.value;
				return x - y;
			});
			f.forEach(function (o) { o.label = T.days[+o.value - 1]; });
			return f;
		},
		time: function (classes) {
			var order = ['morning', 'afternoon', 'evening'];
			return facet(classes, timeOfDay, function (a, b) {
				return order.indexOf(a.value) - order.indexOf(b.value);
			}).map(function (o) {
				o.label = T[o.value];
				return o;
			});
		},
		location: function (classes) {
			var f = facet(classes, function (c) { return c.location ? c.loc : ''; });
			f.forEach(function (o) {
				var cl = classes.find(function (c) { return c.loc === o.value; });
				o.label = cl && cl.location ? cl.location.name : o.value;
			});
			f.sort(function (a, b) { return a.label.localeCompare(b.label); });
			return f;
		},
		type: function (classes) {
			return facet(classes, function (c) { return c.type; }).map(function (o) {
				o.label = o.value === 'camp' ? T.camps : T.classes;
				return o;
			});
		}
	};

	var FILTER_KEYS = { category: 'cat', age: 'age', day: 'day', time: 'time', location: 'loc', type: 'type' };

	/* ------------------------------------------------------- Registration */

	/** Visitor location search ("ZIP or city"). Pages may supply their own. */
	function geocode(q) {
		if (typeof C.geocode === 'function') return Promise.resolve(C.geocode(q));
		return fetch(api('geocode', { q: q })).then(function (r) { return r.json(); });
	}

	/* ------------------------------------------------------------ Demo mode */

	var demoDialog;

	/**
	 * In demo mode, registration links explain what would happen instead of
	 * opening a real business's form. Call from a link's click handler.
	 */
	function demoGate(e, url) {
		if (!C.demo) return false;
		e.preventDefault();
		if (!demoDialog) {
			demoDialog = el('dialog', { class: 'jrcc jrcc-dialog jrcc-demo-dialog', 'aria-labelledby': 'jrcc-demo-title' });
			demoDialog.addEventListener('click', function (ev) { if (ev.target === demoDialog) demoDialog.close(); });
			document.body.appendChild(demoDialog);
		}
		var names = {};
		Object.keys(cache).forEach(function (k) {
			cache[k].then(function (d) { d.classes.forEach(function (c) { names[c.id] = c.name; }); });
		});
		// Read the students and classes back out of the link.
		var students = [];
		var query = String(url).split('?')[1] || '';
		query.split('&').forEach(function (pair) {
			var kv = pair.split('=');
			var m = decodeURIComponent(kv[0] || '').match(/^S(\d+)(FName|Class)$/i);
			if (!m) return;
			var i = +m[1] - 1;
			students[i] = students[i] || { name: '', classes: [] };
			var v = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
			if (/fname/i.test(m[2])) students[i].name = v;
			else students[i].classes.push(v);
		});
		var preloaded = query.match(/preLoadClassID=(\d+)/i);
		if (!students.length && preloaded) students.push({ name: '', classes: [preloaded[1]] });
		setTimeout(function () {
			clear(demoDialog);
			append(demoDialog, el('div', { class: 'jrcc-dialog-inner' }, [
				el('button', { type: 'button', class: 'jrcc-dialog-close', 'aria-label': T.close, onclick: function () { demoDialog.close(); } }, icon('close')),
				el('span', { class: 'jrcc-badge jrcc-badge-camp' }, T.demoBadge || 'Demo'),
				el('h2', { id: 'jrcc-demo-title' }, T.demoTitle || 'This is a demo'),
				el('p', null, T.demoText || 'On your website, this button opens your Jackrabbit registration form with these details already filled in:'),
				students.length ? el('ul', { class: 'jrcc-demo-list' }, students.filter(Boolean).map(function (s2, i) {
					return el('li', null, [
						el('strong', null, s2.name || sprintf(T.child, i + 1)),
						el('ul', null, s2.classes.map(function (id) { return el('li', null, names[id] || ('#' + id)); }))
					]);
				})) : null,
				el('p', { class: 'jrcc-muted' }, T.demoLink || 'The link it builds:'),
				el('code', { class: 'jrcc-demo-url' }, url),
				el('div', { class: 'jrcc-dialog-actions' }, el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-primary', onclick: function () { demoDialog.close(); } }, T.close))
			]));
			if (typeof demoDialog.showModal === 'function') {
				if (!demoDialog.open) demoDialog.showModal();
			} else {
				demoDialog.setAttribute('open', '');
			}
		}, 0);
		return true;
	}

	function regLink(c, extraClass) {
		if (!c.reg) return null;
		var label = c.full ? L.waitlist : L.register;
		var a = el('a', {
			class: 'jrcc-btn jrcc-btn-primary' + (extraClass ? ' ' + extraClass : ''),
			href: c.reg,
			target: D.newTab ? '_blank' : null,
			rel: D.newTab ? 'noopener' : null,
			onclick: function (e) {
				track(c);
				demoGate(e, c.reg);
			}
		}, label);
		return a;
	}

	function track(c) {
		if (!D.analytics) return;
		var payload = { class_id: String(c.id), class_name: c.name, category: c.cat, location: c.location ? c.location.name : '', org_id: c.org };
		try {
			if (typeof window.gtag === 'function') window.gtag('event', 'jackrabbit_register_click', payload);
			if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: 'jackrabbit_register_click' }, payload));
		} catch (e) { /* analytics must never break registration */ }
	}

	/** Primary call to action: "Add to plan" when the cart is on, else Register. */
	function action(c, extraClass) {
		return JRCC.plan ? JRCC.plan.action(c, extraClass) : regLink(c, extraClass);
	}

	function openingsBadge(c) {
		if (!D.showOpenings || c.open === null || c.open === undefined) return null;
		if (c.full) return el('span', { class: 'jrcc-badge jrcc-badge-full' }, L.full);
		if (D.lowOpenings && c.open <= D.lowOpenings) {
			return el('span', { class: 'jrcc-badge jrcc-badge-low' }, c.open === 1 ? T.oneSpotLeft : sprintf(T.spotsLeft, c.open));
		}
		return null;
	}

	function typeBadge(c) {
		return el('span', { class: 'jrcc-badge jrcc-badge-' + c.type }, c.type === 'camp' ? L.camp : L.class);
	}

	/* --------------------------------------------------------------- Cards */

	function metaRow(name, text) {
		if (!text) return null;
		return el('li', null, [icon(name), el('span', null, text)]);
	}

	function card(c, opts) {
		opts = opts || {};
		var when = [fmtDays(c.days), fmtTimeRange(c)].filter(Boolean).join(' · ');
		var foot = el('div', { class: 'jrcc-card-foot' }, [
			D.showPrice && c.price ? el('span', { class: 'jrcc-price' }, c.price) : el('span'),
			el('div', { class: 'jrcc-card-actions' }, [
				el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-ghost', onclick: function () { openDetails(c); } }, L.details),
				action(c)
			])
		]);
		var article = el('article', {
			class: 'jrcc-card' + (c.full ? ' is-full' : ''),
			style: opts.color ? { '--jrcc-card-accent': opts.color } : null
		}, [
			el('div', { class: 'jrcc-card-top' }, [typeBadge(c), c.cat ? el('span', { class: 'jrcc-badge jrcc-badge-cat' }, c.cat) : null, openingsBadge(c), opts.tag ? el('span', { class: 'jrcc-badge jrcc-badge-tag', style: opts.color ? { background: opts.color } : null }, opts.tag) : null]),
			el('h3', { class: 'jrcc-card-title' }, el('button', { type: 'button', class: 'jrcc-linklike', onclick: function () { openDetails(c); } }, c.name)),
			el('ul', { class: 'jrcc-meta' }, [
				metaRow('clock', when),
				D.showAges ? metaRow('user', fmtAges(c)) : null,
				D.showLocation && c.location ? metaRow('pin', c.location.name + (opts.distance ? ' · ' + opts.distance : '')) : null,
				D.showDates ? metaRow('cal', fmtDateRange(c)) : null
			]),
			foot
		]);
		return article;
	}

	/* -------------------------------------------------------- Details dialog */

	var dialog;

	function openDetails(c) {
		if (!dialog) {
			dialog = el('dialog', { class: 'jrcc jrcc-dialog', 'aria-labelledby': 'jrcc-dialog-title' });
			dialog.addEventListener('click', function (e) {
				if (e.target === dialog) dialog.close();
			});
			dialog.addEventListener('close', function () {
				if (location.hash.indexOf('#jrcc-class-') === 0 && history.replaceState) {
					history.replaceState(null, '', location.pathname + location.search);
				}
			});
			document.body.appendChild(dialog);
		}
		clear(dialog);
		var loc = c.location;
		var rows = [];
		var dt = function (label, value) {
			if (value) rows.push(el('dt', null, label), el('dd', null, value));
		};
		dt(T.when, [fmtDays(c.days, true), fmtTimeRange(c)].filter(Boolean).join(' · '));
		if (D.showDates) dt(T.dates, fmtDateRange(c));
		if (D.showAges) dt(T.age, fmtAges(c).replace(T.ages + ' ', ''));
		if (D.showLocation && loc) {
			var mapUrl = loc.lat ? 'https://www.google.com/maps/dir/?api=1&destination=' + loc.lat + ',' + loc.lng : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(loc.address || loc.name);
			rows.push(el('dt', null, T.location), el('dd', null, [
				el('strong', null, loc.name), loc.address && loc.address !== loc.name ? el('br') : null, loc.address && loc.address !== loc.name ? loc.address : null,
				c.room ? el('br') : null, c.room || null,
				el('br'), el('a', { href: mapUrl, target: '_blank', rel: 'noopener' }, T.directions)
			]));
		}
		if (D.showInstructors && c.instructors && c.instructors.length) dt(T.instructors, c.instructors.join(', '));
		if (D.showOpenings && c.open !== null && c.open !== undefined) dt(T.openings, c.full ? L.full : String(c.open));
		if (D.showPrice && c.price) dt(T.tuition, c.price);

		var today = ymd(new Date());
		var share = el('button', {
			type: 'button',
			class: 'jrcc-btn jrcc-btn-ghost',
			onclick: function (e) {
				var url = location.origin + location.pathname + location.search + '#jrcc-class-' + c.id;
				var btn = e.currentTarget;
				var done = function () { btn.textContent = T.copied; };
				if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
				else done();
			}
		}, T.copyLink);

		append(dialog, el('div', { class: 'jrcc-dialog-inner' }, [
			el('button', { type: 'button', class: 'jrcc-dialog-close', 'aria-label': T.close, onclick: function () { dialog.close(); } }, icon('close')),
			el('div', { class: 'jrcc-card-top' }, [typeBadge(c), c.cat ? el('span', { class: 'jrcc-badge jrcc-badge-cat' }, c.cat) : null, openingsBadge(c)]),
			el('h2', { id: 'jrcc-dialog-title' }, c.name),
			c.org_name ? el('p', { class: 'jrcc-muted' }, c.org_name) : null,
			el('dl', { class: 'jrcc-details' }, rows),
			D.showDescription && c.desc ? el('div', { class: 'jrcc-desc', html: c.desc }) : null,
			c.ext ? el('p', { class: 'jrcc-muted' }, T.externalReg) : null,
			c.reg_start && c.reg_start > today ? el('p', { class: 'jrcc-muted' }, sprintf(T.regOpens, fmtDate(c.reg_start))) : null,
			el('div', { class: 'jrcc-dialog-actions' }, JRCC.plan && JRCC.plan.enabled ? [
				share,
				c.reg ? el('a', { class: 'jrcc-btn jrcc-btn-ghost', href: c.reg, target: D.newTab ? '_blank' : null, rel: D.newTab ? 'noopener' : null, onclick: function (e) { track(c); demoGate(e, c.reg); } }, T.registerOne) : null,
				JRCC.plan.button(c, { className: 'jrcc-btn-lg' })
			] : [share, regLink(c, 'jrcc-btn-lg')])
		]));
		if (typeof dialog.showModal === 'function') {
			if (!dialog.open) dialog.showModal();
		} else {
			dialog.setAttribute('open', '');
		}
		if (history.replaceState) history.replaceState(null, '', '#jrcc-class-' + c.id);
	}

	/** A dialog with a list of cards (e.g. "+3 more" on the month view). */
	function openList(title, classes) {
		openDetails({ id: 0, name: title, days: [], type: 'class', cat: '', instructors: [] });
		var inner = dialog.querySelector('.jrcc-dialog-inner');
		clear(inner);
		append(inner, [
			el('button', { type: 'button', class: 'jrcc-dialog-close', 'aria-label': T.close, onclick: function () { dialog.close(); } }, icon('close')),
			el('h2', { id: 'jrcc-dialog-title' }, title),
			el('div', { class: 'jrcc-cards jrcc-cards-1' }, classes.map(function (c) { return card(c); }))
		]);
		if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
	}

	/* ------------------------------------------------------------ Filter bar */

	/**
	 * Dropdown filters whose options always reflect what's still available.
	 *
	 * @param {Array}    fields   e.g. ['search','category','age','day','location','type']
	 * @param {Array}    classes  the widget's scoped classes
	 * @param {Function} onChange called with the filter state
	 */
	function filterBar(fields, classes, onChange, extra) {
		var state = {};
		var bar = el('div', { class: 'jrcc-filters', role: 'search' });
		var selects = {};
		var labels = {
			category: L.category || T.all,
			age: T.age,
			day: T.day,
			time: T.when,
			location: T.location,
			type: T.type
		};

		fields.forEach(function (f) {
			if (f === 'search') {
				var input = el('input', {
					type: 'search',
					class: 'jrcc-input',
					placeholder: T.search,
					'aria-label': T.search,
					oninput: function () {
						state.q = input.value.trim();
						changed();
					}
				});
				bar.appendChild(el('label', { class: 'jrcc-filter jrcc-filter-search' }, [icon('search'), input]));
				return;
			}
			if (!FACETS[f]) return;
			var sel = el('select', {
				class: 'jrcc-select',
				'aria-label': labels[f],
				onchange: function () {
					state[FILTER_KEYS[f]] = sel.value;
					changed();
				}
			});
			selects[f] = sel;
			bar.appendChild(el('label', { class: 'jrcc-filter' }, [el('span', { class: 'jrcc-filter-label' }, labels[f]), sel]));
		});

		var reset = el('button', {
			type: 'button',
			class: 'jrcc-btn jrcc-btn-link jrcc-clear',
			hidden: true,
			onclick: function () {
				state = {};
				bar.querySelectorAll('input[type=search]').forEach(function (i) { i.value = ''; });
				changed();
			}
		}, T.clear);
		if (extra) append(bar, extra);
		bar.appendChild(reset);

		function refreshOptions() {
			Object.keys(selects).forEach(function (f) {
				var key = FILTER_KEYS[f];
				var others = Object.assign({}, state);
				delete others[key];
				var opts = FACETS[f](filter(classes, others));
				var sel = selects[f];
				var current = state[key] || '';
				clear(sel);
				sel.appendChild(el('option', { value: '' }, labels[f] + ': ' + T.all));
				opts.forEach(function (o) {
					sel.appendChild(el('option', { value: o.value, selected: o.value === current }, o.label + ' (' + o.count + ')'));
				});
				// Hide filters that can't narrow anything.
				sel.parentNode.hidden = opts.length < 2 && !current;
			});
			reset.hidden = !Object.keys(state).some(function (k) { return state[k]; });
		}

		function changed() {
			refreshOptions();
			onChange(state);
		}

		refreshOptions();
		return {
			el: bar,
			state: function () { return state; },
			set: function (key, value) { state[key] = value; changed(); },
			setClasses: function (c) { classes = c; refreshOptions(); }
		};
	}

	/* ------------------------------------------------------------- Boot */

	function mount(root, cfg) {
		var widget = JRCC.widgets[cfg.widget];
		if (!widget) return;
		root.classList.add('jrcc', 'jrcc-widget', 'jrcc-w-' + cfg.widget);
		root.setAttribute('aria-busy', 'true');
		load(cfg.org).then(function (data) {
			var scoped = applyScope(data.classes, cfg);
			var fallback = root.querySelector('.jrcc-fallback');
			if (fallback) fallback.remove();
			root.removeAttribute('aria-busy');
			if (JRCC.plan) JRCC.plan.refresh(data);
			widget(root, cfg, { data: data, classes: scoped });
			openFromHash(data.classes);
		}).catch(function (err) {
			root.removeAttribute('aria-busy');
			var loading = root.querySelector('.jrcc-loading');
			if (loading) loading.textContent = T.error;
			if (window.console) console.error('GoHappyClass Connect:', err);
		});
	}

	var hashHandled = false;
	function openFromHash(classes) {
		if (hashHandled) return;
		var m = location.hash.match(/^#jrcc-class-(\d+)/);
		if (!m) return;
		var c = classes.find(function (x) { return String(x.id) === m[1]; });
		if (c) {
			hashHandled = true;
			openDetails(c);
		}
	}

	function boot() {
		document.querySelectorAll('[data-jrcc]').forEach(function (root) {
			if (root.dataset.jrccReady) return;
			root.dataset.jrccReady = '1';
			var cfg;
			try {
				cfg = JSON.parse(root.getAttribute('data-jrcc'));
			} catch (e) {
				return;
			}
			mount(root, cfg);
		});
	}

	function emptyState(text) {
		return el('div', { class: 'jrcc-empty' }, [icon('star'), el('p', null, text || T.noClasses)]);
	}

	Object.assign(JRCC, {
		el: el,
		append: append,
		clear: clear,
		icon: icon,
		sprintf: sprintf,
		fmtTime: fmtTime,
		fmtTimeRange: fmtTimeRange,
		fmtDays: fmtDays,
		fmtDate: fmtDate,
		fmtDateRange: fmtDateRange,
		fmtAges: fmtAges,
		parseDate: parseDate,
		ymd: ymd,
		colorFor: colorFor,
		load: load,
		api: api,
		geocode: geocode,
		demoGate: demoGate,
		applyScope: applyScope,
		matches: matches,
		filter: filter,
		facets: FACETS,
		sorters: sorters,
		ageOverlaps: ageOverlaps,
		timeOfDay: timeOfDay,
		card: card,
		regLink: regLink,
		action: action,
		openingsBadge: openingsBadge,
		openDetails: openDetails,
		openList: openList,
		filterBar: filterBar,
		emptyState: emptyState,
		mount: mount,
		boot: boot
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		setTimeout(boot, 0);
	}
})();
