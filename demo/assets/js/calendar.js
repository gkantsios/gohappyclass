/**
 * [jackrabbit_calendar] — week, month and list views.
 *
 * A class appears on a date when it meets that weekday and the date falls
 * inside its session (start–end date). Classes without meeting days (some
 * camps) appear on every weekday of their date range.
 */
(function () {
	'use strict';
	var J = window.JRCC;
	var el = J.el;
	var T = J.config.i18n;
	var D = J.config.display;

	function isoDay(d) {
		return d.getDay() === 0 ? 7 : d.getDay();
	}

	function addDays(d, n) {
		var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
		return x;
	}

	function weekStartOf(d) {
		var ws = D.weekStart || 7; // 7 = Sunday, 1 = Monday
		var offset = (isoDay(d) - ws + 7) % 7;
		return addDays(d, -offset);
	}

	function occursOn(c, date) {
		var s = J.ymd(date);
		if (c.sd && s < c.sd) return false;
		if (c.ed && s > c.ed) return false;
		if (c.days && c.days.length) return c.days.indexOf(isoDay(date)) !== -1;
		// No meeting days: a dated event/camp runs on weekdays of its range.
		if (!c.sd) return false;
		if (!c.ed) return s === c.sd;
		return isoDay(date) <= 5;
	}

	function weekendNote() {
		var msg = D.weekendMessage;
		if (!msg) return null;
		var m = msg.match(/^(.*)\{(.+?)\}(.*)$/);
		if (m && D.weekendLink) {
			return el('div', { class: 'jrcc-weekend-note' }, [m[1], el('a', { href: D.weekendLink }, m[2]), m[3]]);
		}
		return el('div', { class: 'jrcc-weekend-note' }, msg.replace(/[{}]/g, ''));
	}

	J.widgets.calendar = function (root, cfg, ctx) {
		var all = ctx.classes;
		var views = String(cfg.views || 'week,month,list').split(',').map(function (s) { return s.trim(); }).filter(function (v) {
			return ['week', 'month', 'list'].indexOf(v) !== -1;
		});
		if (!views.length) views = ['week'];
		var view = views.indexOf(cfg.view) !== -1 ? cfg.view : views[0];
		var showWeekends = cfg.weekends !== 'no';
		var colorBy = cfg.color_by || 'category';
		var fields = String(cfg.filters || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
		var today = new Date();
		today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		var anchor = today;

		J.clear(root);
		if (!all.length) {
			root.appendChild(J.emptyState());
			return;
		}

		// Stable colors: index in the sorted list of values.
		var colorKey = function (c) {
			return colorBy === 'location' ? (c.location ? c.location.name : '') : colorBy === 'category' ? c.cat : '';
		};
		var keys = [];
		all.forEach(function (c) {
			var k = colorKey(c);
			if (k && keys.indexOf(k) === -1) keys.push(k);
		});
		keys.sort();
		function colorOf(c) {
			if (colorBy === 'none') return 'var(--jrcc-primary)';
			var k = colorKey(c);
			return J.colorFor(k, keys.indexOf(k));
		}

		// Start on the first week that has classes when this week has none.
		var upcoming = all.filter(function (c) { return c.sd && c.sd > J.ymd(today); }).map(function (c) { return c.sd; }).sort();
		var thisWeek = weekStartOf(today);
		var hasThisWeek = all.some(function (c) {
			for (var i = 0; i < 7; i++) if (occursOn(c, addDays(thisWeek, i))) return true;
			return false;
		});
		if (!hasThisWeek && upcoming.length) anchor = J.parseDate(upcoming[0]);

		var title = el('h3', { class: 'jrcc-cal-title', 'aria-live': 'polite' });
		var nav = el('div', { class: 'jrcc-cal-nav' }, [
			el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-icon', 'aria-label': T.prev, onclick: function () { step(-1); } }, J.icon('left')),
			el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-ghost', onclick: function () { anchor = today; render(); } }, T.today),
			el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-icon', 'aria-label': T.next, onclick: function () { step(1); } }, J.icon('right'))
		]);
		var switcher = el('div', { class: 'jrcc-segmented', role: 'tablist' }, views.length > 1 ? views.map(function (v) {
			return el('button', {
				type: 'button',
				role: 'tab',
				'data-view': v,
				onclick: function () { view = v; render(); }
			}, T[v]);
		}) : null);
		var bar = J.filterBar(fields, all, render);
		var legend = el('div', { class: 'jrcc-legend' });
		var body = el('div', { class: 'jrcc-cal-body' });

		root.appendChild(el('div', { class: 'jrcc-cal-head' }, [el('div', { class: 'jrcc-cal-head-left' }, [nav, title]), switcher]));
		root.appendChild(el('div', { class: 'jrcc-toolbar' }, bar.el));
		root.appendChild(body);
		root.appendChild(legend);

		function step(dir) {
			anchor = view === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1) : addDays(anchor, 7 * dir);
			render();
		}

		function visibleDays(start) {
			var days = [];
			for (var i = 0; i < 7; i++) {
				var d = addDays(start, i);
				if (!showWeekends && isoDay(d) >= 6) continue;
				days.push(d);
			}
			return days;
		}

		function chip(c, compact) {
			var color = colorOf(c);
			return el('button', {
				type: 'button',
				class: 'jrcc-event' + (c.full ? ' is-full' : '') + (compact ? ' is-compact' : ''),
				style: { '--jrcc-event': color },
				onclick: function () { J.openDetails(c); }
			}, compact ? [el('span', { class: 'jrcc-event-time' }, J.fmtTime(c.start)), ' ', c.name] : [
				el('span', { class: 'jrcc-event-time' }, J.fmtTimeRange(c)),
				el('span', { class: 'jrcc-event-name' }, c.name),
				D.showLocation && c.location ? el('span', { class: 'jrcc-event-meta' }, c.location.name) : null,
				D.showAges && J.fmtAges(c) ? el('span', { class: 'jrcc-event-meta' }, J.fmtAges(c)) : null,
				J.openingsBadge(c)
			]);
		}

		/** Week-long (multi-day) camp sessions: one bar each, not a block on every day. */
		function multiDay(c) {
			return J.isCampSession(c) && !!c.ed && c.ed !== c.sd;
		}

		function campStrip(camps, from, to) {
			if (!camps.length) return null;
			return el('div', { class: 'jrcc-camp-strip' }, [
				el('h4', null, T.campsThisWeek),
				el('div', { class: 'jrcc-camp-strip-items' }, camps.map(function (c) {
					return el('button', { type: 'button', class: 'jrcc-event jrcc-camp-bar' + (c.full ? ' is-full' : ''), style: { '--jrcc-event': colorOf(c) }, onclick: function () { J.openDetails(c); } }, [
						el('span', { class: 'jrcc-event-time' }, [J.fmtDateRange(c), J.fmtTimeRange(c)].filter(Boolean).join(' · ')),
						el('span', { class: 'jrcc-event-name' }, J.sessionLabel(c) ? c.name + ' – ' + J.sessionLabel(c) : c.name),
						[J.fmtAges(c), D.showLocation && c.location ? c.location.name : ''].filter(Boolean).length ? el('span', { class: 'jrcc-event-meta' }, [J.fmtAges(c), D.showLocation && c.location ? c.location.name : ''].filter(Boolean).join(' · ')) : null,
						J.openingsBadge(c)
					]);
				}))
			]);
		}

		function renderWeek(list) {
			var start = weekStartOf(anchor);
			var days = visibleDays(start);
			title.textContent = J.fmtDate(J.ymd(days[0]), { month: 'short', day: 'numeric' }) + ' – ' + J.fmtDate(J.ymd(days[days.length - 1]), { month: 'short', day: 'numeric', year: 'numeric' });
			var from = J.ymd(start);
			var to = J.ymd(addDays(start, 6));
			var camps = list.filter(function (c) { return multiDay(c) && c.sd <= to && c.ed >= from; });
			list = list.filter(function (c) { return !multiDay(c); });
			var strip = campStrip(camps, from, to);
			if (strip) body.appendChild(strip);
			var grid = el('div', { class: 'jrcc-week', style: { '--jrcc-cols': days.length } });
			days.forEach(function (d) {
				var items = list.filter(function (c) { return occursOn(c, d); });
				var isToday = J.ymd(d) === J.ymd(today);
				var col = el('section', { class: 'jrcc-day' + (isToday ? ' is-today' : '') + (items.length ? '' : ' is-empty') }, [
					el('h4', { class: 'jrcc-day-head' }, [
						el('span', { class: 'jrcc-day-name' }, T.days[isoDay(d) - 1]),
						el('span', { class: 'jrcc-day-date' }, String(d.getDate())),
						el('span', { class: 'jrcc-day-count' }, items.length ? String(items.length) : '')
					]),
					isoDay(d) >= 6 ? weekendNote() : null,
					el('div', { class: 'jrcc-day-events' }, items.length ? items.map(function (c) { return chip(c); }) : el('p', { class: 'jrcc-muted jrcc-none' }, T.nothingDay))
				]);
				grid.appendChild(col);
			});
			body.appendChild(grid);
		}

		function renderMonth(list) {
			var first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
			title.textContent = J.fmtDate(J.ymd(first), { month: 'long', year: 'numeric' });
			var start = weekStartOf(first);
			var head = visibleDays(start);
			var grid = el('div', { class: 'jrcc-month', style: { '--jrcc-cols': head.length } });
			head.forEach(function (d) {
				grid.appendChild(el('div', { class: 'jrcc-month-dow' }, T.daysShort[isoDay(d) - 1]));
			});
			for (var w = 0; w < 6; w++) {
				var weekStart = addDays(start, w * 7);
				if (w > 3 && weekStart.getMonth() !== first.getMonth()) break;
				visibleDays(weekStart).forEach(function (d) {
					var inMonth = d.getMonth() === first.getMonth();
					var ds = J.ymd(d);
					// Multi-day camps appear once: on their first day in this month.
					var items = inMonth ? list.filter(function (c) {
						if (multiDay(c)) return occursOn(c, d) && (c.sd === ds || (d.getDate() === 1 && c.sd < ds) || (c.sd < J.ymd(first) && ds === J.ymd(first)));
						return occursOn(c, d);
					}) : [];
					var cell = el('div', { class: 'jrcc-month-cell' + (inMonth ? '' : ' is-out') + (J.ymd(d) === J.ymd(today) ? ' is-today' : '') }, [
						el('span', { class: 'jrcc-month-date' }, String(d.getDate()))
					]);
					items.slice(0, 3).forEach(function (c) { cell.appendChild(chip(c, true)); });
					if (items.length > 3) {
						var label = J.fmtDate(J.ymd(d), { weekday: 'long', month: 'long', day: 'numeric' });
						cell.appendChild(el('button', { type: 'button', class: 'jrcc-btn-link jrcc-month-more', onclick: function () { J.openList(label, items); } }, J.sprintf(T.more, items.length - 3)));
					}
					grid.appendChild(cell);
				});
			}
			body.appendChild(grid);
		}

		function renderList(list) {
			title.textContent = '';
			var order = [1, 2, 3, 4, 5, 6, 7];
			if ((D.weekStart || 7) === 7) order = [7, 1, 2, 3, 4, 5, 6];
			if (!showWeekends) order = order.filter(function (d) { return d <= 5; });
			var wrap = el('div', { class: 'jrcc-agenda' });
			order.forEach(function (d) {
				var items = list.filter(function (c) { return !J.isCampSession(c) && (c.days || []).indexOf(d) !== -1; });
				if (!items.length) return;
				wrap.appendChild(el('section', { class: 'jrcc-agenda-day' }, [
					el('h4', null, T.days[d - 1]),
					el('ul', null, items.map(function (c) {
						return el('li', { class: 'jrcc-agenda-row' + (c.full ? ' is-full' : ''), style: { '--jrcc-event': colorOf(c) } }, [
							el('span', { class: 'jrcc-agenda-time' }, J.fmtTimeRange(c)),
							el('span', { class: 'jrcc-agenda-main' }, [
								el('button', { type: 'button', class: 'jrcc-linklike jrcc-strong', onclick: function () { J.openDetails(c); } }, c.name),
								el('span', { class: 'jrcc-muted' }, [J.fmtAges(c), c.location ? c.location.name : '', J.fmtDateRange(c)].filter(Boolean).join(' · '))
							]),
							J.openingsBadge(c),
							J.action(c, 'jrcc-btn-sm')
						]);
					}))
				]));
			});
			var campRows = list.filter(J.isCampSession).sort(function (a, b) { return a.sd.localeCompare(b.sd) || (a.start || '').localeCompare(b.start || ''); });
			if (campRows.length) {
				wrap.appendChild(el('section', { class: 'jrcc-agenda-day' }, [el('h4', null, T.camps), el('ul', null, campRows.map(function (c) {
					return el('li', { class: 'jrcc-agenda-row' + (c.full ? ' is-full' : ''), style: { '--jrcc-event': colorOf(c) } }, [
						el('span', { class: 'jrcc-agenda-time' }, J.fmtDateRange(c)),
						el('span', { class: 'jrcc-agenda-main' }, [
							el('button', { type: 'button', class: 'jrcc-linklike jrcc-strong', onclick: function () { J.openDetails(c); } }, J.sessionLabel(c) ? c.name + ' – ' + J.sessionLabel(c) : c.name),
							el('span', { class: 'jrcc-muted' }, [J.fmtTimeRange(c), J.fmtAges(c), c.location ? c.location.name : ''].filter(Boolean).join(' · '))
						]),
						J.openingsBadge(c),
						J.action(c, 'jrcc-btn-sm')
					]);
				}))]));
			}
			var undated = list.filter(function (c) { return (!c.days || !c.days.length) && !J.isCampSession(c); });
			if (undated.length) {
				wrap.appendChild(el('section', { class: 'jrcc-agenda-day' }, [el('h4', null, T.dates), el('ul', null, undated.map(function (c) {
					return el('li', { class: 'jrcc-agenda-row', style: { '--jrcc-event': colorOf(c) } }, [
						el('span', { class: 'jrcc-agenda-time' }, J.fmtDateRange(c)),
						el('span', { class: 'jrcc-agenda-main' }, el('button', { type: 'button', class: 'jrcc-linklike jrcc-strong', onclick: function () { J.openDetails(c); } }, c.name)),
						J.action(c, 'jrcc-btn-sm')
					]);
				}))]));
			}
			if (!wrap.children.length) wrap.appendChild(J.emptyState(T.noResults));
			body.appendChild(wrap);
		}

		function renderLegend(list) {
			J.clear(legend);
			if (colorBy === 'none') return;
			var shown = [];
			list.forEach(function (c) {
				var k = colorKey(c);
				if (k && shown.indexOf(k) === -1) shown.push(k);
			});
			if (shown.length < 2) return;
			shown.sort().forEach(function (k) {
				legend.appendChild(el('span', { class: 'jrcc-legend-item' }, [el('i', { style: { background: J.colorFor(k, keys.indexOf(k)) } }), k]));
			});
		}

		function render() {
			var list = J.filter(all, bar.state());
			J.clear(body);
			nav.hidden = view === 'list';
			switcher.querySelectorAll('button').forEach(function (b) {
				b.setAttribute('aria-selected', b.getAttribute('data-view') === view ? 'true' : 'false');
			});
			root.setAttribute('data-view', view);
			if (view === 'month') renderMonth(list);
			else if (view === 'list') renderList(list);
			else renderWeek(list);
			renderLegend(list);
		}
		render();
	};
})();
