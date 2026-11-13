/**
 * AgroShift Gambia — Application Entry Point
 * Rebuilt to faithfully implement the 9-screen AgroShift Gambia Figma specification.
 * Eliminates developer dashboards and renders the authentic farmer workflow.
 */

import React from 'react';
import { AgroShiftProvider, useAgroShift } from './context/AgroShiftContext';
import { Header } from './components/layout/Header';
import { SidebarNav } from './components/layout/SidebarNav';
import { StepperProgressBar } from './components/layout/StepperProgressBar';

// The 9 Figma Screens
import { LandingScreen } from './components/screens/LandingScreen';
import { ChooseFieldScreen } from './components/screens/ChooseFieldScreen';
import { FieldDetailsScreen } from './components/screens/FieldDetailsScreen';
import { PrioritiesLimitsScreen } from './components/screens/PrioritiesLimitsScreen';
import { AnalysisLoadingScreen } from './components/screens/AnalysisLoadingScreen';
import { DataEvidenceScreen } from './components/screens/DataEvidenceScreen';
import { ThreeOptionsScreen } from './components/screens/ThreeOptionsScreen';
import { StrategyDetailScreen } from './components/screens/StrategyDetailScreen';
import { CompareTakeAwayScreen } from './components/screens/CompareTakeAwayScreen';

const MainAppRouter: React.FC = () => {
  const { currentStep } = useAgroShift();

  // Screen 1: Landing Page (Full-width marketing & entry experience, Figma Page 1)
  if (currentStep === 'overview') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1">
          <LandingScreen />
        </main>
      </div>
    );
  }

  // Screens 2 to 9: Farmer Analysis & Decision Workflow (Figma Pages 2 to 9)
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Left Sidebar Navigation (Matching Figma Pages 2-9) */}
        <SidebarNav />

        {/* Main Workflow Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <StepperProgressBar />

          {/* Dynamic Screen Routing */}
          {currentStep === 'choose-field' && <ChooseFieldScreen />}
          {currentStep === 'field-details' && <FieldDetailsScreen />}
          {currentStep === 'priorities-limits' && <PrioritiesLimitsScreen />}
          {currentStep === 'analysis' && <AnalysisLoadingScreen />}
          {currentStep === 'evidence' && <DataEvidenceScreen />}
          {currentStep === 'strategies' && <ThreeOptionsScreen />}
          {currentStep === 'strategy-detail' && <StrategyDetailScreen />}
          {currentStep === 'compare-report' && <CompareTakeAwayScreen />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AgroShiftProvider>
      <MainAppRouter />
    </AgroShiftProvider>
  );
}
