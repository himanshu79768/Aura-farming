import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { TrendingUp, Award, CalendarDays, PieChart as PieChartIcon, Clock, Coffee, Sun, Moon, Sunrise, Sunset, Timer, Sparkles, Send, X, User as UserIcon, BookOpen } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import SearchBar from './SearchBar';
import { ACCENT_COLORS } from '../constants';
import OverscrollContainer from './OverscrollContainer';
import { AccentColor, ChatMessage, FocusSession } from '../types';

const API_KEY = "AIzaSyDQa5cGHDW9foJQDu6NHXF7qZ9wkMfAr34";

const getDayKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

type FilterRange = '7d' | '30d' | 'all';

// --- START OF AI CHAT COMPONENTS (Adapted from AuraAiPage) ---

const useTypewriter = (text: string, speed = 0, enabled = true) => {
    const [displayedText, setDisplayedText] = useState('');
    const isFinished = !enabled || displayedText.length === text.length;

    useEffect(() => {
        if (!enabled) {
            setDisplayedText(text);
        } else {
            if (!text.startsWith(displayedText)) {
                setDisplayedText('');
            }
        }
    }, [text, enabled]);

    useEffect(() => {
        if (!enabled || isFinished) return;
        const timer = setTimeout(() => {
            const charsToAdd = 5;
            setDisplayedText(text.slice(0, Math.min(text.length, displayedText.length + charsToAdd)));
        }, speed);
        return () => clearTimeout(timer);
    }, [displayedText, text, speed, enabled, isFinished]);

    return { displayedText, isFinished };
};

const RegularMarkdown: React.FC<{ text: string }> = React.memo(({ text }) => {
    const html = useMemo(() => {
        let formattedStr = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return formattedStr;
    }, [text]);
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

const StreamingMarkdownRenderer: React.FC<{ text: string; animate: boolean; onFinished: () => void; }> = React.memo(({ text, animate, onFinished }) => {
    const { displayedText, isFinished } = useTypewriter(text, 0, animate);
    useEffect(() => { if (isFinished) onFinished(); }, [isFinished, onFinished]);
    const textToRender = animate ? displayedText : text;
    return <RegularMarkdown text={textToRender} />;
});


interface AuraAnalyticsChatProps {
    isOpen: boolean;
    onClose: () => void;
    analyticsData: AnalyticsData | null;
    focusHistory: FocusSession[];
}

const AuraAnalyticsChat: React.FC<AuraAnalyticsChatProps> = ({ isOpen, onClose, analyticsData, focusHistory }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'initial-aura-message',
            role: 'model',
            parts: [{ text: "Hello! I'm here to help you analyze your focus data. Ask me anything about your sessions, productivity patterns, or how you can improve." }]
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [animateLastMessage, setAnimateLastMessage] = useState(false);
    const [finishedTypingMessages, setFinishedTypingMessages] = useState<Set<string>>(new Set(['initial-aura-message']));
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);
    
    useEffect(() => {
        if (textareaRef.current) {
            const el = textareaRef.current;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [input]);

    const handleSend = async () => {
        if (isLoading || !input.trim()) return;

        const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', parts: [{ text: input.trim() }] };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setAnimateLastMessage(true);

        const dataContext = `
            Here is the user's focus data for the selected period:
            - Analytics Summary: ${JSON.stringify(analyticsData, null, 2)}
            - Full Session History: ${JSON.stringify(focusHistory, null, 2)}
        `;

        const systemInstruction = `You are Aura, an AI assistant specializing in productivity and focus analysis. The user wants to understand their focus habits. Your task is to analyze the user's focus data provided below and answer their questions, offering insights, identifying patterns, and suggesting improvements. Be encouraging and data-driven.\n${dataContext}`;
        
        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const historyForApi = messages.map(({ role, parts }) => ({
                role, parts: parts.map(p => 'text' in p ? { text: p.text } : p)
            }));
            
            const chatForSend = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: historyForApi,
                config: { systemInstruction }
            });
            
            let modelResponseText = '';
            const result = await chatForSend.sendMessageStream({ message: input.trim() });
            const modelMessageId = crypto.randomUUID();
            setMessages(prev => [...prev, { id: modelMessageId, role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of result) {
                if (chunk.text) {
                    modelResponseText += chunk.text;
                    setMessages(prev => prev.map(msg => 
                        msg.id === modelMessageId ? { ...msg, parts: [{ text: modelResponseText }] } : msg
                    ));
                }
            }
        } catch (error) {
            console.error("Aura AI Error:", error);
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', parts: [{ text: "Sorry, I'm having trouble connecting right now." }] }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end p-2 bg-black/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="relative w-full max-w-lg h-[70vh] md:h-[80vh] bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-3xl flex flex-col overflow-hidden"
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 cursor-grab">
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        </div>
                        <div className="flex-shrink-0 p-4 pt-6 flex items-center justify-center border-b border-white/10">
                            <h2 className="text-xl font-bold">Aura AI Insights</h2>
                        </div>
                        <OverscrollContainer ref={scrollRef} className="flex-grow w-full overflow-y-auto">
                            <div className="p-4 space-y-6">
                                {messages.map((msg, index) => {
                                    const isLastMessage = index === messages.length - 1;
                                    const animate = isLastMessage && msg.role === 'model' && animateLastMessage;
                                    return (
                                        <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'model' && <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary"><Sparkles size={18} /></div>}
                                            <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-[#9ED3FF] dark:bg-[#3B3939] text-black dark:text-dark-text rounded-br-lg' : 'bg-light-glass dark:bg-dark-glass'}`}>
                                                {'text' in msg.parts[0] && <StreamingMarkdownRenderer text={msg.parts[0].text} animate={animate} onFinished={() => setFinishedTypingMessages(prev => new Set(prev).add(msg.id))} />}
                                            </div>
                                             {msg.role === 'user' && <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-500/10 text-gray-400"><UserIcon size={18} /></div>}
                                        </div>
                                    );
                                })}
                                {isLoading && <div className="flex items-start gap-3 justify-start"><div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary"><Sparkles size={18} /></div><div className="p-3 rounded-2xl bg-light-glass dark:bg-dark-glass"><span className="typing-cursor"> </span></div></div>}
                            </div>
                        </OverscrollContainer>
                        <div className="p-4 flex-shrink-0 border-t border-white/10">
                            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex gap-2 items-end p-1 rounded-full bg-light-glass dark:bg-dark-glass border border-white/10">
                                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your data..." disabled={isLoading} rows={1} className="w-full bg-transparent focus:outline-none resize-none overflow-y-hidden self-center max-h-32 text-base px-3 py-2.5" />
                                <button type="submit" disabled={!input.trim() || isLoading} className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-flow-gradient bg-400% animate-gradient-flow text-white rounded-full disabled:opacity-50 transition-transform duration-200"><Send size={18} /></button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- END OF AI CHAT COMPONENTS ---

const ChartCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <motion.div
        className={`p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10 ${className}`}
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
        }}
    >
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg">{icon}</div>
            {title}
        </h3>
        {children}
    </motion.div>
);

const PieChart: React.FC<{ data: { label: string; value: number }[]; colors: string[]; hole?: number; }> = ({ data, colors, hole = 0 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return <div className="flex items-center justify-center h-40 text-sm text-light-text-secondary dark:text-dark-text-secondary">No data for this period</div>;

    let cumulative = 0;
    const slices = data.map((item, index) => {
        if (item.value === 0) return null;
        const percentage = item.value / total;
        const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((cumulative + item.value) / total) * 2 * Math.PI - Math.PI / 2;
        cumulative += item.value;

        const largeArcFlag = percentage > 0.5 ? 1 : 0;
        const r = 50;
        const rHole = r * (hole / 100);

        const x1 = 50 + r * Math.cos(startAngle);
        const y1 = 50 + r * Math.sin(startAngle);
        const x2 = 50 + r * Math.cos(endAngle);
        const y2 = 50 + r * Math.sin(endAngle);

        let d = `M ${50 + rHole * Math.cos(startAngle)} ${50 + rHole * Math.sin(startAngle)} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${50 + rHole * Math.cos(endAngle)} ${50 + rHole * Math.sin(endAngle)}`;

        if (hole > 0) {
            d += ` A ${rHole} ${rHole} 0 ${largeArcFlag} 0 ${50 + rHole * Math.cos(startAngle)} ${50 + rHole * Math.sin(startAngle)}`;
        }
        
        d += ' Z';
        
        return <motion.path key={index} d={d} fill={colors[index % colors.length]} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeInOut', delay: index * 0.1 }} />;
    });

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="w-40 h-40">
                <svg viewBox="0 0 100 100">{slices}</svg>
            </div>
            <div className="flex flex-col gap-2 text-xs">
                {data.map((item, index) => (
                    item.value > 0 && <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }}></div>
                        <span>{item.label} ({Math.round((item.value / total) * 100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface AnalyticsData {
    totalSeconds: number;
    longestSession: number;
    mostProductiveDay: { date: string; minutes: number; };
    timeOfDayData: Record<string, number>;
    dayOfWeekData: Record<string, number>;
    sessionLengthData: Record<string, number>;
    dailyTrendData: { date: string; minutes: number; }[];
}

const FocusAnalyticsPage: React.FC = () => {
    const { focusHistory, navigateBack, focusSearchQuery, setFocusSearchQuery, settings, vibrate } = useAppContext();
    const [filter, setFilter] = useState<FilterRange>('7d');
    const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);

    const chartColors = useMemo(() => {
        const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const themeKey = isDark ? 'dark' : 'light';
        const palette: AccentColor[] = ['blue', 'purple', 'pink', 'orange', 'green', 'teal', 'cyan'];
        return palette.map(colorName => `hsl(${ACCENT_COLORS[colorName][themeKey]})`);
    }, [settings.theme]);

    const filteredHistory = useMemo(() => {
        const searchFilteredHistory = focusSearchQuery.trim()
            ? focusHistory.filter(session => 
                session.name?.toLowerCase().includes(focusSearchQuery.toLowerCase()) || 
                session.subject?.toLowerCase().includes(focusSearchQuery.toLowerCase())
              )
            : focusHistory;

        if (filter === 'all') return searchFilteredHistory;

        const now = new Date();
        const daysToSubtract = filter === '7d' ? 7 : 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - daysToSubtract);
        cutoffDate.setHours(0, 0, 0, 0);

        return searchFilteredHistory.filter(session => new Date(session.date) >= cutoffDate);
    }, [focusHistory, filter, focusSearchQuery]);

    const analyticsData = useMemo<AnalyticsData | null>(() => {
        if (filteredHistory.length === 0) return null;
        
        const totalSeconds = filteredHistory.reduce((acc, s) => acc + s.duration, 0);
        const longestSession = Math.round(Math.max(...filteredHistory.map(s => s.duration), 0) / 60);

        const dailyMinutes = filteredHistory.reduce<Record<string, number>>((acc, s) => {
            const day = getDayKey(new Date(s.date));
            acc[day] = (acc[day] || 0) + s.duration / 60;
            return acc;
        }, {});
        
        const [date, minutes] = Object.entries(dailyMinutes).reduce(
            (max, [date, minutes]) => (minutes > max[1] ? [date, minutes] : max),
            ['', 0]
        );
        // FIX: Explicitly convert `minutes` to a number before passing to Math.round to fix type error.
        const mostProductiveDay = { date, minutes: Math.round(Number(minutes)) };
        
        // FIX: Explicitly convert `minutes` to a number before passing to Math.round to fix type error.
        const dailyTrendData = Object.entries(dailyMinutes).map(([date, minutes]) => ({ date, minutes: Math.round(Number(minutes)) })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const timeOfDayData: Record<string, number> = { 'Morning (6-12)': 0, 'Afternoon (12-6)': 0, 'Evening (6-12)': 0, 'Night (12-6)': 0 };
        const dayOfWeekData: Record<string, number> = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
        const sessionLengthData: Record<string, number> = { '0-15m': 0, '15-30m': 0, '30-60m': 0, '60m+': 0 };
        const subjectData: Record<string, number> = {};

        filteredHistory.forEach(session => {
            const date = new Date(session.date);
            const hour = date.getHours();
            const day = date.getDay();
            const minutes = session.duration / 60;

            if (hour >= 6 && hour < 12) timeOfDayData['Morning (6-12)']++;
            else if (hour >= 12 && hour < 18) timeOfDayData['Afternoon (12-6)']++;
            else if (hour >= 18 && hour < 24) timeOfDayData['Evening (6-12)']++;
            else timeOfDayData['Night (12-6)']++;
            
            dayOfWeekData[Object.keys(dayOfWeekData)[day]]++;

            if (minutes <= 15) sessionLengthData['0-15m']++;
            else if (minutes <= 30) sessionLengthData['15-30m']++;
            else if (minutes <= 60) sessionLengthData['30-60m']++;
            else sessionLengthData['60m+']++;

            const subject = session.subject || 'Uncategorized';
            subjectData[subject] = (subjectData[subject] || 0) + minutes;
        });

        return { totalSeconds, longestSession, mostProductiveDay, timeOfDayData, dayOfWeekData, sessionLengthData, dailyTrendData, subjectData };
    }, [filteredHistory]);

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Analytics" showBackButton onBack={navigateBack} />
            <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-2 flex-shrink-0">
                <SearchBar
                    placeholder="Search sessions or subjects..."
                    searchQuery={focusSearchQuery}
                    setSearchQuery={setFocusSearchQuery}
                />
            </div>
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-4xl mx-auto p-4">
                    <div className="pt-2 pb-24">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <div className="flex items-center bg-light-glass dark:bg-dark-glass p-1 rounded-full border border-white/10">
                                {(['7d', '30d', 'all'] as FilterRange[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1 text-sm rounded-full transition-colors ${filter === f ? 'bg-light-bg-secondary dark:bg-dark-bg-secondary' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
                                    >
                                        {f === 'all' ? 'All Time' : `Last ${f.replace('d', '')} days`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {analyticsData ? (
                            <motion.div 
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.1 } }
                                }}
                            >
                                <ChartCard title="Total Time" icon={<Clock size={16}/>}>
                                    <p className="text-4xl font-bold">{Math.round(analyticsData.totalSeconds / 60)} <span className="text-xl font-medium text-light-text-secondary dark:text-dark-text-secondary">min</span></p>
                                </ChartCard>
                                <ChartCard title="Longest Session" icon={<Award size={16}/>}>
                                    <p className="text-4xl font-bold">{analyticsData.longestSession} <span className="text-xl font-medium text-light-text-secondary dark:text-dark-text-secondary">min</span></p>
                                </ChartCard>
                                <ChartCard title="Most Productive Day" icon={<TrendingUp size={16}/>}>
                                    <p className="text-2xl font-bold">{analyticsData.mostProductiveDay.minutes} <span className="text-base font-medium text-light-text-secondary dark:text-dark-text-secondary">min</span></p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{new Date(analyticsData.mostProductiveDay.date).toLocaleDateString(undefined, { weekday: 'long' })}</p>
                                </ChartCard>
                                
                                <ChartCard title="Sessions by Time of Day" icon={<PieChartIcon size={16}/>} className="md:col-span-1 lg:col-span-1">
                                    <PieChart 
                                        data={Object.entries(analyticsData.timeOfDayData).map(([label, value]) => ({ label, value }))} 
                                        colors={chartColors}
                                        hole={40}
                                    />
                                </ChartCard>
                                 <ChartCard title="Sessions by Day" icon={<CalendarDays size={16}/>} className="md:col-span-2 lg:col-span-2">
                                     <div className="flex justify-around items-end h-48 gap-1 text-xs text-center text-light-text-secondary dark:text-dark-text-secondary pb-[28px] pt-[28px]">
                                        {(() => {
                                            const dayDataValues = Object.values(analyticsData.dayOfWeekData);
                                            const maxCount = dayDataValues.length > 0 ? Math.max(...dayDataValues.map(v => Number(v))) : 0;
                                            return Object.entries(analyticsData.dayOfWeekData).map(([day, countValue], index) => {
                                                const count = Number(countValue);
                                                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                return (
                                                    <div key={day} className="flex flex-col items-center flex-grow h-full justify-end relative">
                                                        <div className="font-semibold text-light-text dark:text-dark-text absolute -top-6 text-xs">{count}</div>
                                                        <motion.div
                                                            className="w-full rounded-t-sm"
                                                            style={{ backgroundColor: chartColors[index % chartColors.length], height: `${height}%` }}
                                                            initial={{ scaleY: 0, originY: 1 }}
                                                            animate={{ scaleY: 1 }}
                                                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                                        />
                                                        <div className="absolute -bottom-[22px] text-xs">{day}</div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                     </div>
                                 </ChartCard>
                                 <ChartCard title="Session Length Distribution" icon={<Timer size={16}/>} className="md:col-span-2 lg:col-span-3">
                                     <PieChart 
                                        data={Object.entries(analyticsData.sessionLengthData).map(([label, value]) => ({ label, value }))} 
                                        colors={chartColors}
                                    />
                                 </ChartCard>
                                 <ChartCard title="Daily Target Progress" icon={<Award size={16}/>} className="md:col-span-2 lg:col-span-3">
                                     <div className="flex flex-col text-xs text-center text-light-text-secondary dark:text-dark-text-secondary">
                                        {(() => {
                                            const targetMinutes = (settings.dailyTargetHours || 4) * 60;
                                            const trendData = analyticsData.dailyTrendData.slice(-7);
                                            const maxMinutes = Math.max(...trendData.map(d => d.minutes), targetMinutes);
                                            const targetPct = (targetMinutes / maxMinutes) * 100;

                                            return (
                                                <>
                                                    {/* Bar area with target line */}
                                                    <div className="relative h-44 w-full mb-2">
                                                        {/* Target dotted line — purely inside bar area */}
                                                        <div
                                                            className="absolute left-0 right-0 border-t border-dashed border-light-accent dark:border-dark-accent opacity-60 z-10 pointer-events-none"
                                                            style={{ bottom: `${targetPct}%` }}
                                                        >
                                                            <span className="absolute -top-4 right-0 text-xs text-light-accent dark:text-dark-accent font-medium">
                                                                {settings.dailyTargetHours || 4}h goal
                                                            </span>
                                                        </div>

                                                        {/* Bars row */}
                                                        <div className="absolute inset-0 flex justify-around items-end gap-1">
                                                            {trendData.map((data) => {
                                                                const height = maxMinutes > 0 ? (data.minutes / maxMinutes) * 100 : 0;
                                                                const isTargetMet = data.minutes >= targetMinutes;
                                                                return (
                                                                    <div key={data.date} className="flex flex-col items-center flex-grow h-full justify-end z-10 relative">
                                                                        <div className="font-semibold text-light-text dark:text-dark-text absolute -top-5 text-[10px] whitespace-nowrap">
                                                                            {Math.floor(data.minutes / 60)}h {data.minutes % 60}m
                                                                        </div>
                                                                        <motion.div
                                                                            className={`w-full rounded-t-sm ${isTargetMet ? 'bg-green-500' : 'bg-light-primary dark:bg-dark-primary'}`}
                                                                            style={{ height: `${height}%` }}
                                                                            initial={{ scaleY: 0, originY: 1 }}
                                                                            animate={{ scaleY: 1 }}
                                                                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Day labels row below */}
                                                    <div className="flex justify-around gap-1 mt-1">
                                                        {trendData.map((data) => {
                                                            const dateObj = new Date(data.date);
                                                            const dayStr = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                                                            return (
                                                                <div key={data.date} className="flex-grow text-center text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                                    {dayStr}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                     </div>
                                 </ChartCard>
                                 <ChartCard title="Time by Subject" icon={<BookOpen size={16}/>} className="md:col-span-2 lg:col-span-3">
                                     <PieChart 
                                        data={Object.entries(analyticsData.subjectData).map(([label, value]) => ({ label, value }))} 
                                        colors={Object.keys(analyticsData.subjectData).map(subject => {
                                            const t = subject.toUpperCase();
                                            if (t.includes('ACCOUNTING')) return '#60a5fa';
                                            if (t.includes('LAWS'))       return '#facc15';
                                            if (t.includes('APTITUDE'))   return '#f472b6';
                                            if (t.includes('ECONOMICS'))  return '#c084fc';
                                            return '#8b5cf6';
                                        })}
                                    />
                                 </ChartCard>
                            </motion.div>
                        ) : (
                            <motion.div 
                                className="text-center text-light-text-secondary dark:text-dark-text-secondary py-24"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            >
                                <p>No focus data available for this period.</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </OverscrollContainer>
            <AnimatePresence>
                <motion.button
                    onClick={() => { vibrate(); setIsAiSheetOpen(true); }}
                    className="absolute bottom-6 right-6 group z-20"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Aura AI Insights"
                    initial={{ scale: 0, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                    <div className="absolute -inset-1 bg-flow-gradient bg-400% animate-gradient-flow rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative w-16 h-16 flex items-center justify-center bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-lg">
                        <Sparkles size={24} className="text-cyan-400"/>
                    </div>
                </motion.button>
            </AnimatePresence>
            <AuraAnalyticsChat isOpen={isAiSheetOpen} onClose={() => setIsAiSheetOpen(false)} analyticsData={analyticsData} focusHistory={filteredHistory} />
            <style>{`
                @keyframes typing-blink {
                    0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; }
                }
                .typing-cursor::after {
                    content: '▋'; animation: typing-blink 1s infinite;
                }
            `}</style>
        </div>
    );
};

export default FocusAnalyticsPage;
