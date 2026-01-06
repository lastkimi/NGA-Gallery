import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import ObjectDetailPage from './pages/ObjectDetailPage';
import AnalysisPage from './pages/AnalysisPage';
import TimelinePage from './pages/TimelinePage';
import AboutPage from './pages/AboutPage';
import SearchPage from './pages/SearchPage';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4 text-red-600">出现错误</h1>
            <p className="text-neutral-600 mb-4">{this.state.error?.message || '未知错误'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-neutral-900 text-white rounded hover:bg-neutral-800"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import ScrollToTopButton from './components/common/ScrollToTopButton';
import ScrollToTop from './components/common/ScrollToTop';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="/object/:id" element={<ObjectDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
          <ScrollToTopButton />
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
