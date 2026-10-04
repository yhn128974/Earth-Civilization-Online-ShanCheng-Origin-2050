export type LocationId = 'jiefangbei' | 'liziba' | 'hongyadong' | 'chonggang' | (string & {});
export type NpcId = 'bangbang_88' | 'gaiwan_jie' | 'zero_machine' | 'steel_soul' | (string & {});
export type MiniGameType = 'porter_climb' | 'monorail_pilot' | 'hotpot_master' | 'steel_forging';
export type ItemId =
  | 'pass_card'
  | 'cyber_tea'
  | 'chonggang_chip'
  | 'chongqing_badge'
  | 'hotpot_matrix'
  | 'opera_mask'
  | (string & {});
export type AIProvider = 'gemini' | 'mock' | 'deepseek' | 'qwen' | 'openai';

export interface Location {
  id: LocationId;
  name: string;
  level: string;
  description: string;
  culturalInfo: string;
  image: string;
  unlocked: boolean;
  npcIds: NpcId[];
  requiredItem?: ItemId;
}

export interface InventoryItem {
  id: ItemId;
  name: string;
  description: string;
  icon: string;
  quantity: number;
}

export interface NPC {
  id: NpcId;
  name: string;
  title: string;
  avatar: string;
  locationId: LocationId;
  greeting: string;
  solicitItemText?: string;
  favorability: number;
  personality: string;
  systemPrompt: string;
  culturalBackground: string;
  prerequisiteItemId?: ItemId;
  rewardItemId?: ItemId;
  isQuizExaminer?: boolean;
}

export interface DialogueChoice {
  id: string;
  text: string;
  response: string;
  favorabilityDelta: number;
  requiresItem?: ItemId;
  consumesItem?: ItemId;
  nextChoices?: DialogueChoice[];
  triggerMiniGame?: MiniGameType;
  isEasterEgg?: boolean;
}

export interface QuizOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  locationName: string;
  question: string;
  options: QuizOption[];
  explanation: string;
  hintClue?: string;
}

export interface Message {
  id: string;
  sender: 'player' | 'npc' | 'system';
  npcName?: string;
  content: string;
  timestamp: string;
}

export type TTSProvider = 'natural_neural' | 'openai' | 'siliconflow' | 'custom';

export interface GameState {
  playerEnergy: number;
  cyberCredits: number;
  currentLocationId: LocationId;
  currentNpcId: NpcId | null;
  inventory: InventoryItem[];
  unlockedLocations: LocationId[];
  npcFavorability: Record<string, number>;
  npcTipCounts?: Record<string, number>;
  presentedItems: Record<string, boolean>;
  awardedItems: Record<string, boolean>;
  gameEnding: 'ongoing' | 'harmony' | 'overload' | 'hermit' | 'energy_depleted';
  apiKey?: string;
  apiProvider?: AIProvider;
  apiBaseUrl?: string;
  npcMemories?: Record<string, string[]>;
  isHackingOverridden?: Record<string, boolean>;
  currentPersona?: 'bold' | 'sensitive' | 'stoic';
  ttsProvider?: TTSProvider;
  ttsApiKey?: string;
  ttsBaseUrl?: string;
  ttsModel?: string;
  completedMiniGames?: Record<string, boolean>;
  discoveredMiniGames?: Record<string, boolean>;
  globalMistakesCount?: number;
  clickedChoiceIds?: Record<string, boolean>;
}
