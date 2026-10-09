import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { bgmManager, speakNpcMessage } from '../../utils/audio';

interface HotpotIngredient {
  id: string;
  name: string;
  icon: string;
  optimalZone: 'center' | 'cross' | 'corner';
  cookTimeSec: number;
  crispWindowSec: number;
}

const HOTPOT_MENU: HotpotIngredient[] = [
  { id: 'tripe', name: '大刀屠场鲜毛肚', icon: '🥩', optimalZone: 'center', cookTimeSec: 6.0, crispWindowSec: 1.6 },
  { id: 'duck_intestine', name: '极品生抠鲜鸭肠', icon: '🥢', optimalZone: 'center', cookTimeSec: 5.0, crispWindowSec: 1.4 },
  { id: 'beef', name: '赛博秘制嫩牛肉', icon: '🥓', optimalZone: 'cross', cookTimeSec: 9.0, crispWindowSec: 2.2 },
  { id: 'meatball', name: '手打贡菜鲜肉丸', icon: '🧆', optimalZone: 'cross', cookTimeSec: 11.0, crispWindowSec: 2.5 },
  { id: 'tofu', name: '井水老南豆腐', icon: '🧊', optimalZone: 'corner', cookTimeSec: 14.0, crispWindowSec: 3.0 },
  { id: 'lotus', name: '高山脆甜鲜藕片', icon: '🏵️', optimalZone: 'corner', cookTimeSec: 12.0, crispWindowSec: 2.6 },
];

interface CookingSlot {
  ingredient: HotpotIngredient | null;
  startTime: number;
}

interface HotpotGameProps {
  onSuccess: () => void;
  isMuted: boolean;
  onRecordMistake?: (reason?: string) => void;
}

export const HotpotMasterGame: React.FC<HotpotGameProps> = ({ onSuccess, isMuted, onRecordMistake }) => {
  const [score, setScore] = useState(0); // target 800
  const [potHealth, setPotHealth] = useState(100); // 100% soup purity, 0% = fail
  const [selectedIngredient, setSelectedIngredient] = useState<HotpotIngredient | null>(HOTPOT_MENU[0]);
  const [slots, setSlots] = useState<CookingSlot[]>(
    Array.from({ length: 9 }, () => ({ ingredient: null, startTime: 0 }))
  );
  const [currentOrder, setCurrentOrder] = useState<HotpotIngredient>(HOTPOT_MENU[0]);
  const [orderTimer, setOrderTimer] = useState(25);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState('请看上方盖碗姐点单，将食材放入合适火候格，绿色提示时点击捞出！');
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const currentOrderRef = useRef(currentOrder);
  currentOrderRef.current = currentOrder;

  const handleStartGame = () => {
    setIsPlaying(true);
    setScore(0);
    setPotHealth(100);
    setSlots(Array.from({ length: 9 }, () => ({ ingredient: null, startTime: 0 })));
    setFeedback('火候已开！请看上方盖碗姐点单，将食材放入对应火候格！');
    speakNpcMessage(
      'gaiwan_jie',
      '起火开烫咯！毛肚鸭肠七上八下，看准上方点单，手脚麻利点撒！',
      isMuted
    );
  };

  const handleVictory = () => {
    setIsVictory(true);
    setIsPlaying(false);
    speakNpcMessage(
      'gaiwan_jie',
      '巴适得板！毛肚七上八下脆生生，牛油翻滚热气腾腾！这才是咱们山城刻在骨子里的人间烟火气！来，这包秘制火锅底料你拿去！',
      isMuted
    );
    onSuccess();
  };

  const getSlotType = (index: number): 'center' | 'cross' | 'corner' => {
    if (index === 4) return 'center';
    if ([1, 3, 5, 7].includes(index)) return 'cross';
    return 'corner';
  };

  // Tick clock to update durations, progress bars, and check burnt items
  useEffect(() => {
    if (!isPlaying || isVictory || isGameOver) return;

    let lastOrderTick = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();

      // Check for burnt items that stay way too long in pot (> 2.2x cook time)
      setSlots((prevSlots) => {
        let healthDeduction = 0;
        let burntName = '';
        const updated = prevSlots.map((slot) => {
          if (slot.ingredient) {
            const elapsed = (now - slot.startTime) / 1000;
            if (elapsed > slot.ingredient.cookTimeSec * 2.2) {
              healthDeduction += 3;
              burntName = slot.ingredient.name;
              return { ingredient: null, startTime: 0 };
            }
          }
          return slot;
        });

        if (healthDeduction > 0) {
          if (!isMuted) bgmManager.playSfx('hit');
          setFeedback(`⚠️ 提醒：【${burntName}】煮化沉底了！底料纯度 -3%！`);
          onRecordMistake?.('hotpot_ingredient_burned');
          setPotHealth((h) => {
            const nextH = Math.max(0, h - healthDeduction);
            if (nextH <= 0) {
              setTimeout(() => {
                setIsGameOver(true);
                onRecordMistake?.('hotpot_pot_ruined');
              }, 0);
            }
            return nextH;
          });
        }

        return updated;
      });

      // Update Order Countdown every 1000ms
      if (now - lastOrderTick >= 1000) {
        lastOrderTick = now;
        setOrderTimer((t) => {
          if (t <= 1) {
            const randomIdx = Math.floor(Math.random() * HOTPOT_MENU.length);
            const nextOrder = HOTPOT_MENU[randomIdx];
            setCurrentOrder(nextOrder);
            currentOrderRef.current = nextOrder;
            return 25;
          }
          return t - 1;
        });
      }
    }, 200);

    return () => clearInterval(timer);
  }, [isPlaying, isVictory, isGameOver, isMuted, onSuccess, onRecordMistake]);

  const handleSlotClick = (index: number) => {
    if (!isPlaying || isVictory || isGameOver) return;
    const current = slots[index];
    const now = Date.now();

    // If empty slot and ingredient selected -> Drop into pot!
    if (!current.ingredient && selectedIngredient) {
      if (!isMuted) bgmManager.playSfx('steam');
      const updated = [...slots];
      updated[index] = { ingredient: selectedIngredient, startTime: now };
      setSlots(updated);

      const slotType = getSlotType(index);
      if (slotType !== selectedIngredient.optimalZone) {
        setFeedback(`💡 提示：【${selectedIngredient.name}】放偏了火候格，稍加注意熟成时间！`);
      } else {
        setFeedback(`已将【${selectedIngredient.name}】放入正确格中，静待绿色提示捞起！`);
      }
      return;
    }

    // If cooking -> Dip out!
    if (current.ingredient) {
      const elapsedSec = (now - current.startTime) / 1000;
      const targetSec = current.ingredient.cookTimeSec;
      const diff = Math.abs(elapsedSec - targetSec);

      // Check if crispy hit
      if (diff <= current.ingredient.crispWindowSec) {
        if (!isMuted) bgmManager.playSfx('success');
        const isMatchedOrder = current.ingredient.id === currentOrderRef.current.id;
        const gain = isMatchedOrder ? 100 : 60;

        setScore((s) => {
          const nextScore = s + gain;
          if (nextScore >= 800) {
            handleVictory();
          }
          return nextScore;
        });

        setPotHealth((h) => Math.min(100, h + 5));
        setFeedback(
          isMatchedOrder
            ? `🎉 盖碗姐绝赞！完美匹配点单【${current.ingredient.name}】！火候七上八下恰到好处！(+${gain}分)`
            : `🎉 鲜嫩爽脆！【${current.ingredient.name}】火候极佳！(+${gain}分)`
        );
      } else if (diff <= current.ingredient.crispWindowSec * 1.8) {
        // Tolerable
        if (!isMuted) bgmManager.playSfx('bip');
        setScore((s) => {
          const nextScore = s + 25;
          if (nextScore >= 800) {
            handleVictory();
          }
          return nextScore;
        });
        setFeedback(`👍 火候还不错！再精准一点就是极品爽脆 (+25分)`);
      } else if (elapsedSec < targetSec - current.ingredient.crispWindowSec * 1.8) {
        // Undercooked
        if (!isMuted) bgmManager.playSfx('hit');
        setPotHealth((h) => {
          const nextH = Math.max(0, h - 5);
          if (nextH <= 0) setTimeout(() => setIsGameOver(true), 0);
          return nextH;
        });
        setFeedback(`⚠️ 捞早了，稍显夹生！底料纯度 -5%！`);
      } else {
        // Overcooked
        if (!isMuted) bgmManager.playSfx('hit');
        setPotHealth((h) => {
          const nextH = Math.max(0, h - 5);
          if (nextH <= 0) setTimeout(() => setIsGameOver(true), 0);
          return nextH;
        });
        setFeedback(`⚠️ 煮得稍久了点，略微老了！底料纯度 -5%！`);
      }

      // Empty slot
      const updated = [...slots];
      updated[index] = { ingredient: null, startTime: 0 };
      setSlots(updated);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Intro Bar */}
      <div className="p-2.5 sm:p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[11px] sm:text-xs font-bold text-rose-300 flex items-center gap-1.5 truncate">
            <span>🍲 非遗火锅秘诀：中心猛火烫毛肚鸭肠；十字中火煮肉；四角微火煨豆腐！</span>
          </h4>
          <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5 font-light">
            优先完成上方盖碗姐点单！当格子呈绿色闪烁时点击捞出！积满 800 分即刻通关！
          </p>
        </div>
        <div className="text-right font-mono shrink-0">
          <span className="text-[10px] sm:text-[11px] text-slate-400 block">火锅积分</span>
          <div className="text-sm sm:text-base font-bold text-rose-400">{score} / 800</div>
        </div>
      </div>

      {/* Top Customer Order Card */}
      <div className="p-2.5 sm:p-3 bg-[#17080f] rounded-2xl border-2 border-rose-500/50 flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{currentOrder.icon}</span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5 flex-wrap">
              <span className="truncate">急催加菜：【{currentOrder.name}】</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-rose-900/80 rounded border border-rose-400 font-mono text-rose-100 whitespace-nowrap">
                宜放：{currentOrder.optimalZone === 'center' ? '中心猛火' : currentOrder.optimalZone === 'cross' ? '十字中火' : '四角微火'}
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5 truncate">
              最佳时间: 约 {currentOrder.cookTimeSec} 秒 (绿色窗口极脆) | 点单赏格 +100 分
            </div>
          </div>
        </div>
        <div className="text-right font-mono shrink-0">
          <span className="text-[9px] sm:text-[10px] text-slate-400 block">点单倒计时</span>
          <div className="text-xs sm:text-sm font-bold text-amber-400">{orderTimer}s</div>
        </div>
      </div>

      {/* Main Hotpot Arena */}
      <div className="relative bg-[#0d070a] border-2 border-rose-500/40 rounded-2xl p-3 sm:p-5 overflow-hidden shadow-inner flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 min-h-[300px]">
        {/* Ingredient Shelf */}
        <div className="w-full md:w-48 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 font-bold">
            <span>🥢 点击选取下锅食材：</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-1 gap-1.5">
            {HOTPOT_MENU.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedIngredient(item)}
                className={`p-1.5 sm:p-2 rounded-xl text-left border flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  selectedIngredient?.id === item.id
                    ? 'bg-rose-900/70 border-rose-400 text-rose-100 shadow-md ring-1 ring-rose-400'
                    : 'bg-[#150a0f] border-rose-950 text-slate-300 hover:border-rose-700'
                }`}
              >
                <span className="text-sm sm:text-base shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold truncate">{item.name}</div>
                  <div className="text-[8px] sm:text-[9px] text-amber-300/80 font-mono truncate">
                    {item.optimalZone === 'center' ? '宜放: 中心猛火' : item.optimalZone === 'cross' ? '宜放: 十字中火' : '宜放: 四角微火'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pot Flavor Health Bar */}
          <div className="pt-1 sm:pt-2">
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-slate-400">底料纯度</span>
              <span className={potHealth > 40 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold animate-pulse'}>
                {potHealth}%
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  potHealth > 50 ? 'bg-rose-500' : 'bg-rose-600 animate-pulse'
                }`}
                style={{ width: `${potHealth}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3x3 Nine-Palace Boiling Hotpot Grid */}
        <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square bg-gradient-to-br from-rose-950/80 via-[#26050e] to-[#120306] rounded-3xl p-2.5 sm:p-3 border-4 border-amber-600/70 shadow-[0_0_50px_rgba(225,29,72,0.3)] grid grid-cols-3 gap-2 sm:gap-2.5 mx-auto shrink-0">
          {slots.map((slot, idx) => {
            const zoneType = getSlotType(idx);
            const now = Date.now();
            const elapsed = slot.ingredient ? (now - slot.startTime) / 1000 : 0;
            const target = slot.ingredient ? slot.ingredient.cookTimeSec : 8;
            const progress = slot.ingredient ? Math.min(100, (elapsed / (target * 1.4)) * 100) : 0;

            const isCrispy = slot.ingredient ? Math.abs(elapsed - target) <= slot.ingredient.crispWindowSec : false;
            const isBurnt = slot.ingredient ? elapsed > target + slot.ingredient.crispWindowSec * 1.5 : false;

            return (
              <div
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className={`relative rounded-2xl flex flex-col items-center justify-center p-1.5 transition-transform duration-100 cursor-pointer overflow-hidden border shadow-inner ${
                  isCrispy
                    ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] scale-105'
                    : zoneType === 'center'
                    ? 'bg-rose-900/40 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : zoneType === 'cross'
                    ? 'bg-amber-900/30 border-amber-500/60'
                    : 'bg-orange-950/20 border-orange-700/40'
                } hover:scale-105 active:scale-95`}
              >
                {/* Boiling Bubbles Accent */}
                <span className="absolute top-1 right-1.5 text-[8px] opacity-60 font-mono">
                  {zoneType === 'center' ? '🔥猛火' : zoneType === 'cross' ? '♨️中火' : '🍵微火'}
                </span>

                {slot.ingredient ? (
                  <div className="text-center w-full space-y-1">
                    <span className={`text-xl sm:text-2xl ${isCrispy ? 'animate-bounce' : ''}`}>{slot.ingredient.icon}</span>
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-100 truncate px-0.5">
                      {slot.ingredient.name.slice(0, 4)}
                    </div>
                    {/* Cooking progress bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className={`h-full transition-all duration-150 ${
                          isBurnt ? 'bg-slate-600' : isCrispy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className={`text-[8px] sm:text-[9px] font-bold block ${
                      isBurnt ? 'text-slate-400' : isCrispy ? 'text-emerald-300 animate-pulse font-mono' : 'text-amber-300 font-mono'
                    }`}>
                      {isBurnt ? '煮老了' : isCrispy ? '🥢 快捞出!' : `${elapsed.toFixed(1)}s`}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono text-center leading-tight">
                    点击<br />下锅
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Victory Screen */}
        {isVictory && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <Trophy className="w-14 h-14 text-rose-400 animate-bounce" />
            <h3 className="text-base sm:text-lg font-bold text-rose-300 text-center">🎉 火锅大师达成！盖碗姐赞不绝口！</h3>
            <p className="text-xs text-slate-200 text-center max-w-md">
              九宫格火候与七上八下秘诀被你彻底参透，市井人间烟火的沸腾温度已被你牢牢唤醒！
            </p>
            <div className="text-[11px] sm:text-xs font-mono text-emerald-400 font-bold text-center">
              获得奖励：🪙 +15 赛博积分 | ⚡ +30 义体能量 | ❤️ 盖碗姐好感度 +20 | 🎁 颁发【山崖农耕之火·烟火宝典碎片】与火锅底料！
            </div>
            <button
              onClick={handleStartGame}
              className="px-6 py-2.5 rounded-xl bg-rose-500 text-slate-950 font-bold text-xs hover:bg-rose-400 cursor-pointer shadow-lg"
            >
              再烫一锅
            </button>
          </div>
        )}

        {/* GameOver Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <AlertTriangle className="w-14 h-14 text-rose-500 animate-pulse" />
            <h3 className="text-base sm:text-lg font-bold text-rose-400 text-center">锅底风味受损！稍作调整！</h3>
            <p className="text-xs text-slate-300 text-center max-w-md">
              火锅讲究的是起落有序，绿色高亮即是爽脆黄金时机。积满 800 分即可通关！
            </p>
            <button
              onClick={handleStartGame}
              className="px-6 py-2.5 rounded-xl bg-rose-500 text-slate-950 font-bold text-xs hover:bg-rose-400 cursor-pointer shadow-md"
            >
              换一锅底料 · 再次掌勺
            </button>
          </div>
        )}
      </div>

      {/* Start Button or Chef Banner */}
      {!isPlaying && !isVictory && !isGameOver ? (
        <button
          onClick={handleStartGame}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs sm:text-sm rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>开启九宫格掌勺实操挑战</span>
        </button>
      ) : (
        <div className="p-2 sm:p-2.5 bg-[#12080c] rounded-xl border border-rose-950 text-[11px] sm:text-xs font-mono text-rose-300 text-center min-h-[36px] flex items-center justify-center">
          {feedback}
        </div>
      )}
    </div>
  );
};
