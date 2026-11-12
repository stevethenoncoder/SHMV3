import React from 'react';
import { Film, Compass } from 'lucide-react';
import IndividualMetricsGrid from './IndividualMetricsGrid.jsx';
import IndividualHeroPhoto from './IndividualHeroPhoto.jsx';

export default function IndividualHeader({
  person,
  coreMetrics,
  heroPhotos = [],
  allPublicPeople = [],
  onSelectPerson,
  onNavigateToJourney,
  onNavigateToChronicle,
}) {
  return (
    <div className="individual-header-card">
      <div className="individual-top-controls">
        {/* Person Picker Dropdown */}
        <div className="individual-picker-wrap">
          <select
            className="individual-picker-select"
            value={person?.id || ''}
            onChange={(e) => {
              const selectedId = parseInt(e.target.value, 10);
              const found = allPublicPeople.find((p) => p.id === selectedId);
              if (found && onSelectPerson) onSelectPerson(found);
            }}
            aria-label="Select dining companion"
          >
            {allPublicPeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.mealCount} {p.mealCount === 1 ? 'meal' : 'meals'})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Action Buttons to Journey & Chronicle */}
        <div className="individual-nav-actions">
          <button
            type="button"
            className="btn-nav-journey"
            onClick={onNavigateToJourney}
            title="View their interactive 3D meal film in Journeys"
          >
            <Film size={16} />
            <span>View their Journey</span>
          </button>

          <button
            type="button"
            className="btn-nav-chronicle"
            onClick={onNavigateToChronicle}
            title="View all shared dining records in Chronicle"
          >
            <Compass size={16} />
            <span>View all meals in Chronicle</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left has "Dad" + KPIs; Right has Hero Photo aligned with "Dad" */}
      <div className="individual-hero-split-layout">
        <div className="individual-hero-left">
          <h2 className="individual-name-large">{person?.name || 'Dining Companion'}</h2>
          <IndividualMetricsGrid metrics={coreMetrics} />
        </div>

        <div className="individual-hero-right">
          <IndividualHeroPhoto heroPhotos={heroPhotos} personName={person?.name} />
        </div>
      </div>
    </div>
  );
}
