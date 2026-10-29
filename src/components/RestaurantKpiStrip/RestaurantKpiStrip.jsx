import React from 'react';
import './RestaurantKpiStrip.css';

/**
 * KPI strip displaying 4 headline metrics for the Restaurants collection:
 * - Restaurants
 * - Countries
 * - Cities
 * - Years Covered
 */
export default function RestaurantKpiStrip({
  restaurantCount = 0,
  countryCount = 0,
  cityCount = 0,
  yearsSpan = 0,
}) {
  return (
    <section className="restaurant-kpi-strip" aria-label="Restaurants Summary Statistics">
      <div className="restaurant-kpi-card">
        <span className="restaurant-kpi-value">{restaurantCount.toLocaleString()}</span>
        <span className="restaurant-kpi-label">Restaurants</span>
      </div>
      <div className="restaurant-kpi-card">
        <span className="restaurant-kpi-value">{countryCount.toLocaleString()}</span>
        <span className="restaurant-kpi-label">Countries</span>
      </div>
      <div className="restaurant-kpi-card">
        <span className="restaurant-kpi-value">{cityCount.toLocaleString()}</span>
        <span className="restaurant-kpi-label">Cities</span>
      </div>
      <div className="restaurant-kpi-card">
        <span className="restaurant-kpi-value">{yearsSpan}</span>
        <span className="restaurant-kpi-label">Years Covered</span>
      </div>
    </section>
  );
}
