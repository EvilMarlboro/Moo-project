import { ACTIVITIES, CATEGORY_COLORS } from './mockData';
import { hasRankSystem } from './gameRanks';

export type Category = keyof typeof ACTIVITIES;

// Get category for a specific activity
export function getCategoryForActivity(activity: string): Category | null {
  for (const [category, activities] of Object.entries(ACTIVITIES)) {
    // Handle gaming's nested structure
    if (category === 'gaming' && typeof activities === 'object' && !Array.isArray(activities)) {
      for (const games of Object.values(activities)) {
        if ((games as string[]).includes(activity)) {
          return category as Category;
        }
      }
    }
    // Handle flat arrays for other categories
    else if (Array.isArray(activities) && activities.includes(activity)) {
      return category as Category;
    }
  }
  return null;
}

// Get all activities from a list of categories
export function getActivitiesFromCategories(categories: Category[]): string[] {
  const allActivities: string[] = [];
  categories.forEach(category => {
    const activities = ACTIVITIES[category];
    // Handle gaming's nested structure
    if (category === 'gaming' && typeof activities === 'object' && !Array.isArray(activities)) {
      for (const games of Object.values(activities)) {
        allActivities.push(...(games as string[]));
      }
    }
    // Handle flat arrays for other categories
    else if (Array.isArray(activities)) {
      allActivities.push(...activities);
    }
  });
  return allActivities;
}

// Get all activities in a single category (flattened)
export function getActivitiesInCategory(category: Category): string[] {
  const activities = ACTIVITIES[category];
  
  // Handle gaming's nested structure
  if (category === 'gaming' && typeof activities === 'object' && !Array.isArray(activities)) {
    const allGames: string[] = [];
    for (const games of Object.values(activities)) {
      allGames.push(...(games as string[]));
    }
    return allGames;
  }
  
  // Handle flat arrays for other categories
  if (Array.isArray(activities)) {
    return activities;
  }
  
  return [];
}

// Get unique categories from a list of activities
export function getCategoriesFromActivities(activities: string[]): Category[] {
  const categories = new Set<Category>();
  activities.forEach(activity => {
    const category = getCategoryForActivity(activity);
    if (category) {
      categories.add(category);
    }
  });
  return Array.from(categories);
}

// Get color for an activity
export function getColorForActivity(activity: string): string {
  const category = getCategoryForActivity(activity);
  return category ? CATEGORY_COLORS[category] : '#6B7280';
}

// Activity profile field definitions
export interface ActivityProfileFields {
  [key: string]: any;
}

export function getRequiredFieldsForActivity(activity: string): string[] {
  const category = getCategoryForActivity(activity);
  
  // Gaming activities
  if (category === 'gaming') {
    // Only require skillRank if the game has an official rank system
    const fields = ['playStyle', 'micPreference'];
    if (hasRankSystem(activity)) {
      fields.unshift('skillRank');
    }
    return fields;
  }
  
  // Sports activities
  if (category === 'sports') {
    return ['skillLevel', 'vibe'];
  }
  
  // Studying activities
  if (category === 'studying') {
    return ['major', 'environment'];
  }
  
  // Campus Events and Social don't require fields
  return [];
}

export function isActivityProfileComplete(profile: any, activity: string): boolean {
  if (!profile) return false;
  const requiredFields = getRequiredFieldsForActivity(activity);
  return requiredFields.every(field => profile[field]);
}