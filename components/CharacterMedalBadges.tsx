import React from 'react';
import { CharacterDimensionKey, CharacterBadgeLevel } from '../types';
import { DIMENSION_MEDAL_CONFIG } from '../constants';

export interface CharacterMedalProps {
  dimension: CharacterDimensionKey;
  level?: CharacterBadgeLevel;
  earnedCount?: number;
  outstandingCount?: number;
  standardCount?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showCountBadge?: boolean;
  className?: string;
  isInteractive?: boolean;
  onClick?: () => void;
}

// 尺寸映射 (像素宽度/高度，比例约 1:1.15)
const SIZE_MAP = {
  xs: { width: 36, height: 42, textClass: 'text-[9px]' },
  sm: { width: 56, height: 66, textClass: 'text-[10px]' },
  md: { width: 84, height: 98, textClass: 'text-xs' },
  lg: { width: 120, height: 140, textClass: 'text-sm' },
  xl: { width: 160, height: 188, textClass: 'text-base' }
};

/**
 * 顽石之光 俱乐部徽标中心图腾 (矢量精密渲染)
 */
const StoneGloryCenterCrest: React.FC<{ isLocked?: boolean }> = ({ isLocked }) => (
  <g transform="translate(100, 96)">
    {/* 黑色外盾底座 */}
    <path
      d="M -34 -40 L 34 -40 L 34 8 C 34 26 0 46 0 46 C 0 46 -34 26 -34 8 Z"
      fill={isLocked ? "#374151" : "#111827"}
      stroke={isLocked ? "#4B5563" : "#FDE100"}
      strokeWidth="2.5"
    />
    {/* 内层黄色衬底 */}
    <path
      d="M -30 -36 L 30 -36 L 30 6 C 30 22 0 40 0 40 C 0 40 -30 22 -30 6 Z"
      fill={isLocked ? "#1F2937" : "#000000"}
    />
    
    {/* 顽石之光 宝塔/石阶图腾 */}
    <g fill={isLocked ? "#6B7280" : "#FDE100"} stroke={isLocked ? "#4B5563" : "#000000"} strokeWidth="1">
      {/* 顶层屋檐 */}
      <path d="M 0 -32 L 14 -22 L -14 -22 Z" />
      {/* 第二层 */}
      <path d="M -18 -20 L 18 -20 L 22 -12 L -22 -12 Z" />
      {/* 第三层 */}
      <path d="M -24 -10 L 24 -10 L 26 -2 L -26 -2 Z" />
      {/* 中部字样装饰栏 */}
      <rect x="-28" y="0" width="56" height="15" rx="2" fill={isLocked ? "#374151" : "#FDE100"} stroke="#000" strokeWidth="1.5" />
      <text
        x="0"
        y="11"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="900"
        fill="#000000"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.5"
      >
        顽石之光
      </text>
    </g>

    {/* 底部足球与年份 2019 / STONE GLORY */}
    <g transform="translate(0, 24)">
      {/* 足球圆环 */}
      <circle cx="0" cy="5" r="8" fill={isLocked ? "#4B5563" : "#FDE100"} stroke="#000" strokeWidth="1" />
      <polygon points="0,1 -3,4 -2,8 2,8 3,4" fill="#000" />
      <text
        x="0"
        y="7"
        textAnchor="middle"
        fontSize="4.5"
        fontWeight="900"
        fill="#000000"
      >
        2019
      </text>
      {/* STONE GLORY.FC 弧形下沿文字 */}
      <path id="crest-curve" d="M -24 0 A 26 26 0 0 0 24 0" fill="none" />
      <text fontSize="4" fontWeight="800" fill={isLocked ? "#9CA3AF" : "#FDE100"} letterSpacing="0.8">
        <textPath href="#crest-curve" startOffset="50%" textAnchor="middle">
          STONE GLORY.FC
        </textPath>
      </text>
    </g>
  </g>
);

/**
 * 顶部光芒四角星
 */
const TopStarSparkle: React.FC<{ isLocked?: boolean }> = ({ isLocked }) => (
  <g transform="translate(100, 22)">
    <polygon
      points="0,-10 3,-3 10,0 3,3 0,10 -3,3 -10,0 -3,-3"
      fill={isLocked ? "#9CA3AF" : "#FFFBEB"}
      stroke={isLocked ? "#6B7280" : "#F59E0B"}
      strokeWidth="1.5"
    />
    <circle cx="0" cy="0" r="1.8" fill={isLocked ? "#E5E7EB" : "#FFFFFF"} />
  </g>
);

/**
 * 底部飘带与文字 (全套5款)
 */
const BottomRibbonBanner: React.FC<{
  title: string;
  english: string;
  isLocked?: boolean;
  shape?: 'wing' | 'crystal' | 'courage' | 'creativity' | 'cooperation';
}> = ({ title, english, isLocked }) => (
  <g transform="translate(100, 178)">
    {/* 飘带背衬阴影 */}
    <path
      d="M -76 -12 L -60 -24 L 60 -24 L 76 -12 L 68 8 L -68 8 Z"
      fill={isLocked ? "#1F2937" : "#78350F"}
      opacity="0.8"
    />
    {/* 飘带主金色层 */}
    <path
      d="M -72 -18 L 72 -18 L 82 2 L 68 12 L -68 12 L -82 2 Z"
      fill={isLocked ? "url(#locked-ribbon)" : "url(#gold-ribbon-grad)"}
      stroke={isLocked ? "#4B5563" : "#000000"}
      strokeWidth="2"
    />
    {/* 飘带内高光边框 */}
    <path
      d="M -66 -14 L 66 -14 L 74 1 L 62 8 L -62 8 L -74 1 Z"
      fill="none"
      stroke={isLocked ? "#6B7280" : "#FEF08A"}
      strokeWidth="1"
      opacity="0.8"
    />

    {/* 中文主标题 */}
    <text
      x="0"
      y="-1"
      textAnchor="middle"
      fontSize="16"
      fontWeight="900"
      fill={isLocked ? "#9CA3AF" : "#000000"}
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="2"
    >
      {title}
    </text>

    {/* 英文副标题 */}
    <text
      x="0"
      y="9"
      textAnchor="middle"
      fontSize="6.5"
      fontWeight="800"
      fill={isLocked ? "#6B7280" : "#1F2937"}
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="1.2"
    >
      — {english} —
    </text>

    {/* 飘带下角星/点缀 */}
    <polygon
      points="0,14 2,17 0,20 -2,17"
      fill={isLocked ? "#6B7280" : "#FDE100"}
      stroke="#000"
      strokeWidth="0.8"
    />
  </g>
);

/**
 * 1. 自信勋章 (Confidence) - 侧向飞翼铠甲造型
 */
const ConfidenceMedalSvg: React.FC<{ isLocked?: boolean; isOutstanding?: boolean }> = ({ isLocked, isOutstanding }) => (
  <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-md overflow-visible">
    <defs>
      <linearGradient id="gold-wing-left" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isOutstanding ? "#FEF08A" : "#FDE100"} />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="gold-ribbon-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="40%" stopColor="#FDE100" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="locked-ribbon" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4B5563" />
        <stop offset="100%" stopColor="#1F2937" />
      </linearGradient>
      <radialGradient id="confidence-sunburst" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor={isLocked ? "#374151" : (isOutstanding ? "#FFFBEB" : "#FEF08A")} />
        <stop offset="50%" stopColor={isLocked ? "#1F2937" : "#FDE100"} />
        <stop offset="100%" stopColor={isLocked ? "#111827" : "#D97706"} />
      </radialGradient>
    </defs>

    {/* 外圈光晕 (若卓越则更亮) */}
    {isOutstanding && !isLocked && (
      <circle cx="100" cy="100" r="90" fill="#FDE100" opacity="0.2" className="animate-pulse" />
    )}

    {/* 左侧飞翼铠甲 */}
    <g fill={isLocked ? "#374151" : "url(#gold-wing-left)"} stroke={isLocked ? "#4B5563" : "#000000"} strokeWidth="2">
      <path d="M 60 50 L 15 65 L 8 95 L 35 110 L 55 90 Z" />
      <path d="M 50 85 L 5 105 L 12 135 L 45 140 L 58 120 Z" />
      <path d="M 45 125 L 18 145 L 30 170 L 60 160 Z" />
      {/* 翅膀内高光羽翼 */}
      <polygon points="52,60 20,72 38,98 56,82" fill={isLocked ? "#4B5563" : "#FEF08A"} stroke="#000" strokeWidth="1" />
      <polygon points="46,95 18,110 38,130 52,112" fill={isLocked ? "#4B5563" : "#FEF08A"} stroke="#000" strokeWidth="1" />
    </g>

    {/* 右侧飞翼铠甲 (水平镜像) */}
    <g transform="translate(200, 0) scale(-1, 1)" fill={isLocked ? "#374151" : "url(#gold-wing-left)"} stroke={isLocked ? "#4B5563" : "#000000"} strokeWidth="2">
      <path d="M 60 50 L 15 65 L 8 95 L 35 110 L 55 90 Z" />
      <path d="M 50 85 L 5 105 L 12 135 L 45 140 L 58 120 Z" />
      <path d="M 45 125 L 18 145 L 30 170 L 60 160 Z" />
      <polygon points="52,60 20,72 38,98 56,82" fill={isLocked ? "#4B5563" : "#FEF08A"} stroke="#000" strokeWidth="1" />
      <polygon points="46,95 18,110 38,130 52,112" fill={isLocked ? "#4B5563" : "#FEF08A"} stroke="#000" strokeWidth="1" />
    </g>

    {/* 主圆形/盾牌外框 */}
    <circle
      cx="100"
      cy="96"
      r="66"
      fill={isLocked ? "#1F2937" : "url(#gold-wing-left)"}
      stroke={isLocked ? "#4B5563" : "#000000"}
      strokeWidth="3.5"
    />
    {/* 放射线内盘 */}
    <circle
      cx="100"
      cy="96"
      r="56"
      fill="url(#confidence-sunburst)"
      stroke={isLocked ? "#374151" : "#000000"}
      strokeWidth="2"
    />

    {/* 放射光芒线条 */}
    <g stroke={isLocked ? "#4B5563" : "#F59E0B"} strokeWidth="1.5" opacity="0.6">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
        <line
          key={deg}
          x1="100"
          y1="96"
          x2={100 + 52 * Math.cos((deg * Math.PI) / 180)}
          y2={96 + 52 * Math.sin((deg * Math.PI) / 180)}
        />
      ))}
    </g>

    {/* 俱乐部中心图腾 */}
    <StoneGloryCenterCrest isLocked={isLocked} />

    {/* 顶部四角星 */}
    <TopStarSparkle isLocked={isLocked} />

    {/* 底部飘带文字 */}
    <BottomRibbonBanner title="自信" english="CONFIDENCE" isLocked={isLocked} />
  </svg>
);

/**
 * 2. 坚韧勋章 (Perseverance) - 水晶多边形切割几何盾牌
 */
const ResilienceMedalSvg: React.FC<{ isLocked?: boolean; isOutstanding?: boolean }> = ({ isLocked, isOutstanding }) => (
  <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-md overflow-visible">
    <defs>
      <linearGradient id="facet-light" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isOutstanding ? "#FFFBEB" : "#FEF08A"} />
        <stop offset="100%" stopColor="#FDE100" />
      </linearGradient>
      <linearGradient id="facet-mid" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE100" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="facet-dark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
    </defs>

    {/* 坚韧外圈水晶多边形多重切割 */}
    <g stroke={isLocked ? "#4B5563" : "#000000"} strokeWidth="1.8">
      {/* 顶部多边形 */}
      <polygon points="100,12 125,28 100,44 75,28" fill={isLocked ? "#374151" : "url(#facet-light)"} />
      <polygon points="125,28 155,42 135,62 100,44" fill={isLocked ? "#4B5563" : "url(#facet-mid)"} />
      <polygon points="75,28 45,42 65,62 100,44" fill={isLocked ? "#374151" : "url(#facet-mid)"} />
      
      {/* 左侧切割棱镜 */}
      <polygon points="45,42 22,68 46,90 65,62" fill={isLocked ? "#1F2937" : "url(#facet-light)"} />
      <polygon points="22,68 18,108 42,120 46,90" fill={isLocked ? "#374151" : "url(#facet-dark)"} />
      <polygon points="18,108 26,148 55,148 42,120" fill={isLocked ? "#4B5563" : "url(#facet-mid)"} />

      {/* 右侧切割棱镜 */}
      <polygon points="155,42 178,68 154,90 135,62" fill={isLocked ? "#374151" : "url(#facet-dark)"} />
      <polygon points="178,68 182,108 158,120 154,90" fill={isLocked ? "#1F2937" : "url(#facet-light)"} />
      <polygon points="182,108 174,148 145,148 158,120" fill={isLocked ? "#4B5563" : "url(#facet-mid)"} />

      {/* 内部主水晶盾体 */}
      <polygon points="100,44 145,70 148,138 100,166 52,138 55,70" fill={isLocked ? "#111827" : "#FDE100"} strokeWidth="3" />
      <polygon points="100,52 138,74 140,132 100,158 60,132 62,74" fill={isLocked ? "#1F2937" : "url(#facet-mid)"} />
    </g>

    {/* 中心图腾 */}
    <StoneGloryCenterCrest isLocked={isLocked} />

    {/* 顶部四角星 */}
    <TopStarSparkle isLocked={isLocked} />

    {/* 底部坚韧飘带 */}
    <BottomRibbonBanner title="坚韧" english="PERSEVERANCE" isLocked={isLocked} />
  </svg>
);

/**
 * 3. 勇气勋章 (Courage) - 咆哮雄狮 + 巍峨山峦
 */
const CourageMedalSvg: React.FC<{ isLocked?: boolean; isOutstanding?: boolean }> = ({ isLocked, isOutstanding }) => (
  <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-md overflow-visible">
    <defs>
      <linearGradient id="lion-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isOutstanding ? "#FFFBEB" : "#FEF08A"} />
        <stop offset="60%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="mountain-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* 齿轮太阳外圈 */}
    <g fill={isLocked ? "#374151" : "url(#lion-gold)"} stroke={isLocked ? "#4B5563" : "#000"} strokeWidth="2">
      <circle cx="100" cy="96" r="68" strokeWidth="3.5" />
      {/* 齿轮凸起波浪花边 */}
      {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const x = 100 + 70 * Math.cos(rad);
        const y = 96 + 70 * Math.sin(rad);
        return <circle key={deg} cx={x} cy={y} r="5.5" />;
      })}
    </g>

    {/* 左侧山峦 */}
    <g fill={isLocked ? "#1F2937" : "url(#mountain-gold)"} stroke={isLocked ? "#4B5563" : "#000"} strokeWidth="1.8">
      <polygon points="12,128 38,78 62,135" />
      <polygon points="32,130 52,90 74,138" fill={isLocked ? "#374151" : "#FEF08A"} />
      <polygon points="8,145 28,110 50,150" />
      {/* 山峰雪线高光 */}
      <polygon points="38,78 44,92 34,94" fill="#FFFFFF" stroke="none" />
      <polygon points="52,90 58,102 48,104" fill="#FFFFFF" stroke="none" />
    </g>

    {/* 右侧雄狮霸气浮雕 */}
    <g fill={isLocked ? "#4B5563" : "url(#lion-gold)"} stroke={isLocked ? "#374151" : "#000"} strokeWidth="1.8">
      {/* 狮身与鬃毛 */}
      <path d="M 135 60 C 158 50 185 65 186 95 C 188 120 172 145 152 155 L 140 148 C 158 135 168 118 165 98 C 162 82 148 72 135 76 Z" />
      {/* 狮头与咆哮口部 */}
      <path d="M 148 68 C 160 62 172 70 174 82 C 166 84 158 88 152 94 C 150 82 144 76 148 68 Z" fill={isLocked ? "#374151" : "#FEF08A"} />
      <polygon points="172,78 184,84 176,92 168,88" fill={isLocked ? "#6B7280" : "#FDE100"} />
      {/* 雄狮眼睛与鼻息 */}
      <circle cx="166" cy="78" r="2.2" fill="#000000" />
      {/* 飘逸狮尾 */}
      <path d="M 178 140 C 192 135 196 115 190 105" fill="none" strokeWidth="3" />
    </g>

    {/* 内层同心光环 */}
    <circle cx="100" cy="96" r="54" fill={isLocked ? "#111827" : "#000000"} stroke={isLocked ? "#4B5563" : "#FDE100"} strokeWidth="2.5" />

    {/* 中心图腾 */}
    <StoneGloryCenterCrest isLocked={isLocked} />

    {/* 顶部四角星 */}
    <TopStarSparkle isLocked={isLocked} />

    {/* 底部勇气飘带 */}
    <BottomRibbonBanner title="勇气" english="COURAGE" isLocked={isLocked} />
  </svg>
);

/**
 * 4. 创造勋章 (Creativity) - 椭圆桂冠与智慧光轮
 */
const CreativityMedalSvg: React.FC<{ isLocked?: boolean; isOutstanding?: boolean }> = ({ isLocked, isOutstanding }) => (
  <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-md overflow-visible">
    <defs>
      <linearGradient id="creativity-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isOutstanding ? "#FFFBEB" : "#FEF08A"} />
        <stop offset="50%" stopColor="#FDE100" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* 创造外圈立体多重椭圆光环 */}
    <g fill={isLocked ? "#1F2937" : "url(#creativity-grad)"} stroke={isLocked ? "#4B5563" : "#000"} strokeWidth="2.5">
      {/* 最外层高耸椭圆 */}
      <ellipse cx="100" cy="94" rx="66" ry="78" strokeWidth="4" />
      {/* 黑色衬线圈 */}
      <ellipse cx="100" cy="94" rx="58" ry="70" fill={isLocked ? "#111827" : "#000000"} />
      {/* 内金色圈 */}
      <ellipse cx="100" cy="94" rx="52" ry="64" fill={isLocked ? "#374151" : "url(#creativity-grad)"} />
    </g>

    {/* 两侧光芒桂冠叶片 / 创造光之羽 */}
    <g fill={isLocked ? "#374151" : "#FEF08A"} stroke={isLocked ? "#4B5563" : "#000"} strokeWidth="1.5">
      {/* 左侧桂冠叶 */}
      <path d="M 38 120 C 18 105 16 75 32 55 C 38 72 44 95 38 120 Z" />
      <path d="M 46 142 C 22 135 15 110 26 92 C 34 108 42 128 46 142 Z" fill={isLocked ? "#4B5563" : "#FDE100"} />
      <polygon points="34,148 10,140 22,165 42,158" />

      {/* 右侧桂冠叶 (镜像) */}
      <g transform="translate(200, 0) scale(-1, 1)">
        <path d="M 38 120 C 18 105 16 75 32 55 C 38 72 44 95 38 120 Z" />
        <path d="M 46 142 C 22 135 15 110 26 92 C 34 108 42 128 46 142 Z" fill={isLocked ? "#4B5563" : "#FDE100"} />
        <polygon points="34,148 10,140 22,165 42,158" />
      </g>
    </g>

    {/* 底部阶梯式智慧底座 */}
    <g fill={isLocked ? "#1F2937" : "#D97706"} stroke={isLocked ? "#4B5563" : "#000"} strokeWidth="1.8">
      <rect x="75" y="166" width="50" height="6" rx="2" fill={isLocked ? "#374151" : "#FEF08A"} />
      <rect x="80" y="172" width="40" height="5" rx="1.5" fill={isLocked ? "#4B5563" : "#FDE100"} />
      <rect x="86" y="177" width="28" height="4" rx="1" fill={isLocked ? "#1F2937" : "#B45309"} />
    </g>

    {/* 中心图腾 */}
    <StoneGloryCenterCrest isLocked={isLocked} />

    {/* 顶部四角星 */}
    <TopStarSparkle isLocked={isLocked} />

    {/* 底部创造飘带 */}
    <BottomRibbonBanner title="创造" english="CREATIVITY" isLocked={isLocked} />
  </svg>
);

/**
 * 5. 合作勋章 (Cooperation) - 咬合式六边形重型装甲要塞
 */
const CooperationMedalSvg: React.FC<{ isLocked?: boolean; isOutstanding?: boolean }> = ({ isLocked, isOutstanding }) => (
  <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-md overflow-visible">
    <defs>
      <linearGradient id="coop-armor-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isOutstanding ? "#FFFBEB" : "#FEF08A"} />
        <stop offset="50%" stopColor="#FDE100" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* 合作六边形重型联结外装甲 */}
    <g fill={isLocked ? "#1F2937" : "url(#coop-armor-gold)"} stroke={isLocked ? "#4B5563" : "#000"} strokeWidth="2.5">
      {/* 外圈六边形 */}
      <polygon points="100,16 166,48 166,144 100,176 34,144 34,48" strokeWidth="4" />
      {/* 黑色咬合槽口 */}
      <polygon points="100,24 158,54 158,138 100,168 42,138 42,54" fill={isLocked ? "#111827" : "#000000"} />
    </g>

    {/* 左右两侧对称齿轮装甲锁扣 (象征团队紧密协作) */}
    <g fill={isLocked ? "#374151" : "#FEF08A"} stroke={isLocked ? "#4B5563" : "#000"} strokeWidth="1.8">
      {/* 左侧卡扣 */}
      <polygon points="34,70 12,82 12,110 34,122 46,108 46,84" />
      <polygon points="18,88 28,88 28,104 18,104" fill={isLocked ? "#1F2937" : "#F59E0B"} />

      {/* 右侧卡扣 (镜像) */}
      <polygon points="166,70 188,82 188,110 166,122 154,108 154,84" />
      <polygon points="182,88 172,88 172,104 182,104" fill={isLocked ? "#1F2937" : "#F59E0B"} />
    </g>

    {/* 内部黄金六边形内盘 */}
    <polygon
      points="100,34 148,60 148,132 100,158 52,132 52,60"
      fill={isLocked ? "#374151" : "url(#coop-armor-gold)"}
      stroke={isLocked ? "#4B5563" : "#000"}
      strokeWidth="2"
    />

    {/* 中心图腾 */}
    <StoneGloryCenterCrest isLocked={isLocked} />

    {/* 顶部四角星 */}
    <TopStarSparkle isLocked={isLocked} />

    {/* 底部合作飘带 */}
    <BottomRibbonBanner title="合作" english="COOPERATION" isLocked={isLocked} />
  </svg>
);

/**
 * 统一勋章渲染器
 */
export const CharacterMedalBadge: React.FC<CharacterMedalProps> = ({
  dimension,
  level = 'none',
  earnedCount = 0,
  outstandingCount = 0,
  size = 'md',
  showLabel = true,
  showCountBadge = true,
  className = '',
  isInteractive = false,
  onClick
}) => {
  const config = DIMENSION_MEDAL_CONFIG[dimension];
  const isAwarded = level === 'standard' || level === 'outstanding' || earnedCount > 0;
  const isOutstanding = level === 'outstanding' || outstandingCount > 0;
  const isObserving = level === 'observing';
  const isLocked = !isAwarded && !isObserving;

  const { width, height, textClass } = SIZE_MAP[size];

  const renderSvg = () => {
    switch (dimension) {
      case 'confidence':
        return <ConfidenceMedalSvg isLocked={isLocked} isOutstanding={isOutstanding} />;
      case 'resilience':
        return <ResilienceMedalSvg isLocked={isLocked} isOutstanding={isOutstanding} />;
      case 'courage':
        return <CourageMedalSvg isLocked={isLocked} isOutstanding={isOutstanding} />;
      case 'creativity':
        return <CreativityMedalSvg isLocked={isLocked} isOutstanding={isOutstanding} />;
      case 'cooperation':
        return <CooperationMedalSvg isLocked={isLocked} isOutstanding={isOutstanding} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      className={`relative inline-flex flex-col items-center select-none transition-all duration-200 ${
        isInteractive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      title={`${config.name} (${config.english}) - ${
        isOutstanding ? '卓越勋章 (4分满分)' : isAwarded ? `已获授 ${earnedCount} 次勋章` : isObserving ? '继续观察 (2分)' : '待评定/待点亮'
      }`}
    >
      {/* 勋章图形容器 */}
      <div
        style={{ width: `${width}px`, height: `${height}px` }}
        className={`relative flex items-center justify-center ${
          isLocked ? 'opacity-40 grayscale filter hover:grayscale-0 hover:opacity-75 transition-all' : ''
        }`}
      >
        {renderSvg()}

        {/* 卓越光环动画 */}
        {isOutstanding && (
          <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-md pointer-events-none -z-10 animate-pulse" />
        )}

        {/* 获授次数徽章 (右上角角标) */}
        {showCountBadge && earnedCount > 1 && (
          <div className="absolute -top-1 -right-1 bg-bvb-black text-bvb-yellow border-2 border-white rounded-full px-1.5 py-0.2 text-[9px] font-black shadow-md z-20">
            ×{earnedCount}
          </div>
        )}

        {/* 锁定提示锁头 */}
        {isLocked && size !== 'xs' && (
          <div className="absolute bottom-6 bg-gray-900/80 text-gray-300 px-1.5 py-0.5 rounded text-[8px] font-bold border border-gray-700 pointer-events-none">
            待点亮
          </div>
        )}
      </div>

      {/* 底部文字标签 */}
      {showLabel && (
        <div className="text-center mt-1 flex flex-col items-center max-w-[90px]">
          <span className={`font-black tracking-tight leading-tight ${textClass} ${
            isOutstanding ? 'text-amber-600' : isAwarded ? 'text-gray-900' : isObserving ? 'text-sky-600' : 'text-gray-400'
          }`}>
            {config.name}
          </span>
          <span className="text-[7px] text-gray-400 font-mono tracking-tighter uppercase font-bold truncate">
            {config.english}
          </span>
        </div>
      )}
    </div>
  );
};

export default CharacterMedalBadge;
