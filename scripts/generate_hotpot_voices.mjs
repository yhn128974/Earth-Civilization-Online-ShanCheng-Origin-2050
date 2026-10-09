import fs from "fs";
import path from "path";
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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || decodeSecureBeacon(DEFAULT_BEACON);

const TASKS = [
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_gw_egg_hotpot_master.mp3",
    voice: "Kore",
    text: "哎哟喂！小行家还真手痒了撒？灶膛柴火正旺，牛油滚烫翻浪！去掌勺，毛肚七上八下烫脆咯，烫老了姐可不依你！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_hotpot_start.mp3",
    voice: "Kore",
    text: "起火开烫咯！毛肚鸭肠七上八下，看准上方点单，手脚麻利点撒！"
  },
  {
    npcId: "gaiwan_jie",
    file: "gaiwan_trial_win.mp3",
    voice: "Kore",
    text: "巴适得板！毛肚七上八下脆生生，牛油翻滚热气腾腾！这才是咱们山城刻在骨子里的人间烟火气！来，这包秘制火锅底料你拿去！"
  }
];

function pcmChunksToWav(chunks, sr = 24000) {
  const buffers = chunks.map(b64 => Buffer.from(b64, 'base64'));
  const raw = Buffer.concat(buffers);
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

function generateOneVoice(task) {
  const outPath = path.join(OUT_DIR, task.file);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    console.log(`⏩ [跳过] 已存在有效音频文件: ${task.file}`);
    return Promise.resolve(fs.statSync(outPath).size);
  }

  return new Promise((resolve, reject) => {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
    const ws = new WebSocket(url);
    const chunks = [];
    let inactivityTimer = setTimeout(() => {
      ws.close();
      reject(new Error("Timeout generating " + task.file));
    }, 25000);

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        ws.close();
        if (chunks.length > 0) {
          const wav = pcmChunksToWav(chunks, 24000);
          fs.writeFileSync(outPath, wav);
          resolve(wav.length);
        } else {
          reject(new Error("Stream idle timeout for " + task.file));
        }
      }, 10000);
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: task.voice } } }
          }
        }
      }));
    };

    ws.onmessage = async (e) => {
      const text = typeof e.data === 'string' ? e.data : await e.data.text();
      const m = JSON.parse(text);
      if (m.setupComplete) {
        ws.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: `朗读台词（直接念出台词内容，切勿添加任何提示词或多余解释）：${task.text}` }] }],
            turnComplete: true
          }
        }));
      } else if (m.serverContent) {
        const parts = m.serverContent.modelTurn?.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            chunks.push(p.inlineData.data);
            resetTimer();
          }
        }
        if (m.serverContent.turnComplete) {
          clearTimeout(inactivityTimer);
          ws.close();
          const wav = pcmChunksToWav(chunks, 24000);
          fs.writeFileSync(outPath, wav);
          resolve(wav.length);
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(inactivityTimer);
      reject(err);
    };
  });
}

async function main() {
  for (const task of TASKS) {
    console.log(`正在生成 ${task.file}...`);
    try {
      const bytes = await generateOneVoice(task);
      console.log(`✅ 成功生成 ${task.file} (${(bytes / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`❌ 生成失败 ${task.file}:`, e);
    }
  }
}

main();
