import React from 'react';
import { ChevronDown } from 'lucide-react';
import './ProjectSelector.css';

export default function ProjectSelector({ projects, activeProject, onSelectProject, isMobile = false }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className={`project-selector ${isMobile ? 'mobile' : 'desktop'}`}>
      {projects.map((proj) => {
        const isActive = proj.projectKey === activeProject;
        return (
          <button
            key={proj.projectKey}
            type="button"
            className={`proj-pill-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectProject(proj.projectKey)}
          >
            {proj.projectKey}
          </button>
        );
      })}
    </div>
  );
}
