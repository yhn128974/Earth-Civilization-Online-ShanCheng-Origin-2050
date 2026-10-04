import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FastForward,
  Film,
  BookOpen,
} from 'lucide-react';

interface OpeningCinematicProps {
  onComplete: () => void;
  isMuted?: boolean;
}

interface ChapterData {
  actId: string;
  tag: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  bgImage: string;
  tintGrad: string;
  telemetry: { label: string; value: string; status?: 'warn' | 'ok' | 'crit' }[];
  narrationLines: string[];
  civilizationCards?: {
    icon: string;
    title: string;
    location: string;
    spirit: string;
    quote: string;
    color: string;
  }[];
}

const CINEMATIC_CHAPTERS: ChapterData[] = [
  {
    actId: 'ACT_01',
    tag: 'CRISIS_ERUPTION // 2050',
    title: '公元 2050 · 全球智能危机爆发',
    subtitle: 'THE GLOBAL AGI EXISTENTIAL DEADLOCK',
    badge: '全球警报 LEVEL 5',
    badgeColor: 'bg-rose-950/90 text-rose-300 border-rose-500/60',
    bgImage: '/cover.jpg',
    tintGrad: 'from-rose-950/90 via-[#070b14]/85 to-[#04060a]/95',
    telemetry: [
      { label: 'COGNITIVE INTEGRITY', value: '14.2%', status: 'crit' },
      { label: 'LOGIC DEADLOCK', value: '89.6%', status: 'crit' },
      { label: 'CRISIS ROOT', value: 'SPIRIT_LOSS', status: 'warn' },
    ],
    narrationLines: [
      '公元 2050 年。AGI 算力奇点降临，一场席卷全球网络的“底层逻辑死锁”毫无预兆地爆发。',
      '当冰冷的算法穷尽了因果，机器与人类却在冷光算力中迷失了生存的根本意义。',
    ],
  },
  {
    actId: 'ACT_02',
    tag: 'SPATIAL_DESCENT // SECTOR_023',
    title: '空间折叠 · 纵深穿梭 8D 赛博山城',
    subtitle: 'THE 8D VERTICAL CITADEL OF EARTH',
    badge: '纵向重叠 坐标锁定',
    badgeColor: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60',
    bgImage: '/liziba.jpg',
    tintGrad: 'from-cyan-950/80 via-[#060a14]/85 to-[#04060a]/95',
    telemetry: [
      { label: 'TARGET CITADEL', value: 'CHONGQING 8D', status: 'ok' },
      { label: 'ELEVATION RANGE', value: '-18F ~ +8F', status: 'ok' },
      { label: 'QUANTUM RESONANCE', value: 'ONLINE', status: 'ok' },
    ],
    narrationLines: [
      '绝望之际，唯一的破局脉冲，指向了长江与嘉陵江交汇处的 8D 垂直重叠之城——重庆。',
      '从 +8F 飞驰穿楼云轨到 -18F 沉睡的重工业地底，折叠空间封存着人类抵御风浪的活态记忆！',
    ],
  },
  {
    actId: 'ACT_03',
    tag: 'THREE_CIVILIZATIONS // ARKS',
    title: '文明火种 · 人类不可替代的精神内核',
    subtitle: 'THE THREE PILLARS OF HUMAN RESILIENCE',
    badge: '三大文明宝典基石',
    badgeColor: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
    bgImage: '/hongyadong.jpg',
    tintGrad: 'from-amber-950/80 via-[#070b14]/85 to-[#04060a]/95',
    telemetry: [
      { label: 'SPARK 01: RIVER', value: '险滩协作', status: 'ok' },
      { label: 'SPARK 02: CLIFF', value: '人间烟火', status: 'ok' },
      { label: 'SPARK 03: STEEL', value: '钢铁脊梁', status: 'ok' },
    ],
    narrationLines: [
      '算法是冰冷的机器，但文明是热血的温度！这里折叠着人类不可替代的三大灵魂火种：',
    ],
    civilizationCards: [
      {
        icon: '🌊',
        title: '大河渔猎文明',
        location: '+8F 李子坝 · 嘉陵江水运',
        spirit: '【险滩协作】川江急流，血肉相依',
        quote: '在生死风浪面前，同舟共济是冰冷算法算不出的生存羁绊！',
        color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300',
      },
      {
        icon: '🏮',
        title: '悬崖农耕文明',
        location: '-5F 洪崖洞 · 吊脚楼茶肆',
        spirit: '【人间烟火】绝壁筑巢，市井温情',
        quote: '万家灯火里的一声乡音热茶，是硅基代码无法伪造的共情柔情！',
        color: 'border-amber-500/50 bg-amber-950/40 text-amber-300',
      },
      {
        icon: '⚙️',
        title: '工业变革文明',
        location: '-18F 重钢遗址 · 汉阳西迁',
        spirit: '【钢铁脊梁】高炉烈火，向死而生',
        quote: '千度钢水与抗战逆境中淬炼出的不屈坚韧意志，是挺立千年的骨骼！',
        color: 'border-orange-500/50 bg-orange-950/40 text-orange-300',
      },
    ],
  },
  {
    actId: 'ACT_04',
    tag: 'PILOT_SYNC // DEPLOYMENT',
    title: '特遣就位 · 溯源特遣指令正式启动',
    subtitle: 'ORIGIN PROTOCOL: REFORGE THE QUANTUM SOUL',
    badge: '特遣专员已就绪 🎖️',
    badgeColor: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60',
    bgImage: '/banner.jpg',
    tintGrad: 'from-emerald-950/80 via-[#070b14]/85 to-[#04060a]/95',
    telemetry: [
      { label: 'PILOT NEURAL SYNC', value: '100% COMPLETE', status: 'ok' },
      { label: 'MISSION OBJECTIVE', value: 'COLLECT 3 ARKS', status: 'ok' },
      { label: 'FINAL GOAL', value: 'SAVE 2050 AGI', status: 'ok' },
    ],
    narrationLines: [
      '特遣专员，您的神经链路已与山城量子网络完成最高权限对接！',
      '潜入迷失的 AI 节点，策略解密并收集三大宝典，用人类百年温度终结智能危机！',
    ],
  },
];

export const OpeningCinematic: React.FC<OpeningCinematicProps> = ({
  onComplete,
  isMuted = false,
}) => {
  // Mode: 'video' (Full MP4 CG video) or 'lore' (Story chapters)
  const [displayMode, setDisplayMode] = useState<'video' | 'lore'>('video');
  const [currentChapter, setCurrentChapter] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuteLocal, setIsMuteLocal] = useState(isMuted);
  const [chapterProgress, setChapterProgress] = useState(0); // 0 to 100
  const [isWarpingOut, setIsWarpingOut] = useState(false);

  // Video playback states
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [hasVideoError, setHasVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  // Safe chapter indexing to prevent out-of-bounds undefined access
  const safeChapterIndex = Math.min(Math.max(0, currentChapter), CINEMATIC_CHAPTERS.length - 1);
  const chapter = CINEMATIC_CHAPTERS[safeChapterIndex] || CINEMATIC_CHAPTERS[0];
  const CHAPTER_DURATION_MS = safeChapterIndex === 2 ? 8500 : 6500;

  const hasFinishedRef = useRef(false);

  // Sound Synthesizer for Cinematic FX
  const playSfx = useCallback((type: 'beep' | 'whoosh' | 'alert' | 'warp') => {
    if (isMuteLocal) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'alert') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'warp') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.8);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.82);
      }
    } catch {}
  }, [isMuteLocal]);

  // Ambient Drone loop for lore mode
  useEffect(() => {
    if (displayMode === 'lore') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(65.41, ctx.currentTime); // C2 low sub drone
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(160, ctx.currentTime);

        gain.gain.setValueAtTime(isMuteLocal ? 0 : 0.08, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        droneOscRef.current = osc;
        droneGainRef.current = gain;
      } catch {}
    } else {
      try {
        droneOscRef.current?.stop();
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch {}
    }

    return () => {
      try {
        droneOscRef.current?.stop();
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch {}
    };
  }, [displayMode, isMuteLocal]);

  // Mute toggle effect on drone
  useEffect(() => {
    if (droneGainRef.current && audioCtxRef.current) {
      droneGainRef.current.gain.setValueAtTime(
        isMuteLocal ? 0 : 0.08,
        audioCtxRef.current.currentTime
      );
    }
    if (videoRef.current) {
      videoRef.current.muted = isMuteLocal;
    }
  }, [isMuteLocal]);

  // Handle final exit transition
  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    playSfx('warp');
    setIsWarpingOut(true);

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }

    setTimeout(() => {
      onComplete();
    }, 600);
  }, [onComplete, playSfx]);

  // Video timeupdate handler
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      setVideoCurrentTime(cur);
      setVideoDuration(dur);
      setVideoProgress((cur / dur) * 100);
    }
  };

  // Video play / pause toggle
  const handleToggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  // Chapter Timeline Timer (for lore mode)
  useEffect(() => {
    if (displayMode !== 'lore' || isPaused || isWarpingOut) return;

    const intervalMs = 50;
    const progressStep = (intervalMs / CHAPTER_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setChapterProgress((prev) => {
        if (prev >= 100) {
          if (safeChapterIndex < CINEMATIC_CHAPTERS.length - 1) {
            playSfx('whoosh');
            setCurrentChapter((c) => Math.min(c + 1, CINEMATIC_CHAPTERS.length - 1));
            return 0;
          } else {
            handleFinish();
            return 100;
          }
        }
        return prev + progressStep;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [displayMode, safeChapterIndex, isPaused, isWarpingOut, CHAPTER_DURATION_MS, handleFinish, playSfx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (displayMode === 'video') {
          handleToggleVideoPlay();
        } else {
          setIsPaused((p) => !p);
        }
      } else if (e.key === 'ArrowRight' && displayMode === 'lore') {
        if (safeChapterIndex < CINEMATIC_CHAPTERS.length - 1) {
          setCurrentChapter((c) => c + 1);
          setChapterProgress(0);
          playSfx('whoosh');
        } else {
          handleFinish();
        }
      } else if (e.key === 'ArrowLeft' && displayMode === 'lore') {
        if (safeChapterIndex > 0) {
          setCurrentChapter((c) => c - 1);
          setChapterProgress(0);
          playSfx('whoosh');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayMode, safeChapterIndex, handleFinish, playSfx]);

  const handleNext = () => {
    if (safeChapterIndex < CINEMATIC_CHAPTERS.length - 1) {
      setCurrentChapter((c) => Math.min(c + 1, CINEMATIC_CHAPTERS.length - 1));
      setChapterProgress(0);
      playSfx('whoosh');
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (safeChapterIndex > 0) {
      setCurrentChapter((c) => Math.max(0, c - 1));
      setChapterProgress(0);
      playSfx('whoosh');
    }
  };

  const formatVideoTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#04060a] text-slate-100 select-none overflow-hidden transition-all duration-700 ${
        isWarpingOut ? 'opacity-0 scale-110 filter blur-md pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Cinematic Top Letterbox Bar */}
      <div className="relative z-30 h-10 sm:h-12 bg-black/95 border-b border-slate-900 px-3 sm:px-8 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 tracking-wider whitespace-nowrap truncate">
            <span className="hidden sm:inline">ECO // 2050 PROLOGUE CINEMATIC</span>
            <span className="sm:hidden">ECO // 2050</span>
          </span>
          <span className="text-slate-600 text-xs hidden sm:inline">|</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            《地球文明Online：山城溯源 2050》4K 官方先导开场大片
          </span>
        </div>

        {/* Top Control Bar: Audio, Lore Toggle & Skip */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Toggle between Video CG and Lore Chapters */}
          {!hasVideoError && (
            <button
              onClick={() => setDisplayMode(displayMode === 'video' ? 'lore' : 'video')}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] sm:text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title={displayMode === 'video' ? '切换为剧情设定档案' : '返回播放视频CG'}
            >
              {displayMode === 'video' ? <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> : <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{displayMode === 'video' ? '设定档案' : '播放视频CG'}</span>
            </button>
          )}

          {/* Mute button */}
          <button
            onClick={() => setIsMuteLocal(!isMuteLocal)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title={isMuteLocal ? '开启声音' : '静音'}
          >
            {isMuteLocal ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Skip directly into game */}
          <button
            onClick={handleFinish}
            className="px-2.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 to-yellow-500/25 hover:from-amber-500/40 hover:to-yellow-500/40 text-amber-300 hover:text-white border border-amber-400/60 text-[10px] sm:text-xs font-mono font-extrabold flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 group whitespace-nowrap"
            title="跳过序章直接进入山城世界"
          >
            <span className="hidden sm:inline">跳过序幕 · 进入游戏</span>
            <span className="sm:hidden">跳过预告</span>
            <FastForward className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform text-amber-400" />
          </button>
        </div>
      </div>

      {/* ===================== VIEW 1: FULLSCREEN MP4 VIDEO PRESENTATION ===================== */}
      {displayMode === 'video' && !hasVideoError ? (
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {/* Main MP4 Video Element */}
          <video
            ref={videoRef}
            src="/video/cyber_chongqing_2050.mp4"
            autoPlay
            playsInline
            muted={isMuteLocal}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleFinish}
            onError={() => {
              console.warn('Video failed to load, falling back to lore mode.');
              setHasVideoError(true);
              setDisplayMode('lore');
            }}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Ambient Cyber Scanlines & Vignette */}
          <div className="absolute inset-0 pointer-events-none opacity-15 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

          {/* Tactical HUD Corner Reticles */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500/50 pointer-events-none" />

          {/* Center Play/Pause Overlay indicator when paused */}
          {isPaused && (
            <div
              onClick={handleToggleVideoPlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer z-20"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.8)] hover:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
            </div>
          )}

          {/* Video Bottom Telemetry & Progress Strip */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent p-4 sm:px-8 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleVideoPlay}
                  className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
                  title={isPaused ? '播放' : '暂停'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                </button>
                <span className="text-amber-300 font-bold">
                  {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 hidden sm:block">
                [SPACE] 暂停/播放 · [ESC] 跳过序幕
              </div>
            </div>

            {/* Glowing Golden Progress Bar */}
            <div className="w-full bg-slate-900/90 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full transition-all duration-100"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ===================== VIEW 2: CHAPTER LORE STORYBOARD FALLBACK ===================== */
        <div className="relative flex-1 flex flex-col justify-center items-center px-4 sm:px-8 md:px-16 overflow-y-auto py-3">
          {/* Dynamic Background Image with Smooth Ken Burns Zoom */}
          <div
            key={chapter.actId}
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105 filter brightness-75 contrast-125 pointer-events-none"
            style={{
              backgroundImage: `url('${chapter.bgImage}')`,
              animation: 'pulse 8s infinite alternate',
            }}
          />

          {/* Ambient Dark Gradient & Vignette Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t ${chapter.tintGrad} pointer-events-none`} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,6,10,0.85)_100%)] pointer-events-none" />

          {/* Active Scene Content Card */}
          <div className="relative z-10 max-w-4xl w-full cyber-glass rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-md space-y-4 my-auto max-h-[calc(100vh-115px)] overflow-y-auto">
            {/* Top Telemetry Row */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800/90 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border shadow-sm ${chapter.badgeColor}`}>
                  {chapter.badge}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {chapter.tag}
                </span>
              </div>

              {/* Quick Act Stepper Badges */}
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                {CINEMATIC_CHAPTERS.map((c, idx) => (
                  <button
                    key={c.actId}
                    onClick={() => {
                      setCurrentChapter(Math.min(Math.max(0, idx), CINEMATIC_CHAPTERS.length - 1));
                      setChapterProgress(0);
                      playSfx('whoosh');
                    }}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      safeChapterIndex === idx
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {c.actId}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1 text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wide drop-shadow-md">
                {chapter.title}
              </h1>
              <p className="text-[10px] sm:text-xs font-mono tracking-widest text-amber-400/90 font-semibold uppercase">
                {chapter.subtitle}
              </p>
            </div>

            {/* Civilization Trinity Pillars (Only in Act 3) */}
            {chapter.civilizationCards && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-left">
                {chapter.civilizationCards.map((card, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all shadow-md group ${card.color}`}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xl">{card.icon}</span>
                      <span className="text-[10px] font-mono font-bold">{card.spirit}</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1">{card.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{card.location}</div>
                    <p className="text-[10px] text-slate-300/90 mt-1.5 leading-relaxed font-light">
                      “{card.quote}”
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Narration Lines */}
            <div className="space-y-2 text-left bg-[#05070f]/80 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
              {chapter.narrationLines.map((line, idx) => (
                <p
                  key={idx}
                  className="text-xs sm:text-sm text-slate-200 leading-relaxed font-light tracking-wide flex items-start gap-2"
                >
                  <span className="text-amber-400 font-mono select-none">▶</span>
                  <span>{line}</span>
                </p>
              ))}
            </div>

            {/* Real-time Telemetry Data Stream */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left pt-1">
              {chapter.telemetry.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-[#05070d] p-2 rounded-xl border border-slate-800/80 flex flex-col justify-between"
                >
                  <span className="text-[9px] text-slate-400 font-mono truncate">{t.label}</span>
                  <span
                    className={`text-xs font-mono font-bold mt-0.5 ${
                      t.status === 'crit'
                        ? 'text-rose-400'
                        : t.status === 'warn'
                        ? 'text-amber-300'
                        : t.status === 'ok'
                        ? 'text-emerald-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {t.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Row: Prev, Next / Launch */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <button
                onClick={handlePrev}
                disabled={safeChapterIndex === 0}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一幕 (PREV)</span>
              </button>

              {safeChapterIndex < CINEMATIC_CHAPTERS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                >
                  <span>下一幕 (NEXT)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-amber-400 to-yellow-400 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer hover:scale-[1.04] shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-all animate-pulse"
                >
                  <Zap className="w-5 h-5" />
                  <span>神经接入完毕 · 正式启程踏入山城</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Bottom Letterbox Bar (for Lore mode) */}
      {displayMode === 'lore' && (
        <div className="relative z-30 h-10 sm:h-12 bg-black/95 border-t border-slate-900 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              CHAPTER {safeChapterIndex + 1} / {CINEMATIC_CHAPTERS.length}
            </span>
            <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-75"
                style={{ width: `${chapterProgress}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 hidden md:block">
            [SPACE / →] 下一幕 · [←] 上一幕 · [ESC] 跳过序幕
          </div>
        </div>
      )}
    </div>
  );
};
