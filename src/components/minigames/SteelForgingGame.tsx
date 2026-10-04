import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Trophy,
  Flame,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Zap,
  Activity,
} from 'lucide-react';
import { bgmManager } from '../../utils/audio';
interface SteelGameProps {
  onSuccess: () => void;
  isMuted: boolean;
  onRecordMistake?: (reason?: string) => void;
}

interface TargetZone {
  minR: number;
  maxR: number;
  title: string;
}

const STAGE_ZONES: TargetZone[] = [
  { minR: 42, maxR: 52, title: '初坯去杂 · 宽幅靶区' },    // ~101px - 125px (span 10, width 12px)
  { minR: 37, maxR: 46, title: '高温延展 · 贴坯靶区' },    // ~89px - 110px (span 9, width 10.8px)
  { minR: 44, maxR: 51, title: '外缘塑形 · 宽缘靶区' },    // ~106px - 122px (span 7, width 8.4px)
  { minR: 38, maxR: 44, title: '高密夯实 · 紧凑靶区' },    // ~91px - 106px (span 6, width 7.2px)
  { minR: 40, maxR: 45, title: '百炼成钢 · 终极淬火' },    // ~96px - 108px (span 5, width 6px)
];

export const SteelForgingGame: React.FC<SteelGameProps> = ({ onSuccess, isMuted, onRecordMistake }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [temperature, setTemperature] = useState(1550); // Optimal 1420-1680°C
  const [strikesCount, setStrikesCount] = useState(0); // target 5 strikes
  const [ringRadius, setRingRadius] = useState(85); // 100 to 0
  const [ringSpeed, setRingSpeed] = useState(2.5);
  const [billetIntegrity, setBilletIntegrity] = useState(100); // 100% integrity
  const [targetZone, setTargetZone] = useState<TargetZone>(STAGE_ZONES[0]);
  const [forgingLog, setForgingLog] = useState('高炉点火待命！保持炉温在 1420-1680°C，金色收缩环进入绿色靶区时按 [空格] 落锤！共需 5 锤！');
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const ringRadiusRef = useRef(85);
  const temperatureRef = useRef(1550);
  const isPlayingRef = useRef(false);
  const isVictoryRef = useRef(false);
  const isGameOverRef = useRef(false);
  const targetZoneRef = useRef<TargetZone>(STAGE_ZONES[0]);

  useEffect(() => {
    ringRadiusRef.current = ringRadius;
  }, [ringRadius]);

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isVictoryRef.current = isVictory;
    isGameOverRef.current = isGameOver;
  }, [isPlaying, isVictory, isGameOver]);

  // Shrinking rhythm ring & High Furnace Thermodynamics
  useEffect(() => {
    if (!isPlaying || isVictory || isGameOver) return;

    const timer = setInterval(() => {
      // Natural cooling (-2°C per 100ms)
      setTemperature((t) => Math.max(1200, t - 2));

      // Contracting rhythm ring
      setRingRadius((r) => {
        const nextR = r - ringSpeed;
        if (nextR <= 8) {
          // Missed strike window
          setBilletIntegrity((prev) => {
            const next = prev - 4;
            if (next <= 0) {
              setTimeout(() => {
                setIsGameOver(true);
                onRecordMistake?.('steel_forging_integrity_depleted');
              }, 0);
            }
            return Math.max(0, next);
          });
          setForgingLog('💡 错过了一次落锤时机，不必着急，金色能量圈已重新展开！');
          return 85; // reset loop
        }

        return nextR;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isPlaying, isVictory, isGameOver, ringSpeed]);

  const handleHammerStrike = () => {
    if (!isPlayingRef.current || isVictoryRef.current || isGameOverRef.current) return;

    const currentR = ringRadiusRef.current;
    const currentTemp = temperatureRef.current;

    // Sweet spot: dynamic zone based on current stage
    const { minR, maxR } = targetZoneRef.current;
    const isSweetSpot = currentR >= minR && currentR <= maxR;
    const isTempOptimal = currentTemp >= 1420 && currentTemp <= 1680;

    if (isSweetSpot && isTempOptimal) {
      bgmManager.playAnvilStrike(true);
      const nextStrikes = strikesCount + 1;
      setStrikesCount(nextStrikes);
      setRingRadius(85);
      ringRadiusRef.current = 85;

      const midR = (minR + maxR) / 2;
      const isPerfect = Math.abs(currentR - midR) <= Math.max(1.5, (maxR - minR) * 0.25);
      const hitGrade = isPerfect ? '💥 完美落锤！' : '✨ 精准锻打！';

      if (nextStrikes >= 5) {
        setForgingLog(`${hitGrade} 淬火大成！抗战量子特种合金出炉 (${nextStrikes} / 5)！`);
        setIsVictory(true);
        bgmManager.playSfx('success');
        onSuccess();
      } else {
        const nextZone = STAGE_ZONES[nextStrikes];
        setTargetZone(nextZone);
        targetZoneRef.current = nextZone;
        setForgingLog(`${hitGrade}重工杂质被强力震出 (${nextStrikes} / 5)！🎯 靶区变换：【${nextZone.title}】！`);
      }
    } else if (!isTempOptimal) {
      bgmManager.playAnvilStrike(false);
      setBilletIntegrity((prev) => {
        const next = prev - 5;
        if (next <= 0) {
          setTimeout(() => {
            setIsGameOver(true);
            onRecordMistake?.('steel_forging_temp_out_of_range');
          }, 0);
        }
        return Math.max(0, next);
      });
      setRingRadius(85);
      ringRadiusRef.current = 85;
      setForgingLog(`⚠️ 炉温偏离适宜温区（当前 ${currentTemp}°C，需 1420-1680°C）！请按 [F / 鼓风] 或 [C / 溶剂] 调节！`);
    } else {
      bgmManager.playAnvilStrike(false);
      setBilletIntegrity((prev) => {
        const next = prev - 4;
        if (next <= 0) {
          setTimeout(() => {
            setIsGameOver(true);
            onRecordMistake?.('steel_forging_strike_mistimed');
          }, 0);
        }
        return Math.max(0, next);
      });
      setRingRadius(85);
      ringRadiusRef.current = 85;
      setForgingLog(
        currentR > maxR
          ? '⚠️ 锤击过早！请等金色能量圈缩入绿色渐变区后再落锤！'
          : '⚠️ 锤击过晚！金色能量圈已缩穿过渐变区！'
      );
    }
  };

  const handleBellows = () => {
    if (!isPlayingRef.current || isVictoryRef.current || isGameOverRef.current) return;
    bgmManager.playFurnaceBellows();
    setTemperature((t) => {
      const nextT = Math.min(1750, t + 35);
      temperatureRef.current = nextT;
      return nextT;
    });
    setForgingLog('🔥 鼓风加氧！高炉温升 +35°C！');
  };

  const handleFlux = () => {
    if (!isPlayingRef.current || isVictoryRef.current || isGameOverRef.current) return;
    bgmManager.playFluxSizzle();
    setTemperature((t) => {
      const nextT = Math.max(1300, t - 30);
      temperatureRef.current = nextT;
      return nextT;
    });
    setForgingLog('🧪 注入溶剂！降温 -30°C 并析出炉渣！');
  };

  // Keyboard shortcut: Space for Hammer, F for Bellows, C for Flux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleHammerStrike();
      } else if (e.key === 'f' || e.key === 'F') {
        handleBellows();
      } else if (e.key === 'c' || e.key === 'C') {
        handleFlux();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strikesCount]);

  return (
    <div className="space-y-4">
      {/* Intro Bar */}
      <div className="p-3 bg-orange-950/40 border border-orange-500/30 rounded-2xl flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
            <span>⚙️ 锻造目标：重现汉阳铁厂西迁大渡口工匠意志，完成 5 次精准落锤锻打成钢！</span>
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 font-light">
            保持高炉在 1420-1680°C！配合 [F] 鼓风与 [C] 溶剂，金色收缩环缩入【绿色渐变靶区】内时按 [空格] 挥锤！
          </p>
        </div>
        <div className="text-right font-mono">
          <span className="text-[11px] text-slate-400 block">淬炼进度</span>
          <div className="text-base font-bold text-orange-400">{strikesCount} / 5 次</div>
        </div>
      </div>

      {/* Forging Station HUD */}
      <div className="relative bg-[#0b0805] border-2 border-orange-500/40 rounded-2xl p-5 overflow-hidden shadow-inner flex flex-col items-center justify-between min-h-[300px]">
        {/* Top Status & Controls */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
          <span className="text-slate-300">
            高炉熔炼温度：
            <span className={temperature >= 1420 && temperature <= 1680 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold animate-pulse'}>
              {temperature} °C (适宜温区 1420-1680°C)
            </span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBellows}
              className="px-3 py-1 rounded bg-orange-900/70 hover:bg-orange-800 border border-orange-500/60 text-orange-200 text-xs font-bold cursor-pointer active:scale-95 shadow-md"
            >
              🔥 鼓风加温 [F] (+35°C)
            </button>
            <button
              onClick={handleFlux}
              className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer active:scale-95 shadow-md"
            >
              🧪 溶剂去杂 [C] (-30°C)
            </button>
          </div>
        </div>

        {/* Billet Integrity Bar */}
        <div className="w-full max-w-md mt-2">
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-slate-400">钢坯结构完整度</span>
            <span className={billetIntegrity > 40 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold animate-pulse'}>
              {billetIntegrity}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-200 ${
                billetIntegrity > 50 ? 'bg-orange-500' : 'bg-rose-500 animate-pulse'
              }`}
              style={{ width: `${billetIntegrity}%` }}
            />
          </div>
        </div>

        {/* Anvil & QTE Forging Ring */}
        <div className="relative w-56 h-56 my-3 flex items-center justify-center">
          {/* Glowing Red Hot Billet (Substantial & Hefty 96px) */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-600 to-rose-700 shadow-[0_0_55px_rgba(249,115,22,0.9)] border-2 border-amber-300 flex flex-col items-center justify-center text-xs font-black text-slate-950 select-none animate-pulse z-10">
            <span>重钢坯</span>
            <span className="text-[10px] font-mono text-amber-950 opacity-90 font-bold">{temperature}°C</span>
          </div>

          {/* Sweet Spot Target Gradient Ring Band (Dynamically adjusted per strike) */}
          {(() => {
            const outerDiameter = Math.round(targetZone.maxR * 2.4);
            const innerDiameter = Math.round(targetZone.minR * 2.4);
            const innerRadiusPx = Math.round(innerDiameter / 2);
            const outerRadiusPx = Math.round(outerDiameter / 2);
            const midRadiusPx = Math.round((innerRadiusPx + outerRadiusPx) / 2);

            return (
              <div
                className="absolute rounded-full pointer-events-none flex items-center justify-center border-2 border-dashed border-emerald-400/90 shadow-[0_0_24px_rgba(16,185,129,0.55)] transition-all duration-300 ease-out"
                style={{
                  width: `${outerDiameter}px`,
                  height: `${outerDiameter}px`,
                  background: `radial-gradient(circle, transparent ${innerRadiusPx - 2}px, rgba(16,185,129,0.35) ${innerRadiusPx}px, rgba(52,211,153,0.55) ${midRadiusPx}px, rgba(16,185,129,0.2) ${outerRadiusPx - 2}px, transparent ${outerRadiusPx}px)`,
                }}
              >
                {/* Inner Boundary Dashed Ring */}
                <div
                  className="rounded-full border border-dashed border-emerald-400/70 transition-all duration-300 ease-out"
                  style={{ width: `${innerDiameter}px`, height: `${innerDiameter}px` }}
                />
                {/* Target Gradient Zone Label */}
                <span className="absolute -top-5 text-[9px] font-mono text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap transition-all duration-300">
                  🎯 {targetZone.title}
                </span>
              </div>
            );
          })()}

          {/* Contracting Forging Energy Ring */}
          <div
            className="absolute rounded-full border-2 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.95)] pointer-events-none"
            style={{ width: `${ringRadius * 2.4}px`, height: `${ringRadius * 2.4}px` }}
          />
        </div>

        {/* Start Button or Big Hammer Strike Button */}
        {!isPlaying && !isVictory && !isGameOver ? (
          <button
            onClick={() => {
              setIsPlaying(true);
              setTemperature(1550);
              setStrikesCount(0);
              setBilletIntegrity(100);
              setRingRadius(85);
              setRingSpeed(2.5);
              setTargetZone(STAGE_ZONES[0]);
              targetZoneRef.current = STAGE_ZONES[0];
              setForgingLog('高炉点火！金色能量圈缩入【绿色渐变靶区】时按 [空格 / 锤击] 落锤！共需 5 锤！');
            }}
            className="w-full max-w-md py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-transform"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>开启高炉淬炼实操挑战 (5锤成钢)</span>
          </button>
        ) : (
          <button
            onClick={handleHammerStrike}
            className="w-full max-w-md py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-transform"
          >
            <Flame className="w-5 h-5 fill-slate-950" />
            <span>千斤气动重锤 · 强力锻击 [空格 / 点击]</span>
          </button>
        )}

        {/* Victory Screen */}
        {isVictory && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <Trophy className="w-14 h-14 text-orange-400 animate-bounce" />
            <h3 className="text-lg font-bold text-orange-300">🎉 百炼成钢！抗战特种合金出炉！</h3>
            <p className="text-xs text-slate-200 text-center max-w-md">
              重锤去杂锻铸成功，终极高炉已被完全预热点燃，钢铁之魂已正式开启终极文明试炼！
            </p>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              获得奖励：🪙 +20 赛博积分 | ⚡ +20 义体能量 | ❤️ 钢铁之魂好感度 +25 | 🔓 终极文明试炼解封！
            </div>
            <button
              onClick={() => {
                setStrikesCount(0);
                setBilletIntegrity(100);
                setTemperature(1550);
                setRingRadius(85);
                setRingSpeed(2.5);
                setTargetZone(STAGE_ZONES[0]);
                targetZoneRef.current = STAGE_ZONES[0];
                setIsVictory(false);
                setIsPlaying(true);
              }}
              className="px-6 py-2.5 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-400 cursor-pointer shadow-lg"
            >
              再次熔铸
            </button>
          </div>
        )}

        {/* GameOver Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <AlertTriangle className="w-14 h-14 text-rose-500 animate-pulse" />
            <h3 className="text-lg font-bold text-rose-400">钢坯结构受损！稍作调整！</h3>
            <p className="text-xs text-slate-300 text-center max-w-md">
              需 5 次合格重锤方可百炼成钢。保持高炉在 1420-1680°C 并看准金色圆圈收缩至绿色靶心！
            </p>
            <button
              onClick={() => {
                setStrikesCount(0);
                setBilletIntegrity(100);
                setTemperature(1550);
                setRingRadius(85);
                setRingSpeed(2.5);
                setTargetZone(STAGE_ZONES[0]);
                targetZoneRef.current = STAGE_ZONES[0];
                setIsGameOver(false);
                setIsPlaying(true);
              }}
              className="px-6 py-2.5 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-400 cursor-pointer shadow-md"
            >
              换一块新钢坯 · 重新锻铸
            </button>
          </div>
        )}
      </div>

      {/* Forging Log Banner */}
      <div className="p-2.5 bg-[#140b05] rounded-xl border border-orange-950 text-xs font-mono text-orange-300 text-center min-h-[36px] flex items-center justify-center">
        {forgingLog}
      </div>
    </div>
  );
};


