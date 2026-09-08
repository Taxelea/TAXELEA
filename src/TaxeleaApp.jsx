import { useState, useEffect, useMemo, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
import { THEMES } from "./theme/themes.js";
import { ThemeContext } from "./theme/ThemeContext.jsx";
import {
  loadTheme, saveTheme, loadResults, saveResults, loadBookmarks, saveBookmarks,
  loadInProgressTest,
  logout, loadCurrentUser, saveCurrentUser, loadSession,
  isOwnerSetup,
} from "./lib/storage.js";
import { getISTDateString, getISTToday } from "./lib/timezone.js";
import { SUBJECT_PROGRESS_BASE } from "./data/catalog.js";
import { Sidebar } from "./components/layout/Sidebar.jsx";
import { Header } from "./components/layout/Header.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { SectionalMocks } from "./pages/SectionalMocks.jsx";
import { FullTestSeries } from "./pages/FullTestSeries.jsx";
import { OtherExams } from "./pages/OtherExams.jsx";
import { PracticeHub } from "./pages/PracticeHub.jsx";

import { RealTestRunner } from "./pages/RealTestRunner.jsx";
import { PerformancePage } from "./pages/PerformancePage.jsx";
import { BookmarksPage } from "./pages/BookmarksPage.jsx";
import StreakPage from "./pages/StreakPage.jsx";
import { LeaderboardPage } from "./pages/LeaderboardPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { loadTestJSON } from "./data/testCards.js";
import { TESTS_BY_YEAR, UNSORTED_TESTS } from "./data/testsByYear.js";
import { Card } from "./components/ui/Card.jsx";

function LoadingScreen({ visible, onFadeComplete }) {
  const [opacity, setOpacity] = useState(1);
  const [visibleState, setVisibleState] = useState(visible);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (!visible) {
      // Start fade out
      setOpacity(0);
      // After fade completes, remove from DOM
      const timer = setTimeout(() => {
        setVisibleState(false);
        onFadeComplete?.();
      }, 500); // 500ms fade duration
      return () => clearTimeout(timer);
    } else {
      setVisibleState(true);
      setOpacity(1);
    }
  }, [visible, onFadeComplete]);

  if (!visibleState) return null;

  return (
    <div 
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg)]"
      style={{ 
        opacity,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: visible ? 'auto' : 'none'
      }}
    >
      <div className="flex flex-col items-center justify-center">
        {!videoError ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-[200px] h-[200px] object-contain"
            style={{ maxWidth: '250px', maxHeight: '250px' }}
            onError={() => {
              console.error('Video failed to load, showing fallback');
              setVideoError(true);
            }}
          >
            <source src="/assets/loading-logo.mp4" type="video/mp4" />
          </video>
        ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
            <div className="text-[var(--accent)] text-4xl" aria-hidden="true">...</div>
          </div>
        )}
        <div 
          className="mt-4 text-[var(--text-primary)] text-lg font-medium"
          style={{
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        >
          Loading...
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

function TestRunnerWrapper({ onComplete }) {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get referrer from navigation state or default to practice
  const referrer = location.state?.referrer || '/practice';

  useEffect(() => {
    const loadTest = async () => {
      try {
        
        // Find the test card and load its data
        const { SECTIONAL_TEST_CARDS, FULL_TEST_CARDS } = await import("./data/testCards.js");
        const archiveCards = [
          ...Object.values(TESTS_BY_YEAR).flat(),
          ...UNSORTED_TESTS,
        ];
        const allCards = [...SECTIONAL_TEST_CARDS, ...FULL_TEST_CARDS, ...archiveCards];
        const decodedTestId = decodeURIComponent(testId);
        
        
        // Try exact match first
        let card = allCards.find(c => c.id === decodedTestId);
        
        // If not found, try partial match for tests that might have been truncated in URL
        if (!card) {
          card = allCards.find(c => c.id.includes(decodedTestId) || decodedTestId.includes(c.id));
        }
        
        
        if (card && card.path) {
          const data = await loadTestJSON(card.path);
          
          // Set test data regardless of validation - let the test runner handle it
          setTestData({ ...data, card });
        } else {
          // Debug details go to the console for developers; the on-screen
          // message stays clean and understandable for real users instead
          // of showing raw internal IDs/counts.
          const sampleIds = allCards.slice(0, 5).map(c => c.id);
          console.error('Test not found:', { requestedId: decodedTestId, totalAvailable: allCards.length, sampleIds });
          setError(`This test couldn't be found. It may have been removed, or the link you followed might be out of date.`);
        }
      } catch (err) {
        console.error('Error loading test:', err);
        setError(`Something went wrong while loading this test. Please try again, or go back and pick another one.`);
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  // Cleanup function to prevent state leaks
  useEffect(() => {
    return () => {
      setTestData(null);
      setError(null);
      setLoading(true);
    };
  }, []);


  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="text-center py-12">
          <div className="text-[var(--text-faint)]">Loading test...</div>
          <div className="text-[var(--text-faint)] text-sm mt-2">Please wait while we load your questions</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card className="p-6 text-center">
          <div className="text-red-500 mb-2">Error Loading Test</div>
          <div className="text-[var(--text-faint)] text-sm mb-4">{error}</div>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => navigate(referrer)} 
              className="text-sm text-[var(--text-primary)] hover:underline"
            >
              Back to Previous Page
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="text-sm text-[var(--text-primary)] hover:underline"
            >
              Reload Page
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card className="p-6 text-center">
          <div className="text-[var(--text-faint)] mb-2">Test data not available</div>
          <button 
            onClick={() => navigate(referrer)} 
            className="text-sm text-[var(--text-primary)] hover:underline"
          >
            Back to Previous Page
          </button>
        </Card>
      </div>
    );
  }

  return <RealTestRunner testKey={testData.card} testData={testData} onComplete={onComplete} referrer={referrer} />;
}

// Wrapper component to protect routes that require authentication
const ProtectedRoute = ({ children, currentUser }) => {
  if (!currentUser) {
    return (
      <div className="p-10 text-center">
        <div className="text-[var(--text-faint)] text-sm mb-4">Please login to access this feature</div>
        <button 
          onClick={() => window.location.href = '/'}
          className="text-red-500 text-sm hover:underline"
        >
          Go to Login
        </button>
      </div>
    );
  }
  return children;
};

function AppContent({ onAppLoaded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [locationKey, setLocationKey] = useState(location.pathname);
  const [inProgressTest, setInProgressTest] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  // Get current page from URL path
  const getCurrentPage = useCallback(() => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/sectional') return 'sectional';
    if (path === '/full') return 'full';
    if (path === '/practice') return 'practice';
    if (path.startsWith('/practice/')) return 'practice-run';
    if (path === '/performance') return 'performance';
    if (path === '/bookmarks') return 'bookmarks';
    if (path === '/streak') return 'streak';
    if (path === '/reports') return 'reports';
    if (path === '/settings') return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  const currentPage = getCurrentPage();

  // Force re-render when location changes to fix back navigation
  useEffect(() => {
    setLocationKey(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    (async () => {
      try {
        
        // Check if owner is setup
        const ownerSetup = await isOwnerSetup();
        setIsFirstTimeSetup(!ownerSetup);
        
        // Check if user is authenticated using local storage
        const session = await loadSession();
        const user = await loadCurrentUser();
        
        if (user && session) {
          setCurrentUser(user);
          // Load user data
          const [r, b, t, ip] = await Promise.all([loadResults(), loadBookmarks(), loadTheme(), loadInProgressTest()]);
          setResults(r);
          setBookmarks(b);
          setInProgressTest(ip);
          // Don't set theme here - it's handled by the parent component
        } else {
          // Don't set theme here - it's handled by the parent component
        }
        
        setIsInitialLoad(false);
        // Notify parent that app has loaded
        onAppLoaded?.();
      } catch (error) {
        console.error('Error loading initial data:', error?.message || error);
        console.error('Error details:', error);
        setIsInitialLoad(false);
        // Still notify parent even if there's an error
        onAppLoaded?.();
      }
    })();
  }, [onAppLoaded]);

  const navigateToPage = useCallback((page) => {
    setMobileNavOpen(false);
    navigate(`/${page}`);
  }, [navigate]);

  const startPractice = useCallback((testId, cardData) => {
    // Support both old (key only) and new (id, cardData) signatures
    
    // If cardData is provided, use it; otherwise create a basic object
    const card = cardData || { id: testId };
    
    // If testId is the card object itself (from new signature), use it
    const finalCard = typeof testId === 'object' ? testId : card;
    
    
    // Navigate with referrer state to enable proper back navigation
    navigate(`/practice/${encodeURIComponent(finalCard.id)}`, { 
      state: { referrer: location.pathname } 
    });
    setMobileNavOpen(false);
  }, [navigate, location.pathname]);

  const handleComplete = useCallback((result) => {
    setResults((prev) => {
      // Add userId to the result if not present
      const resultWithUserId = currentUser ? { ...result, userId: currentUser.id } : result;
      const next = [resultWithUserId, ...prev].slice(0, 50);
      saveResults(next);
      return next;
    });
  }, [currentUser]);

  const toggleBookmark = useCallback((key, label, subject) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.key === key && b.userId === currentUser?.id);
      const next = exists 
        ? prev.filter((b) => !(b.key === key && b.userId === currentUser?.id))
        : [...prev, { key, label, subject, userId: currentUser?.id }];
      saveBookmarks(next);
      return next;
    });
  }, [currentUser]);
  
  const handleAuthSuccess = useCallback(async (user) => {
    setCurrentUser(user);
    // Save current user to local storage
    await saveCurrentUser(user);
    // Reload results and bookmarks for the user
    const [r, b] = await Promise.all([loadResults(), loadBookmarks()]);
    setResults(r);
    setBookmarks(b);
  }, []);
  
  const handleLogout = useCallback(async () => {
    await logout();
    await saveCurrentUser(null);
    setCurrentUser(null);
    setResults([]);
    setBookmarks([]);
    setInProgressTest(null);
  }, []);



  const stats = useMemo(() => {
    // Filter to the current user's own results — results/bookmarks are
    // already tagged with userId elsewhere (see toggleBookmark, handleComplete),
    // so this must match. Previously this used ALL results unfiltered
    // ("single user system" assumption that no longer matched the rest of
    // the app), which meant every user's stat cards showed combined totals
    // from every account that had ever used the same browser/storage.
    const userResults = currentUser ? results.filter(r => r.userId === currentUser.id) : results;
    
    const sessionQuestions = userResults.reduce((s, r) => s + r.total, 0);
    const sessionCorrect = userResults.reduce((s, r) => s + r.score, 0);
    const questionsSolved = sessionQuestions;
    const accuracy = questionsSolved > 0 ? Math.round((sessionCorrect / questionsSolved) * 100) : 0;
    const testsAttempted = userResults.length;
    
    // Calculate today's activity based on actual results from today using IST
    const today = getISTToday();
    const todayResults = userResults.filter(r => getISTDateString(r.id) === today);
    const todayAnswered = todayResults.reduce((s, r) => s + r.total, 0);

    const subjectProgress = {};
    Object.entries(SUBJECT_PROGRESS_BASE).forEach(([key, base]) => {
      const subjResults = userResults.filter((r) => r.subject === key);
      const solved = subjResults.reduce((s, r) => s + r.total, 0);
      const correct = subjResults.reduce((s, r) => s + r.score, 0);
      const acc = solved > 0 ? Math.round((correct / solved) * 100) : 0;
      subjectProgress[key] = { ...base, solved, acc };
    });

    return {
      questionsSolved, accuracy, testsAttempted, todayAnswered,
      solvedThisWeek: sessionQuestions, testsThisWeek: userResults.length,
      accDelta: "Based on test results",
      subjectProgress,
    };
  }, [results, currentUser]);

  return (
    <>
      {mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)} className="fixed inset-0 bg-black/60 z-30 lg:hidden" />
      )}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 h-full transform transition-transform duration-200 ease-out ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <Sidebar
          page={currentPage === "practice-run" ? "practice" : currentPage}
          setPage={navigateToPage}
          onClose={() => setMobileNavOpen(false)}
          currentUser={currentUser}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header onMenuClick={() => setMobileNavOpen(true)} onLogout={handleLogout} currentUser={currentUser} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isInitialLoad ? (
          <div className="p-10 text-[var(--text-faint)] text-sm">Loading your progress...</div>
        ) : (
          <div key={locationKey} className="route-content">
          <Routes>
            <Route path="/" element={<Dashboard setPage={navigateToPage} startPractice={startPractice} results={results} stats={stats} inProgressTest={inProgressTest} currentUser={currentUser} onAuthSuccess={handleAuthSuccess} isFirstTimeSetup={isFirstTimeSetup} />} />
            <Route path="/dashboard" element={<Dashboard setPage={navigateToPage} startPractice={startPractice} results={results} stats={stats} inProgressTest={inProgressTest} currentUser={currentUser} onAuthSuccess={handleAuthSuccess} isFirstTimeSetup={isFirstTimeSetup} />} />
            <Route path="/sectional" element={<ProtectedRoute currentUser={currentUser}><SectionalMocks startPractice={startPractice} bookmarks={bookmarks.map(b=>b.key)} toggleBookmark={toggleBookmark} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/full" element={<ProtectedRoute currentUser={currentUser}><FullTestSeries startPractice={startPractice} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/otherexams" element={<ProtectedRoute currentUser={currentUser}><OtherExams startPractice={startPractice} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute currentUser={currentUser}><PracticeHub startPractice={startPractice} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/practice/:testId" element={<ProtectedRoute currentUser={currentUser}><TestRunnerWrapper onComplete={handleComplete} /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute currentUser={currentUser}><PerformancePage results={results} stats={stats} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/bookmarks" element={<ProtectedRoute currentUser={currentUser}><BookmarksPage bookmarks={bookmarks} toggleBookmark={toggleBookmark} startPractice={startPractice} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/streak" element={<ProtectedRoute currentUser={currentUser}><StreakPage currentUser={currentUser} results={results} /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute currentUser={currentUser}><LeaderboardPage currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute currentUser={currentUser}><SettingsPage currentUser={currentUser} onLogout={handleLogout} /></ProtectedRoute>} />
            <Route path="*" element={<Dashboard setPage={navigateToPage} startPractice={startPractice} results={results} stats={stats} inProgressTest={inProgressTest} currentUser={currentUser} onAuthSuccess={handleAuthSuccess} isFirstTimeSetup={isFirstTimeSetup} />} />
          </Routes>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

export default function TaxeleaApp() {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("taxelea:theme");
      return savedTheme && THEMES[savedTheme] ? savedTheme : "dark";
    } catch (_error) {
      return "dark";
    }
  });
  const [isLoading, setIsLoading] = useState(false); // Disabled for now to fix white screen
  
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      saveTheme(next);
      return next;
    });
  }, []);

  const themeVars = THEMES[theme];

  // Handle loading screen fade completion
  const handleLoadingComplete = useCallback(() => {
    // Cleanup if needed
  }, []);

  // Safety timeout to ensure loading screen doesn't get stuck
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 3000); // 3 second safety timeout - faster to prevent white screen

    return () => clearTimeout(safetyTimeout);
  }, [isLoading]);

  return (
    <BrowserRouter>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <LoadingScreen 
          visible={isLoading} 
          onFadeComplete={handleLoadingComplete}
        />
        <div
          data-theme={theme}
          className="w-full h-screen flex text-[var(--text-primary)] overflow-hidden relative transition-colors duration-200 motion-reduce:transition-none"
          style={{ backgroundColor: themeVars["--bg"], ...themeVars }}
        >
          <AppContent onAppLoaded={() => setIsLoading(false)} />
        </div>
      </ThemeContext.Provider>
    </BrowserRouter>
  );
}
