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
    <header className="z-40 w-full bg-gradient-to-r from-[#070b16]/75 via-[#0c1429]/80 to-[#070b16]/75 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] select-none">
      <div className="max-w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Game Title & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-950/40 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-base shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base text-slate-100 tracking-wider">
                地球文明 · 山城溯源
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded-md shadow-sm">
                2050
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:flex items-center gap-1.5 font-light">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>神经终端已就绪 · 穿梭三大纪元</span>
            </p>
          </div>
        </div>

        {/* Game HUD Resource Bar */}
        <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 shadow-inner">
          {/* Energy Gauge */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 hidden sm:inline">义体能量:</span>
            <div className="w-20 sm:w-24 bg-black/50 h-2 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, gameState.playerEnergy)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">{gameState.playerEnergy}/100</span>
          </div>

          <div className="h-3 w-[1px] bg-slate-800" />

          {/* Cyber Credits */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Coins className="w-3.5 h-3.5 text-amber-400/90" />
            <span className="text-slate-400 hidden sm:inline">积分:</span>
            <span className="text-xs font-mono font-bold text-slate-100">{gameState.cyberCredits}</span>
          </div>
        </div>

        {/* Game HUD Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Audio Toggle */}
          <button
            onClick={onToggleMute}
            className={`px-3 py-1.5 rounded-lg border backdrop-blur-md transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              isMuted
                ? 'bg-black/40 border-white/5 text-slate-500'
                : 'bg-slate-900/50 hover:bg-slate-800/70 border-white/10 text-slate-200'
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
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition-all cursor-pointer ${
              hasChonggangChip
                ? 'bg-amber-500/25 border border-amber-400/70 text-amber-200 hover:bg-amber-500/35 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                : hasUsableItems
                ? 'bg-slate-800/70 border border-white/15 text-slate-200 hover:bg-slate-700/70'
                : 'bg-slate-900/50 hover:bg-slate-800/70 text-slate-300 border border-white/10'
            }`}
            title="查看包裹道具"
          >
            <Package className={`w-3.5 h-3.5 ${hasChonggangChip ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>包裹</span>

            {hasChonggangChip ? (
              <span className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded border border-amber-400">
                <Sparkles className="w-2.5 h-2.5" />
                🔓解封
              </span>
            ) : null}

            {itemCount > 0 && !hasChonggangChip && (
              <span className="w-4 h-4 bg-amber-600 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          {/* Replay Cinematic Intro */}
          {onOpenCinematic && (
            <button
              onClick={onOpenCinematic}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-800/70 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer shadow-sm"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/90 hover:to-blue-900/90 text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:shadow-[0_0_16px_rgba(6,182,212,0.4)]"
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
            className="p-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-800/70 text-slate-400 hover:text-slate-200 border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
            title="重置关卡"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
});
