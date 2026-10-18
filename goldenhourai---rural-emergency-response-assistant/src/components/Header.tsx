import React from 'react';
import { Columns, Smartphone, Radio, RefreshCw, Zap, Building2 } from 'lucide-react';
import { AppViewRoute } from '../types/emergency';

export type ScreenTab = 'caller' | 'dispatch' | 'doctor';

interface HeaderProps {
  currentRoute: AppViewRoute;
  onNavigateRoute: (route: AppViewRoute) => void;
  hasActiveEmergency: boolean;
  emergencySeverity?: string;
  onReset: () => void;
  onOpenDataset?: () => void;
  onOpenCollectedCalls?: () => void;
  collectedCallsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigateRoute,
  hasActiveEmergency,
  emergencySeverity,
  onReset,
  onOpenDataset,
  onOpenCollectedCalls,
  collectedCallsCount = 0,
}) => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, route: AppViewRoute) => {
    e.preventDefault();
    onNavigateRoute(route);
  };

  return (
    <header className="bg-[#0E1B2E] border-b border-slate-800/80 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 py-2.5 min-h-[60px]">
        {/* Zone 1: GoldenHourAI Branding */}
        <div className="flex items-center gap-3 shrink-0">
          <svg viewBox="0 0 120 120" width="44" height="44" role="img" aria-label="GoldenHourAI logo">
            <path d="M28 74 A32 32 0 0 1 92 74 Z" fill="#F2A93B"/>
            <line x1="60" y1="22" x2="60" y2="30" stroke="#F2A93B" strokeWidth="5" strokeLinecap="round"/>
            <line x1="26" y1="36" x2="32" y2="42" stroke="#F2A93B" strokeWidth="5" strokeLinecap="round"/>
            <line x1="94" y1="36" x2="88" y2="42" stroke="#F2A93B" strokeWidth="5" strokeLinecap="round"/>
            <polyline points="6,74 38,74 46,74 52,54 60,96 68,44 76,74 114,74" fill="none" stroke="#FFF7EA" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              GoldenHour<span className="text-[#F2A93B]">AI</span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
              Emergency Tele-Relay · (Simulated)
            </span>
          </div>
        </div>

        {/* Zone 2: View Switcher Links (/ , /caller , /ops) */}
        <nav
          aria-label="Interface view switcher"
          className="flex items-center gap-1 sm:gap-1.5 p-1 bg-[#17273d]/90 rounded-xl border border-slate-700/60 overflow-x-auto max-w-full min-w-0 scrollbar-none"
        >
          <a
            href="/"
            data-testid="nav-link-split"
            onClick={(e) => handleNavClick(e, 'split')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              currentRoute === 'split'
                ? 'bg-[#F2A93B] text-[#0E1B2E] font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Columns className="w-4 h-4 shrink-0" />
            <span>Split view</span>
          </a>

          <a
            href="/caller"
            data-testid="nav-link-caller"
            onClick={(e) => handleNavClick(e, 'caller')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              currentRoute === 'caller'
                ? 'bg-[#F2A93B] text-[#0E1B2E] font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Caller phone only</span>
          </a>

          <a
            href="/ops"
            data-testid="nav-link-ops"
            onClick={(e) => handleNavClick(e, 'ops')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap relative ${
              currentRoute === 'ops'
                ? 'bg-[#F2A93B] text-[#0E1B2E] font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-4 h-4 shrink-0" />
            <span>Operations only</span>
            {hasActiveEmergency && (
              <span className="ml-1 w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            )}
          </a>

          <a
            href="/registry"
            data-testid="nav-link-registry"
            onClick={(e) => handleNavClick(e, 'registry')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              currentRoute === 'registry'
                ? 'bg-[#F2A93B] text-[#0E1B2E] font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Central Registry</span>
          </a>
        </nav>

        {/* Zone 3: Reset Demo */}
        <div className="flex items-center gap-2 shrink-0">
          {hasActiveEmergency && emergencySeverity && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>
                Severity: <strong>{emergencySeverity}</strong>
              </span>
            </div>
          )}

          <button
            type="button"
            data-testid="nav-reset-demo"
            onClick={onReset}
            title="Reset demo with a clean state"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/70 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset demo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
