/**
 * [jackrabbit_classes] — searchable class cards or table.
 * Also provides JRCC.renderCards(), used by the finder and the map.
 */
(function () {
	'use strict';
	var J = window.JRCC;
	var el = J.el;
	var T = J.config.i18n;
	var L = J.config.labels;
	var D = J.config.display;
	var PAGE = 24;

	/**
	 * Cards with progressive "Show more".
	 * opts: { decorate(c) → card options, empty: text }
	 */
	function renderCards(container, classes, opts) {
		opts = opts || {};
		J.clear(container);
		if (!classes.length) {
			container.appendChild(J.emptyState(opts.empty || T.noResults));
			return;
		}
		var grid = el('div', { class: 'jrcc-cards' });
		var shown = 0;
		var more = el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-ghost jrcc-more', onclick: next }, T.showAll);
		function next() {
			classes.slice(shown, shown + PAGE).forEach(function (c) {
				grid.appendChild(J.card(c, opts.decorate ? opts.decorate(c) : null));
			});
			shown += PAGE;
			more.hidden = shown >= classes.length;
		}
		container.appendChild(grid);
		container.appendChild(el('div', { class: 'jrcc-center' }, more));
		next();
	}

	function renderTable(container, classes) {
		J.clear(container);
		if (!classes.length) {
			container.appendChild(J.emptyState(T.noResults));
			return;
		}
		var head = [L.class, T.when];
		if (D.showAges) head.push(T.age);
		if (D.showLocation) head.push(T.location);
		if (D.showDates) head.push(T.dates);
		if (D.showOpenings) head.push(T.openings);
		if (D.showPrice) head.push(T.tuition);
		head.push('');
		var rows = classes.map(function (c) {
			var cells = [
				el('td', { 'data-label': L.class }, [
					el('button', { type: 'button', class: 'jrcc-linklike jrcc-strong', onclick: function () { J.openDetails(c); } }, c.name),
					c.cat ? el('div', { class: 'jrcc-muted' }, c.cat) : null
				]),
				el('td', { 'data-label': T.when }, [J.fmtDays(c.days), el('br'), J.fmtTimeRange(c)])
			];
			if (D.showAges) cells.push(el('td', { 'data-label': T.age }, J.fmtAges(c).replace(T.ages + ' ', '')));
			if (D.showLocation) cells.push(el('td', { 'data-label': T.location }, c.location ? c.location.name : ''));
			if (D.showDates) cells.push(el('td', { 'data-label': T.dates }, J.fmtDateRange(c)));
			if (D.showOpenings) cells.push(el('td', { 'data-label': T.openings }, c.full ? el('span', { class: 'jrcc-badge jrcc-badge-full' }, L.full) : (c.open === null ? '' : String(c.open))));
			if (D.showPrice) cells.push(el('td', { 'data-label': T.tuition }, c.price || ''));
			cells.push(el('td', { class: 'jrcc-td-action' }, J.action(c, 'jrcc-btn-sm')));
			return el('tr', { class: c.full ? 'is-full' : null }, cells);
		});
		container.appendChild(el('div', { class: 'jrcc-table-wrap' }, el('table', { class: 'jrcc-table' }, [
			el('thead', null, el('tr', null, head.map(function (h) { return el('th', { scope: 'col' }, h); }))),
			el('tbody', null, rows)
		])));
	}

	function countText(n) {
		return n === 1 ? T.classCount1 : J.sprintf(T.classCount, n);
	}

	J.renderCards = renderCards;
	J.renderTable = renderTable;
	J.countText = countText;

	J.widgets.classes = function (root, cfg, ctx) {
		var all = ctx.classes;
		var sort = J.sorters[cfg.sort] ? cfg.sort : 'day';
		var limit = parseInt(cfg.limit, 10) || 0;
		var fields = String(cfg.filters || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

		J.clear(root);
		if (!all.length) {
			root.appendChild(J.emptyState());
			return;
		}

		var count = el('span', { class: 'jrcc-count', 'aria-live': 'polite' });
		var sortSel = el('select', { class: 'jrcc-select', 'aria-label': T.sortBy, onchange: function () { sort = sortSel.value; render(); } },
			[['day', T.sortDay], ['date', T.sortDate], ['name', T.sortName], ['age', T.sortAge]].map(function (o) {
				return el('option', { value: o[0], selected: o[0] === sort }, o[1]);
			}));
		var bar = J.filterBar(fields, all, render);
		var results = el('div', { class: 'jrcc-results' });

		root.appendChild(el('div', { class: 'jrcc-toolbar' }, [bar.el, el('div', { class: 'jrcc-toolbar-end' }, [count, el('label', { class: 'jrcc-filter' }, [el('span', { class: 'jrcc-filter-label' }, T.sortBy), sortSel])])]));
		root.appendChild(results);

		function render() {
			var list = J.filter(all, bar.state()).sort(J.sorters[sort]);
			if (limit) list = list.slice(0, limit);
			count.textContent = countText(list.length);
			if (cfg.layout === 'table') renderTable(results, list);
			else renderCards(results, list);
		}
		render();
	};
})();
