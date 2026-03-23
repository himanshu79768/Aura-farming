import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ChevronRight, Check, Plus, Play } from 'lucide-react';
import { TopicNode } from '../types';

interface SyllabusCardProps {
  node: TopicNode;
  onUpdate: (updatedNode: TopicNode) => void;
  onPlay: (subjectTitle: string) => void;
  level?: number;
  subjectTitle: string;
  timeSpent?: number;
}

const calculateProgress = (node: TopicNode): number => {
  const children = node.children || [];
  if (children.length === 0) {
    return node.isCompleted ? 100 : 0;
  }
  const total = children.reduce((acc, child) => acc + calculateProgress(child), 0);
  return total / children.length;
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const CircularProgress: React.FC<{ progress: number, colorClass: string }> = ({ progress, colorClass }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r={radius} strokeWidth="6" className="stroke-current text-black/5 dark:text-white/5" fill="transparent" />
                <circle cx="40" cy="40" r={radius} strokeWidth="6" className={`stroke-current ${colorClass}`} fill="transparent" strokeLinecap="round" style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }} />
            </svg>
            <span className="absolute text-sm font-bold text-light-text dark:text-dark-text">{Math.round(progress)}%</span>
        </div>
    );
};

const LinearProgress: React.FC<{ progress: number, colorClass: string }> = ({ progress, colorClass }) => {
    return (
        <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full ${colorClass}`} style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }} />
        </div>
    );
};

const SyllabusCard: React.FC<SyllabusCardProps> = ({ node, onUpdate, onPlay, level = 0, subjectTitle, timeSpent = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const children = node.children || [];
  const progress = calculateProgress(node);
  const isSubject = node.type === 'subject';

  const childTypes = ['chapter', 'unit', 'topic', 'subtopic'];
  const currentTypeIndex = childTypes.indexOf(node.type);
  const nextType = currentTypeIndex >= 0 && currentTypeIndex < childTypes.length - 1 
      ? childTypes[currentTypeIndex + 1] 
      : 'subtopic';

  const handleToggleComplete = () => {
    if (children.length === 0) {
      onUpdate({ ...node, isCompleted: !node.isCompleted });
    }
  };

  const handleAddChild = () => {
    if (!newTitle.trim()) return;

    const newChild: TopicNode = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      type: nextType as any,
      children: [],
      isCompleted: false,
    };

    onUpdate({
      ...node,
      children: [...children, newChild],
    });
    setNewTitle('');
    setIsAdding(false);
    setIsExpanded(true);
  };

  const handleUpdateChild = (childId: string, updatedChild: TopicNode) => {
    onUpdate({
      ...node,
      children: children.map(c => c.id === childId ? updatedChild : c),
    });
  };

  const getSubjectColor = (title: string) => {
      if (title.includes('ACCOUNTING')) return 'text-blue-500 dark:text-blue-400';
      if (title.includes('LAWS')) return 'text-slate-500 dark:text-slate-400';
      if (title.includes('APTITUDE')) return 'text-yellow-500 dark:text-yellow-400';
      if (title.includes('ECONOMICS')) return 'text-red-500 dark:text-red-400';
      return 'text-light-accent dark:text-dark-accent';
  };

  const getSubjectBgColor = (title: string) => {
    if (title.includes('ACCOUNTING')) return 'bg-blue-500 dark:bg-blue-600';
    if (title.includes('LAWS')) return 'bg-slate-500 dark:bg-slate-600';
    if (title.includes('APTITUDE')) return 'bg-yellow-500 dark:bg-yellow-600';
    if (title.includes('ECONOMICS')) return 'bg-red-500 dark:bg-red-600';
    return 'bg-light-accent dark:bg-dark-accent';
  };

  const colorClass = isSubject ? getSubjectColor(node.title) : 'bg-light-accent dark:bg-dark-accent';
  const bgColorClass = isSubject ? getSubjectBgColor(node.title) : 'bg-light-accent dark:bg-dark-accent';

  return (
    <div className={`w-full ${isSubject ? 'bg-light-glass dark:bg-dark-glass rounded-2xl shadow-sm border border-white/20 dark:border-white/10 mb-4 overflow-hidden' : 'mt-4'}`}>
      <div className={`flex items-center p-4 ${isSubject ? '' : 'py-0'}`}>
        {isSubject ? (
            <CircularProgress progress={progress} colorClass={colorClass} />
        ) : null}
        
        <div className={`flex-grow ${isSubject ? 'ml-4' : ''}`}>
            {isSubject ? (
                <>
                    <h3 className="font-bold text-sm tracking-wide text-light-text dark:text-dark-text">{node.title}</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">{formatTime(timeSpent)}</p>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex items-center mt-2 hover:text-light-text dark:hover:text-dark-text transition-colors"
                    >
                        {isExpanded ? 'Hide Details' : 'See Details'}
                        {isExpanded ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                    </button>
                </>
            ) : (
                <div className="flex flex-col w-full cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            {children.length > 0 && (
                                isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />
                            )}
                            <span className="text-sm font-medium text-light-text dark:text-dark-text">{node.title}</span>
                        </div>
                        {children.length === 0 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleComplete(); }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${node.isCompleted ? 'bg-blue-500 border-transparent text-white' : 'bg-transparent border-light-text-secondary/30 dark:border-dark-text-secondary/30'}`}
                            >
                                {node.isCompleted && <Check size={14} />}
                            </button>
                        )}
                    </div>
                    {children.length > 0 && (
                        <div className="flex items-center gap-3">
                            <LinearProgress progress={progress} colorClass={bgColorClass} />
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium">{progress.toFixed(1)}%</span>
                        </div>
                    )}
                </div>
            )}
        </div>

        {isSubject && (
            <button 
                onClick={() => onPlay(node.title)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 ml-4 ${bgColorClass}`}
            >
                <Play size={24} className="ml-1" />
            </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 ${isSubject ? 'pt-4 border-t border-white/10 dark:border-white/5' : 'pl-4 border-l-2 border-black/5 dark:border-white/5 ml-2 mt-2'}`}>
              {children.map(child => (
                <SyllabusCard 
                  key={child.id} 
                  node={child} 
                  onUpdate={(updated) => handleUpdateChild(child.id, updated)} 
                  onPlay={onPlay}
                  level={level + 1}
                  subjectTitle={subjectTitle}
                />
              ))}
              
              {isAdding ? (
                <div className="flex items-center mt-4 gap-2">
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={`New ${nextType}...`}
                    className="flex-grow px-3 py-2 text-sm bg-black/5 dark:bg-white/5 border border-white/10 dark:border-white/5 rounded-md focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent text-light-text dark:text-dark-text"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
                  />
                  <button onClick={handleAddChild} className="p-2 text-white bg-light-accent dark:bg-dark-accent rounded-md"><Check size={16} /></button>
                  <button onClick={() => setIsAdding(false)} className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-md">Cancel</button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center text-xs font-medium text-light-accent dark:text-dark-accent mt-4 py-1"
                >
                  <Plus size={14} className="mr-1" /> Add {children.length === 0 ? 'subtopic' : 'more'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyllabusCard;
