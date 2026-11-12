import React from 'react';
import { Users, User, UserCheck, EyeOff, UserPlus, Award } from 'lucide-react';

export default function PeopleKpiGrid({ kpis, onSelectPerson }) {
  const {
    totalUniquePeople = 0,
    publicPeople = 0,
    privatePeople = 0,
    repeatCompanions = 0,
    oneOffCompanions = 0,
    justMeMealsCount = 0,
    filteredMealsCount = 0,
    topCompanion = { name: 'None', count: 0 },
  } = kpis || {};

  return (
    <div className="people-kpi-grid">
      {/* 1. Total Unique People */}
      <div className="people-kpi-card highlight">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Unique People</span>
          <Users size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">{totalUniquePeople.toLocaleString()}</div>
        <div className="people-kpi-sub">Distinct dining companions in archive</div>
      </div>

      {/* 2. Just Me (Eating Solo) */}
      <div
        className="people-kpi-card highlight"
        style={{ cursor: 'pointer' }}
        onClick={() => onSelectPerson && onSelectPerson({ id: 317, name: 'Just Me !!' })}
        title="View dining history when eating solo (Just Me !!)"
      >
        <div className="people-kpi-header">
          <span className="people-kpi-label">Just Me</span>
          <User size={18} className="people-kpi-icon" style={{ color: '#3b82f6' }} />
        </div>
        <div className="people-kpi-value">{justMeMealsCount.toLocaleString()}</div>
        <div className="people-kpi-sub">
          {filteredMealsCount > 0
            ? `${Math.round((justMeMealsCount / filteredMealsCount) * 100)}% of meals eating solo`
            : 'Solo dining occasions'}
        </div>
      </div>

      {/* 3. Public People */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Public People</span>
          <UserCheck size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">{publicPeople.toLocaleString()}</div>
        <div className="people-kpi-sub">
          {totalUniquePeople > 0 ? `${Math.round((publicPeople / totalUniquePeople) * 100)}% of total network` : 'Named profiles'}
        </div>
      </div>

      {/* 4. Private People */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Private People</span>
          <EyeOff size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">{privatePeople.toLocaleString()}</div>
        <div className="people-kpi-sub">Anonymous contributors to stats</div>
      </div>

      {/* 5. Repeat Companions */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Repeat Companions</span>
          <Users size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">{repeatCompanions.toLocaleString()}</div>
        <div className="people-kpi-sub">Dined on 2 or more occasions</div>
      </div>

      {/* 6. One-Off Companions */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">One-Off Companions</span>
          <UserPlus size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">{oneOffCompanions.toLocaleString()}</div>
        <div className="people-kpi-sub">Dined on exactly one meal</div>
      </div>

      {/* 7. Top Companion */}
      <div
        className="people-kpi-card highlight"
        style={{ cursor: topCompanion.id ? 'pointer' : 'default' }}
        onClick={() => topCompanion.id && onSelectPerson && onSelectPerson(topCompanion)}
        title={topCompanion.id ? `View ${topCompanion.name}'s profile` : ''}
      >
        <div className="people-kpi-header">
          <span className="people-kpi-label">Most Frequent</span>
          <Award size={18} className="people-kpi-icon" style={{ color: '#f59e0b' }} />
        </div>
        <div
          className="people-kpi-value"
          style={{ fontSize: '1.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {topCompanion.name}
        </div>
        <div className="people-kpi-sub">
          {topCompanion.count > 0 ? `${topCompanion.count.toLocaleString()} shared meals (click)` : 'No records'}
        </div>
      </div>
    </div>
  );
}
