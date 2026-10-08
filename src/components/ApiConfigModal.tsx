import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Check,
  Volume2,
  Sparkles,
  Bot,
  Play,
  Square,
  ExternalLink,
  Shield,
  Cpu,
  Zap,
} from 'lucide-react';
import type { GameState, TTSProvider } from '../types/game';
import { auditionNpcVoice, stopAllSpeech, NPC_VOICE_PROFILES } from '../utils/audio';

interface ApiConfigModalProps {
  gameState: GameState;
  onClose: () => void;
  onSaveConfig: (
    llmConfig: { provider: GameState['apiProvider']; key: string; baseUrl?: string },
    ttsConfig: { provider: TTSProvider; key: string; baseUrl?: string; model?: string }
  ) => void;
}

interface LLMModelOption {
  id: GameState['apiProvider'];
  name: string;
  sub: string;
  tag: string;
  tagColor: string;
  desc: string;
  category: 'domestic' | 'foreign' | 'offline';
  portalUrl?: string;
  portalLabel?: string;
  defaultEndpoint?: string;
  placeholder?: string;
  desc_extra?: string;
}

const LLM_OPTIONS: LLMModelOption[] = [
  // 国内主流大模型（免翻墙、直连极速）
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    sub: 'V3 / R1 满血推理 · 国内直连免梯首选',
    tag: '国内强烈推荐',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    desc: '国内玩家首选！超高性价比与顶尖推理智商，国内网络光纤直连毫秒级响应，方言口吻还原极佳。',
    category: 'domestic',
    portalUrl: 'https://platform.deepseek.com',
    portalLabel: '前往 DeepSeek 开放平台免费申领 Key',
    defaultEndpoint: 'https://api.deepseek.com/chat/completions',
    placeholder: '输入您的 DeepSeek API Key (sk-...)',
  },
  {
    id: 'qwen',
    name: '阿里通义千问 (Qwen)',
    sub: '阿里百炼 DashScope · 阿里云企业级高可用',
    tag: '国内大厂主流',
    tagColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    desc: '阿里云官方出品，国内骨干网络极速稳定、合规安全，支持 qwen-plus / qwen-max 等高阶模型。',
    category: 'domestic',
    portalUrl: 'https://bailian.console.aliyun.com',
    portalLabel: '前往阿里云百炼控制台获取 API Key',
    defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    placeholder: '输入您的 阿里百炼 API Key (sk-...)',
  },

  // 国外主流大模型（需国际网络或海外代理）
  {
    id: 'gemini',
    name: 'Google Gemini',
    sub: 'Gemini 3.1 Flash / 2.5 Flash',
    tag: '游戏内置保底',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    desc: '游戏出厂默认搭载，已内置加密安全信标（留空即可直接使用）。若国内直连超时可在此填入代理或直接切换至国内模型。',
    category: 'foreign',
    portalUrl: 'https://aistudio.google.com',
    portalLabel: '前往 Google AI Studio 获取 API Key',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    placeholder: '选填，留空将默认使用游戏内置加密认证信标',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o)',
    sub: 'GPT-4o / GPT-4o-mini 全球通用标杆',
    tag: '国际通用标杆',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: '全球顶尖通用大模型，支持使用官方 OpenAI Key 或国内各类 One-API / 中转代理 Base URL。',
    category: 'foreign',
    portalUrl: 'https://platform.openai.com',
    portalLabel: '前往 OpenAI 开放平台获取 API Key',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    placeholder: '输入您的 OpenAI API Key (sk-...)',
  },

  // 离线免Key保底引擎
  {
    id: 'mock',
    name: '内置轻量 AGI 拟真引擎',
    sub: '纯前端算法模拟 · 免任何 Key · 全断网可用',
    tag: '零门槛离线',
    tagColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    desc: '完全运行于浏览器本地内存，预置重庆三大文明角色人设与原汁原味的川渝方言对话逻辑。',
    category: 'offline',
    desc_extra: '无任何外部网络请求与费用消耗，任何网络断连环境下均能无缝畅玩。',
  },
];

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  gameState,
  onClose,
  onSaveConfig,
}) => {
  // Default to LLM tab so players can immediately configure their API keys
  const [activeTab, setActiveTab] = useState<'llm' | 'tts'>('llm');

  // LLM State
  const [provider, setProvider] = useState<GameState['apiProvider']>(gameState.apiProvider || 'gemini');
  const [key, setKey] = useState(gameState.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(gameState.apiBaseUrl || '');

  // TTS State
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>(gameState.ttsProvider || 'natural_neural');
  const [ttsKey, setTtsKey] = useState(gameState.ttsApiKey || '');
  const [ttsBaseUrl, setTtsBaseUrl] = useState(gameState.ttsBaseUrl || '');
  const [ttsModel, setTtsModel] = useState(gameState.ttsModel || '');

  const [auditioningNpc, setAuditioningNpc] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      stopAllSpeech();
    };
  }, []);

  const currentOption = LLM_OPTIONS.find((opt) => opt.id === provider) || LLM_OPTIONS[0];

  const handleSelectTtsProvider = (p: TTSProvider) => {
    setTtsProvider(p);
    setErrorMsg(null);
    if (p === 'siliconflow') {
      if (!ttsBaseUrl) setTtsBaseUrl('https://api.siliconflow.cn/v1/audio/speech');
      if (!ttsModel) setTtsModel('FunAudioLLM/CosyVoice2-0.5B');
    } else if (p === 'openai') {
      if (!ttsBaseUrl) setTtsBaseUrl('https://api.openai.com/v1/audio/speech');
      if (!ttsModel) setTtsModel('tts-1');
    }
  };

  const handleAudition = async (npcId: string) => {
    if (auditioningNpc === npcId) {
      stopAllSpeech();
      setAuditioningNpc(null);
      return;
    }

    stopAllSpeech();
    setAuditioningNpc(npcId);

    try {
      await auditionNpcVoice(npcId, {
        ttsProvider,
        ttsApiKey: ttsKey.trim(),
        ttsBaseUrl: ttsBaseUrl.trim(),
        ttsModel: ttsModel.trim(),
      });
    } catch {
      // Audio fallback is handled gracefully inside audio.ts
    } finally {
      setTimeout(() => {
        setAuditioningNpc((prev) => (prev === npcId ? null : prev));
      }, 4500);
    }
  };

  const handleSave = () => {
    setErrorMsg(null);
    const trimmedLlmBaseUrl = baseUrl.trim();

    // Key validation for commercial providers that require user-provided keys
    if ((provider === 'deepseek' || provider === 'qwen' || provider === 'openai') && !key.trim()) {
      setErrorMsg(
        `您当前选择了【${currentOption.name}】，请输入对应的 API Key！若暂无 Key，可随时选用【内置轻量 AGI 引擎】或【Google Gemini】。`
      );
      return;
    }

    if (provider !== 'mock' && trimmedLlmBaseUrl) {
      if (trimmedLlmBaseUrl.startsWith('http://')) {
        setErrorMsg('为了保障 API 凭据安全，LLM 自定义接口地址必须以 https:// 开头！');
        return;
      }
      try {
        new URL(trimmedLlmBaseUrl);
      } catch {
        setErrorMsg('请输入有效合规的 LLM 接口地址！');
        return;
      }
    }

    const trimmedTtsBaseUrl = ttsBaseUrl.trim();
    if (ttsProvider !== 'natural_neural' && trimmedTtsBaseUrl) {
      if (trimmedTtsBaseUrl.startsWith('http://')) {
        setErrorMsg('为了保障 API 凭据安全，TTS 语音接口地址必须以 https:// 开头！');
        return;
      }
      try {
        new URL(trimmedTtsBaseUrl);
      } catch {
        setErrorMsg('请输入有效合规的 TTS 接口地址！');
        return;
      }
    }

    onSaveConfig(
      {
        provider,
        key: key.trim(),
        baseUrl: trimmedLlmBaseUrl,
      },
      {
        provider: ttsProvider,
        key: ttsKey.trim(),
        baseUrl: trimmedTtsBaseUrl,
        model: ttsModel.trim(),
      }
    );

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xl select-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Radiant Cyan Ambient Glow behind modal */}
      <div
        className="absolute w-[600px] h-[450px] rounded-full blur-[100px] opacity-25 pointer-events-none animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.45) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 75%)',
          animationDuration: '6s',
        }}
      />

      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(6,182,212,0.18),inset_0_1px_1px_rgba(255,255,255,0.25)] bg-gradient-to-b from-[#0a162b]/80 via-[#071020]/85 to-[#040814]/90 backdrop-blur-2xl p-5 sm:p-6 max-h-[92vh] flex flex-col overflow-hidden dialogue-scanline-bg">
        {/* Specular Glass Top Highlight Edge */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent pointer-events-none z-30" />

        {/* Tactical Corner HUD Marks */}
        <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400/70 pointer-events-none z-30" />
        <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400/70 pointer-events-none z-30" />
        <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400/70 pointer-events-none z-30" />
        <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400/70 pointer-events-none z-30" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3.5 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/60 backdrop-blur-md rounded-xl text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>AI 大模型与拟真语音中枢</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm">
                  NEURAL v2.6
                </span>
              </h3>
              <p className="text-xs text-slate-300/80">
                支持自由切换国内外主流商业大模型或本地内置离线 AGI 引擎
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAllSpeech();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 mb-3.5 shrink-0 relative z-10 shadow-inner">
          <button
            onClick={() => {
              setActiveTab('llm');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'llm'
                ? 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-300" />
            <span>AGI 对话大模型 (LLM)</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[9px]">
              核心大脑
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tts');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'tts'
                ? 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Volume2 className="w-4 h-4 text-cyan-300" />
            <span>AI 拟真人语音 (TTS)</span>
          </button>
        </div>

        {/* Tab Body - Scrollable */}
        <div className="overflow-y-auto space-y-4 pr-1 text-sm custom-scrollbar flex-1 relative z-10">
          {activeTab === 'llm' ? (
            <div className="space-y-4">
              {/* Domestic Network Friendly Advisory Banner */}
              <div className="p-3 bg-gradient-to-r from-blue-950/50 via-slate-900/60 to-slate-900/40 backdrop-blur-xl rounded-xl border border-blue-500/35 text-xs text-slate-300 space-y-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-2 font-bold text-blue-300">
                  <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>网络连接与大模型选择指南</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  在<strong className="text-slate-200">国内普通网络环境</strong>下（无法稳定直连海外 Google 或 OpenAI 服务器时），强烈建议选用下方<strong className="text-blue-300">【DeepSeek】</strong>或<strong className="text-orange-300">【阿里通义千问】</strong>输入 Key 即可享受国内光纤极速直连；若具备国际网络或代理加速，可体验原生 <strong className="text-cyan-300">Google Gemini</strong> 或 <strong className="text-emerald-300">OpenAI GPT-4o</strong>。
                </p>
              </div>

              {/* Group 1: 国内主流模型 (2国内) */}
              <div>
                <label className="block text-xs font-bold text-blue-300 mb-2 flex items-center gap-1.5">
                  <span>🇨🇳 国内主流大模型（免翻墙 · 直连极速 · 强烈推荐）</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LLM_OPTIONS.filter((o) => o.category === 'domestic').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setProvider(item.id);
                        setErrorMsg(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between backdrop-blur-xl ${
                        provider === item.id
                          ? 'bg-blue-950/70 border-blue-400 text-white shadow-[0_0_16px_rgba(59,130,246,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-blue-400/40 text-slate-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            {item.name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${item.tagColor}`}>
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">{item.sub}</p>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Check className={`w-3 h-3 ${provider === item.id ? 'text-blue-400' : 'opacity-0'}`} />
                        <span>{provider === item.id ? '已选中此引擎' : '点击切换'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group 2: 国外主流模型 (2国外) */}
              <div>
                <label className="block text-xs font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                  <span>🌐 国际主流大模型（需国际网络或海外反向代理）</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LLM_OPTIONS.filter((o) => o.category === 'foreign').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setProvider(item.id);
                        setErrorMsg(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between backdrop-blur-xl ${
                        provider === item.id
                          ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_16px_rgba(6,182,212,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-cyan-400/40 text-slate-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            {item.name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${item.tagColor}`}>
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">{item.sub}</p>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Check className={`w-3 h-3 ${provider === item.id ? 'text-cyan-400' : 'opacity-0'}`} />
                        <span>{provider === item.id ? '已选中此引擎' : '点击切换'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group 3: 内置离线保底引擎 */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                  <span>🛡️ 离线应急引擎（零门槛免配置）</span>
                </label>
                {LLM_OPTIONS.filter((o) => o.category === 'offline').map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setProvider(item.id);
                      setErrorMsg(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer relative flex items-center justify-between backdrop-blur-xl ${
                      provider === item.id
                        ? 'bg-amber-950/50 border-amber-400/80 text-white shadow-[0_0_16px_rgba(251,191,36,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-amber-400/40 text-slate-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-xs text-white">{item.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${item.tagColor}`}>
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono shrink-0 ml-3">
                      {provider === item.id ? (
                        <span className="text-amber-300 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> 已激活
                        </span>
                      ) : (
                        '点击选用'
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Key & Custom Base URL Configuration Area */}
              {provider !== 'mock' && (
                <div className="space-y-3 bg-white/[0.03] backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Key className="w-4 h-4 text-cyan-400" />
                      <span>{currentOption.name} 凭据配置</span>
                    </span>

                    {currentOption.portalUrl && (
                      <a
                        href={currentOption.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>{currentOption.portalLabel || '申请官方 Key'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>API Key 凭据</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        仅加密保留在您当前的本地浏览器 Storage
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder={currentOption.placeholder || 'sk-...'}
                        className="w-full bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono shadow-inner transition-colors"
                      />
                      <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                    </div>
                    {provider === 'gemini' && (
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        💡 提示：留空将继续使用游戏出厂内置的加密认证信标；若输入您自己的 Google Key，将优先使用您的专属额度。
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>自定义代理/中转接口地址 (Base URL)</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        选填 · 默认使用官方标准端点
                      </span>
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={`默认: ${currentOption.defaultEndpoint || '官方直连'}`}
                      className="w-full bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono shadow-inner transition-colors"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      国内自建代理或使用 One-API 等中转网关时，可在此填入自定义反代地址。
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TTS Voice Configuration Tab */
            <div className="space-y-4">
              {/* TTS Provider Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>语音合成引擎 (Voice Provider)</span>
                  <span className="text-[10px] text-cyan-400">支持外接真人级 AI 大模型</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'natural_neural',
                      title: '微软深度 Neural 人声',
                      sub: '原生 Edge/Chrome · 免Key · 自然调校',
                      tag: '免费推荐',
                    },
                    {
                      id: 'siliconflow',
                      title: '硅基流动 CosyVoice',
                      sub: '逼真中国真人音色 · 极低延迟 · 支持方言',
                      tag: '真人质感',
                    },
                    {
                      id: 'openai',
                      title: 'OpenAI 官方 TTS-1',
                      sub: '电影级广播人声 · 超清自然',
                      tag: '国际顶尖',
                    },
                    {
                      id: 'custom',
                      title: '自定义兼容 TTS 接口',
                      sub: '支持自建 CosyVoice / ChatTTS / One-API',
                      tag: '高玩专享',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTtsProvider(item.id as TTSProvider)}
                      className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer backdrop-blur-xl ${
                        ttsProvider === item.id
                          ? 'bg-cyan-950/75 border-cyan-400 text-white shadow-[0_0_16px_rgba(0,240,255,0.28),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-cyan-400/40 text-slate-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">{item.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">{item.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* TTS Provider Specific Config */}
              {ttsProvider === 'natural_neural' ? (
                <div className="p-3.5 bg-cyan-950/40 backdrop-blur-xl rounded-xl border border-cyan-500/30 text-xs text-slate-300 space-y-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-2 font-bold text-cyan-300">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>已启用微软深度神经网络自然人声音色（已消除机械音）</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    无需任何 API Key 或网络中转。系统已自动调校共振峰与声调曲线，为四大 NPC 配备了专属的男声/女声声线！
                  </p>
                </div>
              ) : (
                <div className="space-y-3 bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {ttsProvider === 'siliconflow'
                            ? '硅基流动 API Key'
                            : ttsProvider === 'openai'
                            ? 'OpenAI API Key'
                            : 'TTS API Key'}
                        </span>
                      </span>
                      {ttsProvider === 'siliconflow' && (
                        <a
                          href="https://siliconflow.cn"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <span>前往官网免费申请 Key</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <input
                      type="password"
                      value={ttsKey}
                      onChange={(e) => setTtsKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono shadow-inner transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        接口 Base URL
                      </label>
                      <input
                        type="text"
                        value={ttsBaseUrl}
                        onChange={(e) => setTtsBaseUrl(e.target.value)}
                        placeholder={
                          ttsProvider === 'siliconflow'
                            ? 'https://api.siliconflow.cn/v1/audio/speech'
                            : 'https://api.openai.com/v1/audio/speech'
                        }
                        className="w-full bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono shadow-inner transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        指定 Model
                      </label>
                      <input
                        type="text"
                        value={ttsModel}
                        onChange={(e) => setTtsModel(e.target.value)}
                        placeholder={
                          ttsProvider === 'siliconflow'
                            ? 'FunAudioLLM/CosyVoice2-0.5B'
                            : 'tts-1'
                        }
                        className="w-full bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono shadow-inner transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Audition NPC Voice Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>四大 NPC 声线即时试听</span>
                  <span className="text-[10px] text-slate-500">点击按钮测试当前语音发音效果</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(NPC_VOICE_PROFILES).map(([id, profile]) => {
                    const isPlaying = auditioningNpc === id;
                    return (
                      <div
                        key={id}
                        className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 flex items-center justify-between gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">{profile.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-white/10 backdrop-blur-md text-slate-300 rounded border border-white/10">
                              {profile.roleTitle}
                            </span>
                          </div>
                          <div className="text-[10px] text-cyan-400/90 truncate mt-0.5">
                            {profile.toneDesc}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAudition(id)}
                          className={`shrink-0 px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                            isPlaying
                              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                              : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Square className="w-3 h-3 fill-white" />
                              <span>停止</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-cyan-300" />
                              <span>试听</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-xs text-rose-300 leading-relaxed font-mono">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-cyan-500/20 bg-gradient-to-r from-transparent via-cyan-950/20 to-transparent flex flex-wrap items-center justify-between gap-3 shrink-0 mt-2 relative z-10">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>所有 Key 仅加密留存于您的浏览器 Storage，绝不上传任何第三方</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" />
                已保存配置并切换！
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
            >
              保存并激活引擎配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
