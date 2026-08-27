import React, { useState, useMemo } from 'react';
import { X, Search, Sparkles, BookOpen, Layers, CheckCircle2, ChevronRight } from 'lucide-react';
import { BASIC_TECH_THEMES, SCENARIO_THEMES, BasicTechItem, ScenarioTheme } from '../src/philosophyData';

export interface ThemeDetails {
  code: string;
  theme: string;
  category: string;
  subCategory: string;
  type: 'tech' | 'scenario';
  focusLabel: string;
  displayTag: string;
  description: string;
  teachingPoints: string;
}

export interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (focus: string, content: string, details?: ThemeDetails) => void;
  basicTechThemes?: BasicTechItem[];
  scenarioThemes?: ScenarioTheme[];
  title?: string;
  subtitle?: string;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  basicTechThemes = BASIC_TECH_THEMES,
  scenarioThemes = SCENARIO_THEMES,
  title = '选择俱乐部体系库核心训练主题',
  subtitle = '从俱乐部标准技术库与比赛场景库中检索并联动选择核心训练主题'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tech' | 'scenario'>('all');
  const [selectedTechCategory, setSelectedTechCategory] = useState<string>('all');
  const [selectedScenarioStage, setSelectedScenarioStage] = useState<string>('all');

  const techCategories = useMemo(() => {
    const list = (basicTechThemes || BASIC_TECH_THEMES).map(t => t.focus);
    return Array.from(new Set(list)).filter(Boolean);
  }, [basicTechThemes]);

  const scenarioStages = useMemo(() => {
    const list = (scenarioThemes || SCENARIO_THEMES).map(s => s.stage);
    return Array.from(new Set(list)).filter(Boolean);
  }, [scenarioThemes]);

  const handleTabChange = (tab: 'all' | 'tech' | 'scenario') => {
    setActiveTab(tab);
    setSelectedTechCategory('all');
    setSelectedScenarioStage('all');
  };

  if (!isOpen) return null;

  const techItems: ThemeDetails[] = (basicTechThemes || BASIC_TECH_THEMES).map(t => ({
    type: 'tech' as const,
    code: t.code,
    category: t.focus,
    subCategory: t.focus,
    theme: t.theme,
    focusLabel: `[基础技术] ${t.focus}`,
    displayTag: '基础技术',
    description: t.objective || '',
    teachingPoints: t.teachingPoints || '',
  }));

  const scenarioItems: ThemeDetails[] = (scenarioThemes || SCENARIO_THEMES).map(s => ({
    type: 'scenario' as const,
    code: s.code,
    category: `${s.stage} · ${s.moment}`,
    subCategory: s.stage,
    theme: s.theme,
    focusLabel: `[比赛场景] ${s.stage} · ${s.moment}`,
    displayTag: '比赛场景',
    description: s.objective || '',
    teachingPoints: s.cue || '',
  }));

  const allItems = [...techItems, ...scenarioItems];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.theme.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'tech') {
      if (item.type !== 'tech') return false;
      if (selectedTechCategory !== 'all' && item.subCategory !== selectedTechCategory) return false;
    } else if (activeTab === 'scenario') {
      if (item.type !== 'scenario') return false;
      if (selectedScenarioStage !== 'all' && item.subCategory !== selectedScenarioStage) return false;
    } else {
      if (selectedTechCategory !== 'all' && item.type === 'tech' && item.subCategory !== selectedTechCategory) return false;
      if (selectedScenarioStage !== 'all' && item.type === 'scenario' && item.subCategory !== selectedScenarioStage) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
        {/* Header */}
        <div className="bg-bvb-black p-4 px-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span className="p-1 bg-bvb-yellow text-bvb-black rounded-lg text-xs font-mono font-black">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              {title}
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Controls */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="flex gap-1.5 p-1 bg-gray-200/80 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white shadow-sm text-bvb-black font-extrabold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              全部体系 ({allItems.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('tech')}
              className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'tech'
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              基础技术 ({techItems.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('scenario')}
              className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'scenario'
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'text-gray-500 hover:text-emerald-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              比赛场景 ({scenarioItems.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索编码(如YK1/SM1)、主题名称..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-bvb-yellow focus:border-bvb-yellow transition-all"
            />
          </div>
        </div>

        {/* Category Pills Filter */}
        {((activeTab === 'tech' || activeTab === 'all') && techCategories.length > 0) && (
          <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex flex-wrap gap-1.5 items-center shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">基础技术分类:</span>
            <button
              type="button"
              onClick={() => setSelectedTechCategory('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedTechCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              全部技术
            </button>
            {techCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedTechCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  selectedTechCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {((activeTab === 'scenario' || activeTab === 'all') && scenarioStages.length > 0) && (
          <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex flex-wrap gap-1.5 items-center shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">比赛场景阶段:</span>
            <button
              type="button"
              onClick={() => setSelectedScenarioStage('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedScenarioStage === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              全部阶段
            </button>
            {scenarioStages.map(stage => (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedScenarioStage(stage)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  selectedScenarioStage === stage
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/50">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Search className="w-10 h-10 mb-2 stroke-1 text-gray-300" />
              <p className="text-xs font-bold">没有找到匹配的核心训练主题</p>
              <p className="text-[11px] text-gray-400 mt-1">请尝试更换关键字或重置筛选条件</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={`${item.type}-${item.code}`}
                onClick={() => {
                  onSelect(item.focusLabel, `${item.theme} (${item.code})`, item);
                  onClose();
                }}
                className="group cursor-pointer hover:scale-[1.005] transition-all duration-150 relative bg-white border border-gray-200 hover:border-bvb-yellow rounded-xl p-3.5 shadow-sm hover:shadow-md flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
                    item.type === 'tech' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                />
                
                <div className="pl-2 space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono px-2 py-0.5 rounded text-[10.5px] font-black tracking-wider uppercase text-white bg-bvb-black shadow-xs">
                      {item.code}
                    </span>
                    <span className="text-sm font-black text-gray-850 group-hover:text-black transition-colors">
                      {item.theme}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        item.type === 'tech'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {item.focusLabel}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-[11px] text-gray-600 font-medium line-clamp-2 leading-relaxed">
                      <span className="font-extrabold text-gray-700">教学目标: </span>
                      {item.description}
                    </p>
                  )}

                  {item.teachingPoints && (
                    <p className="text-[10.5px] text-gray-400 line-clamp-1">
                      <span className="font-extrabold text-gray-500">关键提示/要点: </span>
                      {item.teachingPoints}
                    </p>
                  )}
                </div>

                <div className="shrink-0 self-end sm:self-center flex items-center gap-2">
                  <span className="px-3.5 py-1.5 bg-gray-50 group-hover:bg-bvb-yellow group-hover:text-bvb-black text-gray-700 rounded-xl text-xs font-black transition-all border border-gray-200 group-hover:border-bvb-yellow shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>选择此主题</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 shrink-0">
          <span>共找到 <strong className="text-gray-800">{filteredItems.length}</strong> 项体系训练内容</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-lg border border-gray-200 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelectorModal;
