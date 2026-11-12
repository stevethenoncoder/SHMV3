import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function CompanionFrequencyDistribution({ bands = [] }) {
  if (bands.length === 0) return null;

  return (
    <div className="people-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <BarChart3 size={18} />
            Companion Frequency Distribution
          </h3>
          <p className="people-card-subtitle">
            One-off dining companions versus long-term regulars across all canonical dining relationships
          </p>
        </div>
      </div>

      <div className="freq-dist-list">
        {bands.map((band) => (
          <div key={band.key} className="freq-dist-row">
            <div className="freq-dist-label">{band.label}</div>
            <div className="freq-dist-bar-track">
              <div
                className={`freq-dist-bar-fill ${band.isSolo ? 'solo' : ''}`}
                style={{ width: `${Math.max(2, band.percentage)}%` }}
              />
            </div>
            <div className="freq-dist-stats">
              {band.formattedStats || `${band.count.toLocaleString()} (${band.percentage}%)`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
