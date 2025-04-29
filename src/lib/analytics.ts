import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';

// Initialize analytics safely (handles SSR)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getAnalytics();
  }
  return null;
};

// Track page views
export const trackPageView = async (pageName: string) => {
  const analytics = await initAnalytics();
  if (!analytics) return;
  
  logEvent(analytics, 'page_view', {
    page_title: pageName,
    page_location: window.location.href,
    page_path: window.location.pathname
  });
};

// Track section views
export const trackSectionView = async (sectionName: string) => {
  const analytics = await initAnalytics();
  if (!analytics) return;
  
  logEvent(analytics, 'section_view', {
    section_name: sectionName
  });
};

// Track novel interactions
export const trackNovelInteraction = async (
  action: 'view' | 'click' | 'follow' | 'unfollow', 
  novelId: string, 
  novelTitle?: string
) => {
  const analytics = await initAnalytics();
  if (!analytics) return;
  
  logEvent(analytics, `novel_${action}`, {
    novel_id: novelId,
    novel_title: novelTitle || ''
  });
};

// Track user actions
export const trackUserAction = async (action: string, additionalData?: Record<string, any>) => {
  const analytics = await initAnalytics();
  if (!analytics) return;
  
  logEvent(analytics, action, additionalData);
};

// Track search
export const trackSearch = async (searchTerm: string, resultsCount?: number) => {
  const analytics = await initAnalytics();
  if (!analytics) return;
  
  logEvent(analytics, 'search', {
    search_term: searchTerm,
    results_count: resultsCount
  });
};

// Track theme toggle
export const trackThemeChange = async (newTheme: string) => {
  const analytics = await initAnalytics();
  if (!analytics) return;
  
  logEvent(analytics, 'theme_change', {
    new_theme: newTheme
  });
};

// Track navigation
export const trackNavigation = async (destination: string) => {
  const analytics = await initAnalytics();
  if (!analytics) return;
  
  logEvent(analytics, 'navigation', {
    destination
  });
}; 