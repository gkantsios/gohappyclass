/**
 * "My plan" — a registration cart for families with several children.
 *
 * Families add classes per child from any widget, review them in one place
 * (with clash warnings and a tuition estimate), then "Register all" opens
 * Jackrabbit's new-family form with every child and class filled in:
 *
 *   regv2.asp?id=ORG&S1FName=Ava&S1Class=111&S1Class=222&S2FName=Leo&S2Class=333
 *
 * Children 2+ need a first name or Jackrabbit drops their classes, so unnamed
 * children are sent as "Child 2" etc. The form takes a limited number of
 * students (5 by default), so bigger families get one link per group.
 *
 * Stored in localStorage only — nothing about the family leaves the browser
 * until they open the Jackrabbit form.
 */
(function () {
	'use strict';
	var J = window.JRCC;
	var el = J.el;
	var C = J.config;
	var T = C.i18n;
	var L = C.labels;
	var D = C.display;
	var CART = C.cart || {};
	var KEY = 'jrcc-plan-v1';
	var COLORS = ['#2a9d8f', '#e76f51', '#457b9d', '#e9a03b', '#8e5ea2', '#d62868', '#43aa8b', '#3a86ff'];

	/* --------------------------------------------------------------- Store */

	var state = read();

	function read() {
		var s = null;
		try {
			s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
			if (!s) {
				// Children set up in the family planner before the cart existed.
				var old = JSON.parse(window.localStorage.getItem('jrcc-family-v1') || 'null');
				if (old && Array.isArray(old.children)) s = { children: old.children, items: [] };
			}
		} catch (e) { /* storage unavailable */ }
		s = s && typeof s === 'object' ? s : {};
		s.children = Array.isArray(s.children) ? s.children : [];
		s.items = Array.isArray(s.items) ? s.items : [];
		s.seq = s.seq || 0;
		s.children.forEach(function (ch) {
			if (!ch.id) ch.id = 'c' + ++s.seq;
			if (!Array.isArray(ch.v)) ch.v = ['', ''];
		});
		return s;
	}

	function write() {
		try {
			window.localStorage.setItem(KEY, JSON.stringify(state));
		} catch (e) { /* ignore */ }
		document.dispatchEvent(new CustomEvent('jrcc:plan'));
		refreshButtons();
		refreshFab();
		if (drawer && drawer.open) renderDrawer();
	}

	// Keep tabs in sync.
	window.addEventListener('storage', function (e) {
		if (e.key === KEY) {
			state = read();
			document.dispatchEvent(new CustomEvent('jrcc:plan'));
			refreshButtons();
			refreshFab();
			if (drawer && drawer.open) renderDrawer();
		}
	});

	function childIndex(id) {
		for (var i = 0; i < state.children.length; i++) if (state.children[i].id === id) return i;
		return -1;
	}

	function childLabel(id) {
		var i = childIndex(id);
		if (i === -1) return '';
		return (state.children[i].name || '').trim() || J.sprintf(T.child, i + 1);
	}

	function childColor(id) {
		var i = childIndex(id);
		return COLORS[(i < 0 ? 0 : i) % COLORS.length];
	}

	function addChild(name) {
		var ch = { id: 'c' + ++state.seq, name: name || '', v: ['', ''] };
		state.children.push(ch);
		write();
		return ch.id;
	}

	function updateChild(id, patch) {
		var i = childIndex(id);
		if (i === -1) return;
		Object.assign(state.children[i], patch);
		write();
	}

	function removeChild(id) {
		state.children = state.children.filter(function (c) { return c.id !== id; });
		state.items = state.items.filter(function (it) { return it.child !== id; });
		write();
	}

	/** Keep what the drawer needs, so it works on pages without that class's data. */
	function snapshot(c) {
		return {
			name: c.name, org: String(c.org), days: c.days || [], start: c.start, end: c.end, sd: c.sd, ed: c.ed,
			loc: c.loc, locName: c.location ? c.location.name : '', price: c.price, fee: c.fee === undefined ? null : c.fee,
			billing: c.billing || (c.monthly ? 'monthly' : ''), full: !!c.full, ext: !!c.ext, reg: c.reg, type: c.type, cat: c.cat
		};
	}

	function has(classId, childId) {
		return state.items.some(function (it) {
			return it.id === classId && (!childId || it.child === childId);
		});
	}

	function add(c, childId) {
		if (!childId) childId = state.children.length ? state.children[0].id : addChild('');
		if (has(c.id, childId)) return;
		state.items.push({ id: c.id, child: childId, c: snapshot(c) });
		track('jackrabbit_add_to_plan', c);
		write();
		toast(c, childId);
	}

	function remove(classId, childId) {
		state.items = state.items.filter(function (it) {
			return !(it.id === classId && (!childId || it.child === childId));
		});
		write();
	}

	function itemsFor(childId) {
		return state.items.filter(function (it) { return it.child === childId; });
	}

	/** Refresh stored snapshots (openings, prices) from freshly loaded data. */
	function refresh(classes) {
		var byId = {};
		classes.forEach(function (c) { byId[c.id] = c; });
		var changed = false;
		state.items.forEach(function (it) {
			if (byId[it.id]) {
				it.c = snapshot(byId[it.id]);
				changed = true;
			}
		});
		if (changed) {
			try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
		}
	}

	function track(event, c, extra) {
		if (!D.analytics) return;
		var payload = Object.assign(c ? { class_id: String(c.id), class_name: c.name, org_id: String(c.org) } : {}, extra || {});
		try {
			if (typeof window.gtag === 'function') window.gtag('event', event, payload);
			if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: event }, payload));
		} catch (e) { /* never block the family */ }
	}

	/* ------------------------------------------------------- Registration */

	/**
	 * One link per organization and per group of up to maxStudents children.
	 * Returns [{ org, url, from, to, count }].
	 */
	function registrationLinks() {
		var max = Math.max(1, CART.maxStudents || 5);
		var orgs = {};
		state.children.forEach(function (ch, idx) {
			itemsFor(ch.id).forEach(function (it) {
				var o = it.c.org;
				orgs[o] = orgs[o] || [];
				var entry = orgs[o].find(function (e) { return e.child === ch.id; });
				if (!entry) {
					entry = { child: ch.id, idx: idx, name: childLabel(ch.id), classes: [] };
					orgs[o].push(entry);
				}
				if (entry.classes.indexOf(it.id) === -1) entry.classes.push(it.id);
			});
		});
		var links = [];
		Object.keys(orgs).forEach(function (org) {
			var kids = orgs[org];
			for (var g = 0; g < kids.length; g += max) {
				var group = kids.slice(g, g + max);
				var q = ['id=' + encodeURIComponent(org)];
				var count = 0;
				group.forEach(function (k, i) {
					var n = i + 1;
					q.push('S' + n + 'FName=' + encodeURIComponent(k.name));
					k.classes.forEach(function (id) {
						q.push('S' + n + 'Class=' + encodeURIComponent(id));
						count++;
					});
				});
				links.push({
					org: org,
					url: CART.regUrl + (CART.regUrl.indexOf('?') === -1 ? '?' : '&') + q.join('&'),
					names: group.map(function (k) { return k.name; }),
					count: count,
					group: kids.length > max ? [g + 1, Math.min(g + max, kids.length)] : null
				});
			}
		});
		return links;
	}

	/* ------------------------------------------------------------ Clashes */

	function toMin(t) {
		if (!t) return null;
		var p = t.split(':');
		return +p[0] * 60 + +p[1];
	}

	function overlaps(a, b) {
		if (!a.start || !b.start) return false;
		var sameDay = (a.days || []).some(function (d) { return (b.days || []).indexOf(d) !== -1; });
		if (!sameDay) return false;
		if ((a.ed && b.sd && a.ed < b.sd) || (b.ed && a.sd && b.ed < a.sd)) return false;
		var a1 = toMin(a.start), a2 = toMin(a.end || a.start) || a1 + 60;
		var b1 = toMin(b.start), b2 = toMin(b.end || b.start) || b1 + 60;
		return a1 < b2 && b1 < a2;
	}

	/** Warnings for one plan item. */
	function clashes(item) {
		var out = [];
		state.items.forEach(function (other) {
			if (other === item || !overlaps(item.c, other.c)) return;
			if (other.child === item.child) {
				out.push(J.sprintf(T.clashSame, other.c.name));
			} else if (other.c.loc !== item.c.loc) {
				// Parents can't be in two places at once.
				out.push(J.sprintf(T.clashOther, childLabel(other.child), other.c.locName || other.c.name));
			}
		});
		return out;
	}

	/* --------------------------------------------------------- Estimates */

	function money(n) {
		var whole = Math.round(n) === n;
		return '$' + n.toLocaleString(undefined, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
	}

	function estimate() {
		var monthly = 0;
		var other = 0;
		var any = false;
		state.items.forEach(function (it) {
			if (!it.c.fee) return;
			any = true;
			if (it.c.billing === 'monthly') monthly += it.c.fee;
			else other += it.c.fee;
		});
		if (!any) return '';
		var parts = [];
		if (monthly) parts.push(J.sprintf(T.perMonth, money(monthly)));
		if (other) parts.push(monthly ? J.sprintf(T.plusOther, money(other)) : money(other));
		return parts.join(' ');
	}

	/* ------------------------------------------------------------- Buttons */

	/**
	 * "Add to plan" for one class. With several children, asks who it's for.
	 * opts.child: add straight to this child (family planner tiles).
	 */
	function button(c, opts) {
		opts = opts || {};
		var b = el('button', {
			type: 'button',
			class: 'jrcc-btn jrcc-plan-btn' + (opts.small ? ' jrcc-btn-sm' : '') + (opts.className ? ' ' + opts.className : ''),
			'data-class': String(c.id),
			'data-child': opts.child || null,
			onclick: function (e) {
				e.stopPropagation();
				var child = opts.child;
				if (child) {
					if (has(c.id, child)) remove(c.id, child);
					else add(c, child);
					return;
				}
				if (has(c.id)) {
					openDrawer();
					return;
				}
				if (state.children.length <= 1) add(c);
				else choose(c);
			}
		});
		paint(b);
		return b;
	}

	function paint(b) {
		var id = +b.getAttribute('data-class');
		var child = b.getAttribute('data-child');
		var inPlan = has(id, child || null);
		b.classList.toggle('is-added', inPlan);
		b.classList.toggle('jrcc-btn-primary', !inPlan);
		b.classList.toggle('jrcc-btn-ghost', inPlan);
		b.setAttribute('aria-pressed', inPlan ? 'true' : 'false');
		b.textContent = inPlan ? '✓ ' + T.inPlan : '+ ' + L.add;
	}

	function refreshButtons() {
		document.querySelectorAll('.jrcc-plan-btn').forEach(paint);
	}

	/** Primary action for a class wherever it's shown. */
	function action(c, extraClass) {
		if (!CART.enabled) return J.regLink(c, extraClass);
		return button(c, { className: extraClass, small: extraClass === 'jrcc-btn-sm' });
	}

	/* ----------------------------------------------------- Child chooser */

	var chooser;

	function choose(c) {
		if (!chooser) {
			chooser = el('dialog', { class: 'jrcc jrcc-dialog jrcc-chooser', 'aria-labelledby': 'jrcc-chooser-title' });
			chooser.addEventListener('click', function (e) { if (e.target === chooser) chooser.close(); });
			document.body.appendChild(chooser);
		}
		J.clear(chooser);
		var pick = function (id) {
			chooser.close();
			add(c, id);
		};
		J.append(chooser, el('div', { class: 'jrcc-dialog-inner' }, [
			el('button', { type: 'button', class: 'jrcc-dialog-close', 'aria-label': T.close, onclick: function () { chooser.close(); } }, J.icon('close')),
			el('h2', { id: 'jrcc-chooser-title' }, T.whoFor),
			el('p', { class: 'jrcc-muted' }, c.name),
			el('div', { class: 'jrcc-options' }, state.children.map(function (ch) {
				var n = itemsFor(ch.id).length;
				return el('button', { type: 'button', class: 'jrcc-option', style: { 'border-left': '6px solid ' + childColor(ch.id) }, onclick: function () { pick(ch.id); } }, [
					el('span', { class: 'jrcc-option-label' }, childLabel(ch.id)),
					el('span', { class: 'jrcc-option-sub' }, n === 1 ? T.classCount1 : J.sprintf(T.classCount, n))
				]);
			}).concat([el('button', { type: 'button', class: 'jrcc-option jrcc-option-any', onclick: function () { pick(addChild('')); } }, [
				el('span', { class: 'jrcc-option-label' }, '+ ' + T.anotherChild)
			])]))
		]));
		chooser.showModal ? chooser.showModal() : chooser.setAttribute('open', '');
	}

	/* --------------------------------------------------------------- Toast */

	var toastEl, toastTimer;

	function toast(c, childId) {
		if (!toastEl) {
			toastEl = el('div', { class: 'jrcc jrcc-toast', role: 'status', 'aria-live': 'polite' });
			document.body.appendChild(toastEl);
		}
		J.clear(toastEl);
		J.append(toastEl, [
			el('span', null, ['✓ ', J.sprintf(T.addedFor, childLabel(childId))]),
			el('button', { type: 'button', class: 'jrcc-btn-link', onclick: function () { hideToast(); openDrawer(); } }, T.viewPlan)
		]);
		toastEl.classList.add('is-on');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(hideToast, 4000);
	}

	function hideToast() {
		if (toastEl) toastEl.classList.remove('is-on');
	}

	/* ---------------------------------------------------- Floating button */

	var fab;

	function refreshFab() {
		if (!CART.enabled || !document.querySelector('.jrcc-widget')) return;
		if (!fab) {
			fab = el('button', { type: 'button', class: 'jrcc jrcc-fab', onclick: openDrawer });
			document.body.appendChild(fab);
		}
		var n = state.items.length;
		fab.hidden = !n;
		J.clear(fab);
		J.append(fab, [J.icon('cal'), ' ', L.plan, el('span', { class: 'jrcc-fab-count' }, String(n))]);
		fab.setAttribute('aria-label', L.plan + ': ' + (n === 1 ? T.classCount1 : J.sprintf(T.classCount, n)));
	}

	/* -------------------------------------------------------------- Drawer */

	var drawer;

	function openDrawer() {
		if (!drawer) {
			drawer = el('dialog', { class: 'jrcc jrcc-drawer', 'aria-labelledby': 'jrcc-plan-title' });
			drawer.addEventListener('click', function (e) { if (e.target === drawer) drawer.close(); });
			document.body.appendChild(drawer);
		}
		renderDrawer();
		if (!drawer.open) drawer.showModal ? drawer.showModal() : drawer.setAttribute('open', '');
	}

	function renderDrawer() {
		var keepFocus = document.activeElement && drawer.contains(document.activeElement) ? document.activeElement.getAttribute('data-focus') : null;
		J.clear(drawer);
		var body = el('div', { class: 'jrcc-drawer-body' });
		var head = el('div', { class: 'jrcc-drawer-head' }, [
			el('h2', { id: 'jrcc-plan-title' }, L.plan),
			el('button', { type: 'button', class: 'jrcc-dialog-close', 'aria-label': T.close, onclick: function () { drawer.close(); } }, J.icon('close'))
		]);

		if (!state.items.length) {
			body.appendChild(J.emptyState(J.sprintf(T.planEmpty, L.add)));
		}

		state.children.forEach(function (ch, idx) {
			var items = itemsFor(ch.id);
			var section = el('section', { class: 'jrcc-plan-child', style: { '--jrcc-child': childColor(ch.id) } }, [
				el('div', { class: 'jrcc-plan-child-head' }, [
					el('span', { class: 'jrcc-plan-dot', 'aria-hidden': 'true' }),
					el('input', {
						type: 'text',
						class: 'jrcc-input jrcc-plan-name',
						value: ch.name || '',
						placeholder: J.sprintf(T.child, idx + 1),
						'aria-label': T.childName,
						'data-focus': 'name-' + ch.id,
						onchange: function (e) { updateChild(ch.id, { name: e.target.value.trim() }); }
					}),
					state.children.length > 1 || !items.length ? el('button', { type: 'button', class: 'jrcc-btn-link', onclick: function () { removeChild(ch.id); } }, T.removeChild) : null
				]),
				items.length ? el('ul', { class: 'jrcc-plan-items' }, items.map(function (it) {
					var c = it.c;
					var warn = clashes(it);
					return el('li', { class: 'jrcc-plan-item' + (warn.length ? ' has-clash' : '') }, [
						el('div', { class: 'jrcc-plan-item-main' }, [
							el('strong', null, c.name),
							el('span', { class: 'jrcc-muted' }, [J.fmtDays(c.days), J.fmtTimeRange(c), c.locName].filter(Boolean).join(' · ')),
							D.showDates && c.sd ? el('span', { class: 'jrcc-muted' }, J.fmtDateRange(c)) : null,
							warn.map(function (w) { return el('span', { class: 'jrcc-plan-warn' }, '⚠ ' + w); })
						]),
						el('div', { class: 'jrcc-plan-item-side' }, [
							c.full ? el('span', { class: 'jrcc-badge jrcc-badge-full' }, T.waitlisted) : null,
							D.showPrice && c.price ? el('span', { class: 'jrcc-price' }, c.price) : null,
							el('button', { type: 'button', class: 'jrcc-plan-remove', 'aria-label': J.sprintf(T.removeClass, c.name), onclick: function () { remove(it.id, ch.id); } }, J.icon('close'))
						])
					]);
				})) : el('p', { class: 'jrcc-muted' }, T.noClassesYet)
			]);
			body.appendChild(section);
		});

		var foot = el('div', { class: 'jrcc-drawer-foot' });
		if (state.items.length) {
			var est = D.showPrice ? estimate() : '';
			if (est) {
				J.append(foot, el('div', { class: 'jrcc-plan-total' }, [
					el('span', null, T.estimate),
					el('strong', null, est),
					el('small', { class: 'jrcc-muted' }, T.estimateNote)
				]));
			}
			var links = registrationLinks();
			var portalOrgs = {};
			links.forEach(function (l) {
				var label = l.group ? (l.group[0] === l.group[1] ? J.sprintf(T.regChild, l.names[0]) : J.sprintf(T.regGroup, l.group[0], l.group[1])) : L.regAll + ' (' + (l.count === 1 ? T.classCount1 : J.sprintf(T.classCount, l.count)) + ')';
				var orgName = orgLabel(l.org);
				if (links.some(function (x) { return x.org !== l.org; }) && orgName) label = J.sprintf(T.regAt, label, orgName);
				portalOrgs[l.org] = orgName;
				foot.appendChild(el('a', {
					class: 'jrcc-btn jrcc-btn-primary jrcc-btn-lg jrcc-btn-block',
					href: l.url,
					target: D.newTab ? '_blank' : null,
					rel: D.newTab ? 'noopener' : null,
					onclick: function (e) { track('jackrabbit_register_all', null, { org_id: l.org, classes: l.count, children: l.names.length }); J.demoGate(e, l.url); }
				}, label));
			});
			foot.appendChild(el('p', { class: 'jrcc-muted jrcc-small' }, T.regNote));
			if (CART.portal) {
				Object.keys(portalOrgs).forEach(function (org) {
					foot.appendChild(el('a', { class: 'jrcc-small', href: CART.portalUrl + (CART.portalUrl.indexOf('?') === -1 ? '?' : '&') + 'orgID=' + encodeURIComponent(org), target: '_blank', rel: 'noopener', onclick: function (e) { J.demoGate(e, this.href); } }, T.portal + (Object.keys(portalOrgs).length > 1 && portalOrgs[org] ? ' (' + portalOrgs[org] + ')' : '')));
				});
			}
		}
		var actions = el('div', { class: 'jrcc-drawer-actions' }, [
			el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-ghost jrcc-btn-sm', onclick: function () { addChild(''); } }, '+ ' + T.addChild),
			state.items.length ? el('button', { type: 'button', class: 'jrcc-btn-link jrcc-small', onclick: function () {
				if (window.confirm(T.confirmClear)) {
					state.items = [];
					write();
				}
			} }, T.clearPlan) : null
		]);
		body.appendChild(actions);
		J.append(drawer, el('div', { class: 'jrcc-drawer-inner' }, [head, body, foot.children.length ? foot : null]));

		if (keepFocus) {
			var f = drawer.querySelector('[data-focus="' + keepFocus + '"]');
			if (f) f.focus();
		}
	}

	var orgNames = {};
	function orgLabel(org) {
		return orgNames[org] || '';
	}

	/* ----------------------------------------------------------- Exports */

	J.plan = {
		enabled: !!CART.enabled,
		state: function () { return state; },
		children: function () { return state.children; },
		addChild: addChild,
		updateChild: updateChild,
		removeChild: removeChild,
		childLabel: childLabel,
		childColor: childColor,
		add: add,
		remove: remove,
		has: has,
		itemsFor: itemsFor,
		button: button,
		action: action,
		open: openDrawer,
		links: registrationLinks,
		refresh: function (data) {
			Object.keys(data.orgs || {}).forEach(function (k) { if (data.orgs[k].name) orgNames[k] = data.orgs[k].name; });
			refresh(data.classes || []);
			refreshFab();
		}
	};
})();
