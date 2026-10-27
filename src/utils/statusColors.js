/**
 * Maps known Expedition / Journey status strings to semantic colours and display labels.
 */
export const STATUS_CONFIG = {
  'Blogged': {
    label: 'Complete',
    color: '#10b981', // green
    dotBg: '#10b981',
  },
  'Blogged & logged': {
    label: 'Complete',
    color: '#10b981',
    dotBg: '#10b981',
  },
  'Complete': {
    label: 'Complete',
    color: '#10b981',
    dotBg: '#10b981',
  },
  'Visited': {
    label: 'Visited',
    color: '#3b82f6', // blue
    dotBg: '#3b82f6',
  },
  'Visited only': {
    label: 'Visited',
    color: '#3b82f6',
    dotBg: '#3b82f6',
  },
  'Planned': {
    label: 'Planned',
    color: '#f59e0b', // orange / amber
    dotBg: '#f59e0b',
  },
  'Planned trip': {
    label: 'Planned',
    color: '#f59e0b',
    dotBg: '#f59e0b',
  },
  'Not planned': {
    label: 'Unscheduled',
    color: '#94a3b8', // slate grey
    dotBg: '#94a3b8',
  },
  'Unscheduled': {
    label: 'Unscheduled',
    color: '#94a3b8',
    dotBg: '#94a3b8',
  },
};

/**
 * Explicit display ordering for expedition status:
 * 1. Complete (Blogged)
 * 2. Visited only (Visited)
 * 3. Planned trip (Planned)
 * 4. Unscheduled (Not planned)
 */
export const STATUS_ORDER = ['Blogged', 'Visited', 'Planned', 'Not planned'];

export function sortStatuses(statuses = []) {
  return [...statuses].sort((a, b) => {
    let indexA = STATUS_ORDER.indexOf(a);
    let indexB = STATUS_ORDER.indexOf(b);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  });
}

/**
 * Returns color and display info for any status string, with neutral fallback.
 */
export function getStatusStyle(rawStatus) {
  if (!rawStatus) {
    return {
      label: 'Unknown',
      color: '#94a3b8',
      dotBg: '#94a3b8',
    };
  }

  const trimmed = rawStatus.trim();
  if (STATUS_CONFIG[trimmed]) {
    return {
      ...STATUS_CONFIG[trimmed],
      raw: trimmed,
    };
  }

  // Case insensitive match
  const matchKey = Object.keys(STATUS_CONFIG).find(
    (k) => k.toLowerCase() === trimmed.toLowerCase()
  );

  if (matchKey) {
    return {
      ...STATUS_CONFIG[matchKey],
      raw: trimmed,
    };
  }

  return {
    label: trimmed,
    color: '#64748b',
    dotBg: '#64748b',
    raw: trimmed,
  };
}

/**
 * Returns the contextual placeholder text based on status and active project config.
 * @param {string} status
 * @param {Object} [config]
 * @returns {string}
 */
export function getPlaceholderText(status, config) {
  const statusInfo = getStatusStyle(status);
  const normalizedLabel = statusInfo.label; // 'Complete', 'Visited', 'Planned', 'Unscheduled'

  if (config) {
    if (normalizedLabel === 'Visited' && config.visitedPlaceholder) {
      return config.visitedPlaceholder;
    }
    if (normalizedLabel === 'Planned' && config.plannedPlaceholder) {
      return config.plannedPlaceholder;
    }
    if (normalizedLabel === 'Unscheduled' && config.unscheduledPlaceholder) {
      return config.unscheduledPlaceholder;
    }
  }

  // Fallbacks if not provided in config
  if (normalizedLabel === 'Visited') {
    return "Sorry, whilst I've logged a visit to this place, I've not got around to writing my blog/report. Will be coming soon - check back";
  }
  if (normalizedLabel === 'Planned') {
    return "Ah ha - I've planned this place, but not managed to visit yet, let alone write a blog. It'll happen at some point";
  }
  if (normalizedLabel === 'Unscheduled') {
    return "Sorry, this is just a temporary placeholder until I confirm I'm happy with this place. Still researching";
  }

  return 'No image available';
}
