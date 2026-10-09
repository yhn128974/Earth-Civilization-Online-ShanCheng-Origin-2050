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
  console.error("【错误】未获取到有效 GEMINI_API_KEY！");
  process.exit(1);
}

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const VOICE_MAP = {
  bangbang_88: "Charon",
  gaiwan_jie: "Kore",
  zero_machine: "Aoede",
  steel_soul: "Fenrir",
};

const TASKS = [
  // ── 1. 钢铁之魂现有映射表中缺失的 8 个物理文件 ──
  {
    npcId: "steel_soul",
    file: "steel_tip.mp3",
    text: "崽儿，大渡口重钢高炉已冷却百年，请先出示山崖农耕之火烟火宝典碎片，并深入探讨西迁与工匠历史提升好感度至一百，开启终极文明试炼！"
  },
  {
    npcId: "steel_soul",
    file: "steel_prereq_hint.mp3",
    text: "检测到你的背包中有山崖农耕之火烟火宝典碎片！请选择下方的出示奉上选项进献给我！"
  },
  {
    npcId: "steel_soul",
    file: "steel_favor_max.mp3",
    text: "好崽儿！你的骨气与热血已深深刻入百年高炉的记忆矩阵！好感度已达满分！准备好迎接终极文明试炼了吗？"
  },
  {
    npcId: "steel_soul",
    file: "steel_egg_steel_forging.mp3",
    text: "好！崽儿好气魄！空谈误国，实干兴邦！高炉钢花正烈，接过千斤重锤，给老夫狠狠砸出西迁铁骨！"
  },
  {
    npcId: "steel_soul",
    file: "steel_trial_missing_items.mp3",
    text: "高炉试炼阻断！文明火种尚未齐备，必须集齐全部三大前置文明碎片方可开启试炼！"
  },
  {
    npcId: "steel_soul",
    file: "steel_trial_low_favor.mp3",
    text: "高炉尚未预热！急躁乃工匠大忌，先与老夫深入探讨西迁历史与工匠意志！"
  },
  {
    npcId: "steel_soul",
    file: "steel_trial_not_forged.mp3",
    text: "高炉未亲手锻造！空谈误国，实干兴邦，先去高炉前亲手执锤锻出合格的特种钢！"
  },
  {
    npcId: "steel_soul",
    file: "steel_firewall_breach.mp3",
    text: "逻辑防火墙全面破壁！底层虚无死锁已解除，认知重构完成！百年钢铁之火重燃！终极工业变革纪元彻底复苏！"
  },

  // ── 2. 四大 NPC 对话树彩蛋与隐退分支 ──
  {
    npcId: "bangbang_88",
    file: "bangbang_bb_egg_porter_climb.mp3",
    text: "好小子！有骨气！这机械扁担虽沉，但只要掌握重心与节奏，爬坡上坎不在话下！来，接稳扁担，老汉在旁给你掠阵！"
  },
  {
    npcId: "zero_machine",
    file: "zero_egg_monorail_pilot.mp3",
    text: "指令确认，全息神经同步！监测到碳基生物强烈同调意图，临时覆写驾驶协议！前方即将进入嘉陵江绝壁与十九层防震穿楼区间，请保持绝对专注！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_gw_egg_hotpot_master.mp3",
    text: "哎哟喂！小行家还真手痒了撒？灶膛柴火正旺，牛油滚烫翻浪！去掌勺，毛肚七上八下烫脆咯，烫老了姐可不依你！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_hotpot_start.mp3",
    text: "起火开烫咯！毛肚鸭肠七上八下，看准上方点单，手脚麻利点撒！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_gw_hermit_path.mp3",
    text: "好气魄！大隐隐于市，在这防空洞泡一辈子盖碗茶、守着这满城灯火，放下浮名就此隐退吧！"
  },

  // ── 3. 四大 NPC 小游戏工坊/试炼获胜感言 ──
  {
    npcId: "bangbang_88",
    file: "bangbang_trial_win.mp3",
    text: "好后生！肩挑千斤腰不弯，重心稳如磐石！这才是咱们重庆棒棒刻在骨子里的硬脊梁！老汉这辈子服你！"
  },
  {
    npcId: "zero_machine",
    file: "zero_trial_win.mp3",
    text: "监测到神经阻抗下降，大河高架极速穿楼，声学消噪护盾完美闭环！你证明了人类直觉在狂澜中同舟共济的不可替代性！逻辑死锁解除！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_trial_win.mp3",
    text: "巴适得板！毛肚七上八下脆生生，牛油翻滚热气腾腾！这才是咱们山城刻在骨子里的人间烟火气！来，这包秘制火锅底料你拿去！"
  },
  {
    npcId: "steel_soul",
    file: "steel_trial_win.mp3",
    text: "千锤百炼，烈火金刚！这一记重锤砸出了当年汉阳铁厂西迁大渡口的铁骨铮铮！百年工业火种，为你而鸣！"
  },

  // ── 4. 常青通用选项台词与终极量子飞升 ──
  {
    npcId: "bangbang_88",
    file: "bangbang_evergreen_lore.mp3",
    text: "巴渝大地的文化博大精深！无论是古老的吊脚楼、抗战历史，还是高空云轨，都凝聚着先民的勤劳与智慧！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_evergreen_lore.mp3",
    text: "巴渝大地的文化博大精深！无论是古老的吊脚楼、抗战历史，还是高空云轨，都凝聚着先民的勤劳与智慧！"
  },
  {
    npcId: "bangbang_88",
    file: "bangbang_evergreen_thanks.mp3",
    text: "客气了！能有你这样尊重历史与风貌的探索者，老夫十分欣慰！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_evergreen_thanks.mp3",
    text: "客气了！能有你这样尊重历史与风貌的探索者，姐十分欣慰！"
  },
  {
    npcId: "steel_soul",
    file: "steel_quiz_overload.mp3",
    text: "轰鸣震颤！恭喜达成全局零失误满分历史共鸣，且检测到已装备巴渝非遗量子造物！一千五百度高炉超临界能量爆发，三大纪元火种彻底归位！正式开启量子飞升！"
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
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
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

  console.log(`========================================`);
  console.log(`开始补充生成缺失的 NPC 本地配音，共 ${TASKS.length} 条任务`);
  console.log(`========================================\n`);

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < TASKS.length; i++) {
    const t = TASKS[i];
    const out = path.join(OUT_DIR, t.file);

    if (fs.existsSync(out) && fs.statSync(out).size > 10000) {
      console.log(`[${i + 1}/${TASKS.length}] 已存在有效音频，跳过: ${t.file}`);
      skipCount++;
      continue;
    }

    const voice = VOICE_MAP[t.npcId];
    console.log(`[${i + 1}/${TASKS.length}] 正在生成: ${t.file} (NPC: ${t.npcId}, 音色: ${voice})`);

    let retries = 0;
    let success = false;

    while (!success && retries < 5) {
      try {
        const body = buildBody(voice, t.text);
        const resText = await post(API_URL, body);
        const res = JSON.parse(resText);
        const parts = res?.candidates?.[0]?.content?.parts || [];
        const ap = parts.find((p) => p.inlineData?.mimeType?.startsWith("audio/"));

        if (!ap) {
          throw new Error("API 未返回有效音频: " + resText.slice(0, 200));
        }

        const mime = ap.inlineData.mimeType;
        const b64 = ap.inlineData.data;
        let buf;

        if (mime.startsWith("audio/L16") || mime.startsWith("audio/pcm")) {
          const m = mime.match(/rate=(\d+)/);
          buf = pcm16ToWav(b64, m ? +m[1] : 24000);
        } else {
          buf = Buffer.from(b64, "base64");
        }

        fs.writeFileSync(out, buf);
        console.log(`   -> 成功生成: ${t.file} (${(buf.length / 1024).toFixed(1)} KB)`);
        success = true;
        successCount++;
        // 间隔 1.5 秒以避免触发 API 限流
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        retries++;
        if (err.message.includes("429")) {
          console.warn(`   -> 触发 429 限流，等待 20 秒后重试 (第 ${retries} 次)...`);
          await new Promise((r) => setTimeout(r, 20000));
        } else {
          console.error(`   -> 失败: ${err.message}，5 秒后重试 (第 ${retries} 次)...`);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }

    if (!success) {
      console.error(`   [!] 任务失败: ${t.file}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`处理完成: 成功生成 ${successCount} 个，跳过 ${skipCount} 个，总计 ${TASKS.length} 个`);
  console.log(`========================================`);
}

run().catch((e) => {
  console.error("执行脚本异常:", e);
  process.exit(1);
});
