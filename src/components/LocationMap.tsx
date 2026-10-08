import React, { useMemo, useEffect } from 'react';
import type { Location, NPC, GameState } from '../types/game';
import { Lock, AlertCircle, Compass, ShieldCheck, Flame, Layers } from 'lucide-react';
import { TERMINAL_EPOCH_THEMES } from '../constants/themeConfig';

const CLEARANCE_ORDER_MAP: Record<string, number> = {
  jiefangbei: 1, // 解放碑 (地表原点 0M)
  liziba: 2,      // 李子坝 (高空云端 +300M)
  hongyadong: 3,  // 洪崖洞 (悬崖黑市 -30M)
  chonggang: 4,   // 重钢遗址 (量子深渊 -120M)
};



interface LocationMapProps {
  locations: Location[];
  currentLocationId: string;
  npcs: NPC[];
  gameState: GameState;
  onSelectLocation: (locationId: string) => void;
  onTalkToNpc: (npcId: string) => void;

  hideHeader?: boolean;
  isChonggangFlashing?: boolean;
}

export const LocationMap: React.FC<LocationMapProps> = React.memo(({
  locations,
  currentLocationId,
  npcs,
  gameState,
  onSelectLocation,
  onTalkToNpc,

  hideHeader = false,
  isChonggangFlashing = false,
}) => {
  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => (CLEARANCE_ORDER_MAP[a.id] || 0) - (CLEARANCE_ORDER_MAP[b.id] || 0)),
    [locations]
  );

  useEffect(() => {
    if (isChonggangFlashing) {
      const el = document.getElementById('location-card-chonggang');
      const container = document.getElementById('tactical-locations-scroll-container');
      if (el && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetScrollTop =
          container.scrollTop +
          (elRect.top - containerRect.top) -
          container.clientHeight / 2 +
          el.clientHeight / 2;
        container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      }
      // Guarantee window, body, and viewport frames remain strictly anchored at top 0
      window.scrollTo(0, 0);
      const mainEl = document.querySelector('main');
      if (mainEl && mainEl.scrollTop > 0) mainEl.scrollTop = 0;
      const rootEl = document.querySelector('.game-viewport-frame');
      if (rootEl && rootEl.scrollTop > 0) rootEl.scrollTop = 0;
    }
  }, [isChonggangFlashing]);

  return (
    <div className="w-full space-y-6">
      {/* Optional Header Bar */}
      {!hideHeader && (
        <div className="bg-gradient-to-r from-[#0d162a]/65 via-[#111e38]/70 to-[#161a2e]/65 backdrop-blur-xl rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-amber-400/90 shadow-sm">
              <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '16s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-extrabold text-slate-100 text-base sm:text-lg tracking-wide flex items-center gap-2">
                  <span>三大文明纪元 · 3D 纵深溯源星图</span>
                  <Layers className="w-4 h-4 text-amber-400/80" />
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold chinese-seal-gold rounded-md">
                  文明垂直落差 420M
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed font-light">
                穿梭渔猎、农耕与工业三大历史文明，收集宝典碎片，唤醒迷失智能实体。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>解锁进度: {gameState.unlockedLocations.length} / 4 关卡</span>
            </span>
          </div>
        </div>
      )}

      {/* 3D Spatial Perspective Stage Wrapper */}
      <div className="perspective-stage-wrapper">
        {/* Spatial Perspective Tower Container with Translucent Ambient Glass */}
        <div className="relative py-4 pl-7 pr-3 sm:py-6 sm:pl-14 sm:pr-5 rounded-3xl bg-gradient-to-b from-[#0e172a]/20 via-[#0a1020]/25 to-[#060a14]/35 backdrop-blur-sm border border-white/10 shadow-[0_12px_45px_rgba(0,0,0,0.35)] spatial-perspective-container w-full">
          {/* Subtle Architectural Spatial Axis Line */}
          <div className="elevation-axis-line" />

          <div className="relative z-10 flex flex-col gap-5 sm:gap-6 w-full">
          {sortedLocations.map((loc) => {
            const isSelected = loc.id === currentLocationId;
            const isUnlocked = loc.unlocked;
            const locNpcs = npcs.filter((n) => n.locationId === loc.id);

            const hasChonggangChipInInventory = (gameState.inventory || []).some(
              (i) => i.id === 'chonggang_chip' && i.quantity > 0
            );

            const cleanCulturalInfo = loc.culturalInfo.replace(/^【风貌特色】\s*/, '');

            const depthClass =
              loc.id === 'liziba'
                ? 'spatial-card-liziba'
                : loc.id === 'jiefangbei'
                ? 'spatial-card-jiefangbei'
                : loc.id === 'hongyadong'
                ? 'spatial-card-hongyadong'
                : 'spatial-card-chonggang';

            const isChonggang = loc.id === 'chonggang';
            const isFlashing = isChonggang && isChonggangFlashing;

            const locTheme = TERMINAL_EPOCH_THEMES[loc.id] || TERMINAL_EPOCH_THEMES.jiefangbei;

            return (
              <div
                key={loc.id}
                id={`location-card-${loc.id}`}
                onClick={() => onSelectLocation(loc.id)}
                style={
                  isSelected
                    ? {
                        borderColor: locTheme.accentColor,
                        boxShadow: `${locTheme.accentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.25)`,
                      }
                    : undefined
                }
                className={`group relative rounded-2xl transition-all duration-500 overflow-hidden cursor-pointer spatial-card-3d spatial-card-hover ${depthClass} ${
                  isSelected ? 'spatial-card-selected' : ''
                } ${
                  isSelected
                    ? 'bg-gradient-to-br from-white/[0.12] via-slate-900/35 to-slate-950/55 border'
                    : 'bg-gradient-to-br from-white/[0.06] via-slate-900/25 to-slate-950/45 border border-white/15 hover:border-white/30 hover:bg-slate-900/35'
                } ${isFlashing ? 'chonggang-unseal-flashing' : ''}`}
              >
                {/* Atmospheric Scene Ambient Backdrop & Glass Glow */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-2xl">
                  <img
                    src={loc.image}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover filter blur-3xl opacity-35 scale-125 saturate-150"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-950/25 to-slate-950/60" />
                  {/* Epoch Theme Radiant Flare */}
                  <div
                    className="absolute -top-16 -right-16 w-64 h-64 rounded-full filter blur-3xl opacity-25"
                    style={{ backgroundColor: locTheme.accentColor }}
                  />
                </div>

                {/* Glass Specular Top Highlight & Ambient Sheen */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none z-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-transparent pointer-events-none z-10" />

                {/* Chonggang Unseal Background Light Halo Layer (2 seconds, 4 flashes) */}
                <div
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-200 z-0 ${
                    isFlashing ? 'chonggang-bg-light-flashing' : 'opacity-0'
                  }`}
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 50%, rgba(249, 115, 22, 0.55) 0%, rgba(234, 88, 12, 0.35) 45%, transparent 80%)',
                  }}
                />

                <div className="flex flex-col md:flex-row items-stretch min-h-[210px] relative z-10">
                  {/* Left Scene Image Container */}
                  <div className="relative w-full md:w-2/5 min-h-[175px] overflow-hidden">
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                        !isUnlocked ? 'filter grayscale brightness-50 contrast-125' : ''
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-slate-950/20 to-slate-950/65" />

                    {/* Level Altitude Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-mono font-bold bg-black/50 backdrop-blur-md text-amber-300 rounded-lg border border-amber-500/40">
                        {loc.level}
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                        {loc.id === 'liziba'
                          ? '大河渔猎文明 (+300M)'
                          : loc.id === 'jiefangbei'
                          ? '溯源前哨原点 (0M)'
                          : loc.id === 'hongyadong'
                          ? '农耕民俗文明 (-30M)'
                          : '工业变革文明 (-120M)'}
                      </span>
                    </div>

                    {/* Active Selected Location Highlight Badge */}
                    {isSelected && (
                      <div
                        style={{
                          backgroundColor: locTheme.accentColor,
                          boxShadow: locTheme.accentGlow,
                        }}
                        className="absolute bottom-3 left-3 text-slate-950 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all duration-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                        <span>当前驻留</span>
                      </div>
                    )}
                  </div>

                  {/* Right Scene Info Panel */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <h3
                            style={isSelected ? { color: locTheme.accentColor } : undefined}
                            className={`text-base sm:text-lg font-bold transition-colors ${
                              isSelected ? '' : 'text-slate-100 group-hover:text-amber-300'
                            }`}
                          >
                            {loc.name}
                          </h3>
                        </div>

                        {!isUnlocked ? (
                          <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-950/50 px-2.5 py-1 rounded-md border border-rose-800">
                            <Lock className="w-3.5 h-3.5" />
                            <span>未解锁</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>探明</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-light mb-2">
                        {loc.description}
                      </p>

                      {/* Cultural Background Box */}
                      <div className="p-2.5 sm:p-3 bg-white/[0.07] hover:bg-white/[0.10] backdrop-blur-xl rounded-2xl border border-white/20 text-xs text-slate-200 leading-relaxed font-light flex items-start gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_16px_rgba(0,0,0,0.25)] transition-all">
                        <span className="text-amber-400 font-bold text-sm shrink-0 leading-none mt-0.5">✦</span>
                        <span className="text-slate-200/90 leading-relaxed">{cleanCulturalInfo}</span>
                      </div>
                    </div>

                    {/* NPC Interaction Entry */}
                    <div className="pt-2.5 border-t border-white/10">
                      {isUnlocked ? (
                        <div>
                          <div className="text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                            <span className="font-mono text-slate-300 flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                              <span>驻留智能体</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 w-full">
                            {locNpcs.map((npc) => {
                              const fav = gameState.npcFavorability[npc.id] ?? npc.favorability;
                              const displayTitle = gameState.isHackingOverridden?.[npc.id]
                                  ? npc.title.replace('处于逻辑迷失态', '逻辑纠偏完成 · 正常运转')
                                  : npc.title;

                              return (
                                <div
                                  key={npc.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTalkToNpc(npc.id);
                                  }}
                                  className="relative overflow-hidden w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-gradient-to-r from-white/[0.15] via-white/[0.06] to-white/[0.12] hover:from-white/[0.20] hover:via-white/[0.10] hover:to-white/[0.16] backdrop-blur-2xl p-2.5 sm:p-3 rounded-2xl border border-white/25 hover:border-white/45 transition-all duration-200 active:scale-[0.99] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_28px_rgba(0,0,0,0.45)] group/npc"
                                >
                                  {/* Glass Specular Top Highlight */}
                                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/20 via-white/60 to-white/20 pointer-events-none z-10" />

                                  {/* Ambient Soft Glow underneath */}
                                  <div
                                    className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full filter blur-2xl opacity-20 pointer-events-none"
                                    style={{ backgroundColor: locTheme.accentColor }}
                                  />

                                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto sm:flex-1 relative z-10">
                                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shrink-0 border border-white/25 group-hover/npc:border-amber-400 group-hover/npc:shadow-[0_0_14px_rgba(251,191,36,0.5)] shadow-md transition-all duration-300 bg-black/30 backdrop-blur-md">
                                      <img
                                        src={npc.avatar}
                                        alt={npc.name}
                                        className="w-full h-full object-cover group-hover/npc:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        <span className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-amber-300 whitespace-nowrap">
                                          {npc.name}
                                        </span>
                                        <span className="text-[10px] sm:text-[11px] text-rose-300 flex items-center gap-1 font-mono whitespace-nowrap shrink-0 bg-rose-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-rose-500/35 shadow-inner">
                                          ❤️ <span>{fav}/100</span>
                                        </span>
                                        {gameState.isHackingOverridden?.[npc.id] ? (
                                          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-500/50 whitespace-nowrap shrink-0 shadow-sm flex items-center gap-1">
                                            <span>🛡️</span>
                                            <span>迷失解除</span>
                                          </span>
                                        ) : fav >= 100 ? (
                                          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/50 whitespace-nowrap shrink-0">
                                            ✨ 已唤醒
                                          </span>
                                        ) : null}
                                      </div>
                                      <p
                                        className="text-[11px] text-amber-300/80 truncate mt-0.5 font-light tracking-wide"
                                        title={displayTitle}
                                      >
                                        {displayTitle}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 text-xs px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-full whitespace-nowrap shadow-[0_2px_14px_rgba(245,158,11,0.35)] active:scale-95 transition-all relative z-10">
                                    <span>开启对话</span>
                                    <span className="text-[10px] font-normal opacity-85">(-10⚡)</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>


                        </div>
                      ) : (
                        <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 space-y-1">
                          <div className="flex items-center gap-2 font-semibold text-amber-300">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span>-18F 重钢深渊处于封印状态</span>
                          </div>
                          <p className="text-[11px] opacity-80 leading-relaxed font-light pl-6">
                            提示：请先前往 -5F 洪崖洞与盖碗姐互动提升好感度至 100/100 获得【山崖农耕之火·烟火宝典碎片】！
                          </p>
                          {hasChonggangChipInInventory && (
                            <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center gap-2 animate-pulse">
                              <span className="text-base">🎒</span>
                              <span>
                                <strong className="text-amber-300">碎片已就绪！</strong>请打开右上角【包裹】，在行囊中使用【山崖农耕之火·烟火宝典碎片】解封！
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
});

