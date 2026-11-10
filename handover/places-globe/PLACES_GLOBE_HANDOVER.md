# Places page: 3D globe handover

The Places page gets a 3D globe that shows meals by place as towers and lets the user drill down from countries to cities to restaurants (with London going through its areas first). The globe is supplied as a ready-made component. **The site owns everything else**: the filters, the level toggle, the Top N control, the ranked list, the breadcrumb and Back. The flat map is out of scope for now.

## Files

| File | What it is |
|---|---|
| `src/places/placesGlobe.module.js` | The globe component. Do not edit it. |
| `src/journey/film-geo.json` | Map outlines. Already in the repo for My Journey; reuse it, do not copy it. |
| `handover/places-globe/reference-prototype.html` | The working prototype page Steve approved. Use it as the reference for the page logic (it reads a pre-built data file, which the site will not need). |
| `handover/places-globe/reference_build_places.py` | How the prototype's data was built from the workbook. Reference only. |

## The component

```js
import * as THREE from 'three';                     // three@0.128.0, already installed
import { createPlacesGlobe } from '../../places/placesGlobe.module.js';
import geo from '../../journey/film-geo.json';

const globe = createPlacesGlobe(containerEl, { THREE, geo, onSelect: (point) => { /* drill */ } });
globe.update(points);        // whenever filters, level or Top N change
globe.highlight(pointId);    // or null; marks one tower as selected
globe.destroy();             // on unmount
```

- `points` is `[{ id, name, lat, lon, n }]`: `id` is any stable string (for example `country:12`), `n` is the meal count. Pass only the points you want drawn (the Top N), already filtered.
- The component handles everything visual: towers grow, shrink, appear and sink when points change; the camera flies to frame the points (whole world down to a few streets); tower thickness adapts to how close the points are; labels avoid overlapping; drag to turn, wheel or pinch to zoom.
- `onSelect(point)` fires when a tower or its label is clicked or tapped. It returns the same object you passed in, so you can put your own keys on it.
- `update(points, { fit: false })` updates towers without moving the camera (use it when only the highlight or selection changed).
- The container needs a real size. In the prototype it is about 68vh on desktop and 58vh on phones, with rounded corners and a dark background around it (`#0d1330`).
- Create it once per page visit (lazy-load the page like My Journey) and call `destroy()` on unmount so the WebGL context is released.

## Levels and points

The page has a level: `country`, `city`, `area` (London only) or `restaurant`. For the current filtered meals, count meals per place at that level, sort by count (high to low, then name), and take the Top N.

| Level | One point per | Position |
|---|---|---|
| `country` | Country (England, Scotland, Wales and Northern Ireland are separate, as in the sheet) | Country sheet `CountryLong`/`CountryLang`. If the latitude is outside -90 to 90, the pair is swapped (Japan): swap it back. If missing, use the median of that country's city positions. |
| `city` | City | Median latitude and median longitude of that city's restaurants, after dropping restaurants more than 1.5° latitude or 2.5° longitude from the first median (bad coordinates). |
| `area` | London area (`London_ID` joined to the London sheet), only for restaurants in London | Median of that area's restaurant coordinates. |
| `restaurant` | Restaurant | Its own `Rest X Cords` (latitude) and `Rest Y Cords` (longitude). Ignore 0,0 and values more than 1.5°/2.5° from its city's position. |

Positions are worked out from all restaurants, not just the filtered ones, so a city does not move when filters change. Meals whose place has no position are counted in the totals but not drawn; show a short note with how many (the prototype does this under the list), plus, at the area level, how many London meals have no area.

## Drill down and back up

Clicking a tower, a label or a list row:

- **country**: set the country filter to it and go to `city`.
- **city**: set the city filter to it. If it is London go to `area`, otherwise go to `restaurant`.
- **area**: set an area filter to it and go to `restaurant`.
- **restaurant**: toggle it as selected (`globe.highlight(id)`), and highlight its list row. Do not move the camera (`fit: false`).

Back (button, breadcrumb, Esc key) goes up one step:

1. If a restaurant is selected, clear the selection.
2. If an area is set, clear it and go to `area`.
3. If a city is set: when on London's restaurants go to `area`, otherwise clear the city and go to `city`.
4. If only a country is set: on `restaurant` go to `city`, otherwise clear the country and go to `country`.
5. With no place filters, any level other than `country` goes to `country`.

The breadcrumb in the prototype sits in the top-left corner over the globe: `‹ Back`, then `World › England › London › Soho · restaurants`, with each earlier step clickable. Changing the country or city dropdowns directly should clear any area and leave `area` level if it no longer applies. "Clear filters" clears place filters too.

## Level toggle and Top N

- Toggle: Countries / Cities / Restaurants. Show an extra "London areas" option only while the city filter is London.
- Top N steps: 5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, All. Default 20.
- The ranked list shows the same Top N, with rank, name, a muted secondary name (country for cities, city for restaurants, only when the parent is not already filtered), the count and a bar.

## Filters

Country, city, restaurant type (TypeGroup), year range and person (Everyone, then people from `People_Public` by meal count, leaving out "Hidden name", "Just Me !!" and phone numbers). These are the site's own filters; the globe only ever sees the resulting points.

## Checks

- Default view (no filters, countries, Top 20): England 2,828, France 253, Spain 215 (workbook as of 10 Nov 2026; live numbers will be the same or higher).
- England → London → Soho → restaurants: Melati is first with 11.
- London areas: Islington 413, West End 114, Soho 112.
- Back from Soho's restaurants returns to London areas, then England's cities, then the world.
- Switching pages several times leaves at most one WebGL canvas alive.
