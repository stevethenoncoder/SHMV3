import React from 'react';
import { Bookmark, User } from 'lucide-react';
import ProjectSelector from '../ProjectSelector/ProjectSelector.jsx';
import './DesktopHeader.css';

export default function DesktopHeader({
  projects,
  activeProject,
  onSelectProject,
  activeNav,
  onSelectNav,
  locationLabelPlural,
}) {
  return (
    <header className="desktop-header">
      <div className="header-inner">
        {/* Left: Brand Badge & Project Selector */}
        <div className="header-left">
          <div className="brand-logo-badge">
            <span className="logo-letter">A</span>
            <span className="logo-sup">Z</span>
          </div>

          <ProjectSelector
            projects={projects}
            activeProject={activeProject}
            onSelectProject={onSelectProject}
          />
        </div>

        {/* Center: Nav Links */}
        <nav className="desktop-nav">
          <button
            type="button"
            className={`nav-link ${activeNav === 'explorer' ? 'active' : ''}`}
            onClick={() => onSelectNav('explorer')}
          >
            Blogs
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'stats' ? 'active' : ''}`}
            onClick={() => onSelectNav('stats')}
          >
            Stats
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'locations' ? 'active' : ''}`}
            onClick={() => onSelectNav('locations')}
          >
            {locationLabelPlural === 'Counties'
              ? 'County Index'
              : locationLabelPlural === 'Boroughs'
              ? 'Borough Index'
              : 'Location Index'}
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'categories' ? 'active' : ''}`}
            onClick={() => onSelectNav('categories')}
          >
            Category Index
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
            onClick={() => onSelectNav('about')}
          >
            About
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="header-right">
          <button type="button" className="icon-btn" aria-label="Bookmarks">
            <Bookmark size={18} />
          </button>
          <button type="button" className="profile-btn" aria-label="Profile">
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
