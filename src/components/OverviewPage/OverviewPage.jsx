import React, { useMemo, useState } from 'react';
import OverviewPhotoCarousel from './OverviewPhotoCarousel.jsx';
import {
  Utensils,
  UtensilsCrossed,
  PoundSterling,
  Building2,
  ArrowRight,
  TrendingUp,
  MapPin,
  Globe2,
  Users,
  PieChart as PieIcon,
  Smile,
  Compass,
  Calendar,
  Sparkles,
} from 'lucide-react';
import './OverviewPage.css';

/**
 * Generates a smooth C1 cubic bezier spline path from an array of 2D points.
 * Creates continuous wavy lines without angular vertices.
 */
function getSmoothSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Catmull-Rom to Cubic Bezier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

/**
 * Generates an SVG path for a donut sector.
 */
function getDonutSectorPath(cx, cy, rInner, rOuter, startAngleDeg, endAngleDeg) {
  const sweep = endAngleDeg - startAngleDeg;
  if (sweep <= 0.01) return '';
  const deg2rad = Math.PI / 180;

  if (sweep >= 359.99) {
    // Full donut: two semicircles
    return [
      'M', (cx - rOuter).toFixed(2), cy.toFixed(2),
      'A', rOuter.toFixed(2), rOuter.toFixed(2), 0, 1, 1, (cx + rOuter).toFixed(2), cy.toFixed(2),
      'A', rOuter.toFixed(2), rOuter.toFixed(2), 0, 1, 1, (cx - rOuter).toFixed(2), cy.toFixed(2),
      'M', (cx - rInner).toFixed(2), cy.toFixed(2),
      'A', rInner.toFixed(2), rInner.toFixed(2), 0, 1, 0, (cx + rInner).toFixed(2), cy.toFixed(2),
      'A', rInner.toFixed(2), rInner.toFixed(2), 0, 1, 0, (cx - rInner).toFixed(2), cy.toFixed(2),
      'Z'
    ].join(' ');
  }

  const a1 = (startAngleDeg - 90) * deg2rad;
  const a2 = (endAngleDeg - 90) * deg2rad;

  const x1 = cx + rOuter * Math.cos(a1);
  const y1 = cy + rOuter * Math.sin(a1);
  const x2 = cx + rOuter * Math.cos(a2);
  const y2 = cy + rOuter * Math.sin(a2);

  const x3 = cx + rInner * Math.cos(a2);
  const y3 = cy + rInner * Math.sin(a2);
  const x4 = cx + rInner * Math.cos(a1);
  const y4 = cy + rInner * Math.sin(a1);

  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    'M', x1.toFixed(2), y1.toFixed(2),
    'A', rOuter.toFixed(2), rOuter.toFixed(2), 0, largeArcFlag, 1, x2.toFixed(2), y2.toFixed(2),
    'L', x3.toFixed(2), y3.toFixed(2),
    'A', rInner.toFixed(2), rInner.toFixed(2), 0, largeArcFlag, 0, x4.toFixed(2), y4.toFixed(2),
    'Z'
  ].join(' ');
}

export default function OverviewPage({
  meals = [],
  restaurants = [],
  onNavigateToChronicle,
  onNavigateToRestaurants,
  onNavigateToMealDetail,
  onNavigateToRestaurantDetail,
  onApplyChronicleFilter,
}) {
  const [progressionMode, setProgressionMode] = useState('per_year'); // 'per_year' | 'cumulative'
  const [hoveredProgressionYear, setHoveredProgressionYear] = useState(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState(null);
  const [hoveredSentimentYear, setHoveredSentimentYear] = useState(null);

  // 1. Core KPIs
  const totalMeals = meals.length;
  const totalCost = useMemo(() => {
    return meals.reduce((sum, m) => sum + (m.valueGBP || 0), 0);
  }, [meals]);
  const totalRestaurants = restaurants.length;

  // 2. Top 5 Restaurants
  const topRestaurants = useMemo(() => {
    const counts = new Map();
    meals.forEach((m) => {
      if (m.restaurant && m.restaurant.id) {
        const id = m.restaurant.id;
        if (!counts.has(id)) {
          counts.set(id, { restaurant: m.restaurant, count: 0 });
        }
        counts.get(id).count++;
      }
    });

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [meals]);

  // 3. Food Section: Cuisines & Dish Types
  const foodData = useMemo(() => {
    const cuisinesMap = new Map();
    const dishTypesMap = new Map();

    meals.forEach((m) => {
      // Cuisine
      const c = m.restaurant?.type?.name;
      if (c) {
        cuisinesMap.set(c, (cuisinesMap.get(c) || 0) + 1);
      }

      // Dish Types from mains
      (m.mains || []).forEach((main) => {
        const dt = main.food?.foodType?.name;
        if (dt) {
          dishTypesMap.set(dt, (dishTypesMap.get(dt) || 0) + 1);
        }
      });
    });

    const topCuisines = Array.from(cuisinesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topDishTypes = Array.from(dishTypesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalCuisines: cuisinesMap.size,
      topCuisines,
      totalDishTypes: dishTypesMap.size,
      topDishTypes,
    };
  }, [meals]);

  // 4. Locations Section: Countries & Cities
  const locationData = useMemo(() => {
    const countriesMap = new Map();
    const citiesMap = new Map();

    meals.forEach((m) => {
      const country = m.restaurant?.city?.country?.name;
      const city = m.restaurant?.city?.name;
      if (country) countriesMap.set(country, (countriesMap.get(country) || 0) + 1);
      if (city) citiesMap.set(city, (citiesMap.get(city) || 0) + 1);
    });

    const topCountries = Array.from(countriesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCities = Array.from(citiesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalCountries: countriesMap.size,
      topCountries,
      totalCities: citiesMap.size,
      topCities,
    };
  }, [meals]);

  // 5. People Section: Public Companions
  const peopleData = useMemo(() => {
    const peopleMap = new Map();

    meals.forEach((m) => {
      (m.companions || []).forEach((c) => {
        if (c.publicName) {
          peopleMap.set(c.publicName, (peopleMap.get(c.publicName) || 0) + 1);
        }
      });
    });

    const topPeople = Array.from(peopleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalPeople: peopleMap.size,
      topPeople,
    };
  }, [meals]);

  // 5b. Sentiment Section: Top 5 Sentiments
  const sentimentData = useMemo(() => {
    const sentimentsMap = new Map();

    meals.forEach((m) => {
      const s = m.sentiment?.trim();
      if (s && s.toLowerCase() !== 'no comment' && s.toLowerCase() !== 'null') {
        sentimentsMap.set(s, (sentimentsMap.get(s) || 0) + 1);
      }
    });

    const topSentiments = Array.from(sentimentsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalSentiments: sentimentsMap.size,
      topSentiments,
    };
  }, [meals]);

  // 6. Ratings Breakdown (Pie / Donut format)
  const ratingsBreakdown = useMemo(() => {
    const groups = [
      { label: 'The Dogs & Exceptional', color: '#f59e0b', count: 0, filterKey: 'Exceptional' },
      { label: 'Very Good / Superb', color: '#10b981', count: 0, filterKey: 'Very Good' },
      { label: 'Fine / Good', color: '#3b82f6', count: 0, filterKey: 'Fine' },
      { label: "OK (Wouldn't Recommend)", color: '#64748b', count: 0, filterKey: "OK but wouldn't recommend" },
      { label: 'Bad / Worst / Never Again', color: '#ef4444', count: 0, filterKey: 'Never Again' },
    ];

    meals.forEach((m) => {
      const r = (m.rating || '').toLowerCase();
      if (r.includes('the dogs') || r.includes('exceptional')) groups[0].count++;
      else if (r.includes('very good') || r.includes('superb')) groups[1].count++;
      else if (r.includes('fine') || r.includes('good')) groups[2].count++;
      else if (r.includes('ok')) groups[3].count++;
      else if (r.includes('bad') || r.includes('worst') || r.includes('never again')) groups[4].count++;
      else groups[2].count++; // Default middle
    });

    const total = meals.length || 1;
    let accumulatedAngle = 0;

    return groups.map((g, idx) => {
      const percentage = (g.count / total) * 100;
      const angle = (g.count / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return {
        ...g,
        percentage,
        angle,
        startAngle,
        endAngle: accumulatedAngle,
      };
    });
  }, [meals]);

  // 7. Sentiment Split by Year (Sentiment High: Positive, Neutral, Negative)
  const sentimentTimeline = useMemo(() => {
    const yearsMap = new Map();

    meals.forEach((m) => {
      if (!m.year) return;
      if (!yearsMap.has(m.year)) {
        yearsMap.set(m.year, { year: m.year, positive: 0, neutral: 0, negative: 0, total: 0 });
      }
      const entry = yearsMap.get(m.year);
      entry.total++;
      const cat = (m.sentimentCategory || '').toLowerCase();
      if (cat.includes('positive')) entry.positive++;
      else if (cat.includes('neutral')) entry.neutral++;
      else if (cat.includes('negative')) entry.negative++;
    });

    const sorted = Array.from(yearsMap.values()).sort((a, b) => a.year - b.year);
    if (sorted.length === 0) return { data: [], maxVal: 1 };

    const maxVal = Math.max(...sorted.map((d) => Math.max(d.positive, d.neutral, d.negative)), 1);

    // Compute SVG points
    const width = 600;
    const height = 180;
    const padding = { top: 15, bottom: 25, left: 35, right: 15 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const positivePts = [];
    const neutralPts = [];
    const negativePts = [];

    sorted.forEach((d, idx) => {
      const x = padding.left + (idx / (sorted.length - 1 || 1)) * chartW;
      const yPos = padding.top + chartH - (d.positive / maxVal) * chartH;
      const yNeu = padding.top + chartH - (d.neutral / maxVal) * chartH;
      const yNeg = padding.top + chartH - (d.negative / maxVal) * chartH;

      positivePts.push({ x, y: yPos, d });
      neutralPts.push({ x, y: yNeu, d });
      negativePts.push({ x, y: yNeg, d });
    });

    return {
      data: sorted,
      maxVal,
      width,
      height,
      padding,
      positiveCurve: getSmoothSplinePath(positivePts),
      neutralCurve: getSmoothSplinePath(neutralPts),
      negativeCurve: getSmoothSplinePath(negativePts),
      positivePts,
      neutralPts,
      negativePts,
    };
  }, [meals]);

  // 8. Full-Width Progression of Meals (Cumulative & Per-Year with Wavy Spline)
  const progressionTimeline = useMemo(() => {
    const yearsMap = new Map();

    meals.forEach((m) => {
      if (!m.year) return;
      yearsMap.set(m.year, (yearsMap.get(m.year) || 0) + 1);
    });

    const sortedYears = Array.from(yearsMap.keys()).sort((a, b) => a - b);
    if (sortedYears.length === 0) return { data: [], maxAnnual: 1, maxCumulative: 1 };

    let cumulative = 0;
    const records = sortedYears.map((year) => {
      const count = yearsMap.get(year);
      cumulative += count;
      return { year, count, cumulative };
    });

    const maxAnnual = Math.max(...records.map((r) => r.count), 1);
    const maxCumulative = cumulative || 1;

    // SVG coordinates
    const width = 1100;
    const height = 240;
    const padding = { top: 20, bottom: 35, left: 50, right: 25 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const annualPoints = records.map((r, idx) => {
      const x = padding.left + (idx / (records.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - (r.count / maxAnnual) * chartH;
      return { x, y, record: r };
    });

    const cumulativePoints = records.map((r, idx) => {
      const x = padding.left + (idx / (records.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - (r.cumulative / maxCumulative) * chartH;
      return { x, y, record: r };
    });

    const annualCurve = getSmoothSplinePath(annualPoints);
    const cumulativeCurve = getSmoothSplinePath(cumulativePoints);

    const bottomY = padding.top + chartH;
    const annualArea = annualPoints.length > 0
      ? `${annualCurve} L ${annualPoints[annualPoints.length - 1].x.toFixed(1)} ${bottomY} L ${annualPoints[0].x.toFixed(1)} ${bottomY} Z`
      : '';
    const cumulativeArea = cumulativePoints.length > 0
      ? `${cumulativeCurve} L ${cumulativePoints[cumulativePoints.length - 1].x.toFixed(1)} ${bottomY} L ${cumulativePoints[0].x.toFixed(1)} ${bottomY} Z`
      : '';

    return {
      records,
      maxAnnual,
      maxCumulative,
      width,
      height,
      padding,
      bottomY,
      annualPoints,
      cumulativePoints,
      annualCurve,
      cumulativeCurve,
      annualArea,
      cumulativeArea,
    };
  }, [meals]);

  return (
    <div className="overview-page">
      {/* Hero / Welcome Banner */}
      <section className="overview-hero">
        <div className="overview-hero-left">
          <h1>
            <span>Archive Overview</span>
            <span className="overview-hero-badge">1994 – 2026</span>
          </h1>
          <p className="overview-hero-subtitle">
            A comprehensive gastronomic chronicle spanning {totalMeals.toLocaleString()} dining experiences across{' '}
            {totalRestaurants.toLocaleString()} unique venues worldwide.
          </p>
        </div>

        <div className="overview-hero-actions">
          <button
            type="button"
            className="overview-cta-btn primary"
            onClick={onNavigateToChronicle}
          >
            <Utensils size={16} />
            <span>Browse Chronicle</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="overview-cta-btn secondary"
            onClick={onNavigateToRestaurants}
          >
            <Compass size={16} />
            <span>Explore Restaurants</span>
          </button>
        </div>
      </section>

      {/* Section 1: Headline Key Stats, Top 5 Restaurants & Revolving Photo Carousel */}
      <section className="overview-headline-section">
        <div className="overview-metrics-col">
          {/* Compressed KPI Cards Row */}
          <div className="overview-kpi-row">
            {/* KPI: Total Meals */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Total Meals</span>
                <div className="kpi-icon-wrap meals">
                  <Utensils size={15} />
                </div>
              </div>
              <div className="kpi-value">{totalMeals.toLocaleString()}</div>
              <div className="kpi-subtext">Over 32 years of dining history</div>
            </div>

            {/* KPI: Total Costs */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Total Spend</span>
                <div className="kpi-icon-wrap cost">
                  <PoundSterling size={15} />
                </div>
              </div>
              <div className="kpi-value">£{Math.round(totalCost).toLocaleString()}</div>
              <div className="kpi-subtext">Cumulative restaurant expenditures</div>
            </div>

            {/* KPI: Total Restaurants */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Restaurants</span>
                <div className="kpi-icon-wrap restaurants">
                  <Building2 size={15} />
                </div>
              </div>
              <div className="kpi-value">{totalRestaurants.toLocaleString()}</div>
              <div className="kpi-subtext">Unique destinations catalogued</div>
            </div>
          </div>

          {/* Top 5 Restaurants List */}
          <div className="overview-top-restaurants-card">
            <div className="top-card-header">
              <span className="top-card-title">
                <Sparkles size={16} className="text-amber-500" />
                <span>Top 5 Restaurants</span>
              </span>
              <span className="text-xs text-slate-400 font-semibold">By visits</span>
            </div>

            <ul className="top-list">
              {topRestaurants.map(({ restaurant, count }, index) => (
                <li
                  key={restaurant.id}
                  className="top-item-row"
                  onClick={() => {
                    if (onApplyChronicleFilter) {
                      onApplyChronicleFilter('restaurantId', restaurant.id, restaurant.name);
                    } else if (onNavigateToRestaurantDetail) {
                      onNavigateToRestaurantDetail(restaurant.id);
                    }
                  }}
                  title={`Filter chronicle for ${restaurant.name}`}
                >
                  <div className="top-item-left">
                    <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                    <div>
                      <span className="top-item-name">{restaurant.name}</span>
                      <span className="top-item-meta">
                        {[restaurant.city?.name, restaurant.type?.name].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  </div>
                  <div className="top-item-count">
                    <span>{count}</span>
                    <span className="text-slate-400 text-xs font-normal">meals</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Revolving Photo Carousel */}
        <div className="overview-carousel-col">
          <OverviewPhotoCarousel
            meals={meals}
            onNavigateToMealDetail={onNavigateToMealDetail}
          />
        </div>
      </section>

      {/* Section 2: Full-Width Progression of Meals Line Graph */}
      <section className="overview-progression-section">
        <div className="progression-header">
          <div className="progression-title-wrap">
            <h2>Progression of Meals</h2>
            <p className="progression-subtitle">
              Annual and cumulative trajectory of dining experiences across 1994 – 2026
            </p>
          </div>

          {/* Cumulative vs Per Year Toggle */}
          <div className="progression-toggle-group" role="tablist">
            <button
              type="button"
              className={`progression-toggle-btn ${progressionMode === 'per_year' ? 'active' : ''}`}
              onClick={() => setProgressionMode('per_year')}
            >
              Per Year (Wavy)
            </button>
            <button
              type="button"
              className={`progression-toggle-btn ${progressionMode === 'cumulative' ? 'active' : ''}`}
              onClick={() => setProgressionMode('cumulative')}
            >
              Cumulative
            </button>
          </div>
        </div>

        {/* Full-Width SVG Line Chart */}
        <div className="progression-chart-container">
          <svg
            viewBox={`0 0 ${progressionTimeline.width || 1100} ${progressionTimeline.height || 240}`}
            className="progression-svg"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = progressionTimeline.padding.top + (1 - pct) * (progressionTimeline.height - progressionTimeline.padding.top - progressionTimeline.padding.bottom);
              const maxVal = progressionMode === 'per_year' ? progressionTimeline.maxAnnual : progressionTimeline.maxCumulative;
              const valLabel = Math.round(pct * maxVal);

              return (
                <g key={idx}>
                  <line
                    x1={progressionTimeline.padding.left}
                    y1={y}
                    x2={progressionTimeline.width - progressionTimeline.padding.right}
                    y2={y}
                    className="chart-grid-line"
                  />
                  <text
                    x={progressionTimeline.padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="chart-axis-text"
                  >
                    {valLabel.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Wavy Shaded Area */}
            <path
              d={progressionMode === 'per_year' ? progressionTimeline.annualArea : progressionTimeline.cumulativeArea}
              fill="url(#progressionGradient)"
            />

            {/* Wavy Spline Curve Line */}
            <path
              d={progressionMode === 'per_year' ? progressionTimeline.annualCurve : progressionTimeline.cumulativeCurve}
              className="progression-wavy-curve"
            />

            {/* Interactive Data Points */}
            {(progressionMode === 'per_year' ? progressionTimeline.annualPoints : progressionTimeline.cumulativePoints).map((pt, idx) => {
              const isHovered = hoveredProgressionYear?.year === pt.record.year;

              return (
                <circle
                  key={pt.record.year}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 3.5}
                  className={`chart-data-point ${isHovered ? 'is-hovered' : ''}`}
                  onMouseEnter={() => setHoveredProgressionYear({ ...pt.record, x: pt.x, y: pt.y })}
                  onMouseLeave={() => setHoveredProgressionYear(null)}
                />
              );
            })}

            {/* Year Labels along X axis (every 2-4 years) */}
            {progressionTimeline.annualPoints
              .filter((_, idx) => idx % 3 === 0 || idx === progressionTimeline.annualPoints.length - 1)
              .map((pt) => (
                <text
                  key={pt.record.year}
                  x={pt.x}
                  y={progressionTimeline.height - 10}
                  textAnchor="middle"
                  className="chart-axis-text font-medium"
                >
                  {pt.record.year}
                </text>
              ))}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoveredProgressionYear && (
            <div
              className="chart-tooltip-floating"
              style={{
                left: `${(hoveredProgressionYear.x / progressionTimeline.width) * 100}%`,
                top: `${(hoveredProgressionYear.y / progressionTimeline.height) * 100}%`,
              }}
            >
              <strong>{hoveredProgressionYear.year}</strong>: {hoveredProgressionYear.count} meals
              {progressionMode === 'cumulative' && ` (${hoveredProgressionYear.cumulative.toLocaleString()} cumulative)`}
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Categorical Top 5 Grids (3x2 Grid: Food, Locations, People, Sentiment) */}
      <section className="overview-breakdowns-grid">
        {/* Tier 1 - Card 1: Top Cuisines */}
        <div className="breakdown-card">
          <div className="breakdown-card-header">
            <div className="breakdown-title-group">
              <Utensils size={18} className="breakdown-icon" />
              <h3>Top Cuisines</h3>
            </div>
            <span className="sub-breakdown-total">{foodData.totalCuisines} total</span>
          </div>

          <div className="sub-top-list">
            {foodData.topCuisines.map(([cuisine, count]) => {
              const maxCount = foodData.topCuisines[0][1];
              const widthPct = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={cuisine}
                  className="sub-top-item"
                  onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('cuisines', cuisine)}
                  title={`Filter chronicle for ${cuisine} cuisine`}
                >
                  <div className="sub-top-labels">
                    <span className="sub-item-name">{cuisine}</span>
                    <span className="sub-item-count">{count}</span>
                  </div>
                  <div className="sub-item-progress-track">
                    <div
                      className="sub-item-progress-fill fill-cuisine"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier 1 - Card 2: Top Countries */}
        <div className="breakdown-card">
          <div className="breakdown-card-header">
            <div className="breakdown-title-group">
              <Globe2 size={18} className="breakdown-icon" />
              <h3>Top Countries</h3>
            </div>
            <span className="sub-breakdown-total">{locationData.totalCountries} countries</span>
          </div>

          <div className="sub-top-list">
            {locationData.topCountries.map(([country, count]) => {
              const maxCount = locationData.topCountries[0][1];
              const widthPct = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={country}
                  className="sub-top-item"
                  onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('countries', country)}
                  title={`Filter chronicle for ${country}`}
                >
                  <div className="sub-top-labels">
                    <span className="sub-item-name">{country}</span>
                    <span className="sub-item-count">{count.toLocaleString()}</span>
                  </div>
                  <div className="sub-item-progress-track">
                    <div
                      className="sub-item-progress-fill fill-country"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier 1 - Card 3: Top Companions */}
        <div className="breakdown-card">
          <div className="breakdown-card-header">
            <div className="breakdown-title-group">
              <Users size={18} className="breakdown-icon" />
              <h3>Top Companions</h3>
            </div>
            <span className="sub-breakdown-total">{peopleData.totalPeople} recorded</span>
          </div>

          <div className="sub-top-list">
            {peopleData.topPeople.map(([person, count]) => {
              const maxCount = peopleData.topPeople[0][1];
              const widthPct = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={person}
                  className="sub-top-item"
                  onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('people', person)}
                  title={`Filter chronicle for meals with ${person}`}
                >
                  <div className="sub-top-labels">
                    <span className="sub-item-name">{person}</span>
                    <span className="sub-item-count">{count.toLocaleString()} meals</span>
                  </div>
                  <div className="sub-item-progress-track">
                    <div
                      className="sub-item-progress-fill fill-people"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier 2 - Card 4: Top Dish Types */}
        <div className="breakdown-card">
          <div className="breakdown-card-header">
            <div className="breakdown-title-group">
              <UtensilsCrossed size={18} className="breakdown-icon" />
              <h3>Top Dish Types</h3>
            </div>
            <span className="sub-breakdown-total">{foodData.totalDishTypes} total</span>
          </div>

          <div className="sub-top-list">
            {foodData.topDishTypes.map(([dish, count]) => {
              const maxCount = foodData.topDishTypes[0][1];
              const widthPct = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={dish}
                  className="sub-top-item"
                  onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('foodTypes', dish)}
                  title={`Filter chronicle for ${dish} dishes`}
                >
                  <div className="sub-top-labels">
                    <span className="sub-item-name">{dish}</span>
                    <span className="sub-item-count">{count}</span>
                  </div>
                  <div className="sub-item-progress-track">
                    <div
                      className="sub-item-progress-fill fill-dish"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier 2 - Card 5: Top Cities */}
        <div className="breakdown-card">
          <div className="breakdown-card-header">
            <div className="breakdown-title-group">
              <MapPin size={18} className="breakdown-icon" />
              <h3>Top Cities</h3>
            </div>
            <span className="sub-breakdown-total">{locationData.totalCities} cities</span>
          </div>

          <div className="sub-top-list">
            {locationData.topCities.map(([city, count]) => {
              const maxCount = locationData.topCities[0][1];
              const widthPct = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={city}
                  className="sub-top-item"
                  onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('cities', city)}
                  title={`Filter chronicle for ${city}`}
                >
                  <div className="sub-top-labels">
                    <span className="sub-item-name">{city}</span>
                    <span className="sub-item-count">{count.toLocaleString()}</span>
                  </div>
                  <div className="sub-item-progress-track">
                    <div
                      className="sub-item-progress-fill fill-city"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier 2 - Card 6: Top Sentiments */}
        <div className="breakdown-card">
          <div className="breakdown-card-header">
            <div className="breakdown-title-group">
              <Smile size={18} className="breakdown-icon" />
              <h3>Sentiment</h3>
            </div>
            <span className="sub-breakdown-total">{sentimentData.totalSentiments} recorded</span>
          </div>

          <div className="sub-top-list">
            {sentimentData.topSentiments.map(([sentiment, count]) => {
              const maxCount = sentimentData.topSentiments[0][1];
              const widthPct = Math.round((count / maxCount) * 100);

              return (
                <div
                  key={sentiment}
                  className="sub-top-item"
                  onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('search', sentiment)}
                  title={`Filter chronicle for ${sentiment}`}
                >
                  <div className="sub-top-labels">
                    <span className="sub-item-name">{sentiment}</span>
                    <span className="sub-item-count">{count.toLocaleString()}</span>
                  </div>
                  <div className="sub-item-progress-track">
                    <div
                      className="sub-item-progress-fill fill-sentiment"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: Visual Graphs (Ratings Pie & Sentiment Split Line Graph) */}
      <section className="overview-graphs-grid">
        {/* Graph A: Ratings Donut / Pie Chart */}
        <div className="graph-card">
          <div className="graph-card-header">
            <div>
              <h3>Ratings Distribution</h3>
              <p className="graph-subtitle">Meal evaluations categorized by canonical score</p>
            </div>
            <PieIcon size={18} className="text-slate-400" />
          </div>

          <div className="pie-chart-wrap">
            <div className="pie-svg-container">
              <svg viewBox="0 0 100 100" className="pie-svg">
                {ratingsBreakdown.map((slice, idx) => {
                  if (slice.count === 0) return null;
                  const isHovered = hoveredPieIndex === idx;
                  const rOuter = isHovered ? 45 : 43;
                  const rInner = isHovered ? 27 : 28;
                  const path = getDonutSectorPath(50, 50, rInner, rOuter, slice.startAngle, slice.endAngle);

                  return (
                    <path
                      key={slice.label}
                      d={path}
                      fill={slice.color}
                      className={`pie-slice ${isHovered ? 'is-hovered' : ''}`}
                      onMouseEnter={() => setHoveredPieIndex(idx)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                      onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('ratings', slice.filterKey)}
                    >
                      <title>{`${slice.label}: ${slice.count.toLocaleString()} (${slice.percentage.toFixed(1)}%)`}</title>
                    </path>
                  );
                })}
              </svg>

              <div className="pie-donut-center">
                <div className="donut-center-total">{totalMeals.toLocaleString()}</div>
                <div className="donut-center-label">Rated Meals</div>
              </div>
            </div>

            {/* Legend */}
            <div className="pie-legend-list">
              {ratingsBreakdown.map((slice, idx) => (
                <div
                  key={slice.label}
                  className="pie-legend-item"
                  onMouseEnter={() => setHoveredPieIndex(idx)}
                  onMouseLeave={() => setHoveredPieIndex(null)}
                  onClick={() => onApplyChronicleFilter && onApplyChronicleFilter('ratings', slice.filterKey)}
                  title={`Filter chronicle for ${slice.label}`}
                >
                  <div className="pie-legend-left">
                    <span className="pie-legend-dot" style={{ backgroundColor: slice.color }} />
                    <span className="font-medium text-slate-700">{slice.label}</span>
                  </div>
                  <div className="pie-legend-count">
                    <span>{slice.count.toLocaleString()}</span>
                    <span className="text-slate-400 font-normal ml-1">({slice.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graph B: Sentiment Split Line Graph (Positive, Neutral, Negative) */}
        <div className="graph-card">
          <div className="graph-card-header">
            <div>
              <h3>Sentiment Trajectory</h3>
              <p className="graph-subtitle">Evolution of meal sentiments (Sentiment High) over time</p>
            </div>
            <Smile size={18} className="text-slate-400" />
          </div>

          <div className="sentiment-chart-wrap">
            {/* Legend */}
            <div className="sentiment-legend">
              <span className="sentiment-legend-badge">
                <span className="sentiment-legend-dot" style={{ backgroundColor: '#10b981' }} />
                <span>Positive</span>
              </span>
              <span className="sentiment-legend-badge">
                <span className="sentiment-legend-dot" style={{ backgroundColor: '#3b82f6' }} />
                <span>Neutral</span>
              </span>
              <span className="sentiment-legend-badge">
                <span className="sentiment-legend-dot" style={{ backgroundColor: '#ef4444' }} />
                <span>Negative</span>
              </span>
            </div>

            {/* SVG Line Chart */}
            <div className="progression-chart-container">
              <svg
                viewBox={`0 0 ${sentimentTimeline.width || 600} ${sentimentTimeline.height || 180}`}
                className="sentiment-svg"
                preserveAspectRatio="none"
              >
                {/* Horizontal Grid */}
                {[0, 0.5, 1].map((pct, idx) => {
                  const y = sentimentTimeline.padding.top + (1 - pct) * (sentimentTimeline.height - sentimentTimeline.padding.top - sentimentTimeline.padding.bottom);
                  const val = Math.round(pct * sentimentTimeline.maxVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={sentimentTimeline.padding.left}
                        y1={y}
                        x2={sentimentTimeline.width - sentimentTimeline.padding.right}
                        y2={y}
                        className="chart-grid-line"
                      />
                      <text
                        x={sentimentTimeline.padding.left - 6}
                        y={y + 4}
                        textAnchor="end"
                        className="chart-axis-text"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Positive Spline Curve */}
                <path d={sentimentTimeline.positiveCurve} className="sentiment-curve positive" />

                {/* Neutral Spline Curve */}
                <path d={sentimentTimeline.neutralCurve} className="sentiment-curve neutral" />

                {/* Negative Spline Curve */}
                <path d={sentimentTimeline.negativeCurve} className="sentiment-curve negative" />

                {/* Data Points on Hover */}
                {sentimentTimeline.positivePts.map((pt) => {
                  const isHovered = hoveredSentimentYear?.year === pt.d.year;
                  return (
                    <g key={pt.d.year}>
                      {isHovered && (
                        <>
                          <circle cx={pt.x} cy={pt.y} r="4" fill="#10b981" />
                          <circle
                            cx={pt.x}
                            cy={sentimentTimeline.neutralPts.find((p) => p.d.year === pt.d.year)?.y || 0}
                            r="4"
                            fill="#3b82f6"
                          />
                          <circle
                            cx={pt.x}
                            cy={sentimentTimeline.negativePts.find((p) => p.d.year === pt.d.year)?.y || 0}
                            r="4"
                            fill="#ef4444"
                          />
                        </>
                      )}
                      {/* Transparent Hover Hitbox Column */}
                      <rect
                        x={pt.x - 8}
                        y={sentimentTimeline.padding.top}
                        width="16"
                        height={sentimentTimeline.height - sentimentTimeline.padding.top - sentimentTimeline.padding.bottom}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredSentimentYear({ ...pt.d, x: pt.x, y: pt.y })}
                        onMouseLeave={() => setHoveredSentimentYear(null)}
                      />
                    </g>
                  );
                })}

                {/* Year Labels along bottom */}
                {sentimentTimeline.positivePts
                  .filter((_, idx) => idx % 4 === 0 || idx === sentimentTimeline.positivePts.length - 1)
                  .map((pt) => (
                    <text
                      key={pt.d.year}
                      x={pt.x}
                      y={sentimentTimeline.height - 8}
                      textAnchor="middle"
                      className="chart-axis-text"
                    >
                      {pt.d.year}
                    </text>
                  ))}
              </svg>

              {/* Tooltip */}
              {hoveredSentimentYear && (
                <div
                  className="chart-tooltip-floating"
                  style={{
                    left: `${(hoveredSentimentYear.x / sentimentTimeline.width) * 100}%`,
                    top: '25%',
                  }}
                >
                  <div className="font-bold mb-1">{hoveredSentimentYear.year} Sentiment</div>
                  <div className="text-emerald-400">Positive: {hoveredSentimentYear.positive}</div>
                  <div className="text-blue-400">Neutral: {hoveredSentimentYear.neutral}</div>
                  <div className="text-rose-400">Negative: {hoveredSentimentYear.negative}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
