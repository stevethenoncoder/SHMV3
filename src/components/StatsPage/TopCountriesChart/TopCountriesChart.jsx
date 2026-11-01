import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import './TopCountriesChart.css';

export default function TopCountriesChart({
  countryData,
  activeCountries = [],
  activeCities = [],
  onToggleCountry,
  onToggleCity,
}) {
  const [hoveredCity, setHoveredCity] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { countries = [], totalMeals = 0 } = countryData || {};

  if (!countries || countries.length === 0) {
    return (
      <div className="stats-card">
        <h3 className="stats-card-title">Top Countries by City</h3>
        <div className="stats-empty-block">No location data in this selection.</div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Top Countries by City</h3>
          <p className="stats-card-subtitle">
            Top 10 countries split by destination city across current selection ({totalMeals.toLocaleString()} meals)
          </p>
        </div>
        <div className="stats-card-badge">
          <Globe size={13} />
          <span>Top 10</span>
        </div>
      </div>

      <div
        className="country-chart-body"
        onMouseLeave={() => setHoveredCity(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <div className="country-distribution-list">
          {countries.map((c, idx) => {
            const isCountrySelected = activeCountries.includes(c.country);

            return (
              <div
                key={c.country}
                className={`country-row ${isCountrySelected ? 'is-selected' : ''}`}
              >
                {/* 1. Country Label */}
                <div
                  className="country-row-label"
                  onClick={() => onToggleCountry && onToggleCountry(c.country)}
                  role="button"
                  tabIndex={0}
                  title={`Click to filter by ${c.country}`}
                >
                  <span className="country-rank-num">#{idx + 1}</span>
                  <span className="country-name">{c.country}</span>
                </div>

                {/* 2. Horizontal Stacked Bar (Split by City) */}
                <div className="country-bar-container">
                  <div className="country-bar-track">
                    {c.cities.map((cityObj, cityIdx) => {
                      const isCityActive = activeCities.includes(cityObj.city);
                      const isHovered =
                        hoveredCity?.country === c.country &&
                        hoveredCity?.city === cityObj.city;

                      return (
                        <div
                          key={`${c.country}_${cityObj.city}_${cityIdx}`}
                          className={`city-segment ${isHovered ? 'is-hovered' : ''} ${
                            isCityActive ? 'is-city-active' : ''
                          }`}
                          style={{
                            width: `${cityObj.segmentWidthPct}%`,
                            backgroundColor: cityObj.color,
                          }}
                          onMouseEnter={() =>
                            setHoveredCity({
                              ...cityObj,
                              country: c.country,
                              countryTotal: c.total,
                            })
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!cityObj.isOther && onToggleCity) {
                              onToggleCity(cityObj.city);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 3. Country Total & Percentage */}
                <div className="country-row-counts">
                  <span className="country-count">{c.total.toLocaleString()}</span>
                  <span className="country-percentage">({c.percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip */}
        {hoveredCity && (
          <div
            className="city-segment-tooltip"
            style={{
              left: `${Math.min(Math.max(mousePos.x - 70, 10), 400)}px`,
              top: `${Math.max(10, mousePos.y - 75)}px`,
            }}
          >
            <div className="city-tt-title">
              <span
                className="city-tt-swatch"
                style={{ backgroundColor: hoveredCity.color }}
              />
              <strong>{hoveredCity.city}</strong>
              <span className="city-tt-country">({hoveredCity.country})</span>
            </div>
            <div className="city-tt-row">
              <span>Meals in this City:</span>
              <strong>
                {hoveredCity.count.toLocaleString()} (
                {hoveredCity.percentage}% of {hoveredCity.country})
              </strong>
            </div>
            {!hoveredCity.isOther && (
              <div className="city-tt-hint">
                Click segment to filter by {hoveredCity.city}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
