import React, { useState, useMemo } from 'react';
import { Smile, Meh, Frown, Check } from 'lucide-react';
import SentimentWordCloud from './SentimentWordCloud/SentimentWordCloud';
import CommentsTable from './CommentsTable/CommentsTable';
import {
  SENTIMENT_HIGH_CATEGORIES,
  countSentimentHighCategories,
  filterMealsBySentimentHigh,
  filterMealsBySearch,
  buildSentimentWordCloud,
  filterAndSortComments,
} from '../../utils/sentimentAnalytics';
import './SentimentPage.css';

export default function SentimentPage({ meals = [], onSelectMeal }) {
  // 1. Top 3 toggle buttons state: default all 3 active (Positive, Neutral, Negative)
  const [activeCategories, setActiveCategories] = useState([
    'Positive',
    'Neutral',
    'Negative',
  ]);

  // 2. Selected word from word cloud
  const [selectedWord, setSelectedWord] = useState(null);

  // 3. Comments search & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('year');
  const [sortDirection, setSortDirection] = useState('desc');

  // Compute all-time counts for the 3 top buttons
  const categoryCounts = useMemo(() => {
    return countSentimentHighCategories(meals);
  }, [meals]);

  // Toggle button handler
  const handleToggleCategory = (catKey) => {
    setActiveCategories((prev) => {
      if (prev.includes(catKey)) {
        // Toggle OFF
        return prev.filter((k) => k !== catKey);
      } else {
        // Toggle ON
        return [...prev, catKey];
      }
    });
    // Reset selected word if categories change to avoid mismatch
    setSelectedWord(null);
  };

  // Filter meals according to active categories AND dynamic search query
  const searchedMeals = useMemo(() => {
    const categoryFiltered = filterMealsBySentimentHigh(meals, activeCategories);
    return filterMealsBySearch(categoryFiltered, searchQuery);
  }, [meals, activeCategories, searchQuery]);

  // Compute word cloud data from searched meals (updates dynamically with search)
  const wordCloudData = useMemo(() => {
    return buildSentimentWordCloud(searchedMeals, {
      minFontSize: 13,
      maxFontSize: 36,
      maxWords: 85,
    });
  }, [searchedMeals]);

  // Compute filtered & sorted comments for the compact table
  const tableComments = useMemo(() => {
    return filterAndSortComments(
      searchedMeals,
      selectedWord,
      '', // searchedMeals is already search-filtered
      sortField,
      sortDirection
    );
  }, [searchedMeals, selectedWord, sortField, sortDirection]);

  const handleSortChange = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const getButtonIcon = (key) => {
    if (key === 'Positive') return <Smile size={18} />;
    if (key === 'Neutral') return <Meh size={18} />;
    if (key === 'Negative') return <Frown size={18} />;
    return null;
  };

  return (
    <div className="sentiment-page-root">
      {/* Top Header & 3 Sentiment Buttons */}
      <header className="sentiment-page-header">
        <div className="sentiment-header-info">
          <div className="sentiment-badge">
            <span>Emotional Tone</span>
          </div>
          <h1 className="sentiment-page-title">Sentiment & Comments</h1>
          <p className="sentiment-page-subtitle">
            Explore sentiment words and historical meal reviews across high-level emotional tones.
          </p>
        </div>

        {/* 3 Toggle Buttons: Positive, Neutral, Negative */}
        <div className="sentiment-toggle-bar">
          <span className="toggle-bar-label">High Sentiment:</span>
          <div className="sentiment-toggle-buttons">
            {SENTIMENT_HIGH_CATEGORIES.map((cat) => {
              const isActive = activeCategories.includes(cat.key);
              const count = categoryCounts[cat.key] || 0;

              return (
                <button
                  key={cat.key}
                  type="button"
                  className={`sentiment-toggle-btn ${cat.key.toLowerCase()} ${
                    isActive ? 'is-active' : 'is-inactive'
                  }`}
                  onClick={() => handleToggleCategory(cat.key)}
                  aria-pressed={isActive}
                >
                  <span className="btn-icon-wrapper">{getButtonIcon(cat.key)}</span>
                  <span className="btn-label">{cat.label}</span>
                  <span className="btn-count">{count.toLocaleString()}</span>
                  {isActive && <Check size={14} className="btn-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main 2-Column Layout: Left = Word Cloud, Right = Compact Comments Table */}
      <div className="sentiment-content-grid">
        <section className="sentiment-column-left">
          <SentimentWordCloud
            wordCloudData={wordCloudData}
            selectedWord={selectedWord}
            onSelectWord={setSelectedWord}
          />
        </section>

        <section className="sentiment-column-right">
          <CommentsTable
            comments={tableComments}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            selectedWord={selectedWord}
            onClearWord={() => setSelectedWord(null)}
            onSelectWord={setSelectedWord}
            onSelectMeal={onSelectMeal}
          />
        </section>
      </div>
    </div>
  );
}
