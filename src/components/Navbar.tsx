import React from 'react';
import { Zap, Coins, Package, Settings, RefreshCw, Volume2, VolumeX, Sparkles, Gamepad2, Film, Bot } from 'lucide-react';
import type { GameState } from '../types/game';

interface NavbarProps {
  gameState: GameState;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenInventory: () => void;

  onOpenCinematic?: () => void;
  onOpenApiConfig?: () => void;
  onResetGame: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  gameState,
  isMuted,
  onToggleMute,
  onOpenInventory,

  onOpenCinematic,
  onOpenApiConfig,
  onResetGame,
}) => {
  const itemCount = gameState.inventory.reduce((acc, item) => acc + item.quantity, 0);
  const hasUsableItems = gameState.inventory.some((item) => item.quantity > 0);
  const isChonggangUnlocked = (gameState.unlockedLocations || []).includes('chonggang');
  const hasChonggangChip = !isChonggangUnlocked && gameState.inventory.some((item) => item.id === 'chonggang_chip' && item.quantity > 0);

  return (
    <header className="z-40 w-full bg-slate-950/60 backdrop-blur-2xl border-b border-white/[0.12] px-4 py-2.5 shadow-[0_4px_30px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.06)] select-none relative">
      {/* Top subtle rim specular light */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

      <div className="max-w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Game Title & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-950/30 to-black/40 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-base shadow-[0_0_15px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base text-slate-100 tracking-wider">
                地球文明 · 山城溯源
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded-full shadow-sm">
                2050
              </span>
            </div>
            <p className="text-[11px] text-slate-400/90 hidden md:flex items-center gap-1.5 font-light">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>神经终端已就绪 · 穿梭三大纪元</span>
            </p>
          </div>
        </div>

        {/* Game HUD Resource Bar - iOS Dynamic Island Pill Widget */}
        <div className="flex items-center gap-4 bg-black/45 backdrop-blur-2xl px-4 py-1.5 rounded-full border border-white/[0.14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(0,0,0,0.4)]">
          {/* Energy Gauge */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 hidden sm:inline">义体能量:</span>
            <div className="w-20 sm:w-24 bg-white/10 h-2 rounded-full overflow-hidden p-[1px] border border-white/10">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                style={{ width: `${Math.min(100, gameState.playerEnergy)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">{gameState.playerEnergy}/100</span>
          </div>

          <div className="h-3 w-px bg-white/15" />

          {/* Cyber Credits */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Coins className="w-3.5 h-3.5 text-amber-400/90" />
            <span className="text-slate-400 hidden sm:inline">积分:</span>
            <span className="text-xs font-mono font-bold text-slate-100">{gameState.cyberCredits}</span>
          </div>
        </div>

        {/* Game HUD Control Buttons - iOS Pill Group */}
        <div className="flex items-center gap-2">
          {/* Audio Toggle */}
          <button
            onClick={onToggleMute}
            className={`px-3.5 py-1.5 rounded-full border backdrop-blur-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ${
              isMuted
                ? 'bg-black/40 border-white/10 text-slate-500 hover:text-slate-400'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-slate-200'
            }`}
            title={isMuted ? '开启场景 BGM 与 NPC 语音' : '静音 BGM 与语音'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">静音</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400/90" />
                <span className="hidden sm:inline">音效开</span>
              </>
            )}
          </button>

          {/* Inventory Button */}
          <button
            onClick={onOpenInventory}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] ${
              hasChonggangChip
                ? 'bg-amber-500/25 border border-amber-400/70 text-amber-200 hover:bg-amber-500/35 animate-pulse shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                : hasUsableItems
                ? 'bg-white/[0.10] hover:bg-white/[0.16] border border-white/20 text-slate-200'
                : 'bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 border border-white/15'
            }`}
            title="查看包裹道具"
          >
            <Package className={`w-3.5 h-3.5 ${hasChonggangChip ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>包裹</span>

            {hasChonggangChip ? (
              <span className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-400">
                <Sparkles className="w-2.5 h-2.5" />
                🔓解封
              </span>
            ) : null}

            {itemCount > 0 && !hasChonggangChip && (
              <span className="w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          {/* Replay Cinematic Intro */}
          {onOpenCinematic && (
            <button
              onClick={onOpenCinematic}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-amber-300 hover:text-amber-200 border border-amber-500/35 text-xs font-semibold backdrop-blur-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              title="重温开场序幕动画"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">序幕</span>
            </button>
          )}

          {/* AI Model & API Key Configuration - Domestic & Foreign Models */}
          {onOpenApiConfig && (
            <button
              onClick={onOpenApiConfig}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/70 to-blue-950/70 hover:from-cyan-900/80 hover:to-blue-900/80 text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 text-xs font-semibold backdrop-blur-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_0_18px_rgba(6,182,212,0.4)]"
              title="配置 AI 大模型与 API Key（支持国内 DeepSeek / 阿里通义千问 与国外 Gemini / OpenAI）"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline text-slate-300 font-normal">模型:</span>
              <span className="font-bold text-cyan-200">
                {gameState.apiProvider === 'deepseek'
                  ? 'DeepSeek'
                  : gameState.apiProvider === 'qwen'
                  ? '通义千问'
                  : gameState.apiProvider === 'openai'
                  ? 'OpenAI'
                  : gameState.apiProvider === 'gemini'
                  ? 'Gemini'
                  : '内置引擎'}
              </span>
            </button>
          )}

          {/* Reset Game */}
          <button
            onClick={onResetGame}
            className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-slate-400 hover:text-slate-200 border border-white/15 backdrop-blur-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
            title="重置关卡"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
});
