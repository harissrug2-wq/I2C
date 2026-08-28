import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DemoBanner from './components/DemoBanner';
import { DataProvider } from './context/DataContext';

// Dashboard components
import KpiMetricsGrid from './components/KpiMetricsGrid';
import AlertBanner from './components/AlertBanner';
import CrossDomainAlerts from './components/CrossDomainAlerts';
import DailyAttentionSection from './components/DailyAttentionSection';
import HealthSummarySection from './components/HealthSummarySection';

// Inner Page Views
import ForecastPage from './pages/ForecastPage';
import AlertsPage from './pages/AlertsPage';
import InsightsPage from './pages/InsightsPage';
import AtRiskPage from './pages/AtRiskPage';
import CollectionsPage from './pages/CollectionsPage';
import CustomersPage from './pages/CustomersPage';
import PaymentsPage from './pages/PaymentsPage';
import SuppliersPage from './pages/SuppliersPage';
import MarginsPage from './pages/MarginsPage';
import ReorderPage from './pages/ReorderPage';
import ProductsPage from './pages/ProductsPage';
import ConnectionsPage from './pages/ConnectionsPage';

// Interactive Modals
import AskAiModal from './components/AskAiModal';
import SearchModal from './components/SearchModal';
import ActionDetailsModal from './components/ActionDetailsModal';
import SettingsModal from './components/SettingsModal';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Modals state
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  // Sync activeTab with URL hash or pathname for navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '') || 'dashboard';
      if (path) setActiveTab(path);
    };
    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.history.pushState(null, '', `/${tabId === 'dashboard' ? '' : tabId}`);
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'forecast':
        return <ForecastPage onOpenActionModal={setSelectedAction} />;
      case 'alerts':
        return <AlertsPage onOpenActionModal={setSelectedAction} />;
      case 'insights':
        return <InsightsPage onOpenActionModal={setSelectedAction} />;
      case 'at-risk':
        return <AtRiskPage onOpenActionModal={setSelectedAction} />;
      case 'collections':
        return <CollectionsPage onOpenActionModal={setSelectedAction} />;
      case 'customers':
        return <CustomersPage onOpenActionModal={setSelectedAction} />;
      case 'payments':
        return <PaymentsPage onOpenActionModal={setSelectedAction} />;
      case 'suppliers':
        return <SuppliersPage onOpenActionModal={setSelectedAction} />;
      case 'margins':
        return <MarginsPage onOpenActionModal={setSelectedAction} />;
      case 'reorder':
        return <ReorderPage onOpenActionModal={setSelectedAction} />;
      case 'products':
        return <ProductsPage onOpenActionModal={setSelectedAction} />;
      case 'connections':
        return <ConnectionsPage onOpenActionModal={setSelectedAction} />;
      case 'dashboard':
      default:
        return (
          <>
            {/* Greeting Header */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Saturday, August 15, 2026
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Good morning, Dana
                </h1>
                <p className="mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Three things moved overnight. Northgate's risk jumped, PVC margin slipped again, and your Sep 4 low point fell under your operating floor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="rounded-full bg-[#0d9488]/10 hover:bg-[#0d9488]/20 px-3 py-1.5 text-xs font-semibold text-[#0d9488] transition-colors cursor-pointer border border-[#0d9488]/30 flex items-center gap-1.5"
                >
                  ⚙️ Rules & Thresholds Config
                </button>
                <span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border ring-inset shadow-2xs">
                  Reading QuickBooks + Brightpearl
                </span>
              </div>
            </div>

            {/* KPI Metrics Cards Grid */}
            <KpiMetricsGrid onOpenActionModal={setSelectedAction} />

            {/* Overnight Money At Risk Notice Banner */}
            <AlertBanner onOpenActionModal={setSelectedAction} />

            {/* Cross-domain Intelligence Section */}
            <CrossDomainAlerts onOpenActionModal={setSelectedAction} />

            {/* What Needs Your Attention Today Section */}
            <DailyAttentionSection onOpenActionModal={setSelectedAction} />

            {/* AR & Inventory Health Breakdown Section */}
            <HealthSummarySection onOpenActionModal={setSelectedAction} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <div className="flex flex-1 relative">
        {/* Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
        />

        {/* Main Content Workspace */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
          {/* Header Bar */}
          <Header
            onToggleSidebar={toggleSidebar}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenAskAi={() => setIsAskAiOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Demo Banner sitting right below Header */}
          <DemoBanner />

          {/* Main Workspace Body */}
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {renderActiveView()}
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-card py-6 px-4 text-center text-xs text-muted-foreground">
            <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4 px-2">
              <p>© 2026 i2cashflow inc. · Autonomous Inventory to Cashflow Intelligence</p>
              <div className="flex items-center gap-4 text-muted-foreground">
                <a href="#" className="hover:text-foreground">Privacy Policy</a>
                <a href="#" className="hover:text-foreground">Security Audit</a>
                <a href="#" className="hover:text-foreground">Integrations</a>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Interactive Modals */}
      <AskAiModal isOpen={isAskAiOpen} onClose={() => setIsAskAiOpen(false)} />
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelectResult={(item) => setSelectedAction({ title: item.name, details: item.info })}
      />
      <ActionDetailsModal actionData={selectedAction} onClose={() => setSelectedAction(null)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
