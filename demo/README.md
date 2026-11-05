# GoHappyClass Connect — live demo

A self-contained demo of the GoHappyClass Connect for Jackrabbit plugin, using
fictional sample data ("Happy Hoppers Gym & Swim"). Plain HTML, CSS and
JavaScript: no WordPress, no backend, no build step.

- Nothing registers anyone. In demo mode, Register / Register all / Parent Portal
  show a "This is a demo" popup with the Jackrabbit link that would have opened.
- Class dates are generated relative to today, so the calendar never goes stale.
- Map search knows a list of Raleigh–Durham ZIP codes and towns (try 27513,
  27707, Durham, Wake Forest). It makes no outside requests except OpenStreetMap
  map tiles and Google Fonts.

## Files

| File | What it is |
|---|---|
| `index.html` | The demo page (header, intro, widgets, call to action) |
| `demo-data.js` | The fictional business: 4 locations, ~50 classes and camps |
| `demo-config.js` | The settings a site owner would set in WordPress (colors, labels, finder questions, cart) |
| `assets/` | Copied unchanged from the plugin (`assets/js`, `assets/css`, `assets/vendor/leaflet`) |

## Putting it on gohappyclass.com

The folder only needs to be served as static files at a URL such as
`https://gohappyclass.com/demo/`. All paths inside it are relative.

**Flask**

Copy the folder to `static/demo/`, then add:

```python
from flask import send_from_directory

@app.route("/demo/")
def demo():
    return send_from_directory("static/demo", "index.html")
```

The page's relative `assets/...` paths then resolve under `/demo/`. Make sure
`/demo/<path>` serves the other files too (for example
`@app.route("/demo/<path:p>")` → `send_from_directory("static/demo", p)`).

**Django**

Put the folder in a static directory and serve `index.html` at `/demo/` with a
`TemplateView` or `serve`. If you use `{% static %}`, keep the folder structure
as is.

**FastAPI**

```python
from fastapi.staticfiles import StaticFiles
app.mount("/demo", StaticFiles(directory="gohappyclass-demo", html=True), name="demo")
```

**Embed on another page (iframe)**

```html
<iframe src="https://gohappyclass.com/demo/" title="GoHappyClass Connect demo"
        style="width:100%;height:1400px;border:0;border-radius:16px"></iframe>
```

## Trying it locally

```bash
cd gohappyclass-demo
python3 -m http.server 8000
```

Then open http://localhost:8000/. Opening `index.html` straight from disk also
works in most browsers.

## Updating

When the plugin changes, copy its `assets/js` (core, plan, classes, finder,
calendar, map, app), `assets/css/frontend.css` and `assets/vendor/leaflet` into
`assets/` here. To change the sample business, edit `demo-data.js`; to change
colors, labels or the custom questions, edit `demo-config.js` and the `.jrcc`
color variables at the top of `index.html`.
