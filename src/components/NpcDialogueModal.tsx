import React, { useState, useEffect, useRef } from 'react';
import type { NPC, Message, GameState, InventoryItem, DialogueChoice, MiniGameType, QuizQuestion, QuizOption } from '../types/game';
import { X, Send, Heart, Volume2, CheckCircle, Trophy, RefreshCw, ChevronRight, ChevronLeft, Coins, Lightbulb, Shield, Zap, Mic, Brain, Swords, ShieldAlert, Lock, Sparkles, Coffee, Compass, Square } from 'lucide-react';
import { NPC_DIALOGUE_TREES, getRandomQuizQuestions, NPC_TRIAL_CONFIG, INITIAL_LOCATIONS, INITIAL_NPCS } from '../data/gameData';
import { speakNpcMessage, stopAllSpeech, subscribeSpeechState } from '../utils/audio';
import { generateNpcResponse, generateNpcResponseWithStatus, getPersonaFallbackResponse } from '../utils/ai';
import {
  MAX_INPUT_PROMPT_LENGTH,
  CREDITS_PER_TIP,
  FAVORABILITY_GAIN_PER_TIP,
  MAX_TIP_FAVORABILITY_CAP,
  MAX_TIPS_PER_NPC,
  DIALOGUE_CREDITS_REWARD,
  AI_CHAT_CREDITS_REWARD,
  FIREWALL_BATTLE_CREDITS_REWARD,
  QUIZ_HINT_COST,
} from '../constants/gameConfig';
import {
  EVERGREEN_CHOICES,
  getEvergreenChoices,
  FIREWALL_BATTLES,
  getSceneThemeConfig,
  type BattleChoice,
} from '../data/dialogueBattles';


interface NpcDialogueModalProps {
  npc: NPC;
  gameState: GameState;
  inventory: InventoryItem[];
  isMuted: boolean;
  onClose: () => void;
  onUpdateFavorability: (npcId: string, delta: number) => void;
  onGainItem: (itemId: string) => void;
  onConsumeItem: (itemId: string) => void;
  onRecordPresentedItem: (npcId: string) => void;
  onTriggerGameVictory?: (endingType?: 'harmony' | 'overload' | 'hermit') => void;
  onSpendCredits?: (cost: number) => boolean;
  onGainCredits?: (amount: number, reason?: string) => void;
  onRecordNpcTip?: (npcId: string) => void;
  onConsumeEnergy?: (amount: number) => void;
  onOpenMiniGame?: (gameType: MiniGameType) => void;
  onRecordMistake?: (reason?: string) => void;
  onRecordBattleComplete?: (npcId: string) => void;
  onRecordClickedChoice?: (choiceId: string) => void;
}


export const NpcDialogueModal: React.FC<NpcDialogueModalProps> = ({
  npc,
  gameState,
  inventory,
  isMuted,
  onClose,
  onUpdateFavorability,
  onGainItem,
  onConsumeItem,
  onRecordPresentedItem,
  onTriggerGameVictory,
  onSpendCredits,
  onGainCredits,
  onRecordNpcTip,
  onConsumeEnergy,
  onOpenMiniGame,
  onRecordMistake,
  onRecordBattleComplete,
  onRecordClickedChoice,
}) => {
  const currentLocation = INITIAL_LOCATIONS.find((l) => l.id === npc.locationId) || INITIAL_LOCATIONS[0];
  const currentFav = gameState.npcFavorability[npc.id] ?? npc.favorability;
  const isPrereqPresented = Boolean(gameState.presentedItems[npc.id] || !npc.prerequisiteItemId);
  const sceneTheme = getSceneThemeConfig(currentLocation.id);
  const trialConfig = NPC_TRIAL_CONFIG[npc.id];

  const [activeQuizQuestions, setActiveQuizQuestions] = useState<QuizQuestion[]>(() => getRandomQuizQuestions(7));
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [hintNotice, setHintNotice] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizPassed, setQuizPassed] = useState<boolean>(false);
  const [scorePercent, setScorePercent] = useState<number>(0);

  // Track used choice IDs so chosen options never reappear repeatedly!
  const [usedChoiceIds, setUsedChoiceIds] = useState<Set<string>>(new Set());

  // Helper: check if choice has been clicked in this game session (persisted or local)
  const isChoiceUsed = (choiceId: string): boolean => {
    return Boolean(gameState.clickedChoiceIds?.[choiceId] || usedChoiceIds.has(choiceId));
  };
  // Auto transition to ending countdown state
  const [autoEndingSeconds, setAutoEndingSeconds] = useState<number | null>(null);
  const targetEndingRef = useRef<'harmony' | 'overload'>('harmony');

  const proceedToEnding = (endingType: 'harmony' | 'overload') => {
    setAutoEndingSeconds(null);
    stopAllSpeech();
    onTriggerGameVictory?.(endingType);
  };

  useEffect(() => {
    if (autoEndingSeconds === null) return;
    if (autoEndingSeconds <= 0) {
      proceedToEnding(targetEndingRef.current);
      return;
    }
    const timer = window.setTimeout(() => {
      setAutoEndingSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [autoEndingSeconds]);

  // Hermit branch confirmation state
  const [confirmingHermit, setConfirmingHermit] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const getInitialGreeting = () => {
    if (npc.prerequisiteItemId && !isPrereqPresented) {
      const prereqItem = inventory.find((i) => i.id === npc.prerequisiteItemId);
      const hasPrereqInBag = (prereqItem?.quantity || 0) > 0;

      if (!hasPrereqInBag) {
        return `⚠️ 【索要前置道具】：${npc.solicitItemText || npc.greeting}`;
      } else {
        return `🔔 【请出示前置道具】：检测到你的背包中有【${prereqItem?.name}】！请选择下方的【出示/奉上】选项进献给我。`;
      }
    }
    return npc.greeting;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'npc',
      npcName: npc.name,
      content: getInitialGreeting(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [allChoices] = useState<DialogueChoice[]>(
    NPC_DIALOGUE_TREES[npc.id] || []
  );

  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const isRecordingExplicitlyRef = useRef(false);
  const recordedTextRef = useRef('');
  const recognitionRef = useRef<any>(null);

  // Dynamic NPC Talking & Animation State
  const [isNpcSpeaking, setIsNpcSpeaking] = useState(false);
  useEffect(() => {
    return subscribeSpeechState((speaking, speakingNpcId) => {
      setIsNpcSpeaking(speaking && (!speakingNpcId || speakingNpcId === npc.id));
    });
  }, [npc.id]);

  // Agent Neural Memory Drawer State
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);

  // Firewall Override Battle State
  const [isHackingMode, setIsHackingMode] = useState(false);
  const [battleRound, setBattleRound] = useState(0);
  const [firewallBreach, setFirewallBreach] = useState(0);
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [battleCompleted, setBattleCompleted] = useState(false);
  const isBattleOverridden = Boolean(gameState.isHackingOverridden?.[npc.id] || battleCompleted);
  const [shuffledBattleChoices, setShuffledBattleChoices] = useState<
    Array<BattleChoice & { label: string }>
  >([]);
  const [wrongAttemptsInRound, setWrongAttemptsInRound] = useState<number>(0);

  // Dynamically shuffle battle choices when entering hacking mode or advancing a round
  useEffect(() => {
    if (isHackingMode && FIREWALL_BATTLES[npc.id]?.[battleRound]) {
      const rawChoices = FIREWALL_BATTLES[npc.id][battleRound].choices;
      const shuffled = [...rawChoices]
        .sort(() => Math.random() - 0.5)
        .map((c, idx) => ({
          ...c,
          label: String.fromCharCode(65 + idx), // 'A', 'B', 'C', 'D'
        }));
      setShuffledBattleChoices(shuffled);
      setWrongAttemptsInRound(0);
    }
  }, [isHackingMode, battleRound, npc.id]);

  // Recording Timer Effect
  useEffect(() => {
    let timer: number | undefined;
    if (isListening) {
      timer = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isListening]);

  const startRecording = () => {
    if (isTyping) return;

    // 玩家开始录音：立即彻底掐断 NPC 任何正在播放或后台生成的语音，防止 AI 声音被麦克风录入！
    stopAllSpeech();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('您的浏览器暂不支持 Web Speech 语音识别，请在 Chrome / Edge 浏览器体验，或使用键盘输入！');
      return;
    }

    try {
      recordedTextRef.current = inputPrompt.trim();
      setInterimTranscript('');
      isRecordingExplicitlyRef.current = true;
      setIsListening(true);
      setRecordingDuration(0);

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true; // Crucial: Continuous listening until player decides to stop
      recognition.interimResults = true; // Stream recognition in real time

      // 玩家发出声音或开始说话时的双重阻断保障
      recognition.onspeechstart = () => {
        stopAllSpeech();
      };
      recognition.onsoundstart = () => {
        stopAllSpeech();
      };

      recognition.onresult = (event: any) => {
        if (!isRecordingExplicitlyRef.current) return;
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            interimChunk += item[0].transcript;
          }
        }

        if (finalChunk) {
          const updated = recordedTextRef.current
            ? `${recordedTextRef.current} ${finalChunk}`.trim()
            : finalChunk.trim();
          recordedTextRef.current = updated.slice(0, MAX_INPUT_PROMPT_LENGTH);
          setInputPrompt(recordedTextRef.current);
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (e: any) => {
        console.warn('[STT Error]', e);
        if (e.error === 'no-speech') return;
      };

      recognition.onend = () => {
        // If player has not clicked stop, auto-resume listening so it never cuts off prematurely
        if (isRecordingExplicitlyRef.current) {
          try {
            recognition.start();
          } catch {
            // Guard against rapid restart exception
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[STT Start Error]', err);
      setIsListening(false);
      isRecordingExplicitlyRef.current = false;
    }
  };

  const stopRecordingAndSend = () => {
    isRecordingExplicitlyRef.current = false;
    setIsListening(false);

    // Stop and abort speech recognition to prevent any trailing events
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort?.();
        recognitionRef.current.stop?.();
      } catch {}
      recognitionRef.current = null;
    }

    // Capture the transcribed text
    const finalText = (recordedTextRef.current || inputPrompt || interimTranscript).trim();

    // Immediately clear all input state so the input box is wiped clean!
    setInputPrompt('');
    recordedTextRef.current = '';
    setInterimTranscript('');

    if (finalText) {
      sendPrompt(finalText);
    } else {
      const sysMsg: Message = {
        id: Date.now().toString(),
        sender: 'system',
        content: '💡 未检测到清晰语音输入，请再次点击语音按钮重试，或直接键盘输入对话心得。',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, sysMsg]);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  };

  // Keyboard shortcuts: [ ` / ~ ] key toggles recording, [ Escape ] closes dialogue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        toggleSpeechRecognition();
      } else if (e.key === 'Escape') {
        window.speechSynthesis?.cancel();
        stopAllSpeech();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentNpcMemories = gameState.npcMemories?.[npc.id] || [
    `初次接入：检测到文明溯源者接入 ${npc.name} 的神经连接`,
    `身份识别：拥有 2050 智能危机特遣专员权限`,
  ];
  const chatEndRef = useRef<HTMLDivElement>(null);

  const lastSpokenTextRef = useRef<string>('');

  const triggerSpeech = (text: string, mutedOverride: boolean = isMuted) => {
    lastSpokenTextRef.current = text;
    speakNpcMessage(npc.id, text, mutedOverride, {
      ttsProvider: gameState.ttsProvider,
      ttsApiKey: gameState.ttsApiKey,
      ttsBaseUrl: gameState.ttsBaseUrl,
      ttsModel: gameState.ttsModel,
    });
  };

  useEffect(() => {
    let isCancelled = false;
    const greeting = messages[0]?.content;
    if (greeting) {
      const timer = window.setTimeout(() => {
        if (!isCancelled) {
          triggerSpeech(greeting, isMuted);
        }
      }, 60);

      return () => {
        isCancelled = true;
        window.clearTimeout(timer);
        stopAllSpeech();
      };
    }
  }, [npc.id, isMuted]);

  useEffect(() => {
    if (!isQuizMode) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [messages, isTyping, isQuizMode, quizSubmitted, currentQuizIndex]);

  // STRICT LIMIT: Never offer more than 3 options at once!
  const getVisibleChoices = (): DialogueChoice[] => {
    // If NPC requires a prerequisite item and player has not presented it yet:
    if (npc.prerequisiteItemId && !isPrereqPresented) {
      const prereqChoice = allChoices.find((c) => c.requiresItem === npc.prerequisiteItemId);
      if (prereqChoice && !isChoiceUsed(prereqChoice.id)) {
        return [prereqChoice];
      }
      return []; // Hide all generic dialogue choices until prerequisite item is presented!
    }

    // Check if the mini-game trial for this NPC has already been completed or discovered:
    const requiredTrial = NPC_TRIAL_CONFIG[npc.id]?.gameType;
    const isTrialDone = requiredTrial ? !!gameState.completedMiniGames?.[requiredTrial] : true;
    const isDiscovered = requiredTrial ? !!gameState.discoveredMiniGames?.[requiredTrial] : false;

    // Easter egg conditions
    const initialBaselineFav = INITIAL_NPCS.find((n) => n.id === npc.id)?.favorability ?? 20;
    const hasInteractedBefore = currentFav > initialBaselineFav;
    const isPlayerEngaged = usedChoiceIds.size >= (npc.prerequisiteItemId ? 2 : 1) || hasInteractedBefore;
    const canShowEasterEgg = !isTrialDone && (isDiscovered || isPlayerEngaged || currentFav >= 100);

    // Regular dialogue choices:
    // 1. Must NOT have been clicked in this game session (persisted via clickedChoiceIds)
    // 2. Exclude easter eggs
    // 3. PERMANENTLY FORBID re-presenting items once prerequisite item has been presented!
    const regularChoices = allChoices.filter((c) => {
      if (isChoiceUsed(c.id)) return false;
      if (c.isEasterEgg || c.triggerMiniGame) return false;
      // If choice is for presenting prerequisite or special quest item, forbid if already presented
      if (c.requiresItem || c.consumesItem) {
        if (isPrereqPresented || gameState.presentedItems?.[npc.id]) {
          return false;
        }
      }
      return true;
    });

    // Easter egg mini-game choice for this NPC:
    const easterEggChoices = allChoices.filter(
      (c) =>
        (c.isEasterEgg || !!c.triggerMiniGame) &&
        !gameState.completedMiniGames?.[c.triggerMiniGame!] &&
        canShowEasterEgg &&
        !isChoiceUsed(c.id)
    );

    // Quiz examiner (steel_soul): show start quiz prominently, lore choices, and evergreen fallback
    if (npc.isQuizExaminer) {
      const quizChoice = regularChoices.find((c) => c.id === 'steel_start_quiz');
      const presentChoice = regularChoices.find((c) => c.id === 'steel_present_chip');
      const otherChoices = regularChoices.filter(
        (c) => c.id !== 'steel_start_quiz' && c.id !== 'steel_present_chip'
      );
      let steelChoices: DialogueChoice[] = [];
      if (presentChoice && !gameState.presentedItems?.[npc.id] && !isChoiceUsed(presentChoice.id)) {
        steelChoices.push(presentChoice);
      }
      if (quizChoice && !isChoiceUsed(quizChoice.id)) {
        steelChoices.push(quizChoice);
      }
      steelChoices.push(...otherChoices);
      if (easterEggChoices.length > 0) {
        steelChoices.unshift(...easterEggChoices);
      }
      const npcEvergreen = getEvergreenChoices(npc.id);
      const availableEvergreen = npcEvergreen.filter((ec) => !isChoiceUsed(ec.id));
      if (steelChoices.length < 3) {
        steelChoices = [...steelChoices, ...availableEvergreen];
      }
      return steelChoices.slice(0, 3);
    }

    // Assemble choices with easter egg integrated naturally
    let combined: DialogueChoice[] = [];
    if (easterEggChoices.length > 0) {
      combined = [...easterEggChoices, ...regularChoices];
    } else {
      combined = [...regularChoices];
    }

    if (combined.length >= 2) {
      return combined.slice(0, 3); // STRICT CAP AT MOST 3 OPTIONS!
    }

    // If regular choices are sparse, fill with unused evergreen choices
    const npcEvergreen = getEvergreenChoices(npc.id);
    const availableEvergreen = npcEvergreen.filter((ec) => !isChoiceUsed(ec.id));
    return [...combined, ...availableEvergreen].slice(0, 3);
  };

  const handleSelectChoice = (choice: DialogueChoice) => {
    if (isTyping) return;

    // Handle hidden mini-game easter egg trigger
    if (choice.triggerMiniGame) {
      const playerMsg: Message = {
        id: Date.now().toString(),
        sender: 'player',
        content: choice.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, playerMsg]);

      setTimeout(() => {
        const npcMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'npc',
          npcName: npc.name,
          content: choice.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, npcMsg]);
        triggerSpeech(choice.response);

        // Open mini-game after a brief delay
        setTimeout(() => {
          onOpenMiniGame?.(choice.triggerMiniGame!);
        }, 1200);
      }, 800);

      // Do NOT permanently consume easter egg choice here!
      // It stays available until actually completed in gameState.completedMiniGames!
      return;
    }

    if (choice.id === 'gw_hermit_path') {
      const playerMsg: Message = {
        id: Date.now().toString(),
        sender: 'player',
        content: choice.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, playerMsg]);
      triggerSpeech('大隐隐于市，在这防空洞泡一辈子盖碗茶、守着这满城灯火，放下浮名就此隐退吧...');
      setTimeout(() => {
        onTriggerGameVictory?.('hermit');
      }, 750);
      return;
    }

    if (choice.id === 'steel_start_quiz') {
      // 1. Check all 3 relic items
      const hasPassCard = inventory.some((i) => i.id === 'pass_card' && i.quantity > 0);
      const hasCyberTea = inventory.some((i) => i.id === 'cyber_tea' && i.quantity > 0);
      const hasChonggangChip = inventory.some((i) => i.id === 'chonggang_chip' && i.quantity > 0);

      if (!hasPassCard || !hasCyberTea || !hasChonggangChip) {
        const missingList: string[] = [];
        if (!hasPassCard) missingList.push('【山城脊梁之竹·前哨共济信物】(+1F 解放碑 棒棒 88 号)');
        if (!hasCyberTea) missingList.push('【大河渔猎之魂·险滩共济碎片】(+8F 李子坝 AI 零号机)');
        if (!hasChonggangChip) missingList.push('【山崖农耕之火·烟火宝典碎片】(-5F 洪崖洞 盖碗姐)');

        const rejectMsg: Message = {
          id: Date.now().toString(),
          sender: 'npc',
          npcName: npc.name,
          content: `【高炉试炼阻断】文明火种尚未齐备！三大前置文明碎片是重启大河主脑的关键密钥！\n\n当前缺失：\n${missingList.map((m) => `• ${m}`).join('\n')}\n\n请速回前置场景探索，达成前置守护者好感度以获取信物！`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, rejectMsg]);
        triggerSpeech('高炉试炼阻断！文明火种尚未齐备，必须集齐全部三大前置文明碎片方可开启试炼！');
        return;
      }

      // 2. Check Steel Soul favorability: must be >= 70
      if (currentFav < 70) {
        const rejectMsg: Message = {
          id: Date.now().toString(),
          sender: 'npc',
          npcName: npc.name,
          content: `【高炉尚未预热】崽儿，急躁乃工匠大忌！当前钢铁共鸣度仅为 ${currentFav}/100。\n\n请先与老夫深入探讨汉阳铁厂西迁大渡口悲壮史、地下钢厂军工防卫与工匠意志（共鸣度需达到 70 以上），高炉方可为你的终极试炼点火！`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, rejectMsg]);
        triggerSpeech('高炉尚未预热！急躁乃工匠大忌，先与老夫深入探讨西迁历史与工匠意志！');
        return;
      }

      // 3. Check High Furnace Forging Mini-game Trial!
      const isForgingDone = gameState.completedMiniGames?.['steel_forging'];
      if (!isForgingDone) {
        const rejectMsg: Message = {
          id: Date.now().toString(),
          sender: 'npc',
          npcName: npc.name,
          content: `【高炉未亲手锻造】崽儿，空谈误国，实干兴邦！\n\n想要开启这七道终极文明记忆试炼，你必须先到 1500°C 量子高炉前，亲手挥动千斤重锤，完成【量子高炉·重工钢铁试炼】！\n\n请在与老夫的探讨选项中寻找【执锤淬火】实操彩蛋，亲自完成操作考验！`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, rejectMsg]);
        triggerSpeech('高炉未亲手锻造！空谈误国，实干兴邦，先去高炉前亲手执锤锻出合格的特种钢！');
        return;
      }

      const random7Questions = getRandomQuizQuestions(7);
      setActiveQuizQuestions(random7Questions);
      setSelectedAnswers({});
      setRevealedHints({});
      setQuizSubmitted(false);
      setQuizPassed(false);
      setIsQuizMode(true);
      setCurrentQuizIndex(0);
      return;
    }

    if (choice.requiresItem) {
      const item = inventory.find((i) => i.id === choice.requiresItem);
      if (!item || item.quantity <= 0) {
        const sysMsg: Message = {
          id: Date.now().toString(),
          sender: 'system',
          content: `❌ 提示：你的背包中缺少【${choice.requiresItem}】，无法选择此项！请先去前置场景获取。`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, sysMsg]);
        return;
      }
    }

    // Mark this choice ID as used so it will NEVER reappear repeatedly!
    setUsedChoiceIds((prev) => new Set([...prev, choice.id]));
    onRecordClickedChoice?.(choice.id);

    if (choice.consumesItem) {
      onConsumeItem(choice.consumesItem);
      onRecordPresentedItem(npc.id);
    } else if (choice.requiresItem) {
      onRecordPresentedItem(npc.id);
    }

    const playerMsg: Message = {
      id: Date.now().toString(),
      sender: 'player',
      content: choice.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, playerMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const bonus = isBattleOverridden ? 1 : 0;
      const actualDelta = choice.favorabilityDelta + bonus;
      const newFav = Math.min(100, Math.max(0, currentFav + actualDelta));
      onUpdateFavorability(npc.id, actualDelta);
      onGainCredits?.(DIALOGUE_CREDITS_REWARD, '文化交流心得');

      let replyText = choice.response;
      if (isBattleOverridden) {
        replyText += `\n\n（🛡️ 逻辑攻防破壁加成：单次对话好感度额外 +1，本次共 +${actualDelta}！）`;
      }

      if (newFav >= 100 && npc.rewardItemId) {
        const rewardItem = inventory.find((i) => i.id === npc.rewardItemId);
        const hasAlreadyReceived = (rewardItem?.quantity ?? 0) > 0 || !!gameState.awardedItems?.[npc.rewardItemId];

        if (rewardItem && !hasAlreadyReceived) {
          if (!npc.prerequisiteItemId || gameState.presentedItems[npc.id] || choice.consumesItem || choice.requiresItem) {
            const requiredTrial = NPC_TRIAL_CONFIG[npc.id]?.gameType;
            const isTrialDone = requiredTrial ? gameState.completedMiniGames?.[requiredTrial] : true;
            if (!isTrialDone) {
              if (npc.id === 'bangbang_88') {
                replyText += `\n\n⚠️【试炼尚未通关】：好小子！咱俩聊得虽然投机，但纸上谈兵可拿不走信物！请在对话选项中寻找【身手一试】挑运实操彩蛋并亲自登顶十八梯，老汉立即将【${rewardItem.name}】双手奉上！`;
              } else if (npc.id === 'gaiwan_jie') {
                replyText += `\n\n⚠️【试炼尚未通关】：客官！咱俩摆得虽然投机，但光听不练可拿不走信物撒！请在对话选项中寻找【掌勺开灶】九宫格火锅实操彩蛋并亲自烫好毛肚，姐立即将【${rewardItem.name}】双手奉上！`;
              } else if (npc.id === 'zero_machine') {
                replyText += `\n\n⚠️【试炼尚未通关】：碳基探索者！理论逻辑数据已充足，但仍需实体动态实操校准！请在对话选项中寻找【全息试驾】实操彩蛋并亲自完成穿楼调度，本中枢立即将【${rewardItem.name}】全息授权给你！`;
              } else if (npc.id === 'steel_soul') {
                replyText += `\n\n⚠️【试炼尚未通关】：好崽儿！空谈误国，实干兴邦！请在对话选项中寻找【执锤淬火】实操彩蛋并亲自登上高炉锻出合格特种钢，老夫立即为你开启终极文明试炼！`;
              } else {
                replyText += `\n\n⚠️【试炼尚未通关】：请先在对话选项中完成实操彩蛋挑战，方可领取信物！`;
              }
            } else {
              replyText += `\n\n✅ 试炼已亲自实操通关，好感度已达 100/100 满分！`;
              onGainItem(npc.rewardItemId);

              // Inline reward system message - no popup, no animation
              setTimeout(() => {
                const rewardMsg: Message = {
                  id: (Date.now() + 2).toString(),
                  sender: 'system',
                  content: `🎁 已获得通关道具【${rewardItem.icon} ${rewardItem.name}】！已存入背包，可继续在此场景探索。`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages((prev) => [...prev, rewardMsg]);
              }, 1200);
            }
          }
        } else if (rewardItem && hasAlreadyReceived) {
          replyText += `\n\n✅ 好感度已达 100/100 满分！你已持有通关信物【${rewardItem.icon} ${rewardItem.name}】。`;
        }
      }

      const npcMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'npc',
        npcName: npc.name,
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, npcMsg]);
      setIsTyping(false);
      triggerSpeech(replyText);
    }, 900);
  };

  const handleTipNpcWithCredits = () => {
    const currentTipCount = gameState.npcTipCounts?.[npc.id] || 0;
    if (currentTipCount >= MAX_TIPS_PER_NPC) {
      const sysMsg: Message = {
        id: Date.now().toString(),
        sender: 'system',
        content: `⚠️ 致意上限：已对【${npc.name}】致意达 ${MAX_TIPS_PER_NPC} 次上限！真正的文化认同与深层信物，无法靠金钱买通，请通过深入对话与关卡实操获取！`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, sysMsg]);
      return;
    }

    if (currentFav >= MAX_TIP_FAVORABILITY_CAP) {
      const sysMsg: Message = {
        id: Date.now().toString(),
        sender: 'system',
        content: `⚠️ 好感上限：通过打赏致意的好感度已达上限（${MAX_TIP_FAVORABILITY_CAP}/100）！【${npc.name}】敬谢你的心意，但通关信物需要通过深度文化探讨与实操试炼来证明！`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, sysMsg]);
      return;
    }

    if (!onSpendCredits) return;
    const success = onSpendCredits(CREDITS_PER_TIP);
    if (!success) {
      const sysMsg: Message = {
        id: Date.now().toString(),
        sender: 'system',
        content: `❌ 提示：你的赛博积分不足 ${CREDITS_PER_TIP} 点，无法致意！完成关卡实操或对话感悟可获取少量积分。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, sysMsg]);
      return;
    }

    onRecordNpcTip?.(npc.id);

    const playerMsg: Message = {
      id: Date.now().toString(),
      sender: 'player',
      content: npc.isQuizExaminer
        ? `🪙 【高炉添炭 ${CREDITS_PER_TIP} 积分】：为重钢地下高炉注入一份高能焦炭！(第 ${currentTipCount + 1}/${MAX_TIPS_PER_NPC} 次)`
        : `🪙 【薄礼致意 ${CREDITS_PER_TIP} 积分】：给 ${npc.name} 敬上一份山城茶点！(第 ${currentTipCount + 1}/${MAX_TIPS_PER_NPC} 次)`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, playerMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const actualGain = Math.min(FAVORABILITY_GAIN_PER_TIP, Math.max(0, MAX_TIP_FAVORABILITY_CAP - currentFav));
      onUpdateFavorability(npc.id, actualGain);
      const nextFavVal = Math.min(100, currentFav + actualGain);
      
      let replyText = '';
      if (npc.id === 'bangbang_88') {
        replyText = `【老汉爽朗一笑】崽儿，老汉谢你的茶水钱！不过咱们棒棒靠膀子力气吃饭，你我交情更看重志同道合。好感度提升 +${actualGain}（当前: ${nextFavVal}/100）。后面的真章，咱还得在十八梯石阶上见！`;
      } else if (npc.id === 'gaiwan_jie') {
        replyText = `【盖碗姐喜笑颜开】弟娃儿耿直撒！这碗赛博沱茶姐请你喝了。好感度提升 +${actualGain}（当前: ${nextFavVal}/100）！剩下的真章咱们龙门阵和九宫格里摆！`;
      } else if (npc.id === 'zero_machine') {
        replyText = `【数据流波纹微漾】物质能源交互确认，神经突触共振微幅提升 +${actualGain}（当前: ${nextFavVal}/100）。提示：逻辑协议信物需实操穿楼调度，无法通过纯积分溢出获取。`;
      } else if (npc.id === 'steel_soul') {
        replyText = `【高炉火光微亮】高炉添炭完成！炉膛炽烈，老夫谢过好崽儿的补给！好感度提升 +${actualGain}（当前: ${nextFavVal}/100）。但记住，重钢的工业火种认的是真才实学与千锤百炼，绝非金钱能通关！`;
      } else {
        replyText = `多谢赏识！收到你的 ${CREDITS_PER_TIP} 赛博致意积分，好感度提升 +${actualGain}！当前好感度: ${nextFavVal}/100！`;
      }

      const npcMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'npc',
        npcName: npc.name,
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, npcMsg]);
      setIsTyping(false);
      triggerSpeech(replyText);
    }, 800);
  };

  const handleBuyQuizHint = (questionId: number) => {
    if (!onSpendCredits) return;
    const success = onSpendCredits(QUIZ_HINT_COST);
    if (success) {
      setRevealedHints((prev) => ({ ...prev, [questionId]: true }));
      setHintNotice(`💡 已消耗 ${QUIZ_HINT_COST} 赛博积分，本题历史文化线索已解锁！`);
      setTimeout(() => setHintNotice(null), 4000);
    } else {
      setHintNotice(`❌ 赛博积分不足 ${QUIZ_HINT_COST} 点！可通过关卡实操或对话感悟赚取积分。`);
      setTimeout(() => setHintNotice(null), 4500);
    }
  };

  const sendPrompt = async (textToSend: string) => {
    const prompt = textToSend.trim();
    if (!prompt || isTyping) return;
    setInputPrompt('');

    const playerMsg: Message = {
      id: Date.now().toString(),
      sender: 'player',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, playerMsg]);
    setIsTyping(true);

    try {
      let replyText = '';
      // 玩家自己输入的内容增加好感度：基础为 +1 点；若已完成逻辑攻防，单次对话好感度多加 +1 点（总计 +2 点）
      const delta = 1 + (isBattleOverridden ? 1 : 0);

      const aiResult = await generateNpcResponseWithStatus(
        {
          provider: gameState.apiProvider || 'gemini',
          apiKey: gameState.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '',
          apiBaseUrl: gameState.apiBaseUrl,
        },
        npc.systemPrompt,
        prompt
      );

      replyText = aiResult.replyText;

      const newFav = Math.min(100, Math.max(0, currentFav + delta));
      onUpdateFavorability(npc.id, delta);
      onGainCredits?.(AI_CHAT_CREDITS_REWARD, '自由交流探讨');

      if (isBattleOverridden) {
        replyText += `\n\n【🛡️ 迷失解除共鸣】自主交流心得共鸣成功，好感度 +1（逻辑攻防破壁额外 +1，本次共 +2）！`;
      } else {
        replyText += `\n\n【💬 自主交流共鸣】自主交流心得已融入神经回路，好感度 +1！`;
      }

      // 若检测到云端大模型接口无法连通，且当前并非主动选择的 mock 引擎，给出友好的本地离线备用提示
      if (aiResult.isOfflineFallback && gameState.apiProvider !== 'mock') {
        replyText += `\n\n💡【本地离线应答提醒】：检测到当前云端大模型接口网络不通（海外网络波动或 Key 额度受限）。NPC 已自动启用【本地高拟真方言记忆库】完成应答！如需开启云端推理，可点击顶部导航栏「AI模型」切换为国内极速直连的【DeepSeek】或【通义千问】。`;
      }

      if (newFav >= 100 && npc.rewardItemId) {
        const rewardItem = inventory.find((i) => i.id === npc.rewardItemId);
        const hasAlreadyReceived = (rewardItem?.quantity ?? 0) > 0 || !!gameState.awardedItems?.[npc.rewardItemId];

        if (rewardItem && !hasAlreadyReceived) {
          if (!npc.prerequisiteItemId || gameState.presentedItems[npc.id]) {
            replyText += `\n\n✅ 好感度已达 100/100 满分！`;
            onGainItem(npc.rewardItemId);

            setTimeout(() => {
              const rewardMsg: Message = {
                id: (Date.now() + 2).toString(),
                sender: 'system',
                content: `🎁 已获得通关道具【${rewardItem.icon} ${rewardItem.name}】！已存入背包，可继续在此场景探索。`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              setMessages((prev) => [...prev, rewardMsg]);
            }, 1200);
          }
        }
      }

      const npcMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'npc',
        npcName: npc.name,
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, npcMsg]);
      triggerSpeech(replyText);
    } catch (error: any) {
      console.warn('[Dialogue Error Handled - Fallback Activated]', error);
      const fallbackReply = getPersonaFallbackResponse(npc.systemPrompt, prompt, true);
      const delta = 1 + (isBattleOverridden ? 1 : 0);
      onUpdateFavorability(npc.id, delta);
      onGainCredits?.(AI_CHAT_CREDITS_REWARD, '自由交流探讨');

      const fullReply = `${fallbackReply}\n\n💡【本地离线应答提醒】：当前云端大模型网络连线受阻，已无缝启用本地备用神经中枢应答！若需恢复云端大模型，可点击顶部「AI模型」切换为国内免梯直连的【DeepSeek】或【通义千问】。`;

      const npcMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'npc',
        npcName: npc.name,
        content: fullReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, npcMsg]);
      triggerSpeech(fallbackReply);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendCustomText = () => {
    sendPrompt(inputPrompt);
  };

  const handleSubmitQuiz = () => {
    if (quizSubmitted) return;

    let correctCount = 0;
    activeQuizQuestions.forEach((q) => {
      const chosenLabel = selectedAnswers[q.id];
      const correctOpt = q.options.find((o) => o.isCorrect);
      if (chosenLabel && correctOpt && chosenLabel === correctOpt.label) {
        correctCount++;
      }
    });

    const totalQuestions = activeQuizQuestions.length;
    const isQuizFlawless = correctCount === totalQuestions;
    if (!isQuizFlawless) {
      onRecordMistake?.(`quiz_flawed_${totalQuestions - correctCount}_errors`);
    }

    const percent = Math.round((correctCount / totalQuestions) * 100);
    setScorePercent(percent);
    setQuizSubmitted(true);

    const priorMistakes = gameState.globalMistakesCount || 0;
    const hasNonHeritageGear = inventory.some(
      (i) => (i.id === 'opera_mask' || i.id === 'hotpot_matrix') && (i.quantity || 0) > 0
    );

    // 只有玩家全局没有犯下任何错误包括小游戏，逻辑攻防和最后的答题并且还要装备非遗物品才进入量子飞升结局
    const isOverloadAchieved = priorMistakes === 0 && isQuizFlawless && hasNonHeritageGear;

    // 7 题及格门槛为 75%（需答对至少 6 题，即 86%）
    if (percent >= 75) {
      setQuizPassed(true);
      if (!gameState.awardedItems?.['chongqing_badge']) {
        onGainItem('chongqing_badge');
      }

      const targetEnding = isOverloadAchieved ? 'overload' : 'harmony';
      targetEndingRef.current = targetEnding;

      const congratulationText = isOverloadAchieved
        ? `轰鸣震颤！恭喜达成全局零失误满分历史共鸣，且检测到已装备巴渝非遗量子造物！1500°C 高炉超临界能量爆发，三大纪元火种彻底归位！正式开启量子飞升！`
        : `轰鸣庆祝！你的记忆共鸣度为 ${percent}%！圆满通过终极文明试炼！三大文明火种全部归位，正式为你颁发【文明溯源者认证勋章】！达成终极通关胜利！`;

      triggerSpeech(
        isOverloadAchieved
          ? congratulationText
          : '轰鸣庆祝！你的记忆共鸣度已圆满通过终极文明试炼！三大文明火种全部归位，正式为你颁发文明溯源者认证勋章！达成终极通关胜利！'
      );

      const npcVictoryMsg: Message = {
        id: Date.now().toString(),
        sender: 'npc',
        npcName: npc.name,
        content: `【终极考核大捷】${congratulationText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, npcVictoryMsg]);

      // Give 18 seconds for full audio (steel_quiz_passed.mp3 is 15.6s) to conclude comfortably, while allowing instant click
      setAutoEndingSeconds(18);
    } else {
      setQuizPassed(false);
      onRecordMistake?.('quiz_failed_score');
      const passCount = Math.ceil(totalQuestions * 0.75);
      triggerSpeech(
        '记忆共鸣度未达到百分之七十五门槛，请仔细查看下方提示解析后，点击重新发起试炼！'
      );
    }
  };

  const handleRetryQuiz = () => {
    const newQuestions = getRandomQuizQuestions(7);
    setActiveQuizQuestions(newQuestions);
    setSelectedAnswers({});
    setRevealedHints({});
    setQuizSubmitted(false);
    setQuizPassed(false);
    setCurrentQuizIndex(0);
  };

  const currentQ = activeQuizQuestions[currentQuizIndex];
  const visibleChoices = getVisibleChoices();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
      {/* Scene Background: placed OUTSIDE the modal window so backdrop-filter can blur it */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={currentLocation.image}
          alt={currentLocation.name}
          className="w-full h-full object-cover filter brightness-110 contrast-125"
        />
        {/* Dark overlay so the blurred scene doesn't overpower the UI */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Dynamic Ambient Neon Backlight for Glassmorphism Refraction */}
      <div
        className="absolute w-[600px] h-[400px] rounded-full blur-[100px] opacity-30 pointer-events-none animate-pulse"
        style={{
          background: `radial-gradient(circle, ${sceneTheme.cornerColor} 0%, transparent 70%)`,
          animationDuration: '6s',
        }}
      />

      {/* Cyberpunk Scene-Specific HUD Dialogue Window with True Frosted Glass */}
      <div className={`relative w-full max-w-5xl xl:max-w-6xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.7)] flex flex-col h-full md:h-[720px] overflow-hidden dialogue-scanline-bg ${sceneTheme.frameClass}`}>
        {/* Specular Glass Top Highlight Edge */}
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-30" />

        {/* Tactical HUD Corner Reticles [ + ] */}
        <div
          className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 pointer-events-none z-30"
          style={{ borderColor: sceneTheme.cornerColor }}
        />
        <div
          className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 pointer-events-none z-30"
          style={{ borderColor: sceneTheme.cornerColor }}
        />
        <div
          className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 pointer-events-none z-30"
          style={{ borderColor: sceneTheme.cornerColor }}
        />
        <div
          className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 pointer-events-none z-30"
          style={{ borderColor: sceneTheme.cornerColor }}
        />

        {/* Inner vignette gradient for depth — scene bg is now OUTSIDE the window behind backdrop-filter */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#090d14]/20 to-[#090d14]/50 pointer-events-none" />

        {/* Modal Header with Gradient Frosted Glass */}
        {/* Modal Header with Gradient Frosted Glass - Fully Responsive */}
        <div className="relative z-10 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/15 bg-gradient-to-r from-slate-950/40 via-[#0b1328]/45 to-slate-950/40 backdrop-blur-xl gap-2 sm:gap-3 shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
          {/* Left: NPC Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900 border p-[1.5px] shrink-0 transition-all duration-300 ${sceneTheme.borderAccent} ${
              isNpcSpeaking ? 'ring-2 ring-amber-400/90 shadow-[0_0_24px_rgba(251,191,36,0.65)]' : 'shadow-md'
            }`}>
              {/* Talking Soundwave Halo Ripples */}
              {isNpcSpeaking && (
                <>
                  <span className="npc-soundwave-ripple" style={{ color: sceneTheme.cornerColor || '#f59e0b' }} />
                  <span className="npc-soundwave-ripple-2" style={{ color: sceneTheme.cornerColor || '#f59e0b' }} />
                </>
              )}
              <div className="w-full h-full rounded-[10px] overflow-hidden relative">
                <img
                  src={npc.avatar}
                  alt={npc.name}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isNpcSpeaking ? 'npc-avatar-speaking scale-105 brightness-110' : ''
                  }`}
                />
                {isNpcSpeaking && <div className="npc-hologram-sweep" />}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                <h3 className="font-bold text-slate-100 text-xs sm:text-base tracking-wide truncate max-w-[100px] sm:max-w-none">{npc.name}</h3>
                <span className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-mono font-semibold rounded border whitespace-nowrap ${sceneTheme.badgeBg}`}>
                  {sceneTheme.seal}
                </span>
                {npc.id !== 'bangbang_88' && !npc.isQuizExaminer && (
                  <span className={`hidden sm:inline-block px-1.5 sm:px-2 py-0.5 text-[10px] font-mono font-bold rounded border whitespace-nowrap ${
                    currentFav >= 100 
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                      : isBattleOverridden
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                      : 'bg-rose-950/80 text-rose-300 border-rose-500/40 animate-pulse'
                  }`}>
                    {currentFav >= 100 ? '✨ 已唤醒' : isBattleOverridden ? '🛡️ 迷失解除' : '⚠️ 迷失态'}
                  </span>
                )}
                {isNpcSpeaking ? (
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.5)] whitespace-nowrap shrink-0">
                    <span className="w-0.5 h-2 bg-amber-400 rounded-sm animate-eq-1 inline-block" />
                    <span className="w-0.5 h-3.5 bg-amber-300 rounded-sm animate-eq-2 inline-block" />
                    <span className="w-0.5 h-2 bg-amber-400 rounded-sm animate-eq-3 inline-block" />
                    <span className="ml-0.5 text-[9px] font-bold">讲话中</span>
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="VOICE_LIVE 实时语音连线就绪" />
                )}
              </div>
              <p className={`text-[10px] sm:text-xs font-medium mt-0.5 truncate max-w-[160px] sm:max-w-none ${sceneTheme.textAccent}`}>
                {isBattleOverridden ? npc.title.replace('处于逻辑迷失态', '逻辑纠偏完成 · 正常运转') : npc.title}
              </p>
            </div>
          </div>

          {/* Desktop Right Toolbar (Visible on screens >= md) */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto flex-nowrap">
            {/* Neural Memory Drawer Button */}
            <button
              onClick={() => setShowMemoryDrawer(!showMemoryDrawer)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 shadow-sm whitespace-nowrap cursor-pointer active:scale-95 ${
                showMemoryDrawer
                  ? 'bg-purple-900/80 text-purple-200 border-purple-500'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-purple-300 border-purple-500/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
              }`}
              title="查看当前智能体短期与长期神经记忆"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>记忆 ({currentNpcMemories.length})</span>
            </button>

            {/* Firewall Battle Mode Button */}
            {FIREWALL_BATTLES[npc.id] && currentFav < 100 && !gameState.isHackingOverridden?.[npc.id] && (
              npc.prerequisiteItemId && !isPrereqPresented ? (
                <div
                  className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-[11px] font-medium flex items-center gap-1 cursor-not-allowed opacity-60 whitespace-nowrap shadow-sm"
                  title="需先向前置守护者出示信物建立神经握手，方可解锁逻辑攻防"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>攻防锁定</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsHackingMode(!isHackingMode);
                    setBattleRound(0);
                    setFirewallBreach(0);
                    setBattleCompleted(false);
                    setBattleLogs(['【攻防就绪】接入失控神经逻辑端口，准备进行策略纠偏！']);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 shadow-sm whitespace-nowrap cursor-pointer active:scale-95 ${
                    isHackingMode
                      ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                      : 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border-rose-500/40'
                  }`}
                  title="进入失控AI逻辑纠偏攻防战"
                >
                  <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{isHackingMode ? '退出攻防' : '⚔️ 逻辑攻防'}</span>
                </button>
              )
            )}

            {(() => {
              const currentTipCount = gameState.npcTipCounts?.[npc.id] || 0;
              const isTipLimit = currentTipCount >= MAX_TIPS_PER_NPC;
              const isCapReached = currentFav >= MAX_TIP_FAVORABILITY_CAP;
              const isDisabled = isTipLimit || isCapReached;

              let tipButtonLabel = npc.isQuizExaminer
                ? `高炉添炭 (+${FAVORABILITY_GAIN_PER_TIP})`
                : `致意 (+${FAVORABILITY_GAIN_PER_TIP})`;
              let tipTooltip = npc.isQuizExaminer
                ? `为重钢高炉添炭 (${CREDITS_PER_TIP} 积分获得 +${FAVORABILITY_GAIN_PER_TIP} 好感度，限 ${MAX_TIPS_PER_NPC} 次)`
                : `薄礼致意 (${CREDITS_PER_TIP} 积分获得 +${FAVORABILITY_GAIN_PER_TIP} 好感度，限 ${MAX_TIPS_PER_NPC} 次)`;

              if (isTipLimit) {
                tipButtonLabel = `致意已达上限(${currentTipCount}/${MAX_TIPS_PER_NPC})`;
                tipTooltip = `已达致意次数上限（最多 ${MAX_TIPS_PER_NPC} 次）。真正的认同需通过深入对话与关卡试炼！`;
              } else if (isCapReached) {
                tipButtonLabel = `好感已达致意上限(${MAX_TIP_FAVORABILITY_CAP}%)`;
                tipTooltip = `打赏好感度已达 ${MAX_TIP_FAVORABILITY_CAP}% 上限。后续好感度请通过文化探讨与试炼提升！`;
              }

              return (
                <button
                  onClick={handleTipNpcWithCredits}
                  disabled={isDisabled}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 shadow-sm whitespace-nowrap active:scale-95 ${
                    isDisabled
                      ? 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                      : 'bg-white/[0.08] hover:bg-white/[0.14] text-amber-300 border-amber-500/35 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
                  }`}
                  title={tipTooltip}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{tipButtonLabel}</span>
                </button>
              );
            })()}

            {/* Favorability Capsule Badge + Progress Bar */}
            <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur-xl px-2.5 py-1 rounded-full border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] shrink-0">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/80 shrink-0" />
              <span className="text-[11px] font-bold text-amber-300 font-mono whitespace-nowrap">{currentFav}/100</span>
              <div className="w-10 sm:w-14 bg-slate-900/90 rounded-full h-1.5 border border-white/10 overflow-hidden shrink-0">
                <div
                  className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, currentFav)}%` }}
                />
              </div>
              {currentFav >= 100 && (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>

            {/* Desktop Circular iOS Close Button */}
            <button
              onClick={() => {
                window.speechSynthesis?.cancel();
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] shrink-0 cursor-pointer ml-1"
              title="关闭对话"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Right Controls: Always pinned Close [X] + Compact Favorability Badge */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0 ml-auto">
            {/* Compact Mobile Favorability */}
            <div className="flex items-center gap-1 bg-black/45 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 text-[10px] font-mono font-bold text-amber-300 shadow-inner">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500/80 shrink-0" />
              <span>{currentFav}</span>
            </div>

            {/* Mobile Close Button - Circular iOS pill */}
            <button
              onClick={() => {
                window.speechSynthesis?.cancel();
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white border border-white/20 flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-all"
              title="关闭对话"
              aria-label="关闭对话"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Secondary Tactical Action Bar (Visible only on < md) */}
        <div className="relative z-10 flex md:hidden items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl overflow-x-auto custom-scrollbar shrink-0 shadow-inner">
          {/* Mobile Memory Button */}
          <button
            onClick={() => setShowMemoryDrawer(!showMemoryDrawer)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors flex items-center gap-1 shrink-0 ${
              showMemoryDrawer
                ? 'bg-purple-900/80 text-purple-200 border-purple-500'
                : 'bg-slate-900 text-purple-300 border-purple-500/30'
            }`}
          >
            <Brain className="w-3 h-3 text-purple-400 shrink-0" />
            <span>记忆 ({currentNpcMemories.length})</span>
          </button>

          {/* Mobile Firewall Battle Button */}
          {FIREWALL_BATTLES[npc.id] && currentFav < 100 && !gameState.isHackingOverridden?.[npc.id] && (
            npc.prerequisiteItemId && !isPrereqPresented ? (
              <div className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-medium flex items-center gap-1 opacity-60 shrink-0">
                <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                <span>攻防锁定</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsHackingMode(!isHackingMode);
                  setBattleRound(0);
                  setFirewallBreach(0);
                  setBattleCompleted(false);
                  setBattleLogs(['【攻防就绪】接入失控神经逻辑端口，准备进行策略纠偏！']);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                  isHackingMode
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                    : 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                }`}
              >
                <Swords className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{isHackingMode ? '退出攻防' : '⚔️ 攻防'}</span>
              </button>
            )
          )}

          {/* Mobile Tip Button */}
          {(() => {
            const currentTipCount = gameState.npcTipCounts?.[npc.id] || 0;
            const isTipLimit = currentTipCount >= MAX_TIPS_PER_NPC;
            const isCapReached = currentFav >= MAX_TIP_FAVORABILITY_CAP;
            const isDisabled = isTipLimit || isCapReached;

            let tipLabel = npc.isQuizExaminer ? `添炭(+${FAVORABILITY_GAIN_PER_TIP})` : `致意(+${FAVORABILITY_GAIN_PER_TIP})`;
            if (isTipLimit) tipLabel = `致意已满`;
            else if (isCapReached) tipLabel = `好感已满`;

            return (
              <button
                onClick={handleTipNpcWithCredits}
                disabled={isDisabled}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors flex items-center gap-1 shrink-0 ${
                  isDisabled
                    ? 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60'
                    : 'bg-slate-900 text-amber-300 border-amber-500/30'
                }`}
              >
                <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{tipLabel}</span>
              </button>
            );
          })()}

          {/* Mobile Progress Bar Fill */}
          <div className="flex items-center gap-1 bg-[#06090e] px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 shrink-0 ml-auto">
            <span>好感:</span>
            <div className="w-12 bg-slate-900 rounded-full h-1 border border-slate-800 overflow-hidden shrink-0">
              <div
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, currentFav)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Location Cyber Telemetry Banner */}
        <div className={`relative z-10 border-b px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-mono leading-relaxed flex items-center justify-between font-light shrink-0 ${sceneTheme.bannerBg}`}>
          <div className="flex items-start sm:items-center gap-1.5 sm:gap-2.5">
            <Compass className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 sm:mt-0 ${sceneTheme.textAccent}`} />
            <span className="line-clamp-2 sm:line-clamp-none">【{currentLocation.name} ({currentLocation.level})】{npc.culturalBackground}</span>
          </div>
        </div>

        {/* Neural Memory Drawer Overlay */}
        {showMemoryDrawer && (
          <div className="relative z-20 bg-[#080c16] border-b border-purple-500/40 p-3.5 sm:p-4 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>智能体神经记忆脑图 (Agent Neural Memory Store)</span>
              </span>
              <button
                onClick={() => setShowMemoryDrawer(false)}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
              >
                收起
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] max-h-36 overflow-y-auto pr-1">
              {currentNpcMemories.map((mem, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-[#0e1424] border border-purple-500/20 text-slate-300 font-mono flex items-start gap-1.5">
                  <span className="text-purple-400 font-bold select-none">#0{idx + 1}</span>
                  <span className="leading-snug">{mem}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              💡 智能体会根据历史交流记忆动态调整 Prompt 思维链，NPC 之间已打通线索共识。
            </p>
          </div>
        )}

        {isHackingMode ? (
          /* Firewall Battle Arena */
          <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#060810]/95 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Battle Header Status */}
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-rose-300 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span>失控 AI 神经攻防对抗 // ROUND {battleRound + 1} / 3</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">运用人类独有的共情、协作与坚韧策略，瓦解迷失逻辑防火墙！</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    破壁度: {firewallBreach}%
                  </div>
                  <div className="w-24 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800 mt-1">
                    <div className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300" style={{ width: `${firewallBreach}%` }} />
                  </div>
                </div>
              </div>

              {/* AI Glitch Attack Box */}
              {!battleCompleted && FIREWALL_BATTLES[npc.id]?.[battleRound] ? (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-rose-950/60 via-[#101424] to-[#0a0d16] border-2 border-rose-500/60 rounded-2xl space-y-2.5 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold">
                    <ShieldAlert className="w-4 h-4 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{npc.name} 迷失算力脉冲质询：</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 font-light leading-relaxed">
                    {FIREWALL_BATTLES[npc.id][battleRound].aiPrompt}
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-emerald-950/60 border-2 border-emerald-500/60 rounded-2xl text-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                  <h3 className="text-base font-bold text-emerald-300">🎉 神经防火墙全面破壁！</h3>
                  <p className="text-xs text-slate-300">
                    {npc.name} 的底层虚无死锁已被成功纠偏！认知重构完成，好感度 +25！
                  </p>
                  <button
                    onClick={() => setIsHackingMode(false)}
                    className="mt-2 px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 cursor-pointer"
                  >
                    返回常态交流
                  </button>
                </div>
              )}

              {/* Battle Logs Stream */}
              <div className="bg-[#05070d] p-3 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1 max-h-24 overflow-y-auto">
                {battleLogs.map((log, i) => (
                  <div key={i} className="text-slate-300 leading-snug">{log}</div>
                ))}
              </div>
            </div>

            {/* Tactical Human Counter-measures */}
            {!battleCompleted && FIREWALL_BATTLES[npc.id]?.[battleRound] && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-mono text-amber-300">
                  ⚡ 请选择人类策略反制逻辑：
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {shuffledBattleChoices.map((choice) => (
                    <button
                      key={choice.label}
                      onClick={() => {
                        if (choice.isCorrect) {
                          const nextBreach = Math.min(100, Math.max(0, firewallBreach + choice.boost));
                          setFirewallBreach(nextBreach);
                          setBattleLogs((prev) => [choice.reply, ...prev]);

                          if (battleRound < 2) {
                            setBattleRound((prev) => prev + 1);
                          } else {
                            setBattleCompleted(true);
                            const nextFav = Math.min(100, currentFav + 35);
                            onUpdateFavorability(npc.id, 35);
                            onGainCredits?.(FIREWALL_BATTLE_CREDITS_REWARD, '逻辑纠偏胜利');
                            onRecordBattleComplete?.(npc.id);
                            triggerSpeech('逻辑防火墙全面破壁！底层虚无死锁已解除，认知重构完成！好感共鸣飙升 +35！');

                            const victorySysMsg: Message = {
                              id: (Date.now() + 1).toString(),
                              sender: 'system',
                              content: `🛡️【逻辑攻防胜利 · 迷失状态解除】\n${npc.name} 的逻辑防火墙已全面破壁，底层逻辑迷失状态彻底解除！好感度 +35！\n✨ 特权生效：后续与 ${npc.name} 的任意单次对话（包括自主输入及选项），好感度均额外 +1！`,
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            };
                            setMessages((prev) => [...prev, victorySysMsg]);

                            if (nextFav >= 100 && npc.rewardItemId) {
                              const rewardItem = inventory.find((i) => i.id === npc.rewardItemId);
                              const hasAlreadyReceived = (rewardItem?.quantity ?? 0) > 0 || !!gameState.awardedItems?.[npc.rewardItemId];
                              if (rewardItem && !hasAlreadyReceived) {
                                onGainItem(npc.rewardItemId);
                              }
                            }
                          }
                        } else {
                          onRecordMistake?.('firewall_wrong_choice');
                          const nextBreach = Math.max(0, firewallBreach - 25);
                          setFirewallBreach(nextBreach);
                          const newWrong = wrongAttemptsInRound + 1;
                          setWrongAttemptsInRound(newWrong);
                          onConsumeEnergy?.(5);

                          if (newWrong >= 2) {
                            setBattleLogs((prev) => [
                              '🚨【神经链路过载死锁】连续偏离人本逻辑！防火墙启动自愈，本轮重置！',
                              choice.reply,
                              ...prev,
                            ]);
                            setFirewallBreach(0);
                            setWrongAttemptsInRound(0);
                            if (FIREWALL_BATTLES[npc.id]?.[battleRound]) {
                              const rawChoices = FIREWALL_BATTLES[npc.id][battleRound].choices;
                              const reShuffled = [...rawChoices]
                                .sort(() => Math.random() - 0.5)
                                .map((c, idx) => ({
                                  ...c,
                                  label: String.fromCharCode(65 + idx),
                                }));
                              setShuffledBattleChoices(reShuffled);
                            }
                            const overloadVoiceMap: Record<string, string> = {
                              bangbang_88: '哎呀崽儿，扁担滑脱咯！莫急莫躁，歇口气咱重新爬这道坎！',
                              gaiwan_jie: '哎哟喂，心浮气躁咯撒！连碗盖都刮翻了，喝口清茶咱们重新摆！',
                              zero_machine: '神经回路过载死锁！大河防火墙自愈重构，请平复心智重新校准！',
                              steel_soul: '急躁乃工匠大忌！高炉气压暴冲，深呼吸沉下心来，重新淬火！',
                            };
                            triggerSpeech(overloadVoiceMap[npc.id] || '神经回路过载死锁！防火墙自愈重构，请平复心智重新校准！');
                          } else {
                            setBattleLogs((prev) => [
                              `⚠️【算力脉冲反噬】义体能量 -5，防御进度回退 25%！(${newWrong}/2 次失误即死锁)`,
                              choice.reply,
                              ...prev,
                            ]);
                            const penaltyVoiceMap: Record<string, string> = {
                              bangbang_88: '崽儿，莫慌！步子迈虚了，稳住重心再上！',
                              gaiwan_jie: '客官莫急，茶汤晃洒咯！稳住心神再来！',
                              zero_machine: '警告：算力脉冲反噬，人本逻辑出现偏离！',
                              steel_soul: '崽儿！手力虚浮，铁砧回弹！屏气凝神再砸！',
                            };
                            triggerSpeech(penaltyVoiceMap[npc.id] || '算力脉冲反噬，逻辑偏离！');
                          }
                        }
                      }}
                      className="p-3 rounded-xl bg-[#101422] hover:bg-[#182032] border border-slate-700/80 hover:border-amber-500/60 text-left text-xs text-slate-200 transition-all flex items-start gap-2.5 cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {choice.label}
                      </span>
                      <span className="leading-snug font-light">{choice.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Normal Stream Container */}
            <div ref={containerRef} className="relative z-10 flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {!isQuizMode ? (
            messages.map((msg) => {
              const isNpc = msg.sender === 'npc';
              const isSys = msg.sender === 'system';

              if (isSys) {
                return (
                  <div key={msg.id} className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2.5 shadow-sm">
                    <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{msg.content}</span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isNpc ? 'justify-start' : 'justify-end'}`}
                >
                  {isNpc && (
                    <div className={`w-9 h-9 rounded-xl bg-slate-900 border p-[1px] flex-shrink-0 overflow-hidden ${sceneTheme.borderAccent}`}>
                      <img src={npc.avatar} alt={npc.name} className="w-full h-full object-cover rounded-[10px]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed backdrop-blur-2xl ${
                      isNpc
                        ? 'bg-gradient-to-br from-slate-900/50 via-[#0a1222]/55 to-slate-950/65 text-slate-200 border border-white/20 rounded-tl-none shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                        : 'bg-gradient-to-br from-cyan-950/50 via-[#08182b]/55 to-slate-900/65 text-slate-100 border border-cyan-400/35 rounded-tr-none shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                    }`}
                  >
                    {isNpc && (
                      <div className="text-xs font-semibold text-amber-400/90 mb-1.5 flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span>{msg.npcName} · {npc.title}</span>
                        </span>
                        <button
                          onClick={() => triggerSpeech(msg.content, false)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors font-mono"
                          title="朗读语音"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-amber-400/90" />
                          <span>REPLAY</span>
                        </button>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed mt-1 font-light">{msg.content}</p>
                    <div className="text-[10px] text-right mt-1.5 opacity-50 font-mono">{msg.timestamp}</div>
                  </div>

                  {!isNpc && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold flex items-center justify-center text-xs flex-shrink-0 font-mono">
                      PILOT
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* Interactive Chongqing Cultural Quiz */
            <div className="space-y-6">
              <div className="p-4 sm:p-5 bg-[#10141e] rounded-2xl border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h4 className="font-bold text-amber-300 text-base flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>【山城量子内核 · 纪元历史记忆共鸣试炼】</span>
                  </h4>
                  <span className="text-xs text-amber-300 bg-[#06090e] px-2.5 py-1 rounded-lg border border-slate-800 font-semibold font-mono">
                    THRESHOLD ≥ 75%
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                  从 20 道大河文明题库中随机抽取 7 道进行考核（所有答案皆可从各关卡 NPC 对话中获得）。回答关于解放碑抗战地标、李子坝单轨工程、十八梯棒棒民俗、洪崖洞吊脚楼、川江大河水运与重钢西迁工业变革的深度考题。
                </p>
              </div>

              {/* Stepper Tabs */}
              <div className="flex items-center justify-between bg-[#06090e] p-2 sm:p-2.5 rounded-xl border border-slate-800 flex-wrap gap-2">
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium ml-2 font-mono">TEST_PROGRESS:</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {activeQuizQuestions.map((q, idx) => {
                    const isAnswered = !!selectedAnswers[q.id];
                    const isCurrent = currentQuizIndex === idx;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuizIndex(idx)}
                        className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-colors flex items-center gap-1 sm:gap-1.5 font-mono ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : isAnswered
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : 'bg-[#10141e] text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span>Q{idx + 1}</span>
                        {isAnswered && <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 inline" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Single Active Question Card */}
              {currentQ && (
                <div className="p-4 sm:p-5 bg-[#10141e] rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] sm:text-xs font-semibold text-amber-300 bg-[#06090e] px-2.5 py-1 rounded-lg border border-slate-800">
                        📍 {currentQ.locationName} 专属风貌考题
                      </span>
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        🪙 拥有积分: {gameState.cyberCredits}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!revealedHints[currentQ.id] ? (
                        <button
                          onClick={() => handleBuyQuizHint(currentQ.id)}
                          disabled={quizSubmitted}
                          className="text-[11px] sm:text-xs bg-[#06090e] hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-500/70 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer disabled:opacity-50"
                          title={`消耗 ${QUIZ_HINT_COST} 积分获取历史文化推理线索`}
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>购买线索 ({QUIZ_HINT_COST}积分)</span>
                        </button>
                      ) : (
                        <span className="text-[11px] sm:text-xs bg-amber-950/60 text-amber-300 border border-amber-500/50 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>文化线索已解锁</span>
                        </span>
                      )}

                      <span className="text-[11px] sm:text-xs font-semibold text-slate-300 bg-[#06090e] px-2 py-1 rounded-md border border-slate-800 font-mono">
                        {currentQuizIndex + 1}/{activeQuizQuestions.length}
                      </span>
                    </div>
                  </div>

                  {hintNotice && (
                    <div className="p-2.5 bg-[#0a0f1d] border border-amber-500/50 rounded-xl text-xs text-amber-300 font-mono flex items-center justify-between shadow-md">
                      <span>{hintNotice}</span>
                      <button onClick={() => setHintNotice(null)} className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer">✕</button>
                    </div>
                  )}

                  <h3 className="font-bold text-sm sm:text-base text-slate-100 leading-snug">
                    {currentQ.question}
                  </h3>

                  {/* Cultural Hint Clue Box */}
                  {revealedHints[currentQ.id] && currentQ.hintClue && (
                    <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs text-amber-200 leading-relaxed flex items-start gap-2.5 shadow-inner">
                      <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-300 text-xs mb-1">📜 溯源智库 · 历史文化线索提示：</div>
                        <p className="font-light text-slate-200 leading-relaxed">{currentQ.hintClue}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {currentQ.options.map((opt) => {
                      const isSelected = selectedAnswers[currentQ.id] === opt.label;
                      const isPostCorrect = quizSubmitted && opt.isCorrect;
                      const isPostWrong = quizSubmitted && isSelected && !opt.isCorrect;

                      return (
                        <button
                          key={opt.label}
                          onClick={() =>
                            !quizSubmitted &&
                            setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: opt.label }))
                          }
                          disabled={quizSubmitted}
                          className={`w-full text-left p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-medium transition-colors flex items-center justify-between ${
                            isPostCorrect
                              ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                              : isPostWrong
                              ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                              : isSelected
                              ? 'bg-slate-800 border-amber-500/80 text-amber-200 ring-1 ring-amber-500/40'
                              : 'bg-[#06090e] border-slate-800/90 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <strong className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center text-[10px] sm:text-xs font-mono ${
                              isPostCorrect
                                ? 'bg-emerald-900 border-emerald-400 text-emerald-200'
                                : isPostWrong
                                ? 'bg-rose-900 border-rose-400 text-rose-200'
                                : isSelected
                                ? 'bg-amber-950 border-amber-400 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}>
                              {opt.label}
                            </strong>
                            <span className="leading-snug font-light">{opt.text}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => setCurrentQuizIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuizIndex === 0}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-[11px] sm:text-xs font-medium flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>上一题</span>
                    </button>

                    {currentQuizIndex < activeQuizQuestions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuizIndex((prev) => Math.min(activeQuizQuestions.length - 1, prev + 1))}
                        className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] sm:text-xs flex items-center gap-1 border border-slate-700"
                      >
                        <span>下一题</span>
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    ) : (
                      <span className="text-[11px] sm:text-xs text-amber-400/90 font-medium">题目已展示完毕，即可提交</span>
                    )}
                  </div>

                  {quizSubmitted && (
                    <div className="mt-2 p-3 bg-[#06090e] rounded-xl text-[11px] sm:text-xs text-slate-300 leading-snug border border-slate-800 font-light">
                      💡 <strong>解析：</strong>{currentQ.explanation}
                    </div>
                  )}
                </div>
              )}

              {quizSubmitted && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border text-sm ${
                    quizPassed
                      ? 'bg-[#090d18] border-amber-500/60 shadow-2xl'
                      : 'bg-slate-900 border-amber-500/50 text-amber-300 text-center'
                  }`}
                >
                  {quizPassed ? (
                    (() => {
                      const priorMistakes = gameState.globalMistakesCount || 0;
                      const hasNonHeritageGear = inventory.some(
                        (i) => (i.id === 'opera_mask' || i.id === 'hotpot_matrix') && (i.quantity || 0) > 0
                      );
                      const isOverloadAchieved = priorMistakes === 0 && scorePercent === 100 && hasNonHeritageGear;

                      if (isOverloadAchieved) {
                        return (
                          <div className="space-y-4">
                            <div className="text-center pb-2 border-b border-fuchsia-900/60">
                              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-fuchsia-950/90 border border-fuchsia-500/60 text-fuchsia-300 text-xs font-bold font-mono mb-2 shadow-[0_0_20px_rgba(217,70,239,0.35)]">
                                <Zap className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                                <span>⚡ 唯一判定达成 // 全局零失误 + 100%满分共鸣 + 非遗造物共振</span>
                              </div>
                              <h3 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-200 to-cyan-300 drop-shadow-[0_0_25px_rgba(217,70,239,0.5)]">
                                量子高炉超临界爆发 · 赛博龙魂觉醒！
                              </h3>
                              <p className="text-xs sm:text-sm text-fuchsia-200/90 mt-1.5 font-light max-w-xl mx-auto leading-relaxed">
                                全局零失误，100% 满分答卷引爆非遗量子造物共振！1500°C 粒子裂变冲破临界点，正在直接接入终局...
                              </p>
                            </div>

                            {/* Sole Grand Overload Action Card */}
                            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#200d30] via-[#14081e] to-[#090310] border border-fuchsia-500/70 shadow-[0_0_40px_rgba(217,70,239,0.3)] flex flex-col sm:flex-row items-center justify-between gap-5">
                              <div className="flex items-start gap-4 text-left">
                                <div className="p-3.5 rounded-2xl bg-fuchsia-950/90 border border-fuchsia-500/50 text-fuchsia-300 shrink-0 shadow-inner">
                                  <Zap className="w-8 h-8 text-fuchsia-400 animate-pulse" />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <h4 className="font-black text-base sm:text-lg text-white">
                                      【量子飞升 · 赛博龙魂纪元】
                                    </h4>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/50 font-bold">
                                      ★ 隐藏超神终局
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                                    十亿纯净代码化身金色巨龙腾跃嘉陵江，单轨穿楼作龙甲，电光如瀑贯长川！加冕全球 AGI 超维领航者！
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => proceedToEnding('overload')}
                                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(217,70,239,0.6)] shrink-0 animate-pulse cursor-pointer transition-all hover:scale-105 active:scale-95"
                              >
                                <Zap className="w-4 h-4 animate-bounce" />
                                <span>开启量子飞升终局 {autoEndingSeconds !== null ? `(${autoEndingSeconds}s)` : ''}</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Normal / Canonical Ending: Harmony (>= 75%, and not qualifying for overload)
                      return (
                        <div className="space-y-4">
                          <div className="text-center pb-2 border-b border-cyan-900/60">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-bold font-mono mb-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                              <Trophy className="w-4 h-4 text-cyan-400" />
                              <span>🎉 试炼圆满通过 // 共鸣度: {scorePercent}% (≥75%及格标准)</span>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-black text-amber-300 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                              三大文明火种彻底共鸣，觉醒智能核心已苏醒！
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-light max-w-xl mx-auto leading-relaxed">
                              你成功化解了智能实体的逻辑死锁，唤醒了人机共存的人文底色。正在直接接入盛世如愿终局...
                            </p>
                          </div>

                          {/* Sole Grand Harmony Action Card */}
                          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#091829] via-[#06101c] to-[#03080e] border border-cyan-500/60 shadow-[0_0_40px_rgba(6,182,212,0.25)] flex flex-col sm:flex-row items-center justify-between gap-5">
                            <div className="flex items-start gap-4 text-left">
                              <div className="p-3.5 rounded-2xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 shrink-0 shadow-inner">
                                <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h4 className="font-black text-base sm:text-lg text-white">
                                    【盛世如愿 · 人机共生纪元】
                                  </h4>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold">
                                    ★ 正统史诗终局
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                                  大河之魂破浪同舟、悬崖吊脚万家灯火、工业百年烈火重铸。全球危机彻底化解，人机并肩共创未来！
                                </p>
                                <div className="text-[11px] font-mono text-slate-400 pt-1">
                                  💡 终局溯源：
                                  {priorMistakes > 0
                                    ? `本局全局曾累计 ${priorMistakes} 次失误（小游戏/逻辑攻防/答题）；`
                                    : scorePercent < 100
                                    ? `本次答题未获 100% 满分（${scorePercent}%）；`
                                    : !hasNonHeritageGear
                                    ? `未装备非遗量子信物（川剧面具/老火锅底料）；`
                                    : ''}
                                  已直接接入正统史诗终局。
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => proceedToEnding('harmony')}
                              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.5)] shrink-0 animate-pulse cursor-pointer transition-all hover:scale-105 active:scale-95"
                            >
                              <Sparkles className="w-4 h-4 animate-spin" />
                              <span>开启盛世如愿终局 {autoEndingSeconds !== null ? `(${autoEndingSeconds}s)` : ''}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-3">
                      <div>⚠️ 记忆共鸣不足。匹配度：{scorePercent}%（需达到 75% 门槛）。</div>
                      <button
                        onClick={handleRetryQuiz}
                        className="px-5 py-2.5 bg-slate-800 text-amber-300 font-medium text-xs rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>重新发起内核共鸣</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Action Choices Grid - MAX AT MOST 3 OPTIONS AT A TIME */}
        {!isQuizMode ? (
          <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-b from-[#0a1224]/35 via-[#070d18]/45 to-[#040810]/55 backdrop-blur-2xl border-t border-white/15 flex flex-col gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
            {/* In-dialogue confirmation if player chose to retire to teahouse */}
            {npc.id === 'gaiwan_jie' && confirmingHermit && (
              <div className="mb-2 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <Coffee className="w-4 h-4 text-emerald-400" />
                    <span>退隐悬崖茶肆 · 守护山城人间烟火</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 leading-relaxed font-light">
                    “老弟，算来算去多累，你若真愿留驻悬崖茶肆，做一名守护山城烟火的茶客大侠，姐这壶老沱茶随时为你沏满！你确定要就此隐退市井吗？”
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => onTriggerGameVictory?.('hermit')}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>确认隐退 · 留守茶肆</span>
                  </button>
                  <button
                    onClick={() => setConfirmingHermit(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    暂且留步
                  </button>
                </div>
              </div>
            )}

            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>
                {visibleChoices.length > 0
                  ? '通过深入交流巴渝历史提高好感度至 100 获得通关战利品 (每次最多展示 3 个未选选项):'
                  : '✦ 该智能体的历史对话选项已全部探索，可通过下方输入框自由交流心得：'}
              </span>
              {currentFav >= 100 && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                  <CheckCircle className="w-3.5 h-3.5" />
                  FAVOR_MAX
                </span>
              )}
            </div>

            {/* Grid rendering at most 3 choices with mobile scroll */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-[160px] sm:max-h-none overflow-y-auto pr-1 custom-scrollbar">
              {visibleChoices.length > 0 ? (
                visibleChoices.map((choice) => {
                  const reqItem = choice.requiresItem
                    ? inventory.find((i) => i.id === choice.requiresItem)
                    : null;
                  const hasReqItem = !reqItem || (reqItem.quantity || 0) > 0;
                  const isMiniGameChoice = !!choice.triggerMiniGame;

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleSelectChoice(choice)}
                      disabled={isTyping}
                      className={`p-3.5 rounded-2xl border text-left text-xs font-medium transition-all duration-200 active:scale-[0.98] flex flex-col justify-between gap-2.5 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] ${
                        isMiniGameChoice
                          ? 'bg-gradient-to-br from-amber-950/70 via-amber-900/50 to-slate-900/80 hover:from-amber-900/80 hover:via-amber-800/60 border-amber-400/60 hover:border-amber-300 text-amber-100 shadow-[0_4px_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                          : hasReqItem
                          ? 'bg-gradient-to-br from-white/[0.12] via-slate-900/50 to-slate-950/70 hover:bg-white/[0.18] border-white/20 hover:border-amber-400/60 text-slate-100 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                          : 'bg-black/30 border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span className="line-clamp-2 leading-relaxed font-light flex items-start gap-1.5">
                        {isMiniGameChoice && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />}
                        {choice.text}
                      </span>
                      <span className={`self-end text-[10px] px-2.5 py-0.5 rounded-full border whitespace-nowrap font-mono font-medium shadow-sm ${
                        isMiniGameChoice ? 'bg-amber-950/80 text-amber-300 border-amber-500/60' : `bg-black/40 backdrop-blur-md ${sceneTheme.textAccent} ${sceneTheme.borderAccent}`
                      }`}>
                        {isMiniGameChoice
                          ? '🎮 实操彩蛋'
                          : `+${choice.favorabilityDelta + (isBattleOverridden ? 1 : 0)}好感${isBattleOverridden ? ' (+1破壁加成)' : ''}`}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-1 sm:col-span-3 py-3.5 px-4 rounded-xl bg-[#0a0e18]/80 border border-slate-800/80 text-center text-xs text-slate-400 font-light flex items-center justify-center gap-2">
                  <span className="text-amber-400 font-semibold">✦</span>
                  <span>该智能体的预设探讨选项已全部体验完毕，你可在下方自由输入心得继续互动提升好感度。</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative z-10 p-4 bg-[#06090e] border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setIsQuizMode(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
            >
              返回对话
            </button>

            {!quizSubmitted ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(selectedAnswers).length < activeQuizQuestions.length}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-amber-300 font-medium text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>注入量子记忆密码 ({Object.keys(selectedAnswers).length}/{activeQuizQuestions.length})</span>
                <Send className="w-4 h-4" />
              </button>
            ) : quizPassed ? (
              <button
                onClick={() => proceedToEnding(targetEndingRef.current)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all animate-pulse"
              >
                <Trophy className="w-4 h-4" />
                <span>进入终局演卷 {autoEndingSeconds !== null ? `(${autoEndingSeconds}s)` : ''}</span>
              </button>
            ) : null}
          </div>
        )}

        {!isQuizMode && (
          <div className="relative z-10 p-3 sm:p-4 bg-gradient-to-r from-slate-950/45 via-[#0c1429]/50 to-slate-950/45 backdrop-blur-2xl border-t border-white/15 flex flex-col gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
            {/* Real-time Voice Recording Telemetry Banner */}
            {isListening && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-950/70 border border-rose-500/70 text-xs text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.3)] animate-pulse">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="font-mono font-bold text-rose-300 text-xs shrink-0 tracking-wider">
                    REC {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-slate-200 truncate font-normal text-xs pl-1 border-l border-rose-500/40">
                    {interimTranscript || inputPrompt || '🎙️ 正在实时录音中... 您可以从容思考说话，不受任何时间限制！'}
                  </span>
                </div>
                <div className="text-[11px] text-rose-300 font-mono hidden md:inline shrink-0 font-medium">
                  快捷键: 按 [ ~ ] 键即可结束
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="text"
                value={inputPrompt}
                maxLength={MAX_INPUT_PROMPT_LENGTH}
                disabled={isListening}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCustomText()}
                placeholder={
                  isListening
                    ? '🎙️ 正在录音中... 说完后请点击右侧【结束录音并发送】'
                    : `向 ${npc.name} 输入对话心得 (自主发言好感度 +${isBattleOverridden ? '2 (含破壁加成)' : '1'}，最多 200 字，支持键盘输入或语音)...`
                }
                className="flex-1 bg-black/45 backdrop-blur-2xl border border-white/15 focus:border-amber-400/60 rounded-full px-4 py-2.5 text-xs text-slate-100 focus:outline-none transition-all placeholder:text-slate-400 disabled:opacity-75 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
              />

              {/* Explicit Player-Controlled Push-To-Talk Button */}
              {isListening ? (
                <button
                  type="button"
                  onClick={stopRecordingAndSend}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-full transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.6)] cursor-pointer shrink-0 animate-pulse border border-rose-400 active:scale-95"
                  title="点击立即结束语音录入并自动发送给 NPC"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>结束录音并发送</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className="px-3.5 py-2.5 bg-white/[0.08] hover:bg-white/[0.15] text-amber-300 hover:text-amber-200 border border-white/15 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]"
                  title="点击开始语音录入 (您决定何时结束，亦可按键盘 ~ 键)"
                >
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">语音对讲</span>
                </button>
              )}

              {!isListening && (
                <button
                  type="button"
                  onClick={handleSendCustomText}
                  disabled={!inputPrompt.trim() || isTyping}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[0_2px_12px_rgba(245,158,11,0.35)] active:scale-95"
                >
                  <span>发送</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </div>
</div>
);
};
