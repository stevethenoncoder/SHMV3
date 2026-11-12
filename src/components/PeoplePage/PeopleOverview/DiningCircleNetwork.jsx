import React, { useState } from 'react';
import { Share2 } from 'lucide-react';

export default function DiningCircleNetwork({ network, onSelectPerson }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [hoveredCompanionId, setHoveredCompanionId] = useState(null);

  const {
    nodes = [],
    links = [],
    maxShared = 1,
    topN = 0,
    totalAvailable = 0,
    allCompanions = [],
    cx = 280,
    cy = 220,
    radius = 165,
    width = 560,
    height = 440,
  } = network || {};

  if (nodes.length === 0) {
    return (
      <div className="people-card">
        <h3 className="people-card-title">Dining Circle</h3>
        <p className="people-card-subtitle">No dining companion connections match your current filters.</p>
      </div>
    );
  }

  // Active connected node IDs for hovered node
  const activeConnectedIds = new Set();
  if (hoveredNode) {
    activeConnectedIds.add(hoveredNode.id);
    for (const l of links) {
      if (l.sourceId === hoveredNode.id) activeConnectedIds.add(l.targetId);
      if (l.targetId === hoveredNode.id) activeConnectedIds.add(l.sourceId);
    }
  }

  // Max meal count across all companions for bar scaling
  const maxCompanionMeals = allCompanions.length > 0 ? allCompanions[0].count : 1;

  return (
    <div className="people-card dining-circle-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <Share2 size={18} />
            Dining Circle & Companions
          </h3>
          <p className="people-card-subtitle">
            Visual social network of shared meals (left) alongside ranked companion volume (right). Hover or click any companion.
          </p>
        </div>
      </div>

      <div className="dining-circle-split-layout">
        {/* Left Panel: 24-Companion Circular Network Visual */}
        <div className="dining-circle-visual-panel">
          <svg
            className="dining-circle-svg"
            viewBox={`0 0 ${width} ${height}`}
            onMouseLeave={() => {
              setHoveredNode(null);
              setHoveredLink(null);
              setHoveredCompanionId(null);
            }}
          >
            {/* Subtle perimeter orbit */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Center Stevie Marker */}
            <circle cx={cx} cy={cy} r={12} fill="#0f172a" />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="800"
              pointerEvents="none"
            >
              SH
            </text>

            {/* Links / Chords between companions */}
            <g className="network-links-group">
              {links.map((link) => {
                const isHighlighted =
                  hoveredNode &&
                  (link.sourceId === hoveredNode.id || link.targetId === hoveredNode.id);
                const isDimmed = hoveredNode && !isHighlighted;

                const strokeWidth = Math.max(1, Math.min(8, (link.count / maxShared) * 7));
                const strokeColor = isHighlighted ? '#10b981' : '#94a3b8';
                const opacity = isHighlighted ? 0.9 : isDimmed ? 0.08 : 0.35;

                // Quadratic bezier curve bending towards center
                const d = `M ${link.source.x} ${link.source.y} Q ${cx} ${cy} ${link.target.x} ${link.target.y}`;

                return (
                  <path
                    key={`${link.sourceId}_${link.targetId}`}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    className="network-link"
                    onMouseEnter={() => setHoveredLink(link)}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g className="network-nodes-group">
              {nodes.map((node) => {
                const isHovered = hoveredNode?.id === node.id || hoveredCompanionId === node.id;
                const isConnected = activeConnectedIds.has(node.id);
                const isDimmed = (hoveredNode || hoveredCompanionId) && !isConnected;

                // Label positioning: push outward along angle
                const labelRadius = radius + node.r + 9;
                const lx = cx + labelRadius * Math.cos(node.angle);
                const ly = cy + labelRadius * Math.sin(node.angle) + 4;
                const textAnchor =
                  Math.abs(Math.cos(node.angle)) < 0.2
                    ? 'middle'
                    : Math.cos(node.angle) > 0
                    ? 'start'
                    : 'end';

                return (
                  <g
                    key={node.id}
                    className="network-node-group"
                    opacity={isDimmed ? 0.25 : 1}
                    onMouseEnter={() => {
                      setHoveredNode(node);
                      setHoveredCompanionId(node.id);
                      const rowEl = document.getElementById(`companion-row-${node.id}`);
                      if (rowEl) {
                        rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                    onClick={() => onSelectPerson && onSelectPerson(node)}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={isHovered ? '#10b981' : isConnected ? '#3b82f6' : '#0f172a'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor={textAnchor}
                      className="network-node-label"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Hover Information Pill */}
          {hoveredNode && (
            <div className="network-tooltip">
              <strong>{hoveredNode.name}</strong>
              <div>{hoveredNode.count.toLocaleString()} meals with Stevie</div>
              <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px' }}>
                Click to view individual dining profile
              </div>
            </div>
          )}
          {hoveredLink && !hoveredNode && (
            <div className="network-tooltip">
              <strong>
                {hoveredLink.source.name} & {hoveredLink.target.name}
              </strong>
              <div>{hoveredLink.count.toLocaleString()} shared meals together</div>
            </div>
          )}
        </div>

        {/* Right Panel: Lightweight, Compact Scrollable Companions Bar List */}
        <div className="dining-companions-side-panel">
          <div className="companions-panel-header">
            <div className="companions-panel-title-wrap">
              <span className="companions-panel-title">Companions</span>
              <span className="companions-panel-subtitle">Meals shared</span>
            </div>
            <span className="companions-panel-count-badge">
              {allCompanions.length} {allCompanions.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          <div className="companions-scroll-list">
            {allCompanions.map((comp) => {
              // Soft square-root scaling to prevent outlier flattening: sqrt(count / max) * 100
              const ratio = maxCompanionMeals > 0 ? comp.count / maxCompanionMeals : 0;
              const sqrtScaled = Math.sqrt(ratio);
              const pct = Math.max(4, Math.round(sqrtScaled * 100));

              // When pct >= 24, count fits cleanly inside the filled bar
              const isWide = pct >= 24;
              const isHovered = hoveredCompanionId === comp.id || hoveredNode?.id === comp.id;

              return (
                <div
                  key={comp.id}
                  id={`companion-row-${comp.id}`}
                  className={`companion-bar-row ${isHovered ? 'active' : ''}`}
                  onClick={() => onSelectPerson && onSelectPerson(comp)}
                  onMouseEnter={() => {
                    setHoveredCompanionId(comp.id);
                    const matchingNode = nodes.find((n) => n.id === comp.id);
                    if (matchingNode) {
                      setHoveredNode(matchingNode);
                    } else {
                      setHoveredNode(null);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredCompanionId(null);
                    setHoveredNode(null);
                  }}
                  title={`View ${comp.name}'s dining profile (${comp.count.toLocaleString()} meals)`}
                >
                  <div className="companion-row-header">
                    <span className="companion-row-name" title={comp.name}>
                      {comp.name}
                    </span>
                  </div>

                  <div className="companion-row-track">
                    <div
                      className="companion-row-fill"
                      style={{ width: `${pct}%` }}
                    >
                      {isWide && (
                        <span className="companion-bar-count inside">
                          {comp.count.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {!isWide && (
                      <span className="companion-bar-count outside">
                        {comp.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
