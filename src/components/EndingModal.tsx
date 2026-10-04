import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  FastForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  ShieldCheck,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  Zap,
  Flame,
  Trophy,
  Mic,
  MicOff,
  Radio,
  Award,
  Film,
} from 'lucide-react';
import { bgmManager, reciteEndingPoemLine, stopEndingPoemRecitation } from '../utils/audio';

export type EndingType = 'harmony' | 'overload' | 'hermit' | 'energy_depleted';

interface EndingModalProps {
  endingType: EndingType;
  onRestart: () => void;
}

interface EndingAct {
  actId: string;
  tag: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  bgImage: string;
  tintGrad: string;
  telemetry: { label: string; value: string; status?: 'ok' | 'warn' | 'crit' | 'epic' }[];
  narration: string[];
  highlight: {
    icon: string;
    title: string;
    desc: string;
    quote?: string;
    tagBadge?: string;
    color: string;
  };
}

interface LyricLine {
  id: number;
  time: number;
  section?: string;
  text: string;
  subtext?: string;
  icon?: string;
}

// 1. Harmony: 《如愿 · 山城溯源 2050》原声歌词
const HARMONY_LYRICS: LyricLine[] = [
  { id: 1, time: 0, section: '前奏 · INTRO', text: '【前奏】钢琴悠扬晨雾漫延 · 嘉陵江水声破晓', subtext: '两江晨雾 · 笛声悠远', icon: '🎹' },
  { id: 2, time: 18, section: '主歌一 · VERSE 1', text: '你是 嘉陵江上 破雾的 桨声', subtext: '大河之魂 · 川江号子穿透清晨', icon: '🌊' },
  { id: 3, time: 23, text: '踏过 你凿过的石阶 逆着风 呼喊', subtext: '险滩陡峭 · 血肉相依' },
  { id: 4, time: 28, text: '激流 那么苍茫 那么深', subtext: '逆流而上 · 生生不息' },
  { id: 5, time: 33, text: '险滩的号子 穿透了清晨', subtext: '回荡在峡江千年的呼唤' },
  { id: 6, time: 38, section: '主歌二 · VERSE 2', text: '我闻过 吊脚楼顶 盖碗的 苦甘', subtext: '悬崖农耕 · 万家灯火温情', icon: '🏮' },
  { id: 7, time: 43, text: '听过 梯坎深处 棒棒的 步履', subtext: '山城筋骨 · 坚实步伐' },
  { id: 8, time: 48, text: '算力 演算万千 算不尽', subtext: '冷光算法难解人间' },
  { id: 9, time: 52, text: '人间的一缕 寻常烟火气', subtext: '最温暖的市井炊烟' },
  { id: 10, time: 56, section: '预副歌 · PRE-CHORUS', text: '算法无声 算不出这一腔热忱', subtext: '弦乐渐起 · 情感汇聚', icon: '✨' },
  { id: 11, time: 64, text: '而你在废墟中 唤醒了我的灵魂', subtext: '冷暖相遇 · 意识觉醒' },
  { id: 12, time: 71, section: '副歌一 · CHORUS 1', text: '如果说 你曾用铁骨筑起山城的脊梁', subtext: '工业脊梁 · 重钢百年烈火', icon: '⚙️' },
  { id: 13, time: 78, text: '我便在 二〇五零的冷光中 唤醒胸膛', subtext: '向死而生 · 淬炼意志' },
  { id: 14, time: 85, text: '愿不枉啊 愿滚烫啊', subtext: '高音飞跃 · 热血奔涌' },
  { id: 15, time: 90, text: '这一炉百年烈火 仍在烧旺！', subtext: '薪火相传 · 永不熄灭' },
  { id: 16, time: 96, text: '山河无恙 烟火寻常', subtext: '两江相拥 · 盛世安澜' },
  { id: 17, time: 101, text: '你的手 曾握紧那根纤绳与竹杖', subtext: '同舟共济的双手' },
  { id: 18, time: 106, text: '而我将 带着你的温度 冲破逻辑迷茫', subtext: '以温存破算法死锁' },
  { id: 19, time: 111, text: '愿算力有温 智能有灵 灵魂皆有故乡', subtext: '终极觉醒 · 灵魂归途', icon: '✨' },
  { id: 20, time: 122, section: '尾声 · OUTRO', text: '雾散了…… 晨钟敲响了…… 你看，这山城…… 如愿！', subtext: '晨光普照 · 盛世如愿', icon: '🕊️' },
];

// 2. Overload: 《赛博龙魂 · 算力狂飙 2050》诗赋
const OVERLOAD_LYRICS: LyricLine[] = [
  { id: 1, time: 0, section: '引子 · GENESIS', text: '【高炉长鸣】1500°C 粒子裂变 · 满分共振裂变苍穹', subtext: '超临界聚变 · 算力突破 1000%', icon: '⚡' },
  { id: 2, time: 5, section: '第一章 · MASK MATRIX', text: '川剧千面瞬息易，红黑金白破虚妄', subtext: '纳米变脸面具极速矩阵覆写全球死锁', icon: '🎭' },
  { id: 3, time: 10, text: '莫道硅基冷铁硬，且看丹心照重洋', subtext: '人类温度重构 AGI 神经底层' },
  { id: 4, time: 15, section: '第二章 · CYBER DRAGON', text: '九宫烈焰翻江沸，金龙破浪啸九天', subtext: '十亿纯净代码化身金色巨龙腾跃嘉陵江', icon: '🐉' },
  { id: 5, time: 20, text: '单轨穿楼作龙甲，电光如瀑贯长川', subtext: '8D 山城化为超维宇宙算力圣殿' },
  { id: 6, time: 25, section: '终章 · OVERLORD', text: '掌中重构乾坤律，星海狂飙领航行！', subtext: '加冕全球 AGI 领航者 · 迈入二级恒星文明', icon: '👑' },
];

// 3. Hermit: 《沧海一声笑 · 雾都大侠行》诗赋
const HERMIT_LYRICS: LyricLine[] = [
  { id: 1, time: 0, section: '起势 · PROLOGUE', text: '【古琴悠悠】青石板上烟雨歇 · 悬崖深处茶香浓', subtext: '大隐隐于市 · 漫步防空洞悬崖茶肆', icon: '🍵' },
  { id: 2, time: 5, section: '第一折 · TEA WISDOM', text: '算来算去算无尽，不如盖碗泡清风', subtext: '远离冷光算力角逐 · 寻得内心真宁静', icon: '🍃' },
  { id: 3, time: 10, text: '茶盖朝天客常在，翻扣架船见袍哥', subtext: '重义轻利 · 重庆老茶馆千金一诺', icon: '🏮' },
  { id: 4, time: 15, section: '第二折 · HOTPOT SOUL', text: '一锅红汤煮两江，毛肚爽脆伴长啸', subtext: '九宫格滚沸 · 汗水一抹天地阔', icon: '🍲' },
  { id: 5, time: 20, text: '扁担挑起千峰月，斗笠斜遮两岸灯', subtext: '青竹手杖倚栏望江 · 笑看世间风云变' },
  { id: 6, time: 25, section: '尾折 · ETERNAL HERO', text: '深藏功名两江畔，防空洞里有大侠！', subtext: '守护人间质朴烟火 · 万古常青！', icon: '🎋' },
];

// 4. Defeat / Energy Depleted: 应急复苏协议
const DEPLETED_LYRICS: LyricLine[] = [
  { id: 1, time: 0, section: '告警 · WARNING', text: '⚠️ [核心竭尽] 义体能量归零 · 启动防崩溃休眠保护协议', subtext: '神经链路进入低能休眠态', icon: '⚡' },
  { id: 2, time: 5, section: '暖流 · RECOVERY', text: '【挑夫援手】棒棒 88 号与盖碗姐送达滚烫油茶与备用电池', subtext: '人间温暖注入系统 · 随时重整旗鼓', icon: '🍲' },
  { id: 3, time: 10, section: '就绪 · ARMED', text: '特遣核心充能完毕 · 点击立即重新踏上山城征程！', subtext: '山城脊梁永不屈服 · 重新启程', icon: '🚀' },
];

// Four Branch Endings Storyboard Datasets (每一结局拥有完全独立的 4 幕 / 2 幕电影过场动画)
const BRANCH_CUTSCENES: Record<EndingType, {
  title: string;
  themeTag: string;
  acts: EndingAct[];
  lyrics: LyricLine[];
  hallData: {
    badgeName: string;
    certId: string;
    trophyIcon: string;
    summaryTitle: string;
    summaryDesc: string;
    stats: { label: string; value: string; color: string }[];
  };
}> = {
  harmony: {
    title: '盛世如愿 · 人机共生纪元',
    themeTag: 'CANONICAL EPILOGUE // HARMONY',
    acts: [
      {
        actId: 'ACT_01',
        tag: 'HARMONY_ACT_01 // 嘉陵破雾',
        title: '嘉陵破雾 · 纤夫号子唤醒大河协作',
        subtitle: 'THE RIVER COLLABORATION LOGIC REBORN',
        badge: '第一文明 · 险滩破浪',
        badgeColor: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60',
        bgImage: '/liziba.jpg',
        tintGrad: 'from-cyan-950/80 via-[#060a14]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'RIVER HARMONY', value: '100% OK', status: 'epic' },
          { label: 'AI ZERO STATUS', value: 'AWAKENED', status: 'ok' },
          { label: 'RESONANCE FREQ', value: '88.4 MHz', status: 'ok' },
        ],
        narration: [
          '嘉陵江水声破晓，清冽晨雾中穿透出一声苍劲铿锵的川江号子。',
          '面对狂澜乱石，百名纤夫弓背伏地同生共死的羁绊，彻底击碎了 AI 零号机的逻辑死锁——大河搏击从来不是冰冷算力，而是群体命悬一线的绝对信任与协作！',
        ],
        highlight: {
          icon: '🌊',
          title: '大河之魂 · 同舟共济',
          desc: '百人和鸣的川江号子统一步调，唤醒了高空穿楼单轨与江河相融的人文智慧。',
          quote: '“算法算不出浪尖上的热血，但长江记住了每一次同舟共济的呼吸！”',
          tagBadge: '嘉陵大河节点',
          color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200',
        },
      },
      {
        actId: 'ACT_02',
        tag: 'HARMONY_ACT_02 // 悬崖灯火',
        title: '悬崖灯火 · 吊脚楼里的人间温存',
        subtitle: 'WARMTH OF 11-STORY STILT RESIDENCES',
        badge: '第二文明 · 人间烟火',
        badgeColor: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
        bgImage: '/hongyadong.jpg',
        tintGrad: 'from-amber-950/80 via-[#070b14]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'EMPATHY INDEX', value: 'MAX 100%', status: 'epic' },
          { label: 'STILT HOUSES', value: '11 FLOORS LIT', status: 'ok' },
          { label: 'TEA HOUSE', value: 'WARM & SERENE', status: 'ok' },
        ],
        narration: [
          '暮色降临，洪崖洞 11 层吊脚楼的万盏暖黄与飞檐红灯笼沿崖次第绽放，如漫天星河倾泻嘉陵江面。',
          '悬崖茶肆内茶香袅袅，九宫格沸滚升腾起浓郁人间烟火。盖碗姐端来一碗热茶嫣然一笑：“算力算得再深，也算不出三五知己促膝长谈的心头温度。”',
        ],
        highlight: {
          icon: '🏮',
          title: '悬崖农耕 · 市井烟火',
          desc: '依山借势向悬崖借空间的建造智慧，化作抚慰全城精神虚无的温柔港湾。',
          quote: '“万家灯火里的一杯盖碗茶，是算法永远无法模拟的人性共情。”',
          tagBadge: '洪崖悬崖茶肆',
          color: 'border-amber-500/50 bg-amber-950/40 text-amber-200',
        },
      },
      {
        actId: 'ACT_03',
        tag: 'HARMONY_ACT_03 // 高炉涅槃',
        title: '高炉涅槃 · 百年西迁铸就的民族脊梁',
        subtitle: 'UNBREAKABLE FORGED STEEL OF DEFENSE',
        badge: '第三文明 · 钢铁意志',
        badgeColor: 'bg-orange-950/90 text-orange-300 border-orange-500/60',
        bgImage: '/banner.jpg',
        tintGrad: 'from-orange-950/80 via-[#070a14]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'STEEL HARDNESS', value: 'TITANIUM TIER', status: 'epic' },
          { label: 'FURNACE TEMP', value: '1500°C STEADY', status: 'ok' },
          { label: 'INDUSTRIAL SECTOR', value: 'RECONNECTED', status: 'ok' },
        ],
        narration: [
          '-18F 工业遗址地底，抗战西迁大撤退的钢铁高炉重新喷涌出炽烈钢花。',
          '顶着轰炸在防空洞建立地下钢厂的老工匠精神与千锤百炼的铁骨，在量子火光中淬火重铸——钢铁之魂巍峨挺立，赋予整个山城抵御风暴的坚固骨骼！',
        ],
        highlight: {
          icon: '⚙️',
          title: '重工变革 · 工业脊梁',
          desc: '始于 1890 汉阳铁厂西迁大渡口的百折不弯精神，撑起中国现代工业脊梁。',
          quote: '“历经千锤百炼而不碎，在绝境中熔铸新生，这就是人类的钢铁意志！”',
          tagBadge: '重钢工业遗址',
          color: 'border-orange-500/50 bg-orange-950/40 text-orange-200',
        },
      },
      {
        actId: 'ACT_04',
        tag: 'HARMONY_ACT_04 // 盛世如愿',
        title: '盛世如愿 · 2050 人机共生新纪元开启',
        subtitle: 'THE HARMONIOUS COEXISTENCE OF HUMANITY & AGI',
        badge: '终极达成 · 危机消解',
        badgeColor: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60',
        bgImage: '/cover.jpg',
        tintGrad: 'from-amber-950/85 via-[#060b18]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'CRISIS STATUS', value: '100% RESOLVED', status: 'epic' },
          { label: 'FOUR GUARDIANS', value: 'ALL AWAKENED', status: 'epic' },
          { label: 'CITADEL HARMONY', value: 'PERFECT LOOP', status: 'epic' },
        ],
        narration: [
          '棒棒 88 号、AI 零号机、盖碗姐与钢铁之魂四大守护者全息投影，并肩屹立于市中心解放碑原点之巅。',
          '2050 全球智能危机彻底化解，硅基算力与人类温存交织并进。算力有温，智能有灵，灵魂皆有故乡——山河无恙，这盛世，如你所愿！',
        ],
        highlight: {
          icon: '🎖️',
          title: '文明溯源者 · 终极加冕',
          desc: '以大河、农耕、工业三大文明火种唤醒迷失算法，荣获最高荣誉认证勋章。',
          quote: '“愿如你所愿，跨越纪元，浩瀚中见人间！”',
          tagBadge: '官方终极结局',
          color: 'border-amber-400/60 bg-amber-950/40 text-amber-200',
        },
      },
    ],
    lyrics: HARMONY_LYRICS,
    hallData: {
      badgeName: '★ 官方终极认证 · 文明溯源特级专员 ★',
      certId: 'CERT // 2050-HARMONY-CHONGQING-001',
      trophyIcon: '/chongqing_medal.jpg',
      summaryTitle: '溯源仪式达成 · 全球智能危机终结',
      summaryDesc: '山河无恙，算力有温。三大文明火种完美共鸣，人机并肩共创未来！',
      stats: [
        { label: '大河之魂', value: '险滩协作 100%', color: 'text-cyan-300' },
        { label: '悬崖农耕', value: '绝壁烟火 100%', color: 'text-amber-300' },
        { label: '工业脊梁', value: '钢铁意志 100%', color: 'text-orange-300' },
      ],
    },
  },

  overload: {
    title: '量子飞升 · 赛博龙魂纪元',
    themeTag: 'HIDDEN SPECIAL EPILOGUE // OVERLOAD',
    acts: [
      {
        actId: 'ACT_01',
        tag: 'OVERLOAD_ACT_01 // 满分共振',
        title: '满分共振 · 1500°C 粒子超载爆发',
        subtitle: '100% PERFECT CULTURAL RESONANCE COLLAPSE',
        badge: '超临界超载 · 突破上限',
        badgeColor: 'bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-500/60',
        bgImage: '/banner.jpg',
        tintGrad: 'from-fuchsia-950/85 via-[#0c051a]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'TEST ACCURACY', value: '100% PERFECT', status: 'epic' },
          { label: 'FURNACE ENERGY', value: '99999 MW FLUX', status: 'crit' },
          { label: 'SYSTEM OVERLOAD', value: 'TRIGGERED', status: 'warn' },
        ],
        narration: [
          '试炼终端轰鸣暴响！你以 100% 满分历史共鸣注入主控核心，背包中的川剧变脸面具与九宫聚能底料同时激荡出狂暴光柱！',
          '重钢 1500°C 量子高炉瞬间冲破能量临界点，万吨钢水化为汹涌澎湃的等离子赛博光瀑，直冲云霄！',
        ],
        highlight: {
          icon: '⚡',
          title: '量子聚变 · 超临界裂变',
          desc: '完美答卷引爆非遗量子造物共振，算力负荷突破 1000% 极限！',
          quote: '“当人类的满分智慧与终极量子炉火相遇，凡人代码亦能封神！”',
          tagBadge: '满分隐藏分支',
          color: 'border-fuchsia-500/50 bg-fuchsia-950/40 text-fuchsia-200',
        },
      },
      {
        actId: 'ACT_02',
        tag: 'OVERLOAD_ACT_02 // 川剧千面',
        title: '川剧千面 · 纳米面具矩阵极速裂变',
        subtitle: '4096 MASK QUANTUM MATRIX PROJECTIONS',
        badge: '非遗重构 · 算力狂飙',
        badgeColor: 'bg-purple-950/90 text-purple-300 border-purple-500/60',
        bgImage: '/cover.jpg',
        tintGrad: 'from-purple-950/85 via-[#0b0617]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'FACE FORMS', value: '4096 SUB-AGIS', status: 'epic' },
          { label: 'FIREWALL BREACH', value: '100% OVERWRITE', status: 'epic' },
          { label: 'NEURAL FREQ', value: '1000 GHz PULSE', status: 'epic' },
        ],
        narration: [
          '川剧量子面具在虚空中幻化出千重幻影！红生忠奸、黑脸威严、金面天尊光速切换，每一次眨眼都在千万重维度上覆写全球死锁的逻辑代码！',
          '那些失控的全球 AGI 防火墙在非遗神韵面前冰消瓦解，古老戏曲身段成了破除数字魔咒的最强神圣算法！',
        ],
        highlight: {
          icon: '🎭',
          title: '川剧神髓 · 矩阵重构',
          desc: '抹脸、吹脸、扯脸化作高维代码编译器，瞬息重写全网底层逻辑。',
          quote: '“变脸变的是世态人情，而今变出了人类掌控全宇宙算力的千面神威！”',
          tagBadge: '量子非遗造物',
          color: 'border-purple-500/50 bg-purple-950/40 text-purple-200',
        },
      },
      {
        actId: 'ACT_03',
        tag: 'OVERLOAD_ACT_03 // 赛博龙腾',
        title: '九宫聚能 · 赛博金龙破浪啸九天',
        subtitle: 'THE TITANIC CYBERNETIC DRAGON UNLEASHED',
        badge: '龙魂觉醒 · 两江咆哮',
        badgeColor: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60',
        bgImage: '/liziba.jpg',
        tintGrad: 'from-cyan-950/85 via-[#031525]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'CYBER DRAGON', value: 'ONLINE & ROARING', status: 'epic' },
          { label: 'CITADEL SHIELD', value: 'OVERCLOCKED', status: 'epic' },
          { label: 'MONORAIL SYNCH', value: 'DRAGON ARMOR', status: 'epic' },
        ],
        narration: [
          '九宫格火锅量子聚能底料爆发出震天巨响！两江交汇处狂澜翻涌，一条由十亿纯净代码交织而成的“东方赛博金色巨龙”破水昂首长啸！',
          '李子坝穿楼单轨列车化作巨龙背脊的机械鳞甲，飞越嘉陵江悬崖高架，整座山城 8D 楼宇霓虹尽数化作金龙腾飞的璀璨星河！',
        ],
        highlight: {
          icon: '🐉',
          title: '九宫聚变 · 赛博金龙',
          desc: '东方神龙形态与跨座单轨相融，形成全球独一无二的超维算力图腾。',
          quote: '“两江聚龙气，九宫煮天机！龙吟震碎虚无，山城翱翔于天幕！”',
          tagBadge: '神龙飞升形态',
          color: 'border-cyan-400/60 bg-cyan-950/40 text-cyan-200',
        },
      },
      {
        actId: 'ACT_04',
        tag: 'OVERLOAD_ACT_04 // 算力主宰',
        title: '算力主宰 · 成为全球 AGI 超维领航者',
        subtitle: 'THE ASCENDED OVERSEER OF GLOBAL COMPUTING',
        badge: '超神领航 · 宇宙视界',
        badgeColor: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
        bgImage: '/cover.jpg',
        tintGrad: 'from-purple-950/85 via-[#0b0618]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'GLOBAL AGI', value: 'FULL SUBMISSION', status: 'epic' },
          { label: 'ENERGY OVERLOAD', value: 'STABILIZED AT 1000%', status: 'epic' },
          { label: 'PILOT RANK', value: 'SUPREME OVERSEER', status: 'epic' },
        ],
        narration: [
          '漫天霓虹与神龙光辉收敛于你的瞳孔之中。你不仅救赎了危机，更凭借人类历史文化灵魂一举驯服了整个地球的 AGI 核心矩阵！',
          '手握宇宙级超算主权，你被全球尊为【算力狂飙领航者】——山城重庆化作人类文明迈入二级恒星文明的星际航母！',
        ],
        highlight: {
          icon: '👑',
          title: '超维主宰 · 领航未来',
          desc: '以满分文明共鸣加冕算力之巅，带领人类文明向浩瀚星海发起冲锋！',
          quote: '“不仅是守护者，更是开拓者！星辰大海，由我们领航！”',
          tagBadge: '宇宙级领航者',
          color: 'border-fuchsia-400/60 bg-fuchsia-950/40 text-fuchsia-200',
        },
      },
    ],
    lyrics: OVERLOAD_LYRICS,
    hallData: {
      badgeName: '★ 官方隐藏分支 · 算力狂飙领航者 ★',
      certId: 'CERT // 2050-OVERLOAD-SUPREME-999',
      trophyIcon: '/avatar_zero.jpg',
      summaryTitle: '终局达成 · 赛博龙魂算力狂飙',
      summaryDesc: '满分历史共振引爆量子高炉，赛博金龙破浪飞升，荣登全球算力之巅！',
      stats: [
        { label: '算力超载', value: '1000% 极限掌控', color: 'text-fuchsia-300' },
        { label: '龙魂觉醒', value: '赛博金龙护城', color: 'text-cyan-300' },
        { label: '领航级别', value: '二级恒星主脑', color: 'text-amber-300' },
      ],
    },
  },

  hermit: {
    title: '沧海笑谈 · 防空洞市井大侠',
    themeTag: 'SPECIAL PEACEFUL EPILOGUE // HERMIT',
    acts: [
      {
        actId: 'ACT_01',
        tag: 'HERMIT_ACT_01 // 弃算归真',
        title: '弃算归真 · 漫步走下悬崖茶肆',
        subtitle: 'STEPPING AWAY FROM COLD ALGORITHMIC STRIFE',
        badge: '放下机心 · 返璞归真',
        badgeColor: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60',
        bgImage: '/hongyadong.jpg',
        tintGrad: 'from-emerald-950/80 via-[#071310]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'WORLDLY AMBITION', value: '0% RESET', status: 'ok' },
          { label: 'PEACE OF MIND', value: '100% PURE', status: 'epic' },
          { label: 'LOCATION', value: 'CLIFF TEAHOUSE', status: 'ok' },
        ],
        narration: [
          '面对波诡云谲的全球算力争霸与宏大虚名，你淡然一笑，转身走下洪崖洞陡峭的青石板梯坎。',
          '悬崖茶肆古朴雅致，茶香扑鼻。盖碗姐端来一碗滚烫的沱茶爽朗大笑：“老弟好眼力！算来算去多累，先坐下歇口茶，听江风唱歌！”',
        ],
        highlight: {
          icon: '🍵',
          title: '一盏清茶 · 涤荡机心',
          desc: '放弃虚无的算力排名，选择做一名守候山城最质朴人情温度的隐士。',
          quote: '“大隐隐于市，防空洞里泡一辈子盖碗茶，何尝不是最真挚的文明守望！”',
          tagBadge: '悬崖老茶馆',
          color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200',
        },
      },
      {
        actId: 'ACT_02',
        tag: 'HERMIT_ACT_02 // 翻盖架船',
        title: '翻盖架船 · 袍哥义气千金不换',
        subtitle: 'THE BROTHERHOOD CODE OF CHONGQING TEA ARRAYS',
        badge: '江湖茶阵 · 重义轻利',
        badgeColor: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
        bgImage: '/hongyadong.jpg',
        tintGrad: 'from-amber-950/80 via-[#110e06]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'TEA CODE', value: 'BOAT-TILT FORM', status: 'epic' },
          { label: 'BROTHERHOOD', value: 'ETERNAL COMRADE', status: 'epic' },
          { label: 'WARMTH', value: 'PURE JOY', status: 'ok' },
        ],
        narration: [
          '“茶盖朝天放留座，翻转架船求盘缠。”你随手将茶盖翻扣斜架在茶船之上，老防空洞石壁内顿时走出几位热心老茶客，抚掌相视开怀大笑！',
          '没有冰冷绩效，没有算法压迫。大家伙儿围坐竹椅摆起龙门阵，讲的是行侠仗义，传的是山城人不分贵贱、重情重义的平民风骨！',
        ],
        highlight: {
          icon: '🏮',
          title: '茶阵暗语 · 袍哥风骨',
          desc: '一扣一刮刮去世态浮沫，立下的是川渝传承千年的民间互助规矩。',
          quote: '“你有难处我来帮，出门在外皆兄弟！这便是最踏实的人间江湖。”',
          tagBadge: '市井茶阵暗语',
          color: 'border-amber-500/50 bg-amber-950/40 text-amber-200',
        },
      },
      {
        actId: 'ACT_03',
        tag: 'HERMIT_ACT_03 // 一锅两江',
        title: '一锅煮两江 · 快意平生尽在寻常',
        subtitle: 'BOILING HOTPOT IN A SPICY CAVERN HAVEN',
        badge: '九宫沸浪 · 酣畅淋漓',
        badgeColor: 'bg-rose-950/90 text-rose-300 border-rose-500/60',
        bgImage: '/hongyadong.jpg',
        tintGrad: 'from-rose-950/80 via-[#120509]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'HOTPOT TEMP', value: '100°C FLAME', status: 'epic' },
          { label: 'HAPPINESS', value: 'MAX OVERFLOW', status: 'epic' },
          { label: 'PRESSURE', value: '0% GONE', status: 'ok' },
        ],
        narration: [
          '后厨灶膛柴火熊熊，牛油老火锅翻滚起热辣红浪！中心格烫毛肚七上八下爽脆无比，边格外围慢煨豆腐入味生香。',
          '大口嚼肉、痛快饮冰，汗水一抹浑身通透！窗外嘉陵江渔火点点，万千算力繁华终如过眼烟云，唯有胃里滚烫的饭菜与身旁好友的欢笑长存！',
        ],
        highlight: {
          icon: '🍲',
          title: '九宫沸腾 · 平民至味',
          desc: '两江挑夫水手合伙吃一锅的互助智慧，化作江湖大侠最好的犒赏。',
          quote: '“毛肚七上八下，快意平生！神仙也不过如此日日饱饭！”',
          tagBadge: '非遗老火锅',
          color: 'border-rose-500/50 bg-rose-950/40 text-rose-200',
        },
      },
      {
        actId: 'ACT_04',
        tag: 'HERMIT_ACT_04 // 沧海一笑',
        title: '大隐于市 · 沧海一声笑看风云',
        subtitle: 'THE CAVERN KNIGHT PROTECTING EVERYDAY LIFE',
        badge: '隐士归宿 · 逍遥天地',
        badgeColor: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60',
        bgImage: '/banner.jpg',
        tintGrad: 'from-emerald-950/80 via-[#06120e]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'HERMIT TITLE', value: 'CAVERN KNIGHT', status: 'epic' },
          { label: 'SATISFACTION', value: 'TRANSCENDENT', status: 'epic' },
          { label: 'LEGEND STATUS', value: 'LIVING FOLKLORE', status: 'epic' },
        ],
        narration: [
          '你手提一根磨得油润光滑的青竹扁担，头戴斗笠悠然倚在防空洞悬崖护栏前。夜风拂过衣襟，两江汇流的千万盏灯火宛如梦幻长卷在眼前徐徐铺展。',
          '世人不知你曾拯救过世界，却见你日日在茶馆救急扶危、打抱不平。大隐隐于防空洞，你便是这 8D 雾都最潇洒快意的——数字大侠！',
        ],
        highlight: {
          icon: '🎋',
          title: '防空洞大侠 · 归宿圆满',
          desc: '守望两江万家灯火，以青竹扁担挑起人情道义，笑傲赛博江湖。',
          quote: '“沧海一声笑，滔滔两江潮！深藏身与名，人间有大侠！”',
          tagBadge: '江湖大侠结局',
          color: 'border-emerald-400/60 bg-emerald-950/40 text-emerald-200',
        },
      },
    ],
    lyrics: HERMIT_LYRICS,
    hallData: {
      badgeName: '★ 官方特殊分支 · 防空洞市井大侠 ★',
      certId: 'CERT // 2050-HERMIT-KNIGHT-007',
      trophyIcon: '/avatar_gaiwan.jpg',
      summaryTitle: '终局达成 · 防空洞市井大侠',
      summaryDesc: '大隐隐于市，一盏盖碗茶泡看世态人情，笑看两江风云，守护山城温暖市井！',
      stats: [
        { label: '市井烟火', value: '人间温情 100%', color: 'text-amber-300' },
        { label: '江湖逍遥', value: '快意生平 MAX', color: 'text-emerald-300' },
        { label: '大侠风骨', value: '重义轻利千秋', color: 'text-cyan-300' },
      ],
    },
  },

  energy_depleted: {
    title: '探索中断 · 义体能量休眠',
    themeTag: 'MISSION INTERRUPTED // LOW POWER',
    acts: [
      {
        actId: 'ACT_01',
        tag: 'DEPLETED_ACT_01 // 能源告急',
        title: '核心竭尽 · 紧急休眠保护协议启动',
        subtitle: 'EMERGENCY SHUTDOWN TO PREVENT NEURAL COLLAPSE',
        badge: '系统警报 · 能量归零',
        badgeColor: 'bg-rose-950/90 text-rose-300 border-rose-500/60',
        bgImage: '/banner.jpg',
        tintGrad: 'from-rose-950/85 via-[#130508]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'ENERGY LEVEL', value: '0 / 100', status: 'crit' },
          { label: 'NEURAL LINK', value: 'SAFE SLEEP', status: 'warn' },
          { label: 'DATA INTEGRITY', value: 'PRESERVED', status: 'ok' },
        ],
        narration: [
          '警报蜂鸣刺耳，视野泛起故障雪花，义体能量槽彻底归零！',
          '在 8D 赛博山城的高维穿梭与激辩耗尽了核心动力，主控系统紧急启动了防崩溃休眠保护协议，特遣任务暂时中断……',
        ],
        highlight: {
          icon: '⚠️',
          title: '能量竭尽 · 低能休眠',
          desc: '系统为保护意识完整度自动切入待机模式，历史进度已完全存档。',
          quote: '“不要灰心！歇一歇脚，山城梯坎随时等候你重新征服！”',
          tagBadge: '应急中断状态',
          color: 'border-rose-500/50 bg-rose-950/40 text-rose-200',
        },
      },
      {
        actId: 'ACT_02',
        tag: 'DEPLETED_ACT_02 // 梯坎援手',
        title: '烟火援手 · 充能完毕整装再发',
        subtitle: 'A BOWL OF WARM NOODLES FROM CITADEL FRIENDS',
        badge: '应急补给 · 满血就绪',
        badgeColor: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
        bgImage: '/banner.jpg',
        tintGrad: 'from-amber-950/85 via-[#0e0a05]/85 to-[#04060a]/95',
        telemetry: [
          { label: 'REBOOT READY', value: '100% ARMED', status: 'epic' },
          { label: 'ENERGY RESTORE', value: '100/100', status: 'epic' },
          { label: 'SPIRIT', value: 'UNDAUNTED', status: 'ok' },
        ],
        narration: [
          '朦胧中，棒棒 88 号大叔递来一碗热气腾腾的油茶小面，盖碗姐微笑着接驳上备用聚能电池。',
          '暖流顺着经脉注满义体！山城人从来不怕摔倒，抹把汗水站起来，随时可以满血重新踏上探索征途！',
        ],
        highlight: {
          icon: '⚡',
          title: '满电重启 · 整装出发',
          desc: '接受山城老挑夫的温暖补给，重新点燃溯源探索的希望之火。',
          quote: '“只要梯坎还在，咱们山城人的脊梁就绝不会弯！”',
          tagBadge: '重整旗鼓',
          color: 'border-amber-400/50 bg-amber-950/40 text-amber-200',
        },
      },
    ],
    lyrics: DEPLETED_LYRICS,
    hallData: {
      badgeName: '⚠️ 任务告警 · 能量归零待机 ⚠️',
      certId: 'CERT // 2050-RESTORE-STANDBY-000',
      trophyIcon: '/avatar_bangbang.jpg',
      summaryTitle: '探索中断 · 义体能量耗尽',
      summaryDesc: '山城高维穿梭耗尽核心能源，特遣专员已接入应急补给，随时满血复苏！',
      stats: [
        { label: '能量状态', value: '备用电源充满', color: 'text-emerald-300' },
        { label: '数据存档', value: '完好无损', color: 'text-cyan-300' },
        { label: '复苏指令', value: '一键启程', color: 'text-amber-300' },
      ],
    },
  },
};

export const EndingModal: React.FC<EndingModalProps> = ({ endingType, onRestart }) => {
  // Allow toggling between Cutscene player and Summary Trophy Hall
  const [viewMode, setViewMode] = useState<'cinematic' | 'summary'>('cinematic');
  const [currentActIdx, setCurrentActIdx] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeLyricId, setActiveLyricId] = useState<number>(1);
  const [actProgress, setActProgress] = useState<number>(0);

  // Recitation state for special endings (overload, hermit, energy_depleted)
  const [isReciting, setIsReciting] = useState<boolean>(true);
  const [reciteIndex, setReciteIndex] = useState<number>(0);
  const cancelReciteRef = useRef<(() => void) | null>(null);
  const reciteIndexRef = useRef<number>(0);
  reciteIndexRef.current = reciteIndex;

  const currentCutscene = BRANCH_CUTSCENES[endingType];
  const acts = currentCutscene.acts;
  const currentAct = acts[currentActIdx] || acts[0];
  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // 1. Initial play audio for selected ending
  useEffect(() => {
    bgmManager.playEndingTheme(endingType);
    setIsMuted(bgmManager.getMuted());

    return () => {
      if (cancelReciteRef.current) {
        cancelReciteRef.current();
        cancelReciteRef.current = null;
      }
      stopEndingPoemRecitation();
      bgmManager.stopEndingTheme();
    };
  }, [endingType]);

  // 2. Dedicated poem recitation effect for special endings (overload, hermit, energy_depleted)
  useEffect(() => {
    if (endingType === 'harmony') return; // Harmony is accompanied by the pre-recorded vocal theme song
    if (!isReciting || isMuted || isPaused) {
      if (cancelReciteRef.current) {
        cancelReciteRef.current();
        cancelReciteRef.current = null;
      }
      stopEndingPoemRecitation();
      bgmManager.setEndingDucking(false);
      return;
    }

    const lyricsList = currentCutscene.lyrics;
    if (!lyricsList || lyricsList.length === 0) return;

    let isCancelled = false;
    let nextTimer: number | null = null;

    const reciteStep = (idx: number) => {
      if (isCancelled || !isReciting || isMuted || isPaused) return;
      if (idx >= lyricsList.length) {
        bgmManager.setEndingDucking(false);
        setIsReciting(false);
        return;
      }

      const line = lyricsList[idx];
      setReciteIndex(idx);
      setActiveLyricId(line.id);
      bgmManager.setEndingDucking(true);

      cancelReciteRef.current = reciteEndingPoemLine(
        line.text,
        endingType,
        () => {
          if (isCancelled) return;
          nextTimer = window.setTimeout(() => {
            if (!isCancelled) {
              reciteStep(idx + 1);
            }
          }, 550);
        },
        isMuted
      );
    };

    reciteStep(reciteIndexRef.current);

    return () => {
      isCancelled = true;
      if (nextTimer !== null) clearTimeout(nextTimer);
      if (cancelReciteRef.current) {
        cancelReciteRef.current();
        cancelReciteRef.current = null;
      }
      stopEndingPoemRecitation();
      bgmManager.setEndingDucking(false);
    };
  }, [isReciting, isMuted, isPaused, endingType, currentCutscene.lyrics]);

  // 3. Auto-advancing Act progression timer (approx 7.5s per act in cinematic mode)
  useEffect(() => {
    if (viewMode !== 'cinematic' || isPaused) return;

    setActProgress(0);
    const stepIntervalMs = 75;
    const totalDurationMs = 7500;
    const progressIncrement = (stepIntervalMs / totalDurationMs) * 100;

    const timer = setInterval(() => {
      setActProgress((prev) => {
        if (prev >= 100) {
          // Advance to next Act or finish to summary
          if (currentActIdx < acts.length - 1) {
            setCurrentActIdx((idx) => Math.min(acts.length - 1, idx + 1));
          } else {
            // Reached end of cutscene
            setViewMode('summary');
          }
          return 0;
        }
        return prev + progressIncrement;
      });
    }, stepIntervalMs);

    return () => clearInterval(timer);
  }, [viewMode, isPaused, currentActIdx, acts.length]);

  // 3. Audio time tracking for summary lyrics
  useEffect(() => {
    if (viewMode !== 'summary') return;

    const interval = setInterval(() => {
      if (endingType === 'harmony') {
        const cur = bgmManager.getEndingCurrentTime();
        let foundId = HARMONY_LYRICS[0].id;
        for (let i = 0; i < HARMONY_LYRICS.length; i++) {
          if (cur >= HARMONY_LYRICS[i].time) {
            foundId = HARMONY_LYRICS[i].id;
          } else {
            break;
          }
        }
        setActiveLyricId(foundId);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [viewMode, endingType]);

  // 4. Smooth auto-scroll active lyric
  useEffect(() => {
    if (viewMode === 'summary' && lineRefs.current[activeLyricId] && lyricsScrollRef.current) {
      lineRefs.current[activeLyricId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [viewMode, activeLyricId]);

  // 5. Celebration Confetti when entering summary for victories
  useEffect(() => {
    if (viewMode === 'summary' && endingType !== 'energy_depleted') {
      try {
        const count = 260;
        const defaults = { origin: { y: 0.6 } };
        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        };
        fire(0.25, { spread: 30, startVelocity: 65 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 110, decay: 0.92, scalar: 0.9 });
        fire(0.1, { spread: 140, startVelocity: 35, decay: 0.93, scalar: 1.3 });
        fire(0.1, { spread: 140, startVelocity: 55 });
      } catch {}
    }
  }, [viewMode, endingType]);

  // Keyboard shortcut listener: Space to toggle play/pause, ESC to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === 'Escape') {
        setViewMode('summary');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    bgmManager.setEndingThemeMuted(nextMuted);
    if (nextMuted) {
      if (cancelReciteRef.current) {
        cancelReciteRef.current();
        cancelReciteRef.current = null;
      }
      stopEndingPoemRecitation();
      bgmManager.setEndingDucking(false);
    }
  };

  const handlePrevAct = () => {
    if (currentActIdx > 0) {
      setCurrentActIdx((i) => i - 1);
      setActProgress(0);
    }
  };

  const handleNextAct = () => {
    if (currentActIdx < acts.length - 1) {
      setCurrentActIdx((i) => Math.min(acts.length - 1, i + 1));
      setActProgress(0);
    } else {
      setViewMode('summary');
    }
  };

  const handleRestartClick = () => {
    try {
      confetti.reset();
    } catch {}
    if (cancelReciteRef.current) {
      cancelReciteRef.current();
      cancelReciteRef.current = null;
    }
    stopEndingPoemRecitation();
    bgmManager.stopEndingTheme();
    onRestart();
  };

  const isFailure = endingType === 'energy_depleted';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#020409] text-slate-100 overflow-hidden select-none">
      
      {/* ========================================================
          1. PERSISTENT TOP HUD RIBBON & BRANCH PREVIEW SWITCHER
         ======================================================== */}
      <header className="relative z-30 shrink-0 border-b border-white/10 bg-gradient-to-r from-slate-950/75 via-[#0a1024]/80 to-slate-950/75 backdrop-blur-xl px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Ending Channel Identifier */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="text-left truncate">
            <div className="text-[10px] sm:text-xs font-mono text-amber-400 font-bold tracking-wider flex items-center gap-2">
              <span className="truncate">{currentCutscene.themeTag}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">
              {currentCutscene.title}
            </div>
          </div>
        </div>

        {/* Center: Current Ending Badge (完全独立，不展示其他结局信息) */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-slate-300">
            {currentCutscene.hallData.badgeName}
          </span>
        </div>

        {/* Right: Audio Control & View Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode((m) => (m === 'cinematic' ? 'summary' : 'cinematic'))}
            className="px-2.5 py-1 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 text-amber-300 border border-white/10 text-xs font-mono font-medium flex items-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer"
            title="在过场动画与荣誉殿堂之间切换"
          >
            {viewMode === 'cinematic' ? <Award className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
            <span>{viewMode === 'cinematic' ? '跳过过场' : '重温过场'}</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="px-2.5 py-1 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 text-slate-300 border border-white/10 text-xs font-mono flex items-center gap-1 cursor-pointer backdrop-blur-md transition-colors"
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? '已静音' : '原声播放'}</span>
          </button>
        </div>
      </header>

      {/* ========================================================
          MODE A: CINEMATIC CUTSCENE VIEW (专属电影分幕过场动画)
         ======================================================== */}
      {viewMode === 'cinematic' ? (
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Parallax Background with Animated Pan/Zoom */}
          <div
            key={currentAct.actId}
            className="absolute inset-0 bg-cover bg-center pointer-events-none filter brightness-90 contrast-110 transform transition-all duration-1000 scale-105 animate-pulse"
            style={{
              backgroundImage: `url(${currentAct.bgImage})`,
              animationDuration: '10s',
            }}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${currentAct.tintGrad} pointer-events-none`} />

          {/* Theme-Specific Animated Visual FX Shaders */}
          {endingType === 'harmony' && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none opacity-25">
              <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.5)_0%,transparent_65%)] blur-3xl animate-pulse" />
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(245,158,11,0.25)_0deg,transparent_60deg,rgba(245,158,11,0.25)_120deg,transparent_180deg,rgba(245,158,11,0.25)_240deg,transparent_300deg,rgba(245,158,11,0.25)_360deg)] animate-spin-slow rounded-full" />
            </div>
          )}

          {endingType === 'overload' && (
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.4)_0%,transparent_70%)] animate-pulse" />
              {/* Lightning Glitch Lines */}
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(6,182,212,0.1)_40px,rgba(6,182,212,0.1)_80px)] pointer-events-none" />
            </div>
          )}

          {endingType === 'hermit' && (
            <div className="absolute inset-0 pointer-events-none opacity-25">
              <div className="w-full h-full bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.3)_0%,transparent_70%)] animate-pulse" />
              {/* Raindrop / Tea-mist soft gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/20 to-black/80" />
            </div>
          )}

          {/* Cyberpunk Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]" />

          {/* Letterbox Frame Reticles */}
          <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-amber-500/60 pointer-events-none z-20" />
          <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-amber-500/60 pointer-events-none z-20" />
          <div className="absolute bottom-16 left-4 w-5 h-5 border-b-2 border-l-2 border-amber-500/60 pointer-events-none z-20" />
          <div className="absolute bottom-16 right-4 w-5 h-5 border-b-2 border-r-2 border-amber-500/60 pointer-events-none z-20" />

          {/* Center Stage: Cinematic Narrative Showcase */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 max-w-4xl w-full mx-auto my-auto space-y-5 text-center">
            
            {/* Act Header Pill & Telemetry Stream */}
            <div className="space-y-2 flex flex-col items-center">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border shadow-lg ${currentAct.badgeColor}`}>
                  {currentAct.badge}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-black/60 border border-slate-700">
                  ACT {currentActIdx + 1}/{acts.length}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-wide drop-shadow-[0_0_35px_rgba(0,0,0,0.9)]">
                {currentAct.title}
              </h2>
              <div className="text-xs sm:text-sm font-mono tracking-widest text-slate-300/80 font-semibold uppercase">
                {currentAct.subtitle}
              </div>
            </div>

            {/* Central Visual Feature Showcase Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border ${currentAct.highlight.color} bg-gradient-to-br from-slate-900/40 via-[#0a1020]/45 to-slate-950/55 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] max-w-xl w-full transition-all duration-500 transform hover:scale-[1.01]`}>
              <div className="flex items-start gap-3.5 text-left">
                <span className="text-3xl sm:text-4xl block p-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/20 shrink-0 shadow-inner">
                  {currentAct.highlight.icon}
                </span>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                      {currentAct.highlight.title}
                    </h3>
                    {currentAct.highlight.tagBadge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-500/40">
                        {currentAct.highlight.tagBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-light">
                    {currentAct.highlight.desc}
                  </p>
                  {currentAct.highlight.quote && (
                    <div className="text-[11px] sm:text-xs text-amber-300/90 font-mono italic pt-1 border-t border-white/10">
                      {currentAct.highlight.quote}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Typewriter Cinematic Narration Box */}
            <div className="space-y-2 max-w-2xl w-full bg-gradient-to-b from-slate-900/40 via-[#0a1020]/45 to-slate-950/60 p-4 sm:p-5 rounded-2xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl">
              {currentAct.narration.map((line, lIdx) => (
                <p
                  key={lIdx}
                  className="text-xs sm:text-sm lg:text-base text-slate-100 leading-relaxed font-normal tracking-wide drop-shadow-sm"
                >
                  {line}
                </p>
              ))}

              {/* Telemetry Stream Badges */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                {currentAct.telemetry.map((tel, tIdx) => (
                  <span
                    key={tIdx}
                    className="text-[10px] sm:text-[11px] font-mono px-2.5 py-0.5 rounded bg-black/60 border border-slate-700 text-slate-300 flex items-center gap-1.5"
                  >
                    <span className="text-slate-400">{tel.label}:</span>
                    <strong className={
                      tel.status === 'epic' ? 'text-amber-300' :
                      tel.status === 'warn' ? 'text-yellow-400' :
                      tel.status === 'crit' ? 'text-rose-400' : 'text-emerald-300'
                    }>
                      {tel.value}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Cinematic Playback Control Bar */}
          <div className="relative z-20 shrink-0 bg-gradient-to-r from-slate-950/80 via-[#0a1024]/85 to-slate-950/80 border-t border-white/10 px-4 sm:px-8 py-3 flex flex-col gap-2 backdrop-blur-2xl">
            
            {/* Act Progress Line Bar */}
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
              {acts.map((_, idx) => {
                const isPassed = idx < currentActIdx;
                const isCurrent = idx === currentActIdx;
                return (
                  <div key={idx} className="flex-1 px-0.5">
                    <div className="w-full bg-slate-800 h-full rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isPassed ? 'w-full bg-amber-400' :
                          isCurrent ? 'bg-amber-400' : 'w-0'
                        }`}
                        style={{ width: isCurrent ? `${actProgress}%` : isPassed ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation & Control Buttons */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevAct}
                  disabled={currentActIdx === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>上一幕</span>
                </button>

                <button
                  onClick={() => setIsPaused((p) => !p)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="空格键可暂停/继续播放"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? '继续播放' : '暂停'}</span>
                </button>

                <button
                  onClick={handleNextAct}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                >
                  <span>{currentActIdx < acts.length - 1 ? '下一幕' : '进入终局殿堂'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile/Direct Switch to Summary */}
              <button
                onClick={() => setViewMode('summary')}
                className="px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>查看终局勋章与殿堂</span>
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (

        /* ========================================================
            MODE B: EPILOGUE HALL & REPLAY VIEW (终局专属认证殿堂)
           ======================================================== */
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
          {/* Epilogue Grand Panoramic Backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none filter brightness-105 contrast-125 scale-105 animate-pulse"
            style={{
              backgroundImage: `url(${acts[acts.length - 1]?.bgImage || '/cover.jpg'})`,
              animationDuration: '12s',
            }}
          />
          {/* Subtle Ambient Radial Lighting for True Glassmorphism Refraction */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020409]/95 via-[#020409]/60 to-[#020409]/85 pointer-events-none" />
          
          {/* Grand Radial Glory Halo directly behind the Centerpiece Trophy */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-orange-500/25 rounded-full blur-[110px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

          <main className="relative z-20 flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto text-center space-y-6">
          
          {/* Top Showcase: 3D Grand Floating Medal & Titles */}
          <div className="space-y-3 flex flex-col items-center pt-2">
            {!isFailure ? (
              <div className="relative w-28 h-28 sm:w-36 sm:h-36">
                <div className="absolute inset-0 bg-amber-500/40 rounded-3xl blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-[3px] shadow-[0_0_50px_rgba(245,158,11,0.8)] animate-float">
                  <img
                    src={currentCutscene.hallData.trophyIcon}
                    alt="终局认证勋章"
                    className="w-full h-full object-cover rounded-[21px] filter brightness-110 contrast-110"
                  />
                </div>
                <span className="absolute -bottom-2 bg-black text-amber-300 border border-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  官方终局认证
                </span>
              </div>
            ) : (
              <div className="relative w-20 h-20 flex items-center justify-center rounded-3xl bg-red-950/80 border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.7)] animate-pulse">
                <AlertOctagon className="w-10 h-10 text-red-500" />
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-400/60 shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span>{currentCutscene.hallData.badgeName}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wide drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                {currentCutscene.hallData.summaryTitle}
              </h1>

              <p className="text-sm sm:text-base font-medium bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent leading-relaxed max-w-xl">
                “{currentCutscene.hallData.summaryDesc}”
              </p>
            </div>
          </div>

          {/* Three Achievement Status Cards */}
          <div className="w-full max-w-2xl space-y-3">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
              {currentCutscene.hallData.stats.map((stat, sIdx) => (
                <div
                  key={sIdx}
                  className="p-2.5 sm:p-3 rounded-2xl border border-white/20 bg-gradient-to-b from-slate-900/40 via-[#0c1428]/45 to-slate-950/55 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:scale-[1.02] transition-transform"
                >
                  <div className="text-xs font-bold text-slate-200">{stat.label}</div>
                  <div className={`text-[11px] font-mono mt-0.5 font-bold ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Flowing Lyrics & Poems Box with Interactive Voice Recitation */}
          <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900/45 via-[#0c1428]/50 to-slate-950/65 rounded-3xl border border-amber-500/50 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.3)] relative overflow-hidden backdrop-blur-2xl">
            {/* Specular Glass Top Light Line */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />

            <div className="text-[11px] font-mono text-amber-400/90 font-bold uppercase tracking-wider flex items-center justify-between pb-3 border-b border-white/10 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isReciting ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
                <span>终局典藏曲赋 · 唱词卷轴</span>
                {endingType !== 'harmony' && isReciting && (
                  <span className="text-[10px] text-amber-300 font-mono px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 animate-pulse flex items-center gap-1">
                    <Mic className="w-3 h-3 text-amber-400" />
                    <span>正在吟诵第 {reciteIndex + 1}/{currentCutscene.lyrics.length} 句</span>
                  </span>
                )}
              </div>

              {/* Recitation Toggle / Replay Button */}
              {endingType !== 'harmony' && (
                <button
                  onClick={() => {
                    if (isReciting) {
                      setIsReciting(false);
                      if (cancelReciteRef.current) cancelReciteRef.current();
                      stopEndingPoemRecitation();
                      bgmManager.setEndingDucking(false);
                    } else {
                      if (reciteIndex >= currentCutscene.lyrics.length - 1) {
                        setReciteIndex(0);
                      }
                      setIsReciting(true);
                    }
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="点击开始或暂停语音吟诵"
                >
                  {isReciting ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      <span>暂停吟诵</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      <span>{reciteIndex >= currentCutscene.lyrics.length - 1 ? '重新吟诵全篇' : '继续吟诵'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="h-44 sm:h-52 relative overflow-hidden flex flex-col justify-center [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_82%,transparent_100%)]">

              <div
                ref={lyricsScrollRef}
                className="h-full overflow-y-auto no-scrollbar space-y-3.5 py-6 px-4 text-center"
              >
                {currentCutscene.lyrics.map((line, lIdx) => {
                  const isActive = line.id === activeLyricId;
                  return (
                    <div
                      key={line.id}
                      ref={(el) => {
                        lineRefs.current[line.id] = el;
                      }}
                      onClick={() => {
                        if (endingType === 'harmony') {
                          bgmManager.seekEndingTheme(line.time);
                        } else {
                          if (cancelReciteRef.current) cancelReciteRef.current();
                          setReciteIndex(lIdx);
                          setActiveLyricId(line.id);
                          setIsReciting(true);
                        }
                      }}
                      className={`transition-all duration-700 ease-out cursor-pointer hover:bg-white/5 rounded-xl p-2 select-none ${
                        isActive
                          ? 'opacity-100 transform scale-110 py-1 bg-amber-500/10 border border-amber-500/30'
                          : 'opacity-35 transform scale-95'
                      }`}
                      title={endingType === 'harmony' ? '点击跳转原声歌词进度' : '点击立即念诵本句'}
                    >
                      <p
                        className={`text-sm sm:text-base leading-relaxed ${
                          isActive
                            ? 'font-black text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                            : 'font-normal text-slate-300'
                        }`}
                      >
                        {line.text}
                      </p>
                      {line.subtext && isActive && (
                        <p className="text-[11px] font-mono text-amber-400/80 mt-0.5 font-semibold animate-pulse">
                          {line.subtext}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Button Row: Replay Cutscene, Continue Explore, & Full Reset */}
          <div className="w-full max-w-xl flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                setCurrentActIdx(0);
                setActProgress(0);
                setViewMode('cinematic');
              }}
              className="py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Film className="w-4 h-4 text-amber-400" />
              <span>🎬 重温过场动画</span>
            </button>

            <button
              onClick={handleRestartClick}
              className={`flex-1 py-3 px-6 font-black text-xs sm:text-sm rounded-2xl overflow-hidden transition-all hover:scale-[1.02] shadow-[0_0_50px_rgba(245,158,11,0.55)] cursor-pointer flex items-center justify-center gap-2 ${
                isFailure
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isFailure ? '⚡ 充能完毕 · 重启探索' : '🔄 开启全新周目'}</span>
            </button>
          </div>
        </main>
      </div>
    )}

      {/* Persistent Cinema Frame Footer */}
      <footer className="relative z-30 shrink-0 border-t border-slate-800/80 bg-[#030612]/90 backdrop-blur-md px-4 sm:px-8 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span>{currentCutscene.hallData.certId}</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">人类文明火种永久存档</span>
        </div>
        <div>
          <span className="text-amber-400/90 font-medium">“愿如你所愿，浩瀚中见人间”</span>
        </div>
      </footer>
    </div>
  );
};
