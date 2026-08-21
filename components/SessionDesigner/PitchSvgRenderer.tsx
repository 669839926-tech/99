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
  const theme = PITCH_THEMES.find(t => t.id === pitchTheme) || PITCH_THEMES[3]; // default Grass
  const isVertical = pitchType === 'Portrait' || pitchType === 'FutsalVertical';
  const viewBox = isVertical ? '0 0 600 900' : '0 0 900 600';
  const width = isVertical ? 600 : 900;
  const height = isVertical ? 900 : 600;

  // Background pattern with grass stripes if applicable
  const renderBackground = () => {
    if (theme.isStripe && theme.stripeColor) {
      const stripesCount = 10;
      const stripeSize = isVertical ? height / stripesCount : width / stripesCount;
      return (
        <g>
          <rect width={width} height={height} fill={theme.bgColor} />
          {Array.from({ length: stripesCount }).map((_, i) => (
            i % 2 === 1 ? (
              <rect
                key={i}
                x={isVertical ? 0 : i * stripeSize}
                y={isVertical ? i * stripeSize : 0}
                width={isVertical ? width : stripeSize}
                height={isVertical ? stripeSize : height}
                fill={theme.stripeColor}
                opacity={0.35}
              />
            ) : null
          ))}
        </g>
      );
    }
    return <rect width={width} height={height} fill={theme.bgColor} />;
  };

  const lc = theme.lineColor;
  const lw = 3;

  // Grid lines
  const renderGrid = () => {
    if (!showGrid) return null;
    const gridSpacing = 45;
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

  // Specific field line markings
  const renderMarkings = () => {
    const pad = 40;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const cx = width / 2;
    const cy = height / 2;

    switch (pitchType) {
      case 'Full':
      case 'Futsal':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            {/* Outer border */}
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={4} />
            {/* Center line & circle */}
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} />
            <circle cx={cx} cy={cy} r={75} />
            <circle cx={cx} cy={cy} r={3} fill={lc} />
            {/* Left Penalty Area */}
            <rect x={pad} y={cy - 120} width={130} height={240} />
            <rect x={pad} y={cy - 60} width={50} height={120} />
            <circle cx={pad + 80} cy={cy} r={3} fill={lc} />
            <path d={`M ${pad + 130} ${cy - 50} A 60 60 0 0 1 ${pad + 130} ${cy + 50}`} />
            {/* Right Penalty Area */}
            <rect x={width - pad - 130} y={cy - 120} width={130} height={240} />
            <rect x={width - pad - 50} y={cy - 60} width={50} height={120} />
            <circle cx={width - pad - 80} cy={cy} r={3} fill={lc} />
            <path d={`M ${width - pad - 130} ${cy - 50} A 60 60 0 0 0 ${width - pad - 130} ${cy + 50}`} />
            {/* Corners */}
            <path d={`M ${pad} ${pad + 15} A 15 15 0 0 0 ${pad + 15} ${pad}`} />
            <path d={`M ${pad} ${height - pad - 15} A 15 15 0 0 1 ${pad + 15} ${height - pad}`} />
            <path d={`M ${width - pad} ${pad + 15} A 15 15 0 0 1 ${width - pad - 15} ${pad}`} />
            <path d={`M ${width - pad} ${height - pad - 15} A 15 15 0 0 0 ${width - pad - 15} ${height - pad}`} />
          </g>
        );

      case 'Portrait':
      case 'FutsalVertical':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={4} />
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} />
            <circle cx={cx} cy={cy} r={75} />
            <circle cx={cx} cy={cy} r={3} fill={lc} />
            {/* Top Penalty Area */}
            <rect x={cx - 120} y={pad} width={240} height={130} />
            <rect x={cx - 60} y={pad} width={120} height={50} />
            <circle cx={cx} cy={pad + 80} r={3} fill={lc} />
            {/* Bottom Penalty Area */}
            <rect x={cx - 120} y={height - pad - 130} width={240} height={130} />
            <rect x={cx - 60} y={height - pad - 50} width={120} height={50} />
            <circle cx={cx} cy={height - pad - 80} r={3} fill={lc} />
          </g>
        );

      case 'Midfield':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={4} />
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} />
            <circle cx={cx} cy={cy} r={110} />
            <circle cx={cx} cy={cy} r={4} fill={lc} />
            {/* Dotted zone guides */}
            <line x1={pad + innerW * 0.25} y1={pad} x2={pad + innerW * 0.25} y2={height - pad} strokeDasharray="6,6" opacity={0.6} />
            <line x1={pad + innerW * 0.75} y1={pad} x2={pad + innerW * 0.75} y2={height - pad} strokeDasharray="6,6" opacity={0.6} />
          </g>
        );

      case 'AttackingThird':
      case 'HalfAttack':
      case 'TwoThirdsAttack':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={4} />
            {/* Center line boundary on left */}
            <line x1={pad} y1={pad} x2={pad} y2={height - pad} strokeWidth={lw * 1.5} />
            {/* Right Goal Area */}
            <rect x={width - pad - 180} y={cy - 160} width={180} height={320} />
            <rect x={width - pad - 70} y={cy - 80} width={70} height={160} />
            <circle cx={width - pad - 110} cy={cy} r={4} fill={lc} />
            <path d={`M ${width - pad - 180} ${cy - 70} A 80 80 0 0 0 ${width - pad - 180} ${cy + 70}`} />
            {/* Wing Channels */}
            <line x1={pad} y1={pad + innerH * 0.22} x2={width - pad} y2={pad + innerH * 0.22} strokeDasharray="6,6" opacity={0.5} />
            <line x1={pad} y1={height - pad - innerH * 0.22} x2={width - pad} y2={height - pad - innerH * 0.22} strokeDasharray="6,6" opacity={0.5} />
          </g>
        );

      case 'DefensiveThird':
      case 'HalfDefend':
      case 'TwoThirdsDefend':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={4} />
            {/* Left Goal Area */}
            <rect x={pad} y={cy - 160} width={180} height={320} />
            <rect x={pad} y={cy - 80} width={70} height={160} />
            <circle cx={pad + 110} cy={cy} r={4} fill={lc} />
            <path d={`M ${pad + 180} ${cy - 70} A 80 80 0 0 1 ${pad + 180} ${cy + 70}`} />
            {/* Midfield line on right */}
            <line x1={width - pad} y1={pad} x2={width - pad} y2={height - pad} strokeWidth={lw * 1.5} />
            {/* Wing channels */}
            <line x1={pad} y1={pad + innerH * 0.22} x2={width - pad} y2={pad + innerH * 0.22} strokeDasharray="6,6" opacity={0.5} />
            <line x1={pad} y1={height - pad - innerH * 0.22} x2={width - pad} y2={height - pad - innerH * 0.22} strokeDasharray="6,6" opacity={0.5} />
          </g>
        );

      case 'TwoThirdsHorizontal':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={4} />
            <line x1={pad + innerW * 0.67} y1={pad} x2={pad + innerW * 0.67} y2={height - pad} strokeWidth={lw * 1.5} />
            <rect x={pad} y={cy - 140} width={140} height={280} />
            <circle cx={pad + 90} cy={cy} r={4} fill={lc} />
            <path d={`M ${pad + 140} ${cy - 60} A 70 70 0 0 1 ${pad + 140} ${cy + 60}`} />
          </g>
        );

      case 'SquareBox':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={8} />
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} strokeDasharray="4,4" opacity={0.4} />
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} strokeDasharray="4,4" opacity={0.4} />
            <circle cx={cx} cy={cy} r={6} fill={lc} opacity={0.6} />
          </g>
        );

      case 'RectangleBox':
      case 'AdvRectangle':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={8} />
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} strokeDasharray="6,6" opacity={0.5} />
            <line x1={pad} y1={cy} x2={width - pad} y2={cy} strokeDasharray="6,6" opacity={0.5} />
            {pitchType === 'AdvRectangle' && (
              <>
                <circle cx={cx} cy={cy} r={80} strokeDasharray="4,4" opacity={0.5} />
                <rect x={pad + 60} y={pad + 50} width={innerW - 120} height={innerH - 100} strokeDasharray="3,3" opacity={0.4} />
              </>
            )}
          </g>
        );

      case 'DualRectangle':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW * 0.46} height={innerH} rx={6} />
            <rect x={width - pad - innerW * 0.46} y={pad} width={innerW * 0.46} height={innerH} rx={6} />
            {/* Zone channels */}
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} strokeDasharray="4,4" opacity={0.6} />
          </g>
        );

      case 'Triangle':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <polygon points={`${cx},${pad + 20} ${width - pad - 30},${height - pad - 20} ${pad + 30},${height - pad - 20}`} />
            <circle cx={cx} cy={cy + 30} r={40} strokeDasharray="4,4" opacity={0.4} />
          </g>
        );

      case 'Diamond':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <polygon points={`${cx},${pad + 20} ${width - pad - 30},${cy} ${cx},${height - pad - 20} ${pad + 30},${cy}`} />
            <line x1={cx} y1={pad + 20} x2={cx} y2={height - pad - 20} strokeDasharray="4,4" opacity={0.4} />
            <line x1={pad + 30} y1={cy} x2={width - pad - 30} y2={cy} strokeDasharray="4,4" opacity={0.4} />
          </g>
        );

      case 'Trapezoid':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <polygon points={`${pad + innerW * 0.2},${pad + 30} ${width - pad - innerW * 0.2},${pad + 30} ${width - pad - 20},${height - pad - 20} ${pad + 20},${height - pad - 20}`} />
            <line x1={cx} y1={pad + 30} x2={cx} y2={height - pad - 20} strokeDasharray="4,4" opacity={0.4} />
          </g>
        );

      case 'GridType1':
      case 'GridType2':
      case 'GridType3':
      case 'GridType4':
      case 'GridType5':
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={6} />
            {/* 3x3 or 4x3 Grid matrix */}
            <line x1={pad + innerW * 0.33} y1={pad} x2={pad + innerW * 0.33} y2={height - pad} strokeDasharray="4,4" opacity={0.7} />
            <line x1={pad + innerW * 0.66} y1={pad} x2={pad + innerW * 0.66} y2={height - pad} strokeDasharray="4,4" opacity={0.7} />
            <line x1={pad} y1={pad + innerH * 0.5} x2={width - pad} y2={pad + innerH * 0.5} strokeDasharray="4,4" opacity={0.7} />
            <circle cx={cx} cy={cy} r={50} strokeDasharray="3,3" opacity={0.5} />
          </g>
        );

      default:
        return (
          <g stroke={lc} strokeWidth={lw} fill="none">
            <rect x={pad} y={pad} width={innerW} height={innerH} rx={4} />
            <line x1={cx} y1={pad} x2={cx} y2={height - pad} />
            <circle cx={cx} cy={cy} r={80} />
          </g>
        );
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
