import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Trophy,
  Gauge,
  Sparkles,
  Shield,
  CheckCircle,
  AlertTriangle,
  Activity,
  Zap,
} from 'lucide-react';
import { bgmManager } from '../../utils/audio';
interface MonorailGameProps {
  onSuccess: () => void;
  isMuted: boolean;
  onRecordMistake?: (reason?: string) => void;
}

export const MonorailPilotGame: React.FC<MonorailGameProps> = ({ onSuccess, isMuted, onRecordMistake }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [distanceRemaining, setDistanceRemaining] = useState(800); // 800m down to 0m
  const [speed, setSpeed] = useState(45); // km/h
  const [throttle, setThrottle] = useState(false);
  const [brake, setBrake] = useState(false);
  const [acousticDamping, setAcousticDamping] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(38); // dB
  const [centrifugalDangerDuration, setCentrifugalDangerDuration] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [failReason, setFailReason] = useState('');

  // Physics & Control State Refs (Decoupled from render re-triggers for zero-latency 50ms engine)
  const isPlayingRef = useRef(false);
  const speedRef = useRef(45);
  const distanceRef = useRef(800);
  const throttleRef = useRef(false);
  const brakeRef = useRef(false);
  const dampingRef = useRef(false);
  const dangerDurationRef = useRef(0);
  const isVictoryRef = useRef(false);
  const isGameOverRef = useRef(false);
  const prevSectionRef = useRef<string>('straight');

  // Track sectors across 800m
  const section =
    distanceRemaining > 450
      ? 'straight' // 嘉陵江跨江高架 (800m ~ 450m, Target: 60 - 80 km/h)
      : distanceRemaining > 160
      ? 'curve' // 半山悬崖 R100m 弯道 (450m ~ 160m, Target: 35 - 58 km/h)
      : 'tunnel'; // 19层穿楼进站 (160m ~ 0m, Target: ≤ 38 km/h + 开启消噪)

  // Direct Interactive Controls with Instant Tactile Feedback
  const startThrottle = () => {
    throttleRef.current = true;
    setThrottle(true);
    // Instant throttle surge (+3 km/h immediate response)
    speedRef.current = Math.min(95, speedRef.current + 3.0);
    setSpeed(speedRef.current);
    const currSection = distanceRef.current > 450 ? 'straight' : distanceRef.current > 160 ? 'curve' : 'tunnel';
    bgmManager.updateMonorailSound({
      speed: speedRef.current,
      throttle: true,
      brake: false,
      section: currSection,
      acousticDamping: dampingRef.current,
      isWarning: currSection === 'curve' && speedRef.current > 58
    });
  };

  const stopThrottle = () => {
    throttleRef.current = false;
    setThrottle(false);
    const currSection = distanceRef.current > 450 ? 'straight' : distanceRef.current > 160 ? 'curve' : 'tunnel';
    bgmManager.updateMonorailSound({
      speed: speedRef.current,
      throttle: false,
      brake: brakeRef.current,
      section: currSection,
      acousticDamping: dampingRef.current,
      isWarning: currSection === 'curve' && speedRef.current > 58
    });
  };

  const startBrake = () => {
    brakeRef.current = true;
    setBrake(true);
    // Instant pneumatic air brake hiss + immediate braking tap (-4.5 km/h)
    bgmManager.playMonorailBrakeHiss();
    speedRef.current = Math.max(12, speedRef.current - 4.5);
    setSpeed(speedRef.current);
    const currSection = distanceRef.current > 450 ? 'straight' : distanceRef.current > 160 ? 'curve' : 'tunnel';
    bgmManager.updateMonorailSound({
      speed: speedRef.current,
      throttle: false,
      brake: true,
      section: currSection,
      acousticDamping: dampingRef.current,
      isWarning: currSection === 'curve' && speedRef.current > 58
    });
  };

  const stopBrake = () => {
    brakeRef.current = false;
    setBrake(false);
    const currSection = distanceRef.current > 450 ? 'straight' : distanceRef.current > 160 ? 'curve' : 'tunnel';
    bgmManager.updateMonorailSound({
      speed: speedRef.current,
      throttle: throttleRef.current,
      brake: false,
      section: currSection,
      acousticDamping: dampingRef.current,
      isWarning: currSection === 'curve' && speedRef.current > 58
    });
  };

  const toggleAcousticDamping = () => {
    const next = !dampingRef.current;
    dampingRef.current = next;
    setAcousticDamping(next);
    bgmManager.playMonorailShieldToggle(next);
    const currSection = distanceRef.current > 450 ? 'straight' : distanceRef.current > 160 ? 'curve' : 'tunnel';
    bgmManager.updateMonorailSound({
      speed: speedRef.current,
      throttle: throttleRef.current,
      brake: brakeRef.current,
      section: currSection,
      acousticDamping: next,
      isWarning: currSection === 'curve' && speedRef.current > 58
    });
  };

  const resetAndStartGame = () => {
    speedRef.current = 45;
    distanceRef.current = 800;
    throttleRef.current = false;
    brakeRef.current = false;
    dampingRef.current = false;
    dangerDurationRef.current = 0;
    isVictoryRef.current = false;
    isGameOverRef.current = false;
    prevSectionRef.current = 'straight';

    setSpeed(45);
    setDistanceRemaining(800);
    setThrottle(false);
    setBrake(false);
    setAcousticDamping(false);
    setCentrifugalDangerDuration(0);
    setIsVictory(false);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  // Synchronous Monorail Audio Lifecycle
  useEffect(() => {
    if (isPlaying && !isVictory && !isGameOver) {
      bgmManager.startMonorailSound();
      return () => {
        bgmManager.stopMonorailSound();
      };
    } else {
      bgmManager.stopMonorailSound();
    }
  }, [isPlaying, isVictory, isGameOver]);

  // Master 50ms Physics Engine (Runs steadily at 20fps for silky smooth control without interval reset hiccups)
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      if (!isPlayingRef.current || isVictoryRef.current || isGameOverRef.current) return;

      // 1. Calculate Acceleration & Braking with Real Physics
      let speedDelta = 0;
      if (throttleRef.current) speedDelta += 1.4; // +28 km/h per sec
      if (brakeRef.current) speedDelta -= 2.8;    // -56 km/h per sec

      const currDist = distanceRef.current;
      const currSection = currDist > 450 ? 'straight' : currDist > 160 ? 'curve' : 'tunnel';

      // Detect sector transition: trigger tunnel whoosh upon penetrating Liziba 19F building
      if (prevSectionRef.current !== currSection) {
        if (currSection === 'tunnel') {
          bgmManager.playMonorailTunnelWhoosh();
        }
        prevSectionRef.current = currSection;
      }

      if (currSection === 'curve') {
        speedDelta += 0.24; // Downhill cliff gravitational momentum
      } else if (currSection === 'straight') {
        speedDelta += 0.05;
      } else {
        speedDelta -= 0.22; // Tunnel aerodynamic wall drag
      }

      if (!throttleRef.current && !brakeRef.current) {
        speedDelta -= 0.12; // Natural monorail rolling friction
      }

      const nextSpeed = Math.max(12, Math.min(95, speedRef.current + speedDelta));
      speedRef.current = nextSpeed;

      // 2. Real-time Curve Centrifugal Check (R100m bend)
      if (currSection === 'curve') {
        if (nextSpeed > 58) {
          dangerDurationRef.current += 1;
          if (dangerDurationRef.current >= 40 || nextSpeed > 78) {
            isGameOverRef.current = true;
            setIsGameOver(true);
            setFailReason('⚠️ 悬崖大弯道持续超速（> 58 km/h）！防脱轨系统紧急切断动力！过弯请保持按住 [S / 制动]！');
            bgmManager.stopMonorailSound();
            bgmManager.playSfx('hit');
            return;
          }
        } else {
          dangerDurationRef.current = Math.max(0, dangerDurationRef.current - 1);
        }
      } else {
        dangerDurationRef.current = Math.max(0, dangerDurationRef.current - 1);
      }

      // 3. Advance Distance across 800m (50ms interval -> 20 ticks/sec)
      const covered = (nextSpeed / 36) * 0.9;
      const nextDist = Math.max(0, currDist - covered);
      distanceRef.current = nextDist;

      // Synchronize Monorail Sound Engine with real-time telemetry
      bgmManager.updateMonorailSound({
        speed: nextSpeed,
        throttle: throttleRef.current,
        brake: brakeRef.current,
        section: currSection,
        acousticDamping: dampingRef.current,
        isWarning: currSection === 'curve' && nextSpeed > 58
      });

      // 4. Station Docking Check at 0M
      if (nextDist === 0) {
        bgmManager.stopMonorailSound();
        if (nextSpeed > 40) {
          isGameOverRef.current = true;
          setIsGameOver(true);
          setFailReason(`⚠️ 进站时速过高（${Math.round(nextSpeed)} km/h > 40 km/h）！列车发生猛烈撞击阻尼网！进站前请提前按 [S] 减速！`);
          bgmManager.playSfx('hit');
          onRecordMistake?.('monorail_overspeed_crash');
          return;
        }
        if (!dampingRef.current) {
          isGameOverRef.current = true;
          setIsGameOver(true);
          setFailReason('⚠️ 未提前开启消噪护盾！穿楼入库噪音过大严重扰民，调度评级不及格！请在进入最后 160 米时按 [空格] 开启消噪！');
          bgmManager.playSfx('hit');
          onRecordMistake?.('monorail_noise_shield_missing');
          return;
        }

        isVictoryRef.current = true;
        setIsVictory(true);
        bgmManager.playMonorailDockingChime();
        bgmManager.playSfx('success');
        onSuccess();
        return;
      }

      // Calculate real-time noise
      let calculatedNoise = nextSpeed * 0.7 + (currSection === 'curve' ? 8 : 0);
      if (dampingRef.current) calculatedNoise *= 0.42;

      // Synchronize with React UI State
      setSpeed(nextSpeed);
      setDistanceRemaining(nextDist);
      setCentrifugalDangerDuration(dangerDurationRef.current);
      setNoiseLevel(Math.round(calculatedNoise));
    }, 50);

    return () => clearInterval(timer);
  }, [isPlaying, onSuccess, onRecordMistake]);

  // Robust Keyboard Controls (Supports KeyW, KeyS, Space, ArrowUp, ArrowDown, and Chinese IME)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current || isVictoryRef.current || isGameOverRef.current) return;
      const isUp = e.code === 'KeyW' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp';
      const isDown = e.code === 'KeyS' || e.code === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ArrowDown';
      const isSpace = e.code === 'Space' || e.code === 'KeyD' || e.key === ' ' || e.key === 'd' || e.key === 'D';

      if (isUp) {
        e.preventDefault();
        if (!throttleRef.current) {
          startThrottle();
        }
      } else if (isDown) {
        e.preventDefault();
        if (!brakeRef.current) {
          startBrake();
        }
      } else if (isSpace) {
        e.preventDefault();
        if (!e.repeat) {
          toggleAcousticDamping();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isUp = e.code === 'KeyW' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp';
      const isDown = e.code === 'KeyS' || e.code === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ArrowDown';

      if (isUp) {
        stopThrottle();
      } else if (isDown) {
        stopBrake();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Flight HUD Overview */}
      <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <span>🚝 穿楼调度：800M 驾驶——跨江高架提速、弯道减速过弯、李子坝消噪进站！</span>
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 font-light">
            按住或连续点击 [W] 牵引提速，按住或连续点击 [S] 减速制动，进站 160M 内按 [空格] 开启消噪护盾！
          </p>
        </div>
        <div className="text-right font-mono">
          <span className="text-[11px] text-slate-400 block">距站台</span>
          <div className="text-base font-bold text-cyan-400">{Math.round(distanceRemaining)} M</div>
        </div>
      </div>

      {/* Cockpit HUD Viewport */}
      <div className="relative bg-[#050811] border-2 border-cyan-500/30 rounded-2xl p-5 overflow-hidden shadow-inner flex flex-col justify-between min-h-[300px]">
        {/* Track Sector Telemetry Pill */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-mono font-bold text-slate-300">
            当前区间：
            <span className={
              section === 'straight' ? 'text-amber-400' : section === 'curve' ? 'text-orange-400' : 'text-emerald-400'
            }>
              {section === 'straight' ? '🌉 嘉陵江跨江高架 (直道提速 60-80 km/h)' : section === 'curve' ? '⚠️ 半山悬崖 R100m 弯道 (严格限速 ≤ 58 km/h)' : '🏢 李子坝穿楼声学进站舱 (降速 ≤ 38 km/h + 需开消噪)'}
            </span>
          </span>
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            noiseLevel < 55 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse'
          }`}>
            声学分贝: {noiseLevel} dB
          </span>
        </div>

        {/* Central Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
          <div className="bg-[#080d1a] p-3 rounded-xl border border-slate-800 text-center relative overflow-hidden">
            <span className="text-[10px] text-slate-400 font-mono">当前时速</span>
            <div className={`text-2xl font-black font-mono mt-1 ${
              section === 'curve' && speed > 58 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'
            }`}>
              {Math.round(speed)} <span className="text-xs text-slate-400 font-normal">km/h</span>
            </div>

            {/* Real-time Dynamic Drive Status Tag */}
            <div className="mt-1 h-5 flex items-center justify-center">
              {throttle ? (
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/50 animate-pulse">
                  ⚡ 牵引加速中 +++
                </span>
              ) : brake ? (
                <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50 animate-pulse">
                  🛑 强力制动中 ---
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">
                  {section === 'curve' ? '⚠️ 弯道限速 ≤ 58' : section === 'tunnel' ? '进站目标 ≤ 38' : '巡航速度 60-80'}
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#080d1a] p-3 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-mono">消噪护盾状态</span>
            <div className={`text-sm font-bold font-mono mt-2 ${acousticDamping ? 'text-emerald-400' : 'text-rose-400'}`}>
              {acousticDamping ? '🛡️ 降噪运行中 (-58%)' : '❌ 护盾已关闭'}
            </div>
            <button
              onClick={toggleAcousticDamping}
              className={`mt-2 px-3 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer active:scale-95 ${
                acousticDamping ? 'bg-emerald-900/70 border-emerald-500 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {acousticDamping ? '已激活消噪 [空格]' : '点击开启消噪 [空格]'}
            </button>
          </div>

          <div className="bg-[#080d1a] p-3 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 font-mono">弯道平稳度</span>
            <div className={`text-sm font-bold font-mono mt-2 ${
              centrifugalDangerDuration > 0 ? 'text-rose-400 animate-bounce' : 'text-emerald-400'
            }`}>
              {centrifugalDangerDuration > 0 ? `🚨 离心超速警报 (${centrifugalDangerDuration}/40)` : '✅ 姿态平稳'}
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-100 ${
                  centrifugalDangerDuration > 0 ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (centrifugalDangerDuration / 40) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Victory & Failure Modals */}
        {isVictory && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <CheckCircle className="w-14 h-14 text-emerald-400 animate-bounce" />
            <h3 className="text-lg font-bold text-emerald-300">🎉 精准调度！李子坝 8 楼平稳进站！</h3>
            <p className="text-xs text-slate-200 text-center max-w-md">
              成功征服大河跨江大桥、崖壁高危急弯，并以 0 扰民消噪时速平稳入库！AI 零号机彻底心悦诚服！
            </p>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              获得奖励：🪙 +15 赛博积分 | ⚡ +20 义体能量 | ❤️ 零号机好感度 +25 | 🎁 颁发【大河渔猎之魂·险滩共济碎片】！
            </div>
            <button
              onClick={resetAndStartGame}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 cursor-pointer shadow-lg active:scale-95"
            >
              再次驾驶调度
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-4">
            <AlertTriangle className="w-14 h-14 text-rose-500 animate-pulse" />
            <h3 className="text-lg font-bold text-rose-400">调度违规！列车紧急锁死断电！</h3>
            <p className="text-xs text-slate-300 text-center max-w-md">{failReason}</p>
            <button
              onClick={resetAndStartGame}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 cursor-pointer shadow-md active:scale-95"
            >
              重新发起调度
            </button>
          </div>
        )}
      </div>

      {/* Control Throttle / Brake Buttons */}
      <div className="pt-1">
        {!isPlaying && !isVictory && !isGameOver ? (
          <button
            onClick={resetAndStartGame}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-sm rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>进入穿楼单轨驾驶舱 (800M 实操调度)</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onMouseDown={startThrottle}
              onMouseUp={stopThrottle}
              onMouseLeave={stopThrottle}
              onTouchStart={(e) => {
                e.preventDefault();
                startThrottle();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopThrottle();
              }}
              className={`py-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all ${
                throttle
                  ? 'bg-cyan-400 text-slate-950 scale-95 shadow-[0_0_25px_rgba(6,182,212,0.9)] ring-2 ring-cyan-300'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              <Zap className={`w-5 h-5 ${throttle ? 'fill-slate-950 animate-bounce' : 'fill-white'}`} />
              <span>{throttle ? '⚡ 正在加速 · 牵引中' : '按住 / 点击加速 · 牵引 [W / ↑]'}</span>
            </button>

            <button
              onMouseDown={startBrake}
              onMouseUp={stopBrake}
              onMouseLeave={stopBrake}
              onTouchStart={(e) => {
                e.preventDefault();
                startBrake();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopBrake();
              }}
              className={`py-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all ${
                brake
                  ? 'bg-rose-400 text-slate-950 scale-95 shadow-[0_0_25px_rgba(244,63,94,0.9)] ring-2 ring-rose-300'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              <Shield className={`w-5 h-5 ${brake ? 'animate-bounce' : ''}`} />
              <span>{brake ? '🛑 正在制动 · 减速中' : '按住 / 点击减速 · 制动 [S / ↓]'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


