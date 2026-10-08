import React, { useState } from 'react';
import type { InventoryItem } from '../types/game';
import { X, Package, Sparkles, Coins, Zap, AlertCircle, MapPin, Award, Flame, RefreshCw, CheckCircle2 } from 'lucide-react';
import { RECHARGE_COST, RECHARGE_ENERGY_GAIN, CRAFT_OPERA_MASK_COST, CRAFT_HOTPOT_MATRIX_COST } from '../constants/gameConfig';

interface InventoryModalProps {
  inventory: InventoryItem[];
  cyberCredits: number;
  playerEnergy: number;
  currentPersona?: 'bold' | 'sensitive' | 'stoic';
  isChonggangUnlocked?: boolean;
  onClose: () => void;
  onUseItem?: (itemId: string) => void;
  onBuyEnergyItem?: (cost: number, energyGain: number) => void;
  onCraftItem?: (itemId: string, cost: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  cyberCredits,
  playerEnergy,
  currentPersona = 'stoic',
  isChonggangUnlocked = false,
  onClose,
  onUseItem,
  onBuyEnergyItem,
  onCraftItem,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'workshop'>('inventory');
  const [fullEnergyTip, setFullEnergyTip] = useState<boolean>(false);

  const handleRechargeClick = () => {
    if (playerEnergy >= 100) {
      setFullEnergyTip(true);
      setTimeout(() => setFullEnergyTip(false), 2500);
    }
    if (onBuyEnergyItem) {
      onBuyEnergyItem(RECHARGE_COST, RECHARGE_ENERGY_GAIN);
    }
  };

  const operaMask = inventory.find((i) => i.id === 'opera_mask');
  const hotpotMatrix = inventory.find((i) => i.id === 'hotpot_matrix');

  const personaInfo = {
    bold: { label: '狂热拓荒者', desc: '好感度获取提升 +30%', badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-950/40' },
    sensitive: { label: '共情纤夫魂', desc: '失控 Bot 共鸣感知翻倍', badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40' },
    stoic: { label: '沉着守望者', desc: '免疫逻辑脉冲虚无负荷', badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' },
  }[currentPersona];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xl select-none">
      {/* Radiant Amber Ambient Halo behind modal */}
      <div
        className="absolute w-[500px] h-[400px] rounded-full blur-[90px] opacity-25 pointer-events-none animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, rgba(225, 29, 72, 0.25) 50%, transparent 75%)',
          animationDuration: '6s',
        }}
      />

      <div className="relative w-full max-w-xl rounded-3xl border border-amber-500/35 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.25)] bg-gradient-to-b from-[#141824]/85 via-[#0c101c]/90 to-[#060812]/95 backdrop-blur-2xl p-4 sm:p-6 flex flex-col max-h-[92vh] overflow-hidden dialogue-scanline-bg">
        {/* Specular Glass Top Highlight Edge */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent pointer-events-none z-30" />

        {/* Tactical Corner HUD Marks */}
        <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400/70 pointer-events-none z-30" />
        <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400/70 pointer-events-none z-30" />
        <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400/70 pointer-events-none z-30" />
        <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400/70 pointer-events-none z-30" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-950/60 backdrop-blur-md rounded-2xl border border-amber-500/40 text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.2)]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">文明宝典匣与非遗工坊</h3>
              <p className="text-xs text-slate-400">管理三大文明宝典碎片、补给义体能量或熔铸非遗信物</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Credit Balance Badge - iOS Pill Widget */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/15 text-slate-300 text-xs font-semibold shadow-inner">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] text-slate-400">积分:</span>
              <span className="text-sm font-mono font-bold text-slate-100">{cyberCredits}</span>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher - iOS Segmented Control */}
        <div className="grid grid-cols-2 p-1 bg-black/45 backdrop-blur-xl rounded-2xl border border-white/10 mb-3.5 shrink-0 relative z-10 shadow-inner">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>文明宝典行囊 ({inventory.filter((i) => (i.quantity || 0) > 0).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('workshop')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'workshop'
                ? 'bg-rose-500/20 border border-rose-400/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>巴渝非遗量子工坊</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative z-10 custom-scrollbar">

          {activeTab === 'inventory' ? (
            <>
              {/* Black Market Direct Energy Recharge Station */}
              <div className="p-3.5 bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/10 text-xs text-slate-300 space-y-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between">
                  <strong className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    黑市积分充能站 (直接义体充能)
                  </strong>
                  <span className="text-[10px] text-slate-400">当前能量: {playerEnergy}/100</span>
                </div>

                {/* Full Energy Warning Toast inside Modal */}
                {fullEnergyTip && (
                  <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>💡 提示：当前义体能量已达 100/100 满值，无需补充能量！</span>
                  </div>
                )}

                <div className="pt-0.5">
                  <button
                    onClick={handleRechargeClick}
                    disabled={cyberCredits < RECHARGE_COST}
                    className="w-full p-3 rounded-xl bg-black/40 hover:bg-white/[0.08] border border-white/10 disabled:opacity-40 text-left transition-all flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-white/[0.06] rounded-xl border border-white/10">
                        <Zap className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-xs sm:text-sm">义体紧急电路充能 (直接注入能量)</div>
                        <div className="text-[10px] text-amber-400/90 font-medium">回复 +{RECHARGE_ENERGY_GAIN} 点义体能量</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-300 bg-white/[0.06] px-3 py-1.5 rounded-full border border-white/10">
                      {RECHARGE_COST} 积分
                    </span>
                  </button>
                </div>
              </div>

              {/* Highlight Banner for Chonggang Chip (Only if not yet unlocked) */}
              {inventory.some((i) => i.id === 'chonggang_chip' && i.quantity > 0) && !isChonggangUnlocked && (
                <div className="p-3 bg-amber-950/40 backdrop-blur-xl border border-amber-500/40 rounded-2xl text-xs text-amber-200 flex items-center gap-2.5 shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <strong className="text-amber-300 block">💡 纪元解封就绪：</strong>
                    【山崖农耕之火·烟火宝典碎片】已在背包中，点击下方卡片即可解封 -18F 重钢工业遗址！
                  </div>
                </div>
              )}

              {/* Inventory Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                {inventory.map((item) => {
                  const hasQuantity = (item.quantity || 0) > 0;
                  const isBackpackUsable = item.id === 'chonggang_chip' && hasQuantity && !isChonggangUnlocked;
                  const isOperaMask = item.id === 'opera_mask' && hasQuantity;
                  const isHotpot = item.id === 'hotpot_matrix' && hasQuantity;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between backdrop-blur-xl ${
                        isBackpackUsable
                          ? 'bg-amber-950/35 border-amber-500/60 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                          : hasQuantity
                          ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                          : 'bg-black/20 border-white/5 opacity-35'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{item.icon}</span>
                            <h4 className="font-bold text-sm text-slate-100">{item.name}</h4>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              hasQuantity
                                ? 'bg-white/[0.08] text-amber-300 border-white/15'
                                : 'bg-black/40 text-slate-600 border-white/5'
                            }`}
                          >
                            x{item.quantity}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed mb-3 font-light">{item.description}</p>
                      </div>

                      {isBackpackUsable && onUseItem ? (
                        <button
                          onClick={() => onUseItem(item.id)}
                          className="w-full py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md flex items-center justify-center gap-1.5 mt-2 transition-all cursor-pointer active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>点击使用解封 -18F 关卡</span>
                        </button>
                      ) : hasQuantity && item.id === 'chonggang_chip' && isChonggangUnlocked ? (
                        <div className="mt-2 p-2 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>终极密钥已激活 · -18F 重钢已解封</span>
                        </div>
                      ) : isOperaMask && onUseItem ? (
                        <button
                          onClick={() => onUseItem('opera_mask')}
                          className="w-full py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center justify-center gap-1.5 mt-2 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>点击变脸切换人设 ({personaInfo.label})</span>
                        </button>
                      ) : isHotpot && onUseItem ? (
                        <button
                          onClick={() => onUseItem('hotpot_matrix')}
                          className="w-full py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md flex items-center justify-center gap-1.5 mt-2 transition-colors cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>享用量子火锅 (+60能量)</span>
                        </button>
                      ) : hasQuantity && item.id === 'pass_card' ? (
                        <div className="mt-2 p-2 bg-[#090b10] rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>提示：请前往【+8F 李子坝】与 AI 零号机对话时出示核验！</span>
                        </div>
                      ) : hasQuantity && item.id === 'cyber_tea' ? (
                        <div className="mt-2 p-2 bg-[#090b10] rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>提示：请前往【-5F 洪崖洞】与盖碗姐对话时出示共情！</span>
                        </div>
                      ) : hasQuantity && item.id === 'chongqing_badge' ? (
                        <div className="mt-2 p-2 bg-emerald-950/40 rounded-lg border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>最高荣誉勋章：已由考官钢铁之魂核发</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Workshop Tab: 巴渝非遗量子工坊 */
            <div className="space-y-4">
              {/* Workshop Introduction Banner */}
              <div className="p-4 bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-black/40 backdrop-blur-xl rounded-2xl border border-rose-500/35 space-y-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>巴渝非遗量子熔炉 // INTANGIBLE CULTURAL QUANTUM FORGE</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  提取巴渝国家级非遗（川剧变脸、重庆火锅）的深厚人文算力，与 2050 赛博纳米科技融为一体。熔铸非遗信物，彻底化解失控 AI 的底层认知虚无！
                </p>
              </div>

              {/* Craftable Item 1: 川剧变脸 · 量子义体面具 */}
              <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-rose-500/40 transition-all space-y-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">🎭</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-100">川剧变脸 · 量子义体面具</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300">
                          国家级非遗
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
                        融合川剧绝活变脸机制与纳米全息图层。佩戴后可自由切换 3 种人格形态，与失控 AI 交流时大幅加成好感度！
                      </p>
                    </div>
                  </div>
                </div>

                {/* Persona status if owned */}
                {(operaMask?.quantity || 0) > 0 ? (
                  <div className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400">当前激活面相形态：</div>
                      <div className="text-xs font-bold text-amber-300 mt-0.5 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${personaInfo.badgeColor}`}>
                          {personaInfo.label}
                        </span>
                        <span className="text-[11px] text-slate-300 font-light">({personaInfo.desc})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onUseItem && onUseItem('opera_mask')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>瞬息变脸</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 flex items-center justify-between border-t border-white/10">
                    <span className="text-xs text-amber-300 font-mono font-semibold flex items-center gap-1">
                      <Coins className="w-4 h-4" /> {CRAFT_OPERA_MASK_COST} 积分
                    </span>
                    <button
                      onClick={() => onCraftItem && onCraftItem('opera_mask', CRAFT_OPERA_MASK_COST)}
                      disabled={cyberCredits < CRAFT_OPERA_MASK_COST}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>量子熔铸面具</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Craftable Item 2: 赛博九宫格火锅 · 量子聚能底料 */}
              <div className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-amber-500/40 transition-all space-y-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">🍲</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-100">赛博九宫格火锅 · 量子聚能底料</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300">
                          非遗烹饪工艺
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
                        九宫格秘制牛油香料与量子聚变能量结晶。使用后立即回复 +60 义体能量，滚烫的人间烟火能瞬间驱散 AI 虚无死锁！
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/10">
                  <div className="text-xs font-mono">
                    <span className="text-slate-400">已熬制存量: </span>
                    <span className="text-amber-300 font-bold">{hotpotMatrix?.quantity || 0} 份</span>
                    <span className="text-slate-500 ml-3 text-[11px]">(耗资: {CRAFT_HOTPOT_MATRIX_COST} 积分)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(hotpotMatrix?.quantity || 0) > 0 && (
                      <button
                        onClick={() => onUseItem && onUseItem('hotpot_matrix')}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>立即享用 (+60)</span>
                      </button>
                    )}

                    <button
                      onClick={() => onCraftItem && onCraftItem('hotpot_matrix', CRAFT_HOTPOT_MATRIX_COST)}
                      disabled={cyberCredits < CRAFT_HOTPOT_MATRIX_COST}
                      className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-amber-300 border border-white/15 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>量子熬制</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Hint */}
          <div className="text-center mt-2 pb-2 shrink-0">
            <span className="text-[10px] text-slate-500 font-mono">
              ORIGIN_INVENTORY_ENGINE // ECO-2050 // CHONGQING_HERITAGE_v2.0
            </span>
          </div>
          
        </div>
      </div>
    </div>
  );
};
