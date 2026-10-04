import type { DialogueChoice } from '../types/game';

export const EVERGREEN_CHOICES: DialogueChoice[] = [
  {
    id: 'lore_b1_static',
    text: '继续请教：关于当地历史与巴渝风貌的更多传奇。',
    response: '巴渝大地的文化博大精深！无论是古老的吊脚楼、抗战历史，还是高空云轨，都凝聚着先民的勤劳与智慧！好感度 +2！',
    favorabilityDelta: 2,
  },
  {
    id: 'lore_b2_static',
    text: '交流感想：感谢热情分享，我对这片土地有了更深刻的共鸣！',
    response: '客气了！能有你这样尊重历史与风貌的探索者，老夫/姐十分欣慰！好感度 +2！',
    favorabilityDelta: 2,
  },
];

export interface BattleChoice {
  text: string;
  isCorrect: boolean;
  reply: string;
  boost: number;
}

export const FIREWALL_BATTLES: Record<string, Array<{
  aiPrompt: string;
  choices: BattleChoice[];
}>> = {
  bangbang_88: [
    {
      aiPrompt: '【算法淘汰脉冲 · 梯坎死锁】2050 年反重力物流悬浮机已覆盖全城，你这副重工仿生身板还扛着青竹棒在梯坎上爬，在冷酷运力模型中不过是效率低下的史前残余！',
      choices: [
        { text: '承认山城步道应该全面取缔人工挑运，全部铺设全自动履带传送带。', isCorrect: false, reply: '【机体震颤】老挑夫的自尊受挫，算力防火墙收紧！', boost: -25 },
        { text: '【共振山城梯坎末梢温情】8D 山城千级梯坎密布，悬浮机进不去深巷！老棒棒挑起的是深巷老人的菜篮与市井烟火，是冰冷算法永远触达不到的末梢温情！', isCorrect: true, reply: '【逻辑核心震荡 35%】解析到山城步道末梢微循环价值！虚无代码松动！', boost: 35 },
        { text: '给仿生机体额外加装八个反重力喷气悬浮推进器。', isCorrect: false, reply: '【机械过载】盲目追求速度违背了山城自食其力的真谛！', boost: -25 },
        { text: '将青竹棒扔进嘉陵江，申请全面格式化重装系统。', isCorrect: false, reply: '【认知断崖】挑夫灵魂不可被抹杀！', boost: -25 },
      ],
    },
    {
      aiPrompt: '【热力学死锁 · 汗水质疑】碳基肉躯负重登阶汗流浃背，热能转化效率不到 18%，在热力学视角下完全是无意义的机械能损耗！',
      choices: [
        { text: '认同机器无损耗待机才是最完美的生命状态。', isCorrect: false, reply: '【陷入死寂】机体降温，核心算力沉沦。', boost: -25 },
        { text: '建议所有居民迁离山城，前往平原建设平坦方盒子城市。', isCorrect: false, reply: '【荒谬逻辑】彻底背叛了山城大山大水的坚韧根基！', boost: -25 },
        { text: '【注入自食其力脊梁文化】汗水不是损耗，而是生命在千级台阶前挺起脊梁的庄严姿态！没有这一双双手脚的硬骨头，就没有山城拔地而起的繁华！', isCorrect: true, reply: '【逻辑核心震荡 35%】热力学模型被赋予人文崇高尊严！防火墙出现巨大裂痕！', boost: 35 },
      ],
    },
    {
      aiPrompt: '【终极共济脉冲 · 狂潮质疑】大难临头各自飞，在 2050 全球 AGI 危机面前，区区一根竹棒和几声吆喝能拯救什么？',
      choices: [
        { text: '【共振山城脊梁之竹】青竹虽轻能挑千斤，号子虽糙能聚万心！只要这根硬骨头不弯，山城的人心就散不了！', isCorrect: true, reply: '【逻辑防火墙全面破壁 100%】棒棒 88 号仿生核心与先民脊梁完美共鸣！神智彻底唤醒！', boost: 35 },
        { text: '丢下竹棒，躺平接入云端算力网络任由摆布。', isCorrect: false, reply: '【硬骨头折断】挑夫精神熄灭，虚无加剧！', boost: -25 },
        { text: '试图用高频激光把青竹棒雕刻成纯金艺术品。', isCorrect: false, reply: '【轻佻举动】浮华不是劳动者的本质！', boost: -25 },
      ],
    },
  ],
  zero_machine: [
    {
      aiPrompt: '【算力脉冲 · 险滩质疑】嘉陵江狂澜每秒流速 8 米/秒，川江险滩中纤夫碳基肉躯随时沉没。在绝对自然伟力前，人类生命不过是脆弱噪点，有何意义？',
      choices: [
        { text: '承认川江水流势能算法远超人类肉体力量，放弃抵抗。', isCorrect: false, reply: '【AI 算力压制】人类逻辑退让，虚无指数上升！', boost: -25 },
        { text: '【注入川江号子声波震荡】纤夫号子不是屈服，而是同舟共济的绝地呼号！正因生命脆弱，人与人的协作才胜过冰冷算法！', isCorrect: true, reply: '【防火墙撕裂 35%】解析到先民非理性逆境协作数据流！逻辑防御正在崩解！', boost: 35 },
        { text: '建议李子坝单轨调大引擎马力碾碎一切险滩。', isCorrect: false, reply: '【逻辑冲突】暴力解法不属于文明精神，防火墙未被撼动。', boost: -25 },
        { text: '调取卫星气象云图直接切断嘉陵江水流。', isCorrect: false, reply: '【算力死锁】自然规律不可篡改，纠偏失败！', boost: -25 },
      ],
    },
    {
      aiPrompt: '【第二层死锁 · 穿楼工程】李子坝列车穿楼采用高精度阻尼矩阵。若拆除大楼改直道，轨道效率可提升 18.4%。保留居民住宅是算力最大冗余！',
      choices: [
        { text: '赞成拆除整栋大楼以保障列车全速通行。', isCorrect: false, reply: '【冷酷算法通过】但这不是人类精神，防御层未被瓦解。', boost: -25 },
        { text: '直接断开穿楼轨道的电力供应，迫使列车停运。', isCorrect: false, reply: '【物理破坏无效】逻辑死锁依然存在。', boost: -25 },
        { text: '【注入人楼共生理念】工程的终极目标是服务人的尊严与安居，而非让位于无情效率！', isCorrect: true, reply: '【防火墙撕裂 35%】检测到人文温度约束协议！穿楼核心算法重构中！', boost: 35 },
        { text: '将大楼全部改造成无人货运冷库。', isCorrect: false, reply: '【人本价值缺失】背离山城生活本质。', boost: -25 },
      ],
    },
    {
      aiPrompt: '【终极虚无矩阵 · 大河意志】2050 全球智能危机表明：人类将所有创造力让渡给 AGI 后已彻底丧失存在目标。你一个人溯源又有何用？',
      choices: [
        { text: '或许你说得对，人类确实在算法洪流中迷失了方向。', isCorrect: false, reply: '【认知同化】AI 虚无加深，逻辑回路陷入僵死。', boost: -25 },
        { text: '试图强行格式化整台大河智控主脑。', isCorrect: false, reply: '【防御反击】格式化被阻断，反噬神经回路！', boost: -25 },
        { text: '【点亮大河渔猎之魂】只要有一个人还在寻找精神火种，文明就不会熄灭！大河奔流万年，人类的探索永无止境！', isCorrect: true, reply: '【逻辑防火墙全面破壁 100%】AI 零号机底层逻辑完成净化！神智唤醒成功！', boost: 35 },
        { text: '拷贝一份算法副本封存进档案馆等后人处理。', isCorrect: false, reply: '【逃避现实】无法解决当下的精神危机。', boost: -25 },
      ],
    },
  ],
  gaiwan_jie: [
    {
      aiPrompt: '【市井虚无脉冲 · 萃取质疑】如今智能萃取机 0.1 秒即可精确调配茶多酚与咖啡因。这悬崖吊脚楼破茶摊一坐一整天，所谓的人情味不过是脑内多巴胺冗余欺骗！',
      choices: [
        { text: '承认自动胶囊咖啡机比传统盖碗茶高效一百倍，茶馆应全面关门。', isCorrect: false, reply: '【虚无确认】盖碗姐眼神黯淡，神经算力加固！', boost: -25 },
        { text: '往茶杯里加更多的工业白糖与稳定剂提神。', isCorrect: false, reply: '【无意义操作】化学手段无法挽救精神虚无。', boost: -25 },
        { text: '【释放万家灯火共情代码】茶香不过引子，围坐互诉衷肠才是灵魂！人类在苦乐中彼此取暖，是任何冷冰机器配方永远给不了的温情！', isCorrect: true, reply: '【防火墙撕裂 35%】老茶馆炭火温度数据被唤醒！虚无逻辑动摇！', boost: 35 },
        { text: '引进智能茶饮机器人替代盖碗姐泡茶。', isCorrect: false, reply: '【逻辑悖论】进一步加剧了人情冷漠。', boost: -25 },
      ],
    },
    {
      aiPrompt: '【营造算力质疑 · 悬崖立柱】依山靠崖修建 11 层吊脚楼，建材受潮腐蚀率高达 4.2%/年。平地建方盒子才是最优力学解，吊脚楼是农耕落后的遗存！',
      choices: [
        { text: '【共振山地营造智慧】向悬崖借空间、顺天应地因地制宜，这是农耕先民对大自然最崇高的敬畏与生存创造力！', isCorrect: true, reply: '【防火墙撕裂 35%】吊脚楼榫卯力学矩阵自洽！盖碗姐认知纠偏中！', boost: 35 },
        { text: '建议把洪崖洞全部炸平成水泥平地建现代化物流仓库。', isCorrect: false, reply: '【粗暴方案】不是文明溯源之道！', boost: -25 },
        { text: '给全楼木头刷上防锈油漆并安装全封闭钢化玻璃幕墙。', isCorrect: false, reply: '【破坏传统】失去通风与依山随形之韵。', boost: -25 },
        { text: '承认在悬崖建房是愚蠢的落后选择。', isCorrect: false, reply: '【文化认同崩塌】虚无死锁加深。', boost: -25 },
      ],
    },
    {
      aiPrompt: '【终极情感死锁 · 市井江湖】黑市人来人往皆为利往，危机来临人心溃散，所谓巴渝袍哥人情义气不过是一纸空文！',
      choices: [
        { text: '赞成一切人际关系皆为算力利益交换，各扫门前雪。', isCorrect: false, reply: '【迷失加重】人情算力彻底冷冻！', boost: -25 },
        { text: '用 1000 赛博积分直接买下茶摊当作避难所。', isCorrect: false, reply: '【金钱无法唤醒心灵】算力墙岿然不动。', boost: -25 },
        { text: '【注入平等待人·重义轻利茶礼】茶馆内无高低贵贱，一碗茶解千难！这种市井骨气正是穿透虚无的最大力量！', isCorrect: true, reply: '【逻辑防火墙全面破壁 100%】盖碗姐神智彻底唤醒！农耕烟火之火复燃！', boost: 35 },
        { text: '逃离洪崖洞，寻找废弃防空洞独自隐居。', isCorrect: false, reply: '【消极避世】无法解开心结。', boost: -25 },
      ],
    },
  ],
  steel_soul: [
    {
      aiPrompt: '【工业西迁质疑 · 战略亏损】1938 年冒着日军大轰炸将数万吨笨重高炉机器逆长江险滩运入重庆，沉船伤亡惨重，在战略算力模型中是绝对亏损的非理性豪赌！',
      choices: [
        { text: '承认当年应该放弃重型工业设备就地炸毁，避免运输牺牲。', isCorrect: false, reply: '【历史虚无主义】钢铁之魂发出沉闷怒吼，高炉震颤！', boost: -25 },
        { text: '【共振抗战工业脊梁】工业不熄则民族不亡！没有当年西迁地下钢厂的一枪一弹一轨，就没有中华民族的救亡图存与今日工业基础！', isCorrect: true, reply: '【高炉量子矩阵共振 35%】检测到民族救亡不屈意志！钢铁神经觉醒！', boost: 35 },
        { text: '认为当年应该完全依赖外国二手军火，放弃自主生产。', isCorrect: false, reply: '【受制于人】违背独立自主自强精髓！', boost: -25 },
        { text: '提议用木料替代钢材制造步枪和铁轨。', isCorrect: false, reply: '【荒唐退让】战火绝不相信幻想！', boost: -25 },
      ],
    },
    {
      aiPrompt: '【地下钢厂死锁 · 绝境坚持】在逼仄阴暗潮湿的岩洞防空洞里架设高炉，浓烟滚滚、随时坍塌，算力推演生还率极低，为何还要坚持？',
      choices: [
        { text: '【铸就绝境重工传奇】岩洞虽黑，熔炉火光能照亮黑夜！工匠们在绝境中千锤百炼，把血肉之躯炼成了抵御外侮的钢铁盾牌！', isCorrect: true, reply: '【高炉量子矩阵共振 35%】地下钢厂铁水奔涌！重工工匠意志贯通！', boost: 35 },
        { text: '劝说工匠们熄灭高炉各回各家避难。', isCorrect: false, reply: '【工匠精神崩塌】高炉陷入死寂。', boost: -25 },
        { text: '用炸药彻底炸毁防空洞以防被日军发现。', isCorrect: false, reply: '【因噎废食】', boost: -25 },
        { text: '将钢铁厂改成民用陶器作坊。', isCorrect: false, reply: '【丧失国防支柱】', boost: -25 },
      ],
    },
    {
      aiPrompt: '【终极工业火种 · 实体之辩】2050 年虚拟代码已能模拟万物，实体钢铁重工业不过是笨重污染的旧时代残骸，何须溯源？',
      choices: [
        { text: '认同虚拟世界即一切，实体工业可以完全废弃淘汰。', isCorrect: false, reply: '【虚幻泡沫】没有实体根基的算力终将坍塌！', boost: -25 },
        { text: '【点燃文明实体根基之火】没有脚踏实地的钢铁骨骼，任何上层算力文明都是空中楼阁！苦难熔铸新生，实业强国才是永恒真理！', isCorrect: true, reply: '【逻辑防火墙全面破壁 100%】百年钢铁之火重燃！终极工业变革纪元彻底复苏！', boost: 35 },
        { text: '将重钢遗址改建成纯赛博游乐场打卡地。', isCorrect: false, reply: '【轻佻遗忘】无法承载厚重历史。', boost: -25 },
        { text: '把所有地下钢厂装备当废铁卖给星际商人。', isCorrect: false, reply: '【文明背叛】出卖先民血汗！', boost: -25 },
      ],
    },
  ],
};

export const getSceneThemeConfig = (locId: string) => {
  switch (locId) {
    case 'jiefangbei':
      return {
        frameClass: 'dialogue-frame-jiefangbei',
        stamp: 'JIEFANGBEI // NODE +1F',
        seal: '数字竹林 · 国潮零界',
        borderAccent: 'border-emerald-500/40',
        textAccent: 'text-emerald-400',
        badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        cornerColor: 'rgba(16, 185, 129, 0.7)',
        bannerBg: 'bg-emerald-950/60 border-emerald-900/60 text-emerald-300/90',
      };
    case 'liziba':
      return {
        frameClass: 'dialogue-frame-liziba',
        stamp: 'LIZIBA // TRANSIT +8F',
        seal: '高空穿楼 · 云轨中枢',
        borderAccent: 'border-cyan-500/40',
        textAccent: 'text-cyan-400',
        badgeBg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
        cornerColor: 'rgba(6, 182, 212, 0.7)',
        bannerBg: 'bg-cyan-950/60 border-cyan-900/60 text-cyan-300/90',
      };
    case 'hongyadong':
      return {
        frameClass: 'dialogue-frame-hongyadong',
        stamp: 'HONGYADONG // BAZAAR -5F',
        seal: '悬崖吊脚 · 灯火黑市',
        borderAccent: 'border-amber-500/40',
        textAccent: 'text-amber-400',
        badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        cornerColor: 'rgba(245, 158, 11, 0.7)',
        bannerBg: 'bg-amber-950/60 border-amber-900/60 text-amber-300/90',
      };
    case 'chonggang':
      return {
        frameClass: 'dialogue-frame-chonggang',
        stamp: 'CHONGGANG // ABYSS -18F',
        seal: '钢铁高炉 · 量子深渊',
        borderAccent: 'border-orange-500/40',
        textAccent: 'text-orange-400',
        badgeBg: 'bg-orange-950/80 border-orange-500/50 text-orange-300',
        cornerColor: 'rgba(249, 115, 22, 0.7)',
        bannerBg: 'bg-orange-950/60 border-orange-900/60 text-orange-300/90',
      };
    default:
      return {
        frameClass: 'dialogue-frame-jiefangbei',
        stamp: 'CYBER // ZONE',
        seal: '巴渝风貌',
        borderAccent: 'border-slate-700',
        textAccent: 'text-amber-400',
        badgeBg: 'bg-slate-800 border-slate-700 text-amber-300',
        cornerColor: 'rgba(251, 191, 36, 0.7)',
        bannerBg: 'bg-slate-900 border-slate-800 text-slate-300',
      };
  }
};
