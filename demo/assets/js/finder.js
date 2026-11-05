/**
 * [jackrabbit_finder] — help families find the right class.
 *
 *   mode="guided"  automatic questions (age → interest → day → …) built from
 *                  the live schedule; only answers that still have classes are
 *                  offered and single-answer steps are skipped.
 *   mode="wizard"  the site owner's own question flow (Class Finder tab).
 *   mode="family"  add each child; see every fitting class on one
 *                  color-coded weekly schedule.
 */
(function () {
	'use strict';
	var J = window.JRCC;
	var el = J.el;
	var T = J.config.i18n;
	var D = J.config.display;
	var F = J.config.finder || {};

	function heading(cfg) {
		return cfg.title ? el('h2', { class: 'jrcc-finder-title' }, cfg.title) : null;
	}

	function optionButton(label, sub, onclick, extraClass) {
		return el('button', { type: 'button', class: 'jrcc-option' + (extraClass ? ' ' + extraClass : ''), onclick: onclick }, [
			el('span', { class: 'jrcc-option-label' }, label),
			sub ? el('span', { class: 'jrcc-option-sub' }, sub) : null
		]);
	}

	function countLabel(n) {
		return n === 1 ? T.matchCount1 : J.sprintf(T.matchCount, n);
	}

	/* ------------------------------------------------------------ Guided */

	var STEP_KEYS = { age: 'age', category: 'cat', day: 'day', time: 'time', location: 'loc' };

	function guided(root, cfg, all) {
		var steps = String(cfg.steps || 'age,category,day,location').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return STEP_KEYS[s]; });
		var answers = {}; // step → { value, label }
		var history = []; // steps actually shown, for Back
		var panel = el('div', { class: 'jrcc-finder-panel', 'aria-live': 'polite' });
		J.clear(root);
		root.appendChild(el('div', { class: 'jrcc-finder' }, [heading(cfg), panel]));

		function state() {
			var f = {};
			Object.keys(answers).forEach(function (s) {
				if (answers[s] && answers[s].value !== '') f[STEP_KEYS[s]] = answers[s].value;
			});
			return f;
		}

		function nextStep() {
			for (var i = 0; i < steps.length; i++) {
				var s = steps[i];
				if (answers.hasOwnProperty(s)) continue;
				var opts = J.facets[s](J.filter(all, state()));
				if (opts.length > 1) return { step: s, options: opts };
				answers[s] = { value: '', label: '', auto: true }; // Nothing to choose.
			}
			return null;
		}

		function show() {
			J.clear(panel);
			var next = nextStep();
			if (!next) return results();
			var done = history.length;
			var total = done + 1 + steps.filter(function (s) { return !answers.hasOwnProperty(s) && s !== next.step; }).length;
			var remaining = J.filter(all, state()).length;
			J.append(panel, [
				el('div', { class: 'jrcc-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': done + 1 }, el('span', { style: { width: Math.round(((done + 1) / (total + 1)) * 100) + '%' } })),
				el('p', { class: 'jrcc-step-count' }, J.sprintf(T.step, done + 1, total)),
				el('h3', { class: 'jrcc-question' }, (F.questions || {})[next.step] || ''),
				el('div', { class: 'jrcc-options' + (next.options.length > 8 ? ' is-many' : '') }, next.options.map(function (o) {
					return optionButton(o.label, countLabel(o.count), function () {
						answers[next.step] = { value: o.value, label: o.label };
						history.push(next.step);
						show();
					});
				}).concat([optionButton(T.any, countLabel(remaining), function () {
					answers[next.step] = { value: '', label: T.any };
					history.push(next.step);
					show();
				}, 'jrcc-option-any')])),
				nav()
			]);
			focusFirst();
		}

		function back() {
			var last = history.pop();
			// Undo the step and any auto-skipped steps after it.
			var idx = steps.indexOf(last);
			steps.slice(idx).forEach(function (s) { delete answers[s]; });
			show();
		}

		function restart() {
			answers = {};
			history = [];
			show();
		}

		function nav() {
			return el('div', { class: 'jrcc-finder-nav' }, [
				history.length ? el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-ghost', onclick: back }, ['← ', T.back]) : null,
				history.length ? el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-link', onclick: restart }, T.startOver) : null
			]);
		}

		function results() {
			var list = J.filter(all, state());
			var chips = history.filter(function (s) { return answers[s] && answers[s].value !== ''; }).map(function (s) {
				return el('button', {
					type: 'button',
					class: 'jrcc-chip',
					title: (F.questions || {})[s] || '',
					onclick: function () {
						// Re-answer this step: rewind history to it.
						while (history.length && history[history.length - 1] !== s) back0();
						back0();
						show();
					}
				}, [answers[s].label, el('span', { 'aria-hidden': 'true' }, ' ✎')]);
			});
			var out = el('div', { class: 'jrcc-results' });
			J.append(panel, [
				el('h3', { class: 'jrcc-question' }, T.results),
				el('div', { class: 'jrcc-chips' }, chips),
				el('p', { class: 'jrcc-count' }, countLabel(list.length)),
				out,
				nav()
			]);
			J.renderCards(out, list);
		}

		function back0() {
			var last = history.pop();
			var idx = steps.indexOf(last);
			steps.slice(idx).forEach(function (s) { delete answers[s]; });
		}

		function focusFirst() {
			var b = panel.querySelector('.jrcc-option');
			if (b && root.dataset.jrccInteracted) b.focus({ preventScroll: true });
			root.dataset.jrccInteracted = '1';
		}

		show();
	}

	/* ------------------------------------------------------------ Wizard */

	function wizard(root, cfg, all) {
		var questions = ((F.wizard || {}).questions || []).filter(function (q) { return q.answers && q.answers.length; });
		J.clear(root);
		if (!questions.length) {
			root.appendChild(J.emptyState(T.wizardEmpty));
			return;
		}
		var byId = {};
		questions.forEach(function (q) { byId[q.id] = q; });
		var stack = []; // [{ q, answer }]
		var panel = el('div', { class: 'jrcc-finder-panel', 'aria-live': 'polite' });
		root.appendChild(el('div', { class: 'jrcc-finder' }, [heading(cfg), panel]));

		function combined() {
			var f = { cat1: [], cat2: [], cat3: [], days: [] };
			stack.forEach(function (s) {
				var a = s.answer.filters || {};
				['cat1', 'cat2', 'cat3', 'days'].forEach(function (k) {
					if (a[k] && a[k].length) f[k] = a[k].slice(); // Later answers refine earlier ones.
				});
				if (a.age_min !== '' && a.age_min !== undefined) f.ageMin = a.age_min;
				if (a.age_max !== '' && a.age_max !== undefined) f.ageMax = a.age_max;
				if (a.type) f.type = a.type;
				if (a.keywords) f.keywords = a.keywords;
				if (a.location) f.locName = a.location;
			});
			return f;
		}

		function ask(q) {
			J.clear(panel);
			J.append(panel, [
				el('h3', { class: 'jrcc-question' }, q.text),
				q.help ? el('p', { class: 'jrcc-muted' }, q.help) : null,
				el('div', { class: 'jrcc-options' }, q.answers.map(function (a) {
					return optionButton(a.label, null, function () { choose(q, a); });
				})),
				nav()
			]);
		}

		function choose(q, a) {
			stack.push({ q: q, answer: a });
			if (a.action === 'url' && a.url) {
				window.location.href = a.url;
				return;
			}
			if (a.action === 'next' && byId[a.next]) {
				ask(byId[a.next]);
				return;
			}
			results(a.message);
		}

		function results(message) {
			J.clear(panel);
			var list = J.filter(all, combined());
			var out = el('div', { class: 'jrcc-results' });
			J.append(panel, [
				el('h3', { class: 'jrcc-question' }, message || T.results),
				el('p', { class: 'jrcc-count' }, countLabel(list.length)),
				out,
				nav()
			]);
			J.renderCards(out, list);
		}

		function nav() {
			return el('div', { class: 'jrcc-finder-nav' }, stack.length ? [
				el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-ghost', onclick: function () { var s = stack.pop(); ask(s.q); } }, ['← ', T.back]),
				el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-link', onclick: function () { stack = []; ask(questions[0]); } }, T.startOver)
			] : null);
		}

		ask(questions[0]);
	}

	/* ------------------------------------------------------------ Family */

	function family(root, cfg, all) {
		var P = J.plan;
		var fields = (F.family || []).filter(function (f) { return f && f.field; });
		var onlyOpen = !!D.hideFull;
		if (!P.children().length) P.addChild('');

		J.clear(root);
		var list = el('div', { class: 'jrcc-children' });
		var schedule = el('div', { class: 'jrcc-family-schedule' });
		root.appendChild(el('div', { class: 'jrcc-finder jrcc-family' }, [
			heading(cfg),
			el('p', { class: 'jrcc-muted' }, T.familyIntro),
			list,
			el('div', { class: 'jrcc-family-actions' }, [
				el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-ghost', onclick: function () { P.addChild(''); } }, '+ ' + T.addChild),
				el('label', { class: 'jrcc-check' }, [el('input', { type: 'checkbox', checked: onlyOpen, onchange: function (e) { onlyOpen = e.target.checked; renderSchedule(); } }), ' ', T.onlyOpen])
			]),
			schedule
		]));

		// The plan (children, names, picks) can change from any widget or tab.
		document.addEventListener('jrcc:plan', function () {
			if (!root.isConnected) return;
			if (list.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') {
				renderSchedule();
				return;
			}
			render();
		});

		function matchesField(c, field, value) {
			if (!value) return true;
			if (field === 'age') return J.ageOverlaps(c, +value, +value);
			return c[field] === value;
		}

		function optionsFor(idx, child) {
			var pool = all;
			for (var i = 0; i < idx; i++) {
				var fi = fields[i];
				pool = pool.filter(function (c) { return matchesField(c, fi.field, child.v[i]); });
			}
			var f = fields[idx].field;
			if (f === 'age') return J.facets.age(pool);
			return J.facets.category(pool.map(function (c) { return { cat: c[f] }; }));
		}

		function classesFor(child) {
			var picked = all.filter(function (c) { return P.has(c.id, child.id); });
			if (!fields.length || !child.v[0]) return picked;
			var fit = all.filter(function (c) {
				for (var i = 0; i < fields.length; i++) {
					if (!matchesField(c, fields[i].field, child.v[i])) return false;
				}
				return !(onlyOpen && c.full) || P.has(c.id, child.id);
			});
			picked.forEach(function (c) { if (fit.indexOf(c) === -1) fit.push(c); });
			return fit;
		}

		function render() {
			J.clear(list);
			var kids = P.children();
			kids.forEach(function (child, idx) {
				var row = el('div', { class: 'jrcc-child', style: { '--jrcc-child': P.childColor(child.id) } }, [
					el('span', { class: 'jrcc-child-swatch', 'aria-hidden': 'true' }),
					el('input', {
						type: 'text',
						class: 'jrcc-input jrcc-child-name',
						value: child.name || '',
						placeholder: J.sprintf(T.child, idx + 1),
						'aria-label': T.childName,
						oninput: function (e) { P.updateChild(child.id, { name: e.target.value }); }
					})
				]);
				fields.forEach(function (f, fi) {
					if (fi > 0 && !child.v[fi - 1]) return;
					var opts = optionsFor(fi, child);
					row.appendChild(el('select', {
						class: 'jrcc-select',
						'aria-label': f.label,
						onchange: function (e) {
							var v = child.v.slice();
							v[fi] = e.target.value;
							for (var k = fi + 1; k < v.length; k++) v[k] = '';
							P.updateChild(child.id, { v: v });
						}
					}, [el('option', { value: '' }, f.label + ': ' + T.choose)].concat(opts.map(function (o) {
						return el('option', { value: o.value, selected: o.value === child.v[fi] }, o.label);
					}))));
				});
				var picks = P.itemsFor(child.id).length;
				row.appendChild(el('span', { class: 'jrcc-child-count' }, picks ? '✓ ' + (picks === 1 ? T.classCount1 : J.sprintf(T.classCount, picks)) : (child.v[0] ? J.countText(classesFor(child).length) : '')));
				if (kids.length > 1) {
					row.appendChild(el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-link', onclick: function () { P.removeChild(child.id); } }, T.remove));
				}
				list.appendChild(row);
			});
			renderSchedule();
		}

		function renderSchedule() {
			J.clear(schedule);
			var order = (D.weekStart || 7) === 7 ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
			var items = [];
			P.children().forEach(function (child) {
				classesFor(child).forEach(function (c) {
					items.push({ c: c, child: child, picked: P.has(c.id, child.id) });
				});
			});
			if (!items.length) {
				schedule.appendChild(J.emptyState(T.familyEmpty));
				return;
			}
			var days = order.filter(function (d) {
				return d <= 5 || items.some(function (it) { return (it.c.days || []).indexOf(d) !== -1; });
			});
			var grid = el('div', { class: 'jrcc-week jrcc-family-week', style: { '--jrcc-cols': days.length } });
			days.forEach(function (d) {
				var dayItems = items.filter(function (it) { return (it.c.days || []).indexOf(d) !== -1; }).sort(function (a, b) {
					return (a.c.start || '').localeCompare(b.c.start || '');
				});
				grid.appendChild(el('section', { class: 'jrcc-day' + (dayItems.length ? '' : ' is-empty') }, [
					el('h4', { class: 'jrcc-day-head' }, [el('span', { class: 'jrcc-day-name' }, T.days[d - 1]), el('span', { class: 'jrcc-day-count' }, dayItems.length ? String(dayItems.length) : '')]),
					el('div', { class: 'jrcc-day-events' }, dayItems.length ? dayItems.map(function (it) {
						var c = it.c;
						return el('div', { class: 'jrcc-event jrcc-family-event' + (c.full ? ' is-full' : '') + (it.picked ? ' is-picked' : ''), style: { '--jrcc-event': P.childColor(it.child.id) } }, [
							el('span', { class: 'jrcc-event-child' }, P.childLabel(it.child.id)),
							el('span', { class: 'jrcc-event-time' }, J.fmtTimeRange(c)),
							el('button', { type: 'button', class: 'jrcc-linklike jrcc-event-name', onclick: function () { J.openDetails(c); } }, c.name),
							D.showLocation && c.location ? el('span', { class: 'jrcc-event-meta' }, c.location.name) : null,
							D.showOpenings && c.open !== null ? el('span', { class: 'jrcc-event-meta' }, c.full ? J.config.labels.full : J.sprintf(T.spotsLeft, c.open)) : null,
							P.enabled ? P.button(c, { child: it.child.id, small: true }) : J.regLink(c, 'jrcc-btn-sm')
						]);
					}) : el('p', { class: 'jrcc-muted jrcc-none' }, T.nothingDay))
				]));
			});
			schedule.appendChild(grid);
		}

		render();
	}

	J.widgets.finder = function (root, cfg, ctx) {
		if (!ctx.classes.length) {
			J.clear(root);
			root.appendChild(J.emptyState());
			return;
		}
		var mode = cfg.mode || 'guided';
		if (mode === 'wizard') wizard(root, cfg, ctx.classes);
		else if (mode === 'family') family(root, cfg, ctx.classes);
		else guided(root, cfg, ctx.classes);
	};
})();
