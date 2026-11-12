import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, User, LayoutDashboard } from 'lucide-react';
import PeopleOverview from './PeopleOverview/PeopleOverview.jsx';
import PeopleIndividual from './PeopleIndividual/PeopleIndividual.jsx';
import { slugifyPerson } from '../../utils/journeySummary.js';
import './PeoplePage.css';

export default function PeoplePage({
  meals = [],
  publicPeopleById = new Map(),
  rawPeoplePublic = [],
  mealsData = {},
  onNavigateToJourney,
  onNavigateToChronicle,
  onSelectMeal,
  onSelectRestaurant,
}) {
  // Read initial view & person from URL params
  const [subView, setSubView] = useState(() => {
    if (typeof window === 'undefined') return 'overview';
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const personParam = params.get('person');
    if (viewParam === 'individual' || personParam) return 'individual';
    return 'overview';
  });

  const [selectedPersonKey, setSelectedPersonKey] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('person') || null;
  });

  // Default to most frequent public companion if none selected when entering Individual view
  const defaultPersonKey = useMemo(() => {
    if (selectedPersonKey) return selectedPersonKey;
    let topId = null;
    let maxMeals = 0;
    for (const [id, rec] of publicPeopleById.entries()) {
      const name = rec.publicName || rec.name;
      if (name && name.toLowerCase() !== 'hidden name') {
        // Count meals
        let count = 0;
        for (const m of meals) {
          if ((m.companions || []).some((c) => c.peopleId === id)) count++;
        }
        if (count > maxMeals) {
          maxMeals = count;
          topId = id;
        }
      }
    }
    return topId;
  }, [selectedPersonKey, publicPeopleById, meals]);

  const activePersonKey = selectedPersonKey || defaultPersonKey;

  // Handle URL state sync
  const updateUrlState = useCallback((view, personKey) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('section', 'people');
    if (view === 'individual') {
      params.set('view', 'individual');
      if (personKey) params.set('person', String(personKey));
    } else {
      params.delete('view');
      params.delete('person');
    }
    const query = params.toString();
    const newUrl = query ? `/people?${query}` : '/people';
    window.history.pushState(null, '', newUrl);
  }, []);

  // Popstate listener to handle browser back / forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const personParam = params.get('person');
      if (viewParam === 'individual' || personParam) {
        setSubView('individual');
        if (personParam) setSelectedPersonKey(personParam);
      } else {
        setSubView('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handler: Switch subview
  const handleSwitchView = (newView) => {
    setSubView(newView);
    updateUrlState(newView, activePersonKey);
  };

  // Handler: Select a person (from directory, network, groups, table, or dropdown)
  const handleSelectPerson = (personObj) => {
    const key = personObj.slug || slugifyPerson(personObj.name) || personObj.id;
    setSelectedPersonKey(key);
    setSubView('individual');
    updateUrlState('individual', key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigation handlers to Journey & Chronicle
  const handleJourneyNav = (person) => {
    const slug = person?.slug || slugifyPerson(person?.name);
    if (onNavigateToJourney) {
      onNavigateToJourney(slug);
    } else {
      window.history.pushState(null, '', `/?person=${slug}`);
      window.location.href = `/?person=${slug}`;
    }
  };

  const handleChronicleNav = (person) => {
    if (onNavigateToChronicle) {
      onNavigateToChronicle(person.name);
    }
  };

  return (
    <div className="people-page-container">
      {/* Sub-navigation Header */}
      <div className="people-subnav-header">
        <div className="people-title-area">
          <h1 className="people-main-title">
            <Users size={26} style={{ color: 'var(--brand-green)' }} />
            People
          </h1>
          <p className="people-main-subtitle">
            Social dining history: companions, recurring tables, connections, and personal dining stories
          </p>
        </div>

        {/* Overview | Individual Sub-view Toggle */}
        <div className="people-view-switcher" role="tablist" aria-label="People Views">
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'overview'}
            className={`people-switch-btn ${subView === 'overview' ? 'active' : ''}`}
            onClick={() => handleSwitchView('overview')}
          >
            <LayoutDashboard size={15} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subView === 'individual'}
            className={`people-switch-btn ${subView === 'individual' ? 'active' : ''}`}
            onClick={() => handleSwitchView('individual')}
          >
            <User size={15} />
            <span>Individual</span>
          </button>
        </div>
      </div>

      {/* Primary Sub-view Content */}
      {subView === 'overview' ? (
        <PeopleOverview
          meals={meals}
          publicPeopleById={publicPeopleById}
          rawPeoplePublic={rawPeoplePublic}
          onSelectPerson={handleSelectPerson}
        />
      ) : (
        <PeopleIndividual
          targetPersonIdOrSlug={activePersonKey}
          meals={meals}
          publicPeopleById={publicPeopleById}
          mealsData={mealsData}
          onSelectPerson={handleSelectPerson}
          onNavigateToJourney={handleJourneyNav}
          onNavigateToChronicle={handleChronicleNav}
          onSelectMeal={onSelectMeal}
          onSelectRestaurant={onSelectRestaurant}
        />
      )}
    </div>
  );
}
