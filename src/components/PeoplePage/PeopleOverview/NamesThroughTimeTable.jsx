import React from 'react';
import { History, ArrowRight } from 'lucide-react';

export default function NamesThroughTimeTable({ names = [], onSelectPerson }) {
  if (names.length === 0) return null;

  return (
    <div className="people-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <History size={18} />
            Names Through Time
          </h3>
          <p className="people-card-subtitle">
            Historical dining identities and records unified into canonical current people
          </p>
        </div>
      </div>

      <div className="names-table-wrap">
        <table className="names-table">
          <thead>
            <tr>
              <th>Historical Identity</th>
              <th></th>
              <th>Current Canonical Identity</th>
              <th className="text-right">Old Name</th>
              <th className="text-right">New Name</th>
              <th className="text-right">Total Meals</th>
              <th>Transition Era</th>
            </tr>
          </thead>
          <tbody>
            {names.map((n) => (
              <tr key={`${n.historicalId}_${n.canonicalId}`}>
                <td style={{ fontWeight: 600 }}>{n.historicalName}</td>
                <td>
                  <ArrowRight size={14} className="names-arrow" />
                </td>
                <td>
                  <button
                    type="button"
                    className="names-profile-link"
                    onClick={() => onSelectPerson && onSelectPerson({ id: n.canonicalId, name: n.currentName })}
                  >
                    {n.currentName}
                  </button>
                </td>
                <td className="text-right">
                  <div className="names-count-wrap">
                    <span className="names-count old">{(n.oldMealCount || 0).toLocaleString()}</span>
                    {n.oldEra && n.oldEra !== '—' && (
                      <span className="names-sub-era">{n.oldEra}</span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <div className="names-count-wrap">
                    <span className="names-count new">{(n.newMealCount || 0).toLocaleString()}</span>
                    {n.newEra && n.newEra !== '—' && (
                      <span className="names-sub-era">{n.newEra}</span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <span className="names-count total">{(n.totalMeals || n.mealCount || 0).toLocaleString()}</span>
                </td>
                <td>
                  <span className="names-transition-tag">{n.transitionEra || 'Historical'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
