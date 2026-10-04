import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LocationMap } from './components/LocationMap';
import { NpcDialogueModal } from './components/NpcDialogueModal';
import { InventoryModal } from './components/InventoryModal';
import { ApiConfigModal } from './components/ApiConfigModal';
import { EndingModal } from './components/EndingModal';
import { OpeningCinematic } from './components/OpeningCinematic';
import { MiniGameModal } from './components/MiniGameModal';
import { DistressedGlassOverlay } from './components/DistressedGlassOverlay';

import type { GameState, Location, NPC, InventoryItem, MiniGameType } from './types/game';
import { INITIAL_LOCATIONS, INITIAL_NPCS, INITIAL_ITEMS } from './data/gameData';
import { Package, Terminal, Layers, Compass, Lock, Volume2, VolumeX, Zap, Flame, Activity, Sparkles } from 'lucide-react';
import { bgmManager, speakNpcMessage, stopAllSpeech } from './utils/audio';
import { getActiveGeminiApiKey } from './utils/security';

import { LOCAL_STORAGE_KEYS, INITIAL_CYBER_CREDITS, MINIGAME_REPEAT_CREDITS, MINIGAME_FIRST_CREDITS_DEFAULT } from './constants/gameConfig';

const loadSavedState = <T,>(key: string, defaultVal: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultVal;
    const parsed = JSON.parse(saved);
    if (Array.isArray(defaultVal)) {
      if (!Array.isArray(parsed) || parsed.length === 0) return defaultVal;
      return parsed as T;
    }
    if (typeof defaultVal === 'object' && defaultVal !== null) {
      return { ...defaultVal, ...parsed };
    }
    return (parsed ?? defaultVal) as T;
  } catch {
    return defaultVal;
  }
};

const UNIQUE_ITEM_IDS = ['pass_card', 'cyber_tea', 'chonggang_chip', 'chongqing_badge', 'opera_mask'];

export const normalizeInventory = (items: InventoryItem[]): InventoryItem[] => {
  return items.map((item) => {
    if (UNIQUE_ITEM_IDS.includes(item.id)) {
      return { ...item, quantity: Math.min(1, Math.max(0, item.quantity)) };
    }
    return item;
  });
};

export function App() {
  const [locations, setLocations] = useState<Location[]>(() => {
    const loaded = loadSavedState(LOCAL_STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
    return loaded.map((loc) =>
      loc.id === 'jiefangbei' && loc.image === '/banner.jpg'
        ? { ...loc, image: '/jiefangbei.jpg' }
        : loc
    );
  });
  const [npcs, setNpcs] = useState<NPC[]>(() => {
    const loadedNpcs = loadSavedState(LOCAL_STORAGE_KEYS.NPCS, INITIAL_NPCS);
    const loadedState = loadSavedState<GameState | null>(LOCAL_STORAGE_KEYS.GAME_STATE, null);
    if (loadedState?.isHackingOverridden) {
      return loadedNpcs.map((n) =>
        loadedState.isHackingOverridden?.[n.id] && n.title.includes('处于逻辑迷失态')
          ? { ...n, title: n.title.replace('处于逻辑迷失态', '逻辑纠偏完成 · 正常运转') }
          : n
      );
    }
    return loadedNpcs;
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const loaded = loadSavedState(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_ITEMS);
    return normalizeInventory(loaded);
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [showOpeningCinematic, setShowOpeningCinematic] = useState<boolean>(false);
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameType | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultState: GameState = {
      playerEnergy: 100,
      cyberCredits: INITIAL_CYBER_CREDITS,
      currentLocationId: 'jiefangbei',
      currentNpcId: null,
      inventory: INITIAL_ITEMS,
      unlockedLocations: ['jiefangbei', 'liziba', 'hongyadong'],
      npcFavorability: {
        bangbang_88: 20,
        gaiwan_jie: 20,
        zero_machine: 20,
        steel_soul: 20,
      },
      npcTipCounts: {},
      presentedItems: {},
      awardedItems: {},
      completedMiniGames: {},
      clickedChoiceIds: {},
      gameEnding: 'ongoing',
      globalMistakesCount: 0,
      apiKey: getActiveGeminiApiKey(),
      apiProvider: (import.meta.env.VITE_DEFAULT_AI_PROVIDER as any) || 'gemini',
      ttsProvider: 'natural_neural',
      ttsApiKey: '',
      ttsBaseUrl: '',
      ttsModel: '',
    };
    const loaded = loadSavedState(LOCAL_STORAGE_KEYS.GAME_STATE, defaultState);
    if (loaded) {
      if (!loaded.clickedChoiceIds) {
        loaded.clickedChoiceIds = {};
      }
      // Ensure presented items are permanently recorded into clicked choices
      if (loaded.presentedItems?.gaiwan_jie) {
        loaded.clickedChoiceIds.gw_present_tea = true;
      }
      if (loaded.presentedItems?.zero_machine) {
        loaded.clickedChoiceIds.zero_present_pass = true;
      }
      if (typeof loaded.globalMistakesCount !== 'number') {
        loaded.globalMistakesCount = 0;
      }
      if (!loaded.npcTipCounts) {
        loaded.npcTipCounts = {};
      }
      if (loaded.cyberCredits > 30 && Object.keys(loaded.awardedItems || {}).length === 0) {
        loaded.cyberCredits = INITIAL_CYBER_CREDITS;
      }
      // Re-calibrate legacy favorabilities if they were set to the old high default
      if (loaded.npcFavorability) {
        if (loaded.npcFavorability.steel_soul === 100 && !loaded.unlockedLocations?.includes('chonggang')) {
          loaded.npcFavorability.steel_soul = 20;
        }
        if (loaded.npcFavorability.gaiwan_jie === 60 && !loaded.awardedItems?.['chonggang_chip']) {
          loaded.npcFavorability.gaiwan_jie = 20;
        }
        if (loaded.npcFavorability.bangbang_88 === 50 && !loaded.awardedItems?.['pass_card']) {
          loaded.npcFavorability.bangbang_88 = 20;
        }
        if (loaded.npcFavorability.zero_machine === 40 && !loaded.awardedItems?.['cyber_tea']) {
          loaded.npcFavorability.zero_machine = 20;
        }
      }
    }
    return loaded;
  });

  const [activeModal, setActiveModal] = useState<
    'none' | 'dialogue' | 'inventory' | 'apiConfig'
  >('none');

  const [logs, setLogs] = useState<string[]>(() => loadSavedState(LOCAL_STORAGE_KEYS.LOGS, [
    '[SYSTEM] 《地球文明Online》2050 溯源特遣终端已就绪。当前视口定位：+1F 解放碑前哨站。',
    '[TACTICAL] 警报：2050 全球智能危机蔓延！请穿梭三大文明唤醒迷失 AI，收集宝典碎片化解精神虚无！',
  ]));

  const [isChonggangFlashing, setIsChonggangFlashing] = useState(false);

  const isResettingRef = useRef(false);

  useEffect(() => {
    if (isResettingRef.current) return;
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    localStorage.setItem(LOCAL_STORAGE_KEYS.NPCS, JSON.stringify(npcs));
    localStorage.setItem(LOCAL_STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    localStorage.setItem(LOCAL_STORAGE_KEYS.GAME_STATE, JSON.stringify(gameState));
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }, [locations, npcs, inventory, gameState, logs]);

  // Auto-heal / sanitize inventory so unique items (tokens, shards, medals) can never exceed quantity 1
  useEffect(() => {
    setInventory((prev) => {
      let isMutated = false;
      const sanitized = prev.map((item) => {
        if (UNIQUE_ITEM_IDS.includes(item.id) && item.quantity > 1) {
          isMutated = true;
          return { ...item, quantity: 1 };
        }
        return item;
      });
      return isMutated ? sanitized : prev;
    });
  }, []);

  useEffect(() => {
    const activeKey = getActiveGeminiApiKey();
    if (activeKey && (gameState.apiProvider !== 'gemini' || !gameState.apiKey)) {
      setGameState((prev) => ({
        ...prev,
        apiProvider: 'gemini',
        apiKey: activeKey,
      }));
    }
  }, []);

  useEffect(() => {
    bgmManager.setMuted(isMuted);
    if (gameState.gameEnding === 'ongoing') {
      bgmManager.playBGMForLocation(gameState.currentLocationId);
    } else {
      bgmManager.stopBGM();
    }
  }, [gameState.currentLocationId, isMuted, gameState.gameEnding]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    bgmManager.setMuted(nextMuted);
  };

  const addLog = (message: string) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [`[${timeString}] ${message}`, ...prev.slice(0, 30)]);
  };

  const handleSelectLocation = (locationId: string) => {
    setGameState((prev) => ({
      ...prev,
      currentLocationId: locationId,
    }));
    const targetLoc = locations.find((l) => l.id === locationId);
    if (targetLoc) {
      addLog(`🧭 [定位升降舱] 高亮选中场景【${targetLoc.name} (${targetLoc.level})】。`);
    }
  };

  const handleTalkToNpc = (npcId: string) => {
    const npc = npcs.find((n) => n.id === npcId);
    if (!npc) return;

    if (gameState.playerEnergy < 10) {
      addLog('⚠️ [能量警报] 义体能量不足 10 点！请打开右侧“包裹”购买能量药剂！');
      setActiveModal('inventory');
      return;
    }

    const nextEnergy = gameState.playerEnergy - 10;
    const isDepleted = nextEnergy <= 0;

    setGameState((prev) => ({
      ...prev,
      currentNpcId: npcId,
      playerEnergy: Math.max(0, nextEnergy),
      gameEnding: isDepleted ? 'energy_depleted' : prev.gameEnding,
    }));

    if (isDepleted) {
      addLog('⚠️ [系统中断] 义体能量耗尽，强制返回备用节点！');
      setActiveModal('none');
      return;
    }

    setActiveModal('dialogue');
    addLog(`💬 [神经接入] 进入【${npc.name}】对话频段，消耗 10 能量。剩余能量：${nextEnergy}/100。`);
  };

  const handleUpdateFavorability = (npcId: string, delta: number) => {
    const initialFav = INITIAL_NPCS.find((n) => n.id === npcId)?.favorability ?? 50;

    setGameState((prev) => {
      const current = prev.npcFavorability[npcId] ?? initialFav;
      const nextFav = Math.min(100, Math.max(0, current + delta));
      addLog(`❤️ [好感共鸣] 与 NPC 共鸣值 ${delta > 0 ? '+' : ''}${delta}（达到 ${nextFav}/100）。`);
      return {
        ...prev,
        npcFavorability: {
          ...prev.npcFavorability,
          [npcId]: nextFav,
        },
      };
    });

    setNpcs((prevNpcs) =>
      prevNpcs.map((n) =>
        n.id === npcId
          ? { ...n, favorability: Math.min(100, Math.max(0, n.favorability + delta)) }
          : n
      )
    );
  };

  const handleGainItem = (itemId: string) => {
    const isUnique = UNIQUE_ITEM_IDS.includes(itemId);

    setInventory((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      // Guard against duplicate acquisition of unique story / quest items
      if (isUnique && existing && existing.quantity >= 1) {
        return prev;
      }

      const updated = prev.map((item) => {
        if (item.id === itemId) {
          const nextQuantity = isUnique ? 1 : item.quantity + 1;
          addLog(`🎁 [获得战利品] 【${item.name}】x1 已装入战术包裹！`);
          return { ...item, quantity: nextQuantity };
        }
        return item;
      });

      setGameState((g) => ({
        ...g,
        inventory: updated,
        awardedItems: { ...g.awardedItems, [itemId]: true },
      }));

      return updated;
    });

    if (itemId === 'chonggang_chip') {
      addLog('💡 [解封钥匙] 获得【山崖农耕之火·烟火宝典碎片】！请点击 HUD 右上角“包裹”并选择使用，解封 -18F 终极关卡！');
    }
  };

  const handleConsumeItem = (itemId: string) => {
    setInventory((prev) => {
      const updated = prev.map((item) => {
        if (item.id === itemId && item.quantity > 0) {
          addLog(`📤 [出示道具] 消耗【${item.name}】x1！`);
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
      setGameState((g) => ({ ...g, inventory: updated }));
      return updated;
    });
  };

  const handleRecordPresentedItem = (npcId: string) => {
    setGameState((prev) => ({
      ...prev,
      presentedItems: {
        ...prev.presentedItems,
        [npcId]: true,
      },
    }));
  };

  const handleRecordClickedChoice = (choiceId: string) => {
    setGameState((prev) => ({
      ...prev,
      clickedChoiceIds: {
        ...(prev.clickedChoiceIds || {}),
        [choiceId]: true,
      },
    }));
  };

  const handleSpendCredits = (cost: number): boolean => {
    if (gameState.cyberCredits < cost) {
      addLog(`❌ [积分不足] 消费失败！当前拥有 ${gameState.cyberCredits} 积分，需要 ${cost} 赛博积分。`);
      return false;
    }
    const remaining = gameState.cyberCredits - cost;
    setGameState((prev) => ({
      ...prev,
      cyberCredits: Math.max(0, prev.cyberCredits - cost),
    }));
    addLog(`🪙 [黑市消费] 扣除 ${cost} 积分（剩余: ${remaining}）。`);
    return true;
  };

  const handleGainCredits = (amount: number, reason?: string) => {
    setGameState((prev) => {
      const nextCredits = prev.cyberCredits + amount;
      addLog(`🪙 [获得积分] +${amount} 赛博积分${reason ? `（${reason}）` : ''}，当前总积分: ${nextCredits}。`);
      return { ...prev, cyberCredits: nextCredits };
    });
  };

  const handleBuyEnergyItem = (cost: number, energyGain: number) => {
    if (gameState.playerEnergy >= 100) {
      addLog('💡 [系统提示] 义体能量已达 100 满值，无需补充能量！');
      return;
    }
    if (gameState.cyberCredits < cost) {
      addLog(`❌ [积分不足] 充能失败！当前拥有 ${gameState.cyberCredits} 积分，需要 ${cost} 赛博积分。`);
      return;
    }
    setGameState((prev) => {
      const nextEnergy = Math.min(100, prev.playerEnergy + energyGain);
      addLog(`⚡ [充能成功] 消耗 ${cost} 积分，恢复 +${energyGain} 点义体能量（当前: ${nextEnergy}/100）。`);
      return {
        ...prev,
        cyberCredits: prev.cyberCredits - cost,
        playerEnergy: nextEnergy,
      };
    });
  };

  const handleOpenMiniGame = (type: MiniGameType) => {
    setActiveMiniGame(type);
    setGameState((prev) => ({
      ...prev,
      discoveredMiniGames: {
        ...(prev.discoveredMiniGames || {}),
        [type]: true,
      },
    }));
  };

  const handleMiniGameReward = (result: {
    gameType?: MiniGameType;
    credits: number;
    energy: number;
    favorabilityNpcId?: string;
    favorabilityDelta?: number;
    itemId?: string;
    logMessage: string;
  }) => {
    const isAlreadyCompleted = !!(result.gameType && gameState.completedMiniGames?.[result.gameType]);
    if (result.gameType) {
      setGameState((prev) => ({
        ...prev,
        completedMiniGames: {
          ...(prev.completedMiniGames || {}),
          [result.gameType!]: true,
        },
      }));
    }
    const creditsToAward = isAlreadyCompleted ? MINIGAME_REPEAT_CREDITS : (result.credits ?? MINIGAME_FIRST_CREDITS_DEFAULT);
    if (creditsToAward) {
      handleGainCredits(creditsToAward, isAlreadyCompleted ? '工坊温习' : '工坊首通');
    }
    if (result.energy) {
      setGameState((prev) => {
        const nextEnergy = Math.min(100, prev.playerEnergy + result.energy);
        addLog(`⚡ [工坊补给] 挑战结算恢复 +${result.energy} 点义体能量（当前: ${nextEnergy}/100）。`);
        return { ...prev, playerEnergy: nextEnergy };
      });
    }
    if (result.favorabilityNpcId && result.favorabilityDelta) {
      handleUpdateFavorability(result.favorabilityNpcId, result.favorabilityDelta);
    }
    if (result.itemId) {
      handleGainItem(result.itemId);
    }
    if (result.logMessage) {
      addLog(`🎮 [工坊大捷] ${result.logMessage}`);
    }
    if (result.favorabilityNpcId) {
      const winQuotes: Record<string, string> = {
        bangbang_88: '好后生！肩挑千斤腰不弯，重心稳如磐石！这才是咱们重庆棒棒刻在骨子里的硬脊梁！老汉这辈子服你！',
        zero_machine: '监测到神经阻抗下降……大河高架极速穿楼，声学消噪护盾完美闭环！你证明了人类直觉在狂澜中同舟共济的不可替代性！',
        gaiwan_jie: '巴适得板！毛肚七上八下脆生生，牛油翻滚热气腾腾！这才是咱们山城刻在骨子里的人间烟火气！来，这包秘制火锅底料你拿去！',
        steel_soul: '千锤百炼，烈火金刚！这一记重锤砸出了当年汉阳铁厂西迁大渡口的铁骨铮铮！百年工业火种，为你而鸣！',
      };
      const quote = winQuotes[result.favorabilityNpcId];
      if (quote) {
        speakNpcMessage(result.favorabilityNpcId, quote, isMuted);
      }
    }
  };

  const handleUseItem = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item || item.quantity <= 0) return;

    if (itemId === 'chonggang_chip') {
      if (gameState.unlockedLocations.includes('chonggang')) {
        addLog('💡 [系统提示] 终极纪元【-18F 重钢工业遗址】此前已解封，请前往大地图开启终极试炼！');
        return;
      }
      setLocations((prevLocs) =>
        prevLocs.map((loc) =>
          loc.id === 'chonggang' ? { ...loc, unlocked: true } : loc
        )
      );
      setGameState((prev) => ({
        ...prev,
        unlockedLocations: prev.unlockedLocations.includes('chonggang')
          ? prev.unlockedLocations
          : [...prev.unlockedLocations, 'chonggang'],
        currentLocationId: 'chonggang',
      }));
      addLog('🔓 [纪元解封] 激活【山崖农耕之火·烟火宝典碎片】密钥，终极纪元【-18F 重钢工业遗址】已成功解封！');
      speakNpcMessage('steel_soul', '封印解除！终极纪元重钢遗址已成功解封！三大文明碎片已全部集齐！', isMuted);
      setActiveModal('none');

      // 触发重钢遗址模块背景光闪烁 2 秒（0.5s x 4 次 = 2 秒）
      setIsChonggangFlashing(true);
      setTimeout(() => {
        setIsChonggangFlashing(false);
      }, 2000);
    } else if (itemId === 'cyber_tea') {
      addLog('🌊 [宝典共鸣] 【大河渔猎之魂·险滩共济碎片】正在共鸣！请前往 -5F 洪崖洞向盖碗姐出示，感知市井人间烟火！');
    } else if (itemId === 'pass_card') {
      addLog('🎋 [信物共鸣] 【山城脊梁之竹·前哨共济信物】正在共鸣！请前往 +8F 李子坝向 AI 零号机出示进行身份核验！');
    } else if (itemId === 'opera_mask') {
      const personas: Array<'bold' | 'sensitive' | 'stoic'> = ['bold', 'sensitive', 'stoic'];
      const currentIdx = personas.indexOf(gameState.currentPersona || 'stoic');
      const nextPersona = personas[(currentIdx + 1) % personas.length];
      setGameState((prev) => ({
        ...prev,
        currentPersona: nextPersona,
      }));
      const personaLabels: Record<string, string> = {
        bold: '【川剧变脸·狂热拓荒者】(冲破算法僵局，好感获取+30%)',
        sensitive: '【川剧变脸·共情纤夫魂】(深度感知失控Bot共鸣翻倍)',
        stoic: '【川剧变脸·沉着重工守望者】(免疫虚无脉冲冲击)',
      };
      addLog(`🎭 [非遗变脸] 全息义体面具瞬息变脸！当前形态：${personaLabels[nextPersona]}`);
      speakNpcMessage('gaiwan_jie', `好俊俏的变脸绝技！已切换为${personaLabels[nextPersona]}！`, isMuted);
    } else if (itemId === 'hotpot_matrix') {
      if (gameState.playerEnergy >= 100) {
        addLog('💡 [系统提示] 义体能量已达 100 满值，无需补充能量！');
        return;
      }
      handleConsumeItem(itemId);
      setGameState((prev) => ({
        ...prev,
        playerEnergy: Math.min(100, prev.playerEnergy + 60),
      }));
      addLog('🍲 [非遗美味] 享用【赛博九宫格火锅·量子聚能底料】，高能热辣分子爆发，瞬间恢复 +60 义体能量，清空神经负荷！');
      speakNpcMessage('gaiwan_jie', '好香的九宫格量子火锅！牛油翻滚，底层虚无死锁瞬间被化解！', isMuted);
    }
  };

  const handleCraftItem = (itemId: string, cost: number) => {
    if (gameState.cyberCredits < cost) {
      addLog(`❌ [合成失败] 积分不足！需要 ${cost} 积分，当前仅有 ${gameState.cyberCredits} 积分`);
      return;
    }
    handleSpendCredits(cost);
    handleGainItem(itemId);
    const itemName = itemId === 'opera_mask' ? '【川剧变脸·量子义体面具】' : '【赛博九宫格火锅·量子聚能底料】';
    addLog(`🛠️ [非遗工坊] 成功合成 ${itemName}！消耗 ${cost} 积分`);
    speakNpcMessage('gaiwan_jie', `恭喜！非遗量子工坊成功熔铸出 ${itemName}！`, isMuted);
  };

  const handleRecordNpcTip = (npcId: string) => {
    setGameState((prev) => ({
      ...prev,
      npcTipCounts: {
        ...(prev.npcTipCounts || {}),
        [npcId]: (prev.npcTipCounts?.[npcId] || 0) + 1,
      },
    }));
  };

  const handleConsumeEnergy = (amount: number) => {
    setGameState((prev) => {
      const nextEnergy = Math.max(0, prev.playerEnergy - amount);
      const isDepleted = nextEnergy <= 0;
      if (isDepleted && prev.gameEnding === 'ongoing') {
        addLog('⚠️ [能量枯竭] 神经链路严重超载，义体能量归零！特遣专员进入低能休眠复苏态！');
      }
      return {
        ...prev,
        playerEnergy: nextEnergy,
        gameEnding: isDepleted ? 'energy_depleted' : prev.gameEnding,
      };
    });
  };

  const handleRecordMistake = (reason?: string) => {
    setGameState((prev) => {
      const nextMistakes = (prev.globalMistakesCount || 0) + 1;
      return {
        ...prev,
        globalMistakesCount: nextMistakes,
      };
    });
    if (reason) {
      console.log(`[CyberChongqing] Mistake recorded (${reason})`);
    }
  };

  const handleRecordBattleComplete = (npcId: string) => {
    setGameState((prev) => ({
      ...prev,
      isHackingOverridden: {
        ...(prev.isHackingOverridden || {}),
        [npcId]: true,
      },
    }));
    setNpcs((prev) =>
      prev.map((n) =>
        n.id === npcId && n.title.includes('处于逻辑迷失态')
          ? { ...n, title: n.title.replace('处于逻辑迷失态', '逻辑纠偏完成 · 正常运转') }
          : n
      )
    );
    const targetNpc = npcs.find((n) => n.id === npcId);
    const npcName = targetNpc?.name || npcId;
    addLog(`⚔️ [逻辑破壁] ${npcName} 的防火墙已被攻破，迷失状态已成功解除！后续单次对话好感度额外 +1！`);
  };

  const handleTriggerVictory = (endingType: 'harmony' | 'overload' | 'hermit' = 'harmony') => {
    stopAllSpeech();
    setGameState((prev) => ({
      ...prev,
      gameEnding: endingType,
    }));
    setActiveModal('none');
    const logs: Record<string, string> = {
      harmony: '🎉 [溯源仪式达成] 恭喜完成终极大河记忆共鸣试炼！2050 全球智能危机成功化解，荣获文明溯源者认证！',
      overload: '⚡ [算力狂飙觉醒] 恭喜达成终极超载觉醒！以满分文明共鸣重构 AGI 底层神经，成为全球算力领航者！',
      hermit: '🍵 [隐士归宿达成] 你选择留驻悬崖茶肆，一盏盖碗茶守望万家灯火，成为防空洞数字大侠！',
    };
    addLog(logs[endingType] || logs.harmony);
  };

  useEffect(() => {
    (window as any).__triggerEnding = handleTriggerVictory;
    (window as any).__recordMistake = handleRecordMistake;
    (window as any).__getMistakesCount = () => gameState.globalMistakesCount || 0;
    (window as any).__openMiniGame = handleOpenMiniGame;
  }, [gameState.globalMistakesCount]);

  const handleRecoverFromDepletion = () => {
    setGameState((prev) => ({
      ...prev,
      gameEnding: 'ongoing',
      playerEnergy: 80,
    }));
    addLog('⚡ [核心复苏] 紧急协议响应完毕，义体能量恢复至 80/100，特遣专员重新接入山城！');
  };

  const handleResetGame = () => {
    isResettingRef.current = true;
    Object.values(LOCAL_STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGS);
    window.location.reload();
  };

  const currentNpc = npcs.find((n) => n.id === gameState.currentNpcId);

  // Play atmospheric title theme when on start screen
  useEffect(() => {
    if (!isGameStarted && !showOpeningCinematic) {
      bgmManager.playTitleTheme();
    } else {
      bgmManager.stopTitleTheme();
    }
    return () => {
      bgmManager.stopTitleTheme();
    };
  }, [isGameStarted, showOpeningCinematic]);

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#04060a] text-slate-100 relative overflow-hidden select-none px-4">
        {showOpeningCinematic && (
          <OpeningCinematic
            isMuted={isMuted}
            onComplete={() => {
              setShowOpeningCinematic(false);
              setIsGameStarted(true);
            }}
          />
        )}

        {/* Ambient Floating Cyber Grid & Pulsing Cover Backdrop */}
        <div
          className="absolute inset-0 bg-[url('/cover.jpg')] bg-cover bg-center opacity-55 filter brightness-105 contrast-125 pointer-events-none scale-105 transform animate-pulse"
          style={{ animationDuration: '9s' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060a]/90 via-[#04060a]/40 to-[#04060a]/70 pointer-events-none" />

        {/* Cyberpunk Scanlines */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]" />

        {/* Dynamic Vibrant Neon Glow directly behind the Glass Card for Dramatic Refraction */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-gradient-to-tr from-amber-500/30 via-cyan-500/25 to-purple-600/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />

        {/* Main Title Center Stage with Premium Frosted Glass */}
        <div className="relative z-10 text-center space-y-5 p-6 sm:p-8 rounded-3xl cyber-glass-card max-w-lg w-full relative overflow-hidden">
          {/* Specular Glass Top Light Line */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
          
          {/* Top Audio Spectrum & Mode Pill */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
            <div className="flex items-center gap-2">
              {/* Dancing Cyber Equalizer */}
              <div className="flex items-end gap-0.5 h-4 px-1 bg-black/50 rounded border border-white/10">
                <span className={`w-0.5 rounded-full bg-amber-400 ${!isMuted ? 'animate-eq-1' : 'h-1'}`} />
                <span className={`w-0.5 rounded-full bg-yellow-300 ${!isMuted ? 'animate-eq-2' : 'h-1.5'}`} />
                <span className={`w-0.5 rounded-full bg-emerald-400 ${!isMuted ? 'animate-eq-3' : 'h-2'}`} />
                <span className={`w-0.5 rounded-full bg-cyan-400 ${!isMuted ? 'animate-eq-4' : 'h-1'}`} />
                <span className={`w-0.5 rounded-full bg-amber-400 ${!isMuted ? 'animate-eq-2' : 'h-1.5'}`} />
              </div>
              <span className="text-[10px] font-mono text-amber-300 font-bold tracking-wider">
                ECO // 2050 AUDIO-SYNC
              </span>
            </div>

            <button
              onClick={toggleMute}
              className="px-2.5 py-1 rounded-lg bg-slate-900/50 hover:bg-slate-800/70 text-slate-300 border border-white/10 hover:border-amber-400/60 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-colors"
              title={isMuted ? '开启赛博原声' : '静音'}
            >
              {isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
              <span>{isMuted ? '声音已静音' : '原声播放中'}</span>
            </button>
          </div>

          {/* Epic Game Logo & Titles */}
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-xs font-mono tracking-widest text-amber-400/90 font-bold uppercase">
              EARTH CIVILIZATION ONLINE
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]">
              地球文明Online
            </h1>
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent tracking-wide">
              山 城 溯 源 · 2 0 5 0
            </div>
            <p className="text-xs text-slate-300 font-light tracking-wider pt-1">
              “用人类百年温度 · 唤醒迷失算法”
            </p>
          </div>

          {/* Three Interactive Civilization Spark Orbs (Frosted Glass Aesthetic) */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 via-slate-900/40 to-black/50 backdrop-blur-md hover:border-cyan-400 transition-all transform hover:scale-105 shadow-md text-center">
              <span className="text-xl block">🌊</span>
              <div className="text-xs font-bold text-cyan-300 mt-1">大河渔猎</div>
              <div className="text-[9px] text-slate-300 font-mono mt-0.5">【同舟协作】</div>
            </div>

            <div className="p-2.5 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900/40 to-black/50 backdrop-blur-md hover:border-amber-400 transition-all transform hover:scale-105 shadow-md text-center">
              <span className="text-xl block">🏮</span>
              <div className="text-xs font-bold text-amber-300 mt-1">悬崖农耕</div>
              <div className="text-[9px] text-slate-300 font-mono mt-0.5">【人间烟火】</div>
            </div>

            <div className="p-2.5 rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-950/30 via-slate-900/40 to-black/50 backdrop-blur-md hover:border-orange-400 transition-all transform hover:scale-105 shadow-md text-center">
              <span className="text-xl block">⚙️</span>
              <div className="text-xs font-bold text-orange-300 mt-1">工业变革</div>
              <div className="text-[9px] text-slate-300 font-mono mt-0.5">【钢铁意志】</div>
            </div>
          </div>

          {/* High-Impact Action Button: Directly enters opening cinematic first */}
          <div className="pt-2">
            <button
              onClick={() => setShowOpeningCinematic(true)}
              className="group relative inline-flex items-center justify-center w-full py-4 font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 rounded-2xl overflow-hidden transition-all hover:scale-[1.02] shadow-[0_0_50px_rgba(245,158,11,0.55)] cursor-pointer"
            >
              {/* Shimmer light effect */}
              <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 animate-shimmer pointer-events-none" />
              <span className="relative flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>🚀 启动特遣终端 · 开始游戏</span>
              </span>
            </button>
          </div>

          {/* Footer Telemetry Stamp */}
          <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-white/10 flex items-center justify-between">
            <span>SECTOR // 023 CHONGQING 8D</span>
            <span>NEURAL LINK READY · 60FPS</span>
          </div>
        </div>

        {/* Global Distressed Frosted Glass Tactical Visor Texture */}
        <DistressedGlassOverlay />
      </div>
    );
  }

  const isChonggangUnlocked = gameState.unlockedLocations.includes('chonggang');
  const chonggangChipInInventory = !isChonggangUnlocked && inventory.find((i) => i.id === 'chonggang_chip' && i.quantity > 0);

  return (
    <div className="game-viewport-frame flex flex-col select-none text-slate-200 relative">
      {/* Ambient Cyber City Backdrop & Subtle Atmospheric Flares for Glass Refraction */}
      <div
        className="absolute inset-0 bg-[url('/cover.jpg')] bg-cover bg-center opacity-15 filter blur-[3px] brightness-75 contrast-125 pointer-events-none scale-105"
      />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]" />

      {/* HUD Corner Reticles */}
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Top Game HUD Resource & Control Header */}
      <Navbar
        gameState={{ ...gameState, inventory }}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpenInventory={() => setActiveModal('inventory')}
        onOpenCinematic={() => setShowOpeningCinematic(true)}
        onOpenApiConfig={() => setActiveModal('apiConfig')}
        onResetGame={handleResetGame}
      />

      {/* Main Interactive Game World Canvas - Balanced Aesthetics & Maximum Breathability */}
      <main className="flex-1 overflow-y-auto lg:overflow-hidden px-3.5 py-2.5 sm:px-6 sm:py-3.5 max-w-[1720px] mx-auto w-full flex flex-col gap-3 sm:gap-3.5 min-h-0 relative z-10 custom-scrollbar">
        
        {/* Sleek Tactical Mission Ribbon with Gradient Frosted Glass */}
        <div className="w-full bg-gradient-to-r from-[#0d162a]/65 via-[#111e38]/70 to-[#161a2e]/65 backdrop-blur-xl rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-3 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-100 text-sm sm:text-base tracking-wide whitespace-nowrap">
                  三大文明纪元 · 纵深星图
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded whitespace-nowrap">
                  垂直落差 420M
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-light truncate mt-0.5 hidden sm:block">
                穿梭大河渔猎、山崖农耕、工业变革三大纪元，收集信物碎片唤醒核心算法
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            {/* Fragments progress pill */}
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 shadow-inner text-xs">
              <span className="text-amber-400 font-bold text-xs flex items-center gap-1 font-mono">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>宝典碎片</span>
              </span>
              <div className="flex items-center gap-1">
                {[
                  { id: 'pass_card', icon: '🎋', label: '挑夫信物' },
                  { id: 'cyber_tea', icon: '🌊', label: '渔猎碎片' },
                  { id: 'chonggang_chip', icon: '🏮', label: '农耕碎片' },
                ].map((frag) => {
                  const hasFrag = inventory.some((i) => i.id === frag.id && (i.quantity || 0) > 0);
                  return (
                    <span
                      key={frag.id}
                      title={`${frag.label}: ${hasFrag ? '已收集' : '待寻找'}`}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs border transition-all ${
                        hasFrag
                          ? 'bg-amber-500/20 border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-600 grayscale opacity-40'
                      }`}
                    >
                      {frag.icon}
                    </span>
                  );
                })}
              </div>
              <span className="font-mono font-bold text-amber-300 text-xs">
                {inventory.filter((i) => ['pass_card', 'cyber_tea', 'chonggang_chip'].includes(i.id) && i.quantity > 0).length}/3
              </span>
            </div>

            {/* Unlocked progress pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
              <span className="text-slate-400">探明纪元</span>
              <span className="font-bold text-emerald-400">{gameState.unlockedLocations.length}/4</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Tactical Terminal & Right Sector Stage */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4.5 min-h-0 overflow-visible lg:overflow-hidden">
          
          {/* Left Tactical Console with Harmonized Vertical Spacing */}
          <aside className="lg:col-span-4 xl:col-span-4 flex flex-col gap-2.5 h-[340px] lg:h-full bg-gradient-to-b from-[#0e172a]/70 via-[#0a1020]/75 to-[#050914]/85 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_45px_rgba(0,0,0,0.55)] p-3.5 sm:p-4.5 relative overflow-hidden select-none shrink-0 min-h-0 dialogue-scanline-bg">
            {/* Monitor HUD Corner Crosshairs */}
            <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-amber-500/60 pointer-events-none" />
            <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-amber-500/60 pointer-events-none" />
            <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-amber-500/60 pointer-events-none" />
            <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-amber-500/60 pointer-events-none" />

            {/* Tactical Monitor Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-300 text-xs sm:text-sm font-mono tracking-wider">
                    战术行动终端
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">山城溯源特遣系统</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal('apiConfig')}
                className="flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/40 px-2 py-0.5 rounded-md cursor-pointer transition-all shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                title="点击切换/配置 AI 大模型与 API Key"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-300 font-semibold tracking-wider">
                  {gameState.apiProvider === 'deepseek'
                    ? 'DeepSeek直连'
                    : gameState.apiProvider === 'qwen'
                    ? '通义千问直连'
                    : gameState.apiProvider === 'openai'
                    ? 'OpenAI'
                    : gameState.apiProvider === 'gemini'
                    ? 'Gemini连线'
                    : '内置引擎'}
                </span>
              </button>
            </div>

            {/* Current Objective Directive Banner with Subtle Glass Gradient */}
            <div className="p-2.5 sm:p-3 bg-gradient-to-r from-amber-500/15 via-[#0d172c]/60 to-[#070b16]/50 backdrop-blur-md rounded-xl border border-amber-500/30 shrink-0">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>当前行动目标</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">DIRECTIVE</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                {isChonggangUnlocked
                  ? '前往 -18F 重钢工业遗址，接受【钢铁之魂】的记忆共鸣试炼！'
                  : chonggangChipInInventory
                  ? '已集齐三大文明碎片！请在包裹中使用【山崖农耕之火】解封 -18F 终极关卡！'
                  : `穿梭各大纪元节点，与驻留智能体深入交流提升好感度至 100 收集宝典！`}
              </p>
            </div>

            {/* Quick Sector Selector List */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              {locations.map((loc) => {
                const isSelected = loc.id === gameState.currentLocationId;
                const isUnlocked = loc.unlocked;
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 backdrop-blur-md ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/70 text-amber-200 shadow-sm'
                        : isUnlocked
                        ? 'bg-black/35 hover:bg-slate-800/50 border-white/10 text-slate-300'
                        : 'bg-black/20 border-white/5 text-slate-600 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate">
                        {loc.name.split('·')[0]}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">{loc.level}</div>
                    </div>
                    {isSelected ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    ) : !isUnlocked ? (
                      <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Tactical Log Stream */}
            <div className="flex-1 flex flex-col bg-black/45 backdrop-blur-xl rounded-xl border border-white/10 p-2.5 sm:p-3 overflow-hidden shadow-inner min-h-0">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2 font-mono text-[10px] text-slate-400 shrink-0">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Activity className="w-3 h-3 text-amber-400" />
                  <span>实时行动记录</span>
                </span>
                <span className="text-slate-400">{logs.length} 条记录</span>
              </div>

              <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 pr-1 custom-scrollbar">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 border-b border-white/5 pb-1.5">
                    <span className="text-amber-400 select-none font-bold text-[11px] mt-0.5">&gt;</span>
                    <span className="leading-relaxed font-light text-[11px] break-words">{log}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical Console Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400 shrink-0">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>对话消耗 10 义体能量</span>
              </div>
              <span className="text-slate-400">8D CHONGQING // 2050</span>
            </div>
          </aside>

          {/* Right Section: Scene Container / LocationMap */}
          <section className="lg:col-span-8 xl:col-span-8 flex flex-col min-h-[460px] lg:h-full lg:min-h-0 overflow-visible lg:overflow-y-auto pr-1 sm:pr-2 gap-3.5 custom-scrollbar">
            {/* Prominent Visual Toast Banner */}
            {chonggangChipInInventory && (
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-amber-950/30 backdrop-blur-xl text-amber-200 p-3.5 rounded-2xl border border-amber-500/40 shadow-[0_8px_32px_rgba(245,158,11,0.2)] flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#090b10] text-amber-400 rounded-xl border border-amber-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs sm:text-sm">
                    <strong className="font-bold text-amber-300 block">
                      💡 战术提醒：你拥有【山崖农耕之火·烟火宝典碎片】！
                    </strong>
                    <span className="text-slate-300">请点击右上角【包裹】使用碎片，解除 -18F 重钢深渊的封印！</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal('inventory')}
                  className="px-3.5 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors shadow-md whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-slate-950" />
                  <span>打开包裹</span>
                </button>
              </div>
            )}

            {/* Game Map Interactive Viewport */}
            <div className="flex-1 min-h-0">
              <LocationMap
                locations={locations}
                currentLocationId={gameState.currentLocationId}
                npcs={npcs}
                gameState={{ ...gameState, inventory }}
                onSelectLocation={handleSelectLocation}
                onTalkToNpc={handleTalkToNpc}
                hideHeader={true}
                isChonggangFlashing={isChonggangFlashing}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Modals */}
      {activeModal === 'dialogue' && currentNpc && (
        <NpcDialogueModal
          key={currentNpc.id}
          npc={currentNpc}
          gameState={gameState}
          inventory={inventory}
          isMuted={isMuted}
          onClose={() => setActiveModal('none')}
          onUpdateFavorability={handleUpdateFavorability}
          onGainItem={handleGainItem}
          onConsumeItem={handleConsumeItem}
          onRecordPresentedItem={handleRecordPresentedItem}
          onTriggerGameVictory={handleTriggerVictory}
          onSpendCredits={handleSpendCredits}
          onGainCredits={handleGainCredits}
          onRecordNpcTip={handleRecordNpcTip}
          onConsumeEnergy={handleConsumeEnergy}
          onOpenMiniGame={handleOpenMiniGame}
          onRecordMistake={handleRecordMistake}
          onRecordBattleComplete={handleRecordBattleComplete}
          onRecordClickedChoice={handleRecordClickedChoice}
        />
      )}

      {activeModal === 'inventory' && (
        <InventoryModal
          inventory={inventory}
          cyberCredits={gameState.cyberCredits}
          playerEnergy={gameState.playerEnergy}
          currentPersona={gameState.currentPersona}
          isChonggangUnlocked={isChonggangUnlocked}
          onClose={() => setActiveModal('none')}
          onUseItem={handleUseItem}
          onBuyEnergyItem={handleBuyEnergyItem}
          onCraftItem={handleCraftItem}
        />
      )}

      {activeModal === 'apiConfig' && (
        <ApiConfigModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onSaveConfig={(llm, tts) => {
            setGameState((prev) => {
              const nextState: GameState = {
                ...prev,
                apiProvider: llm.provider,
                apiKey: llm.key,
                apiBaseUrl: llm.baseUrl,
                ttsProvider: tts.provider,
                ttsApiKey: tts.key,
                ttsBaseUrl: tts.baseUrl,
                ttsModel: tts.model,
              };
              localStorage.setItem(LOCAL_STORAGE_KEYS.GAME_STATE, JSON.stringify(nextState));
              return nextState;
            });
            const providerNames: Record<string, string> = {
              deepseek: 'DeepSeek (深度求索)',
              qwen: '阿里通义千问 (Qwen)',
              gemini: 'Google Gemini',
              openai: 'OpenAI GPT-4o',
              mock: '内置轻量 AGI 引擎',
            };
            addLog(`🤖 [AI模型切换] 成功切换核心大模型为【${providerNames[llm.provider || 'mock']}】！`);
          }}
        />
      )}

      {gameState.gameEnding !== 'ongoing' && (
        <EndingModal
          endingType={gameState.gameEnding}
          onRestart={gameState.gameEnding === 'energy_depleted' ? handleRecoverFromDepletion : handleResetGame}
        />
      )}

      {activeMiniGame && (
        <MiniGameModal
          initialGame={activeMiniGame}
          unlockedLocations={gameState.unlockedLocations}
          isMuted={isMuted}
          onClose={() => setActiveMiniGame(null)}
          onReward={handleMiniGameReward}
          onRecordMistake={handleRecordMistake}
        />
      )}

      {showOpeningCinematic && isGameStarted && (
        <OpeningCinematic
          isMuted={isMuted}
          onComplete={() => setShowOpeningCinematic(false)}
        />
      )}

      {/* Global Distressed Frosted Glass Tactical Visor Texture */}
      <DistressedGlassOverlay />
    </div>
  );
}
