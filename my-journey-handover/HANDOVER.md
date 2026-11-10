# My Journey: handover for the meals site (SHMV3)

This pack adds the animated "meal film" to the existing site as a new **My Journey** tab. Nothing here fetches the Google Sheet. The site already loads and joins that data in `src/services/mealsDataService.js`; the film only needs a small summary object built from it.

## What is in the pack

| File | What it is |
|---|---|
| `mealFilm.module.js` | The film engine as an ES module: `import { startMealFilm } from './mealFilm.module.js'`. Self-contained; injects its own scoped styles. |
| `mealFilm.js` | The same engine as a plain script that sets `window.MealFilm.start`. Used by the demo. |
| `film-geo.json` | Static map outlines (world coastline plus one outline per country in the Country sheet). About 240 KB. Not in the sheet, so it ships as an asset. |
| `fixtures/*.json` | The exact summary the film expects for three people: Steve (everyone), Rich Benson, Tommy Gilbert. Use these as test fixtures. |
| `reference/build_film_data.py` | The script that produced the fixtures. It is the reference for the summary logic. It is not meant to run on the site. |
| `demo/` | A working page that drives the engine the way the site should: its own picker, one `start` call per selection. |

## The three pieces to build

1. **Summary function** (new, in the site): `buildFilmSummary(mealsData, personId | null)` returns one summary object. `null` means Steve himself, which is every meal.
2. **My Journey page** (new, in the site): a route and tab holding the site's own person filter (searchable). On selection it builds the summary and hands it to the film.
3. **Film engine** (supplied): do not restructure it. Treat it as a black box with one entry point.

## Using the engine

```js
import * as THREE from 'three';            // must be three@0.128.0
import { startMealFilm } from './mealFilm.module.js';
import geo from './film-geo.json';

const film = startMealFilm(containerEl, summary, { THREE, geo });
film.stop();        // before starting another film, and on unmount
film.go('years');   // optional: jump to an act
film.acts;          // the acts this person has, in order
```

- `containerEl` needs a real height (for example the viewport minus the site header). The film fills it and replaces its contents.
- Only one film can exist on a page at a time. Always call `stop()` first; it releases the WebGL context.
- In React: start it in an effect keyed on the selected person, and return `film.stop` as the cleanup.
- Load the page lazily (route-level code split) so three.js and the geo file are not in the main bundle.
- **Pin three.js to 0.128.0.** The engine uses that version's colour and lighting behaviour; newer versions change both.
- Styles are scoped under `.mealfilm`, so they will not leak into the site. The engine adds a Google Fonts link for Fredoka and Nunito.
- Photos and type icons load straight from their URLs, so no extra work is needed for them.

## The film summary

One plain object per person. See `fixtures/rich-benson.json` for a full example.

| Field | Meaning and rule |
|---|---|
| `name` | First word of the public name. Used on the door, captions and menu. |
| `full` | Full public name. |
| `me` | `true` for Steve's own film (all meals), otherwise `false`. Changes the wording throughout. |
| `host` | `"Steve"`. |
| `first`, `latest` | First and latest meal date, formatted like `6 Apr 1995`. |
| `restaurants` | Count of distinct restaurants. |
| `cuisines` | Meals by restaurant **TypeGroup** (strip `.png`), biggest first. Keep the top 8, then add one `{name:"Other", n}` with the rest if any. Shape: `[{name, n}]`. The sum of `n` is the person's meal total. |
| `years` | `[[year, meals], ...]` for every year from first to latest, including years with 0. |
| `world` | Meals by **country** (England, Scotland, Wales and Northern Ireland are separate), biggest first, at most 8. Shape: `[{name, n, lat, lon, iso}]`. `iso` is the first two letters of `ISOCode` (so the UK nations are `GB`). Coordinates come from the Country sheet, then neighbours closer than about 3.4 degrees are nudged apart so towers do not overlap (see the reference script). |
| `countries` | Count of distinct countries (not capped at 8). |
| `areaCountry`, `areaIso` | Name and `iso` of `world[0]`, the country with the most meals. |
| `areas` | Meals by **city within that top country**, top 7 that have coordinates. Shape: `[{name, n, lat, lon}]`. Position is the median latitude and median longitude of that city's meals' restaurants. |
| `london` | Only when `areas[0].name` is `London`: meals by London area (the new `London` sheet, joined on `Rest.London_ID`), top 7 with coordinates, same shape as `areas`. Otherwise `[]`. |
| `top` | Top 6 restaurants: `[name, city, typeGroup, visits, stars, verdict, iconUrl]`. Ranking and fields are described below. |
| `companions` | Up to 10 other people at this person's meals, most meals first: `[[publicName, meals], ...]`. |
| `companionsTotal` | Count of all distinct other people at those meals, including hidden names. |
| `photos` | Every photo from the person's meals: `[url, restaurantName, date, mealComment]`. The date is the meal date and the comment is the **meal's** comment, not the photo comment. |
| `comments` | Up to 7 short meal comments (11 to 43 characters, not negative sentiment) used as speech bubbles. |
| `verdict` | `[mostCommonRatingText, count]`. |
| `exceptional` | Count of meals rated `The Dogs` or `Exceptional`. |

All counts are **meals**, never restaurants, except `restaurants` itself.

### Rules that are easy to miss

- **Top 6 restaurants.** Skip restaurants named `TBA`, blank, or starting with `Random`. Sort by visits (high to low), then average star score (high to low), then most recent visit (newest first).
- **Stars.** Ratings are words in the data. The score used is: The Dogs 5, Exceptional 4.5, Very Good 4, Fine 3, OK but wouldn't recommend 2, Very Bad 1, Never Again 0.5, The Worst in the World 0. `stars` is the average, to one decimal.
- **Verdict text.** The most common rating at that restaurant, shown as `Usually <rating>`. If the top two ratings tie, use `Mixed verdicts`. For a single visit, use the rating on its own.
- **Icon.** `iconUrl` is the restaurant type's `TypeIcon`.
- **Country fallback.** Some City rows have a `Country_ID` but a blank `Country_Text`. Resolve the country through `Country_ID`.
- **Japan.** Its latitude and longitude are swapped in the Country sheet. If a latitude is outside -90 to 90, swap the pair.
- **Sardinia** is listed as a country with Italy's code, so it gets Italy's outline. That is accepted.
- **People.** Use `People_Public` only. Leave out `Hidden name`, `Just Me !!`, and names that are really phone numbers, both from the picker and from `companions`.
- **Coordinates.** `Rest X Cords` is latitude and `Rest Y Cords` is longitude. Ignore 0,0 and unparseable values.
- **London sheet.** The site does not load it yet. Add it to `MEALS_FEED_URLS`.

### Small or unusual people

The engine already copes with thin data: it drops the People act when there are no companions, the Photos act when there are no photos, the Street act when `top` is empty, and shortens the film for people with fewer than 10 meals. Empty arrays are fine; missing fields are not.

## Checking the port

Build the summary for Steve, Rich Benson and Tommy Gilbert and compare with `fixtures/`. The fixtures were made from the workbook as it stood on 10 Nov 2026 (meals up to 7 Nov 2026), so later meals will move the numbers. `comments` picks an evenly spaced sample and need not match exactly; everything else should.

## What changed from the standalone version

- The built-in person dropdown and the page-address handling were removed. Choosing the person is now the site's job.
- The engine no longer reads any global data. Everything arrives through `start(container, summary, { THREE, geo })`.
- Photo rows and icon values are full URLs in the summary.
