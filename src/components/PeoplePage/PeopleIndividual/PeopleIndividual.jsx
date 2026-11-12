import React, { useMemo } from 'react';
import IndividualHeader from './IndividualHeader.jsx';
import IndividualTimeline from './IndividualTimeline.jsx';
import IndividualGlobeSection from './IndividualGlobeSection.jsx';
import IndividualFavouriteHaunts from './IndividualFavouriteHaunts.jsx';
import IndividualCompanions from './IndividualCompanions.jsx';
import IndividualDiningGeography from './IndividualDiningGeography.jsx';
import IndividualStoryComments from './IndividualStoryComments.jsx';
import { buildIndividualProfileData } from '../../../utils/peopleAnalytics.js';

export default function PeopleIndividual({
  targetPersonIdOrSlug,
  meals = [],
  publicPeopleById = new Map(),
  mealsData = {},
  onSelectPerson,
  onNavigateToJourney,
  onNavigateToChronicle,
  onSelectMeal,
  onSelectRestaurant,
}) {
  // Build profile data
  const profile = useMemo(() => {
    return buildIndividualProfileData(targetPersonIdOrSlug, meals, publicPeopleById, mealsData);
  }, [targetPersonIdOrSlug, meals, publicPeopleById, mealsData]);

  // List of all public people for header picker
  const allPublicPeople = useMemo(() => {
    // Count meals for each public person
    const countsMap = new Map();
    for (const m of meals) {
      for (const c of m.companions || []) {
        if (c.peopleId) {
          countsMap.set(c.peopleId, (countsMap.get(c.peopleId) || 0) + 1);
        }
      }
    }

    const list = [];
    for (const [id, rec] of publicPeopleById.entries()) {
      const name = rec.publicName || rec.name;
      if (name && name.toLowerCase() !== 'hidden name') {
        const count = countsMap.get(id) || 0;
        if (count > 0) {
          list.push({ id, name, mealCount: count });
        }
      }
    }
    return list.sort((a, b) => b.mealCount - a.mealCount);
  }, [meals, publicPeopleById]);

  if (!profile) {
    return (
      <div className="people-card" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Select a Dining Companion</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Choose a companion from the Overview directory or the selector above to explore their dining story.
        </p>
      </div>
    );
  }

  const {
    person,
    headlineSummary,
    heroPhotos,
    timeline,
    coreMetrics,
    globeCityPoints,
    favouriteHaunts,
    otherCompanions,
    privateCompanionMeals,
    sentimentWordCloud,
    sentimentCounts,
    diningGeography,
    storyComments,
  } = profile;

  return (
    <div className="people-individual-root">
      {/* 1. Header with Controls, Name, KPIs, and Hero Photo */}
      <IndividualHeader
        person={person}
        coreMetrics={coreMetrics}
        heroPhotos={heroPhotos}
        allPublicPeople={allPublicPeople}
        onSelectPerson={onSelectPerson}
        onNavigateToJourney={() => onNavigateToJourney && onNavigateToJourney(person)}
        onNavigateToChronicle={() => onNavigateToChronicle && onNavigateToChronicle(person)}
      />

      {/* 2. Interactive Timeline */}
      <IndividualTimeline timeline={timeline} onSelectMeal={onSelectMeal} />

      {/* 3. 3D Places Globe & City Breakdown */}
      <IndividualGlobeSection globeCityPoints={globeCityPoints} personName={person.name} />

      {/* 4. Favourite Haunts */}
      <IndividualFavouriteHaunts
        haunts={favouriteHaunts}
        personName={person.name}
        onSelectRestaurant={onSelectRestaurant}
      />

      {/* 5. Who Else Was at the Table? & Sentiment Word Cloud */}
      <IndividualCompanions
        companions={otherCompanions}
        privateMealsCount={privateCompanionMeals}
        sentimentWordCloud={sentimentWordCloud}
        sentimentCounts={sentimentCounts}
        personName={person.name}
        onSelectPerson={onSelectPerson}
      />

      {/* 6. Dining Geography & Preferences */}
      <IndividualDiningGeography diningGeography={diningGeography} />

      {/* 7. The Comments Tell the Story */}
      <IndividualStoryComments
        comments={storyComments}
        personName={person.name}
        onSelectMeal={onSelectMeal}
      />
    </div>
  );
}
