# ABC Public V2 — Project Rules & Architectural Invariants

## 1. Project Purpose
This repository is **ABC Public V2**, the public-facing React/Vite website.
It is separate from the private ABC Agents / research system.
Do not introduce agent, research, or admin functionality into the public application unless explicitly requested.

## 2. Dataset Separation
There are two fundamentally different datasets and they must never be conflated:

### A. Target Matrix — `rawProjectRows`
Represents the complete theoretical matrix:
$$\text{Locations} \times \text{Categories}$$
for the selected project.
- It includes combinations that do not yet have a populated Place.
- It powers:
  - Target totals
  - Journey-status distributions
  - County/location progress
  - Category progress
  - Target-matrix statistics
- **Rule**: Never use `explorerItems` as a substitute for the complete Target Matrix.

### B. Populated Places — `explorerItems`
Represents rows containing an actual public Place/destination.
- It powers:
  - Explorer views (Cards, List, Map)
  - Search filtering
  - Ratings and Rating Score calculations
  - Favourites
  - Date filtering
  - Blog and Place detail pages
  - Activity statistics and timeline

## 3. Target Baseline Filtering
The Target Matrix baseline may be scoped **only** by:
- Active **Project**
- Selected **Location(s)**
- Selected **Category / Categories**

$$\text{Target} = \text{selected locations} \times \text{selected categories}$$

The following filters must **NOT** alter the Target baseline or its journey-status calculations:
- Search query
- Journey Status filter
- Rating filter
- Date range filter
- Favourites filter

These filters may still affect the populated-place / activity views where appropriate, but they must never distort or reduce the theoretical Target Matrix baseline.

## 4. Journey Metrics
Keep these two metrics distinct and never substitute one for the other:

- **Journey Progress %**: Represents target combinations that have progressed beyond *Not planned*.
  $$\text{Journey Progress \%} = \frac{\text{Planned} + \text{Visited} + \text{Blogged}}{\text{Target}} \times 100$$

- **Completion %**: Represents target combinations that are completely finished/blogged.
  $$\text{Completion \%} = \frac{\text{Blogged}}{\text{Target}} \times 100$$

## 5. Journey Statuses & UI Conventions
The canonical journey statuses are:
- `Blogged`
- `Visited`
- `Planned`
- `Not planned`

Missing, null, or blank statuses must follow the application's established `Not planned` behavior. Status reconciliation must always satisfy:
$$\text{Not planned} + \text{Planned} + \text{Visited} + \text{Blogged} = \text{Target}$$

### Canonical UI Palette Conventions
- **Blogged**: `#10b981` (Emerald Green)
- **Visited**: `#3b82f6` (Royal Blue)
- **Planned**: `#f59e0b` (Amber / Orange)
- **Not planned**: `#94a3b8` (Slate Gray)
- **Favourite**: `#ef4444` (Crimson Red)

Use these consistently across the Explorer, Stats, and Detail pages unless a deliberate design change is requested.

## 6. Rating Score Rules
For Location and Category comparisons:
$$\text{ratingPoints} = \sum(\text{valid ratings})$$
$$\text{maximumPoints} = \text{numberOfRatedPlaces} \times 5$$
$$\text{Rating Score} = \frac{\text{ratingPoints}}{\text{maximumPoints}} \times 100$$

- Blank, null, or unrated entries are ignored and do **not** count as 0.
- Rating Score must always be displayed alongside the sample size (e.g. `100% · 1 rating` vs `100% · 15 ratings`) so users can evaluate the significance of the score.
- Do not apply Bayesian or artificial weighting unless explicitly instructed.

## 7. Content & Embed Security
- **Blog Content**: Sanitized HTML rendered with DOMPurify. Arbitrary `<iframe>` tags, scripts, and inline event handlers must be strictly rejected.
- **Video Embeds**: Must use the dedicated `video` property. Must validate and parse YouTube URLs to safe `https://www.youtube.com/embed/VIDEOID` embeds only.
- **Maps Embeds**: Must use the dedicated `googleMapEmbed` property for trusted Google Maps embeds.
