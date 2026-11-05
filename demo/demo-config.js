/**
 * Demo settings: the same options a site owner sets in WordPress under
 * GoHappyClass Connect. Generated from the plugin; edit freely.
 */
window.JRCC_CONFIG = {
 "rest": "",
 "demo": true,
 "leaflet": "assets/vendor/leaflet/leaflet.js",
 "map": {
  "provider": "osm",
  "key": "",
  "lat": 35.85,
  "lng": -78.75,
  "zoom": 10,
  "unit": "mi"
 },
 "display": {
  "categoryField": "cat1",
  "showPrice": true,
  "showOpenings": true,
  "showInstructors": true,
  "showAges": true,
  "showDates": true,
  "showLocation": true,
  "showDescription": true,
  "lowOpenings": 3,
  "hideFull": false,
  "time24": false,
  "weekStart": 7,
  "newTab": true,
  "categoryColors": {
   "gymnastics": "#235EE7",
   "swim": "#0ea5c6",
   "dance": "#d9468f",
   "ninja warrior": "#f08c00",
   "camp": "#2f9e5f"
  },
  "weekendMessage": "Saturday afternoons are for birthday parties. {Book a party}",
  "weekendLink": "#",
  "analytics": false
 },
 "cart": {
  "enabled": true,
  "maxStudents": 5,
  "portal": true,
  "regUrl": "https://app.jackrabbitclass.com/regv2.asp",
  "portalUrl": "https://app.jackrabbitclass.com/jr4.0/ParentPortal/Login"
 },
 "finder": {
  "questions": {
   "age": "How old is your child?",
   "category": "What are they interested in?",
   "day": "Which day works best?",
   "time": "What time of day?",
   "location": "Which location is most convenient?"
  },
  "family": [
   {
    "field": "cat2",
    "label": "Age group"
   },
   {
    "field": "cat3",
    "label": "Level"
   }
  ],
  "wizard": {
   "questions": [
    {
     "id": "q1",
     "text": "What would your child love most?",
     "help": "",
     "answers": [
      {
       "id": "a1",
       "label": "Flipping and tumbling",
       "action": "next",
       "next": "q2",
       "url": "",
       "message": "",
       "filters": {
        "cat1": [
         "Gymnastics"
        ],
        "cat2": [],
        "cat3": [],
        "days": [],
        "age_min": "",
        "age_max": "",
        "type": "",
        "keywords": "",
        "location": ""
       }
      },
      {
       "id": "a2",
       "label": "Splashing in the pool",
       "action": "next",
       "next": "q2",
       "url": "",
       "message": "",
       "filters": {
        "cat1": [
         "Swim"
        ],
        "cat2": [],
        "cat3": [],
        "days": [],
        "age_min": "",
        "age_max": "",
        "type": "",
        "keywords": "",
        "location": ""
       }
      },
      {
       "id": "a3",
       "label": "Dancing to music",
       "action": "next",
       "next": "q2",
       "url": "",
       "message": "",
       "filters": {
        "cat1": [
         "Dance"
        ],
        "cat2": [],
        "cat3": [],
        "days": [],
        "age_min": "",
        "age_max": "",
        "type": "",
        "keywords": "",
        "location": ""
       }
      },
      {
       "id": "a4",
       "label": "Climbing and obstacle courses",
       "action": "next",
       "next": "q2",
       "url": "",
       "message": "",
       "filters": {
        "cat1": [
         "Ninja Warrior"
        ],
        "cat2": [],
        "cat3": [],
        "days": [],
        "age_min": "",
        "age_max": "",
        "type": "",
        "keywords": "",
        "location": ""
       }
      }
     ]
    },
    {
     "id": "q2",
     "text": "Have they taken a class like this before?",
     "help": "No wrong answers. Coaches can move them up or down after the first class.",
     "answers": [
      {
       "id": "b1",
       "label": "No, this is their first time",
       "action": "results",
       "next": "",
       "url": "",
       "message": "Great starter classes",
       "filters": {
        "cat1": [],
        "cat2": [],
        "cat3": [
         "Beginner"
        ],
        "days": [],
        "age_min": "",
        "age_max": "",
        "type": "",
        "keywords": "",
        "location": ""
       }
      },
      {
       "id": "b2",
       "label": "Yes, for a season or two",
       "action": "results",
       "next": "",
       "url": "",
       "message": "Classes to keep them growing",
       "filters": {
        "cat1": [],
        "cat2": [],
        "cat3": [
         "Intermediate"
        ],
        "days": [],
        "age_min": "",
        "age_max": "",
        "type": "",
        "keywords": "",
        "location": ""
       }
      },
      {
       "id": "b3",
       "label": "Yes, they're experienced",
       "action": "results",
       "next": "",
       "url": "",
       "message": "Classes for experienced kids",
       "filters": {
        "cat1": [],
        "cat2": [],
        "cat3": [
         "Advanced"
        ],
        "days": [],
        "age_min": "",
        "age_max": "",
        "type": "",
        "keywords": "",
        "location": ""
       }
      }
     ]
    }
   ]
  }
 },
 "labels": {
  "register": "Register",
  "waitlist": "Join Waitlist",
  "details": "Details",
  "full": "Full",
  "class": "Class",
  "camp": "Camp",
  "category": "Program",
  "add": "Add to plan",
  "plan": "My plan",
  "regAll": "Register all"
 },
 "i18n": {
  "loading": "Loading classes…",
  "error": "Classes could not be loaded. Please refresh the page.",
  "noResults": "No classes match your choices.",
  "noClasses": "No sessions are currently available. Please check back soon.",
  "clear": "Clear filters",
  "all": "All",
  "any": "Any",
  "search": "Search classes",
  "age": "Age",
  "ages": "Ages",
  "years": "yrs",
  "months": "mo",
  "agePlus": "%s+",
  "ageYears": "%s years old",
  "ageYear1": "1 year old",
  "ageUnder": "Under %s",
  "day": "Day",
  "days": [
   "Monday",
   "Tuesday",
   "Wednesday",
   "Thursday",
   "Friday",
   "Saturday",
   "Sunday"
  ],
  "daysShort": [
   "Mon",
   "Tue",
   "Wed",
   "Thu",
   "Fri",
   "Sat",
   "Sun"
  ],
  "location": "Location",
  "type": "Type",
  "classes": "Classes",
  "camps": "Camps",
  "when": "When",
  "dates": "Dates",
  "starts": "Starts %s",
  "instructors": "Instructors",
  "spotsLeft": "%s spots left",
  "oneSpotLeft": "1 spot left",
  "openings": "Openings",
  "tuition": "Tuition",
  "externalReg": "Registration is handled by an outside provider.",
  "regOpens": "Registration opens %s",
  "close": "Close",
  "directions": "Directions",
  "copyLink": "Copy link",
  "copied": "Link copied",
  "classCount": "%s classes",
  "classCount1": "1 class",
  "sortBy": "Sort by",
  "sortDay": "Day & time",
  "sortDate": "Start date",
  "sortName": "Name",
  "sortAge": "Age",
  "week": "Week",
  "month": "Month",
  "list": "List",
  "today": "Today",
  "prev": "Previous",
  "next": "Next",
  "more": "+%s more",
  "nothingDay": "No classes",
  "searchPlace": "ZIP code or city",
  "go": "Search",
  "nearMe": "Use my location",
  "locating": "Finding you…",
  "noPlace": "We couldn’t find that place. Try a ZIP code.",
  "noGeo": "Location access is unavailable. Search by ZIP code instead.",
  "within": "Within %s",
  "nearest": "Nearest locations",
  "away": "%s away",
  "allLocations": "All locations",
  "noNearby": "No locations within %s. Showing the closest instead.",
  "showAll": "Show all",
  "morning": "Morning",
  "afternoon": "Afternoon",
  "evening": "Evening",
  "back": "Back",
  "startOver": "Start over",
  "step": "Step %1$s of %2$s",
  "results": "Here’s what we found",
  "matchCount": "%s matching classes",
  "matchCount1": "1 matching class",
  "enterAge": "Years",
  "continue": "Continue",
  "skip": "Skip",
  "addChild": "Add a child",
  "child": "Child %s",
  "childName": "Name (optional)",
  "remove": "Remove",
  "choose": "Choose…",
  "onlyOpen": "Only show classes with openings",
  "familyIntro": "Add each child to see every class that fits on one weekly schedule.",
  "familyEmpty": "Add a child above to build your weekly schedule.",
  "inPlan": "In plan",
  "addedFor": "Added for %s",
  "viewPlan": "View plan",
  "whoFor": "Who is this class for?",
  "anotherChild": "Another child",
  "planEmpty": "Your plan is empty. Use “%s” on any class to start.",
  "noClassesYet": "No classes yet.",
  "removeClass": "Remove %s",
  "removeChild": "Remove child",
  "clearPlan": "Clear plan",
  "confirmClear": "Remove every class from your plan?",
  "estimate": "Estimated tuition",
  "estimateNote": "Estimate only. Final tuition, discounts and fees are shown when you register.",
  "perMonth": "%s/mo",
  "plusOther": "+ %s other fees",
  "regGroup": "Register children %1$s–%2$s",
  "regChild": "Register %s",
  "regAt": "%1$s at %2$s",
  "regNote": "Opens the registration form with each child and class filled in. Spots are held only once you finish registering.",
  "portal": "Already a customer? Log in to the Parent Portal",
  "waitlisted": "Waitlist",
  "clashSame": "Overlaps with %s",
  "clashOther": "Same time as %1$s’s class at %2$s",
  "registerOne": "Register for this class only",
  "familyTab": "Family planner",
  "demoBadge": "Demo",
  "demoTitle": "This is a demo",
  "demoText": "On your website, this button opens your Jackrabbit registration form with these details already filled in:",
  "demoLink": "The link it builds:",
  "findTab": "Find a class",
  "mapTab": "Map",
  "calendarTab": "Calendar",
  "listTab": "All classes",
  "wizardEmpty": "The class finder has no questions yet."
 }
};
// Demo data and place search instead of a WordPress backend.
window.JRCC_CONFIG.payload = window.GHC_DEMO_PAYLOAD;
window.JRCC_CONFIG.geocode = window.GHC_DEMO_GEOCODE;
