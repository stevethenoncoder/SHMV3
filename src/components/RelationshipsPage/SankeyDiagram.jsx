import React, { useState, useMemo } from 'react';
import './RelationshipsPage.css';

export default function SankeyDiagram({
  layout,
  leftCategory,
  rightCategory,
  onNavigateToChronicle,
  onSelectNode,
}) {
  const [hoveredRibbon, setHoveredRibbon] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { leftNodes, rightNodes, ribbons, width, height } = layout;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  if (leftNodes.length === 0 || rightNodes.length === 0 || ribbons.length === 0) {
    return (
      <div className="sankey-empty-container">
        <p className="sankey-empty-title">No Relationships Found</p>
        <p className="sankey-empty-subtitle">
          No dining records in the archive combine the currently selected {leftCategory.label} and {rightCategory.label}.
        </p>
      </div>
    );
  }

  // Active highlighted ribbon for tooltip
  const activeTooltipRibbon = hoveredRibbon;

  return (
    <div
      className="sankey-diagram-root"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredRibbon(null);
        setHoveredNode(null);
      }}
    >
      <svg
        className="sankey-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Subtle linear gradients for ribbons */}
          {ribbons.map((r, idx) => {
            const gradId = `ribbon-grad-${idx}`;
            return (
              <linearGradient
                key={gradId}
                id={gradId}
                gradientUnits="userSpaceOnUse"
                x1={r.leftNode?.x1 || 0}
                y1={0}
                x2={r.rightNode?.x0 || width}
                y2={0}
              >
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.45" />
              </linearGradient>
            );
          })}
        </defs>

        {/* 1. Ribbons Layer */}
        <g className="sankey-ribbons-layer">
          {ribbons.map((ribbon, idx) => {
            const isHovered =
              hoveredRibbon?.source === ribbon.source &&
              hoveredRibbon?.target === ribbon.target;

            const isConnectedToNode =
              hoveredNode &&
              (hoveredNode.side === 'left'
                ? hoveredNode.name === ribbon.source
                : hoveredNode.name === ribbon.target);

            const isHighlighted = isHovered || isConnectedToNode;
            const hasAnyHover = Boolean(hoveredRibbon || hoveredNode);

            const opacity = isHighlighted
              ? 0.85
              : hasAnyHover
              ? 0.1
              : 0.38;

            const strokeWidth = isHighlighted ? 1.5 : 0;
            const strokeColor = isHighlighted ? '#0284c7' : 'none';
            const fillColor = isHighlighted ? '#38bdf8' : `url(#ribbon-grad-${idx})`;

            return (
              <path
                key={`ribbon-${ribbon.source}-${ribbon.target}`}
                d={ribbon.path}
                fill={fillColor}
                fillOpacity={opacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className={`sankey-ribbon ${isHighlighted ? 'is-highlighted' : ''}`}
                onMouseEnter={() => setHoveredRibbon(ribbon)}
                onMouseLeave={() => setHoveredRibbon(null)}
                onClick={() => {
                  if (onNavigateToChronicle) {
                    onNavigateToChronicle(ribbon);
                  }
                }}
                style={{ cursor: onNavigateToChronicle ? 'pointer' : 'default' }}
              />
            );
          })}
        </g>

        {/* 2. Left Nodes */}
        <g className="sankey-left-nodes">
          {leftNodes.map((node) => {
            const isHovered = hoveredNode?.side === 'left' && hoveredNode?.name === node.name;
            const isConnected =
              hoveredRibbon && hoveredRibbon.source === node.name;
            const isHighlighted = isHovered || isConnected;

            return (
              <g
                key={`left-node-${node.name}`}
                className={`sankey-node-group ${isHighlighted ? 'is-active' : ''}`}
                onMouseEnter={() => setHoveredNode({ side: 'left', name: node.name })}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectNode && onSelectNode('left', node.name)}
                style={{ cursor: onSelectNode ? 'pointer' : 'default' }}
                role="button"
                tabIndex={0}
                aria-label={`Filter by ${node.name} (${node.value} meals)`}
              >
                {/* Node Vertical Bar */}
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={node.height}
                  rx={2}
                  fill={isHighlighted ? '#0d9488' : '#2dd4bf'}
                  className="sankey-node-bar"
                />

                {/* Node Label beside bar */}
                <text
                  x={node.x1 + 10}
                  y={node.y0 + node.height / 2}
                  dy="0.35em"
                  textAnchor="start"
                  className="sankey-node-label"
                >
                  <tspan className="node-label-title">{node.name}</tspan>
                  <tspan className="node-label-count" dx="6">
                    ({node.value})
                  </tspan>
                </text>
              </g>
            );
          })}
        </g>

        {/* 3. Right Nodes */}
        <g className="sankey-right-nodes">
          {rightNodes.map((node) => {
            const isHovered = hoveredNode?.side === 'right' && hoveredNode?.name === node.name;
            const isConnected =
              hoveredRibbon && hoveredRibbon.target === node.name;
            const isHighlighted = isHovered || isConnected;

            return (
              <g
                key={`right-node-${node.name}`}
                className={`sankey-node-group ${isHighlighted ? 'is-active' : ''}`}
                onMouseEnter={() => setHoveredNode({ side: 'right', name: node.name })}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectNode && onSelectNode('right', node.name)}
                style={{ cursor: onSelectNode ? 'pointer' : 'default' }}
                role="button"
                tabIndex={0}
                aria-label={`Filter by ${node.name} (${node.value} meals)`}
              >
                {/* Node Vertical Bar */}
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={node.height}
                  rx={2}
                  fill={isHighlighted ? '#0284c7' : '#38bdf8'}
                  className="sankey-node-bar"
                />

                {/* Node Label beside bar */}
                <text
                  x={node.x0 - 10}
                  y={node.y0 + node.height / 2}
                  dy="0.35em"
                  textAnchor="end"
                  className="sankey-node-label"
                >
                  <tspan className="node-label-title">{node.name}</tspan>
                  <tspan className="node-label-count" dx="6">
                    ({node.value})
                  </tspan>
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Dark Tooltip (matches user reference image: "Kate -> Bowen \n Count: 3") */}
      {activeTooltipRibbon && (
        <div
          className="sankey-tooltip"
          style={{
            left: `${mousePos.x + 16}px`,
            top: `${mousePos.y - 36}px`,
          }}
        >
          <div className="tooltip-relationship">
            {activeTooltipRibbon.source} → {activeTooltipRibbon.target}
          </div>
          <div className="tooltip-count">
            Count: <strong>{activeTooltipRibbon.value}</strong>
            <span className="tooltip-unit">
              {activeTooltipRibbon.value === 1 ? ' meal' : ' meals'}
            </span>
          </div>
          {onNavigateToChronicle && (
            <div className="tooltip-hint">
              Click to view meals with <strong>both</strong> in Chronicle
            </div>
          )}
        </div>
      )}
    </div>
  );
}
