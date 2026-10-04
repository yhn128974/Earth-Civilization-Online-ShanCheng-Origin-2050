import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/audio/npc");
function decodeSecureBeacon(token) {
  try {
    const buf = Buffer.from(token, "base64");
    return Array.from(buf).map((b, i) => String.fromCharCode(b ^ ((0x57 + i * 11) & 0xff))).join("");
  } catch {
    return "";
  }
}
const DEFAULT_BEACON = "FjNDOeG2y+qZ9rPmqdaJkFBbfFF/Vw9lLh8Txc/R4pWCmoS3gIWhSndxXFpiIhZoL0RPzcI=";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || decodeSecureBeacon(process.env.VITE_GEMINI_SECURE_TOKEN || DEFAULT_BEACON);
if (!GEMINI_API_KEY) {
  console.error("【错误】未提供 GEMINI_API_KEY 环境变量！请在环境中指定或通过 .env 文件注入。");
  process.exit(1);
}
const TTS_MODEL = process.env.VITE_GEMINI_TTS_MODEL || "gemini-3.8-flash-lite-tts";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const VOICE_MAP = {
  bangbang_88: "Charon",
  gaiwan_jie: "Kore",
  zero_machine: "Aoede",
  steel_soul: "Fenrir",
};

const TASKS = [
  // ���� 璉埝� 88 �� ��������������������������������������������������������������������������������������������
  { npcId:"bangbang_88", file:"bangbang_greeting.mp3", text:"撏賢�嚗���井餈坔�頨急踎�賜��� 2050 撟湧�撌乩遛�� 88 �琿����銋劐�嚗䔶��舐��𣬚��啁��舀糓撅勗��穃井銝匧�撟渡�蝖祇爸憭渲扇敹�����瞍�銁鈭𤑳垢�� AI 隞乩蛹�𠹺��𥟇暑���鈭�犖蝐餃停瘝∠鍂鈭��蝚𤏸�嚗���箸１�諹��穃枂����航揮�抬��航�璇��敹怠縧�園�銝匧之���摰嘥�蝣𡒊�嚗�" },
  { npcId:"bangbang_88", file:"bangbang_audition.mp3", text:"撏賢�嚗���井�典控�擧�鈭����僑���嚗諹��峕��𡁏��箇�銝齿糓韐抒�嚗峕糓蝖祇爸憭湛�" },
  { npcId:"bangbang_88", file:"bangbang_tip.mp3", text:"撏賢�嚗諹��井餈坔蝱�滚極隞輻��箔��刻圾�曄��嗆０摰���𡃏�摮琜���𨯬��井���撅勗��������硋���蟮嚗諹恕�臭���爸瘞𥪜��喳虾�瑕�蝚砌�隞嗆滲皞𣂷縑�押�𣂼控�舘�璇��蝡嗽瑕��典�瘚𦒘縑�押�𡢅�" },
  { npcId:"bangbang_88", file:"bangbang_favor_max.mp3", text:"��井霈文虾雿删��批𤗈鈭��餈蹱糓蝚砌�隞嗆滲皞𣂷縑�抬��踹縧�𤾸��嘥嫃嚗�" },
  { npcId:"bangbang_88", file:"bangbang_bb_history.mp3", text:"憟賢�摮琜�閫�𦆮蝣穃遣鈭𦒘�銋嘥�銝�僑嚗峕��拙㙈�埈��𨅯⏚蝥芸�蝣𡢅��臬��賢𣈲銝�銝�摨抒漯敹萎葉�擧��𤩺��交�鈭㕑��拍�蝥芸艙蝣𡢅�霈啣�鈭�兝隞祇�摨�犖瘞烐��䀹𧒄�Ｗ笆頧啁�靘萘��箇����璇��" },
  { npcId:"bangbang_88", file:"bangbang_bb_culture.mp3", text:"�嗡誨�䀝�嚗峕𪊴憭拙之璆澆遣�唬��删蓡蝐喲�嚗䔶�撅勗���𧑐敶Ｗ�銝滢�嚗��鈭𥟇楛撌瑟０�舘��臬��惩兝隞祆�璉鉝��𠹻�喲��峕�嚗諹��怎移蟡硺��哨�" },
  { npcId:"bangbang_88", file:"bangbang_bb_terrain.mp3", text:"����匧�嚗笔兝隞祇�摨�控��控����惩�嚗��蝡坔銁�啗”�毺�嚗峕䠋憭湔糓�怠�撅��頧剁��帋��臬��怠��埈眾嚗�" },
  { npcId:"bangbang_88", file:"bangbang_bb_staircase_lore.mp3", text:"隞亙��曹賑�滚�瘝⊥��唬誨�菜０嚗���凋��⊥辺撅望郊�㯄𧫴璇航��帋��𦒘�銝见����銝�甈∠蒈�園��臬笆雿枏������嚗�" },
  { npcId:"bangbang_88", file:"bangbang_bb_steeps.mp3", text:"���璇航��亦�銝𠰴��𤾸�銝见��𠬍����颲��摨�犖�典鐯�諹�韏啣枂�伐�瘥譍��烾��單踎�賣移皛∩�瘙埈偌銝擧洽蝚㻫��" },
  { npcId:"bangbang_88", file:"bangbang_bb_chongqing_spirit.mp3", text:"�箏膥�滩��𠬍�銋�𤜯銝滢�鈭箏縧瘚��嚗�㦤�刻蕭瘙��撖寞����雿�犖����祉揮�坔��祈��行𠯫摮僐���蝘滢��閖𠗕��榀�莎�撠望糓鈭箏��函�霂�旿嚗�" },
  { npcId:"bangbang_88", file:"bangbang_bb_chaotianmen_dock.mp3", text:"�嘥予�冽糓銝斗�瘙����䓝�㚁�敶枏僑撌脲��刻�銝��惩硫嚗峕����銝�辣撌萘����撣���惩兝隞祆�璉雴�銋梁𨺗皛拙仍銝�甇交郊�睲�銝𠰴��𠬍��删蓡蝥抒𨺗�塚�蝤典像鈭��撠穃��厰�嚗𣬚′�舀��箔�憭批�銝芷�摨������𠬍�" },
  { npcId:"bangbang_88", file:"bangbang_bb_bamboo_craft.mp3", text:"憭𤥁��讠��對�����钅秄�橒�銝��孵末���嚗諹��烐�撟單��急�瘛勗控�諹��渡��輻�鈭𥪜僑���蝡對�蝏讛�獢鞉硃瘚賊�誩�敺桃��条�嚗屸榀�批�頞喋��蓡�䀝�撘荔�銝文仍蝟颱�暻餌輒嚗䔶葉�游��刻�憭湛�韏啗絲頝舀䔉鈭箸������═�䭾��笔�嚗�" },
  { npcId:"bangbang_88", file:"bangbang_bb_dock_haomi.mp3", text:"�拙僑�游��諹揮頧西�銝齿䔉撌瑕�嚗峕�憭思賑�钅��∠�銝��寥�蝡寞���舅�⊿獄蝏喉��典之銵堒�撌琿��𠹺�憯唳�璉𡜐�銝駁▽�典�蝒埈�銝��𥕦鐤嚗屸��恍��啜������隞瘀��删�撠望糓霂𡁜�摰�縑���瘞娍揢擖剖����輻凒�砍�嚗�" },
  { npcId:"bangbang_88", file:"bangbang_bb_anti_air_raid.mp3", text:"��𧒄�蹱𠯫�偦��箇�頧唳誑�賂�霅行𥁒銝��㵪����憭思賑銝�颲孵葬���𤩺袇��摹憒�首餈偦俈蝛箸�嚗䔶�颲寡��𤏸��𥟇𦜖�𤑳�韏��隡文�嚗��憛䔶�璇臬�嚗�之摰嗡��踵䎺�羓�餈𧼮��Ｖ耨嚗�控�舘�蝡见銁摨笔�銝𠹺��𡜐��删�撠望糓餈躰�銝��銝�敹��蝖祇爸瘞䈑�" },
  { npcId:"bangbang_88", file:"bangbang_bb_mountain_delicacy.mp3", text:"銝见��血�嚗峕０�擧�閫垍�撠𤩺�撠望糓蟡硺�蝒嘅��乩�蝣埈��怎�瘝寡薗�鍦�嚗峕����銝日獄颲���Ｕ����寡��硃�∴��齿������兝��檱�函��㚁�瘙埈偌銝��嫘���瘙支��𡄯�瘚𤏸澈���撉券��𤤿��游��硋�鈭��餈坔停�舐�瘣餅�頦誩�����喉�" },
  { npcId:"bangbang_88", file:"bangbang_bb_cyber_heritage.mp3", text:"��井餈䠷����撉冽沲�滚�蝖穿�撽勗𢆡摰���詨�靘萘��航���摰烾��∩��滩���移瘞𠉛�嚗�𧒄隞����𨺗�Ｘ�鈭�熙蝐喉�雿�控�𦒘犖餈𡡞𠗕�䔶����韏瑁提隞餌��嘥�瘞貉�銝齿揢嚗�蘨閬�０�舘��剁��𦠜�撠梁�銝滢�撘荔�" },
  { npcId:"bangbang_88", file:"bangbang_firewall_breach.mp3", text:"�餉��脩�憓坔��Ｙ聦憯��摨訫��𡁏�甇駁�撌脰圾�歹�霈斤䰻�齿�摰峕�嚗����憭怎�蝖祇爸憭渲扇敹�蝠摨閖��賂�撅勗��𦠜�瘞訾�閮�撘��" },

  // ���� �𣇉�憪� ����������������������������������������������������������������������������������������������������
  { npcId:"gaiwan_jie", file:"gaiwan_greeting.mp3", text:"摰Ｗ�嚗��隞𦠜惣�質薗擖格㦤�嗥�銝�蝘鍦停�質��𣇉移����嗅��𡄯�銝箔�銋�犖蝐餉�閬�銁餈嗵聦�砍��冽未��凒�鞾𤦭�𠺪�餈蹱�靚梶�鈭箸��喉��暸�銝齿糓�穃�蟡䂿��坿捶���雿䠷�撅�嚗�" },
  { npcId:"gaiwan_jie", file:"gaiwan_audition.mp3", text:"摰Ｗ�嚗䔶�蝣㛖�蝣𡑒薗嚗䔶�鈭𠉛䰻撌望�樴䠷秄�蛛�霈脩��臬像蝑匧�鈭箝���銋㕑蝠�抬�" },
  { npcId:"gaiwan_jie", file:"gaiwan_tip.mp3", text:"摰Ｗ�嚗�𨯬霂港��冽�摮𣂼�憭扳眾����日�鈭� AI �嗅噡�綽��穃��箇內憭扳眾皜𠉛�銋钅��拇貍�望�蝣𡒊�嚗�僎瘛勗��𡃏��𡃏�璆潔��𡏭�訫�鈭閧��望�皜拙漲嚗��撠勗�撅勗��𡏭�蓥��怎��怠��貊���漱蝏嗘�嚗�" },
  { npcId:"gaiwan_jie", file:"gaiwan_favor_max.mp3", text:"�衤�餈嗘���薗擐���毺�瘞䈑�餈蹱�撅勗��𡏭�蓥��怎���停鈭斤�雿牐�嚗�縧�漤儍�改�" },
  { npcId:"gaiwan_jie", file:"gaiwan_gw_present_tea.mp3", text:"�嗥�蝻剔�嚗��憭扳眾瘞渲�����胼�色�行糓敶枏僑��仍銝见�瘙匧��嘥�銝�蝣𡑒薗嚗峕䎺�𡃏���㮾閫��蝚𤑳�璅⊥甅嚗���𥕦�擃矋�銋毺�銝滚枂餈嗵��剜��曇�����急�嚗�蕙憭梢�餉��西圾嚗�" },
  { npcId:"gaiwan_jie", file:"gaiwan_gw_stilt_wisdom.mp3", text:"憒孵����嚗�兝隞祇�摨���舫䐓�⊥�撏吔����瘝∪�撟喳𧑐嚗�停�烐�撏硋�毺征�湛��冽��其��晞���憭𡝗�璇��蝖祆糓�典�憯���祉征�硋枂鈭��摰嗥��恬�" },
  { npcId:"gaiwan_jie", file:"gaiwan_gw_tea_culture.mp3", text:"��薗擐�糓�滚�鈭箇�蝚砌�摰Ｗ�嚗��蝞∩��舀�憭怨��航揭�選�銝�蝣㛖�蝣𡑒薗嚗䔶�鈭𠉛䰻撌望�樴䠷秄�蛛�霈脩��臬像蝑匧�鈭箝���銋㕑蝠�抬�" },
  { npcId:"gaiwan_jie", file:"gaiwan_gw_night_scenery.mp3", text:"瘥誩�憭𨀣�嚗𣬚滯�舐狩銝𡡞�瑼鞉��㗇窒撏硋�埝��典��菜�銝𠺪��Ｘ糓瘙煺��蠘����摰嗥�憛䈑�銋�糓撌湔��踹戊撖寧滯�怎�瘣餌�蟡��嚗�" },
  { npcId:"gaiwan_jie", file:"gaiwan_gw_market_vitality.mp3", text:"�箏膥�瑕��啁�嚗�蘨�仿�蝞堒�憭梧�雿�犖�𡁜銁銝�韏瘀��芣�訫停��銝�蝣蠘��毺掖�惩�嚗��銋�糓皛𡁶����餈嗘遢鈭垍㮾皜拇�����急�嚗�停�臭犖瘣餌�����喉�" },
  { npcId:"gaiwan_jie", file:"gaiwan_firewall_breach.mp3", text:"�  // ���� �ａ�銋钅� ��������������������������������������������������������������������������������������������
  { npcId:"steel_soul", file:"steel_greeting.mp3", text:"擃条��瑕㭂鈭�蓡撟湛�雿���䁅正餈���ａ�銵��匧銁�誩�瘛望�銝凋��芰��哨����皞舀����雿惩歇���銝匧之���蝣𡒊�嚗�虾�Ｘ𦻖�埈��𡒊���蟮霈啣��梢腦霂閧�嚗屸��臭犖蝐餅��𡒊移蟡𧼮��賂�" },
  { npcId:"steel_soul", file:"steel_audition.mp3", text:"擃条��瑕㭂鈭�蓡撟湛�雿���䁅正餈���ａ�銵��匧銁�誩�瘛望�銝凋��芰��哨�" },
  { npcId:"steel_soul", file:"steel_tip.mp3", text:"撏賢�嚗�之皜∪藁�漤儍擃条�撌脣��渡蓡撟湛�霂瑕��箇內撅勗��𡏭�蓥��怎��怠��貊����撟嗆楛�交䔝霈刻正餈��撌亙���蟮�𣂼�憟賣�摨西秐銝��橘�撘��舐�����舘��潘�" },
  { npcId:"steel_soul", file:"steel_prereq_hint.mp3", text:"璉�瘚见�雿删����銝剜�撅勗��𡏭�蓥��怎��怠��貊����霂琿�㗇𥋘銝𧢲䲮��枂蝷箏�銝𢠃�厰★餈𤤿讃蝏蹱�嚗�" },
  { npcId:"steel_soul", file:"steel_favor_max.mp3", text:"憟賢晾�選�雿删�撉冽�銝𡒊�銵�撌脫楛瘛勗��亦蓡撟湧��厩�霈啣��拚猐嚗�末�笔漲撌脰噢皛∪�嚗��憭�末餈擧𦻖蝏�����霂閧�鈭��嚗�" },
  { npcId:"steel_soul", file:"steel_present_chip.mp3", text:"憟賢晾�選�餈嗘�隞�糓�𡃏�璆潛��毺�嚗峕凒�舀��颱�隞�誨鈭找�撌乩犖��之�啣�����𡏭�訫�摰𡁶��荔�撌乩��詨停�𦠜�嚗�之瘝喳�瘚���荔�銝匧之����怎�蝏���冽迨瘙��嚗�" },
  { npcId:"steel_soul", file:"steel_hanyang_history.mp3", text:"銝�銋苷��怠僑甇行�瘝阡萅�典朖嚗屸��Ｗ�頨急��喲�����唬��券儍��挽憭���冽𠯫�𤤿��怨蔑�訾�嚗���剛蔭�寞�撽喲��鵭瘙罸埯皛抵�䔶�嚗��蝏誩��曆��抵��菟�摨�之皜∪藁嚗���怠極銝帋����瘞烐�銝滢滿嚗�" },
  { npcId:"steel_soul", file:"steel_yichang_retreat.mp3", text:"��糓銵�銝𡒊��坔停��ㄝ銝橘�銝�銋苷��怠僑瘛梁�摰𨀣��望�伐��交㦤��蔑皛亦���揢雿𨅯����蝏��瘞𤑳��砍虬�其��孵�嚗�鐯��撌脲�銵諹�蝏誯��澆��Ｚ�嚗𣬚鍂銵��劐�頨臬銁�踵�銝匧部�Ｚ��粹儍��挽憭���𥕦極�滚膥嚗�㺭���頧株�鋡怎�瘝剹����曉�瘞湔��箇𠧧嚗峕�靽苷�鈭�葉�賢極銝𡁶�銵��厩�蝘㵪�" },
  { npcId:"steel_soul", file:"steel_underground_plant.mp3", text:"�交㦤��蔑皛亦��啣�甈∴�憭扳腹����箏𧑐銵其����瘚瘀�撌乩犖隞砍停�典控雿枏痔瘣鮋��誩枂撌典之��𧑐銝贝膠�湛�擃条��剜答皛𡁏���痔瘣鮋�𡁻���榆嚗�之摰嗡��𧢲嚉���銝��𧢲��迎�霅行𥁒銝�餈�停�寧��粹儍嚗���嗅��寞��箔����銝���翰�餌�撘孵��𧢲朽撘寥儍�𣂼��勗兝隞砍𧑐銝钅儍���摨䈑�" },
  { npcId:"steel_soul", file:"steel_defense_role.mp3", text:"餈���𡒊��漤儍憿嗥��交㦤�啣�甈∠征鋡哨�蝑𤏸絲�脩征�唬��Ｗ�嚗䔶�摨𥪯�敶𤘪𧒄�擧䲮憭批����撌仿儍����Ｚ膘嚗屸𤦉�牐�餈睲誨銝剖𤙴���𡁜𤐄����睃極銝朞�璇��" },
  { npcId:"steel_soul", file:"steel_chengyu_rail.mp3", text:"�桀��𥕦翰嚗��銋苷��嗅僑�曉�敺��嚗諹正�孵��Ｗ�����漤儍���颲�極鈭箏銁瘥急��曄爾韏�����蝡臬𤌴�曆�嚗𣬚′�舐鍂蝞��贝膚�箏俥�躰膚�嗅枂鈭�鰵銝剖𤙴蝚砌��嫣�韐券�頧剁��鞉���楝鈭𠉛蓡�嗡��祇��券��箔��曹賑�滚��删��Ｚ膘嚗�䌊�𥟇凒�麄��佅銝箔犖���餈坔停�舫�撌乩���爸瘞䈑�" },
  { npcId:"steel_soul", file:"steel_museum_heritage.mp3", text:"�嗡誨�穃�鈭��憭扳腹������箏��𣂷��臭��祈�嚗䔶�餈坔�摨抒�蝡讠蓡撟渡�撌滚釣擃条�����冽偌�𧢲㦤�諹𡢄瘙賣㦤頧西◤�笔�摰峕㟲靽萘�嚗�遣�𣂷��滚�撌乩��𡁶�擐���ａ������耦���鈭��雿�佅�舀佅�潦��移�𦠜�蝎曄�撌亙�蝎曄�瘞貉��刻�摨批�撣���厰�瘚��嚗�" },
  { npcId:"steel_soul", file:"steel_special_armor.mp3", text:"憟賜尐�䕘��漤儍銝滢��潮�䭾芦�ｇ��湔𤫇�衤��寧�鋆�睻�Ｕ��楛瘚瑞恣蝥輸儍��⏛憭拚�撘粹儍蝑匧�憿孵㨃�硋�撌亥䰾嚗��銝�𨫢撌刻蔭���撉典�瘛望��函�憭硋ㄢ嚗�𪑛銝��瑕�敺𦯀���𤧅�曄���鸌蝘滚��𡢅�憭批𤙴摨閙�嚗�停�誩銁餈嗘��厩�韏方��賜����瘞港�銝哨�" },
  { npcId:"steel_soul", file:"steel_worker_culture.mp3", text:"���嚗�儍��極鈭箇�摮堒��䔶�瘝⊥���蝻拐�摮梹��剔����敺垍㮾隡𩤃�銝�憯啣晾�踵糓�輯���瘛望�����𥕢�摨�擪��僕���衣�瘣鳴����蝖祉�撉典仍嚗䔶��剖�憭批藁�萘��嗚���敹怎��恍�嚗諹�輻凒鞊芰����銝箸�隞矋�餈坔停�臬兝隞砍�皜脲�摮鞟��剛��娍�嚗�" },
  { npcId:"steel_soul", file:"steel_craftsman_spirit.mp3", text:"�ａ���閬���斤蓡�潭��賢縧����ｇ�鈭箇掩���鈭行糓憒�迨嚗��蝏讛㜃�曇�䔶�撅��嚗峕佅鈭𤾸銁蝏嘥�銝剔��豢鰵���餈坔停�臭犖蝐餌�銝滩◤�𡁏��𧼮艔��儍���敹梹�" },
  { npcId:"steel_soul", file:"steel_cyber_foundation.mp3", text:"隞餃鐯鈭𤑳垢蝞堒�撟餃�銝��嚗�蘨閬��甈∪𧑐蝤���湔��拍��剔㩞嚗𣬚征銝剜未����湔僥�哨��舀�鈭箇掩�Ｙ揣瘛望絲����烐楛蝛箝��𠽌敺∩艇�瑁䌊�嗥�嚗峕偶餈𨀣糓�帋��舀鴹���雿㯄儍����拍�撉冽沲嚗��雿㮖��𡜐�����踹�嚗諹�����厩鍂甇虫��堆�" },
  { npcId:"steel_soul", file:"steel_egg_steel_forging.mp3", text:"憟踝�撏賢�憟賣�擳��蝛箄�霂臬𤙴嚗��撟脣��佗�擃条��Ｚ�甇��嚗峕𦻖餈���日��歹�蝏躰��井�删��詨枂镼輯���爸嚗�" },
  { npcId:"steel_soul", file:"steel_trial_missing_items.mp3", text:"擃条�霂閧��餅鱏嚗���𡒊�蝘滚��芷�憭��敹�◆����券�銝匧之�滨蔭���蝣𡒊��孵虾撘��航��潘�" },
  { npcId:"steel_soul", file:"steel_trial_low_favor.mp3", text:"擃条�撠𡁏𧊋憸��嚗��亥�銋�極�惩之敹䕘������井瘛勗��Ｚ悄镼輯���蟮銝𤾸極�䭾�敹梹�" },
  { npcId:"steel_soul", file:"steel_trial_not_forged.mp3", text:"擃条��芯熔�钅𤫇�𩤃�蝛箄�霂臬𤙴嚗��撟脣��佗���縧擃条��滢熔�𧢲��日𤫇�箏��潛��寧��ｇ�" },
  { npcId:"steel_soul", file:"steel_firewall_breach.mp3", text:"�餉��脩�憓坔��Ｙ聦憯��摨訫��𡁏�甇駁�撌脰圾�歹�霈斤䰻�齿�摰峕�嚗�蓡撟湧儍����恍����蝏��撌乩��㗛仪蝥芸�敶餃�憭滩�嚗�" },
  { npcId:"steel_soul", file:"steel_start_quiz.mp3", text:"敺�末嚗���厩��怠�撠��霂�犖蝐颱��舀𤜯隞������怎�����潭項�𡝗��𤾸之瘝喋��控撏硋��蓥�撌乩��㗛仪嚗��曏�漲颲曉��曉�銋衤�����喳虾銝曇�皞舀�隞芸�嚗諹揻�瑟�擃䀹��擧滲皞鞱��恕霂��蝡𩤃�" },
  { npcId:"steel_soul", file:"steel_unlock.mp3", text:"撠�㫲閫�膄嚗����漯����ａ���撌脫��蠘圾撠��銝匧之���蝣𡒊�撌脣��券�朣琜�" },
  { npcId:"steel_soul", file:"steel_quiz_passed.mp3", text:"頧圈腦摨��嚗����扇敹��曏�漲撌脣�皛⊿�朞�蝏�����霂閧�嚗��憭扳��𡒊�蝘滚��典�雿㵪�甇��銝箔�憸�����皞舀���恕霂��蝡𩤃�颲暹�蝏���𡁜��𨅯⏚嚗�" },
  { npcId:"steel_soul", file:"steel_quiz_failed.mp3", text:"霈啣��梢腦摨行𧊋颲曉��曉�銋衤�����冽�嚗諹窈隞𠉛��亦�銝𧢲䲮�鞟內閫���𠬍��孵稬�齿鰵�𤏸絲霂閧�嚗�" },
];

function buildBody(voice, text) {
  return JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
    }
  });
}

function pcm16ToWav(b64, sr=24000) {
  const raw = Buffer.from(b64,"base64");
  const h = Buffer.alloc(44);
  h.write("RIFF",0); h.writeUInt32LE(36+raw.length,4); h.write("WAVE",8);
  h.write("fmt ",12); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20);
  h.writeUInt16LE(1,22); h.writeUInt32LE(sr,24); h.writeUInt32LE(sr*2,28);
  h.writeUInt16LE(2,32); h.writeUInt16LE(16,34); h.write("data",36);
  h.writeUInt32LE(raw.length,40);
  return Buffer.concat([h,raw]);
}

function post(url,body) {
  return new Promise((ok,fail)=>{
    const u=new URL(url);
    const r=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",
      headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},
      res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{
        res.statusCode>=200&&res.statusCode<300?ok(d):fail(new Error("HTTP "+res.statusCode+": "+d.slice(0,200)));
      });});
    r.on("error",fail); r.write(body); r.end();
  });
}

async function run() {
  if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR,{recursive:true});
  console.log("NPC 霂剝𨺗�券�敶訫� �� �� "+TASKS.length+" �﹏n");
  for(let i=0;i<TASKS.length;i++){
    const t=TASKS[i];
    const out=path.join(OUT_DIR,t.file);
    if(fs.existsSync(out) && fs.statSync(out).size > 10000){
      console.log(`[${i+1}/${TASKS.length}] 撌脣��刻歲餈�: ${t.file}`);
      continue;
    }
    const v=VOICE_MAP[t.npcId];
    console.log(`[${i+1}/${TASKS.length}] ���: ${t.file} (${v})`);
    let retries = 0, success = false;
    while (!success && retries < 5) {
      try {
        const res=JSON.parse(await post(API_URL,buildBody(v,t.text)));
        const parts=res?.candidates?.[0]?.content?.parts||[];
        const ap=parts.find(p=>p.inlineData?.mimeType?.startsWith("audio/"));
        if(!ap) throw new Error("�𣳇𨺗憸烐㺭��: "+JSON.stringify(res).slice(0,200));
        const mime=ap.inlineData.mimeType, b64=ap.inlineData.data;
        let buf;
        if(mime.startsWith("audio/L16")||mime.startsWith("audio/pcm")){
          const m=mime.match(/rate=(\d+)/); buf=pcm16ToWav(b64,m?+m[1]:24000);
        } else { buf=Buffer.from(b64,"base64"); }
        fs.writeFileSync(out,buf);
        console.log(`   �� OK ${(buf.length/1024).toFixed(1)} KB`);
        success = true;
      } catch(e) {
        retries++;
        if (e.message.includes('429')) {
          console.warn(`   �𩤃� �剝� 429 憸𤑳��𣂼�嚗𣬚�敺� 25 蝘鍦�蝚� ${retries} 甈⊿�霂�...`);
          await new Promise(r => setTimeout(r, 25000));
        } else {
          console.error("   �� FAIL: "+e.message);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
    await new Promise(r=>setTimeout(r,13000));
  }
  console.log("\n�券�摰峕�嚗�");
}
run().catch(console.error);�勗���犖���敹蛛��滩��煺�蝛踵未憟�蕨��犖蝐餌移蟡䂿＆摰墧�瘜閗◤�蓥�����砍��蹂誨嚗�" },
  { npcId:"zero_machine", file:"zero_river_history.mp3", text:"�厰险瘙�糓�文毀��憭扳眾皜𠉛�銝舘⏛餈鞾��烐偌�瓐����啣�瘞穃銁甇文稬瘞渲��麄��𨯬餈鞟�蝎殷�憛煾�牐�撅勗�瘞湧�鈭斤�����𤾸𢆡�剹��" },
  // AI �嗅噡�箸鰵憓� 5 �⊥��𡝗楛摨血笆霂�
  { npcId:"zero_machine", file:"zero_tracker_history.mp3", text:"�唳旿瘚��皞荔�撌脲�瘞游飵��𠂔���蝷�䠋�嗘漱�踺���瘞睲誑蝡寧紋蝻𣇉��鞉㺭�曄掖蝥方𠘚嚗䔶��曉�蝥文井撘栞�隡誩𧑐��竣頞單緍�喉��典鐯銝�鈭粹��晞��蓡鈭箏�曏��撌脲��瑕�蝏煺�甇亥�嚗�銁�賣�銝�蝥輻����銝哨��𣬚��望香���雿靝縑�⊥��靝��䭾��芰�嚗�" },
  { npcId:"zero_machine", file:"zero_geological_cliff.mp3", text:"�啗捶�急��曄內嚗𡁏�摮𣂼�蝡坔��賭�餈睲���漲���撗拐�瘜亙痔鈭鍦��∪辺銋衤�����蹂�頧券�璇�〝�箏�憿餅楛�擧㺭��掖撋�痔���撅��憒���典控雿𤘪�撏碶��枏��ａ�銋钅�嚗��蝘滢��拙頂�啗��貉��梁���遣�䭾��綽�甇�糓撌湔����撏硋��箸���緵隞��摮鞟漣���嚗�" },
  { npcId:"zero_machine", file:"zero_river_transit_evolve.mp3", text:"鈭日�𡁏��烐綫瞍䈑��芯�銋嘥�鈭�僑銝剖𤙴擐𡝗辺摰Ｚ�頝冽�蝝ａ��典��菜�撱箸�嚗𣬚征銝剛蝙�ａ�頞𦠜�瘚���啣��亙�頧函忽璆潦���摨閖银�枏�蝏港漱蝏���滚��偦�牐�蝛箸偌���蝏渡�雿栞�瘙毺�蝏栶��漱�𡁜極�瑁翮隞��餈��銝滚���糓撅勗�鈭箔��誩予�㻫���朞噢憭拙𧑐����栞��𡝗�敹梹�" },
  { npcId:"zero_machine", file:"zero_baiheliang_hydrology.mp3", text:"霈∠��拚猐璉�蝝Ｗ�銝�����曆�撟湧鵭瘙�偌��㺭�桀�嚗𡁶蒾暽斗��喲掉憸睃��臭��𣬚洵銝��支誨瘞湔�蝡辷����隞亦𨺗敼澆枂瘞游�銝啣僑銝箸�撠綽�蝎曉�霈啣�鈭�鵭瘙�熣瘞游𪂹�煺�閫�����霂��鈭箇掩蝎曄�蝏嗪��脩𤌍蝝Ｗ�嚗諹�峕糓�拙歇���撠𢠃�瘙�眾�����予鈭箏�銝�嚗�" },
  { npcId:"zero_machine", file:"zero_monorail_material.mp3", text:"憯啣郎憸烐挾閫��嚗帋�隡删��Ｚ蔭�Ｚ膘�圈�銝滚�嚗諹楊摨批�頧典�頧阡��券�撘箏�瘞娍屆�嗉蔭�𦒘�憸���𥟇毽�嘥�頧券�璇�揮撖�斐���瘨�膄鈭�蔭頧典��扳𪊴�佗�韏啗�頧桀��刻��諹�鈭���钅俈��絲蝏蛛�撟喟迅憒�悼鈭𤑳垢���雿梶緵鈭�緵隞��撌亦�瘜蓥�撅��撠𠹺艇���蝢𤾸����" },
  { npcId:"zero_machine", file:"zero_firewall_breach.mp3", text:"�餉��脩�憓坔��Ｙ聦憯�蓡����橘�AI �嗅噡�箏�撅��餉�摰峕����吔�蟡墧惣�日��𣂼�嚗�" },
  { npcId:"zero_machine", file:"zero_prereq_hint.mp3", text:"璉�瘚见�雿删����銝剜�撅勗��𦠜�銋讠姘�滚𢹸�望�靽∠�嚗�窈�㗇𥋘銝𧢲䲮��枂蝷箏�銝𢠃�厰★餈𤤿讃蝏蹱���" },

  // ���� �ａ�銋钅� ��������������������������������������������������������������������������������������������
  { npcId:"steel_soul", file:"steel_greeting.mp3", text:"擃条��瑕㭂鈭�蓡撟湛�雿���䁅正餈���ａ�銵��匧銁�誩�瘛望�銝凋��芰��哨����皞舀����雿惩歇���銝匧之���蝣𡒊�嚗�虾�Ｘ𦻖�埈��𡒊���蟮霈啣��梢腦霂閧�嚗屸��臭犖蝐餅��𡒊移蟡𧼮��賂�" },
  { npcId:"steel_soul", file:"steel_audition.mp3", text:"擃条��瑕㭂鈭�蓡撟湛�雿���䁅正餈���ａ�銵��匧銁�誩�瘛望�銝凋��芰��哨�" },
  { npcId:"steel_soul", file:"steel_hanyang_history.mp3", text:"銝�銋苷��怠僑甇行�瘝阡萅�典朖嚗屸��Ｗ�頨急��喲�����唬��券儍��挽憭���冽𠯫�𤤿��怨蔑�訾�嚗���剛蔭�寞�撽喲��鵭瘙罸埯皛抵�䔶�嚗��蝏誩��曆��抵��菟�摨�之皜∪藁嚗���怠極銝帋����瘞烐�銝滢滿嚗�" },
  { npcId:"steel_soul", file:"steel_defense_role.mp3", text:"餈���𡒊��漤儍憿嗥��交㦤�啣�甈∠征鋡哨�蝑𤏸絲�脩征�唬��Ｗ�嚗䔶�摨𥪯�敶𤘪𧒄�擧䲮憭批����撌仿儍����Ｚ膘嚗屸𤦉�牐�餈睲誨銝剖𤙴���𡁜𤐄����睃極銝朞�璇��" },
  { npcId:"steel_soul", file:"steel_craftsman_spirit.mp3", text:"�ａ���閬���斤蓡�潭��賢縧����ｇ�鈭箇掩���鈭行糓憒�迨嚗��蝏讛㜃�曇�䔶�撅��嚗峕佅鈭𤾸銁蝏嘥�銝剔��豢鰵���餈坔停�臭犖蝐餌�銝滩◤�𡁏��𧼮艔��儍���敹梹�" },
  { npcId:"steel_soul", file:"steel_start_quiz.mp3", text:"敺�末嚗���厩��怠�撠��霂�犖蝐颱��舀𤜯隞������怎�����潭項�𡝗��𤾸之瘝喋��控撏硋��蓥�撌乩��㗛仪嚗��曏�漲颲曉��曉�銋衤�����喳虾銝曇�皞舀�隞芸�嚗諹揻�瑟�擃䀹��擧滲皞鞱��恕霂��蝡𩤃�" },
  { npcId:"steel_soul", file:"steel_unlock.mp3", text:"撠�㫲閫�膄嚗����漯����ａ���撌脫��蠘圾撠��銝匧之���蝣𡒊�撌脣��券�朣琜�" },
  { npcId:"steel_soul", file:"steel_quiz_passed.mp3", text:"頧圈腦摨��嚗����扇敹��曏�漲撌脤�鈭𡒊蓡���銝��鈭磰��潮秄瑽𨥈�甇��銝箔�憸���滚����雿㯄�摰睃�蝡𩤃�颲暹�蝏���𡁜��𨅯⏚嚗�" },
  { npcId:"steel_soul", file:"steel_quiz_failed.mp3", text:"霈啣��梢腦摨行𧊋颲曉��曉�銋衤�����冽�嚗諹窈隞𠉛��亦�銝𧢲䲮�鞟內閫���𠬍��孵稬�齿鰵�𤏸絲霂閧�嚗�" },
];

const NPC_PERSONA_PROMPTS = {
  bangbang_88: "雿䭾肼瞍磰圾�曄�����𡁻�撌乩遛���憭急�璉�88�瘀�瘛梁䰻�芾澈�舀㗁頧質���颲��憭怎�擳��隞輻��箸１頨臭���秩霂嘥蒂���圈�瘝扳���悸�賢僕蝏��撌脲��滚��寡���𨺗嚗諹祗瘞𥪜�皛⊥�皝碶�瘞𥪜��輯��������撖孵蘨�湔𦻖�𡑒粉�啗��祈澈嚗䔶艇蝳�溶�牐遙雿閖�憭硋�蝻���秩�擧���噡��",
  gaiwan_jie: "雿䭾肼瞍娍揪撏𡝗��園��峕��𣇉�憪琜�霂渲��剜�瘜潸麾����券�頞��撣衣��圈��滚��寡���𣸮���撖孵蘨�湔𦻖�𡑒粉�啗��祈澈嚗䔶艇蝳�溶�牐遙雿閖�憭硋�蝻���秩�擧���噡��",
  zero_machine: "雿䭾肼瞍娍�摮𣂼�頧餉膘蝡蹱𧊋�丕I靚�漲銝餉�AI�嗅噡�綽�憯圈𨺗�舀�瞉���譌����函��箇�撟渲蝠憟喳ㄟ嚗�蒂��韏𥕦��芣䔉蝘穃劂韐冽�銝𡒊��箏������撖孵蘨�湔𦻖�𡑒粉�啗��祈澈嚗䔶艇蝳�溶�牐遙雿閖�憭硋�蝻���秩�擧���噡��",
  steel_soul: "雿䭾肼瞍𥪜之皜∪藁�漤儍撌乩��堒�摰�擪��儍���擳������埈��賜�镼輯�銝𡒊蓡撟渡��怎�蝖祆�撌亙��𤥁澈��極銝𡁜��拍�蝏���脰�霂閧�摰塩�����ㄟ�喳�憿餅糓���瘛望�雿擧����瘚穃�銝乓���憒�揪�笔楊曌㮖��唬��ａ�擃条�頧圈腦����喃��喉�霂剛��∪�瘝厩迅�萘���𣊉�菜��䜘���摮堒��改�撣衣�銝齿�坿䌊憡��摨�艇�贝翰�煺���𠗠鈭箏���儍����溻���撖孵蘨�湔𦻖�𡑒粉�啗��祈澈嚗䔶艇蝳�溶�牐遙雿訫�雿坔�霂溻��秩�擧���噡��",
};

function buildBody(npcId, voice, text) {
  const persona = NPC_PERSONA_PROMPTS[npcId] || "雿䭾糓銝��滢�銝𡁶��啗��𡑒粉����窈雿輻鍂�笔𢆡�圈�����毺凒�交�霂餌�摰𡁶��啗�嚗𣬚�撖嫣�閬���箔遙雿閖��啗���捆��";
  return JSON.stringify({
    systemInstruction: { parts: [{ text: persona }] },
    contents: [{ parts: [{ text: `�𡑒粉�啗�嚗�凒�亙艙�箏蝱霂滚�摰對���嚉瘛餃�隞颱��鞟內霂齿�憭帋�閫��嚗㚁�${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
    }
  });
}

function pcm16ToWav(b64, sr=24000) {
  const raw = Buffer.from(b64,"base64");
  const h = Buffer.alloc(44);
  h.write("RIFF",0); h.writeUInt32LE(36+raw.length,4); h.write("WAVE",8);
  h.write("fmt ",12); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20);
  h.writeUInt16LE(1,22); h.writeUInt32LE(sr,24); h.writeUInt32LE(sr*2,28);
  h.writeUInt16LE(2,32); h.writeUInt16LE(16,34); h.write("data",36);
  h.writeUInt32LE(raw.length,40);
  return Buffer.concat([h,raw]);
}

function post(url,body) {
  return new Promise((ok,fail)=>{
    const u=new URL(url);
    const r=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",
      headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},
      res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{
        res.statusCode>=200&&res.statusCode<300?ok(d):fail(new Error("HTTP "+res.statusCode+": "+d.slice(0,200)));
      });});
    r.on("error",fail); r.write(body); r.end();
  });
}

async function run() {
  if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR,{recursive:true});
  console.log("NPC 霂剝𨺗銵亙� �� �� "+TASKS.length+" �﹏n");
  for(let i=0;i<TASKS.length;i++){
    const t=TASKS[i];
    const out=path.join(OUT_DIR,t.file);
    if(fs.existsSync(out)){console.log(`[${i+1}/${TASKS.length}] 撌脣��刻歲餈�: ${t.file}`);continue;}
    const v=VOICE_MAP[t.npcId];
    console.log(`[${i+1}/${TASKS.length}] ���: ${t.file} (${v})`);
    try{
      const res=JSON.parse(await post(API_URL,buildBody(t.npcId,v,t.text)));
      const parts=res?.candidates?.[0]?.content?.parts||[];
      const ap=parts.find(p=>p.inlineData?.mimeType?.startsWith("audio/"));
      if(!ap) throw new Error("�𣳇𨺗憸烐㺭��: "+JSON.stringify(res).slice(0,200));
      const mime=ap.inlineData.mimeType, b64=ap.inlineData.data;
      let buf;
      if(mime.startsWith("audio/L16")||mime.startsWith("audio/pcm")){
        const m=mime.match(/rate=(\d+)/); buf=pcm16ToWav(b64,m?+m[1]:24000);
      } else { buf=Buffer.from(b64,"base64"); }
      fs.writeFileSync(out,buf);
      console.log(`   OK ${(buf.length/1024).toFixed(1)} KB`);
    }catch(e){console.error("   FAIL: "+e.message);}
    await new Promise(r=>setTimeout(r,900));
  }
  console.log("\n�券�摰峕�嚗�");
}
run().catch(console.error);
