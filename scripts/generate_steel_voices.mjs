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
const VOICE = "Fenrir";

const TASKS = [
  // 1. 出示前置碎片信物
  {
    file: "steel_present_chip.mp3",
    text: "好崽儿！这不仅是吊脚楼的烟火，更是滋养一代代产业工人的大地养分！农耕奠定生息，工业铸就脊梁，大河奔流不息，三大文明火种终于在此汇聚！"
  },
  // 2. 宜昌大撤退 / 中国实业敦刻尔克
  {
    file: "steel_yichang_retreat.mp3",
    text: "那是血与火写就的壮举！一九三八年深秋宜昌危急，日机狂轰滥炸。卢作孚先生组织民生公司全体船员，凭着川江行船经验昼夜抢运，用血肉之躯在长江三峡抢运出钢铁设备与军工重器！数十艘轮船被炸沉、上百名水手牺牲，才保住了中国工业的血脉火种！"
  },
  // 3. 地下钢厂防空坚守
  {
    file: "steel_underground_plant.mp3",
    text: "日机狂轰滥炸数千次，大渡口厂区地表一片火海，工人们就在山体岩洞里掏出巨大的地下车间！高炉热浪滚滚、岩洞通风极差，大家一手拿铁钎一手持枪，警报一过就点火出钢！当时前方战场三分之一的迫击炮弹和手榴弹钢材全由咱们地下钢厂供应！"
  },
  // 4. 成渝铁路第一根钢轨
  {
    file: "steel_chengyu_rail.mp3",
    text: "问得痛快！一九五零年百废待兴，西方全面封锁，重钢老一辈工人在毫无图纸资料的极端困难下，硬是用简陋轧机咬牙轧制出了新中国第一根优质重轨！成渝铁路五百零五公里全部铺上咱们重庆造的钢轨！自力更生、敢为人先，这就是重工业的骨气！"
  },
  // 5. 工业博物馆与传承
  {
    file: "steel_museum_heritage.mp3",
    text: "时代发展了，大渡口老厂区完成了环保搬迁，但这几座矗立百年的巍峨高炉、万吨水压机和蒸汽机车被原址完整保留，建成了重庆工业博物馆！钢铁的物理形态变了，但敢闯敢拼、精益求精的工匠精神永远在这座城市血脉里流淌！"
  },
  // 6. 特种装甲钢与大国重器
  {
    file: "steel_special_armor.mp3",
    text: "好眼界！重钢不仅炼造普钢，更攻克了特种装甲钢、深海管线钢、航天高强钢等多项卡脖子工艺！从万吨巨轮的龙骨到深潜器的外壳，哪一样少得了千锤百炼的特种合金？大国底气，就藏在这一炉炉赤诚炽烈的铁水之中！"
  },
  // 7. 称呼“崽儿”与工人热血
  {
    file: "steel_worker_culture.mp3",
    text: "哈哈！钢铁工人的字典里从没有退缩二字！班组里师徒相传，一声崽儿是长辈最深沉的期望与庇护。干最苦的活，啃最硬的骨头，下班后大口喝热茶、痛快烫火锅，耿直豪爽、互为托付，这就是咱们川渝汉子的热血柔情！"
  },
  // 8. 实体工业不可替代性
  {
    file: "steel_cyber_foundation.mp3",
    text: "任凭云端算力幻化万千，只要一次地磁风暴或物理断电，空中楼阁瞬间湮灭！支撑人类探索深海、飞向深空、抵御严酷自然的，永远是坚不可摧的实体钢铁与物理骨架！实体不倒，文明长存，虚拟才有用武之地！"
  },
  // 9. 执锤淬火彩蛋
  {
    file: "steel_egg_steel_forging.mp3",
    text: "好！崽儿好气魄！空谈误国，实干兴邦！高炉钢花正烈，接过千斤重锤，给老夫狠狠砸出西迁铁骨！"
  },
  // 10. 好感满值 100
  {
    file: "steel_favor_max.mp3",
    text: "好崽儿！你的骨气与热血已深深刻入百年高炉的记忆矩阵！好感度已达满分！准备好迎接终极文明试炼了吗？"
  },
  // 11. 防火墙破壁
  {
    file: "steel_firewall_breach.mp3",
    text: "逻辑防火墙全面破壁！底层虚无死锁已解除，认知重构完成！百年钢铁之火重燃！终极工业变革纪元彻底复苏！"
  },
  // 12. 智能探索提示
  {
    file: "steel_tip.mp3",
    text: "崽儿，大渡口重钢高炉已冷却百年，请先出示山崖农耕之火烟火宝典碎片，并深入探讨西迁与工匠历史提升好感度至一百，开启终极文明试炼！"
  },
  // 13. 背包有前置碎片提醒
  {
    file: "steel_prereq_hint.mp3",
    text: "检测到你的背包中有山崖农耕之火烟火宝典碎片！请选择下方的出示奉上选项进献给我！"
  },
  // 14. 试炼阻断：缺失碎片
  {
    file: "steel_trial_missing_items.mp3",
    text: "高炉试炼阻断！文明火种尚未齐备，必须集齐全部三大前置文明碎片方可开启试炼！"
  },
  // 15. 试炼阻断：好感度不足
  {
    file: "steel_trial_low_favor.mp3",
    text: "高炉尚未预热！急躁乃工匠大忌，先与老夫深入探讨西迁历史与工匠意志！"
  },
  // 16. 试炼阻断：未亲自锻打
  {
    file: "steel_trial_not_forged.mp3",
    text: "高炉未亲手锻造！空谈误国，实干兴邦，先去高炉前亲手执锤锻出合格的特种钢！"
  },
  // 17. 试炼通过胜利台词（修正勋章名称为“文明溯源者认证勋章”，与游戏道具彻底统一）
  {
    file: "steel_quiz_passed.mp3",
    text: "轰鸣庆祝！你的记忆共鸣度已圆满通过终极文明试炼！三大文明火种全部归位，正式为你颁发文明溯源者认证勋章！达成终极通关胜利！",
    forceRegenerate: true
  },
  // 18. 试炼未通过台词
  {
    file: "steel_quiz_failed.mp3",
    text: "记忆共鸣度未达到百分之七十五门槛，请仔细查看下方提示解析后，点击重新发起试炼！",
    forceRegenerate: true
  }
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

function pcm16ToWav(b64, sr = 24000) {
  const raw = Buffer.from(b64, "base64");
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + raw.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24);
  h.writeUInt32LE(sr * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(raw.length, 40);
  return Buffer.concat([h, raw]);
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      res => {
        let d = "";
        res.on("data", chunk => (d += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(d);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0, 300)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`=== 开始生成钢铁之魂专属语音 (共 ${TASKS.length} 条) ===\n`);

  for (let i = 0; i < TASKS.length; i++) {
    const task = TASKS[i];
    const outPath = path.join(OUT_DIR, task.file);

    // 如果是刚刚成功生成的 1~5 号文件，直接跳过
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000 && !task.forceRegenerate) {
      console.log(`[${i + 1}/${TASKS.length}] 已存在跳过: ${task.file}`);
      continue;
    }

    console.log(`[${i + 1}/${TASKS.length}] 正在生成: ${task.file} ...`);
    let retries = 0;
    let success = false;

    while (!success && retries < 5) {
      try {
        const respStr = await post(API_URL, buildBody(VOICE, task.text));
        const res = JSON.parse(respStr);
        const parts = res?.candidates?.[0]?.content?.parts || [];
        const audioPart = parts.find(p => p.inlineData?.mimeType?.startsWith("audio/"));
        if (!audioPart) {
          throw new Error("API 未返回有效音频数据: " + respStr.slice(0, 200));
        }

        const mime = audioPart.inlineData.mimeType;
        const b64 = audioPart.inlineData.data;
        let buf;
        if (mime.startsWith("audio/L16") || mime.startsWith("audio/pcm")) {
          const m = mime.match(/rate=(\d+)/);
          buf = pcm16ToWav(b64, m ? +m[1] : 24000);
        } else {
          buf = Buffer.from(b64, "base64");
        }

        fs.writeFileSync(outPath, buf);
        console.log(`   ✅ 成功保存: ${task.file} (${(buf.length / 1024).toFixed(1)} KB)`);
        success = true;
      } catch (err) {
        retries++;
        if (err.message.includes('429')) {
          console.warn(`   ⚠️ 遭遇 429 频率限制，等待 25 秒后第 ${retries} 次重试...`);
          await new Promise(r => setTimeout(r, 25000));
        } else {
          console.error(`   ❌ 错误: ${err.message}`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    // 每次请求后主动间隔 13 秒，严格避开 5 RPM 限制
    await new Promise(r => setTimeout(r, 13000));
  }

  console.log("\n=== 钢铁之魂全套语音生成完毕！===");
}

run().catch(console.error);
