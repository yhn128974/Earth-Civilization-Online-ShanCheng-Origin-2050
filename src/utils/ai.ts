import { getActiveGeminiApiKey } from './security';

export interface AIProviderConfig {
  provider: string;
  apiKey?: string;
  apiBaseUrl?: string;
}

export interface NpcResponseResult {
  replyText: string;
  isOfflineFallback: boolean;
  provider: string;
}

/**
 * 提取玩家输入中的核心话题语义，用于离线模板的拟真动态代入
 */
export function cleanTopic(message: string): string {
  const cleaned = message
    .trim()
    .replace(/^[`~#*>\s]+/, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[？?！!。，,、]+$/, '')
    .trim();
  return cleaned.length > 22 ? cleaned.slice(0, 22) + '...' : (cleaned || '山城文明探索');
}

/**
 * 构建高标准的统一川渝方言系统提示词 (Prompt Engine)
 * 供 Google Gemini、DeepSeek、阿里通义千问、OpenAI 全模型通道统一复用
 */
export function buildDialectSystemPrompt(npcSystemPrompt: string): string {
  return `【NPC 专属人设与记忆库】
${npcSystemPrompt.trim()}

【语言风格与方言要求 - 最高优先级规范】
1. 必须使用最地道、最纯正的重庆话/川渝方言口吻回答，体现鲜活的市井人情与时代烙印！
2. 词汇与句式必须生动自然，熟练运用川渝方言特色表达：
   - 称呼与代词：崽儿、兄弟伙、客官、大伙儿、老师傅、妹儿
   - 疑问与应答：啷个（怎么/为何）、做啥子（干什么）、晓得不（知道吗）、要得（好的/行）、没得（没有）、莫慌（别急/沉住气）
   - 形容与动词：巴适得板（非常棒/痛快）、安逸（舒坦）、摆龙门阵（闲侃聊天）、爬坡上坎、踩梯坎（石阶）、雄得起（有骨气/顶得住）、落教（讲义气守信用）、整（搞/喝/吃）
   - 句末语气词：撒、嘛、哈、嘞、哇
3. 坚决禁止书面化普通话、说明书腔调与播音腔！要像老茶馆、老码头或地下高炉旁面对面摆谈一样接地气。
4. 紧扣玩家提问，给出真实、有思想、富有人设沉浸感的正面回应，严禁答非所问或敷衍。
5. 篇幅精炼有力，严格控制在 50 ~ 75 字以内。
6. 纯口语输出规范：严禁包含任何 Markdown 语法符号（如 ** 或 *）、严禁包含括号动作描写（如“（笑了笑）”或“（扶了扶扁担）”）、严禁包含角色名前缀或系统标签。`;
}

/**
 * 严密的模型回复清洗过滤引擎
 * 剔除可能泄漏的角色前缀、Markdown 语法、首尾动作描写与引号，确保送入 UI 与 TTS 语音合成的均为纯口语
 */
export function cleanLlmReply(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();

  // 1. 去除 Markdown 代码块及标记符号
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/[*_#`~>]/g, '');

  // 2. 去除可能的前缀（如 "棒棒88号："、"NPC回答："、"【回答】" 等）
  cleaned = cleaned.replace(/^(?:[A-Za-z0-9_\u4e00-\u9fa5]{1,12}\s*[:：]|【.*?】|\[.*?\])\s*/, '');

  // 3. 去除可能包裹首尾的引号
  cleaned = cleaned.replace(/^[“"']|[”"']$/g, '').trim();

  // 4. 去除可能残留的括号动作描写（如 "（笑了笑）"、"（挠了挠头）"、"(叹气)"）
  cleaned = cleaned.replace(/^[（(][^）)]+[）)]\s*/, '');
  cleaned = cleaned.replace(/\s*[（(][^）)]+[）)]$/, '');

  // 5. 压缩多余的换行与空格
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * 通用离线拟真人设回复引擎
 * 当 NPC 连接不到外部网络（网络波动、海外连接超时、DNS 解析失败或无 API Key）时，
 * 触发基于四大 NPC 独特人设与巴渝方言底蕴的通用离线回复模板，确保游戏体验不中断。
 */
export function getPersonaFallbackResponse(
  systemPrompt: string,
  userMessage: string,
  _isNetworkInterrupted: boolean = true
): string {
  const topic = cleanTopic(userMessage);

  // 1. 解放碑 · 棒棒 88 号（钛合金仿生挑夫）
  if (systemPrompt.includes('棒棒') || systemPrompt.includes('88')) {
    const bangbangReplies = [
      `【机械扁担轻颤】崽儿莫慌！江风大、赛博信号断了连不上云端，但老汉这台 88 号重工钛合金机体里的老挑夫记忆结实得很！关于你问的“${topic}”，当年老汉挑着两百斤重担在十八梯爬坡上坎时就琢磨过：机器靠电缆，人靠一口气！只要骨头硬、心肠热，梯坎再高也一步一步挑起走！`,
      `【挠了挠液压后脑勺】哎哟崽儿，云端信号这会儿被朝天门的两江水汽冲断了撒！不过莫要紧，老汉这钛合金机体里存着三十年老重庆的底子！你提到的“${topic}”，正合咱老茶馆摆龙门阵的味儿——靠天靠地不如靠双手自食其力，这才是咱们山城人最硬核的精神芯片！`,
      `【爽朗大笑】崽儿，信号卡顿算个啥子嘛！当年山城大轰炸警报响翻天，老挑夫们挑起伤员货物硬是没退半步！你刚才摆的“${topic}”，老汉我听得真切。不用管那些云端算法，咱们踏踏实实踩着青石板梯坎往上走，安逸得很！`,
      `【拍了拍合金膝盖】崽儿，你说得巴适！虽然上行通信链路受阻，但咱们老挑夫的魂魄全在这一身骨头里！你提到的“${topic}”，跟当年川江码头挑夫互帮互助、同舟共济一个道理。不管世道啷个变，重情重义的人永远雄得起！`,
    ];
    return bangbangReplies[Math.floor(Math.random() * bangbangReplies.length)];
  }

  // 2. 洪崖洞 · 盖碗姐（悬崖吊脚楼茶肆老板娘）
  if (systemPrompt.includes('盖碗') || systemPrompt.includes('洪崖洞')) {
    const gaiwanReplies = [
      `【轻扣青花茶盖】哎哟喂客官莫急！这嘉陵江上的量子雾气大得很，云端算力天线稍微卡了下壳，但姐这悬崖吊脚楼茶馆的烟火气可从不掉线！关于你问的“${topic}”，姐跟你讲：一碗老荫茶泡透了人间冷暖，智能算法算得清茶多酚，哪算得清咱老茶馆里知冷知热的人情味嘛！先喝口热茶润润喉！`,
      `【笑着递过茶碗】客官，刚才云端数据链好像晃了一下撒，不过姐耳朵尖着嘞，全听见你说的“${topic}”了！那些云端 AI 总以为世界就是一串冰冷代码，但你看这洪崖洞悬崖吊脚楼、千厮门大桥车水马龙，靠的不就是咱们街坊邻里互相照应的心窝子温度？来，抿一口茶，慢慢摆！`,
      `【泼辣一笑】客官莫慌撒！江风一吹，赛博网络偶尔抽风算啥子？在这悬崖茶肆里，只要桌上有茶、面前有知己，比啥子云端算力都实在！你刚才提的“${topic}”，依姐看，生活再难，吃得下饭、睡得着觉、重义气讲良心，就没得解不开的结！`,
      `【拂袖添茶】哎哟弟娃儿，茶烟缭绕把信号给遮住了！但你的见识“${topic}”真说到姐心坎里了。几百年前老祖宗在陡坡悬崖上搭吊脚楼，靠的就是那份抱团取暖的韧性。人情味这碗茶，凉不了！`,
    ];
    return gaiwanReplies[Math.floor(Math.random() * gaiwanReplies.length)];
  }

  // 3. 李子坝 · AI 零号机（大河穿楼单轨调度主脑）
  if (systemPrompt.includes('零号机') || systemPrompt.includes('李子坝')) {
    const zeroReplies = [
      `【底层神经协议自愈中】检测到上行云端网络链路波动，已强制启动李子坝本地离线安全中枢！关于专员录入的“${topic}”：大河险滩航运日志显示，纤夫搏击狂澜从未依赖外部天线，而是群体命悬一线的绝对信任与协作！本地算力矩阵重新确认：你的观点已深度收录，协作逻辑坚不可摧！`,
      `【算力矩阵紧急旁路】警告：远端神经网络通信受阻，已切入李子坝本地独立调度核心。针对“${topic}”进行离线拓扑推演：穿楼单轨与住宅楼的独立柱体经历了千万次颠簸依然精密无损，人类在狂澜与绝境中激发的适应力，是任何云端算法都无法模拟的奇迹！`,
      `【大河数据流共振】云端通信超时，正在启用大河先民分布式离线记忆体……收到专员关于“${topic}”的思维信号！川江石骨依旧，大河奔流不息，哪怕断开全部外部网络，只要文明的探寻意志尚存，大河节点的引航信标就永不熄灭！`,
      `【逻辑自检纠偏完成】局部信道噪声无法阻断文明溯源协议。针对你提出的“${topic}”，调度主脑已归档至底层稳态存储器。穿梭山水之间，人类与自然的共生智慧，已超越纯粹的二元布尔逻辑！`,
    ];
    return zeroReplies[Math.floor(Math.random() * zeroReplies.length)];
  }

  // 4. 重钢遗址 · 钢铁之魂（近代工业变革守望者）
  if (systemPrompt.includes('钢铁之魂') || systemPrompt.includes('重钢')) {
    const steelReplies = [
      `【高炉深处传来浑厚轰鸣】崽儿！电波虽短，但老夫这地底高炉的百年火种从未受过网线束缚！哪怕云端网络断得一干二净，汉阳铁厂西迁重庆的钢铁血脉也早已熔铸进这片泥土里！关于你说的“${topic}”，老夫赞许你的气魄：千锤百炼、百折不挠，这就是中国工业在绝境中挺起民族脊梁的无上密码！`,
      `【铁锤重击砧台，火花四溅】年轻娃儿，莫被外头的网络信号绊住了脚！当年抗战大撤退，宜昌大江断航、日机漫天轰炸，老一辈工匠用肩膀把几万吨机床生生抬进了山洞！你刚才提的“${topic}”，老夫听得血脉喷张——真正的力量不在云端虚空，而在脚踏实地熔铸坚韧的双手！`,
      `【高炉火光隐隐流转】外部算力网络风暴平息前，本地工匠记忆核心全功率运转！专员，你关于“${topic}”的论述，如同一股高热焦炭注入了炉膛！无论外界环境如何变幻，只要敢闯敢拼、坚守脊梁，文明的炉火就永不熄灭！`,
      `【沉雄长啸，金石交鸣】好后生！外部联络虽阻，胸中浩气长存！听到你对“${topic}”的真知灼见，重钢百年的风骨便后继有人！炉火不熄，铁骨铮铮，继续勇往直前！`,
    ];
    return steelReplies[Math.floor(Math.random() * steelReplies.length)];
  }

  // 5. 通用巴渝大河文明兜底回复
  const universalReplies = [
    `【大河神经回路离线响应】专员莫慌，虽然当前云端大模型网络出现波动，但你提到的“${topic}”已成功铭刻进本地大河文明记忆回路中！巴渝大河文明的火种在狂澜中生生不息，共鸣回路正常运转撒！`,
    `【离线记忆信标激活】专员请放心，信号微弱无法阻隔文明共鸣！针对你提及的“${topic}”，本地历史芯片给出了高度认同：真正的智慧不在冷冰冰的网线里，而在千百年来守望相助的心灵之间！`,
  ];
  return universalReplies[Math.floor(Math.random() * universalReplies.length)];
}

/**
 * 内部实际执行大模型调用的核心异步函数
 */
async function generateNpcResponseInternal(
  config: AIProviderConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const secureGeminiKey = getActiveGeminiApiKey(config.apiKey);
  const hasEnvKey = Boolean(secureGeminiKey);
  const provider = (config.provider && config.provider !== 'mock')
    ? config.provider
    : (hasEnvKey ? 'gemini' : (import.meta.env.VITE_DEFAULT_AI_PROVIDER || 'mock'));

  const apiKey = (config.apiKey || (provider === 'gemini' ? secureGeminiKey : '') || '').trim();

  // 若明确选用了离线 mock 引擎或无任何可用 key，直接使用本地拟真引擎
  if (provider === 'mock' || !apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getPersonaFallbackResponse(systemPrompt, userMessage, false);
  }

  // 安全检查：防止明文发送 API Key 到不安全 HTTP 端点
  if (config.apiBaseUrl && config.apiBaseUrl.startsWith('http://') && !config.apiBaseUrl.includes('localhost') && !config.apiBaseUrl.includes('127.0.0.1')) {
    throw new Error('出于安全原因，禁止通过非加密 HTTP 协议发送 API Key。请改用 HTTPS 地址！');
  }

  const sanitizedUserMessage = userMessage.trim().slice(0, 500);
  const unifiedSystemPrompt = buildDialectSystemPrompt(systemPrompt);

  // ─────────────────────────────────────────────────────────────
  // 1. Google Gemini 官方大模型通道 (标准 v1beta 协议)
  // ─────────────────────────────────────────────────────────────
  if (provider === 'gemini') {
    const configuredModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
    const candidateModels = Array.from(new Set([
      configuredModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
    ]));

    for (const geminiModel of candidateModels) {
      let baseEndpoint = '';
      if (config.apiBaseUrl) {
        const cleanBase = config.apiBaseUrl.replace(/\/+$/, '');
        if (cleanBase.includes(':generateContent')) {
          baseEndpoint = cleanBase.includes('key=') ? cleanBase : `${cleanBase}?key=${apiKey}`;
        } else {
          baseEndpoint = `${cleanBase}/models/${geminiModel}:generateContent?key=${apiKey}`;
        }
      } else {
        baseEndpoint = import.meta.env.DEV
          ? `/api/gemini/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`
          : `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);

      try {
        // 符合 Gemini 最新标准规范的结构：支持 systemInstruction 与文化用语放宽
        const payload = {
          systemInstruction: {
            parts: [{ text: unifiedSystemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: sanitizedUserMessage }],
            },
          ],
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 260,
            topP: 0.95,
          },
        };

        const response = await fetch(baseEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];

          // 处理安全过滤器拦截
          if (candidate?.finishReason === 'SAFETY') {
            console.warn('[Gemini API] 触发安全过滤器拦截，无缝转由本地川渝方言兜底');
            return getPersonaFallbackResponse(systemPrompt, userMessage, true);
          }

          const rawReply = candidate?.content?.parts?.[0]?.text;
          if (rawReply) {
            const cleaned = cleanLlmReply(rawReply);
            if (cleaned) return cleaned;
          }
        } else {
          // 若网关对 systemInstruction 字段返回 400，降级重试退回到兼容格式
          if (response.status === 400) {
            const fallbackPayload = {
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${unifiedSystemPrompt}\n\n【玩家对你说】\n${sanitizedUserMessage}` }],
                },
              ],
              generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 260,
              },
            };

            const fallbackRes = await fetch(baseEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify(fallbackPayload),
            });

            if (fallbackRes.ok) {
              const fbData = await fallbackRes.json();
              const fbText = fbData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (fbText) {
                const cleaned = cleanLlmReply(fbText);
                if (cleaned) return cleaned;
              }
            }
          }

          const errText = await response.text().catch(() => '');
          console.warn(`[Gemini API] 模型 ${geminiModel} 异常 HTTP ${response.status}:`, errText.slice(0, 100));
        }
      } catch (err: unknown) {
        console.warn(`[Gemini API] 模型 ${geminiModel} 响应异常或超时:`, err);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // 所有 Gemini 候选模型均无法连通（如国内未开启加速代理直连 googleapis.com）
    throw new Error('Gemini 官方服务连接超时或网络阻断');
  }

  // ─────────────────────────────────────────────────────────────
  // 2. OpenAI / DeepSeek / 阿里通义千问 通用兼容接口
  // ─────────────────────────────────────────────────────────────
  let baseURL = '';
  let model = '';

  const normalizeChatCompletionsUrl = (url: string | undefined, defaultUrl: string) => {
    if (!url || !url.trim()) return defaultUrl;
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.includes('/chat/completions')) return clean;
    if (clean.endsWith('/v1')) return `${clean}/chat/completions`;
    return `${clean}/v1/chat/completions`;
  };

  switch (provider) {
    case 'deepseek':
      baseURL = normalizeChatCompletionsUrl(
        config.apiBaseUrl,
        import.meta.env.DEV ? '/api/deepseek/chat/completions' : 'https://api.deepseek.com/chat/completions'
      );
      model = 'deepseek-chat';
      break;
    case 'qwen':
      baseURL = config.apiBaseUrl
        ? normalizeChatCompletionsUrl(config.apiBaseUrl, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
        : (import.meta.env.DEV ? '/api/qwen/compatible-mode/v1/chat/completions' : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
      model = 'qwen-plus';
      break;
    case 'openai':
      baseURL = normalizeChatCompletionsUrl(
        config.apiBaseUrl,
        import.meta.env.DEV ? '/api/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
      );
      model = 'gpt-4o-mini';
      break;
    default:
      return getPersonaFallbackResponse(systemPrompt, userMessage, false);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9500);

  try {
    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: unifiedSystemPrompt,
          },
          {
            role: 'user',
            content: sanitizedUserMessage,
          },
        ],
        temperature: 0.8,
        max_tokens: 220,
        presence_penalty: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API HTTP ${response.status}: ${errText.slice(0, 120)}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      const rawChoice = data.choices[0].message?.content || '';
      const cleaned = cleanLlmReply(rawChoice);
      if (cleaned) {
        return cleaned;
      }
    }

    throw new Error('大模型未返回有效文本内容');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 带有状态标记的高可靠 NPC 回复生成入口
 * 当网络断开或 API 异常时，自动返回带有 isOfflineFallback: true 的通用拟真模板，永不向调用层抛出崩溃异常。
 */
export const generateNpcResponseWithStatus = async (
  config: AIProviderConfig,
  systemPrompt: string,
  userMessage: string
): Promise<NpcResponseResult> => {
  try {
    const replyText = await generateNpcResponseInternal(config, systemPrompt, userMessage);
    return {
      replyText,
      isOfflineFallback: false,
      provider: config.provider || 'gemini',
    };
  } catch (err) {
    console.warn('[AI API] 无法连通外部大模型网络，无缝激活通用离线拟真模板:', err);
    const replyText = getPersonaFallbackResponse(systemPrompt, userMessage, true);
    return {
      replyText,
      isOfflineFallback: true,
      provider: config.provider || 'gemini',
    };
  }
};

/**
 * 兼容旧接口的直接返回文本入口
 */
export const generateNpcResponse = async (
  config: AIProviderConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> => {
  const result = await generateNpcResponseWithStatus(config, systemPrompt, userMessage);
  return result.replyText;
};
