import React, { useState, useRef } from 'react';
import { DrillDesign, SessionPlanStage } from '../../types';
import { DiagramPreviewBox } from './DiagramPreviewBox';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  X, Printer, Layers, BookOpen, Download, ZoomIn, Maximize2,
  Clock, ChevronDown, ChevronUp,
  FileText, Sparkles, Loader2, Award
} from 'lucide-react';

interface SessionDetailViewModalProps {
  item: DrillDesign | null;
  allDesigns: DrillDesign[];
  onClose: () => void;
  onEdit: (item: DrillDesign) => void;
}

export const SessionDetailViewModal: React.FC<SessionDetailViewModalProps> = ({
  item,
  allDesigns,
  onClose,
  onEdit
}) => {
  const [selectedStageTab, setSelectedStageTab] = useState<string>('all');
  const [expandedStageIds, setExpandedStageIds] = useState<string[]>([]);
  const [previewDrill, setPreviewDrill] = useState<DrillDesign | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessTip, setExportSuccessTip] = useState(false);

  const printContentRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const isPlan = item.category === 'session_plan' || item.contentType === 'session_plan';
  const isDrill = item.category === 'drill_item' || item.contentType === 'drill';

  // Find drills linked in this plan
  const planStages: SessionPlanStage[] = item.sessionStages || [];

  // Calculate total duration if it's a plan
  const totalDuration = item.totalDuration || (
    planStages.reduce((sum, stage) => sum + (stage.duration || 15), 0)
  ) || (item.durationMinutes || 60);

  // Toggle stage accordion
  const toggleStageExpand = (stageId: string) => {
    setExpandedStageIds(prev => 
      prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
    );
  };

  // Expand all / Collapse all
  const expandAllStages = () => {
    setExpandedStageIds(planStages.map(s => s.id));
  };
  const collapseAllStages = () => {
    setExpandedStageIds([]);
  };

  // Standard Print Trigger
  const handlePrint = () => {
    window.print();
  };

  // Export to PDF using html2canvas & jsPDF
  const handleExportPDF = async () => {
    if (!printContentRef.current || isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      const element = printContentRef.current;
      
      // Temporarily expand all stages during capture so full content is rendered
      const prevExpanded = [...expandedStageIds];
      setExpandedStageIds(planStages.map(s => s.id));
      
      // Allow DOM to settle
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for crisp text & diagrams
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
      });

      // Restore accordion state
      setExpandedStageIds(prevExpanded);

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Add subsequent pages if content exceeds 1 page
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const safeTitle = (item.title || '足球教案').replace(/[/\\?%*:|"<>]/g, '_');
      pdf.save(`${safeTitle}_训练教案.pdf`);

      setExportSuccessTip(true);
      setTimeout(() => setExportSuccessTip(false), 3000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Filtered stages for view
  const visibleStages = selectedStageTab === 'all'
    ? planStages
    : planStages.filter(s => s.id === selectedStageTab);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      {/* CSS for print media formatting */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-session-container, #print-session-container * {
            visibility: visible;
          }
          #print-session-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:overflow-visible print:border-none print:shadow-none">
        
        {/* Top Action Header (hidden in print) */}
        <div className="no-print px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-yellow flex items-center justify-center text-black shadow-md font-black">
              {isPlan ? <BookOpen className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{item.title}</h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  {isPlan ? '主题教案' : isDrill ? '训练项' : '战术示意图'}
                </span>
                {item.targetAge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-950/90 text-yellow-400 border border-yellow-800/60">
                    {item.targetAge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                创建时间: {item.createdAt} · 教练: {item.authorName || '青训教练组'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export PDF Button */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              title="导出为标准 PDF 文件"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>导出中...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>导出 PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-gray-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印教案</span>
            </button>

            {/* Edit Button */}
            <button
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="px-3.5 py-1.5 bg-bvb-yellow hover:bg-yellow-400 text-black text-xs font-black rounded-xl shadow-md transition-colors"
            >
              编辑
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Export Success Banner */}
        {exportSuccessTip && (
          <div className="no-print bg-emerald-500 text-black px-4 py-2 text-xs font-black text-center flex items-center justify-center gap-2 animate-in fade-in">
            <Award className="w-4 h-4" />
            <span>教案 PDF 文件已成功生成并下载！</span>
          </div>
        )}

        {/* Modal Body & Printable Document Container */}
        <div
          id="print-session-container"
          ref={printContentRef}
          className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 bg-white print:overflow-visible print:p-4"
        >
          {/* Document Title Header for PDF / Print Output */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-gray-900 text-yellow-400 text-[10px] font-black tracking-wider uppercase">
                    BVB YOUTH TRAINING
                  </span>
                  <span className="text-xs text-gray-500 font-bold">顽石之光足球俱乐部 · 青训标准教案</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">{item.title}</h1>
              </div>

              {/* Meta stats block */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">总训练时长</span>
                  <span className="text-sm font-black text-gray-900 flex items-center justify-end gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {totalDuration} 分钟
                  </span>
                </div>
                {isPlan && (
                  <div className="text-right border-l border-gray-200 pl-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">训练环节</span>
                    <span className="text-sm font-black text-gray-900 flex items-center justify-end gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      {planStages.length} 个阶段
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 flex-wrap">
              <span>教练员: <strong className="text-gray-800">{item.authorName || '青训教练组'}</strong></span>
              <span>·</span>
              <span>适用年龄: <strong className="text-gray-800">{item.targetAge || (item.ageGroups ? item.ageGroups.join('、') + '岁' : '全年龄段')}</strong></span>
              <span>·</span>
              <span>创建日期: <strong className="text-gray-800">{item.createdAt}</strong></span>
              {item.topic && (
                <>
                  <span>·</span>
                  <span>核心主题: <strong className="text-gray-800">{item.topic}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Top Overview: Cover Diagram (if any) & Description */}
          {((item.elements && item.elements.length > 0) || item.previewImage || item.description) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-gray-50 p-4 rounded-2xl border border-gray-200 print:bg-white print:border-gray-300 print:p-3">
              {/* Cover Pitch Diagram */}
              {((item.elements && item.elements.length > 0) || item.previewImage) && (
                <div className="lg:col-span-6 flex flex-col items-center justify-center">
                  <div className="w-full flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>教案战术概览图</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {item.pitchType || 'Midfield'} · {item.pitchTheme || 'Grass'}
                    </span>
                  </div>
                  <div
                    onClick={() => setPreviewDrill(item)}
                    title="点击放大查看大图"
                    className="w-full max-w-[500px] max-h-[320px] bg-white rounded-xl overflow-hidden shadow-inner border border-gray-200 cursor-pointer relative group/cover"
                  >
                    <DiagramPreviewBox
                      diagram={item}
                      pitchType={item.pitchType || 'Midfield'}
                      pitchTheme={item.pitchTheme || 'Grass'}
                      elements={item.elements}
                      lines={item.lines}
                      previewImage={item.previewImage}
                      showGrid={true}
                      className="w-full h-full"
                    />
                    <div className="no-print absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white backdrop-blur-[1px]">
                      <ZoomIn className="w-4 h-4 text-bvb-yellow" />
                      <span className="text-xs font-bold">点击查看战术图大图</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Description & Plan Highlights */}
              <div className={`${((item.elements && item.elements.length > 0) || item.previewImage) ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
                {item.description && (
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-black text-gray-900 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>教案设计思路与训练重难点</span>
                    </h4>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{item.description}</p>
                  </div>
                )}

                {/* Drill Parameters Badges (if single drill) */}
                {isDrill && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                      <span className="text-[10px] text-blue-600 font-bold block">训练主题</span>
                      <span className="text-xs font-black text-gray-900">{item.topic || '综合'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                      <span className="text-[10px] text-emerald-600 font-bold block">训练时长</span>
                      <span className="text-xs font-black text-gray-900">{item.durationMinutes || 15} 分钟</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                      <span className="text-[10px] text-purple-600 font-bold block">人数规模</span>
                      <span className="text-xs font-black text-gray-900">{item.playerCount || 8} 人</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                      <span className="text-[10px] text-amber-600 font-bold block">场地尺寸</span>
                      <span className="text-xs font-black text-gray-900">{item.fieldLength || 20}x{item.fieldWidth || 15} 米</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                      <span className="text-[10px] text-rose-600 font-bold block">足球数量</span>
                      <span className="text-xs font-black text-gray-900">{item.ballCount || 6} 个</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                      <span className="text-[10px] text-teal-600 font-bold block">标志物</span>
                      <span className="text-xs font-black text-gray-900">{item.coneCount || 8} 个</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Single Drill Structured Sections (when viewing a Drill Item) */}
          {isDrill && (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>训练项完整组织方案</span>
              </h3>

              {item.organization && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 print-break-inside-avoid">
                  <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-lg bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>组织方法 (步骤与站位)</span>
                  </h4>
                  <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed pl-6">{item.organization}</p>
                </div>
              )}

              {item.coachingPoints && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 print-break-inside-avoid">
                  <h4 className="text-xs font-black text-emerald-700 flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>指导要点 (技术关键与心理)</span>
                  </h4>
                  <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed pl-6">{item.coachingPoints}</p>
                </div>
              )}

              {item.progressions && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 print-break-inside-avoid">
                  <h4 className="text-xs font-black text-purple-700 flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-lg bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    <span>变化与进阶 (规则与防守调整)</span>
                  </h4>
                  <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed pl-6">{item.progressions}</p>
                </div>
              )}
            </div>
          )}

          {/* Session Plan: Complete Stage-by-Stage Breakdown with full drill contents */}
          {isPlan && (
            <div className="space-y-6 pt-2 border-t border-gray-200">
              {/* Section Header & Stage Navigation Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>教案各训练环节内容详解 ({planStages.length}个环节)</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    包含各环节站位示意图、步骤、组织方法、教练要点与器材规划
                  </p>
                </div>

                {/* Fast actions */}
                <div className="no-print flex items-center gap-2 flex-wrap">
                  <button
                    onClick={expandAllStages}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors"
                  >
                    全部展开
                  </button>
                  <button
                    onClick={collapseAllStages}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors"
                  >
                    全部折叠
                  </button>
                </div>
              </div>

              {/* Stage Filter Tabs (Screen Only) */}
              <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  onClick={() => setSelectedStageTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    selectedStageTab === 'all'
                      ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  全部环节流程 ({planStages.length})
                </button>
                {planStages.map((st, idx) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStageTab(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedStageTab === st.id
                        ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gray-300 text-gray-900 text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span>{st.name}</span>
                  </button>
                ))}
              </div>

              {/* Stages List */}
              <div className="space-y-6">
                {visibleStages.map((stage, idx) => {
                  const stageDrills: DrillDesign[] = stage.drills && stage.drills.length > 0
                    ? stage.drills
                    : allDesigns.filter(d => stage.drillIds?.includes(d.id));

                  const isCollapsed = !expandedStageIds.includes(stage.id) && expandedStageIds.length > 0;

                  return (
                    <div
                      key={stage.id}
                      className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm print-break-inside-avoid print:border-gray-300"
                    >
                      {/* Stage Header */}
                      <div
                        onClick={() => toggleStageExpand(stage.id)}
                        className="px-5 py-3.5 bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 text-white flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-bvb-yellow text-black font-black text-xs flex items-center justify-center shadow-md">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-white">{stage.name}</h4>
                              {stage.focus && (
                                <span className="text-[11px] font-bold text-yellow-400 bg-yellow-950/80 px-2 py-0.5 rounded-full border border-yellow-800/60">
                                  {stage.focus}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              共包含 {stageDrills.length} 个训练项目
                              {stage.coachNotes ? ` · 环节提示: ${stage.coachNotes}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {stage.duration || 15} 分钟
                          </span>
                          <div className="no-print text-gray-400">
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Stage Content */}
                      {!isCollapsed && (
                        <div className="p-5 space-y-6 bg-white">
                          {stageDrills.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
                              <p className="text-xs">该训练环节暂未配置具体训练项</p>
                            </div>
                          ) : (
                            stageDrills.map((drill, dIdx) => (
                              <div
                                key={drill.id || dIdx}
                                className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-4 shadow-sm print:bg-white print:border-gray-300 print-break-inside-avoid"
                              >
                                {/* Drill Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                                      {dIdx + 1}
                                    </span>
                                    <div>
                                      <h5 className="text-sm font-black text-gray-900">{drill.title}</h5>
                                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                        <span className="font-bold text-blue-700">主题: {drill.topic || '综合'}</span>
                                        <span>·</span>
                                        <span>时长: {drill.durationMinutes || 15}分钟</span>
                                        {drill.playerCount && (
                                          <>
                                            <span>·</span>
                                            <span>人数: {drill.playerCount}人</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="no-print">
                                    <button
                                      onClick={() => setPreviewDrill(drill)}
                                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl border border-gray-300 shadow-sm flex items-center gap-1.5 transition-all hover:border-emerald-500"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>查看战术大图与完整要点</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Drill Layout: Pitch Diagram & Parameters */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                  {/* Left: Diagram */}
                                  <div className="lg:col-span-5 flex flex-col items-center justify-center">
                                    <div
                                      onClick={() => setPreviewDrill(drill)}
                                      title="点击放大查看战术示意图"
                                      className="w-full max-w-[420px] bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer relative group/drillpitch"
                                    >
                                      <DiagramPreviewBox
                                        diagram={drill}
                                        pitchType={drill.pitchType || 'Midfield'}
                                        pitchTheme={drill.pitchTheme || 'Grass'}
                                        elements={drill.elements}
                                        lines={drill.lines}
                                        previewImage={drill.previewImage}
                                        showGrid={false}
                                        className="w-full max-h-[260px] aspect-auto"
                                      />
                                      <div className="no-print absolute inset-0 bg-black/40 opacity-0 group-hover/drillpitch:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white backdrop-blur-[1px] rounded-lg">
                                        <ZoomIn className="w-4 h-4 text-bvb-yellow" />
                                        <span className="text-xs font-bold">点击放大示意图</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-1 font-mono">
                                      场地规格: {drill.fieldLength || 20}m × {drill.fieldWidth || 15}m
                                    </span>
                                  </div>

                                  {/* Right: Key Badges & Description */}
                                  <div className="lg:col-span-7 space-y-2.5">
                                    {/* Parameters Matrix */}
                                    <div className="grid grid-cols-4 gap-1.5 text-center">
                                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                                        <span className="text-[9px] text-gray-500 font-bold block">时长</span>
                                        <span className="text-xs font-black text-gray-900">{drill.durationMinutes || 15}分</span>
                                      </div>
                                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                                        <span className="text-[9px] text-gray-500 font-bold block">人数</span>
                                        <span className="text-xs font-black text-gray-900">{drill.playerCount || 8}人</span>
                                      </div>
                                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                                        <span className="text-[9px] text-gray-500 font-bold block">足球</span>
                                        <span className="text-xs font-black text-gray-900">{drill.ballCount || 6}个</span>
                                      </div>
                                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                                        <span className="text-[9px] text-gray-500 font-bold block">标志物</span>
                                        <span className="text-xs font-black text-gray-900">{drill.coneCount || 8}个</span>
                                      </div>
                                    </div>

                                    {/* Description */}
                                    {drill.description && (
                                      <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed">
                                        <strong className="text-gray-900">训练简述: </strong>
                                        {drill.description}
                                      </div>
                                    )}

                                    {/* Equipment notes */}
                                    {drill.equipmentNotes && (
                                      <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs text-amber-900">
                                        <strong>器材需求: </strong>{drill.equipmentNotes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Structured Drill Details (组织方法, 指导要点, 变化进阶) */}
                                <div className="space-y-2.5 pt-2 border-t border-gray-200">
                                  {drill.organization && (
                                    <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                                      <h6 className="text-xs font-black text-blue-700 flex items-center gap-1.5 mb-1.5">
                                        <span className="w-4 h-4 rounded bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">1</span>
                                        <span>组织方法 (步骤与站位)</span>
                                      </h6>
                                      <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed pl-5 font-sans">
                                        {drill.organization}
                                      </p>
                                    </div>
                                  )}

                                  {drill.coachingPoints && (
                                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100">
                                      <h6 className="text-xs font-black text-emerald-700 flex items-center gap-1.5 mb-1.5">
                                        <span className="w-4 h-4 rounded bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">2</span>
                                        <span>指导要点 (技术关键与教学提示)</span>
                                      </h6>
                                      <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed pl-5 font-sans">
                                        {drill.coachingPoints}
                                      </p>
                                    </div>
                                  )}

                                  {drill.progressions && (
                                    <div className="bg-white p-3.5 rounded-xl border border-purple-100">
                                      <h6 className="text-xs font-black text-purple-700 flex items-center gap-1.5 mb-1.5">
                                        <span className="w-4 h-4 rounded bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center">3</span>
                                        <span>变化与进阶 (难度调整与规则升级)</span>
                                      </h6>
                                      <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed pl-5 font-sans">
                                        {drill.progressions}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Document Footer */}
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400 flex items-center justify-between">
            <span>多特蒙德青训体系 · 顽石之光足球俱乐部</span>
            <span>严谨科学 · 快乐足球 · 育人成才</span>
          </div>
        </div>

        {/* Modal Footer (Screen Only) */}
        <div className="no-print px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            提示: 点击战术图可放大查看，点击「导出 PDF」可直接下载高清教案文档
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在生成 PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>导出为 PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-xl transition-colors shadow-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* Full Drill Detail & Large Tactical Diagram Preview Modal */}
      {previewDrill && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 text-gray-100 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-bvb-yellow text-black flex items-center justify-center font-black shadow-md">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{previewDrill.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                      战术示意图与训练项详情
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    主题: {previewDrill.topic || '综合'} · 时长: {previewDrill.durationMinutes || 15}分钟
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewDrill(null)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Two columns layout */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Large Tactical Diagram Preview */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-gray-300 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-bvb-yellow" />
                      <span>战术场地示意图（高清大图）</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-950 px-2 py-0.5 rounded-md border border-gray-800">
                      {previewDrill.pitchType || 'Midfield'} · {previewDrill.pitchTheme || 'Grass'}
                    </span>
                  </div>

                  <div className="w-full flex items-center justify-center bg-gray-950 p-2 rounded-2xl border border-gray-800">
                    <DiagramPreviewBox
                      diagram={previewDrill}
                      pitchType={previewDrill.pitchType}
                      pitchTheme={previewDrill.pitchTheme}
                      elements={previewDrill.elements}
                      lines={previewDrill.lines}
                      previewImage={previewDrill.previewImage}
                      showGrid={true}
                      className="w-full max-w-[520px] max-h-[400px] shadow-lg"
                    />
                  </div>
                </div>

                {/* Right: Meta & Parameters */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Parameter Badges */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-center">
                      <span className="text-[10px] text-blue-400 font-bold block">训练主题</span>
                      <span className="text-xs font-black text-white">{previewDrill.topic || '综合'}</span>
                    </div>
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-center">
                      <span className="text-[10px] text-emerald-400 font-bold block">训练时长</span>
                      <span className="text-xs font-black text-white">{previewDrill.durationMinutes || 15} 分钟</span>
                    </div>
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-center">
                      <span className="text-[10px] text-purple-400 font-bold block">参与人数</span>
                      <span className="text-xs font-black text-white">{previewDrill.playerCount || 8} 人</span>
                    </div>
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-center">
                      <span className="text-[10px] text-amber-400 font-bold block">场地规格</span>
                      <span className="text-xs font-black text-white">{previewDrill.fieldLength || 20}x{previewDrill.fieldWidth || 15} 米</span>
                    </div>
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-center">
                      <span className="text-[10px] text-rose-400 font-bold block">足球数量</span>
                      <span className="text-xs font-black text-white">{previewDrill.ballCount || 6} 个</span>
                    </div>
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-center">
                      <span className="text-[10px] text-teal-400 font-bold block">标志物</span>
                      <span className="text-xs font-black text-white">{previewDrill.coneCount || 8} 个</span>
                    </div>
                  </div>

                  {/* Description */}
                  {previewDrill.description && (
                    <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
                      <h4 className="text-xs font-black text-gray-300 mb-1">训练简述</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{previewDrill.description}</p>
                    </div>
                  )}

                  {/* Equipment notes */}
                  {previewDrill.equipmentNotes && (
                    <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                      <h4 className="text-xs font-black text-gray-300 mb-1">器材备注</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{previewDrill.equipmentNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Drill Structured Sections (组织方法, 指导要点, 变化进阶) */}
              <div className="space-y-3 pt-2 border-t border-gray-800">
                {previewDrill.organization && (
                  <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800">
                    <h4 className="text-xs font-black text-blue-400 flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 rounded-lg bg-blue-900/80 text-blue-200 text-[10px] flex items-center justify-center font-bold">1</span>
                      <span>组织方法 (步骤与站位)</span>
                    </h4>
                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed pl-6">{previewDrill.organization}</p>
                  </div>
                )}

                {previewDrill.coachingPoints && (
                  <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800">
                    <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 rounded-lg bg-emerald-900/80 text-emerald-200 text-[10px] flex items-center justify-center font-bold">2</span>
                      <span>指导要点 (技术关键与心理)</span>
                    </h4>
                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed pl-6">{previewDrill.coachingPoints}</p>
                  </div>
                )}

                {previewDrill.progressions && (
                  <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800">
                    <h4 className="text-xs font-black text-purple-400 flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 rounded-lg bg-purple-900/80 text-purple-200 text-[10px] flex items-center justify-center font-bold">3</span>
                      <span>变化与进阶 (规则与防守调整)</span>
                    </h4>
                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed pl-6">{previewDrill.progressions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-gray-800 bg-gray-950 flex items-center justify-end">
              <button
                onClick={() => setPreviewDrill(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl transition-colors"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

