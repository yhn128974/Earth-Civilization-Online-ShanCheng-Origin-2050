import React from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import type { LocationId, MiniGameType } from '../types/game';
import {
  PorterBalanceGame,
  MonorailPilotGame,
  HotpotMasterGame,
  SteelForgingGame,
} from './minigames';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MiniGameErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MiniGame crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4 bg-slate-900/90 rounded-2xl border border-rose-500/50 my-auto">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto animate-pulse" />
          <h4 className="text-base font-bold text-rose-300">小游戏模块加载异常</h4>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
            {this.state.error?.message || '组件初始化遇到错误，请点击重试'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重新加载小游戏</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface MiniGameModalProps {
  initialGame: MiniGameType;
  unlockedLocations: LocationId[];
  isMuted: boolean;
  onClose: () => void;
  onReward: (result: {
    gameType?: MiniGameType;
    credits: number;
    energy: number;
    favorabilityNpcId?: string;
    favorabilityDelta?: number;
    itemId?: string;
    logMessage: string;
  }) => void;
  onRecordMistake?: (reason?: string) => void;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  initialGame,
  isMuted,
  onClose,
  onReward,
  onRecordMistake,
}) => {
  const selectedGame: MiniGameType = initialGame;

  const GAME_META = {
    porter_climb: {
      id: 'porter_climb' as const,
      name: '山城挑运 · 步道平衡挑战',
      location: '+1F 解放碑',
      npcName: '棒棒 88 号',
      icon: '🎋',
      tag: '重工节奏',
      themeBorder: 'border-amber-500/40',
      themeText: 'text-amber-300',
    },
    monorail_pilot: {
      id: 'monorail_pilot' as const,
      name: '穿楼单轨 · 时速调度模拟',
      location: '+8F 李子坝',
      npcName: 'AI 零号机',
      icon: '🚝',
      tag: '极速减震',
      themeBorder: 'border-cyan-500/40',
      themeText: 'text-cyan-300',
    },
    hotpot_master: {
      id: 'hotpot_master' as const,
      name: '九宫格火锅 · 捞烫大师',
      location: '-5F 洪崖洞',
      npcName: '盖碗姐',
      icon: '🍲',
      tag: '非遗美食',
      themeBorder: 'border-rose-500/40',
      themeText: 'text-rose-300',
    },
    steel_forging: {
      id: 'steel_forging' as const,
      name: '量子高炉 · 重工钢铁锻造',
      location: '-18F 重钢遗址',
      npcName: '钢铁之魂',
      icon: '⚙️',
      tag: '百年意志',
      themeBorder: 'border-orange-500/40',
      themeText: 'text-orange-300',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 select-none">
      <div className="relative w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden bg-[#070a13] border-2 border-amber-500/40 dialogue-scanline-bg">
        {/* Tactical Corner HUD Marks */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-400/80 pointer-events-none z-30" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-400/80 pointer-events-none z-30" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-400/80 pointer-events-none z-30" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-400/80 pointer-events-none z-30" />

        {/* Header Bar - Exclusive Chapter Easter Egg */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#090d18] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="text-xl sm:text-2xl shrink-0">{GAME_META[selectedGame].icon}</span>
            <div className="min-w-0">
              <h3 className="font-black text-slate-100 text-xs sm:text-base tracking-wide truncate">
                {GAME_META[selectedGame].name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                  {GAME_META[selectedGame].location} · 对话专属彩蛋
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                对话中触发的巴渝文化实操挑战！完成即可提升好感度并赢取丰厚奖励。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content with ErrorBoundary protection */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          <MiniGameErrorBoundary>
            {selectedGame === 'porter_climb' && (
              <PorterBalanceGame
                isMuted={isMuted}
                onRecordMistake={onRecordMistake}
                onSuccess={() => {
                  setTimeout(() => {
                    onReward({
                      gameType: 'porter_climb',
                      credits: 15,
                      energy: 20,
                      favorabilityNpcId: 'bangbang_88',
                      favorabilityDelta: 20,
                      itemId: 'pass_card',
                      logMessage: '🎋 成功通关【山城挑运·步道平衡挑战】！获得第一件信物【山城脊梁之竹·前哨共济信物】、+15积分、+20能量！',
                    });
                  }, 0);
                }}
              />
            )}

            {selectedGame === 'monorail_pilot' && (
              <MonorailPilotGame
                isMuted={isMuted}
                onRecordMistake={onRecordMistake}
                onSuccess={() => {
                  setTimeout(() => {
                    onReward({
                      gameType: 'monorail_pilot',
                      credits: 15,
                      energy: 20,
                      favorabilityNpcId: 'zero_machine',
                      favorabilityDelta: 25,
                      itemId: 'cyber_tea',
                      logMessage: '🚝 成功通关【穿楼单轨·极速调度驾驶】！获得第二件信物【大河渔猎之魂·险滩共济碎片】、+15积分、+20能量！',
                    });
                  }, 0);
                }}
              />
            )}

            {selectedGame === 'hotpot_master' && (
              <HotpotMasterGame
                isMuted={isMuted}
                onRecordMistake={onRecordMistake}
                onSuccess={() => {
                  setTimeout(() => {
                    onReward({
                      gameType: 'hotpot_master',
                      credits: 15,
                      energy: 30,
                      favorabilityNpcId: 'gaiwan_jie',
                      favorabilityDelta: 20,
                      itemId: 'chonggang_chip',
                      logMessage: '🍲 成功通关【赛博九宫格火锅·捞烫大师】！获得第三件信物【山崖农耕之火·烟火宝典碎片】、+15积分、+30能量，并赠予 1 份火锅底料！',
                    });
                  }, 0);
                }}
              />
            )}

            {selectedGame === 'steel_forging' && (
              <SteelForgingGame
                isMuted={isMuted}
                onRecordMistake={onRecordMistake}
                onSuccess={() => {
                  setTimeout(() => {
                    onReward({
                      gameType: 'steel_forging',
                      credits: 20,
                      energy: 20,
                      favorabilityNpcId: 'steel_soul',
                      favorabilityDelta: 25,
                      logMessage: '⚙️ 成功通关【量子高炉·重工钢铁锻造】！获得 +20 积分、+20 能量，重钢终极试炼正式解锁点火！',
                    });
                  }, 0);
                }}
              />
            )}
          </MiniGameErrorBoundary>
        </div>
      </div>
    </div>
  );
};
