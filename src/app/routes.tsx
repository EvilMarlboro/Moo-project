import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { BrowseHub } from './pages/BrowseHub';
import { ProfileSetup } from './pages/ProfileSetup';
import { ActivitySelection } from './pages/ActivitySelection';
import { CategorySelection } from './pages/CategorySelection';
import { ActivityHub } from './pages/ActivityHub';
import { Discovery } from './pages/Discovery';
import { Chat } from './pages/Chat';
import { ActivityProfileManager } from './pages/ActivityProfileManager';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider } from './context/AuthContext';
import { MatchProvider } from './context/MatchContext';
import { MatchClearer } from './components/MatchClearer';
import { AuthNavigator } from './components/AuthNavigator';

// Root component that provides context to all routes
function RootLayout() {
  return (
    <AuthProvider>
      <MatchProvider>
        <MatchClearer />
        <AuthNavigator />
        <Layout />
      </MatchProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: 'login', Component: LoginPage },
      { path: 'browse-hub', Component: BrowseHub },
      { path: 'activity-hub', Component: ActivityHub },
      { path: 'profile-setup', Component: ProfileSetup },
      { path: 'activity-selection', Component: ActivitySelection },
      { path: 'category-selection', Component: CategorySelection },
      { path: 'discovery', Component: Discovery },
      { path: 'chat/:chatId', Component: Chat },
      { path: 'activity-profile', Component: ActivityProfileManager },
      { path: 'settings', Component: Settings },
      { path: '*', Component: NotFound },
    ],
  },
]);