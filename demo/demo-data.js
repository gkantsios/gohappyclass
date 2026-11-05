/**
 * Fictional sample data for the GoHappyClass Connect demo.
 *
 * "Happy Hoppers Gym & Swim" does not exist. Classes are generated in the
 * same shape the WordPress plugin serves from Jackrabbit, with session dates
 * relative to today so the calendar always has current classes.
 */
(function () {
	'use strict';

	var ORG = '100001';

	// Small deterministic random generator so the demo looks the same on every visit.
	var seed = 20261105;
	function rand() {
		seed = (seed * 1664525 + 1013904223) % 4294967296;
		return seed / 4294967296;
	}
	function pick(list) {
		return list[Math.floor(rand() * list.length)];
	}

	function ymd(d) {
		var m = d.getMonth() + 1;
		var day = d.getDate();
		return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
	}
	var today = new Date();
	today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	var sessionStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
	var sessionEnd = new Date(today.getFullYear(), today.getMonth() + 7, 0);
	// Monday of this week.
	var monday = new Date(today);
	monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

	var locations = {
		'hh-cary': { key: 'hh-cary', org: ORG, code: 'CARY', name: 'Happy Hoppers Cary', address: '412 Hopper Lane, Cary, NC 27513', city: 'Cary', state: 'NC', phone: '(919) 555-0141', lat: 35.7915, lng: -78.7811, approx: false },
		'hh-north': { key: 'hh-north', org: ORG, code: 'NRAL', name: 'Happy Hoppers North Raleigh', address: '8800 Bounce Blvd, Raleigh, NC 27615', city: 'Raleigh', state: 'NC', phone: '(919) 555-0162', lat: 35.8901, lng: -78.6389, approx: false },
		'hh-durham': { key: 'hh-durham', org: ORG, code: 'DURH', name: 'Happy Hoppers Durham', address: '215 Cartwheel Court, Durham, NC 27707', city: 'Durham', state: 'NC', phone: '(919) 555-0187', lat: 35.9682, lng: -78.9586, approx: false },
		'hh-wake': { key: 'hh-wake', org: ORG, code: 'WAKE', name: 'Happy Hoppers Wake Forest', address: '1600 Splash Way, Wake Forest, NC 27587', city: 'Wake Forest', state: 'NC', phone: '(919) 555-0123', lat: 35.9799, lng: -78.5097, approx: false }
	};

	var AGE_GROUPS = [
		{ cat2: 'Parent & Tot (18 mo–3)', min: 18, max: 36 },
		{ cat2: 'Preschool (3–5)', min: 36, max: 71 },
		{ cat2: 'Kids (6–9)', min: 72, max: 119 },
		{ cat2: 'Tweens & Teens (10–15)', min: 120, max: 191 }
	];

	var PROGRAMS = {
		Gymnastics: { names: ['Tiny Tumblers', 'Preschool Tumbling', 'Kids Gymnastics', 'Teen Gymnastics'], fee: [75, 85, 95, 110], desc: 'Rolls, cartwheels, bars and beam in a safe, encouraging setting. Skills build week by week and every child moves at their own pace.' },
		Swim: { names: ['Parent & Tot Splash', 'Little Otters Swim', 'Kids Swim', 'Swim Team Prep'], fee: [80, 90, 95, 115], desc: 'Small classes in our warm-water pool. Water confidence first, then floats, kicks and strokes, with a maximum of four swimmers per instructor.' },
		Dance: { names: ['Tiny Dancers', 'Pre-Ballet & Tap', 'Hip Hop Kids', 'Jazz & Contemporary'], fee: [70, 80, 85, 95], desc: 'Music, movement and a little bit of show time. Dancers learn steps and routines and perform for families at the end of each session.' },
		'Ninja Warrior': { names: [null, 'Ninja Cubs', 'Ninja Warriors', 'Teen Parkour'], fee: [0, 90, 100, 110], desc: 'Climbing, swinging and obstacle courses that build strength, balance and grit. Our most popular class for high-energy kids.' }
	};

	var COACHES = ['Coach Maya', 'Coach Jordan', 'Coach Priya', 'Coach Ben', 'Coach Ellie', 'Coach Marcus', 'Coach Sofia', 'Coach Theo'];
	var LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

	var classes = [];
	var nextId = 70001;

	function addMinutes(t, mins) {
		var p = t.split(':');
		var total = +p[0] * 60 + +p[1] + mins;
		var h = Math.floor(total / 60);
		var m = total % 60;
		return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
	}

	function openings() {
		var r = rand();
		if (r < 0.12) return 0;
		if (r < 0.3) return 1 + Math.floor(rand() * 3);
		return 4 + Math.floor(rand() * 9);
	}

	function makeClass(locKey, program, ageIdx, level, day, start, minutes) {
		var p = PROGRAMS[program];
		var g = AGE_GROUPS[ageIdx];
		var fee = p.fee[ageIdx] + LEVELS.indexOf(level) * 5;
		var open = openings();
		var name = p.names[ageIdx] + (ageIdx === 0 ? '' : ' – ' + level);
		var id = nextId++;
		classes.push({
			id: id,
			org: ORG,
			name: name,
			desc: '<p>' + p.desc + '</p><p>' + (ageIdx === 0 ? 'A parent or caregiver joins in the fun.' : level + ' level. Not sure which level fits? Our coaches will help after the first class.') + '</p>',
			cat1: program,
			cat2: g.cat2,
			cat3: ageIdx === 0 ? 'Beginner' : level,
			session: 'Sample Session',
			gender: '',
			days: [day],
			start: start,
			end: addMinutes(start, minutes),
			sd: ymd(sessionStart),
			ed: ymd(sessionEnd),
			min: g.min,
			max: g.max,
			open: open,
			wait: open === 0,
			price: '$' + fee + '/mo',
			monthly: true,
			fee: fee,
			billing: 'monthly',
			reg: 'https://app.jackrabbitclass.com/regv2.asp?id=' + ORG + '&preLoadClassID=' + id,
			ext: false,
			reg_start: '',
			instructors: [pick(COACHES)],
			room: '',
			type: 'class',
			loc: locKey
		});
	}

	// Weekly schedule per location: [program, age group, level, day (1=Mon), start, minutes]
	var weekday = ['15:30', '16:30', '17:30', '18:30'];
	var morning = ['09:30', '10:30'];
	var saturday = ['09:00', '10:00', '11:00'];
	Object.keys(locations).forEach(function (locKey, li) {
		var offerings = [
			['Gymnastics', 0, 'Beginner'], ['Gymnastics', 1, 'Beginner'], ['Gymnastics', 2, 'Beginner'], ['Gymnastics', 2, 'Intermediate'], ['Gymnastics', 3, 'Advanced'],
			['Swim', 0, 'Beginner'], ['Swim', 1, 'Beginner'], ['Swim', 2, 'Intermediate'], ['Swim', 3, 'Advanced'],
			['Dance', 1, 'Beginner'], ['Dance', 2, 'Beginner'], ['Dance', 3, 'Intermediate'],
			['Ninja Warrior', 1, 'Beginner'], ['Ninja Warrior', 2, 'Beginner'], ['Ninja Warrior', 2, 'Advanced'], ['Ninja Warrior', 3, 'Intermediate']
		];
		// Each location offers a slightly different mix.
		offerings.filter(function (o, i) { return (i + li) % 4 !== 0; }).forEach(function (o) {
			var young = o[1] <= 1;
			var day;
			var start;
			if (young && rand() < 0.6) {
				day = 1 + Math.floor(rand() * 5);
				start = pick(morning);
			} else if (rand() < 0.2) {
				day = 6;
				start = pick(saturday);
			} else {
				day = 1 + Math.floor(rand() * 5);
				start = pick(young ? weekday.slice(0, 2) : weekday);
			}
			makeClass(locKey, o[0], o[1], o[2], day, start, young ? 45 : 60);
		});
	});

	// Week-long holiday camps a few weeks out.
	[
		{ name: 'Holiday Break Camp', weeks: 3, loc: 'hh-cary' },
		{ name: 'Ninja Adventure Camp', weeks: 5, loc: 'hh-north' },
		{ name: 'Splash & Play Camp', weeks: 7, loc: 'hh-wake' },
		{ name: 'Gymnastics Stars Camp', weeks: 9, loc: 'hh-durham' }
	].forEach(function (camp) {
		var sd = new Date(monday);
		sd.setDate(monday.getDate() + camp.weeks * 7);
		var ed = new Date(sd);
		ed.setDate(sd.getDate() + 4);
		var open = openings() + 4;
		var id = nextId++;
		classes.push({
			id: id,
			org: ORG,
			name: camp.name,
			desc: '<p>A full week of games, crafts, skill stations and themed days. Bring a lunch and a water bottle; snacks are provided.</p>',
			cat1: 'Camp',
			cat2: 'Kids (6–9)',
			cat3: 'Beginner',
			session: 'Camps',
			gender: '',
			days: [1, 2, 3, 4, 5],
			start: '09:00',
			end: '15:00',
			sd: ymd(sd),
			ed: ymd(ed),
			min: 60,
			max: 144,
			open: open,
			wait: false,
			price: '$295/session',
			monthly: false,
			fee: 295,
			billing: 'by session dates',
			reg: 'https://app.jackrabbitclass.com/regv2.asp?id=' + ORG + '&preLoadClassID=' + id,
			ext: false,
			reg_start: '',
			instructors: [pick(COACHES)],
			room: '',
			type: 'camp',
			loc: camp.loc
		});
	});

	window.GHC_DEMO_PAYLOAD = {
		generated: Math.floor(Date.now() / 1000),
		classes: classes,
		locations: locations,
		orgs: { 100001: { name: 'Happy Hoppers Gym & Swim', url: '' } }
	};

	// Demo-only place search: a few Triangle-area ZIP codes and towns, no outside requests.
	var PLACES = {
		cary: [35.7915, -78.7811], 27511: [35.7631, -78.7836], 27513: [35.8032, -78.8031], 27519: [35.8113, -78.8913],
		raleigh: [35.7796, -78.6382], 27601: [35.7731, -78.6346], 27609: [35.8442, -78.6305], 27615: [35.8929, -78.6385], 27617: [35.9046, -78.7672],
		durham: [35.994, -78.8986], 27701: [35.9973, -78.9043], 27705: [36.0221, -78.9476], 27707: [35.9567, -78.9617], 27713: [35.9126, -78.9226],
		'wake forest': [35.9799, -78.5097], 27587: [35.9806, -78.5436], apex: [35.7327, -78.8503], 27502: [35.7225, -78.8411],
		'chapel hill': [35.9132, -79.0558], 27514: [35.9365, -79.0414], morrisville: [35.8235, -78.8256], 27560: [35.8605, -78.8238],
		garner: [35.7113, -78.6142], 'holly springs': [35.6513, -78.8336], wendell: [35.7807, -78.3697], 'rolesville': [35.9235, -78.4572]
	};
	window.GHC_DEMO_GEOCODE = function (q) {
		var key = String(q).toLowerCase().replace(/,?\s*(nc|north carolina)\s*$/, '').trim();
		var hit = PLACES[key] || PLACES[key.slice(0, 5)];
		if (hit) return { found: true, lat: hit[0], lng: hit[1] };
		return { found: false, message: 'This demo knows Raleigh–Durham area places. Try 27513, 27707 or "Wake Forest".' };
	};
})();
