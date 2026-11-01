import React, { useState, useMemo } from 'react';
import {
  AVAILABLE_CATEGORIES,
  extractCategoryOptions,
  computeRelationshipsFlow,
  computeSankeyLayout,
  buildCombinedChronicleFilter,
  convertCategoryToFilter,
} from '../../utils/relationshipsHelper.js';
import CategoryMultiSelect from './CategoryMultiSelect.jsx';
import SankeyDiagram from './SankeyDiagram.jsx';
import {
  ArrowLeftRight,
  GitFork,
  ArrowDownNarrowWide,
  ArrowUpWideNarrow,
  ArrowDownAZ,
  ArrowUpZA,
} from 'lucide-react';
import './RelationshipsPage.css';

export default function RelationshipsPage({
  meals = [],
  onApplyChronicleFilter,
}) {
  // 1. Category States (Default: People -> Cuisine)
  const [leftCategory, setLeftCategory] = useState(AVAILABLE_CATEGORIES[0]); // People
  const [rightCategory, setRightCategory] = useState(AVAILABLE_CATEGORIES[1]); // Cuisine

  // 1b. Column Sort States: 'count_desc' | 'count_asc' | 'name_asc' | 'name_desc'
  const [leftSortOption, setLeftSortOption] = useState('count_desc');
  const [rightSortOption, setRightSortOption] = useState('count_desc');

  // 2. Compute all options for left and right
  const leftOptions = useMemo(() => {
    return extractCategoryOptions(meals, leftCategory.key);
  }, [meals, leftCategory.key]);

  const rightOptions = useMemo(() => {
    return extractCategoryOptions(meals, rightCategory.key);
  }, [meals, rightCategory.key]);

  // 3. Selected items for Left and Right
  const [selectedLeft, setSelectedLeft] = useState([]);
  const [selectedRight, setSelectedRight] = useState([]);

  // Initialize selections once meals data loads or options update
  React.useEffect(() => {
    if (selectedLeft.length === 0 && leftOptions.length > 0) {
      setSelectedLeft(leftOptions.slice(0, 6).map((o) => o.name));
    }
  }, [leftOptions]);

  React.useEffect(() => {
    if (selectedRight.length === 0 && rightOptions.length > 0) {
      setSelectedRight(rightOptions.slice(0, 6).map((o) => o.name));
    }
  }, [rightOptions]);

  // When left category changes, initialize with top 6 options of that category
  const handleLeftCategoryChange = (newCat) => {
    setLeftCategory(newCat);
    const opts = extractCategoryOptions(meals, newCat.key);
    setSelectedLeft(opts.slice(0, 6).map((o) => o.name));
  };

  // When right category changes, initialize with top 6 options of that category
  const handleRightCategoryChange = (newCat) => {
    setRightCategory(newCat);
    const opts = extractCategoryOptions(meals, newCat.key);
    setSelectedRight(opts.slice(0, 6).map((o) => o.name));
  };

  // Swap Left and Right dimensions
  const handleSwap = () => {
    const prevLeftCat = leftCategory;
    const prevRightCat = rightCategory;
    const prevSelectedLeft = selectedLeft;
    const prevSelectedRight = selectedRight;
    const prevLeftSort = leftSortOption;
    const prevRightSort = rightSortOption;

    setLeftCategory(prevRightCat);
    setRightCategory(prevLeftCat);
    setSelectedLeft(prevSelectedRight);
    setSelectedRight(prevSelectedLeft);
    setLeftSortOption(prevRightSort);
    setRightSortOption(prevLeftSort);
  };

  // 4. Compute Bipartite Flow
  const flow = useMemo(() => {
    return computeRelationshipsFlow(
      meals,
      leftCategory.key,
      selectedLeft,
      rightCategory.key,
      selectedRight
    );
  }, [meals, leftCategory.key, selectedLeft, rightCategory.key, selectedRight]);

  // 5. Compute Sankey Layout with column sorting
  const layout = useMemo(() => {
    const maxNodes = Math.max(flow.activeLeft.length, flow.activeRight.length, 4);
    const dynamicHeight = Math.max(500, maxNodes * 42 + 80);

    return computeSankeyLayout(flow, {
      width: 1040,
      height: dynamicHeight,
      paddingTop: 32,
      paddingBottom: 32,
      paddingLeft: 24,
      paddingRight: 24,
      nodeWidth: 16,
      nodeGap: 14,
      leftSortOption,
      rightSortOption,
    });
  }, [flow, leftSortOption, rightSortOption]);

  // Handle ribbon click to open in Chronicle with BOTH filters applied!
  const handleRibbonClick = (ribbon) => {
    if (!onApplyChronicleFilter) return;

    const combinedFilter = buildCombinedChronicleFilter(
      leftCategory.key,
      ribbon.source,
      rightCategory.key,
      ribbon.target,
      meals
    );

    onApplyChronicleFilter(combinedFilter);
  };

  // Handle node click to open in Chronicle with single node filter
  const handleNodeClick = (side, nodeName) => {
    if (!onApplyChronicleFilter) return;

    const catKey = side === 'left' ? leftCategory.key : rightCategory.key;
    const singleFilter = convertCategoryToFilter(catKey, nodeName, meals);
    onApplyChronicleFilter(singleFilter);
  };

  return (
    <div className="relationships-page-root">
      {/* 1. Page Header */}
      <div className="relationships-header">
        <div className="relationships-header-text">
          <div className="relationships-title-row">
            <GitFork size={26} className="relationships-header-icon" />
            <h1 className="relationships-title">Dining Relationships</h1>
          </div>
          <p className="relationships-subtitle">
            Visualize flow networks connecting your dining companions, cuisines, dishes, countries, and venues. Click any ribbon to filter the Chronicle for both entries.
          </p>
        </div>

        {/* Headline Stats Pills */}
        <div className="relationships-stats-strip">
          <div className="stat-pill">
            <span className="stat-label">Connections</span>
            <span className="stat-value">{flow.links.length}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Total Volume</span>
            <span className="stat-value">{flow.totalFlow}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Active Pairs</span>
            <span className="stat-value">
              {flow.activeLeft.length} ✕ {flow.activeRight.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Selectors Section */}
      <section className="relationships-controls-card">
        <div className="controls-columns-grid">
          {/* Left Category Multi-Select */}
          <CategoryMultiSelect
            side="left"
            category={leftCategory}
            onCategoryChange={handleLeftCategoryChange}
            availableCategories={AVAILABLE_CATEGORIES}
            options={leftOptions}
            selectedValues={selectedLeft}
            onSelectionChange={setSelectedLeft}
          />

          {/* Swap Middle Button */}
          <div className="swap-button-col">
            <button
              type="button"
              className="swap-dimensions-btn"
              onClick={handleSwap}
              title="Swap Left and Right dimensions"
              aria-label="Swap Left and Right dimensions"
            >
              <ArrowLeftRight size={18} />
              <span className="swap-btn-text">Swap</span>
            </button>
          </div>

          {/* Right Category Multi-Select */}
          <CategoryMultiSelect
            side="right"
            category={rightCategory}
            onCategoryChange={handleRightCategoryChange}
            availableCategories={AVAILABLE_CATEGORIES}
            options={rightOptions}
            selectedValues={selectedRight}
            onSelectionChange={setSelectedRight}
          />
        </div>
      </section>

      {/* 3. Sankey Diagram Canvas Card */}
      <section className="relationships-canvas-card">
        <div className="canvas-header-bar">
          {/* Left Column Header & Sort Controls */}
          <div className="canvas-column-header left">
            <div className="canvas-dimension-label left">
              <span className="dimension-dot left" />
              <span className="dimension-title">{leftCategory.label}</span>
              <span className="dimension-badge">({flow.activeLeft.length})</span>
            </div>

            <div className="column-sort-toolbar" role="group" aria-label="Sort left column">
              <button
                type="button"
                className={`sort-pill ${leftSortOption === 'count_desc' ? 'active' : ''}`}
                onClick={() => setLeftSortOption('count_desc')}
                title="Sort by Number: Highest first"
              >
                <ArrowDownNarrowWide size={12} />
                <span>Count ↓</span>
              </button>
              <button
                type="button"
                className={`sort-pill ${leftSortOption === 'count_asc' ? 'active' : ''}`}
                onClick={() => setLeftSortOption('count_asc')}
                title="Sort by Number: Lowest first"
              >
                <ArrowUpWideNarrow size={12} />
                <span>Count ↑</span>
              </button>
              <button
                type="button"
                className={`sort-pill ${leftSortOption === 'name_asc' ? 'active' : ''}`}
                onClick={() => setLeftSortOption('name_asc')}
                title="Sort by Name: A to Z"
              >
                <ArrowDownAZ size={12} />
                <span>A–Z</span>
              </button>
              <button
                type="button"
                className={`sort-pill ${leftSortOption === 'name_desc' ? 'active' : ''}`}
                onClick={() => setLeftSortOption('name_desc')}
                title="Sort by Name: Z to A"
              >
                <ArrowUpZA size={12} />
                <span>Z–A</span>
              </button>
            </div>
          </div>

          {/* Right Column Header & Sort Controls */}
          <div className="canvas-column-header right">
            <div className="column-sort-toolbar" role="group" aria-label="Sort right column">
              <button
                type="button"
                className={`sort-pill ${rightSortOption === 'count_desc' ? 'active' : ''}`}
                onClick={() => setRightSortOption('count_desc')}
                title="Sort by Number: Highest first"
              >
                <ArrowDownNarrowWide size={12} />
                <span>Count ↓</span>
              </button>
              <button
                type="button"
                className={`sort-pill ${rightSortOption === 'count_asc' ? 'active' : ''}`}
                onClick={() => setRightSortOption('count_asc')}
                title="Sort by Number: Lowest first"
              >
                <ArrowUpWideNarrow size={12} />
                <span>Count ↑</span>
              </button>
              <button
                type="button"
                className={`sort-pill ${rightSortOption === 'name_asc' ? 'active' : ''}`}
                onClick={() => setRightSortOption('name_asc')}
                title="Sort by Name: A to Z"
              >
                <ArrowDownAZ size={12} />
                <span>A–Z</span>
              </button>
              <button
                type="button"
                className={`sort-pill ${rightSortOption === 'name_desc' ? 'active' : ''}`}
                onClick={() => setRightSortOption('name_desc')}
                title="Sort by Name: Z to A"
              >
                <ArrowUpZA size={12} />
                <span>Z–A</span>
              </button>
            </div>

            <div className="canvas-dimension-label right">
              <span className="dimension-title">{rightCategory.label}</span>
              <span className="dimension-badge">({flow.activeRight.length})</span>
              <span className="dimension-dot right" />
            </div>
          </div>
        </div>

        <SankeyDiagram
          layout={layout}
          leftCategory={leftCategory}
          rightCategory={rightCategory}
          onNavigateToChronicle={handleRibbonClick}
          onSelectNode={handleNodeClick}
        />
      </section>
    </div>
  );
}

