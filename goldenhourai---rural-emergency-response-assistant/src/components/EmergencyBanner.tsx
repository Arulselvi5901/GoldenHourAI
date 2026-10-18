import React from 'react';
import { ShieldAlert, PhoneCall, Radio, HeartPulse } from 'lucide-react';

interface EmergencyBannerProps {
  localEmergencyNumber?: string;
  countryName?: string;
  countryFlag?: string;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  localEmergencyNumber,
  countryName,
  countryFlag,
}) => {
  const displayNumbers = localEmergencyNumber || '112 / 911 / 108 / 119';
  const displayCountry = countryName ? `${countryFlag || '🌐'} ${countryName}` : 'Local Emergency Services';
  const primaryTel = (localEmergencyNumber || '112').split(/[/,]/)[0].trim().replace(/\D/g, '') || '112';

  return (
    <div className="bg-[#122238] border-b border-[#F2A93B]/20 text-xs px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mandatory disclaimer */}
        <div className="flex items-center gap-2 text-slate-200">
          <span className="flex items-center gap-1.5 font-semibold text-[#F2A93B] bg-[#F2A93B]/10 px-2.5 py-1 rounded border border-[#F2A93B]/30 whitespace-nowrap">
            <ShieldAlert className="w-3.5 h-3.5" />
            CRITICAL PROTOCOL
          </span>
          <span className="font-medium text-slate-100">
            {countryName ? (
              <>
                In a real emergency in <strong className="text-white font-bold">{displayCountry}</strong>, call{' '}
                <strong className="text-white underline decoration-[#F2A93B] decoration-2">{displayNumbers}</strong> immediately.
              </>
            ) : (
              <>
                AI assists responders globally. In a real emergency, call local emergency services (<strong className="text-white underline decoration-[#F2A93B] decoration-2">{displayNumbers}</strong>) immediately.
              </>
            )}
          </span>
        </div>

        {/* Right: Rural Tele-Relay Indicators */}
        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-300">GSM Cell Tower SMS Gateway · Zero-Data Bandwidth</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-[#F2A93B]" />
            <span className="text-[11px] text-slate-300">Golden Hour Target: &lt; 60 mins</span>
          </div>
          <a
            href={`tel:${primaryTel}`}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-colors"
          >
            <PhoneCall className="w-3 h-3" />
            <span className="font-bold">{displayNumbers} Emergency</span>
          </a>
        </div>
      </div>
    </div>
  );
};
