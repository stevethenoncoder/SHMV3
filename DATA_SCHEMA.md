# Data Schema Documentation — ABC Public v2

This document provides the authoritative schema documentation for the two live Google Sheets CSV data feeds powering **ABC Public v2**, based on inspection of the current live data.

---

## 1. Feeds Overview

### Config Feed
- **URL**: `https://docs.google.com/spreadsheets/d/e/2PACX-1vTmo4IKJRieGcOCEIWnn7ovJ7q7HSL-wrxUzZz80fGqmcgbq9cC2U7DPKBAYOJGBMaIiWhNS5Y6gReo/pub?gid=1334560049&single=true&output=csv`
- **Purpose**: Defines project-level metadata, display titles, subheadings, branding logos, and singular/plural location terminology.

### Main Data Feed
- **URL**: `https://docs.google.com/spreadsheets/d/e/2PACX-1vTmo4IKJRieGcOCEIWnn7ovJ7q7HSL-wrxUzZz80fGqmcgbq9cC2U7DPKBAYOJGBMaIiWhNS5Y6gReo/pub?gid=0&single=true&output=csv`
- **Purpose**: Master table containing all expedition and matrix places across projects.

---

## 2. Config Feed Schema

### Exact Live Headers
`Project`, `Project Title`, `Project Sub Heading`, `Project Logo`, `Location Label`, `Location Plural`, `Visited Place Holder`, `Planned Placeholder`, `Unscheduled Placeholder`

### Field Definitions

| Column | Live Example | Type | Description |
|---|---|---|---|
| `Project` | `England`, `London` | string | Unique primary project identifier / key. |
| `Project Title` | `Exploring England's Counties - A to Z` | string | Main Explorer heading. |
| `Project Sub Heading` | `48 Ceremonial Counties - 26 Categories - 1 Retirement` | string | Subheading under main heading (desktop only). |
| `Project Logo` | `https://storage.googleapis.com/.../ABC.jpg` | string / url | Logo icon for the project. |
| `Location Label` | `County`, `Borough` | string | Singular terminology for a location. |
| `Location Plural` | `Counties`, `Boroughs` | string | Plural terminology for locations. |
| `Visited Place Holder` | `Sorry, whilst I've logged a visit to this place...` | string | Contextual placeholder message displayed on place cards when no photo is present and status is Visited. |
| `Planned Placeholder` | `Ah ha - I've planned this place...` | string | Contextual placeholder message displayed on place cards when no photo is present and status is Planned. |
| `Unscheduled Placeholder` | `Sorry, this is just a temporary placeholder...` | string | Contextual placeholder message displayed on place cards when no photo is present and status is Unscheduled. |

---

## 3. Main Data Feed Schema

### Exact Live Headers
`Project`, `Location`, `Category`, `Place`, `Google Map Link`, `Lat`, `Long`, `Fav`, `Rating`, `Status`, `Date`, `Blog`, `Content`, `Description`, `10Facts`, `Feature Photo`, `Video`, `AI Summary`, `GoogleMapEmbed`

### Field Definitions & Parsing Rules

| Source Column | Internal Target | Ingest Rule / Parsing Logic |
|---|---|---|
| `Project` | `projectKey` | Trimmed string. Defines which project owns this row. |
| `Location` | `location` | Trimmed string. County or Borough name. |
| `Category` | `category` | Trimmed string. A–Z category name. |
| `Place` | `place` | Trimmed string. Public title. **If blank, the row is a matrix placeholder and excluded from public Explorer results.** |
| `Google Map Link` | `googleMapLink` | Trimmed URL or `null` if blank. |
| `Lat` | `latitude` | Parsed float, or `null` if blank/invalid/0. |
| `Long` | `longitude` | Parsed float, or `null` if blank/invalid/0. |
| `Fav` | `favourite` | Boolean. Case-insensitive `'Y'` or `'TRUE'` => `true`. Blank, `'n'`, `'FALSE'` => `false`. |
| `Rating` | `rating` | Number or `null`. Extracts leading digit from strings like `'4/5 - Very Good'` -> `4.0`. Blank -> `null`. |
| `Status` | `status` | Exact string from feed (e.g. `'Planned'`, `'Visited'`, `'Blogged'`, `'Not planned'`) or `null`. |
| `Date` | `date` | Trimmed date string or `null`. |
| `Blog` | `blog` | Trimmed URL or `null`. |
| `AI Summary` | `aiSummary` | Trimmed string or `null`. Placeholder values (`'Generate and insert'`) mapped to `null`. |
| `Feature Photo` | `featurePhoto` | Trimmed URL or `null`. Placeholders (e.g. ending with `abc-post-photos/.jpg`) mapped to `null`. |
| `10Facts` | *(ignored)* | **Retained in raw feed but not mapped or parsed into application models.** |
| `Content` | `content` | Trimmed HTML string or `null`. Contains blog text and AI summaries. Used for Report excerpt in List view. |
| `Video` | `video`, `videoEmbedSrc` | `video`: raw trimmed URL string or `null`. `videoEmbedSrc`: validated safe YouTube embed URL (`https://www.youtube.com/embed/VIDEOID`) extracted from watch, share, short, or embed links with strict 11-char ID validation, or `null` if invalid/non-YouTube. |
| `GoogleMapEmbed` | `googleMapEmbedSrc` | Validated safe Google Maps embed URL (`https://...google.com/maps...`) extracted from iframe HTML or direct URL, or `null` if invalid. |

---

## 4. Internal Data Models

### ProjectConfig
```ts
export type ProjectConfig = {
  projectKey: string;
  projectTitle: string;
  projectSubHeading: string;
  projectLogo: string | null;
  locationLabel: string;
  locationLabelPlural: string;
  visitedPlaceholder: string | null;
  plannedPlaceholder: string | null;
  unscheduledPlaceholder: string | null;
};
```

### ExplorerItem
```ts
export type ExplorerItem = {
  id: string;
  projectKey: string;
  location: string;
  category: string;
  place: string;
  googleMapLink: string | null;
  googleMapEmbedSrc: string | null;
  video: string | null;
  videoEmbedSrc: string | null;
  latitude: number | null;
  longitude: number | null;
  favourite: boolean;
  rating: number | null;
  ratingLabel: string | null;
  status: string | null;
  date: string | null;
  blog: string | null;
  content: string | null;
  description: string | null;
  aiSummary: string | null;
  featurePhoto: string | null;
};
```

---

## 5. Architectural Separation

1. `normaliseItems(rawRows)`: Pure transformation function that converts all raw CSV feed rows into normalized item objects, without filtering by project.
2. `getProjectData(allItems, projectKey)`:
   - Filters items for `item.projectKey === projectKey`.
   - Filters for eligible Explorer items where `item.place` is non-empty.
   - Derives available active locations, categories, and status lists dynamically from eligible items so filters never present choices with zero results.
