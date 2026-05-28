import React, { useState, useMemo, useRef } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, Search, Grid, Printer, 
  AlertTriangle, FileText, Sparkles, Sliders, PlayCircle, HelpCircle, 
  ArrowRight, ArrowLeft, Upload, File, ChevronRight, X, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PhilosophyDocument, User } from '../types';
import { 
  BasicTechItem,
  ScenarioTheme,
  MatchPrinciple
} from '../src/philosophyData';

// 2. Pre-defined match problems for dynamically matching elements
const PREDEFINED_GAMES_PROBLEMS = [
  { problem: '后场球员无接应、被压迫后大脚处理。', BCode: 'JG1', YKCode: 'YK2', stage: '进攻' },
  { problem: '接球后才看，被抢断或无目的回传。', BCode: 'JG2', YKCode: 'YK10', stage: '进攻' },
  { problem: '持球人孤立无援，被迫带死被断或丢球。', BCode: 'JG3', YKCode: 'YK13', stage: '进攻' },
  { problem: '进攻站位拥挤，堆叠一侧，弱侧完全漏空。', BCode: 'JG4', YKCode: 'WQ6', stage: '进攻' },
  { problem: '斜向向前传球容易被断，横传传球过多。', BCode: 'JG6', YKCode: 'CJ1', stage: '进攻' },
  { problem: '站着等球看戏，传传球缺乏跑动衔接。', BCode: 'JG7', YKCode: 'CJ2', stage: '进攻' },
  { problem: '1v1突破遭遇协防时停死，不会变向与妙传。', BCode: 'JG11', YKCode: 'YK4', stage: '进攻' },
  { problem: '丢球后抱怨裁判/队友，眼睁睁看球或停顿。', BCode: 'GZS1', YKCode: 'FS2', stage: '攻转守' },
  { problem: '防守一扑就被过，被对手一脚传球轻松打穿。', BCode: 'FS1', YKCode: 'FS2', stage: '防守' },
  { problem: '抢到球后不知道推进，盲目回大脚。', BCode: 'SZG1', YKCode: 'YK3', stage: '守转攻' },
];

interface PhilosophyLibraryProps {
  currentUser: User | null;
  customDocs: PhilosophyDocument[];
  onAddDoc: (doc: PhilosophyDocument) => void;
  onUpdateDoc: (doc: PhilosophyDocument) => void;
  onDeleteDoc: (id: string) => void;
  appLogo?: string;
  matchPrinciples: MatchPrinciple[];
  onUpdatePrinciples: (principles: MatchPrinciple[]) => void;
  basicTechThemes: BasicTechItem[];
  onUpdateBasicTechThemes: (techs: BasicTechItem[]) => void;
  scenarioThemes: ScenarioTheme[];
  onUpdateScenarioThemes: (scenarios: ScenarioTheme[]) => void;
  philosophyOverview: any;
  onUpdatePhilosophyOverview: (overview: any) => void;
}

const PhilosophyLibrary: React.FC<PhilosophyLibraryProps> = ({
  currentUser,
  customDocs,
  onAddDoc,
  onUpdateDoc,
  onDeleteDoc,
  appLogo,
  matchPrinciples,
  onUpdatePrinciples,
  basicTechThemes,
  onUpdateBasicTechThemes,
  scenarioThemes,
  onUpdateScenarioThemes,
  philosophyOverview,
  onUpdatePhilosophyOverview
}) => {
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'principles' | 'scenarios' | 'technical' | 'generator' | 'uploads'>('overview');
  
  // Search & Filter States
  const [generalSearch, setGeneralSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedTechCategory, setSelectedTechCategory] = useState<string>('all');
  
  // Selected Detail Modal
  const [selectedTechItem, setSelectedTechItem] = useState<BasicTechItem | null>(null);
  const [selectedScenarioItem, setSelectedScenarioItem] = useState<ScenarioTheme | null>(null);

  // Upload/Add Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState('指南与理论');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; url: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Lesson Plan Generator States
  const [genStep, setGenStep] = useState(1);
  const [selectedProblem, setSelectedProblem] = useState<string>('');
  const [customProblemText, setCustomProblemText] = useState<string>('');
  const [selectedAgeLevel, setSelectedAgeLevel] = useState<'U8' | 'U9-U10' | 'U11-U12'>('U9-U10');
  const [trainerName, setTrainerName] = useState(currentUser?.name || '');
  const [generationDate, setGenerationDate] = useState(new Date().toISOString().split('T')[0]);
  const [customDrills, setCustomDrills] = useState<string>('');

  // 1. Drag and drop simulating files upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permissions Check (青训总监)
  const isDirector = currentUser?.role === 'director';

  // Excel Import/Export States
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importType, setImportType] = useState<'scenarios' | 'technical' | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMergeMode, setImportMergeMode] = useState<'merge' | 'replace'>('merge');

  const handleExportExcel = (type: 'scenarios' | 'technical') => {
    try {
      if (type === 'scenarios') {
        const dataToExport = scenarioThemes.map(sc => ({
          '大纲编码': sc.code,
          '阶段': sc.stage,
          '比赛时机/战术环节': sc.moment,
          '场景主题': sc.theme,
          'U8阶段关系': sc.u8,
          'U9-U10阶段关系': sc.u9_u10,
          'U11-U12阶段关系': sc.u11_u12,
          '对应比赛原则': sc.principle,
          '核心解决目标': sc.objective,
          '典型比赛问题': sc.problem,
          '教练提示词': sc.cue,
          '典型错误行为': sc.typicalError,
          '实践课训练形式': sc.trainingFormat,
          '技术搭配匹配': sc.technicalMatch,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '比赛场景主题库');
        
        // Auto column sizing
        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
          wch: Math.max(10, ...dataToExport.map(row => {
            const val = (row as any)[key]?.toString() || '';
            let len = 0;
            for (let i = 0; i < val.length; i++) {
              len += val.charCodeAt(i) > 127 ? 2 : 1;
            }
            return len;
          }))
        }));
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `顽石之光_比赛场景主题库_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        const dataToExport = basicTechThemes.map(tech => ({
          '技术卡编号': tech.code,
          '技术分类': tech.focus,
          '技术主题': tech.theme,
          'U8要求': tech.u8,
          'U9-U10要求': tech.u9_u10,
          'U11-U12要求': tech.u11_u12,
          '核心培养目标': tech.objective,
          '教学关键点': tech.teachingPoints,
          '典型细节问题': tech.problem,
          '适用战术场景': tech.scenario,
          '教练观察提示词': tech.coachCue,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '基础技术主题库');
        
        // Auto column sizing
        const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
          wch: Math.max(10, ...dataToExport.map(row => {
            const val = (row as any)[key]?.toString() || '';
            let len = 0;
            for (let i = 0; i < val.length; i++) {
              len += val.charCodeAt(i) > 127 ? 2 : 1;
            }
            return len;
          }))
        }));
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `顽石之光_基础技术主题库_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
    } catch (error) {
      console.error('Error exporting excel:', error);
      alert('导出Excel失败，错误：' + (error instanceof Error ? error.message : error));
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'scenarios' | 'technical') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
        
        if (rawJson.length === 0) {
          alert('Excel文件解析成功，但内容为空！');
          return;
        }

        const findVal = (row: Record<string, any>, keywords: string[]) => {
          for (const key of Object.keys(row)) {
            const lowerKey = key.toLowerCase();
            if (keywords.some(kw => lowerKey === kw || lowerKey.includes(kw))) {
              return row[key]?.toString() || '';
            }
          }
          return '';
        };

        const parsedRows = rawJson.map((row, idx) => {
          if (type === 'scenarios') {
            const codeVal = findVal(row, ['编码', '编号', 'code', '大纲']).trim();
            const stageVal = findVal(row, ['阶段', 'stage']).trim();
            const momentVal = findVal(row, ['时机', 'moment', '环节']).trim();
            const themeVal = findVal(row, ['主题', 'theme', '场景']).trim();
            const u8Val = findVal(row, ['u8']).trim() || '引入';
            const u10Val = findVal(row, ['u9', 'u10', 'u9-u10', 'u9_u10']).trim() || '重点';
            const u12Val = findVal(row, ['u11', 'u12', 'u11-u12', 'u11_u12']).trim() || '掌握';
            const principleVal = findVal(row, ['原则', 'principle']).trim();
            const objectiveVal = findVal(row, ['解决目标', '目标', 'objective']).trim();
            const problemVal = findVal(row, ['问题', 'problem']).trim();
            const cueVal = findVal(row, ['提示词', 'cue']).trim();
            const typicalErrorVal = findVal(row, ['错误', 'typicalerror', 'error', '失误']).trim();
            const trainingFormatVal = findVal(row, ['形式', 'format', '结构', '组织']).trim();
            const technicalMatchVal = findVal(row, ['技术', '搭配', '匹配', 'technicalmatch', 'match']).trim();

            return {
              code: codeVal || `JG_GEN_${idx + 1}`,
              stage: ['进攻', '攻转守', '防守', '守转攻'].includes(stageVal) ? stageVal : '进攻',
              moment: momentVal || '组织/阵地进攻',
              theme: themeVal || `导入场景主题 ${idx + 1}`,
              u8: u8Val,
              u9_u10: u10Val,
              u11_u12: u12Val,
              principle: principleVal,
              objective: objectiveVal,
              problem: problemVal,
              cue: cueVal,
              typicalError: typicalErrorVal,
              trainingFormat: trainingFormatVal,
              technicalMatch: technicalMatchVal,
            } as ScenarioTheme;
          } else {
            const codeVal = findVal(row, ['编号', 'code', '卡编号']).trim();
            const focusVal = findVal(row, ['分类', '大类型', '技术大项', 'focus']).trim();
            const themeVal = findVal(row, ['主题', 'theme']).trim();
            const u8Val = findVal(row, ['u8']).trim() || '引入';
            const u10Val = findVal(row, ['u9', 'u10', 'u9-u10', 'u9_u10']).trim() || '重点';
            const u12Val = findVal(row, ['u11', 'u12', 'u11-u12', 'u11_u12']).trim() || '掌握';
            const objectiveVal = findVal(row, ['目标', 'objective', '培养目标']).trim();
            const pointsVal = findVal(row, ['关键点', '教学点', 'teachingpoints', '要领']).trim();
            const problemVal = findVal(row, ['问题', 'problem', '缺陷']).trim();
            const scenarioVal = findVal(row, ['场景', '适用场景', '搭配']).trim();
            const coachCueVal = findVal(row, ['提示词', 'coachcue', 'cue']).trim();

            return {
              code: codeVal || `YK_GEN_${idx + 1}`,
              focus: focusVal || '运控球',
              theme: themeVal || `导入技术主题 ${idx + 1}`,
              u8: u8Val,
              u9_u10: u10Val,
              u11_u12: u12Val,
              objective: objectiveVal,
              teachingPoints: pointsVal,
              problem: problemVal,
              scenario: scenarioVal,
              coachCue: coachCueVal,
            } as BasicTechItem;
          }
        });

        setImportPreviewData(parsedRows);
        setImportType(type);
        setImportMergeMode('merge');
        setShowImportModal(true);
      } catch (err) {
        console.error('Error reading excel file:', err);
        alert('读取Excel文件失败，请确保格式正确且包含至少一个主表页。');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleApplyImport = () => {
    if (!importType || importPreviewData.length === 0) return;
    
    if (importType === 'scenarios') {
      if (importMergeMode === 'replace') {
        onUpdateScenarioThemes(importPreviewData);
        alert(`成功完全替换导入了 ${importPreviewData.length} 个场景主题！`);
      } else {
        const updated = [...scenarioThemes];
        importPreviewData.forEach(item => {
          const idx = updated.findIndex(u => u.code === item.code);
          if (idx > -1) {
            updated[idx] = item;
          } else {
            updated.push(item);
          }
        });
        onUpdateScenarioThemes(updated);
        alert(`追加/更新导入了 ${importPreviewData.length} 个场景主题！`);
      }
    } else {
      if (importMergeMode === 'replace') {
        onUpdateBasicTechThemes(importPreviewData);
        alert(`成功完全替换导入了 ${importPreviewData.length} 个基础技术主题！`);
      } else {
        const updated = [...basicTechThemes];
        importPreviewData.forEach(item => {
          const idx = updated.findIndex(u => u.code === item.code);
          if (idx > -1) {
            updated[idx] = item;
          } else {
            updated.push(item);
          }
        });
        onUpdateBasicTechThemes(updated);
        alert(`追加/更新导入了 ${importPreviewData.length} 个基础技术主题！`);
      }
    }
    
    setShowImportModal(false);
    setImportPreviewData([]);
    setImportType(null);
  };

  // CRUD for Philosophy Overview
  const [editingOverviewSection, setEditingOverviewSection] = useState<any | null>(null);
  const [editingOverviewSectionIndex, setEditingOverviewSectionIndex] = useState<number | null>(null);
  const [isOverviewSectionAdd, setIsOverviewSectionAdd] = useState(false);
  const [isEditingTitleSlogan, setIsEditingTitleSlogan] = useState(false);
  const [overviewTitle, setOverviewTitle] = useState(philosophyOverview?.title || '');
  const [overviewSlogan, setOverviewSlogan] = useState(philosophyOverview?.slogan || '');

  // CRUD for Match Principles
  const [editingPrinciple, setEditingPrinciple] = useState<any | null>(null);
  const [isPrincipleAdd, setIsPrincipleAdd] = useState(false);

  // CRUD for Scenario Themes
  const [editingScenario, setEditingScenario] = useState<any | null>(null);
  const [isScenarioAdd, setIsScenarioAdd] = useState(false);

  // CRUD for Basic Tech Themes
  const [editingBasicTech, setEditingBasicTech] = useState<any | null>(null);
  const [isBasicTechAdd, setIsBasicTechAdd] = useState(false);

  // General state hook updater for Title/Slogan when component loads/philosophyOverview changes
  React.useEffect(() => {
    if (philosophyOverview) {
      setOverviewTitle(philosophyOverview.title || '');
      setOverviewSlogan(philosophyOverview.slogan || '');
    }
  }, [philosophyOverview]);

  // Overview CRUD helpers
  const handleDeleteOverviewSection = (idx: number) => {
    if (confirm('确定要删除这个模型阶段吗？')) {
      const nextSections = (philosophyOverview.sections || []).filter((_: any, i: number) => i !== idx);
      onUpdatePhilosophyOverview({ ...philosophyOverview, sections: nextSections });
    }
  };

  const handleSaveOverviewSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOverviewSection) return;
    const nextSections = [...(philosophyOverview.sections || [])];
    if (isOverviewSectionAdd) {
      nextSections.push(editingOverviewSection);
    } else if (editingOverviewSectionIndex !== null) {
      nextSections[editingOverviewSectionIndex] = editingOverviewSection;
    }
    onUpdatePhilosophyOverview({ ...philosophyOverview, sections: nextSections });
    setEditingOverviewSection(null);
    setEditingOverviewSectionIndex(null);
  };

  const handleSaveTitleSlogan = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePhilosophyOverview({ ...philosophyOverview, title: overviewTitle, slogan: overviewSlogan });
    setIsEditingTitleSlogan(false);
  };

  // Principle CRUD helpers
  const handleDeletePrinciple = (code: string) => {
    if (confirm(`确定要删除比赛原则 [${code}] 吗？`)) {
      onUpdatePrinciples(matchPrinciples.filter(p => p.code !== code));
    }
  };

  const handleSavePrinciple = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinciple) return;
    if (isPrincipleAdd) {
      // Check for duplicates
      if (matchPrinciples.some(p => p.code === editingPrinciple.code)) {
        alert('该编号已存在，请使用唯一编号！');
        return;
      }
      onUpdatePrinciples([...matchPrinciples, editingPrinciple]);
    } else {
      onUpdatePrinciples(matchPrinciples.map(p => p.code === editingPrinciple.code ? editingPrinciple : p));
    }
    setEditingPrinciple(null);
  };

  // Scenario CRUD helpers
  const handleDeleteScenario = (code: string) => {
    if (confirm(`确定要删除场景主题 [${code}] 吗？`)) {
      onUpdateScenarioThemes(scenarioThemes.filter(s => s.code !== code));
    }
  };

  const handleSaveScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScenario) return;
    if (isScenarioAdd) {
      if (scenarioThemes.some(s => s.code === editingScenario.code)) {
        alert('该大纲编号已存在，请使用唯一编号！');
        return;
      }
      onUpdateScenarioThemes([...scenarioThemes, editingScenario]);
    } else {
      onUpdateScenarioThemes(scenarioThemes.map(s => s.code === editingScenario.code ? editingScenario : s));
    }
    setEditingScenario(null);
  };

  // Basic Tech CRUD helpers
  const handleDeleteBasicTech = (code: string) => {
    if (confirm(`确定要删除基础技术主题 [${code}] 吗？`)) {
      onUpdateBasicTechThemes(basicTechThemes.filter(t => t.code !== code));
    }
  };

  const handleSaveBasicTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBasicTech) return;
    if (isBasicTechAdd) {
      if (basicTechThemes.some(t => t.code === editingBasicTech.code)) {
        alert('该技术卡编号已存在，请使用唯一编号！');
        return;
      }
      onUpdateBasicTechThemes([...basicTechThemes, editingBasicTech]);
    } else {
      onUpdateBasicTechThemes(basicTechThemes.map(t => t.code === editingBasicTech.code ? editingBasicTech : t));
    }
    setEditingBasicTech(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (files: FileList) => {
    const fileListArray = Array.from(files);
    fileListArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: file.type || 'application/pdf',
          url: reader.result as string // Save Base64 representing file data URL
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Upload/Article form
  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      alert('请填写标题与正文。');
      return;
    }

    if (editingDocId) {
      // Edit mode
      const updated: PhilosophyDocument = {
        id: editingDocId,
        category: formCategory,
        title: formTitle,
        content: formContent,
        attachments: uploadedFiles,
        updatedAt: new Date().toISOString().split('T')[0],
        isBuiltIn: false
      };
      onUpdateDoc(updated);
      setEditingDocId(null);
    } else {
      // Create mode
      const newItem: PhilosophyDocument = {
        id: 'doc_' + Date.now().toString(),
        category: formCategory,
        title: formTitle,
        content: formContent,
        attachments: uploadedFiles,
        updatedAt: new Date().toISOString().split('T')[0],
        isBuiltIn: false
      };
      onAddDoc(newItem);
    }

    // Reset clean
    setFormTitle('');
    setFormContent('');
    setUploadedFiles([]);
    setShowAddForm(false);
  };

  const handleEditDoc = (doc: PhilosophyDocument) => {
    setEditingDocId(doc.id);
    setFormCategory(doc.category);
    setFormTitle(doc.title);
    setFormContent(doc.content);
    setUploadedFiles(doc.attachments || []);
    setShowAddForm(true);
  };

  const handleDeleteCustomDoc = (id: string) => {
    if (confirm('确认要删除这条自定义体系内容吗？')) {
      onDeleteDoc(id);
    }
  };

  // Dynamic Generator Helper Matching
  const getMatchedLessionPlan = useMemo(() => {
    let problemStr = selectedProblem;
    if (problemStr === 'custom') {
      problemStr = customProblemText || '自定义比赛场景问题训练';
    }

    const matchedInfo = PREDEFINED_GAMES_PROBLEMS.find(p => p.problem === selectedProblem);
    
    let scenario: ScenarioTheme | undefined;
    let basicTech: BasicTechItem | undefined;

    if (matchedInfo) {
      scenario = scenarioThemes.find(s => s.code === matchedInfo.BCode);
      basicTech = basicTechThemes.find(t => t.code === matchedInfo.YKCode);
    } else {
      // Default fallback
      scenario = scenarioThemes[0];
      basicTech = basicTechThemes[1];
    }

    // Age mastery
    let requirement = '引入阶段，以体验、敢做为主。允许合理失误。';
    if (selectedAgeLevel === 'U9-U10') {
      requirement = '小场比赛中主动掌握。接球前有一到两次观察。';
    } else if (selectedAgeLevel === 'U11-U12') {
      requirement = '在对抗高压中深化和稳定应用。能根据防守站位二次调整。';
    }

    return {
      problem: problemStr,
      stage: matchedInfo ? matchedInfo.stage : '综合训练',
      scenario,
      basicTech,
      requirement
    };
  }, [selectedProblem, customProblemText, selectedAgeLevel, scenarioThemes, basicTechThemes]);

  // Clean filters and values
  const handlePrint = () => {
    window.print();
  };

  // Searching match principles
  const filteredPrinciples = useMemo(() => {
    return matchPrinciples.filter(p => {
      const matchSearch = p.name.includes(generalSearch) || p.description.includes(generalSearch) || p.code.includes(generalSearch);
      const matchStage = selectedStage === 'all' || p.stage === selectedStage;
      return matchSearch && matchStage;
    });
  }, [generalSearch, selectedStage, matchPrinciples]);

  // Extract unique tech training focus categories
  const techCategories = useMemo(() => {
    const list = basicTechThemes.map(t => t.focus);
    return Array.from(new Set(list)).filter(Boolean);
  }, [basicTechThemes]);

  // Searching basic tech library
  const filteredBasicTech = useMemo(() => {
    return basicTechThemes.filter(t => {
      const matchSearch = t.theme.includes(generalSearch) || t.objective.includes(generalSearch) || t.code.includes(generalSearch) || t.focus.includes(generalSearch);
      const matchAge = selectedAgeGroup === 'all' || 
                       (selectedAgeGroup === 'u8' && t.u8.includes('重点')) ||
                       (selectedAgeGroup === 'u10' && t.u9_u10.includes('重点')) ||
                       (selectedAgeGroup === 'u12' && t.u11_u12.includes('重点'));
      const matchCategory = selectedTechCategory === 'all' || t.focus === selectedTechCategory;
      return matchSearch && matchAge && matchCategory;
    });
  }, [generalSearch, selectedAgeGroup, selectedTechCategory, basicTechThemes]);

  // Searching scenario-based library
  const filteredScenarios = useMemo(() => {
    return scenarioThemes.filter(s => {
      const matchSearch = s.theme.includes(generalSearch) || s.objective.includes(generalSearch) || s.code.includes(generalSearch) || s.moment.includes(generalSearch);
      const matchStage = selectedStage === 'all' || s.stage === selectedStage;
      const matchAge = selectedAgeGroup === 'all' ||
                       (selectedAgeGroup === 'u8' && s.u8.includes('重点')) ||
                       (selectedAgeGroup === 'u10' && s.u9_u10.includes('重点')) ||
                       (selectedAgeGroup === 'u12' && s.u11_u12.includes('重点'));
      return matchSearch && matchStage && matchAge;
    });
  }, [generalSearch, selectedStage, selectedAgeGroup, scenarioThemes]);

  return (
    <div className="space-y-6">
      {/* Header and Brand */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-bvb-yellow text-bvb-black font-semibold text-xs py-1 px-2.5 rounded-full uppercase tracking-wider">STONE'S LIGHT PHILOSOPHY</span>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-bvb-yellow" />
            青训哲学体系库
          </h2>
          <p className="text-sm font-medium text-gray-500 mt-1 max-w-4xl">
            此版块为 <strong className="text-gray-900">“顽石之光”</strong> 俱乐部12岁以下专属比赛模型总纲与青训技术指导库。
            教练员可在此查阅多维度比赛原则、训练形式要求并一键生成高水平教案。
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              setGenStep(1);
              setActiveSubTab('generator');
            }}
            className="flex items-center px-4 py-2.5 bg-bvb-yellow text-bvb-black font-extrabold text-xs tracking-tight rounded-xl hover:bg-yellow-400 transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            教案一键生成
          </button>
          
          <button
            onClick={() => {
              setEditingDocId(null);
              setFormTitle('');
              setFormContent('');
              setUploadedFiles([]);
              setShowAddForm(true);
              setActiveSubTab('uploads');
            }}
            className="flex items-center px-4 py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-gray-800 transition-all shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            上传更新体系内容
          </button>
        </div>
      </div>

      {/* Primary navigation menus */}
      <div className="flex flex-wrap border-b border-gray-200 bg-white p-1 rounded-xl shadow-sm gap-1">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'overview' ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Grid className="w-4 h-4 mr-1.5" />
          比赛模型总纲
        </button>
        
        <button
          onClick={() => setActiveSubTab('principles')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'principles' ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sliders className="w-4 h-4 mr-1.5" />
          比赛原则
        </button>

        <button
          onClick={() => setActiveSubTab('scenarios')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'scenarios' ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4 mr-1.5" />
          比赛场景主题库
        </button>

        <button
          onClick={() => setActiveSubTab('technical')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'technical' ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <PlayCircle className="w-4 h-4 mr-1.5" />
          基础技术主题库
        </button>

        <button
          onClick={() => setActiveSubTab('generator')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'generator' ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          教案一键生成器
        </button>

        <button
          onClick={() => setActiveSubTab('uploads')}
          className={`flex items-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'uploads' ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4 mr-1.5" />
          体系上传与持续更新 ({customDocs.length})
        </button>
      </div>

      {/* Tab Contents: Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-bvb-black to-gray-800 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4 max-w-4xl z-10">
              <h3 className="text-2xl md:text-3xl font-black text-bvb-yellow tracking-tight">{philosophyOverview?.title || '比赛模型总纲'}</h3>
              <p className="text-sm font-semibold tracking-wide border-l-4 border-bvb-yellow pl-4 italic text-gray-200">
                &ldquo;{philosophyOverview?.slogan || '科学体系，高效育才'}&rdquo;
              </p>
              <p className="text-xs text-gray-400 font-medium">
                训练应当以动作质量与比赛场景相结合，U12以下多以启蒙体验为主，在快乐游戏、条件限制对抗中完成体系导入。
              </p>
            </div>
            {isDirector && (
              <button
                type="button"
                onClick={() => {
                  setOverviewTitle(philosophyOverview?.title || '');
                  setOverviewSlogan(philosophyOverview?.slogan || '');
                  setIsEditingTitleSlogan(true);
                }}
                className="absolute top-4 right-4 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-extrabold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow transition-all active:scale-95 z-20"
              >
                <Edit3 className="w-3.5 h-3.5" />
                修改大纲全局语
              </button>
            )}
            {appLogo && (
              <img src={appLogo} alt="Club Logo" className="w-24 h-24 object-contain brightness-95 opacity-80" />
            )}
            <div className="absolute right-0 bottom-0 top-0 translate-x-1/4 translate-y-1/4 scale-150 rounded-full bg-yellow-500/5 filter blur-2xl pointer-events-none"></div>
          </div>

          {isDirector && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => {
                  setEditingOverviewSection({
                    stage: '',
                    focus: '',
                    professional: '',
                    childExpression: '',
                    drills: '',
                    avoid: ''
                  });
                  setEditingOverviewSectionIndex(null);
                  setIsOverviewSectionAdd(true);
                }}
                className="bg-bvb-black hover:bg-gray-800 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 text-bvb-yellow" />
                新增模型阶段
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(philosophyOverview?.sections || []).map((sec: any, idx: number) => (
              <div 
                key={idx} 
                className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm hover:border-bvb-yellow flex flex-col justify-between transition-all group duration-300 relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                    <span className="font-sans font-black text-lg text-gray-900 group-hover:text-amber-600 transition-colors">
                      {sec.stage || '未指定阶段'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 font-mono text-[10px] px-2.5 py-1 rounded-full font-bold">
                        {sec.focus || '未定年龄侧重点'}
                      </span>
                      {isDirector && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOverviewSection({ ...sec });
                              setEditingOverviewSectionIndex(idx);
                              setIsOverviewSectionAdd(false);
                            }}
                            className="p-1 text-gray-400 hover:text-amber-600 rounded transition-colors"
                            title="修改阶段大纲"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOverviewSection(idx)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                            title="删除阶段"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">专业理念表达</p>
                      <p className="text-sm text-gray-800 font-bold leading-relaxed">{sec.professional || '尚无描述'}</p>
                    </div>
 
                    <div className="bg-yellow-50/60 rounded-xl p-3.5 border border-yellow-100/50">
                      <p className="text-[10px] text-amber-800 uppercase tracking-wider font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-bvb-yellow" />
                        U12儿童化顺口表达 / 沟通信号
                      </p>
                      <p className="text-xs text-amber-950 font-black mt-1 leading-relaxed">{sec.childExpression || '尚无描述'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">推荐训练结构步骤</p>
                      <p className="text-xs text-gray-700 font-semibold mt-0.5">{sec.drills || '尚无描述'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-gray-100 bg-red-50/40 p-3 rounded-lg border-l-4 border-red-500">
                  <p className="text-[10px] text-red-700 font-black uppercase tracking-wider">不建议与禁忌走向</p>
                  <p className="text-xs text-red-800 font-bold mt-1">{sec.avoid || '无禁忌要求'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Contents: Principles */}
      {activeSubTab === 'principles' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters controls */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-500 block mb-1">功能阶段筛选</span>
              <div className="flex flex-wrap bg-gray-100 p-0.5 rounded-lg border border-gray-200 gap-0.5">
                {['all', '进攻', '攻转守', '防守', '守转攻'].map(st => (
                  <button
                    key={st}
                    onClick={() => setSelectedStage(st)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      selectedStage === st ? 'bg-white text-gray-900 shadow-sm font-extrabold' : 'text-gray-500 hover:text-gray-950'
                    }`}
                  >
                    {st === 'all' ? '全部阶段' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <span className="text-xs font-bold text-gray-500 block mb-1">关键字查找原则</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="检索原则名称、内容编码..."
                  value={generalSearch}
                  onChange={e => setGeneralSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-bvb-yellow font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <span className="bg-amber-100 text-amber-700 w-8 h-8 flex items-center justify-center rounded-xl text-sm font-mono font-bold">P</span>
                比赛原则
              </h4>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-500 font-bold">共 {filteredPrinciples.length} 项</span>
                {isDirector && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPrinciple({
                        code: `P${matchPrinciples.length + 1 < 10 ? '0' : ''}${matchPrinciples.length + 1}`,
                        stage: '进攻',
                        name: '',
                        description: ''
                      });
                      setIsPrincipleAdd(true);
                    }}
                    className="bg-bvb-black hover:bg-gray-800 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-bvb-yellow" />
                    新增比赛原则
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrinciples.map((pri) => (
                <div 
                  key={pri.code}
                  className="p-5 bg-gradient-to-br from-white to-gray-50/50 border border-gray-150 border-l-4 border-l-bvb-yellow rounded-xl transition-all hover:shadow-md hover:border-gray-250 relative group"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {pri.code}
                      </span>
                      {isDirector && (
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity ml-2 gap-0.5 bg-white border border-gray-100 rounded px-1 flex-row">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPrinciple({ ...pri });
                              setIsPrincipleAdd(false);
                            }}
                            className="p-1 text-gray-400 hover:text-amber-600 rounded transition"
                            title="修改"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrinciple(pri.code)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition"
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-gray-500 bg-gray-150 px-2 py-0.5 rounded-full">
                      {pri.stage}
                    </span>
                  </div>
                  <h5 className="font-sans font-black text-sm text-gray-900 leading-snug group-hover:text-amber-600 transition-colors">{pri.name}</h5>
                  <p className="text-xs text-gray-650 mt-3 font-semibold leading-relaxed">{pri.description}</p>
                </div>
              ))}
            </div>

            {filteredPrinciples.length === 0 && (
              <div className="text-center py-16">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-bold">没有搜到符合分类的比赛原则</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: Scenarios */}
      {activeSubTab === 'scenarios' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters controls */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">功能阶段筛选</span>
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 gap-0.5">
                  {['all', '进攻', '攻转守', '防守', '守转攻'].map(st => (
                    <button
                      key={st}
                      onClick={() => setSelectedStage(st)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        selectedStage === st ? 'bg-white text-gray-900 shadow-sm font-extrabold' : 'text-gray-500 hover:text-gray-950'
                      }`}
                    >
                      {st === 'all' ? '全部阶段' : st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">年龄段关系</span>
                <select
                  value={selectedAgeGroup}
                  onChange={e => setSelectedAgeGroup(e.target.value)}
                  className="bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold px-3 py-2 focus:outline-none focus:border-bvb-yellow"
                >
                  <option value="all">不限年龄 (全部主题)</option>
                  <option value="u8">U8 重点主题</option>
                  <option value="u10">U9-U10 重点主题</option>
                  <option value="u12">U11-U12 重点主题</option>
                </select>
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <span className="text-xs font-bold text-gray-500 block mb-1">快速查找场景主体</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="检索场景、核心解决目标..."
                  value={generalSearch}
                  onChange={e => setGeneralSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-bvb-yellow font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 flex items-center justify-center rounded-xl text-sm font-mono font-bold">B</span>
                比赛场景主题库
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-gray-500 font-bold mr-1">共 {filteredScenarios.length} 项</span>
                
                <button
                  type="button"
                  onClick={() => handleExportExcel('scenarios')}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-extrabold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                  导出 Excel
                </button>
                
                {isDirector && (
                  <label className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-extrabold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer transition-all active:scale-95">
                    <Upload className="w-3.5 h-3.5 text-gray-400" />
                    导入 Excel
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => handleImportFileSelect(e, 'scenarios')}
                    />
                  </label>
                )}

                {isDirector && (
                  <button
                    type="button"
                    onClick={() => {
                      const defaultStage = '进攻';
                      const prefix = 'JG';
                      const sameStageThemes = scenarioThemes.filter(s => s.stage === defaultStage);
                      let maxNum = 0;
                      sameStageThemes.forEach(s => {
                        const numPart = s.code.replace(prefix, '');
                        const num = parseInt(numPart, 10);
                        if (!isNaN(num) && num > maxNum) {
                          maxNum = num;
                        }
                      });
                      setEditingScenario({
                        code: `${prefix}${maxNum + 1}`,
                        stage: defaultStage,
                        moment: '组织进攻 / 阵地战',
                        theme: '',
                        u8: '引入',
                        u9_u10: '重点',
                        u11_u12: '掌握',
                        principle: '',
                        objective: '',
                        problem: '',
                        cue: '',
                        typicalError: '',
                        trainingFormat: '3v3 + 2 守门员双锋条件对抗',
                        technicalMatch: ''
                      });
                      setIsScenarioAdd(true);
                    }}
                    className="bg-bvb-black hover:bg-gray-800 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-bvb-yellow" />
                    新增场景主题
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScenarios.map((sc) => (
                <div 
                  key={sc.code}
                  onClick={() => setSelectedScenarioItem(sc)}
                  className="p-5 border border-gray-150 rounded-xl hover:border-bvb-yellow transition-all hover:bg-yellow-50/20 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5 mb-3">
                      <div className="flex items-center">
                        <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mr-2">
                          {sc.code}
                        </span>
                        <span className="text-xs font-black text-gray-400 mr-2">
                          {sc.stage} &middot; {sc.moment}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-bvb-black group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h5 className="font-sans font-black text-sm text-gray-900 leading-snug group-hover:text-blue-700 transition-colors">{sc.theme}</h5>
                    <p className="text-xs text-gray-500 mt-2.5 font-bold line-clamp-3">{sc.objective}</p>
                  </div>

                  <div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase transition-all ${
                        sc.u8 === '重点' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-400'
                      }`}>U8: {sc.u8}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase transition-all ${
                        sc.u9_u10 === '重点' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-400'
                      }`}>U10: {sc.u9_u10}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase transition-all ${
                        sc.u11_u12 === '重点' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-400'
                      }`}>U12: {sc.u11_u12}</span>
                    </div>

                    {isDirector && (
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 justify-end" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingScenario({ ...sc });
                            setIsScenarioAdd(false);
                          }}
                          className="text-[10.5px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded shadow-sm"
                        >
                          修改
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScenario(sc.code);
                          }}
                          className="text-[10.5px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded shadow-sm"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredScenarios.length === 0 && (
              <div className="text-center py-16">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-bold">没有搜到符合分类的场景主题</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: Technical Theme Library */}
      {activeSubTab === 'technical' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">训练层级或年龄关系</span>
                <select
                  value={selectedAgeGroup}
                  onChange={e => setSelectedAgeGroup(e.target.value)}
                  className="bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none focus:border-bvb-yellow"
                >
                  <option value="all">显示全部技术主题</option>
                  <option value="u8">U8 阶段引入或重点</option>
                  <option value="u10">U9-U10 阶段要求</option>
                  <option value="u12">U11-U12 深度要求</option>
                </select>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">训练技术大项分类</span>
                <select
                  value={selectedTechCategory}
                  onChange={e => setSelectedTechCategory(e.target.value)}
                  className="bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none focus:border-bvb-yellow"
                >
                  <option value="all">显示全部大项分类</option>
                  {techCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-col md:flex-row flex-wrap">
              <div className="relative w-full md:w-64">
                <span className="text-xs font-bold text-gray-500 block mb-1">模糊查找主题/核心教学点</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索例如: '接球'..."
                    value={generalSearch}
                    onChange={e => setGeneralSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-bvb-yellow font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 self-end w-full md:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExportExcel('technical')}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 w-full md:w-auto"
                >
                  <Download className="w-4 h-4 text-gray-500" />
                  导出 Excel
                </button>
                
                {isDirector && (
                  <label className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 w-full md:w-auto">
                    <Upload className="w-4 h-4 text-gray-400" />
                    导入 Excel
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => handleImportFileSelect(e, 'technical')}
                    />
                  </label>
                )}

                {isDirector && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBasicTech({
                        code: `YK${basicTechThemes.length + 1}`,
                        focus: '运控球',
                        theme: '',
                        u8: '引入',
                        u9_u10: '重点',
                        u11_u12: '掌握',
                        objective: '',
                        teachingPoints: '',
                        problem: '',
                        scenario: '',
                        coachCue: ''
                      });
                      setIsBasicTechAdd(true);
                    }}
                    className="bg-bvb-black hover:bg-gray-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 w-full md:w-auto"
                  >
                    <Plus className="w-4 h-4 text-bvb-yellow" />
                    新增基础技术主题
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBasicTech.map((tech) => (
              <div
                key={tech.code}
                onClick={() => setSelectedTechItem(tech)}
                className="bg-white border border-gray-150 rounded-2xl p-5 hover:border-bvb-yellow cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
                    <span className="text-[10.5px] font-mono font-black bg-yellow-100 text-yellow-900 px-2 py-0.5 rounded border border-yellow-300">
                      {tech.code}
                    </span>
                    <span className="text-xs font-black text-gray-400">{tech.focus}</span>
                  </div>
                  <h4 className="font-sans font-black text-sm text-gray-900 group-hover:text-amber-600 transition-colors leading-snug">
                    {tech.theme}
                  </h4>
                  <p className="text-xs text-gray-500 font-semibold mt-2 line-clamp-3 leading-relaxed">
                    关键点: {tech.teachingPoints}
                  </p>
                </div>

                <div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">点击查看教学卡片 <ChevronRight className="w-3.5 h-3.5 text-gray-400" /></span>
                    <div className="flex gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">U8: {tech.u8}</span>
                      <span className="text-[9px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">U10: {tech.u9_u10}</span>
                    </div>
                  </div>

                  {isDirector && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 justify-end" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBasicTech({ ...tech });
                          setIsBasicTechAdd(false);
                        }}
                        className="text-[10.5px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded shadow-sm"
                      >
                        修改
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBasicTech(tech.code);
                        }}
                        className="text-[10.5px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded shadow-sm"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Contents: Lesson Planner Generator Wizard */}
      {activeSubTab === 'generator' && (
        <div className="bg-white border border-gray-150 rounded-2xl shadow-md p-6">
          {/* Steps Indicator */}
          <div className="border-b border-gray-100 pb-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-bvb-yellow" />
                  智能少儿足球教案生成向导 (BVB一键生成)
                </h4>
                <p className="text-xs text-gray-500 font-bold">通过俱乐部诊断的比赛高频错误及缺陷，自动科学配套大纲体系，快速打印发布高水准教案。</p>
              </div>
              <span className="text-xs font-mono font-black bg-gray-100 text-gray-700 px-3 py-1 rounded-full">步骤 {genStep} / 3</span>
            </div>

            <div className="flex items-center gap-2.5 mt-5">
              <div className={`h-1.5 flex-1 rounded-full ${genStep >= 1 ? 'bg-bvb-yellow' : 'bg-gray-200'}`}></div>
              <div className={`h-1.5 flex-1 rounded-full ${genStep >= 2 ? 'bg-bvb-yellow' : 'bg-gray-200'}`}></div>
              <div className={`h-1.5 flex-1 rounded-full ${genStep >= 3 ? 'bg-bvb-yellow' : 'bg-gray-200'}`}></div>
            </div>
          </div>

          {/* STEP 1: Select Match Problem/Error Diagnostic */}
          {genStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <label className="text-xs font-extrabold uppercase text-gray-500 tracking-wider block mb-2">
                  第一步：识别俱乐部当前存在的比赛实战问题 (从诊断库匹配)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PREDEFINED_GAMES_PROBLEMS.map((prob) => (
                    <button
                      type="button"
                      key={prob.problem}
                      onClick={() => {
                        setSelectedProblem(prob.problem);
                        setCustomProblemText('');
                      }}
                      className={`p-3 text-left rounded-xl border text-xs font-bold leading-normal transition-all ${
                        selectedProblem === prob.problem 
                          ? 'border-bvb-yellow bg-yellow-50/50 text-bvb-black' 
                          : 'border-gray-200 hover:border-bvb-yellow'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded">
                          场景解决：{prob.BCode} / {prob.YKCode}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold">{prob.stage}</span>
                      </div>
                      <p>{prob.problem}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedProblem('custom')}
                    className={`p-3 text-left rounded-xl border text-xs font-bold leading-normal transition-all ${
                      selectedProblem === 'custom' 
                        ? 'border-bvb-yellow bg-yellow-50/50 text-bvb-black' 
                        : 'border-gray-200 hover:border-bvb-yellow'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.5 rounded">
                        自定义问题
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold">全新体系匹配</span>
                    </div>
                    <p>我输入自定义存在的技战术或比赛作风问题...</p>
                  </button>
                </div>
              </div>

              {selectedProblem === 'custom' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-gray-700 block mb-1">自定义比赛错误表现/问题</label>
                  <textarea
                    rows={2}
                    placeholder="输入你在实战中观察到的典型失误或训练需要解决的盲点..."
                    value={customProblemText}
                    onChange={e => setCustomProblemText(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 focus:outline-none focus:border-bvb-yellow font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (!selectedProblem) {
                      alert('请先选择或输入一项实战问题。');
                      return;
                    }
                    setGenStep(2);
                  }}
                  className="flex items-center px-4 py-2 bg-gray-950 text-white font-bold text-xs rounded-xl hover:bg-gray-800 transition-all shadow active:scale-95"
                >
                  下一步 (配套体系要素)
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Class/Age parameters */}
          {genStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-yellow-50 border border-yellow-250 rounded-2xl p-4 flex gap-4">
                <div className="bg-bvb-yellow/25 p-2.5 rounded-xl h-fit">
                  <Sparkles className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h5 className="font-extrabold text-amber-950 text-sm">体系要素自动配套推荐</h5>
                  <p className="text-xs text-amber-800 font-bold mt-1">根据您挑选的比赛问题，系统已帮您精准对标本总纲中的以下体系因子：</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="bg-white/70 p-2.5 rounded-lg border border-yellow-200/50">
                      <p className="text-[9px] text-gray-400 font-black uppercase">定位比赛阶段</p>
                      <p className="text-xs text-gray-800 font-black">{getMatchedLessionPlan.stage}</p>
                    </div>

                    <div className="bg-white/70 p-2.5 rounded-lg border border-yellow-200/50">
                      <p className="text-[9px] text-gray-400 font-black uppercase">锁定配套原则主题 (Code: {getMatchedLessionPlan.scenario?.code})</p>
                      <p className="text-xs text-gray-800 font-black">{getMatchedLessionPlan.scenario?.theme}</p>
                    </div>

                    <div className="bg-white/70 p-2.5 rounded-lg border border-yellow-200/50">
                      <p className="text-[9px] text-gray-400 font-black uppercase">关联基础技术大纲</p>
                      <p className="text-xs text-gray-800 font-black">{getMatchedLessionPlan.basicTech?.theme || '脚弓基础技术传控'}</p>
                    </div>

                    <div className="bg-white/70 p-2.5 rounded-lg border border-yellow-200/50 flex flex-col justify-between">
                      <p className="text-[9px] text-gray-400 font-black uppercase">预判主要训练教案推荐形式</p>
                      <p className="text-[11px] text-amber-900 font-black leading-tight mt-0.5">{getMatchedLessionPlan.scenario?.trainingFormat || '小场景2v1 + 场地条件反射射门游戏'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">针对训练班级年龄层</label>
                  <select
                    value={selectedAgeLevel}
                    onChange={e => setSelectedAgeLevel(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-3 py-2 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="U8">石头子 U8 引入阶段班级 (允许合理失误)</option>
                    <option value="U9-U10">青石子 U9-U10 强化掌握阶段</option>
                    <option value="U11-U12">顽石子 U11-U12 技战术融合与深度深化</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">主教练签字 / 制定者</label>
                  <input
                    type="text"
                    value={trainerName}
                    onChange={e => setTrainerName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-3 py-2 focus:outline-none focus:border-bvb-yellow"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">制订执行日期</label>
                  <input
                    type="date"
                    value={generationDate}
                    onChange={e => setGenerationDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">自定义教案实务步骤编写 (补充步骤或场地道具)</label>
                  <input
                    type="text"
                    placeholder="例如: 需配备四色标志桶各4只；10个足球；分队背心..."
                    value={customDrills}
                    onChange={e => setCustomDrills(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-3 py-2 focus:outline-none focus:border-bvb-yellow"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button
                  onClick={() => setGenStep(1)}
                  className="flex items-center px-3.5 py-2 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  上一步
                </button>

                <button
                  onClick={() => setGenStep(3)}
                  className="flex items-center px-4 py-2 bg-gray-950 text-white font-bold text-xs rounded-xl hover:bg-gray-800 transition-all shadow active:scale-95"
                >
                  自动渲染BVB级高水平教案
                  <Sparkles className="w-4 h-4 ml-1.5 text-bvb-yellow animate-spin" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview BVB Style printable Session Card */}
          {genStep === 3 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              {/* Printable Session Plan Card container */}
              <div 
                id="printable-lesson-plan"
                className="bg-white border-4 border-bvb-black shadow-xl rounded-2xl p-6 relative max-w-4xl mx-auto text-gray-900 border-t-[20px]"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-bvb-yellow"></div>

                <div className="flex flex-col md:flex-row items-start justify-between border-b-2 border-bvb-black pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    {appLogo ? (
                      <img src={appLogo} alt="Logo" className="w-12 h-12 object-contain shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-bvb-black rounded-lg flex items-center justify-center text-bvb-yellow text-sm font-black tracking-tight leading-none text-center">顽石之光</div>
                    )}
                    <div>
                      <h4 className="text-xl font-bold text-bvb-black tracking-tighter">
                        顽石之光足球青少年精英发展教案卡
                      </h4>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mt-0.5">STONE ELEMENTAL SOCCER PRE-PLANNING LESSON SYSTEM</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-700 select-none">
                    <span className="bg-bvb-black text-white px-2.5 py-1 rounded font-mono font-black">年龄级别: {selectedAgeLevel}</span>
                    <span className="bg-amber-150 text-bvb-black border border-bvb-black px-2.5 py-1 rounded font-bold">阶段: {getMatchedLessionPlan.stage}</span>
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded font-bold">制订日期: {generationDate}</span>
                  </div>
                </div>

                {/* Grid Elements */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pb-6 border-b border-gray-100">
                  <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl">
                    <p className="text-[10px] text-red-700 font-black uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      比赛诊断问题/训练目标
                    </p>
                    <p className="text-xs text-gray-800 font-bold mt-2 leading-relaxed">&ldquo;{getMatchedLessionPlan.problem}&rdquo;</p>
                  </div>

                  <div className="p-3 bg-yellow-50/40 border border-yellow-200 rounded-xl">
                    <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-bvb-yellow" />
                      对标比赛原则 & 核心场景 (Code: {getMatchedLessionPlan.scenario?.code})
                    </p>
                    <p className="text-xs text-gray-800 font-bold mt-2">{getMatchedLessionPlan.scenario?.theme}</p>
                    <p className="text-[10px] text-gray-500 font-bold mt-1 max-w-full leading-snug">
                      原则内容: {getMatchedLessionPlan.scenario?.objective}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/40 border border-blue-200 rounded-xl">
                    <p className="text-[10px] text-blue-700 font-black uppercase tracking-widest flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      基础技术支撑 (Code: {getMatchedLessionPlan.basicTech?.code})
                    </p>
                    <p className="text-xs text-gray-800 font-bold mt-2">{getMatchedLessionPlan.basicTech?.theme || '基础脚弓传控'}</p>
                    <p className="text-[10px] text-gray-500 font-bold mt-1 leading-snug">
                      技术动作要领: {getMatchedLessionPlan.basicTech?.teachingPoints}
                    </p>
                  </div>
                </div>

                {/* Coaching session structures */}
                <div className="space-y-4 mt-6">
                  <h5 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                    <Sliders className="w-4.5 h-4.5 text-bvb-yellow" />
                    高阶技术大纲配套训练流程
                  </h5>

                  <div className="border border-gray-150 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                      <thead className="bg-gray-50 text-gray-600 font-bold">
                        <tr>
                          <th className="px-4 py-2.5">课节周期步骤</th>
                          <th className="px-4 py-2.5">对应训练方式 & 设计形式 (BVB标准)</th>
                          <th className="px-4 py-2.5">时间分配</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 text-gray-800 font-medium">
                        <tr>
                          <td className="px-4 py-2 text-amber-700 font-black">第 1 步：主题激活</td>
                          <td className="px-4 py-2">热身引入、球感刺激 (YK1)游戏。双脚左右轻点拉球，并带入趣味追逐。</td>
                          <td className="px-4 py-2">15 分钟</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-amber-700 font-black">第 2 步：技术导入</td>
                          <td className="px-4 py-2">无对抗或低压脚弓短传准确跑动 ({getMatchedLessionPlan.basicTech?.code || 'CJ2'})。强化第一脚触球指向性。</td>
                          <td className="px-4 py-2">20 分钟</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-amber-700 font-black">第 3 步：场景对抗</td>
                          <td className="px-4 py-2">{getMatchedLessionPlan.scenario?.trainingFormat || '2v1/3v2 局部突破条件对抗。建立持球后观察空间意识。'}</td>
                          <td className="px-4 py-2">25 分钟</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-amber-700 font-black">第 4 步：条件比赛</td>
                          <td className="px-4 py-2">分队5v5或4v4比赛，加入达成动作(例如成功倒三角射门)得分双倍游戏限制规则。</td>
                          <td className="px-4 py-2">20 分钟</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-amber-700 font-black">第 5 步：赛后复盘</td>
                          <td className="px-4 py-2">列队进行战术白板复盘、启发式提问提领、球员自我纠错交流。</td>
                          <td className="px-4 py-2">10 分钟</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Core observation goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-gray-150">
                  <div className="bg-yellow-50/40 p-3 rounded-lg border border-yellow-200/50">
                    <p className="text-[10px] text-amber-800 font-black uppercase">本年龄阶段({selectedAgeLevel})考核及观察标准</p>
                    <p className="text-xs text-amber-950 font-bold mt-1.5 leading-relaxed">{getMatchedLessionPlan.requirement}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] text-gray-500 font-black uppercase">教练员关键教学观察点 (Coaching Cues)</p>
                    <p className="text-xs text-gray-800 font-bold mt-1.5 leading-relaxed">
                      {getMatchedLessionPlan.basicTech?.coachCue || getMatchedLessionPlan.scenario?.cue || '队员在第一脚处理时身体是否半转身；视野是否开阔，能预先观察两个接球可能。'}
                    </p>
                  </div>
                </div>

                {customDrills && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs font-bold font-mono">
                    <span className="text-gray-400">场地器械及实务备注:</span> {customDrills}
                  </div>
                )}

                {/* Footer seal */}
                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-8 border-t border-dashed border-gray-200 pt-3 select-none">
                  <span>青训总监/主教练签字: <strong className="text-gray-700">{trainerName}</strong></span>
                  <span>顽石之光青训学院技术专家委员会 &middot; BVB官方授权体系卡</span>
                </div>
              </div>

              {/* Step Controls */}
              <div className="flex justify-between max-w-4xl mx-auto pt-4">
                <button
                  onClick={() => setGenStep(2)}
                  className="flex items-center px-4 py-2 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  上一步
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                  >
                    <Printer className="w-4 h-4 mr-1.5 text-bvb-yellow" />
                    高保真大字打印卡
                  </button>

                  <button
                    onClick={() => {
                      // Save dynamic doc directly to customized center as a new article record
                      const newDoc: PhilosophyDocument = {
                        id: 'plan_' + Date.now().toString(),
                        category: '训练大纲与方案',
                        title: `${generationDate} - U12以下配套教案: ${getMatchedLessionPlan.scenario?.theme}`,
                        content: `**问题背景:** ${getMatchedLessionPlan.problem}\n\n**配套原则:** ${getMatchedLessionPlan.scenario?.objective}\n\n**基础技术要点:** ${getMatchedLessionPlan.basicTech?.teachingPoints}\n\n**计划人:** ${trainerName}\n\n**执行段落备注:** ${customDrills}`,
                        updatedAt: generationDate,
                        isBuiltIn: false
                      };
                      onAddDoc(newDoc);
                      alert('已将本高阶教案成果一键归档保存到“体系上传与持续更新”版块，您可随时二次查阅或编辑。');
                      setActiveSubTab('uploads');
                    }}
                    className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-extrabold text-xs rounded-xl hover:bg-yellow-400 transition-all shadow-md"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    保存/归档到本库
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Custom Uploads and Updates */}
      {activeSubTab === 'uploads' && (
        <div className="space-y-6">
          {/* Header instructions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm">
            <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-1.5">
              <Upload className="w-5 h-5 text-bvb-yellow" />
              青训大纲、训练文档上传与持续更新中心
            </h4>
            <p className="text-xs text-gray-500 font-bold mt-1">
              在这里，俱乐部管理人员和教练员可以自由分类发表、长传技战术PDF、或是文字版的战术图解和实操守则，保持“顽石之光”战术库与时俱进。
            </p>
          </div>

          {/* Form to add or edit custom docs */}
          {showAddForm ? (
            <div className="bg-white border-2 border-dashed border-gray-250 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-5">
                <h5 className="font-extrabold text-gray-900 text-sm">
                  {editingDocId ? '修改大纲体系内容' : '长传 / 撰写全新青训体系内容'}
                </h5>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDoc} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">内容分类分类 (分类选择)</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none focus:border-bvb-yellow"
                    >
                      <option value="比赛模型总纲">比赛模型总纲类</option>
                      <option value="比赛原则库">比赛原则与战术指南</option>
                      <option value="技术训练主题">基础技术专项大纲</option>
                      <option value="训练大纲与方案">训练大纲与教案方案</option>
                      <option value="理论指导规范">教练员理论规范</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">专项标题</label>
                    <input
                      type="text"
                      placeholder="例如: 顽石U10边路套边切入跑动指引..."
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none focus:border-bvb-yellow"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">主题核心阐述/Markdown图解内容</label>
                  <textarea
                    rows={6}
                    placeholder="输入该战术阶段的关键要求、教学重点、或者具体跑位内容描述..."
                    value={formContent}
                    onChange={e => setFormContent(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 font-bold focus:outline-none focus:border-bvb-yellow"
                  />
                </div>

                {/* Simulated drag drag-and-drop file upload */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    长传PDF教案 / 技战术图片文件附件 (支持拖曳上传)
                  </label>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-bvb-yellow bg-yellow-50/50' 
                        : 'border-gray-200 hover:border-bvb-yellow hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf,.doc,.docx"
                      multiple
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-700 font-black">将青训体系PDF、战术PPT或图片拖到这里，或双击选择文件上传</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">支持 PDFs, Docs, PNG 或 JPG。模拟转换为数据流保存。</p>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] text-gray-400 font-black uppercase">已长传文件附件：</p>
                      {uploadedFiles.map((file, fIdx) => (
                        <div key={fIdx} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <File className="w-4 h-4 text-bvb-yellow shrink-0" />
                            <span className="text-gray-700 truncate max-w-[200px] md:max-w-md">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveFile(fIdx); }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-bvb-yellow text-bvb-black font-extrabold text-xs rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95"
                  >
                    确认长传更新
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-150">
                <span className="text-xs font-bold text-gray-600">已成功在云战术库发布了 {customDocs.length} 篇补充性体系图解。</span>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center px-4 py-2 bg-gray-900 text-white font-bold text-xs rounded-lg hover:bg-gray-800 transition-all"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  新增一篇补充大纲
                </button>
              </div>

              {customDocs.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-black">暂时还没有补充的大纲战术文档</p>
                  <p className="text-xs text-gray-400 mt-1">点击上方 “新增一篇补充大纲” 长传你的青训新思潮吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      className="bg-white border border-gray-150 rounded-2xl p-5 hover:border-bvb-yellow shadow-sm flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3.5">
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-black">
                            {doc.category}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono font-bold">更新于 {doc.updatedAt}</span>
                        </div>

                        <h4 className="font-sans font-black text-sm text-gray-900 mb-2">{doc.title}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed font-semibold whitespace-pre-wrap line-clamp-4">{doc.content}</p>

                        {doc.attachments && doc.attachments.length > 0 && (
                          <div className="mt-3.5 space-y-1">
                            <p className="text-[9px] text-gray-400 font-black uppercase">附件文档：</p>
                            {doc.attachments.map((file, fIdx) => (
                              <a
                                key={fIdx}
                                href={file.url}
                                download={file.name}
                                className="flex items-center gap-1.5 text-[11px] text-amber-700 hover:underline font-bold"
                              >
                                <Download className="w-3 h-3 text-amber-500" />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                        <button
                          onClick={() => handleEditDoc(doc)}
                          className="flex items-center px-3 py-1.5 border border-gray-200 text-gray-700 hover:text-gray-900 font-bold text-[11px] rounded-lg hover:bg-gray-50 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          修改
                        </button>
                        <button
                          onClick={() => handleDeleteCustomDoc(doc.id)}
                          className="flex items-center px-3 py-1.5 border border-red-100 text-red-600 hover:text-red-800 font-bold text-[11px] rounded-lg hover:bg-red-50/50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-400" />
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Basic Tech Detail Card popup */}
      {selectedTechItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-bvb-black w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="bg-bvb-yellow text-bvb-black font-mono font-black text-xs px-2.5 py-0.5 rounded">
                  {selectedTechItem.code}
                </span>
                <h4 className="font-extrabold text-white text-base leading-none">
                  {selectedTechItem.theme}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedTechItem(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">技术大项分类</p>
                  <p className="text-xs font-black text-gray-900 mt-1">{selectedTechItem.focus}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">适合训练年龄侧重点</p>
                  <p className="text-xs font-black text-gray-900 mt-1">U8:{selectedTechItem.u8} &middot; U10:{selectedTechItem.u9_u10} &middot; U12:{selectedTechItem.u11_u12}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-amber-700 font-black uppercase tracking-wider">核心指导目标</p>
                <p className="text-sm font-bold text-gray-900 mt-1 leading-relaxed">{selectedTechItem.objective}</p>
              </div>

              <div className="bg-yellow-50/50 border border-yellow-250 p-4 rounded-xl">
                <p className="text-[10px] text-amber-800 font-black uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-bvb-yellow" />
                  关键教学要点 (Key Coaching Points)
                </p>
                <p className="text-xs text-amber-950 font-black mt-2 leading-relaxed">{selectedTechItem.teachingPoints}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50/40 p-3.5 rounded-xl border-l-4 border-red-500">
                  <p className="text-[10px] text-red-700 font-black uppercase tracking-wider">诊断：实战暴露的典型问题</p>
                  <p className="text-xs text-red-950 font-bold mt-1 leading-relaxed">{selectedTechItem.problem}</p>
                </div>
                <div className="bg-blue-50/40 p-3.5 rounded-xl border-l-4 border-blue-500">
                  <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider">关联常见实战场景</p>
                  <p className="text-xs text-blue-950 font-bold mt-1 leading-relaxed">{selectedTechItem.scenario}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">教练在场边观察与评价信号</p>
                <p className="text-xs text-gray-800 font-bold mt-1.5 leading-relaxed">{selectedTechItem.coachCue}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedProblem(selectedTechItem.problem);
                  setGenStep(1);
                  setActiveSubTab('generator');
                  setSelectedTechItem(null);
                }}
                className="text-xs font-black bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95"
              >
                以此技术诊断一键写教案
              </button>
              <button
                onClick={() => setSelectedTechItem(null)}
                className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                关闭卡片
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Scenario Detail Card popup */}
      {selectedScenarioItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-bvb-black w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="bg-blue-500 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded">
                  {selectedScenarioItem.code}
                </span>
                <h4 className="font-extrabold text-white text-base leading-none">
                  {selectedScenarioItem.theme}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedScenarioItem(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">对应比赛时刻/阶段</p>
                  <p className="text-xs font-black text-gray-900 mt-1">{selectedScenarioItem.stage} &middot; {selectedScenarioItem.moment}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">适合训练年龄段</p>
                  <p className="text-xs font-black text-gray-900 mt-1">U8:{selectedScenarioItem.u8} &middot; U10:{selectedScenarioItem.u9_u10} &middot; U12:{selectedScenarioItem.u11_u12}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider">配套对应战术比赛原则</p>
                <p className="text-xs font-black text-blue-950 bg-blue-50/60 p-3 rounded-xl border border-blue-200/50 mt-1 leading-relaxed">
                  {selectedScenarioItem.principle}
                </p>
              </div>

              <div className="bg-yellow-50/50 border border-yellow-250 p-4 rounded-xl">
                <p className="text-[10px] text-amber-800 font-black uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-bvb-yellow" />
                  本场景核心训练目标 (Session Objectives)
                </p>
                <p className="text-xs text-amber-950 font-black mt-2 leading-relaxed">{selectedScenarioItem.objective}</p>
              </div>

              <div className="bg-red-50/40 p-4 rounded-xl border-l-4 border-red-500">
                <p className="text-[10px] text-red-700 font-black uppercase tracking-wider">诊断：解决的具体比赛失真问题</p>
                <p className="text-xs text-red-950 font-bold mt-1 leading-relaxed">{selectedScenarioItem.problem}</p>
              </div>

              {selectedScenarioItem.typicalError && (
                <div className="bg-amber-50/40 p-4 rounded-xl border-l-4 border-amber-600">
                  <p className="text-[10px] text-amber-800 font-black uppercase tracking-wider">典型错误表现 (Typical Errors)</p>
                  <p className="text-xs text-amber-950 font-bold mt-1 leading-relaxed">{selectedScenarioItem.typicalError}</p>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">推荐经典训练组织形式 (BVB 训练参考)</p>
                <p className="text-xs text-gray-800 font-bold mt-1.5 leading-relaxed">{selectedScenarioItem.trainingFormat}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-2">关联基础技术要领支撑: {selectedScenarioItem.technicalMatch}</p>
              </div>

              <div className="bg-blue-50/25 p-4 rounded-xl">
                <p className="text-[10px] text-blue-800 font-black uppercase tracking-wider">视频/实操关键识别信号</p>
                <p className="text-xs text-blue-950 font-black mt-1 leading-relaxed">{selectedScenarioItem.cue}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedProblem(selectedScenarioItem.problem);
                  setGenStep(1);
                  setActiveSubTab('generator');
                  setSelectedScenarioItem(null);
                }}
                className="text-xs font-black bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95"
              >
                以此场景一键写教案
              </button>
              <button
                onClick={() => setSelectedScenarioItem(null)}
                className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                关闭卡片
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DIALOG 1: Title/Slogan Editor */}
      {isEditingTitleSlogan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveTitleSlogan} className="bg-white border-4 border-bvb-black w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <h4 className="font-extrabold text-white text-base">修改大纲全局语</h4>
              <button type="button" onClick={() => setIsEditingTitleSlogan(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">主标题 (哲学大项)</label>
                <input
                  type="text"
                  required
                  value={overviewTitle}
                  onChange={e => setOverviewTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">哲学口号 (Slogan/标语)</label>
                <input
                  type="text"
                  required
                  value={overviewSlogan}
                  onChange={e => setOverviewSlogan(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setIsEditingTitleSlogan(false)} className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">取消</button>
              <button type="submit" className="text-xs font-black bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95">保存</button>
            </div>
          </form>
        </div>
      )}

      {/* ADMIN DIALOG 2: Overview Section Editor */}
      {editingOverviewSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveOverviewSection} className="bg-white border-4 border-bvb-black w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <h4 className="font-extrabold text-white text-base">{isOverviewSectionAdd ? '新增模型阶段' : '编辑模型大纲阶段'}</h4>
              <button type="button" onClick={() => setEditingOverviewSection(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">大纲阶段名称</label>
                  <input
                    type="text"
                    required
                    value={editingOverviewSection.stage || ''}
                    onChange={e => setEditingOverviewSection({ ...editingOverviewSection, stage: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                    placeholder="例如：感知与启盟阶段"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">适合年龄/侧重点</label>
                  <input
                    type="text"
                    required
                    value={editingOverviewSection.focus || ''}
                    onChange={e => setEditingOverviewSection({ ...editingOverviewSection, focus: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                    placeholder="例如：6岁以下儿童"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">专业理念表达 (Professional Terms)</label>
                <textarea
                  required
                  rows={3}
                  value={editingOverviewSection.professional || ''}
                  onChange={e => setEditingOverviewSection({ ...editingOverviewSection, professional: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="专业战术语表达..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">儿童化顺口沟通暗号 (Child-friendly Cues)</label>
                <textarea
                  required
                  rows={2}
                  value={editingOverviewSection.childExpression || ''}
                  onChange={e => setEditingOverviewSection({ ...editingOverviewSection, childExpression: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="适合12岁以下儿童顺口、好记的沟通术语..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">推荐训练结构步骤 (Recommended Steps)</label>
                <textarea
                  required
                  rows={2}
                  value={editingOverviewSection.drills || ''}
                  onChange={e => setEditingOverviewSection({ ...editingOverviewSection, drills: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="例如：步骤一：个人持球热身，步骤二：多段运传..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">不建议与行为禁忌 (Taboos)</label>
                <textarea
                  required
                  rows={2}
                  value={editingOverviewSection.avoid || ''}
                  onChange={e => setEditingOverviewSection({ ...editingOverviewSection, avoid: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="在该阶段中，不建议对孩子做哪些拔苗助长的反效果行为？..."
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setEditingOverviewSection(null)} className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">取消</button>
              <button type="submit" className="text-xs font-black bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95">保存阶段</button>
            </div>
          </form>
        </div>
      )}

      {/* ADMIN DIALOG 3: Principle Editor */}
      {editingPrinciple && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSavePrinciple} className="bg-white border-4 border-bvb-black w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <h4 className="font-extrabold text-white text-base">{isPrincipleAdd ? '新增比赛原则' : '修改比赛原则'}</h4>
              <button type="button" onClick={() => setEditingPrinciple(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">原则编号</label>
                  <input
                    type="text"
                    required
                    disabled={!isPrincipleAdd}
                    value={editingPrinciple.code || ''}
                    onChange={e => setEditingPrinciple({ ...editingPrinciple, code: e.target.value })}
                    className="w-full bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                    placeholder="P11"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">战术比赛阶段</label>
                  <select
                    value={editingPrinciple.stage || ''}
                    onChange={e => setEditingPrinciple({ ...editingPrinciple, stage: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="进攻">进攻</option>
                    <option value="攻转守">攻转守</option>
                    <option value="防守">防守</option>
                    <option value="守转攻">守转攻</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">战术原则名称 (Principle Name)</label>
                <input
                  type="text"
                  required
                  value={editingPrinciple.name || ''}
                  onChange={e => setEditingPrinciple({ ...editingPrinciple, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="例如：持球向前渗透"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">原则详细内容描述 (Description)</label>
                <textarea
                  required
                  rows={4}
                  value={editingPrinciple.description || ''}
                  onChange={e => setEditingPrinciple({ ...editingPrinciple, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="输入该战术比赛原则下的详细操作描述与行为指引..."
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setEditingPrinciple(null)} className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">取消</button>
              <button type="submit" className="text-xs font-black bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95">保存</button>
            </div>
          </form>
        </div>
      )}

      {/* ADMIN DIALOG 4: Scenario Theme Editor */}
      {editingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveScenario} className="bg-white border-4 border-bvb-black w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <h4 className="font-extrabold text-white text-base">{isScenarioAdd ? '新增比赛场景主题' : '修改比赛场景主题'}</h4>
              <button type="button" onClick={() => setEditingScenario(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto w-full">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">大纲编码 (如JG1/GZS1等)</label>
                  <input
                    type="text"
                    required
                    disabled={!isScenarioAdd}
                    value={editingScenario.code || ''}
                    onChange={e => setEditingScenario({ ...editingScenario, code: e.target.value })}
                    className="w-full bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                    placeholder="JG19"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">基本大项分类</label>
                  <select
                    value={editingScenario.stage || ''}
                    onChange={e => {
                      const newStage = e.target.value;
                      let nextCode = editingScenario.code;
                      if (isScenarioAdd) {
                        const stagePrefixes: Record<string, string> = {
                          '进攻': 'JG',
                          '攻转守': 'GZS',
                          '防守': 'FS',
                          '守转攻': 'SZG'
                        };
                        const prefix = stagePrefixes[newStage] || 'JG';
                        const sameStageThemes = scenarioThemes.filter(s => s.stage === newStage);
                        let maxNum = 0;
                        sameStageThemes.forEach(s => {
                          const numPart = s.code.replace(prefix, '');
                          const num = parseInt(numPart, 10);
                          if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                          }
                        });
                        nextCode = `${prefix}${maxNum + 1}`;
                      }
                      setEditingScenario({ ...editingScenario, stage: newStage, code: nextCode });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="进攻">进攻</option>
                    <option value="攻转守">攻转守</option>
                    <option value="防守">防守</option>
                    <option value="守转攻">守转攻</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">战术环节 (Moment)</label>
                  <input
                    type="text"
                    required
                    value={editingScenario.moment || ''}
                    onChange={e => setEditingScenario({ ...editingScenario, moment: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                    placeholder="例如：阵地传切配合"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">U8 要求</label>
                  <select
                    value={editingScenario.u8 || ''}
                    onChange={e => setEditingScenario({ ...editingScenario, u8: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="重点">重点</option>
                    <option value="引入">引入</option>
                    <option value="掌握">掌握</option>
                    <option value="不合段">不合段</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">U10 要求</label>
                  <select
                    value={editingScenario.u9_u10 || ''}
                    onChange={e => setEditingScenario({ ...editingScenario, u9_u10: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="重点">重点</option>
                    <option value="引入">引入</option>
                    <option value="掌握">掌握</option>
                    <option value="不合段">不合段</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">U12 要求</label>
                  <select
                    value={editingScenario.u11_u12 || ''}
                    onChange={e => setEditingScenario({ ...editingScenario, u11_u12: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="重点">重点</option>
                    <option value="引入">引入</option>
                    <option value="掌握">掌握</option>
                    <option value="不合段">不合段</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">战术场景主题语 (Theme Topic)</label>
                <input
                  type="text"
                  required
                  value={editingScenario.theme || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, theme: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="例如：利用传切二过一撕开对方低位防线"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">配套战术比赛原则 (Related Principle)</label>
                <input
                  type="text"
                  required
                  value={editingScenario.principle || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, principle: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="例如：P01 站位原则与深度"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">场景训练核心解决目标 (Core Objective)</label>
                <textarea
                  required
                  rows={2}
                  value={editingScenario.objective || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, objective: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="描述学员在该训练场景中的核心成长路径与想要解决的关键点..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">诊断：典型实战暴露缺陷问题 (Problem Exposed)</label>
                <textarea
                  required
                  rows={2}
                  value={editingScenario.problem || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, problem: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="描述小球员在阵地赛、高节奏比赛中暴露出的常见失真、控制失误..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">典型动作细节错误表现</label>
                <textarea
                  rows={2}
                  value={editingScenario.typicalError || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, typicalError: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="跑动路线单一、过早停下等待、未提前开阔视野..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">推荐经典对抗组织结构方式 (BVB Training Format)</label>
                <textarea
                  rows={2}
                  value={editingScenario.trainingFormat || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, trainingFormat: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="3v3条件对抗或双多向反击球门组设计..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">教练场边呐喊暗号信号 (Coaching Cues)</label>
                <input
                  type="text"
                  required
                  value={editingScenario.cue || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, cue: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="提速拉开！、给提前量！"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">关联基础技术要领支撑 (Technical Capability)</label>
                <input
                  type="text"
                  required
                  value={editingScenario.technicalMatch || ''}
                  onChange={e => setEditingScenario({ ...editingScenario, technicalMatch: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="YK1 传球接球基本脚法"
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setEditingScenario(null)} className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">取消</button>
              <button type="submit" className="text-xs font-black bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95">保存</button>
            </div>
          </form>
        </div>
      )}

      {/* ADMIN DIALOG 5: Basic Technology Editor */}
      {editingBasicTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveBasicTech} className="bg-white border-4 border-bvb-black w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <h4 className="font-extrabold text-white text-base">{isBasicTechAdd ? '新增基本技术主题' : '修改基本技术主题'}</h4>
              <button type="button" onClick={() => setEditingBasicTech(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto w-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">技术卡编码 (YK01等)</label>
                  <input
                    type="text"
                    required
                    disabled={!isBasicTechAdd}
                    value={editingBasicTech.code || ''}
                    onChange={e => setEditingBasicTech({ ...editingBasicTech, code: e.target.value })}
                    className="w-full bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                    placeholder="YK11"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">基本大项技术分类 (Focus)</label>
                  <input
                    type="text"
                    required
                    value={editingBasicTech.focus || ''}
                    onChange={e => setEditingBasicTech({ ...editingBasicTech, focus: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                    placeholder="例如：传跑接球、运球控球"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">U8 阶段引入</label>
                  <select
                    value={editingBasicTech.u8 || ''}
                    onChange={e => setEditingBasicTech({ ...editingBasicTech, u8: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="重点">重点</option>
                    <option value="引入">引入</option>
                    <option value="掌握">掌握</option>
                    <option value="未合适">未合适</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">U10 阶段引入</label>
                  <select
                    value={editingBasicTech.u9_u10 || ''}
                    onChange={e => setEditingBasicTech({ ...editingBasicTech, u9_u10: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="重点">重点</option>
                    <option value="引入">引入</option>
                    <option value="掌握">掌握</option>
                    <option value="未合适">未合适</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">U12 深度要求</label>
                  <select
                    value={editingBasicTech.u11_u12 || ''}
                    onChange={e => setEditingBasicTech({ ...editingBasicTech, u11_u12: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  >
                    <option value="重点">重点</option>
                    <option value="引入">引入</option>
                    <option value="掌握">掌握</option>
                    <option value="未合适">未合适</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">技术主题语 (theme)</label>
                <input
                  type="text"
                  required
                  value={editingBasicTech.theme || ''}
                  onChange={e => setEditingBasicTech({ ...editingBasicTech, theme: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="例如：脚内侧变向运球"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">技术训练核心目标 (Objective)</label>
                <textarea
                  required
                  rows={2}
                  value={editingBasicTech.objective || ''}
                  onChange={e => setEditingBasicTech({ ...editingBasicTech, objective: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="该技术对孩子实操中的详细动作标准描述..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">关键教学要领步骤 (Teaching Points)</label>
                <textarea
                  required
                  rows={3}
                  value={editingBasicTech.teachingPoints || ''}
                  onChange={e => setEditingBasicTech({ ...editingBasicTech, teachingPoints: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="教练教学时提醒孩子的核心要领，如：支撑脚定位、髋部微转..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">诊断：典型实战动作错误缺陷 (Problem Exposed)</label>
                <textarea
                  required
                  rows={2}
                  value={editingBasicTech.problem || ''}
                  onChange={e => setEditingBasicTech({ ...editingBasicTech, problem: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="孩子操作时最常犯的非标动作诊断（例如：踝关节松垮、不抬脚掌）"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">实操场景关联描述 (Scenario Match)</label>
                <input
                  type="text"
                  required
                  value={editingBasicTech.scenario || ''}
                  onChange={e => setEditingBasicTech({ ...editingBasicTech, scenario: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="常见实战一对一、中场接球转身过渡场景"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">教练观察与场边呐喊暗号 (Coach Cue)</label>
                <input
                  type="text"
                  required
                  value={editingBasicTech.coachCue || ''}
                  onChange={e => setEditingBasicTech({ ...editingBasicTech, coachCue: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bvb-yellow"
                  placeholder="锁踝缓冲、提早微转身！"
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setEditingBasicTech(null)} className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">取消</button>
              <button type="submit" className="text-xs font-black bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all shadow active:scale-95">保存</button>
            </div>
          </form>
        </div>
      )}

      {/* EXCEL IMPORT PREVIEW DIALOG */}
      {showImportModal && importType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white border-4 border-bvb-black w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-extrabold text-white text-base flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-bvb-yellow animate-pulse" />
                  Excel 批量数据导入预览
                </h4>
                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                  正在导入: {importType === 'scenarios' ? '比赛场景主题库' : '基础技术主题库'} &middot; 解析成果共 {importPreviewData.length} 项
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreviewData([]);
                  setImportType(null);
                }} 
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Core merge/replace settings */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h5 className="text-xs font-black text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> 导入冲突处理策略 (Conflict Handler)
                  </h5>
                  <p className="text-[11px] text-amber-700 font-semibold mt-1 leading-relaxed">
                    如果您选择"追加更新", 同编号 (Code) 的主题会被覆盖, 新编号会追加到数据库尾。如果选择"完全替换", 现存的所有主题会全部被清除！
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setImportMergeMode('merge')}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all ${
                      importMergeMode === 'merge'
                        ? 'bg-amber-600 text-white border-amber-600 shadow'
                        : 'bg-white text-gray-750 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    追加 & 覆写同编码
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if(confirm('警告：完全替换将会抹除原有的全部数据。确认这样做吗？')) {
                        setImportMergeMode('replace');
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all ${
                      importMergeMode === 'replace'
                        ? 'bg-red-650 text-white border-red-600 shadow'
                        : 'bg-white text-gray-750 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    完全替换原有库
                  </button>
                </div>
              </div>

              {/* Parsed List Table Preview */}
              <div className="border border-gray-200 rounded-xl overflow-hidden font-sans">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-extrabold text-gray-700">
                      <th className="p-3 text-center w-24 shrink-0">编码</th>
                      {importType === 'scenarios' ? (
                        <>
                          <th className="p-3 w-28 text-center border-l border-gray-200">功能阶段</th>
                          <th className="p-3 w-40 border-l border-gray-200">时机/战术环节</th>
                          <th className="p-3 border-l border-gray-200">场景主题语</th>
                          <th className="p-3 text-center w-36 border-l border-gray-200">年龄关系要求</th>
                        </>
                      ) : (
                        <>
                          <th className="p-3 w-32 text-center border-l border-gray-200">基本技术大项</th>
                          <th className="p-3 border-l border-gray-200">技术主题语</th>
                          <th className="p-3 border-l border-gray-200">核心训练目标</th>
                          <th className="p-3 text-center w-36 border-l border-gray-200">年龄要求关系</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewData.slice(0, 12).map((row, idx) => (
                      <tr key={row.code + idx} className="border-b border-gray-150 text-[11.5px] font-bold text-gray-800 hover:bg-gray-50">
                        <td className="p-3 text-center font-mono">
                          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-250">
                            {row.code}
                          </span>
                        </td>
                        {importType === 'scenarios' ? (
                          <>
                            <td className="p-3 text-center border-l border-gray-150">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                row.stage === '进攻' ? 'bg-orange-100 text-orange-850 border border-orange-200' :
                                row.stage === '防守' ? 'bg-indigo-100 text-indigo-854 border border-indigo-200' :
                                'bg-emerald-100 text-emerald-850 border border-emerald-200'
                              }`}>{row.stage}</span>
                            </td>
                            <td className="p-3 text-gray-500 font-semibold border-l border-gray-150">{row.moment}</td>
                            <td className="p-3 text-gray-900 border-l border-gray-150">{row.theme}</td>
                            <td className="p-3 text-center text-gray-500 font-semibold text-[10px] border-l border-gray-150">
                              U8:{row.u8} | U10:{row.u9_u10} | U12:{row.u11_u12}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-center font-semibold text-gray-500 border-l border-gray-150">{row.focus}</td>
                            <td className="p-3 text-gray-950 font-black border-l border-gray-150">{row.theme}</td>
                            <td className="p-3 text-gray-500 font-bold border-l border-gray-150 truncate max-w-xs">{row.objective}</td>
                            <td className="p-3 text-center text-gray-500 font-semibold text-[10px] border-l border-gray-150">
                              U8:{row.u8} | U10:{row.u9_u10} | U12:{row.u11_u12}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreviewData.length > 12 && (
                  <div className="bg-gray-50 p-3 text-center text-[11px] text-gray-500 font-bold border-t border-gray-150">
                    ... 仅在此折叠预览前 12 项，其余 {importPreviewData.length - 12} 项将在确定导入后自动渲染出来 ...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-150 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-amber-700 font-black flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 请仔细核对编码映射与字段内容
              </span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreviewData([]);
                    setImportType(null);
                  }} 
                  className="text-xs font-bold border border-gray-250 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all"
                >
                  取消导入
                </button>
                <button 
                  type="button" 
                  onClick={handleApplyImport} 
                  className="text-xs font-black bg-bvb-yellow text-bvb-black px-6 py-2 rounded-xl hover:bg-yellow-400 shadow-md transition-all active:scale-95 animate-pulse"
                >
                  确定批量导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhilosophyLibrary;
