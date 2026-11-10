import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Film, User, Search, ChevronDown, Check, X } from 'lucide-react';
import { startMealFilm } from '../../journey/mealFilm.module.js';
import geo from '../../journey/film-geo.json';
import { buildFilmSummary, slugifyPerson } from '../../utils/journeySummary.js';
import './MyJourneyPage.css';

/**
 * Background preloader for up to 6 restaurant type icons and 9 photo candidates.
 * Runs non-blocking to warm the browser image cache before act 6 (Street) and act 7 (Photos).
 */
function preloadFilmImages(summary) {
  if (!summary) return;
  // Preload top restaurant icons
  if (Array.isArray(summary.top)) {
    summary.top.forEach((r) => {
      const iconUrl = r[6];
      if (iconUrl && typeof iconUrl === 'string' && iconUrl.startsWith('http')) {
        const img = new Image();
        img.src = iconUrl;
      }
    });
  }
  // Preload first 9 candidate photos
  if (Array.isArray(summary.photos)) {
    summary.photos.slice(0, 9).forEach((p) => {
      const photoUrl = p[0];
      if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
        const img = new Image();
        img.src = photoUrl;
      }
    });
  }
}

export default function MyJourneyPage({ mealsData }) {
  const filmContainerRef = useRef(null);
  const filmInstanceRef = useRef(null);

  // Build selectable people list from mealsData
  const peopleList = useMemo(() => {
    if (!mealsData || !Array.isArray(mealsData.meals)) return [];

    // Calculate actual attended meal count for each person
    const mealCountsByPersonId = new Map();
    for (const m of mealsData.meals) {
      for (const c of m.companions || []) {
        if (c.peopleId && c.publicName) {
          mealCountsByPersonId.set(
            c.peopleId,
            (mealCountsByPersonId.get(c.peopleId) || 0) + 1
          );
        }
      }
    }

    const list = [];
    // 1. First entry: Steve Holland (all meals)
    list.push({
      id: null,
      slug: 'steve-holland',
      name: 'Steve Holland',
      mealCount: mealsData.meals.length,
    });

    // 2. Named people from People_Public (most meals first)
    if (mealsData.publicPeopleById) {
      for (const [id, person] of mealsData.publicPeopleById.entries()) {
        const name = (person.publicName || '').trim();
        if (
          !name ||
          name === 'Hidden name' ||
          name.includes('Just Me') ||
          /\d{3}/.test(name)
        ) {
          continue;
        }
        const count = mealCountsByPersonId.get(id) || 0;
        if (count > 0) {
          list.push({
            id,
            slug: slugifyPerson(name),
            name,
            mealCount: count,
          });
        }
      }
    }

    const [steve, ...others] = list;
    others.sort(
      (a, b) => b.mealCount - a.mealCount || a.name.localeCompare(b.name)
    );
    return [steve, ...others];
  }, [mealsData]);

  // Read person parameter from URL (?person=slug-or-id)
  const getInitialSlug = () => {
    if (typeof window === 'undefined') return 'steve-holland';
    const params = new URLSearchParams(window.location.search);
    return params.get('person') || 'steve-holland';
  };

  const [selectedSlug, setSelectedSlug] = useState(() => {
    const slug = getInitialSlug();
    const match = peopleList.find((p) => p.slug === slug);
    return match ? match.slug : 'steve-holland';
  });

  // Search input state for person picker dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pickerRef = useRef(null);

  // Sync selected person with URL query parameter
  const handleSelectPerson = useCallback((person) => {
    setSelectedSlug(person.slug);
    setDropdownOpen(false);
    setSearchTerm('');
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (person.slug === 'steve-holland') {
        params.delete('person');
      } else {
        params.set('person', person.slug);
      }
      const q = params.toString();
      const newUrl = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
      window.history.pushState(null, '', newUrl);
    }
  }, []);

  // Listen to external URL changes (e.g. back/forward navigation)
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const pParam = params.get('person');
      if (pParam) {
        const match = peopleList.find((p) => p.slug === pParam);
        if (match && match.slug !== selectedSlug) {
          setSelectedSlug(match.slug);
        }
      } else if (selectedSlug !== 'steve-holland') {
        setSelectedSlug('steve-holland');
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [peopleList, selectedSlug]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Current selected person object
  const currentPerson = useMemo(() => {
    return (
      peopleList.find((p) => p.slug === selectedSlug) ||
      peopleList[0] || {
        id: null,
        slug: 'steve-holland',
        name: 'Steve Holland',
        mealCount: 0,
      }
    );
  }, [peopleList, selectedSlug]);

  // Filtered list of people for the search picker
  const filteredPeople = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return peopleList;
    return peopleList.filter((p) => p.name.toLowerCase().includes(q));
  }, [peopleList, searchTerm]);

  // Start the meal film in an effect keyed on the selected person
  useEffect(() => {
    const container = filmContainerRef.current;
    if (!container || !mealsData) return;

    // Stop and clean up any existing film before starting a new one
    if (filmInstanceRef.current && typeof filmInstanceRef.current.stop === 'function') {
      try {
        filmInstanceRef.current.stop();
      } catch (err) {
        console.warn('Error stopping previous film:', err);
      }
      filmInstanceRef.current = null;
    }

    // Build film summary for the selected person
    const summary = buildFilmSummary(mealsData, currentPerson.id);
    if (!summary) return;

    // Non-blocking prefetch of upcoming scene assets
    preloadFilmImages(summary);

    // Mount and start the film engine
    const film = startMealFilm(container, summary, { THREE, geo });
    filmInstanceRef.current = film;

    // Cleanup: always call stop() when unmounting or switching person
    return () => {
      if (film && typeof film.stop === 'function') {
        try {
          film.stop();
        } catch (err) {
          console.warn('Error during film stop cleanup:', err);
        }
      }
      filmInstanceRef.current = null;
    };
  }, [mealsData, currentPerson.id]);

  return (
    <div className="my-journey-page">
      {/* Top Controls: Searchable Person Picker */}
      <div className="journey-top-bar">
        <div className="journey-picker-wrapper" ref={pickerRef}>
          <button
            type="button"
            className={`journey-picker-trigger ${dropdownOpen ? 'open' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <div className="trigger-left">
              <Film size={17} className="journey-film-icon" />
              <span className="trigger-label">Journey for</span>
              <span className="trigger-name">{currentPerson.name}</span>
              <span className="trigger-badge">
                {currentPerson.mealCount}{' '}
                {currentPerson.mealCount === 1 ? 'meal' : 'meals'}
              </span>
            </div>
            <ChevronDown size={16} className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} />
          </button>

          {/* Searchable Dropdown Popover */}
          {dropdownOpen && (
            <div className="journey-picker-popover" role="listbox">
              <div className="picker-search-row">
                <Search size={14} className="picker-search-icon" />
                <input
                  type="text"
                  placeholder="Search dining companion..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="picker-search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="picker-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="picker-options-list">
                {filteredPeople.map((person) => {
                  const isSelected = person.slug === currentPerson.slug;
                  return (
                    <button
                      key={person.slug}
                      type="button"
                      className={`picker-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPerson(person)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="option-info">
                        <span className="option-name">{person.name}</span>
                        <span className="option-meals">
                          {person.mealCount}{' '}
                          {person.mealCount === 1 ? 'meal' : 'meals'}
                        </span>
                      </div>
                      {isSelected && <Check size={15} className="option-check" />}
                    </button>
                  );
                })}
                {filteredPeople.length === 0 && (
                  <div className="picker-empty">No companions found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3D Film Container: fills the rest of the screen without scrolling */}
      <div className="journey-film-container" ref={filmContainerRef} id="film" />
    </div>
  );
}
