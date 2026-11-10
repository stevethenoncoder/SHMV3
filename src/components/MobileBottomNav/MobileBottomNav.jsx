import React from 'react';
import { Compass, Utensils, UtensilsCrossed, BarChart2, Film } from 'lucide-react';
import './MobileBottomNav.css';

export default function MobileBottomNav({ activeNav, onSelectNav }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'chronicle' ? 'active' : ''}`}
        onClick={() => onSelectNav('chronicle')}
      >
        <div className="icon-wrapper">
          <Compass size={18} />
        </div>
        <span>Chronicle</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'restaurants' ? 'active' : ''}`}
        onClick={() => onSelectNav('restaurants')}
      >
        <div className="icon-wrapper">
          <Utensils size={18} />
        </div>
        <span>Restaurants</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'food' ? 'active' : ''}`}
        onClick={() => onSelectNav('food')}
      >
        <div className="icon-wrapper">
          <UtensilsCrossed size={18} />
        </div>
        <span>Food</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'stats' ? 'active' : ''}`}
        onClick={() => onSelectNav('stats')}
      >
        <div className="icon-wrapper">
          <BarChart2 size={18} />
        </div>
        <span>Stats</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'journey' ? 'active' : ''}`}
        onClick={() => onSelectNav('journey')}
      >
        <div className="icon-wrapper">
          <Film size={18} />
        </div>
        <span>My Journey</span>
      </button>
    </nav>
  );
}
