import React from 'react';
import { MessageSquareQuote } from 'lucide-react';

export default function IndividualStoryComments({
  comments = [],
  personName = '',
  onSelectMeal,
}) {
  if (comments.length === 0) return null;

  return (
    <div className="people-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <MessageSquareQuote size={18} />
            The Comments Tell the Story
          </h3>
          <p className="people-card-subtitle">
            Memorable quotes and dining memories recorded during shared meals with {personName}
          </p>
        </div>
      </div>

      <div className="story-comments-grid">
        {comments.map((c) => (
          <div
            key={c.mealId}
            className="story-comment-card"
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectMeal && onSelectMeal(c.mealId)}
            title="Click to view full meal record in Chronicle"
          >
            <p className="story-comment-text">“{c.comment}”</p>

            <div className="story-comment-meta">
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>{c.restaurantName}</strong>
                <div style={{ fontSize: '0.74rem' }}>{c.date}</div>
              </div>

              {c.rating && c.rating !== 'Unrated' && (
                <span className="dir-meal-badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                  {c.rating}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
