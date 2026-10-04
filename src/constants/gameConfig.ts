// Game Rule Constants and Configurations

export const ENERGY_COST_PER_DIALOGUE = 10;
export const INITIAL_CYBER_CREDITS = 30; // 紧缩初始积分，防止无脑购买

// 致意打赏规则（杜绝金钱买通关）
export const CREDITS_PER_TIP = 40; // 单次致意消耗 40 积分
export const FAVORABILITY_GAIN_PER_TIP = 5; // 单次仅提升 5 点好感
export const MAX_TIP_FAVORABILITY_CAP = 60; // 打赏好感度上限 60%，60% 以上必须靠文化对话与实操试炼
export const MAX_TIPS_PER_NPC = 2; // 每位 NPC 最多接受 2 次致意打赏

// 积分获取产出规则（紧缩型良性循环）
export const DIALOGUE_CREDITS_REWARD = 2; // 普通文化对话选项 (+2)
export const AI_CHAT_CREDITS_REWARD = 3; // 自由 AI 对话提问 (+3)
export const FIREWALL_BATTLE_CREDITS_REWARD = 15; // 逻辑攻防大捷 (+15)

export const MINIGAME_FIRST_CREDITS_DEFAULT = 15; // 关卡首次通关 (+15)
export const MINIGAME_FIRST_CREDITS_STEEL = 20; // 终极锻造首次通关 (+20)
export const MINIGAME_REPEAT_CREDITS = 5; // 重复挑战练习 (+5)

// 消耗梯度
export const RECHARGE_COST = 40; // 能量补充
export const RECHARGE_ENERGY_GAIN = 30;

export const CRAFT_OPERA_MASK_COST = 50; // 川剧面具合成
export const CRAFT_HOTPOT_MATRIX_COST = 40; // 九宫格底料熬制

export const MAX_ENERGY = 100;
export const MAX_FAVORABILITY = 100;

export const QUIZ_PASS_THRESHOLD_PERCENT = 75;
export const QUIZ_HINT_COST = 50; // 终极试炼单题线索

export const MAX_INPUT_PROMPT_LENGTH = 200;
export const MAX_TTS_TEXT_LENGTH = 150;

export const LOCAL_STORAGE_KEYS = {
  LOCATIONS: 'cyber_locations',
  NPCS: 'cyber_npcs',
  INVENTORY: 'cyber_inventory',
  GAME_STATE: 'cyber_gameState',
  LOGS: 'cyber_logs',
} as const;

