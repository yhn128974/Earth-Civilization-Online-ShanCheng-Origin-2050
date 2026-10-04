import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Trophy,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { bgmManager } from '../../utils/audio';
interface PorterGameProps {
  onSuccess: () => void;
  isMuted: boolean;
  onRecordMistake?: (reason?: string) => void;
}

export const PorterBalanceGame: React.FC<PorterGameProps> = ({ onSuccess, isMuted, onRecordMistake }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [distance, setDistance] = useState(0); // 0 to 80 meters
  const [balance, setBalance] = useState(0); // -50 to +50. Safe zone: -12 to +12
  const [stamina, setStamina] = useState(100);
  const [streak, setStreak] = useState(0);
  const [stepLeg, setStepLeg] = useState<'left' | 'right'>('left');
  const [stepsCount, setStepsCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<string>(
    '深吸一口气，观察重心偏角，按 [A / D] 调节扁担，按 [空格 / 蹬阶] 稳步攀登！'
  );

  const balanceRef = useRef(0);
  balanceRef.current = balance;
  const distanceRef = useRef(0);
  distanceRef.current = distance;
  const lastStepTimeRef = useRef<number>(0);

  // Real-time Physics & Mountain Wind Wobble Loop (80ms interval)
  useEffect(() => {
    if (!isPlaying || isGameOver || isVictory) return;

    const interval = window.setInterval(() => {
      const current = balanceRef.current;
      const currentDist = distanceRef.current;

      // 1. Angular Gravity Acceleration:
      // When the heavy load tilts beyond ±8°, gravity steadily accelerates the fall towards the low side
      let gravityTorque = 0;
      if (Math.abs(current) > 8) {
        gravityTorque = Math.sign(current) * Math.pow((Math.abs(current) - 8) / 9, 1.25) * 0.35;
      }

      // Small natural micro-drift (step tremors on stone stairs)
      const naturalDrift = (Math.random() - 0.5) * 1.3;
      let nextBalance = current + gravityTorque + naturalDrift;

      // 2. Mountain Terrain & Wind Gusts based on altitude milestones
      const windRoll = Math.random();
      if (currentDist >= 20 && currentDist < 45 && windRoll < 0.06) {
        // 十八梯转角峡谷横风
        const gustDirection = Math.random() > 0.5 ? 1 : -1;
        const gustMagnitude = (7 + Math.random() * 5) * gustDirection;
        nextBalance += gustMagnitude;
        setCurrentEvent(
          gustDirection > 0
            ? '💨 嘉陵江峡谷风拂过！重心向右侧猛偏，快按 [A / ←] 稳住！'
            : '💨 十八梯陡坡气流袭来！重心向左侧猛偏，快按 [D / →] 稳住！'
        );
        bgmManager.playSfx('whoosh');
      } else if (currentDist >= 50 && currentDist < 68 && windRoll < 0.05) {
        // 青苔湿滑段
        const slip = (Math.random() > 0.5 ? 1 : -1) * 8;
        nextBalance += slip;
        setCurrentEvent('🌧️ 青石板路青苔湿滑！脚下微滑，按 [A / D] 立即回正！');
        bgmManager.playSfx('whoosh');
      } else if (currentDist >= 68 && windRoll < 0.07) {
        // 顶峰冲刺强风
        const summitGust = (Math.random() > 0.5 ? 1 : -1) * 10;
        nextBalance += summitGust;
        setCurrentEvent('🏔️ 临近解放碑顶峰！山顶疾风横扫，咬紧牙关，按 [A / D] 稳住重心！');
        bgmManager.playSfx('whoosh');
      }

      // Clamp balance between -50 and 50
      nextBalance = Math.max(-50, Math.min(50, nextBalance));
      setBalance(nextBalance);

      // Stamina dynamics:
      // In core safe zone (<= 12°), stamina regenerates
      if (Math.abs(nextBalance) <= 12) {
        setStamina((prev) => Math.min(100, prev + 0.6));
      } else if (Math.abs(nextBalance) > 25) {
        // Severe imbalance drains stamina heavily
        setStamina((prev) => {
          const next = prev - 1.8;
          if (next <= 0) {
            setTimeout(() => {
              setIsGameOver(true);
              setIsPlaying(false);
              bgmManager.playSfx('hit');
              onRecordMistake?.('porter_stamina_depleted');
            }, 0);
          }
          return Math.max(0, next);
        });
      }
    }, 80);

    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, isVictory]);

  // Step Forward Action - 80M summit
  const handleStepForward = () => {
    if (!isPlaying || isGameOver || isVictory) return;

    const now = Date.now();
    const STEP_COOLDOWN_MS = 480;

    // 1. Guard against continuous space mashing:
    if (now - lastStepTimeRef.current < STEP_COOLDOWN_MS) {
      bgmManager.playSfx('hit');
      const stumble = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 6);
      setBalance((prev) => Math.max(-50, Math.min(50, prev + stumble)));
      setStamina((prev) => Math.max(0, prev - 8));
      setCurrentEvent('⚠️ 步伐太急！脚下虚踩石阶，扁担剧烈颠簸！请按节奏踏稳后再蹬阶！');
      return;
    }
    lastStepTimeRef.current = now;
    setIsCoolingDown(true);
    setTimeout(() => setIsCoolingDown(false), STEP_COOLDOWN_MS);

    const currentBal = balance;

    // 2. Primary Safe Zone (<= 12°)
    if (Math.abs(currentBal) <= 12) {
      bgmManager.playSfx('bip');
      const stepGain = 7;
      const nextDistance = Math.min(80, distance + stepGain);
      setDistance(nextDistance);
      setStepsCount((c) => c + 1);
      setStreak((s) => s + 1);

      // Real momentum physics: stepping on planted leg creates lateral sway,
      // and any existing lean creates compounding asymmetry!
      const stepImpulse = stepLeg === 'left' ? -7 : 7;
      const leanInertia = currentBal * 0.45;
      const microJolt = (Math.random() - 0.5) * 3.5;
      const nextBal = Math.max(-50, Math.min(50, currentBal + stepImpulse + leanInertia + microJolt));
      setBalance(nextBal);

      setStepLeg((leg) => (leg === 'left' ? 'right' : 'left'));
      setStamina((prev) => Math.max(0, prev - 3));

      setCurrentEvent(
        `⚡ ${stepLeg === 'left' ? '左脚稳踏' : '右脚换肩'}！前进 +${stepGain}M！注意扁担偏角，及时微调！`
      );

      if (nextDistance >= 80) {
        setIsVictory(true);
        setIsPlaying(false);
        bgmManager.playSfx('success');
        onSuccess();
      }
    } else if (Math.abs(currentBal) <= 25) {
      // 3. Warning Zone (13° ~ 25°): Partial stride with heavy momentum penalties
      bgmManager.playSfx('hit');
      const stepGain = 3;
      const nextDistance = Math.min(80, distance + stepGain);
      setDistance(nextDistance);
      setStepsCount((c) => c + 1);
      setStreak(0);

      // Tilting makes stepping unstable, throwing the carrier further toward the heavy side
      const stepImpulse = stepLeg === 'left' ? -6 : 6;
      const severeLean = Math.sign(currentBal) * 8;
      const nextBal = Math.max(-50, Math.min(50, currentBal + stepImpulse + severeLean));
      setBalance(nextBal);

      setStepLeg((leg) => (leg === 'left' ? 'right' : 'left'));
      setStamina((prev) => Math.max(0, prev - 10));

      setCurrentEvent(`⚠️ 扁担偏斜（${Math.round(currentBal)}°），脚步踉跄！仅前进 +${stepGain}M！快按 [A/D] 回正！`);

      if (nextDistance >= 80) {
        setIsVictory(true);
        setIsPlaying(false);
        bgmManager.playSfx('success');
        onSuccess();
      }
    } else {
      // 4. Danger Zone (> 25°): Cannot step forward safely, stumble!
      bgmManager.playSfx('hit');
      setStreak(0);
      setStamina((prev) => {
        const next = prev - 16;
        if (next <= 0) {
          setTimeout(() => {
            setIsGameOver(true);
            setIsPlaying(false);
            onRecordMistake?.('porter_danger_zone_fall');
          }, 0);
        }
        return Math.max(0, next);
      });
      // Further tilt toward cliff edge
      const stumbleTilt = Math.sign(currentBal) * 6;
      setBalance((prev) => Math.max(-50, Math.min(50, prev + stumbleTilt)));
      setCurrentEvent(`❌ 扁担倾角过大（${Math.round(currentBal)}°）！险些跌落！必须立即按 [A/←] 或 [D/→] 回正！`);
    }
  };

  const handleShiftBalance = (delta: number) => {
    if (!isPlaying || isGameOver || isVictory) return;
    bgmManager.playSfx('whoosh');
    setBalance((prev) => Math.max(-50, Math.min(50, prev + delta)));
  };

  // Keyboard shortcut listener: Left/A for left, Right/D for right, Space/W/Up for step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleShiftBalance(-9);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleShiftBalance(9);
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleStepForward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, balance, stepLeg, distance]);

  return (
    <div className="space-y-4">
      {/* Intro Banner */}
      <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>🎋 挑运目标：肩挑合金扁担，稳步蹬阶 80 米登顶十八梯解放碑！</span>
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 font-light">
            按 [A / D] 随时调节扁担平衡，按 [空格 / 蹬阶] 稳步攀登（需保持换脚节奏，切勿急躁连按空格）！
          </p>
        </div>
        <div className="text-right font-mono">
          <span className="text-[11px] text-slate-400 block">步道进度</span>
          <div className="text-base font-bold text-amber-400">{Math.round(distance)} / 80 M</div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative bg-[#070a12] border-2 border-slate-800 rounded-2xl p-5 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[280px]">
        {/* Distance Progress Line */}
        <div className="w-full mb-4">
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>起点：十八梯下半城 (0M)</span>
            <span className="text-amber-400 font-bold">步数: {stepsCount} | 连击: x{streak}</span>
            <span>顶峰：解放碑原点 (80M)</span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-150"
              style={{ width: `${(distance / 80) * 100}%` }}
            />
          </div>
        </div>

        {/* Gravity Balance Visualizer */}
        <div className="w-full max-w-md bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-center space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span className="text-rose-400">◄ 左侧悬崖 (-50°)</span>
            <span className="text-emerald-400 font-bold">⚖️ 核心安全平衡区 (±12°)</span>
            <span className="text-rose-400">右侧石阶 (+50°) ►</span>
          </div>

          {/* Balance Track */}
          <div className="relative h-7 bg-slate-950 rounded-full border border-slate-700 overflow-hidden flex items-center">
            {/* Safe Center Zone: ±12° */}
            <div className="absolute left-[38%] right-[38%] h-full bg-emerald-500/25 border-x-2 border-emerald-400/70" />
            
            {/* Warning Zone: 12° to 25° */}
            <div className="absolute left-[25%] right-[62%] h-full bg-amber-500/15" />
            <div className="absolute left-[62%] right-[25%] h-full bg-amber-500/15" />

            {/* Dynamic Center Gravity Indicator Ball */}
            <div
              className={`absolute w-6 h-6 rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-75 flex items-center justify-center text-[10px] font-bold ${
                Math.abs(balance) <= 12
                  ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/50'
                  : Math.abs(balance) <= 25
                  ? 'bg-amber-400 text-slate-950 shadow-amber-500/50'
                  : 'bg-rose-500 text-white shadow-rose-500/80'
              }`}
              style={{ left: `${50 + balance}%` }}
            >
              担
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono pt-1">
            <span className="text-slate-400">
              体态倾角: <span className={Math.abs(balance) <= 12 ? 'text-emerald-400 font-bold' : Math.abs(balance) <= 25 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>{Math.round(balance)}°</span>
            </span>
            <span className="text-amber-300 font-mono">
              下步换脚: <span className="font-bold underline">{stepLeg === 'left' ? '左脚稳登' : '右脚换肩'}</span>
            </span>
            <span className={`font-bold ${stamina > 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
              耐力体力: {Math.round(stamina)}%
            </span>
          </div>
        </div>

        {/* Real-time Dynamic Event Banner */}
        <div className="mt-3 text-xs font-mono font-medium text-amber-300 text-center bg-[#0d121e] px-4 py-2 rounded-lg border border-slate-800 w-full max-w-md min-h-[36px] flex items-center justify-center">
          {currentEvent}
        </div>

        {/* Victory Screen */}
        {isVictory && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <Trophy className="w-14 h-14 text-yellow-400 animate-bounce" />
            <h3 className="text-lg font-bold text-yellow-300">🎉 汗水铸就脊梁！十八梯 80 米登顶成功！</h3>
            <p className="text-xs text-slate-200 text-center max-w-md">
              凭借敏锐的平衡感知与扎实的每一步蹬阶，你亲自将沉重的合金负荷挑上了解放碑顶层！
            </p>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              获得奖励：🪙 +15 赛博积分 | ⚡ +20 义体能量 | ❤️ 棒棒好感度 +20 | 🎁 颁发【山城脊梁之竹·前哨共济信物】！
            </div>
            <button
              onClick={() => {
                setDistance(0);
                setBalance(0);
                setStamina(100);
                setStepsCount(0);
                setStreak(0);
                setIsVictory(false);
                setIsPlaying(true);
                setCurrentEvent('深吸一口气，观察重心偏角，按 [A / D] 调节扁担，按 [空格 / 蹬阶] 稳步攀登！');
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-lg"
            >
              再次挑战攀爬
            </button>
          </div>
        )}

        {/* GameOver Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <AlertTriangle className="w-14 h-14 text-rose-500 animate-pulse" />
            <h3 className="text-lg font-bold text-rose-400">体力透支或重心失稳！挑运稍作休整！</h3>
            <p className="text-xs text-slate-300 text-center max-w-md">
              山城梯坎险峻，重担挑运切忌盲目连续踩踏空格！建议每蹬一步观察倾角，随时按 [A / D] 回正重心后再蹬下一步！
            </p>
            <button
              onClick={() => {
                setDistance(0);
                setBalance(0);
                setStamina(100);
                setStepsCount(0);
                setStreak(0);
                setIsGameOver(false);
                setIsPlaying(true);
                setCurrentEvent('深吸一口气，观察重心偏角，按 [A / D] 调节扁担，按 [空格 / 蹬阶] 稳步攀登！');
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-md"
            >
              重整旗鼓 · 再次尝试
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {!isPlaying && !isVictory && !isGameOver ? (
          <button
            onClick={() => setIsPlaying(true)}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-sm rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>开启挑运登山实操挑战</span>
          </button>
        ) : (
          <div className="w-full grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleShiftBalance(-9)}
              className="py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>向左扶正 [A / ←]</span>
            </button>
            <button
              onClick={handleStepForward}
              disabled={isCoolingDown}
              className={`py-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-all ${
                isCoolingDown
                  ? 'bg-amber-900/60 text-amber-300/60 border border-amber-600/30'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{isCoolingDown ? '换脚起伏中…' : '稳步蹬阶 [空格 / W]'}</span>
            </button>
            <button
              onClick={() => handleShiftBalance(9)}
              className="py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform"
            >
              <span>向右扶正 [D / →]</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

