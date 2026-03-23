import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Check, Plus, Play } from 'lucide-react';
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
  if (node.children.length === 0) {
    return node.isCompleted ? 100 : 0;
  }
  const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
  return total / node.children.length;
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const CircularProgress: React.FC<{ progress: number, colorClass: string }> = ({ progress, colorClass }) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r={radius} strokeWidth="6" className="stroke-current text-gray-200 dark:text-gray-700" fill="transparent" />
                <circle cx="32" cy="32" r={radius} strokeWidth="6" className={`stroke-current ${colorClass}`} fill="transparent" strokeLinecap="round" style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }} />
            </svg>
            <span className="absolute text-sm font-bold text-gray-800 dark:text-gray-200">{Math.round(progress)}%</span>
        </div>
    );
};

const LinearProgress: React.FC<{ progress: number, colorClass: string }> = ({ progress, colorClass }) => {
    return (
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${colorClass}`} style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }} />
        </div>
    );
};

const SyllabusCard: React.FC<SyllabusCardProps> = ({ node, onUpdate, onPlay, level = 0, subjectTitle, timeSpent = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const progress = calculateProgress(node);
  const isSubject = node.type === 'subject';

  const handleToggleComplete = () => {
    if (node.children.length === 0) {
      onUpdate({ ...node, isCompleted: !node.isCompleted });
    }
  };

  const handleAddChild = () => {
    if (!newTitle.trim()) return;
    
    const childTypes = ['chapter', 'unit', 'topic', 'subtopic'];
    const currentTypeIndex = childTypes.indexOf(node.type);
    const newType = currentTypeIndex >= 0 && currentTypeIndex < childTypes.length - 1 
        ? childTypes[currentTypeIndex + 1] 
        : 'subtopic';

    const newChild: TopicNode = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      type: newType as any,
      children: [],
      isCompleted: false,
    };

    onUpdate({
      ...node,
      children: [...node.children, newChild],
    });
    setNewTitle('');
    setIsAdding(false);
    setIsExpanded(true);
  };

  const handleUpdateChild = (childId: string, updatedChild: TopicNode) => {
    onUpdate({
      ...node,
      children: node.children.map(c => c.id === childId ? updatedChild : c),
    });
  };

  const getSubjectColor = (title: string) => {
      if (title.includes('ACCOUNTING')) return 'text-blue-500';
      if (title.includes('LAWS')) return 'text-slate-500';
      if (title.includes('APTITUDE')) return 'text-yellow-500';
      if (title.includes('ECONOMICS')) return 'text-red-500';
      return 'text-indigo-500';
  };

  const getSubjectBgColor = (title: string) => {
    if (title.includes('ACCOUNTING')) return 'bg-blue-500';
    if (title.includes('LAWS')) return 'bg-slate-500';
    if (title.includes('APTITUDE')) return 'bg-yellow-500';
    if (title.includes('ECONOMICS')) return 'bg-red-500';
    return 'bg-indigo-500';
  };

  const colorClass = isSubject ? getSubjectColor(node.title) : 'bg-blue-500';
  const bgColorClass = isSubject ? getSubjectBgColor(node.title) : 'bg-blue-500';

  return (
    <div className={`w-full ${isSubject ? 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 overflow-hidden' : 'mt-4'}`}>
      <div className={`flex items-center p-4 ${isSubject ? '' : 'py-0'}`}>
        {isSubject ? (
            <CircularProgress progress={progress} colorClass={colorClass} />
        ) : null}
        
        <div className={`flex-grow ${isSubject ? 'ml-4' : ''}`}>
            {isSubject ? (
                <>
                    <h3 className="font-bold text-sm tracking-wide text-gray-900 dark:text-gray-100">{node.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatTime(timeSpent)}</p>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        {isExpanded ? 'Hide Details' : 'See Details'}
                        {isExpanded ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                    </button>
                </>
            ) : (
                <div className="flex flex-col w-full">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{node.title}</span>
                        {node.children.length === 0 && (
                            <button 
                                onClick={handleToggleComplete}
                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${node.isCompleted ? 'bg-indigo-100 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                            >
                                {node.isCompleted && <Check size={14} />}
                            </button>
                        )}
                    </div>
                    {node.children.length > 0 && (
                        <div className="flex items-center gap-3">
                            <LinearProgress progress={progress} colorClass={bgColorClass} />
                            <span className="text-xs text-gray-500 font-medium">{progress.toFixed(1)}%</span>
                        </div>
                    )}
                </div>
            )}
        </div>

        {isSubject && (
            <button 
                onClick={() => onPlay(node.title)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-95 ml-4 ${bgColorClass}`}
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
            <div className={`px-4 pb-4 ${isSubject ? 'pt-4 border-t border-gray-100 dark:border-gray-700' : 'pl-4 border-l-2 border-gray-100 dark:border-gray-700 ml-2 mt-2'}`}>
              {node.children.map(child => (
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
                    placeholder={`New ${node.type === 'subject' ? 'chapter' : node.type === 'chapter' ? 'unit' : 'topic'}...`}
                    className="flex-grow px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
                  />
                  <button onClick={handleAddChild} className="p-2 text-white bg-indigo-500 hover:bg-indigo-600 rounded-md"><Check size={16} /></button>
                  <button onClick={() => setIsAdding(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Cancel</button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 mt-4 py-1"
                >
                  <Plus size={14} className="mr-1" /> Add {node.children.length === 0 ? 'subtopic' : 'more'}
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
