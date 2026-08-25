import React from 'react';
import { PitchType, PitchTheme } from '../../types';
import { PITCH_THEMES } from './constants';

interface PitchSvgRendererProps {
  pitchType: PitchType;
  pitchTheme: PitchTheme;
  showGrid?: boolean;
  className?: string;
}

export const PitchSvgRenderer: React.FC<PitchSvgRendererProps> = ({
  pitchType,
  pitchTheme,
  showGrid = false,
  className = 'w-full h-full'
}) => {
  const theme = PITCH_THEMES.find(t => t.id === pitchTheme) || PITCH_THEMES[0]; // default Classic White or theme
  
  // Orientation & Dimensions
  const isVertical = pitchType === 'Portrait' || pitchType === 'FutsalVertical' || pitchType === 'RectangleVertical';
  const isSquare = pitchType === 'SquareBox' || pitchType === 'FourGrids' || pitchType === 'HalfDefend' || pitchType === 'HalfAttack';
  const isTwoThirdsVertical = pitchType === 'TwoThirdsDefend' || pitchType === 'TwoThirdsAttack';

  let width = 900;
  let height = 600;
  let viewBox = '0 0 900 600';

  if (isVertical) {
    width = 600;
    height = 900;
    viewBox = '0 0 600 900';
  } else if (isSquare) {
    width = 600;
    height = 600;
    viewBox = '0 0 600 600';
  } else if (isTwoThirdsVertical) {
    width = 600;
    height = 780;
    viewBox = '0 0 600 780';
  }

  // Background pattern with grass stripes if applicable
  const renderBackground = () => {
    if (theme.isStripe && theme.stripeColor) {
      const isHorizontalStripes =
        isVertical ||
        isSquare ||
        isTwoThirdsVertical ||
        pitchType === 'Midfield' ||
        pitchType === 'DefensiveThird' ||
        pitchType === 'AttackingThird';

      const stripesCount =
        pitchType === 'Midfield' || pitchType === 'DefensiveThird' || pitchType === 'AttackingThird' || isSquare
          ? 6
          : (isTwoThirdsVertical || pitchType === 'TwoThirdsHorizontal' ? 8 : 10);

      const stripeSize = isHorizontalStripes ? height / stripesCount : width / stripesCount;

      return (
        <g>
          <rect width={width} height={height} fill={theme.bgColor} />
          {Array.from({ length: stripesCount }).map((_, i) => (
            i % 2 === 1 ? (
              <rect
                key={i}
                x={isHorizontalStripes ? 0 : i * stripeSize}
                y={isHorizontalStripes ? i * stripeSize : 0}
                width={isHorizontalStripes ? width : stripeSize}
                height={isHorizontalStripes ? stripeSize : height}
                fill={theme.stripeColor}
              />
            ) : null
          ))}
        </g>
      );
    }
    return <rect width={width} height={height} fill={theme.bgColor} />;
  };

  const lc = theme.lineColor;
  const lw = 2.8;

  // Grid lines helper
  const renderGrid = () => {
    if (!showGrid) return null;
    const gridSpacing = 40;
    const gridCols = Math.floor(width / gridSpacing);
    const gridRows = Math.floor(height / gridSpacing);
    return (
      <g stroke={lc} strokeWidth={1} strokeDasharray="3,3" opacity={0.25}>
        {Array.from({ length: gridCols + 1 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * gridSpacing} y1={0} x2={i * gridSpacing} y2={height} />
        ))}
        {Array.from({ length: gridRows + 1 }).map((_, i) => (
          <line key={`h-${i}`} x1={0} y1={i * gridSpacing} x2={width} y2={i * gridSpacing} />
        ))}
      </g>
    );
  };

  // Helper to render standard horizontal full pitch
  const renderFullPitchMarkings = (extraOverlay?: React.ReactNode) => {
    const pad = 36;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const cx = width / 2;
    const cy = height / 2;

    return (
      <g stroke={lc} strokeWidth={lw} fill="none">
        {/* Outer boundary */}
        <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
        {/* Center line & circle */}
        <line x1={cx} y1={pad} x2={cx} y2={height - pad} />
        <circle cx={cx} cy={cy} r={75} />
        <circle cx={cx} cy={cy} r={3.2} fill={lc} />

        {/* Left Goal Area */}
        <rect x={pad} y={cy - 120} width={130} height={240} />
        <rect x={pad} y={cy - 55} width={48} height={110} />
        <circle cx={pad + 85} cy={cy} r={3.2} fill={lc} />
        <path d={`M ${pad + 130} ${cy - 50} A 55 55 0 0 1 ${pad + 130} ${cy + 50}`} />

        {/* Right Goal Area */}
        <rect x={width - pad - 130} y={cy - 120} width={130} height={240} />
        <rect x={width - pad - 48} y={cy - 55} width={48} height={110} />
        <circle cx={width - pad - 85} cy={cy} r={3.2} fill={lc} />
        <path d={`M ${width - pad - 130} ${cy - 50} A 55 55 0 0 0 ${width - pad - 130} ${cy + 50}`} />

        {/* Corner Arcs */}
        <path d={`M ${pad} ${pad + 14} A 14 14 0 0 0 ${pad + 14} ${pad}`} />
        <path d={`M ${pad} ${height - pad - 14} A 14 14 0 0 1 ${pad + 14} ${height - pad}`} />
        <path d={`M ${width - pad} ${pad + 14} A 14 14 0 0 1 ${width - pad - 14} ${pad}`} />
        <path d={`M ${width - pad} ${height - pad - 14} A 14 14 0 0 0 ${width - pad - 14} ${height - pad}`} />

        {/* Optional Tactical Overlay */}
        {extraOverlay}
      </g>
    );
  };

  // Specific field line markings
  const renderMarkings = () => {
    const pad = 36;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const cx = width / 2;
    const cy = height / 2;

    switch (pitchType) {
      // 1. 中场 (Image 1, Item 1)
      case 'Midfield':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} />
            <circle cx={cx} cy={cy} r={85} />
            <circle cx={cx} cy={cy} r={3.2} fill={lc} />
          </g>
        );

      // 2. 防守三区 (Image 1, Item 2)
      case 'DefensiveThird':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <rect x={cx - 180} y={height - pad - 160} width={360} height={160} />
            <rect x={cx - 80} y={height - pad - 60} width={160} height={60} />
            <circle cx={cx} cy={height - pad - 110} r={3.5} fill={lc} />
            <path d={`M ${cx - 70} ${height - pad - 160} A 75 75 0 0 1 ${cx + 70} ${height - pad - 160}`} />
          </g>
        );

      // 3. 进攻三区 (Image 1, Item 3)
      case 'AttackingThird':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <rect x={cx - 180} y={pad} width={360} height={160} />
            <rect x={cx - 80} y={pad} width={160} height={60} />
            <circle cx={cx} cy={pad + 110} r={3.5} fill={lc} />
            <path d={`M ${cx - 70} ${pad + 160} A 75 75 0 0 0 ${cx + 70} ${pad + 160}`} />
          </g>
        );

      // 4. 完整球场 (Image 1, Item 4)
      case 'Full':
        return renderFullPitchMarkings();

      // 5. 半场 (防守) (Image 1, Item 5 -> Image 2 left)
      case 'HalfDefend':
      case 'Half':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            {/* Top Midfield line & center circle arc (semi-circle curving down into pitch) */}
            <line x1={pad} y1={pad + 45} x2={width - pad} y2={pad + 45} />
            <path d={`M ${cx - 65} ${pad + 45} A 65 65 0 0 0 ${cx + 65} ${pad + 45}`} />
            
            {/* Bottom Goal Area */}
            <rect x={cx - 130} y={height - pad - 140} width={260} height={140} />
            <rect x={cx - 55} y={height - pad - 50} width={110} height={50} />
            <circle cx={cx} cy={height - pad - 95} r={3.2} fill={lc} />
            <path d={`M ${cx - 55} ${height - pad - 140} A 60 60 0 0 1 ${cx + 55} ${height - pad - 140}`} />
          </g>
        );

      // 6. 半场 (进攻) (Image 1, Item 6 -> Image 2 right)
      case 'HalfAttack':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            {/* Top Goal Area */}
            <rect x={cx - 130} y={pad} width={260} height={140} />
            <rect x={cx - 55} y={pad} width={110} height={50} />
            <circle cx={cx} cy={pad + 95} r={3.2} fill={lc} />
            <path d={`M ${cx - 55} ${pad + 140} A 60 60 0 0 0 ${cx + 55} ${pad + 140}`} />
            
            {/* Bottom Midfield line & center circle arc (semi-circle curving up into pitch) */}
            <line x1={pad} y1={height - pad - 45} x2={width - pad} y2={height - pad - 45} />
            <path d={`M ${cx - 65} ${height - pad - 45} A 65 65 0 0 1 ${cx + 65} ${height - pad - 45}`} />
          </g>
        );

      // 7. 五人制球场 (Image 1, Item 7)
      case 'Futsal':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} />
            <circle cx={cx} cy={cy} r={65} />
            <circle cx={cx} cy={cy} r={3.2} fill={lc} />
            {/* Left D-zone */}
            <path d={`M ${pad} ${cy - 120} A 120 120 0 0 1 ${pad} ${cy + 120}`} />
            <circle cx={pad + 100} cy={cy} r={3.2} fill={lc} />
            {/* Right D-zone */}
            <path d={`M ${width - pad} ${cy - 120} A 120 120 0 0 0 ${width - pad} ${cy + 120}`} />
            <circle cx={width - pad - 100} cy={cy} r={3.2} fill={lc} />
          </g>
        );

      // 8. 空白正方形 (Image 1, Item 8)
      case 'SquareBox':
      case 'Box':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
          </g>
        );

      // 9. 空白长方形 (Image 2, Item 1)
      case 'RectangleBox':
      case 'AdvRectangle':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
          </g>
        );

      // 10. 空白长方形 (竖版) (Image 2, Item 2)
      case 'RectangleVertical':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
          </g>
        );

      // 11. 双长方形 (竖版) (Image 2, Item 3)
      case 'DualRectangleVertical':
      case 'DualRectangle':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad + 35} y={pad} width={345} height={innerH} rx={2} />
            <rect x={width - pad - 380} y={pad} width={345} height={innerH} rx={2} />
          </g>
        );

      // 12. 完整球场 (纵向) (Image 2, Item 4)
      case 'Portrait':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} />
            <circle cx={cx} cy={cy} r={75} />
            <circle cx={cx} cy={cy} r={3.2} fill={lc} />

            {/* Top Goal Area */}
            <rect x={cx - 120} y={pad} width={240} height={130} />
            <rect x={cx - 55} y={pad} width={110} height={48} />
            <circle cx={cx} cy={pad + 85} r={3.2} fill={lc} />
            <path d={`M ${cx - 50} ${pad + 130} A 55 55 0 0 0 ${cx + 50} ${pad + 130}`} />

            {/* Bottom Goal Area */}
            <rect x={cx - 120} y={height - pad - 130} width={240} height={130} />
            <rect x={cx - 55} y={height - pad - 48} width={110} height={48} />
            <circle cx={cx} cy={height - pad - 85} r={3.2} fill={lc} />
            <path d={`M ${cx - 50} ${height - pad - 130} A 55 55 0 0 1 ${cx + 50} ${height - pad - 130}`} />

            {/* Corners */}
            <path d={`M ${pad} ${pad + 14} A 14 14 0 0 0 ${pad + 14} ${pad}`} />
            <path d={`M ${width - pad} ${pad + 14} A 14 14 0 0 1 ${width - pad - 14} ${pad}`} />
            <path d={`M ${pad} ${height - pad - 14} A 14 14 0 0 1 ${pad + 14} ${height - pad}`} />
            <path d={`M ${width - pad} ${height - pad - 14} A 14 14 0 0 0 ${width - pad - 14} ${height - pad}`} />
          </g>
        );

      // 13. 三分之二场 (防守) (Image 2, Item 5)
      case 'TwoThirdsDefend':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            {/* Midfield line at ~26% from top */}
            <line x1={pad} y1={pad + 150} x2={width - pad} y2={pad + 150} />
            <circle cx={cx} cy={pad + 150} r={70} />
            <circle cx={cx} cy={pad + 150} r={3.2} fill={lc} />
            {/* Defending Goal Area */}
            <rect x={cx - 130} y={height - pad - 140} width={260} height={140} />
            <rect x={cx - 55} y={height - pad - 50} width={110} height={50} />
            <circle cx={cx} cy={height - pad - 95} r={3.2} fill={lc} />
            <path d={`M ${cx - 55} ${height - pad - 140} A 60 60 0 0 1 ${cx + 55} ${height - pad - 140}`} />
          </g>
        );

      // 14. 三分之二场 (进攻) (Image 2, Item 6)
      case 'TwoThirdsAttack':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            {/* Attacking Goal Area */}
            <rect x={cx - 130} y={pad} width={260} height={140} />
            <rect x={cx - 55} y={pad} width={110} height={50} />
            <circle cx={cx} cy={pad + 95} r={3.2} fill={lc} />
            <path d={`M ${cx - 55} ${pad + 140} A 60 60 0 0 0 ${cx + 55} ${pad + 140}`} />
            {/* Midfield line at ~26% from bottom */}
            <line x1={pad} y1={height - pad - 150} x2={width - pad} y2={height - pad - 150} />
            <circle cx={cx} cy={height - pad - 150} r={70} />
            <circle cx={cx} cy={height - pad - 150} r={3.2} fill={lc} />
          </g>
        );

      // 15. 三分之二场 (横向) (Image 2, Item 7)
      case 'TwoThirdsHorizontal':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            {/* Goal Area on Left */}
            <rect x={pad} y={cy - 120} width={130} height={240} />
            <rect x={pad} y={cy - 55} width={48} height={110} />
            <circle cx={pad + 85} cy={cy} r={3.2} fill={lc} />
            <path d={`M ${pad + 130} ${cy - 50} A 55 55 0 0 1 ${pad + 130} ${cy + 50}`} />
            {/* Midfield line on Right */}
            <line x1={width - pad - 170} y1={pad} x2={width - pad - 170} y2={height - pad} />
            <circle cx={width - pad - 170} cy={cy} r={75} />
            <circle cx={width - pad - 170} cy={cy} r={3.2} fill={lc} />
          </g>
        );

      // 16. 五人制球场 (纵向) (Image 4)
      case 'FutsalVertical':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} />
            <circle cx={cx} cy={cy} r={60} />
            {/* Top D-zone (curves into pitch downwards) */}
            <path d={`M ${cx - 100} ${pad} A 100 100 0 0 0 ${cx + 100} ${pad}`} />
            <circle cx={cx} cy={pad + 120} r={3.2} fill={lc} />
            {/* Bottom D-zone (curves into pitch upwards) */}
            <path d={`M ${cx - 100} ${height - pad} A 100 100 0 0 1 ${cx + 100} ${height - pad}`} />
            <circle cx={cx} cy={height - pad - 120} r={3.2} fill={lc} />
          </g>
        );

      // 17. 三角形 (Image 3, Item 1)
      case 'Triangle':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <polygon points={`${cx},${pad + 65} ${width - pad - 95},${height - pad - 55} ${pad + 95},${height - pad - 55}`} />
          </g>
        );

      // 18. 圆形 (Image 3, Item 2)
      case 'Circle':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <circle cx={cx} cy={cy} r={165} />
          </g>
        );

      // 19. 田字形 (Image 3, Item 3)
      case 'FourGrids':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={2} />
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} />
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} />
          </g>
        );

      // 20. 类型一 (Image 3, Item 4)
      case 'TacticalZone1':
      case 'GridType1':
        return renderFullPitchMarkings(
          <line
            x1={pad}
            y1={cy}
            x2={width - pad}
            y2={cy}
            stroke={lc}
            strokeWidth={2.2}
            strokeDasharray="6,6"
            opacity={0.85}
          />
        );

      // 21. 类型二 (Image 4, Item 1)
      case 'TacticalZone2':
      case 'GridType2':
        return renderFullPitchMarkings(
          <g stroke={lc} strokeWidth={2.2} strokeDasharray="6,6" opacity={0.85}>
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} />
            <line x1={pad + innerW * 0.333} y1={pad} x2={pad + innerW * 0.333} y2={height - pad} />
            <line x1={pad + innerW * 0.666} y1={pad} x2={pad + innerW * 0.666} y2={height - pad} />
          </g>
        );

      // 22. 类型三 (Image 4, Item 2)
      case 'TacticalZone3':
      case 'GridType3':
        return renderFullPitchMarkings(
          <g stroke={lc} strokeWidth={2.2} strokeDasharray="6,6" opacity={0.85}>
            <line x1={pad} y1={cy - 120} x2={width - pad} y2={cy - 120} />
            <line x1={pad} y1={cy + 120} x2={width - pad} y2={cy + 120} />
          </g>
        );

      // 23. 类型四 (Image 4, Item 3)
      case 'TacticalZone4':
      case 'GridType4':
        return renderFullPitchMarkings(
          <g stroke={lc} strokeWidth={2.2} strokeDasharray="6,6" opacity={0.85}>
            <line x1={pad} y1={cy - 55} x2={width - pad} y2={cy - 55} />
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} />
            <line x1={pad} y1={cy + 55} x2={width - pad} y2={cy + 55} />
          </g>
        );

      // 24. 类型五 (Image 4, Item 4)
      case 'TacticalZone5':
      case 'GridType5':
        return renderFullPitchMarkings(
          <g stroke={lc} strokeWidth={2.2} strokeDasharray="6,6" opacity={0.85}>
            <line x1={pad} y1={pad + innerH * 0.20} x2={width - pad} y2={pad + innerH * 0.20} />
            <line x1={pad} y1={pad + innerH * 0.40} x2={width - pad} y2={pad + innerH * 0.40} />
            <line x1={pad} y1={pad + innerH * 0.60} x2={width - pad} y2={pad + innerH * 0.60} />
            <line x1={pad} y1={pad + innerH * 0.80} x2={width - pad} y2={pad + innerH * 0.80} />
          </g>
        );

      // 25. 类型六 (Image 4, Item 5)
      case 'TacticalZone6':
        return renderFullPitchMarkings(
          <g stroke={lc} strokeWidth={2.2} strokeDasharray="6,6" opacity={0.85}>
            {/* 4 horizontal lines (5 corridors) */}
            <line x1={pad} y1={pad + innerH * 0.20} x2={width - pad} y2={pad + innerH * 0.20} />
            <line x1={pad} y1={pad + innerH * 0.40} x2={width - pad} y2={pad + innerH * 0.40} />
            <line x1={pad} y1={pad + innerH * 0.60} x2={width - pad} y2={pad + innerH * 0.60} />
            <line x1={pad} y1={pad + innerH * 0.80} x2={width - pad} y2={pad + innerH * 0.80} />
            {/* 4 vertical lines */}
            <line x1={pad + innerW * 0.166} y1={pad} x2={pad + innerW * 0.166} y2={height - pad} />
            <line x1={pad + innerW * 0.333} y1={pad} x2={pad + innerW * 0.333} y2={height - pad} />
            <line x1={pad + innerW * 0.666} y1={pad} x2={pad + innerW * 0.666} y2={height - pad} />
            <line x1={pad + innerW * 0.833} y1={pad} x2={pad + innerW * 0.833} y2={height - pad} />
          </g>
        );

      // 26. 类型七 (Image 4, Item 6)
      case 'TacticalZone7':
        return renderFullPitchMarkings(
          <g stroke={lc} strokeWidth={2.2} strokeDasharray="6,6" opacity={0.85}>
            <line x1={pad} y1={cy - 120} x2={width - pad} y2={cy - 120} />
            <line x1={pad} y1={cy + 120} x2={width - pad} y2={cy + 120} />
            <line x1={pad + innerW * 0.333} y1={pad} x2={pad + innerW * 0.333} y2={height - pad} />
            <line x1={pad + innerW * 0.666} y1={pad} x2={pad + innerW * 0.666} y2={height - pad} />
          </g>
        );

      // Fallback
      default:
        return renderFullPitchMarkings();
    }
  };

  return (
    <svg
      viewBox={viewBox}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {renderBackground()}
      {renderGrid()}
      {renderMarkings()}
    </svg>
  );
};
