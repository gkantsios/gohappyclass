/**
 * [jackrabbit_map] — locations on a map with "near me" / ZIP search.
 *
 * Works with OpenStreetMap (bundled Leaflet, no key) or Google Maps. The map
 * library is only loaded when the widget scrolls into view.
 */
(function () {
	'use strict';
	var J = window.JRCC;
	var el = J.el;
	var C = J.config;
	var T = C.i18n;
	var M = C.map || {};

	/* --------------------------------------------------------- Providers */

	var loaders = {};
	function loadScript(src, globalName) {
		if (window[globalName]) return Promise.resolve();
		if (!loaders[src]) {
			loaders[src] = new Promise(function (resolve, reject) {
				var s = document.createElement('script');
				s.src = src;
				s.async = true;
				s.onload = function () { resolve(); };
				s.onerror = reject;
				document.head.appendChild(s);
			});
		}
		return loaders[src];
	}

	function loadGoogle() {
		if (window.google && window.google.maps) return Promise.resolve();
		if (!loaders.google) {
			loaders.google = new Promise(function (resolve, reject) {
				window.__jrccGoogleReady = resolve;
				var s = document.createElement('script');
				s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(M.key) + '&callback=__jrccGoogleReady&loading=async';
				s.async = true;
				s.onerror = reject;
				document.head.appendChild(s);
			});
		}
		return loaders.google;
	}

	function pinHtml(count, active) {
		return '<span class="jrcc-pin' + (active ? ' is-active' : '') + '"><span>' + count + '</span></span>';
	}

	function leafletMap(div, center, zoom) {
		var Lf = window.L;
		var map = Lf.map(div, { scrollWheelZoom: false }).setView(center, zoom);
		Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);
		var layer = Lf.layerGroup().addTo(map);
		var originLayer = Lf.layerGroup().addTo(map);
		return {
			setMarkers: function (items, onClick, activeKey) {
				layer.clearLayers();
				items.forEach(function (it) {
					var m = Lf.marker([it.lat, it.lng], {
						title: it.title,
						alt: it.title,
						icon: Lf.divIcon({ className: 'jrcc-pin-wrap', html: pinHtml(it.count, it.key === activeKey), iconSize: [34, 42], iconAnchor: [17, 42] }),
						zIndexOffset: it.key === activeKey ? 1000 : 0
					});
					m.on('click', function () { onClick(it.key); });
					m.addTo(layer);
				});
			},
			fit: function (points) {
				if (!points.length) return;
				if (points.length === 1) map.setView(points[0], 13);
				else map.fitBounds(points, { padding: [30, 30], maxZoom: 13 });
			},
			focus: function (lat, lng, z) { map.setView([lat, lng], z || 14); },
			origin: function (lat, lng) {
				originLayer.clearLayers();
				if (lat !== null) Lf.circleMarker([lat, lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }).addTo(originLayer);
			},
			resize: function () { map.invalidateSize(); }
		};
	}

	function googleMap(div, center, zoom) {
		var g = window.google.maps;
		var map = new g.Map(div, { center: { lat: center[0], lng: center[1] }, zoom: zoom, mapTypeControl: false, streetViewControl: false, gestureHandling: 'cooperative' });
		var markers = [];
		var originMarker = null;
		var primary = getComputedStyle(div).getPropertyValue('--jrcc-primary').trim() || '#1f6f64';
		var accent = getComputedStyle(div).getPropertyValue('--jrcc-accent').trim() || '#f2a541';
		return {
			setMarkers: function (items, onClick, activeKey) {
				markers.forEach(function (m) { m.setMap(null); });
				markers = items.map(function (it) {
					var active = it.key === activeKey;
					var m = new g.Marker({
						position: { lat: it.lat, lng: it.lng },
						map: map,
						title: it.title,
						label: { text: String(it.count), color: '#fff', fontWeight: '700', fontSize: '12px' },
						icon: { path: 'M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z', fillColor: active ? accent : primary, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 1.2, anchor: new g.Point(12, 32), labelOrigin: new g.Point(12, 12) },
						zIndex: active ? 999 : 1
					});
					m.addListener('click', function () { onClick(it.key); });
					return m;
				});
			},
			fit: function (points) {
				if (!points.length) return;
				if (points.length === 1) {
					map.setCenter({ lat: points[0][0], lng: points[0][1] });
					map.setZoom(13);
					return;
				}
				var b = new g.LatLngBounds();
				points.forEach(function (p) { b.extend({ lat: p[0], lng: p[1] }); });
				map.fitBounds(b, 30);
				g.event.addListenerOnce(map, 'idle', function () { if (map.getZoom() > 13) map.setZoom(13); });
			},
			focus: function (lat, lng, z) { map.setCenter({ lat: lat, lng: lng }); map.setZoom(z || 14); },
			origin: function (lat, lng) {
				if (originMarker) originMarker.setMap(null);
				if (lat !== null) originMarker = new g.Marker({ position: { lat: lat, lng: lng }, map: map, icon: { path: g.SymbolPath.CIRCLE, scale: 7, fillColor: '#1a73e8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 } });
			},
			resize: function () {}
		};
	}

	function createMap(div, center, zoom) {
		if (M.provider === 'google' && M.key) {
			return loadGoogle().then(function () { return googleMap(div, center, zoom); });
		}
		return loadScript(C.leaflet, 'L').then(function () { return leafletMap(div, center, zoom); });
	}

	function whenVisible(node, fn) {
		if (!('IntersectionObserver' in window)) return fn();
		var io = new IntersectionObserver(function (entries) {
			if (entries.some(function (e) { return e.isIntersecting; })) {
				io.disconnect();
				fn();
			}
		}, { rootMargin: '200px' });
		io.observe(node);
	}

	/* ----------------------------------------------------------- Distance */

	function km(a, b, c, d) {
		var r = 6371;
		var dLat = ((c - a) * Math.PI) / 180;
		var dLng = ((d - b) * Math.PI) / 180;
		var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((a * Math.PI) / 180) * Math.cos((c * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
		return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
	}

	function fmtDistance(k) {
		var v = M.unit === 'km' ? k : k * 0.621371;
		return (v < 10 ? v.toFixed(1) : Math.round(v)) + ' ' + M.unit;
	}

	/* ------------------------------------------------------------- Widget */

	J.widgets.map = function (root, cfg, ctx) {
		var all = ctx.classes;
		var mapOnly = cfg.layout === 'map';
		var radiusKm = (parseFloat(cfg.radius) || 50) * (M.unit === 'km' ? 1 : 1.609344);
		var fields = String(cfg.filters || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
		var selected = null;
		var origin = null;
		var map = null;

		J.clear(root);
		if (!all.length) {
			root.appendChild(J.emptyState());
			return;
		}

		var canvas = el('div', { class: 'jrcc-map-canvas', style: { height: (parseInt(cfg.height, 10) || 560) + 'px' }, role: 'region', 'aria-label': T.location });
		var status = el('p', { class: 'jrcc-map-status', 'aria-live': 'polite' });
		var listBox = el('div', { class: 'jrcc-map-list' });
		var bar = J.filterBar(fields, all, function () { render(); });

		var input = el('input', { type: 'search', class: 'jrcc-input', placeholder: T.searchPlace, 'aria-label': T.searchPlace, autocomplete: 'postal-code' });
		var search = el('form', {
			class: 'jrcc-map-search',
			onsubmit: function (e) {
				e.preventDefault();
				var q = input.value.trim();
				if (!q) {
					origin = null;
					render();
					return;
				}
				status.textContent = T.locating;
				J.geocode(q).then(function (res) {
					if (res && res.found) {
						setOrigin(res.lat, res.lng);
					} else {
						status.textContent = (res && res.message) || T.noPlace;
					}
				}).catch(function () { status.textContent = T.noPlace; });
			}
		}, [
			el('label', { class: 'jrcc-filter jrcc-filter-search' }, [J.icon('search'), input]),
			el('button', { type: 'submit', class: 'jrcc-btn jrcc-btn-primary' }, T.go),
			navigator.geolocation ? el('button', {
				type: 'button',
				class: 'jrcc-btn jrcc-btn-ghost',
				onclick: function () {
					status.textContent = T.locating;
					navigator.geolocation.getCurrentPosition(function (p) {
						setOrigin(p.coords.latitude, p.coords.longitude);
					}, function () { status.textContent = T.noGeo; }, { timeout: 10000, maximumAge: 600000 });
				}
			}, [J.icon('target'), ' ', T.nearMe]) : null
		]);

		if (mapOnly) {
			root.appendChild(el('div', { class: 'jrcc-toolbar' }, [search, bar.el]));
			root.appendChild(status);
			root.appendChild(canvas);
		} else {
			root.appendChild(el('div', { class: 'jrcc-map-layout' }, [
				el('div', { class: 'jrcc-map-side' }, [search, el('div', { class: 'jrcc-toolbar' }, bar.el), status, listBox]),
				el('div', { class: 'jrcc-map-main' }, canvas)
			]));
		}

		function setOrigin(lat, lng) {
			origin = { lat: lat, lng: lng };
			selected = null;
			if (map) map.origin(lat, lng);
			render(true);
		}

		/** Locations that still have classes after filters: [{ key, loc, classes, km }] */
		function groups(list) {
			var map2 = {};
			list.forEach(function (c) {
				if (!c.location || c.location.lat === null || c.location.lat === undefined) return;
				(map2[c.loc] = map2[c.loc] || { key: c.loc, loc: c.location, classes: [] }).classes.push(c);
			});
			var out = Object.keys(map2).map(function (k) {
				var g = map2[k];
				g.km = origin ? km(origin.lat, origin.lng, g.loc.lat, g.loc.lng) : null;
				return g;
			});
			out.sort(function (a, b) {
				return origin ? a.km - b.km : a.loc.name.localeCompare(b.loc.name);
			});
			return out;
		}

		function render(fitToOrigin) {
			var list = J.filter(all, bar.state());
			var gs = groups(list);
			var visible = gs;
			var note = '';
			if (origin) {
				visible = gs.filter(function (g) { return g.km <= radiusKm; });
				if (!visible.length) {
					visible = gs.slice(0, 5);
					note = J.sprintf(T.noNearby, fmtDistance(radiusKm));
				} else {
					note = J.sprintf(T.within, fmtDistance(radiusKm)) + ' · ' + J.countText(visible.reduce(function (n, g) { return n + g.classes.length; }, 0));
				}
			}
			status.textContent = note;

			// One location only (e.g. a single studio): open it directly.
			if (!selected && !origin && visible.length === 1 && !mapOnly) selected = visible[0].key;
			var sel = selected && visible.find(function (g) { return g.key === selected; });
			if (selected && !sel) selected = null;

			if (map) {
				map.setMarkers(visible.map(function (g) {
					return { key: g.key, lat: g.loc.lat, lng: g.loc.lng, count: g.classes.length, title: g.loc.name };
				}), select, selected);
				if (sel) map.focus(sel.loc.lat, sel.loc.lng, 14);
				else if (fitToOrigin !== false) {
					var pts = visible.map(function (g) { return [g.loc.lat, g.loc.lng]; });
					if (origin && fitToOrigin) pts.push([origin.lat, origin.lng]);
					map.fit(pts);
				}
			}
			if (!mapOnly) renderList(visible, sel, list);
		}

		function select(key) {
			if (mapOnly) {
				var g = groups(J.filter(all, bar.state())).find(function (x) { return x.key === key; });
				if (g) J.openList(g.loc.name, g.classes);
				return;
			}
			selected = key;
			render(false);
			listBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}

		function renderList(visible, sel, list) {
			J.clear(listBox);
			if (sel) {
				var loc = sel.loc;
				var cardsBox = el('div');
				J.append(listBox, [
					visible.length > 1 ? el('button', { type: 'button', class: 'jrcc-btn jrcc-btn-link', onclick: function () { selected = null; render(); } }, ['← ', T.allLocations]) : null,
					el('div', { class: 'jrcc-loc-head' }, [
						el('h3', null, loc.name),
						loc.address && loc.address !== loc.name ? el('p', { class: 'jrcc-muted' }, loc.address) : null,
						el('p', { class: 'jrcc-muted' }, [
							J.countText(sel.classes.length),
							sel.km !== null ? ' · ' + J.sprintf(T.away, fmtDistance(sel.km)) : '',
							' · ',
							el('a', { href: 'https://www.google.com/maps/dir/?api=1&destination=' + loc.lat + ',' + loc.lng, target: '_blank', rel: 'noopener' }, T.directions)
						])
					]),
					cardsBox
				]);
				J.renderCards(cardsBox, sel.classes);
				return;
			}
			if (!visible.length) {
				listBox.appendChild(J.emptyState(T.noResults));
				return;
			}
			var unplaced = list.filter(function (c) { return !c.location || c.location.lat === null || c.location.lat === undefined; });
			listBox.appendChild(el('ul', { class: 'jrcc-loc-list' }, visible.map(function (g) {
				return el('li', null, el('button', { type: 'button', class: 'jrcc-loc', onclick: function () { select(g.key); } }, [
					el('span', { class: 'jrcc-loc-count' }, String(g.classes.length)),
					el('span', { class: 'jrcc-loc-text' }, [
						el('strong', null, g.loc.name),
						g.loc.address && g.loc.address !== g.loc.name ? el('span', { class: 'jrcc-muted' }, g.loc.address) : null
					]),
					g.km !== null ? el('span', { class: 'jrcc-loc-dist' }, fmtDistance(g.km)) : null
				]));
			})));
			if (unplaced.length && !origin) {
				var box = el('div');
				listBox.appendChild(el('details', { class: 'jrcc-unplaced' }, [el('summary', null, J.countText(unplaced.length) + ' · ' + T.allLocations), box]));
				J.renderCards(box, unplaced);
			}
		}

		render();
		whenVisible(canvas, function () {
			createMap(canvas, [M.lat || 39.5, M.lng || -98.35], M.zoom || 4).then(function (m) {
				map = m;
				render();
			}).catch(function (err) {
				canvas.appendChild(el('p', { class: 'jrcc-map-error' }, T.error));
				if (window.console) console.error('GoHappyClass Connect map:', err);
			});
		});
	};
})();
