import type { LocationId } from '../types/game';

export interface TerminalEpochTheme {
  id: LocationId;
  name: string;
  epochName: string;
  altitude: string;
  accentColor: string;
  accentGlow: string;
  reticleColor: string;
  hudBorderColor: string;
  backgroundGradient: string;
  orb1Class: string;
  orb2Class: string;
  orb3Class: string;
  activeBtnClass: string;
  activeBadgeClass: string;
  directiveGradient: string;
  terminalScanlineColor: string;
}

export const TERMINAL_EPOCH_THEMES: Record<string, TerminalEpochTheme> = {
  liziba: {
    id: 'liziba',
    name: '李子坝',
    epochName: '大河渔猎纪元',
    altitude: '+8F (+300M)',
    accentColor: '#06b6d4', // Cyan / River Teal
    accentGlow: '0 0 35px rgba(6, 182, 212, 0.45)',
    reticleColor: 'rgba(6, 182, 212, 0.75)',
    hudBorderColor: 'rgba(6, 182, 212, 0.35)',
    backgroundGradient: `
      radial-gradient(ellipse 75% 55% at 12% 16%, rgba(6, 182, 212, 0.32) 0%, transparent 60%),
      radial-gradient(ellipse 65% 50% at 88% 22%, rgba(20, 184, 166, 0.28) 0%, transparent 55%),
      radial-gradient(ellipse 70% 60% at 65% 85%, rgba(14, 116, 144, 0.30) 0%, transparent 65%),
      radial-gradient(ellipse 55% 45% at 25% 80%, rgba(45, 212, 191, 0.18) 0%, transparent 55%),
      linear-gradient(145deg, #021a24 0%, #052636 35%, #031c28 70%, #010d14 100%)
    `.trim(),
    orb1Class: 'bg-cyan-500/25',
    orb2Class: 'bg-teal-400/20',
    orb3Class: 'bg-sky-600/20',
    activeBtnClass: 'bg-cyan-500/20 border-cyan-400/80 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.35)]',
    activeBadgeClass: 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]',
    directiveGradient: 'from-cyan-500/20 via-[#072430]/70 to-[#03151f]/60 border-cyan-500/40 text-cyan-300',
    terminalScanlineColor: 'rgba(6, 182, 212, 0.08)',
  },
  hongyadong: {
    id: 'hongyadong',
    name: '洪崖洞',
    epochName: '农耕烟火纪元',
    altitude: '-5F (-30M)',
    accentColor: '#f59e0b', // Amber / Lantern Gold
    accentGlow: '0 0 35px rgba(245, 158, 11, 0.45)',
    reticleColor: 'rgba(245, 158, 11, 0.75)',
    hudBorderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundGradient: `
      radial-gradient(ellipse 75% 55% at 15% 15%, rgba(245, 158, 11, 0.35) 0%, transparent 60%),
      radial-gradient(ellipse 65% 50% at 85% 20%, rgba(234, 88, 12, 0.30) 0%, transparent 55%),
      radial-gradient(ellipse 70% 60% at 75% 85%, rgba(180, 83, 9, 0.28) 0%, transparent 65%),
      radial-gradient(ellipse 55% 45% at 25% 80%, rgba(251, 146, 60, 0.20) 0%, transparent 55%),
      linear-gradient(145deg, #201004 0%, #301807 35%, #221104 70%, #0e0702 100%)
    `.trim(),
    orb1Class: 'bg-amber-500/28',
    orb2Class: 'bg-orange-500/22',
    orb3Class: 'bg-yellow-600/18',
    activeBtnClass: 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.35)]',
    activeBadgeClass: 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]',
    directiveGradient: 'from-amber-500/20 via-[#2d1808]/70 to-[#170a02]/60 border-amber-500/40 text-amber-300',
    terminalScanlineColor: 'rgba(245, 158, 11, 0.08)',
  },
  chonggang: {
    id: 'chonggang',
    name: '重钢遗址',
    epochName: '工业变革纪元',
    altitude: '-18F (-120M)',
    accentColor: '#ef4444', // Crimson / Molten Steel
    accentGlow: '0 0 35px rgba(239, 68, 68, 0.45)',
    reticleColor: 'rgba(239, 68, 68, 0.8)',
    hudBorderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundGradient: `
      radial-gradient(ellipse 75% 55% at 15% 15%, rgba(239, 68, 68, 0.36) 0%, transparent 60%),
      radial-gradient(ellipse 65% 50% at 85% 20%, rgba(249, 115, 22, 0.28) 0%, transparent 55%),
      radial-gradient(ellipse 70% 60% at 75% 85%, rgba(185, 28, 28, 0.32) 0%, transparent 65%),
      radial-gradient(ellipse 55% 45% at 25% 80%, rgba(220, 38, 38, 0.22) 0%, transparent 55%),
      linear-gradient(145deg, #1d0505 0%, #2f0a0a 35%, #220707 70%, #0d0202 100%)
    `.trim(),
    orb1Class: 'bg-red-600/28',
    orb2Class: 'bg-orange-600/22',
    orb3Class: 'bg-rose-700/20',
    activeBtnClass: 'bg-red-500/20 border-red-400/80 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.35)]',
    activeBadgeClass: 'bg-red-500 text-slate-950 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
    directiveGradient: 'from-red-500/20 via-[#2d0909]/70 to-[#160303]/60 border-red-500/40 text-red-300',
    terminalScanlineColor: 'rgba(239, 68, 68, 0.08)',
  },
  jiefangbei: {
    id: 'jiefangbei',
    name: '解放碑',
    epochName: '溯源前哨站',
    altitude: '+1F (0M)',
    accentColor: '#10b981', // Jade Cyber / Digital Bamboo Emerald Green
    accentGlow: '0 0 35px rgba(16, 185, 129, 0.45)',
    reticleColor: 'rgba(16, 185, 129, 0.75)',
    hudBorderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundGradient: `
      radial-gradient(ellipse 75% 55% at 15% 15%, rgba(16, 185, 129, 0.32) 0%, transparent 60%),
      radial-gradient(ellipse 65% 50% at 85% 20%, rgba(5, 150, 105, 0.28) 0%, transparent 55%),
      radial-gradient(ellipse 70% 60% at 75% 85%, rgba(4, 120, 87, 0.30) 0%, transparent 65%),
      radial-gradient(ellipse 55% 45% at 25% 80%, rgba(52, 211, 153, 0.18) 0%, transparent 55%),
      linear-gradient(145deg, #031711 0%, #06261d 35%, #041d16 70%, #010d09 100%)
    `.trim(),
    orb1Class: 'bg-emerald-500/26',
    orb2Class: 'bg-teal-500/22',
    orb3Class: 'bg-emerald-600/18',
    activeBtnClass: 'bg-emerald-500/20 border-emerald-400/80 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.35)]',
    activeBadgeClass: 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    directiveGradient: 'from-emerald-500/20 via-[#06291e]/70 to-[#02140e]/60 border-emerald-500/40 text-emerald-300',
    terminalScanlineColor: 'rgba(16, 185, 129, 0.08)',
  },
};

export const DEFAULT_TERMINAL_THEME = TERMINAL_EPOCH_THEMES.jiefangbei;
