import React from 'react';

/**
 * DistressedGlassOverlay
 * 为整个游戏视口叠加一层具备物理实物质感的轻微破损毛玻璃与战术面罩涂层
 * 特性：
 * 1. 物理微晶毛玻璃感（Subtle Frosted Micro-Grain & 0.6px Backdrop Refraction）
 * 2. 真实双层折射微裂纹（Hairline Fractures with Specular Highlight + Shadow Refraction）
 * 3. 战术面罩微划痕（Delicate Surface Scratches）
 * 4. 倒角高光与暗角（Glass Bevel & Peripheral Vignette）
 * 5. 全程 pointer-events-none，绝不阻碍任何点击与交互
 */
export const DistressedGlassOverlay: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. 微磨砂轻度折射毛玻璃基底（0.6px 极微弱模糊，既有毛玻璃物理质感又 100% 保持文字极度锐利清晰） */}
      <div className="absolute inset-0 backdrop-blur-[0.6px] mix-blend-normal opacity-90" />

      {/* 2. 玻璃对角漫射光斑 (Diagonal Glass Specular Flare) */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.012) 20%, transparent 35%, rgba(255,255,255,0.02) 65%, transparent 80%)',
        }}
      />

      {/* 3. 玻璃外沿物理倒角与深空暗角 (Glass Edge Bevel & Tactical Vignette) */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            'inset 0 0 90px rgba(0, 0, 0, 0.55), inset 0 1px 1.5px rgba(255, 255, 255, 0.12), inset 0 -1px 1.5px rgba(0, 0, 0, 0.6), inset 1px 0 1.5px rgba(255, 255, 255, 0.06), inset -1px 0 1.5px rgba(0, 0, 0, 0.45)',
        }}
      />

      {/* 4. 矢量轻微破损裂纹与微划痕 (SVG Specular + Refraction Lines using 1000x1000 coordinate system) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-90"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 微磨砂微晶噪波滤镜 */}
          <filter id="distressed-glass-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="2"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.04 0"
            />
          </filter>
        </defs>

        {/* 噪波微粒层 */}
        <rect
          width="1000"
          height="1000"
          filter="url(#distressed-glass-noise)"
          className="opacity-50 mix-blend-overlay"
        />

        {/* =========================================================================
            【裂纹组 1】：右上角边缘冲击微裂纹（带双层物理折射：阴影底层 + 表面晶格高光）
            ========================================================================= */}
        <g opacity="0.8">
          {/* 深层玻璃折射暗影 (Offset Shadow) */}
          <path
            d="M 970 0 L 945 42 L 905 68 L 865 105 M 905 68 L 892 135 L 898 165 M 945 42 L 980 92"
            stroke="rgba(0, 0, 0, 0.65)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            transform="translate(0.8, 0.8)"
          />
          {/* 玻璃外表面高光晶格 (Highlight Ridge) */}
          <path
            d="M 970 0 L 945 42 L 905 68 L 865 105 M 905 68 L 892 135 L 898 165 M 945 42 L 980 92"
            stroke="rgba(255, 255, 255, 0.55)"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
          {/* 撞击中心微放射芒线 */}
          <path
            d="M 945 42 L 932 28 M 945 42 L 956 58 M 945 42 L 928 46"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="0.6"
            fill="none"
          />
        </g>

        {/* =========================================================================
            【裂纹组 2】：左下角边缘细密微裂（轻微边缘破损，不阻碍阅读）
            ========================================================================= */}
        <g opacity="0.7">
          {/* 阴影层 */}
          <path
            d="M 0 885 L 35 900 L 58 930 L 82 952 M 58 930 L 46 970"
            stroke="rgba(0, 0, 0, 0.6)"
            strokeWidth="1.1"
            fill="none"
            strokeLinecap="round"
            transform="translate(0.6, 0.6)"
          />
          {/* 高光线 */}
          <path
            d="M 0 885 L 35 900 L 58 930 L 82 952 M 58 930 L 46 970"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="0.75"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* =========================================================================
            【划痕组 3】：战术护目镜表面细微擦划伤痕 (Fine Surface Scratches)
            ========================================================================= */}
        <g opacity="0.45">
          {/* 划痕 1：中上方浅微弧划痕 */}
          <path
            d="M 280 145 Q 325 158 375 150"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="0.65"
            fill="none"
            strokeLinecap="round"
          />
          {/* 划痕 2：右中部细微擦痕 */}
          <path
            d="M 830 475 L 860 515"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="0.55"
            fill="none"
            strokeLinecap="round"
          />
          {/* 划痕 3：左下部浅短划痕 */}
          <path
            d="M 140 755 L 175 778"
            stroke="rgba(255, 255, 255, 0.32)"
            strokeWidth="0.55"
            fill="none"
            strokeLinecap="round"
          />
          {/* 划痕 4：底部微弱擦痕 */}
          <path
            d="M 610 840 Q 655 852 705 842"
            stroke="rgba(255, 255, 255, 0.28)"
            strokeWidth="0.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* 5. 右上角微型战术护目镜状态水印 (Tactical HUD Corner Stamp) */}
      <div className="absolute top-2.5 right-4 text-[9px] font-mono tracking-widest text-slate-400/40 pointer-events-none flex items-center gap-1.5 opacity-60">
        <span className="w-1 h-1 rounded-full bg-amber-400/60" />
        <span>REINFORCED TACTICAL VISOR // GLAS-SPEC 0.8MM</span>
      </div>
    </div>
  );
};
