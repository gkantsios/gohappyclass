/**
 * [jackrabbit] — the finder, map, calendar and list in one tabbed widget.
 * Each tab is mounted the first time it is opened.
 */
(function () {
	'use strict';
	var J = window.JRCC;
	var el = J.el;
	var T = J.config.i18n;
	var LABELS = { finder: T.findTab, family: T.familyTab, map: T.mapTab, calendar: T.calendarTab, classes: T.listTab };
	// Tabs that are a mode of another widget.
	var WIDGET = { family: 'finder' };
	var SCOPE = ['org', 'category', 'cat1', 'cat2', 'cat3', 'categories', 'exclude', 'keywords', 'location', 'type', 'age', 'hide_full'];

	J.widgets.app = function (root, cfg) {
		var tabs = String(cfg.tabs || 'finder,map,calendar,classes').split(',').map(function (s) { return s.trim(); }).filter(function (t) {
			return LABELS[t] && J.widgets[WIDGET[t] || t];
		});
		if (!tabs.length) return;
		var current = tabs.indexOf(cfg.default) !== -1 ? cfg.default : tabs[0];
		var uid = root.id || 'jrcc-app';
		var panels = {};
		var buttons = {};

		J.clear(root);
		var list = el('div', { class: 'jrcc-tabs', role: 'tablist' });
		root.appendChild(list);

		tabs.forEach(function (t) {
			buttons[t] = el('button', {
				type: 'button',
				role: 'tab',
				id: uid + '-tab-' + t,
				'aria-controls': uid + '-panel-' + t,
				onclick: function () { open(t, true); },
				onkeydown: function (e) {
					var i = tabs.indexOf(t);
					if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
						e.preventDefault();
						var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
						open(n, true);
						buttons[n].focus();
					}
				}
			}, LABELS[t]);
			list.appendChild(buttons[t]);
			panels[t] = el('div', { class: 'jrcc-tab-panel', role: 'tabpanel', id: uid + '-panel-' + t, 'aria-labelledby': uid + '-tab-' + t, hidden: true });
			root.appendChild(panels[t]);
		});

		function open(t) {
			current = t;
			tabs.forEach(function (x) {
				buttons[x].setAttribute('aria-selected', x === t ? 'true' : 'false');
				buttons[x].tabIndex = x === t ? 0 : -1;
				panels[x].hidden = x !== t;
			});
			if (!panels[t].dataset.mounted) {
				panels[t].dataset.mounted = '1';
				var child = Object.assign({}, (cfg.children || {})[WIDGET[t] || t] || {}, { widget: WIDGET[t] || t });
				if (t === 'family') child.mode = 'family';
				SCOPE.forEach(function (k) { child[k] = cfg[k]; });
				J.mount(panels[t], child);
			}
		}

		open(current);
	};
})();
