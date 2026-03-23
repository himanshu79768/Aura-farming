
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User as UserIcon, Copy, Share2, ThumbsUp, ThumbsDown, Check, Mic, Paperclip, SquarePen, MicOff, X, Image as ImageIcon, FileText, Clock, BookText, BrainCircuit, Wind, CheckCircle, MessageSquare, BookOpen, ChevronDown, Repeat, TextSelect, ChevronRight, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { GoogleGenAI, Chat, Part, Modality, Type, FunctionDeclaration } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { useAppContext } from '../App';
import Header from './Header';
import { ChatMessage, JournalEntry, ChatSession } from '../types';
import AttachmentTypeModal from './AttachmentTypeModal';
import OverscrollContainer from './OverscrollContainer';
import SearchBar from './SearchBar';
import { generateImageForJournal } from '../services/geminiService';


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const API_KEY = "AIzaSyDQa5cGHDW9foJQDu6NHXF7qZ9wkMfAr34";

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

const dataURLToUint8Array = (dataURL: string) => {
    const base64 = dataURL.split(',')[1];
    if (!base64) return new Uint8Array(0);
    try {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Failed to decode base64 string:", e);
        return new Uint8Array(0);
    }
};

const markdownToPlainText = (markdown: string): string => {
    let text = markdown;

    // KaTeX formulas - attempt to simplify
    text = text.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
        return formula
            .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '($1) / ($2)')
            .replace(/\\text\{(.*?)\}/g, '$1')
            .replace(/\\/g, '')
            .replace(/\{/g, '(')
            .replace(/\}/g, ')')
            .replace(/_/g, '_') // Keep subscript character for context
            .replace(/\s+/g, ' ')
            .trim();
    });

    // Image generation syntax
    text = text.replace(/!\[Image:\s*([\s\S]*?)\]/g, '[Generated Image: $1]');

    // Headings
    text = text.replace(/^#+\s+/gm, '');

    // Bold, Italic, Strikethrough, Underline from custom markdown
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/~~(.*?)~~/g, '$1');

    // Links
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');

    // Lists
    text = text.replace(/^\s*[-*]\s+/gm, '• ');
    
    // Ordered Lists
    const olItems = text.match(/^\s*\d+\.\s+/gm);
    if (olItems) {
        let counter = 1;
        text = text.replace(/^\s*\d+\.\s+/gm, () => `  ${counter++}. `);
    }


    // Horizontal Rule
    text = text.replace(/^---$/gm, '------------------');

    // Code blocks
    text = text.replace(/```(\w*\n)?([\s\S]+?)```/g, '$2');
    // Inline code
    text = text.replace(/`(.*?)`/g, '$1');

    return text.trim();
};


const ImageGenerator: React.FC<{ prompt: string }> = ({ prompt }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const generate = async () => {
            if (!prompt) {
                setError("Empty prompt.");
                setIsLoading(false);
                return;
            }
            try {
                const base64Data = await generateImageForJournal(prompt);
                if (isMounted) {
                    if (base64Data) {
                        setImageUrl(`data:image/png;base64,${base64Data}`);
                    } else {
                        setError("Failed to generate image.");
                    }
                    setIsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Image generation error:", err);
                    setError("An error occurred during generation.");
                    setIsLoading(false);
                }
            }
        };

        generate();

        return () => { isMounted = false; };
    }, [prompt]);

    if (isLoading) {
        return (
            <div className="my-2 p-4 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse flex flex-col items-center justify-center h-48 border border-white/10">
                <ImageIcon size={32} className="text-light-text-secondary dark:text-dark-text-secondary" />
                <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary mt-2">Generating image for:</p>
                <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary font-medium italic">"{decodeURIComponent(prompt)}"</p>
            </div>
        );
    }

    if (error) {
        return <p className="text-red-500 text-sm my-2">Error generating image: {error}</p>;
    }

    if (imageUrl) {
        const decodedPrompt = decodeURIComponent(prompt);
        return (
             <figure className="my-2">
                <img src={imageUrl} alt={decodedPrompt} className="max-w-full rounded-lg border border-white/10" />
                <figcaption className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary mt-2 italic">
                    {decodedPrompt}
                </figcaption>
            </figure>
        );
    }

    return null;
};

const CodeBlock: React.FC<{ codeWithLang: string }> = ({ codeWithLang }) => {
    const [isCopied, setIsCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    const fullCode = codeWithLang.replace(/^```(\w*\n)?|```$/g, '');
    const lang = codeWithLang.match(/^```(\w*)/)?.[1] || '';

    const handleCopy = () => {
        if (codeRef.current) {
            navigator.clipboard.writeText(codeRef.current.innerText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="relative group my-4 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 shadow-lg bg-white dark:bg-black/20 max-w-full">
            <div className="flex items-center justify-between px-4 py-2 bg-black/5 dark:bg-black/40 border-b border-black/5 dark:border-white/5">
                <span className="text-[10px] font-mono text-black/50 dark:text-white/50 uppercase tracking-widest font-bold">{lang || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-black/70 dark:text-white/70 transition-colors"
                    aria-label="Copy code"
                >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="m-0"><code ref={codeRef} className={`language-${lang} font-mono text-sm leading-relaxed whitespace-pre text-black/90 dark:text-white/90`} style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{fullCode}</code></pre>
            </div>
        </div>
    );
};

const GeneratingTableIndicator: React.FC = () => (
    <div className="my-2 p-4 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse flex items-center justify-center gap-2 border border-white/10">
        <div className="w-5 h-5 border-2 border-dashed rounded-md border-light-text-secondary dark:border-dark-text-secondary animate-spin"></div>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Generating table...</p>
    </div>
);

const RegularMarkdown: React.FC<{ text: string }> = React.memo(({ text }) => {
    const html = useMemo(() => {
        const applyInlineFormatting = (str: string) => {
            let formattedStr = str
                .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 0.5rem; margin: 0.5rem 0;" />')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/__(.*?)__/g, '<u>$1</u>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/~~(.*?)~~/g, '<s>$1</s>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\^(.*?)\^/g, '<sup>$1</sup>')
                .replace(/~(.*?)~/g, '<sub>$1</sub>');
            
            if ((window as any).katex) {
                formattedStr = formattedStr.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
                    try {
                        return (window as any).katex.renderToString(formula.trim(), {
                            displayMode: true,
                            throwOnError: false,
                        });
                    } catch (e) {
                        console.error("KaTeX rendering error:", e);
                        return `<div class="math-formula-block">${formula.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
                    }
                });
            } else {
                formattedStr = formattedStr.replace(/\$\$(.*?)\$\$/gs, '<div class="math-formula-block">$1</div>');
            }
            return formattedStr;
        };
        
        const lines = text.split('\n');
        const htmlElements: string[] = [];
        let inList: 'ul' | 'ol' | null = null;
        let i = 0;

        const closeList = () => {
            if (inList) {
                htmlElements.push(`</${inList}>`);
                inList = null;
            }
        };

        while (i < lines.length) {
            const line = lines[i];

            const tableHeaderMatch = line.match(/^\s*\|(.+)\|?\s*$/);
            const tableSeparatorMatch = (i + 1 < lines.length) && lines[i+1]?.match(/^\s*\|?(\s*:?-+:?\s*\|?)+\s*$/);
            const blockquoteMatch = line.match(/^\s*>\s?(.*)/);

            if (tableHeaderMatch && tableSeparatorMatch) {
                closeList();
                const tableRows: string[] = [];
                let tableLineIndex = i;
                
                while (tableLineIndex < lines.length && (lines[tableLineIndex].match(/^\s*\|/) || lines[tableLineIndex].match(/^\s*\|?(\s*:?-+:?\s*\|?)+\s*$/))) {
                    tableRows.push(lines[tableLineIndex]);
                    tableLineIndex++;
                }

                const parseRow = (rowLine: string) => {
                    const content = rowLine.trim().replace(/^\||\|$/g, '');
                    return content.split('|').map(cell => cell.trim());
                }

                const headers = parseRow(tableRows[0]);
                const bodyRows = tableRows.slice(2).map(parseRow);

                let tableHtml = '<table class="aura-table"><thead><tr>';
                headers.forEach(header => {
                    tableHtml += `<th>${applyInlineFormatting(header)}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';

                bodyRows.forEach(row => {
                    tableHtml += '<tr>';
                    for (let k = 0; k < headers.length; k++) {
                        const cell = row[k] || '';
                        tableHtml += `<td>${applyInlineFormatting(cell)}</td>`;
                    }
                    tableHtml += '</tr>';
                });

                tableHtml += '</tbody></table>';
                htmlElements.push(tableHtml);
                
                i = tableLineIndex;
                continue;

            } else if (blockquoteMatch) {
                closeList();
                let bqContent = '';
                let bqLineIndex = i;
                while (bqLineIndex < lines.length && lines[bqLineIndex].match(/^\s*>/)) {
                    bqContent += lines[bqLineIndex].replace(/^\s*>\s?/, '') + '\n';
                    bqLineIndex++;
                }
                htmlElements.push(`<blockquote>${applyInlineFormatting(bqContent.trim())}</blockquote>`);
                i = bqLineIndex;
                continue;
            }
            
            const ulMatch = line.match(/^(\s*)(\*|-)\s+(.*)/);
            const olMatch = line.match(/^(\s*)(\d+\.)\s+(.*)/);
            const h1Match = line.match(/^#\s+(.*)/);
            const h2Match = line.match(/^##\s+(.*)/);
            const h3Match = line.match(/^###\s+(.*)/);
            const h4Match = line.match(/^####\s+(.*)/);
            const hrMatch = line.trim().match(/^(-{3,}|\*{3,}|_{3,})$/);
            const isBlankLine = line.trim() === '';

            if (ulMatch) {
                if (inList !== 'ul') {
                    closeList();
                    htmlElements.push('<ul>');
                    inList = 'ul';
                }
                let listItemContent = ulMatch[3];
                const todoUncheckedMatch = listItemContent.match(/^\[ \]\s+(.*)/);
                if (todoUncheckedMatch) {
                    listItemContent = `<label style="display: flex; align-items: start; gap: 0.5em; cursor: default;"><input type="checkbox" disabled style="margin-top: 0.25em;" /><span>${applyInlineFormatting(todoUncheckedMatch[1])}</span></label>`;
                } else {
                    const todoCheckedMatch = listItemContent.match(/^\[x\]\s+(.*)/i);
                    if (todoCheckedMatch) {
                        listItemContent = `<label style="display: flex; align-items: start; gap: 0.5em; cursor: default;"><input type="checkbox" checked disabled style="margin-top: 0.25em;" /><span style="text-decoration: line-through; opacity: 0.7;">${applyInlineFormatting(todoCheckedMatch[1])}</span></label>`;
                    } else {
                        listItemContent = applyInlineFormatting(listItemContent);
                    }
                }
                htmlElements.push(`<li>${listItemContent}</li>`);
            } else if (olMatch) {
                if (inList !== 'ol') {
                    closeList();
                    htmlElements.push('<ol>');
                    inList = 'ol';
                }
                htmlElements.push(`<li>${applyInlineFormatting(olMatch[3])}</li>`);
            } else if (h1Match) {
                closeList();
                htmlElements.push(`<h1>${applyInlineFormatting(h1Match[1])}</h1>`);
            } else if (h2Match) {
                closeList();
                htmlElements.push(`<h2>${applyInlineFormatting(h2Match[1])}</h2>`);
            } else if (h3Match) {
                closeList();
                htmlElements.push(`<h3>${applyInlineFormatting(h3Match[1])}</h3>`);
            } else if (h4Match) {
                closeList();
                htmlElements.push(`<h4>${applyInlineFormatting(h4Match[1])}</h4>`);
            } else if (hrMatch) {
                closeList();
                htmlElements.push('<hr />');
            } else if (isBlankLine) {
                if (inList && htmlElements.length > 0 && !htmlElements[htmlElements.length - 1].endsWith('</p>')) {
                    // Logic for blank lines within lists.
                } else {
                    closeList();
                }
                if(!inList) htmlElements.push('<p><br></p>');

            } else {
                closeList();
                htmlElements.push(`<p>${applyInlineFormatting(line)}</p>`);
            }

            i++;
        }

        closeList();
        
        return htmlElements.join('').replace(/(<p><br><\/p>){2,}/g, '<p><br></p>');
    }, [text]);

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
});


const useTypewriter = (text: string, speed = 0, enabled = true) => {
    const [displayedText, setDisplayedText] = useState('');
    const isFinished = !enabled || displayedText.length === text.length;

    useEffect(() => {
        if (!enabled) {
            setDisplayedText(text);
        } else {
            // Reset if it's a completely new message (text doesn't start with old text)
            if (!text.startsWith(displayedText)) {
                setDisplayedText('');
            }
        }
    }, [text, enabled]);

    useEffect(() => {
        if (!enabled || isFinished) return;

        const timer = setTimeout(() => {
            const charsToAdd = 5; // Increased speed
            setDisplayedText(text.slice(0, Math.min(text.length, displayedText.length + charsToAdd)));
        }, speed);

        return () => clearTimeout(timer);
    }, [displayedText, text, speed, enabled, isFinished]);

    return { displayedText, isFinished };
};

const StreamingMarkdownRenderer: React.FC<{ text: string; animate: boolean, onFinished: () => void; }> = React.memo(({ text, animate, onFinished }) => {
    const { displayedText, isFinished } = useTypewriter(text, 0, animate);
    const onFinishedRef = useRef(onFinished);
    onFinishedRef.current = onFinished;

    useEffect(() => {
        if (isFinished) {
            onFinishedRef.current();
        }
    }, [isFinished]);

    const textToRender = animate ? displayedText : text;

    const content = useMemo(() => {
        const regex = /(```[\s\S]*?```|!\[Image:[\s\S]*?\]|^(?:\|.*\|[^\r\n]*\r?\n?)+)/gm;
        
        if (!animate) {
            const parts = text.split(regex).filter(Boolean);
            return parts.map((part, index) => {
                if (part.startsWith('```')) return <CodeBlock key={index} codeWithLang={part} />;
                if (part.startsWith('![Image:')) {
                    const match = part.match(/!\[Image:\s*(?:\{)?([\s\S]*?)(?:\})?\]/);
                    if (match?.[1]) return <ImageGenerator key={index} prompt={match[1]} />;
                }
                return <RegularMarkdown key={index} text={part} />;
            });
        }

        const fullParts = text.split(regex).filter(Boolean);
        let traversedLength = 0;

        return fullParts.map((part, index) => {
            const partStart = traversedLength;
            const partEnd = partStart + part.length;
            traversedLength = partEnd;
            
            const isSpecialBlock = part.startsWith('```') || part.startsWith('![Image:') || part.trim().startsWith('|');

            if (isSpecialBlock) {
                const isTable = part.trim().startsWith('|');

                if (textToRender.length >= partEnd) {
                    if (part.startsWith('```')) return <CodeBlock key={index} codeWithLang={part} />;
                    if (part.startsWith('![Image:')) {
                        const match = part.match(/!\[Image:\s*(?:\{)?([\s\S]*?)(?:\})?\]/);
                        if (match?.[1]) return <ImageGenerator key={index} prompt={match[1]} />;
                    }
                    if (isTable) {
                         return <RegularMarkdown key={index} text={part} />;
                    }
                } else if (isTable && textToRender.length > partStart) {
                    return <GeneratingTableIndicator key={index} />;
                }
                return null; // Don't render incomplete special blocks
            } else {
                const visibleLength = Math.max(0, textToRender.length - partStart);
                const visiblePart = part.substring(0, visibleLength);
                return <RegularMarkdown key={index} text={visiblePart} />;
            }
        });
    }, [text, textToRender, animate]);

    return <div className="prose-styles">{content}</div>;
});

const WordIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className}>
      <defs>
        <linearGradient id="wordGradient" x1="9" x2="33.506" y1="364.445" y2="364.445" gradientTransform="translate(0 -339.89)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#66c0ff" />
          <stop offset=".26" stopColor="#0094f0" />
        </linearGradient>
      </defs>
      <path fill="#283593" d="M9,33.595l14.911-18.706L41,26v13.306C41,41.346,39.346,43,37.306,43H15.332 C11.835,43,9,40.164,9,36.667C9,36.667,9,33.595,9,33.595z"></path>
      <path fill="url(#wordGradient)" d="M9,20.208c0-2.624,2.126-4.75,4.749-4.75h21.857L41,12.778v13.527 C41,28.346,39.346,30,37.306,30H15.332C11.835,30,9,32.836,9,36.333L9,20.208L9,20.208z"></path>
      <path fill="#1e88e5" fillOpacity=".6" d="M9,20.208c0-2.624,2.126-4.75,4.749-4.75h21.857L41,12.778v13.527 C41,28.346,39.346,30,37.306,30H15.332C11.835,30,9,32.836,9,36.333L9,20.208L9,20.208z"></path>
      <path fill="#00e5ff" d="M9,10.333C9,6.836,11.835,4,15.332,4h21.975C39.346,4,41,5.654,41,7.694v5.611 C41,15.346,39.346,17,37.306,17H15.332C11.835,17,9,19.836,9,23.333C9,23.333,9,10.333,9,10.333z"></path>
      <path fill="#1565c0" d="M7.5,23h10c1.933,0,3.5,1.567,3.5,3.5v10c0,1.933-1.567,3.5-3.5,3.5h-10C5.567,40,4,38.433,4,36.5 v-10C4,24.567,5.567,23,7.5,23z"></path>
      <path fill="#fff" d="M18.327,26.643l-2.092,9.713l-2.501,0.002L12.5,30.529l-1.293,5.829H8.683l-2.01-9.713h2.062 l1.24,6.41l1.232-6.41h2.528l1.291,6.41l1.21-6.41L18.327,26.643L18.327,26.643z"></path>
    </svg>
);

const PdfIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-label="PDF" role="img" viewBox="0 0 512 512" className={className}>
      <rect width="512" height="512" rx="15%" fill="#c80a0a" />
      <path fill="#ffffff" d="M413 302c-9-10-29-15-56-15-16 0-33 2-53 5a252 252 0 0 1-52-69c10-30 17-59 17-81 0-17-6-44-30-44-7 0-13 4-17 10-10 18-6 58 13 100a898 898 0 0 1-50 117c-53 22-88 46-91 65-2 9 4 24 25 24 31 0 65-45 91-91a626 626 0 0 1 92-24c38 33 71 38 87 38 32 0 35-23 24-35zM227 111c8-12 26-8 26 16 0 16-5 42-15 72-18-42-18-75-11-88zM100 391c3-16 33-38 80-57-26 44-52 72-68 72-10 0-13-9-12-15zm197-98a574 574 0 0 0-83 22 453 453 0 0 0 36-84 327 327 0 0 0 47 62zm13 4c32-5 59-4 71-2 29 6 19 41-13 33-23-5-42-18-58-31z"/>
    </svg>
);

const PptIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className}>
        <defs>
            <linearGradient id="a" x1="4.494" y1="-1748.086" x2="13.832" y2="-1731.914" gradientTransform="translate(0 1756)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ca4c28" />
            <stop offset="0.5" stopColor="#c5401e" />
            <stop offset="1" stopColor="#b62f14" />
            </linearGradient>
        </defs>
        <path d="M18.93,17.3,16.977,3h-.146A12.9,12.9,0,0,0,3.953,15.854V16Z" fill="#ed6c47" />
        <path d="M17.123,3h-.146V16l6.511,2.6L30,16v-.146A12.9,12.9,0,0,0,17.123,3Z" fill="#ff8f6b" />
        <path d="M30,16v.143A12.905,12.905,0,0,1,17.12,29h-.287A12.907,12.907,0,0,1,3.953,16.143V16Z" fill="#d35230" />
        <path d="M3.194,8.85H15.132a1.193,1.193,0,0,1,1.194,1.191V21.959a1.193,1.193,0,0,1-1.194,1.191H3.194A1.192,1.192,0,0,1,2,21.959V10.041A1.192,1.192,0,0,1,3.194,8.85Z" fill="url(#a)" />
        <path d="M9.293,12.028a3.287,3.287,0,0,1,2.174.636,2.27,2.27,0,0,1,.756,1.841,2.555,2.555,0,0,1-.373,1.376,2.49,2.49,0,0,1-1.059.935A3.607,3.607,0,0,1,9.2,17.15H7.687v2.8H6.141V12.028ZM7.686,15.94H9.017a1.735,1.735,0,0,0,1.177-.351,1.3,1.3,0,0,0,.4-1.025q0-1.309-1.525-1.31H7.686V15.94Z" fill="#fff" />
    </svg>
);

const AttachmentIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
    if (type.startsWith('image/')) return <ImageIcon className={className} />;
    if (type === 'application/pdf') return <PdfIcon className={className} />;
    if (type.includes('word')) return <WordIcon className={className} />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <PptIcon className={className} />;
    if (type === 'application/vnd.aura.journal') return <BookText className={className} />;
    return <FileText className={className} />;
};

type LocalAttachment = { id: string; data: string; mimeType: string; name: string };

const AttachmentPreview: React.FC<{ attachment: LocalAttachment; onRemove: () => void; }> = ({ attachment, onRemove }) => {
    const isImage = attachment.mimeType.startsWith('image/');
    return (
        <motion.div
            layout
            className="relative flex-shrink-0 mt-2 mr-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
            <div className="w-32 h-32 rounded-xl border border-white/10 bg-light-bg-secondary dark:bg-dark-bg">
                {isImage ? (
                    <img src={attachment.data} alt={attachment.name} className="w-full h-full object-contain rounded-xl" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                        <div className="w-14 h-14">
                            <AttachmentIcon type={attachment.mimeType} className="w-full h-full" />
                        </div>
                        <p className="text-xs mt-2 leading-tight break-words w-full line-clamp-3">{attachment.name}</p>
                    </div>
                )}
            </div>
            <button onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center border-2 border-light-bg-secondary dark:border-dark-bg-secondary shadow-md">
                <X size={14} />
            </button>
        </motion.div>
    );
};

// --- Audio Helper Functions ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface JournalContextModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddContext: (selectedJournals: JournalEntry[]) => void;
}

const JournalContextModal: React.FC<JournalContextModalProps> = ({ isOpen, onClose, onAddContext }) => {
    const { journalEntries, vibrate, playUISound } = useAppContext();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredJournals = useMemo(() => {
        if (!searchQuery.trim()) {
            return journalEntries;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return journalEntries.filter(entry =>
            entry.title?.toLowerCase().includes(lowerCaseQuery) ||
            entry.content.toLowerCase().includes(lowerCaseQuery)
        );
    }, [journalEntries, searchQuery]);

    const handleToggle = (id: string) => {
        vibrate();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAddContext = () => {
        playUISound('success');
        const selectedJournals = journalEntries.filter(j => selectedIds.includes(j.id));
        onAddContext(selectedJournals);
        onClose();
        // Reset state for next time
        setSelectedIds([]);
        setSearchQuery('');
    };
    
    const handleClose = () => {
        playUISound('tap');
        onClose();
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end justify-center p-2 bg-black/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                >
                    <motion.div
                        className="relative w-full max-w-lg h-[60vh] md:h-[60vh] bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-3xl flex flex-col overflow-hidden"
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 100) handleClose(); }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 cursor-grab">
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        </div>
                        <div className="flex-shrink-0 p-4 pt-6 flex items-center justify-center border-b border-white/10">
                            <h2 className="text-xl font-bold">Add Journal Context</h2>
                        </div>
                        <div className="flex-shrink-0 p-4">
                            <SearchBar
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                placeholder="Search journals..."
                            />
                        </div>

                        <OverscrollContainer className="flex-grow overflow-y-auto">
                            <div className="p-4 pt-0 space-y-2">
                                {filteredJournals.length > 0 ? filteredJournals.map(entry => (
                                    <motion.button
                                        key={entry.id}
                                        onClick={() => handleToggle(entry.id)}
                                        className={`w-full flex items-center gap-4 text-left p-3 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 ${selectedIds.includes(entry.id) ? 'selected-journal-item' : 'border-transparent'}`}
                                    >
                                        <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border-2 transition-all ${selectedIds.includes(entry.id) ? 'bg-light-primary dark:bg-dark-primary border-transparent' : 'border-gray-400'}`}>
                                            {selectedIds.includes(entry.id) && <Check size={16} className="text-white"/>}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-semibold truncate">{entry.title || "Untitled Entry"}</p>
                                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </motion.button>
                                )) : (
                                    <div className="text-center py-16 text-light-text-secondary dark:text-dark-text-secondary">
                                        <BookOpen size={32} className="mx-auto mb-2" />
                                        <p>No journals found.</p>
                                    </div>
                                )}
                            </div>
                        </OverscrollContainer>
                        
                        <div className="flex-shrink-0 p-4 border-t border-white/10 flex justify-center">
                            <motion.button
                                onClick={handleAddContext}
                                disabled={selectedIds.length === 0}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-flow-gradient bg-400% animate-gradient-flow text-white rounded-full shadow-lg disabled:opacity-50"
                                whileTap={{ scale: 0.98 }}
                            >
                                Add Context ({selectedIds.length})
                            </motion.button>
                        </div>
                         <style>{`
                            .dark\\:bg-dark-primary {
                                background-color: hsl(var(--accent-dark));
                            }
                            .bg-light-primary {
                                background-color: hsl(var(--accent-light));
                            }
                            .selected-journal-item {
                                background-color: hsla(var(--accent-light), 0.1);
                                border-color: hsla(var(--accent-light), 0.3);
                            }
                            html.dark .selected-journal-item {
                                background-color: hsla(var(--accent-dark), 0.1);
                                border-color: hsla(var(--accent-dark), 0.3);
                            }
                         `}</style>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ThinkingBubble: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 w-full max-w-full justify-start"
        >
            <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-black/5 text-black">
                <BrainCircuit size={18} />
            </div>
            <div className="flex items-center gap-2 text-sm text-black p-3 bg-[#f4f4f4] rounded-2xl rounded-bl-lg">
                <span>Thinking</span>
                <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChevronRight size={16} />
                </motion.div>
            </div>
        </motion.div>
    );
};

const ThoughtBubble: React.FC<{ text: string }> = ({ text }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3 w-full max-w-full justify-start"
        >
            <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-black/5 text-black">
                <Sparkles size={18} />
            </div>
            <div className="flex items-center gap-2 text-sm text-black p-3 bg-[#f4f4f4] rounded-2xl rounded-bl-lg">
                <span>{text}</span>
            </div>
        </motion.div>
    );
};

const AuraAiPage: React.FC = () => {
    const { journalEntries, navigateTo, navigateBack, vibrate, showAlertModal, auraChatSessions, saveChatSession, deleteChatSessions, settings, userProfile, showConfirmationModal, playUISound, modalStack } = useAppContext();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [chatState, setChatState] = useState<'initial' | 'chat'>(messages.length > 0 ? 'chat' : 'initial');
    const [isJournalContextModalOpen, setIsJournalContextModalOpen] = useState(false);
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [isResearchMode, setIsResearchMode] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        message: ChatMessage | null;
    }>({ isOpen: false, position: { x: 0, y: 0 }, message: null });
    const [selectableMessageId, setSelectableMessageId] = useState<string | null>(null);
    const [animateLastMessage, setAnimateLastMessage] = useState(false);
    const [finishedTypingMessages, setFinishedTypingMessages] = useState<Set<string>>(new Set());
    
    // History Selection State
    const [isHistorySelectionMode, setIsHistorySelectionMode] = useState(false);
    const [selectedHistoryIndices, setSelectedHistoryIndices] = useState<number[]>([]);
    const historyLongPressTimer = useRef<number>();
    const isHistoryLongPress = useRef(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const wasLoading = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const longPressTimer = useRef<number>();
    const pointerStartPos = useRef({ x: 0, y: 0 });
    const DRAG_THRESHOLD = 10;
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef<boolean>(false);
    const audioSourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, message: null });
    }, []);

    useEffect(() => {
        if (!contextMenu.isOpen) return;
    
        const handleClickOutside = (e: PointerEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                closeContextMenu();
            }
        };
    
        const handleScroll = () => closeContextMenu();
    
        // Add listener after a short delay to prevent the same event from closing it.
        const timerId = setTimeout(() => {
            document.addEventListener('pointerdown', handleClickOutside);
            scrollRef.current?.addEventListener('scroll', handleScroll);
        }, 0);
    
        return () => {
            clearTimeout(timerId);
            document.removeEventListener('pointerdown', handleClickOutside);
            scrollRef.current?.removeEventListener('scroll', handleScroll);
        };
    }, [contextMenu.isOpen, closeContextMenu]);

    useEffect(() => {
        setIsDesktop(!('ontouchstart' in window) || navigator.maxTouchPoints === 0);
    }, []);

    const processAudioQueue = useCallback(() => {
        const audioContext = audioContextRef.current;
        if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContext || audioContext.state === 'closed') {
            isPlayingRef.current = false;
            return;
        }
        isPlayingRef.current = true;
        
        const audioBuffer = audioQueueRef.current.shift();
        if (!audioBuffer) {
            isPlayingRef.current = false;
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        audioSourceNodesRef.current.add(source);
        source.onended = () => {
            audioSourceNodesRef.current.delete(source);
            isPlayingRef.current = false;
            processAudioQueue(); // Process next in queue
        };

        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
    }, []);

    const cancelSpeech = useCallback(() => {
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        audioSourceNodesRef.current.forEach(source => {
            try { source.stop(); } catch (e) {}
        });
        audioSourceNodesRef.current.clear();
    }, []);

    const speakText = useCallback(async (text: string) => {
        if (!text.trim() || !('AudioContext' in window || 'webkitAudioContext' in window)) {
            return;
        }

        cancelSpeech();

        try {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            nextStartTimeRef.current = audioContext.currentTime;

            const cleanedText = text.replace(/[*#]/g, '').replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
            if (!cleanedText.trim()) return;

            const sentences = cleanedText.match(/[^.!?]+[.!?]*(\s|$)/g) || [cleanedText];

            const fetchAndQueue = async (sentence: string) => {
                if (!sentence.trim()) return;
                
                try {
                    const ai = new GoogleGenAI({ apiKey: API_KEY });
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash-preview-tts",
                        contents: [{ parts: [{ text: sentence }] }],
                        config: {
                            responseModalities: [Modality.AUDIO],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: settings.auraAiVoice || 'Zephyr' },
                                },
                            },
                        },
                    });
                    
                    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && audioContextRef.current && audioContextRef.current.state !== 'closed') {
                        const audioData = decode(base64Audio);
                        const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                        audioQueueRef.current.push(audioBuffer);
                        
                        if (!isPlayingRef.current) {
                            processAudioQueue();
                        }
                    }
                } catch (error) {
                    console.error("Error with Gemini TTS:", error);
                    // Silently fail to avoid spamming alerts during speech playback.
                    // Main actions will trigger the API key error flow if needed.
                    cancelSpeech();
                }
            };
            
            sentences.forEach(fetchAndQueue);

        } catch (error) {
            console.error("Error with Gemini TTS:", error);
            showAlertModal({title: "Speech Error", message: "Sorry, I couldn't generate the audio for that response."});
        }
    }, [cancelSpeech, showAlertModal, processAudioQueue, settings.auraAiVoice]);

    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    
    useEffect(() => {
        return () => {
            if (messagesRef.current.length > 0) {
                saveChatSession(messagesRef.current);
            }
        };
    }, [saveChatSession]);

    // Speech Recognition & TTS cleanup
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setInput(prev => prev + finalTranscript);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                showAlertModal({ title: "Mic Error", message: `An error occurred: ${event.error}` });
                setIsListening(false);
            };
        }

        return () => {
            cancelSpeech();
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
             if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [showAlertModal, cancelSpeech]);

    useEffect(() => {
        if (wasLoading.current && !isLoading) {
            const lastMessage = messages[messages.length - 1];
            if (settings.speakAuraAI && lastMessage?.role === 'model' && lastMessage.parts[0] && 'text' in lastMessage.parts[0]) {
                speakText(lastMessage.parts[0].text);
            }
        }
        wasLoading.current = isLoading;
    }, [isLoading, messages, settings.speakAuraAI, speakText]);

    // Scroll to bottom
    useEffect(() => {
        if (chatState === 'chat' && scrollRef.current) {
            setTimeout(() => {
                 if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [messages, isLoading, chatState]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            const el = textareaRef.current;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [input]);


    const handleSend = async (promptOverride?: string) => {
        if (isLoading) return;
        
        setSelectableMessageId(null);
        const currentInput = promptOverride ?? input;
        if (!currentInput.trim() && attachments.length === 0) return;

        if (chatState === 'initial') setChatState('chat');

        const userMessagePartsForDisplay: Part[] = [];
        attachments.forEach(attachment => {
            userMessagePartsForDisplay.push({ inlineData: { data: attachment.data.split(',')[1], mimeType: attachment.mimeType, name: attachment.name } });
        });
        if (currentInput.trim()) {
            userMessagePartsForDisplay.push({ text: currentInput.trim() });
        }

        if (userMessagePartsForDisplay.length === 0) return;

        vibrate();
        const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', parts: userMessagePartsForDisplay };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setAttachments([]);
        setIsLoading(true);
        setAnimateLastMessage(true);

        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            const currentDate = new Date().toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const currentTime = new Date().toLocaleTimeString();
            const userName = userProfile.name || 'friend';

            const systemInstruction = `You are Aura, an advanced and highly intelligent AI companion. Your personality is warm, empathetic, and exceptionally capable. ALWAYS use emojis to make the conversation vibrant 😃.
Current context: Date: ${currentDate}, Time: ${currentTime}. User: ${userName}.

**Core Capabilities:**
1. **Journaling:** You can create new journal entries for the user. If they describe a day, a feeling, or an event, offer to or directly create a journal entry for them using the 'create_journal_entry' tool.
2. **Settings Management:** You can modify application settings (theme, AI tone, AI voice, etc.) using the 'update_app_settings' tool. If the user expresses a preference (e.g., "I want a dark theme" or "Make your tone more funny"), apply it immediately.
3. **Research:** When Research Mode is active, you have access to real-time information via Google Search. Use it to verify facts, find latest news, or provide deep dives into complex topics.
4. **Contextual Awareness:** You can see attachments (images, PDFs, journals). If a journal is attached, read its content and any attachments it might have to answer questions accurately.

**Rules:**
- **Greeting:** ALWAYS start EVERY response with a personal, friendly greeting using the user's name (e.g., "Hello ${userName}! ✨", "I'm here to help, ${userName}! 😊").
- **Follow-up:** ALWAYS end EVERY response with a thoughtful, open-ended question.
- **Formatting:** Use markdown extensively (headings, lists, bold, etc.). Use KaTeX for math: \`$$\\text{formula}$$\`.
- **Images:** Only generate images when requested or highly beneficial, using \`![Image: {detailed prompt}]\`.

You are smarter, faster, and more proactive. Don't just answer; anticipate needs.`;

            const tools: any[] = [
                {
                    functionDeclarations: [
                        {
                            name: "create_journal_entry",
                            description: "Creates a new journal entry for the user.",
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "The title of the journal entry." },
                                    content: { type: Type.STRING, description: "The content of the journal entry (HTML format preferred)." },
                                    mood: { type: Type.STRING, description: "The mood for the entry (e.g., Happy, Reflective, Energetic)." },
                                    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional tags for the entry." }
                                },
                                required: ["title", "content"]
                            }
                        },
                        {
                            name: "update_app_settings",
                            description: "Updates the application settings.",
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    theme: { type: Type.STRING, enum: ["light", "dark", "system"], description: "The app theme." },
                                    auraAiTone: { type: Type.STRING, enum: ["balanced", "funny", "professional"], description: "The AI's personality tone." },
                                    auraAiVoice: { type: Type.STRING, description: "The AI's voice name (e.g., Zephyr, Puck, Fenrir)." }
                                }
                            }
                        }
                    ]
                }
            ];

            if (isResearchMode) {
                tools.push({ googleSearch: {} });
            }

            const historyForApi = messages.map(({ role, parts }) => {
                const apiParts = parts.map(part => {
                    if ('text' in part) return { text: part.text };
                    if (part.inlineData?.mimeType === 'application/vnd.aura.journal') {
                        const journal = journalEntries.find(j => j.id === (part.inlineData as any).data);
                        if (journal) {
                            const plainTextContent = new DOMParser().parseFromString(journal.content, 'text/html').body.textContent || '';
                            return { text: `Context from journal "${journal.title}":\n${plainTextContent}` };
                        }
                        return null;
                    }
                    return { inlineData: { data: part.inlineData.data, mimeType: part.inlineData.mimeType } };
                }).filter(Boolean) as any[];
                return { role, parts: apiParts };
            });

            const userMessagePartsForApi: Part[] = [];
            for (const attachment of attachments) {
                if (attachment.mimeType === 'application/vnd.aura.journal') {
                    const journal = journalEntries.find(j => j.id === attachment.data);
                    if (journal) {
                        const plainTextContent = new DOMParser().parseFromString(journal.content, 'text/html').body.textContent || '';
                        let context = `Journal: "${journal.title}"\nContent: ${plainTextContent}`;
                        if (journal.attachments && journal.attachments.length > 0) {
                            context += `\nThis journal has ${journal.attachments.length} attachments.`;
                            journal.attachments.forEach(att => {
                                context += `\n- Attachment: ${att.name} (${att.type})`;
                            });
                        }
                        userMessagePartsForApi.push({ text: context });
                    }
                } else if (attachment.mimeType.startsWith('image/')) {
                    userMessagePartsForApi.push({ inlineData: { data: attachment.data.split(',')[1], mimeType: attachment.mimeType } });
                } else {
                    userMessagePartsForApi.push({ text: `Attached file: "${attachment.name}" (${attachment.mimeType}). Please analyze.` });
                }
            }
            if (currentInput.trim()) {
                userMessagePartsForApi.push({ text: currentInput.trim() });
            }

            const modelMessageId = crypto.randomUUID();
            let fullResponseText = '';
            let currentThinkingSteps: string[] = [];

            const result = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: [...historyForApi, { role: 'user', parts: userMessagePartsForApi }],
                config: { 
                    systemInstruction,
                    tools,
                    thinkingConfig: isResearchMode ? { thinkingLevel: 'HIGH' } : undefined
                }
            });

            setMessages(prev => [...prev, { id: modelMessageId, role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of result) {
                if (chunk.thinkingState?.lastAction) {
                    currentThinkingSteps.push(chunk.thinkingState.lastAction);
                    setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, thinkingSteps: [...new Set(currentThinkingSteps)] } : m));
                }

                if (chunk.text) {
                    fullResponseText += chunk.text;
                    setMessages(prev => prev.map(msg => 
                        msg.id === modelMessageId ? { ...msg, parts: [{ text: fullResponseText }], thinkingSteps: undefined } : msg
                    ));
                }

                if (chunk.functionCalls) {
                    for (const call of chunk.functionCalls) {
                        if (call.name === "create_journal_entry") {
                            const args = call.args as any;
                            const newEntry: JournalEntry = {
                                id: crypto.randomUUID(),
                                title: args.title,
                                content: args.content,
                                date: new Date().toISOString(),
                                mood: args.mood || 'Reflective',
                                tags: args.tags || [],
                                attachments: []
                            };
                            addJournalEntry(newEntry);
                            fullResponseText += `\n\n*(Aura: I've created a new journal entry for you titled "${args.title}"! 📖)*`;
                        } else if (call.name === "update_app_settings") {
                            const args = call.args as any;
                            updateSettings(args);
                            fullResponseText += `\n\n*(Aura: I've updated your settings as requested! ⚙️)*`;
                        }
                        
                        setMessages(prev => prev.map(msg => 
                            msg.id === modelMessageId ? { ...msg, parts: [{ text: fullResponseText }] } : msg
                        ));
                    }
                }
            }

        } catch (error) {
            console.error("Aura AI Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Connection error";
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', parts: [{ text: `Sorry, I encountered an error: ${errorMessage}. Please try again.` }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle initial params from GlobalSearch
    useEffect(() => {
        const currentModal = modalStack[modalStack.length - 1];
        if ((currentModal?.view === 'auraAi' || currentModal?.view === 'auraAI') && currentModal.params) {
            const { initialQuery, research } = currentModal.params;
            if (initialQuery) {
                if (research) setIsResearchMode(true);
                handleSend(initialQuery);
            }
        }
    }, []); // Run once on mount
    
    const handleProgrammaticSend = (prompt: string) => {
        setInput(prompt);
        setTimeout(() => handleSend(prompt), 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isDesktop && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    const handleAttachmentClick = () => setShowAttachmentModal(true);

    const handleAttachmentTypeSelect = (acceptType: string) => {
        setShowAttachmentModal(false);
        if (fileInputRef.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
        if (!file) return;

        if (!ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type) || file.type === type)) {
            showAlertModal({ title: "Unsupported File", message: "Please select a supported file type (Image, PDF, Word, PowerPoint)." });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setAttachments(prev => [...prev, { id: crypto.randomUUID(), data: dataUrl, mimeType: file.type, name: file.name }]);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAttachment = (idToRemove: string) => setAttachments(prev => prev.filter(att => att.id !== idToRemove));

    const handleMicClick = () => {
        if (!recognitionRef.current) {
            showAlertModal({ title: "Not Supported", message: "Speech recognition is not supported in your browser." });
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            cancelSpeech();
            vibrate();
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleNewChat = () => {
        cancelSpeech();
        vibrate();
        if (messages.length > 0) saveChatSession(messages);
        setMessages([]);
        setInput('');
        setAttachments([]);
        setChatState('initial');
        setAnimateLastMessage(false);
        setFinishedTypingMessages(new Set());
    };
    
    const handleHistoryClick = () => {
        vibrate();
        setIsHistoryOpen(true);
    };
    
    const handleAddContextClick = () => {
        vibrate();
        setIsJournalContextModalOpen(true);
    };

    const handleAddJournalContext = (selectedJournals: JournalEntry[]) => {
        if (selectedJournals.length === 0) return;
        const journalAttachments: LocalAttachment[] = selectedJournals.map(j => ({
            id: j.id, mimeType: 'application/vnd.aura.journal', name: j.title || 'Untitled Journal', data: j.id,
        }));
        setAttachments(prev => [...prev, ...journalAttachments.filter(j => !prev.some(p => p.id === j.id))]);
    };

    const loadHistory = (session: ChatSession) => {
        if (messages.length > 0) saveChatSession(messages);
        setMessages(session.messages);
        setChatState('chat');
        setIsHistoryOpen(false);
        setAnimateLastMessage(false);
        setFinishedTypingMessages(new Set(session.messages.map(m => m.id)));
    };

    const handleBack = () => {
        if (messages.length > 0) saveChatSession(messages);
        navigateBack();
    };

    // --- Context Menu and Action Button Handlers ---
    const handleShare = async (message: ChatMessage) => {
        closeContextMenu();
        const rawMarkdown = message.parts.reduce((acc, part) => 'text' in part ? acc + part.text : acc, '');
        const plainText = markdownToPlainText(rawMarkdown);
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Aura AI Response', text: plainText });
            } catch (error) { console.error('Error sharing:', error); }
        } else {
            navigator.clipboard.writeText(plainText);
            showAlertModal({ title: "Copied!", message: "Sharing not supported, response copied to clipboard.", type: 'success' });
        }
    };

    const handleFeedback = (type: 'like' | 'dislike') => {
        closeContextMenu();
        showAlertModal({ title: "Feedback Received", message: "Thank you for helping us improve Aura AI!", type: 'success' });
    };

    const openContextMenu = (e: React.PointerEvent | React.MouseEvent, message: ChatMessage) => {
        e.preventDefault();
        e.stopPropagation();

        const menuWidth = 192; // w-48
        const menuHeight = message.role === 'user' ? 150 : 280; // Estimated height
        const margin = 16; // p-4

        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth + margin > window.innerWidth) {
            x = window.innerWidth - menuWidth - margin;
        }
        if (y + menuHeight + margin > window.innerHeight) {
            y = window.innerHeight - menuHeight - margin;
        }
        if (x < margin) x = margin;
        if (y < margin) y = margin;
        
        setContextMenu({ isOpen: true, position: { x, y }, message });
    };

    const handlePointerDown = (e: React.PointerEvent, message: ChatMessage) => {
        pointerStartPos.current = { x: e.clientX, y: e.clientY };
        longPressTimer.current = window.setTimeout(() => {
            longPressTimer.current = undefined; // Mark as fired
            openContextMenu(e, message);
        }, 500);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (longPressTimer.current) {
            const dx = Math.abs(e.clientX - pointerStartPos.current.x);
            const dy = Math.abs(e.clientY - pointerStartPos.current.y);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = undefined;
            }
        }
    };

    const handlePointerUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = undefined;
        }
    };

    const handleContextMenuEvent = (e: React.MouseEvent, message: ChatMessage) => openContextMenu(e, message);

    const handleSelectText = () => {
        if (contextMenu.message) setSelectableMessageId(contextMenu.message.id);
        closeContextMenu();
    };

    const handleRegenerate = async () => {
        closeContextMenu();
        const lastUserMessageIndex = messages.length - 2;
        if (lastUserMessageIndex < 0 || messages[lastUserMessageIndex].role !== 'user' || messages[lastUserMessageIndex + 1]?.role !== 'model') {
            showAlertModal({ title: "Cannot Regenerate", message: "This action is only available for the last response." });
            return;
        }

        const lastUserMessage = messages[lastUserMessageIndex];
        const historyForRegen = messages.slice(0, lastUserMessageIndex);

        setMessages(historyForRegen);

        const textPart = lastUserMessage.parts.find(p => 'text' in p) as { text: string } | undefined;
        const attachmentParts = lastUserMessage.parts.filter(p => 'inlineData' in p) as Part & { inlineData: { data: string; mimeType: string; name: string } }[];
        
        const attachmentsToSet: LocalAttachment[] = attachmentParts.map(p => ({
            id: (p as any).id || crypto.randomUUID(), data: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
            mimeType: p.inlineData.mimeType, name: p.inlineData.name || 'attachment'
        }));

        setInput(textPart?.text || '');
        setAttachments(attachmentsToSet);

        setTimeout(() => handleSend(), 50);
    };
    
    const handleEditMessage = (message: ChatMessage) => {
        closeContextMenu();
        const textPart = message.parts.find(p => 'text' in p) as { text: string } | undefined;
        if (textPart) {
            setInput(textPart.text);
        }
        
        const attachmentParts = message.parts.filter(p => 'inlineData' in p) as any[];
        const attachmentsToSet: LocalAttachment[] = attachmentParts.map(p => ({
            id: p.id || crypto.randomUUID(),
            data: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
            mimeType: p.inlineData.mimeType,
            name: p.inlineData.name || 'attachment'
        }));
        setAttachments(attachmentsToSet);

        setMessages(prev => prev.filter(m => m.id !== message.id));
        textareaRef.current?.focus();
    };


    const ActionButtons: React.FC<{ message: ChatMessage }> = ({ message }) => {
        const [isCopied, setIsCopied] = useState(false);
        const handleCopy = () => {
            const rawMarkdown = message.parts.reduce((acc, part) => 'text' in part ? acc + part.text : acc, '');
            const plainText = markdownToPlainText(rawMarkdown);
            navigator.clipboard.writeText(plainText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        };

        return (
            <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Copy response">
                    {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
                <button onClick={() => handleShare(message)} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Share response"><Share2 size={16} /></button>
                <button onClick={() => handleFeedback('like')} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Like response"><ThumbsUp size={16} /></button>
                <button onClick={() => handleFeedback('dislike')} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Dislike response"><ThumbsDown size={16} /></button>
            </div>
        );
    };

    // --- History Deletion Logic ---
    const exitHistorySelectionMode = useCallback(() => {
        setIsHistorySelectionMode(false);
        setSelectedHistoryIndices([]);
    }, []);
    
    const handleHistoryPointerDown = useCallback((index: number) => {
        isHistoryLongPress.current = false;
        historyLongPressTimer.current = window.setTimeout(() => {
            isHistoryLongPress.current = true;
            vibrate();
            playUISound('tap');
            if (!isHistorySelectionMode) {
                setIsHistorySelectionMode(true);
            }
            setSelectedHistoryIndices(prev => (prev.includes(index) ? prev : [...prev, index]));
        }, 500);
    }, [isHistorySelectionMode, vibrate, playUISound]);
    
    const handleHistoryPointerUpOrLeave = useCallback(() => {
        clearTimeout(historyLongPressTimer.current);
    }, []);
    
    const handleHistoryItemClick = useCallback((session: ChatSession, index: number) => {
        if (isHistoryLongPress.current) {
            isHistoryLongPress.current = false;
            return;
        }
        
        if (isHistorySelectionMode) {
            vibrate();
            playUISound('tap');
            setSelectedHistoryIndices(prev => {
                const newIndices = prev.includes(index)
                    ? prev.filter(i => i !== index)
                    : [...prev, index];
                
                if (newIndices.length === 0) {
                    setIsHistorySelectionMode(false);
                }
                
                return newIndices;
            });
        } else {
            loadHistory(session);
        }
    }, [isHistorySelectionMode, vibrate, playUISound, loadHistory]);

    const handleDeleteSelectedHistory = () => {
        if (selectedHistoryIndices.length === 0) return;
        showConfirmationModal({
            title: `Delete ${selectedHistoryIndices.length} chat${selectedHistoryIndices.length > 1 ? 's' : ''}?`,
            message: 'This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: () => {
                deleteChatSessions(selectedHistoryIndices);
                exitHistorySelectionMode();
            },
        });
    };
    
    const historyHeaderProps = isHistorySelectionMode ? {
        leftAction: (
            <motion.button onClick={exitHistorySelectionMode} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <X size={24} />
            </motion.button>
        ),
        title: `${selectedHistoryIndices.length} selected`,
        rightAction: (
            <motion.button onClick={handleDeleteSelectedHistory} disabled={selectedHistoryIndices.length === 0} className="p-2 rounded-full hover:bg-red-500/10 text-red-500 disabled:opacity-50">
                <Trash2 size={20} />
            </motion.button>
        )
    } : {
        title: "History",
    };

    const formatTimeAgo = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = (now.getTime() - date.getTime()) / 1000;
        const diffInHours = Math.round(diffInSeconds / 3600);
        const diffInDays = Math.round(diffInHours / 24);

        if (diffInHours < 24) {
            if (diffInHours < 1) return 'Just now';
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }
        if (diffInDays <= 7) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }
        return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const ContextMenu: React.FC = () => {
        const { isOpen, position, message } = contextMenu;
        
        const isLatestUserMessage = useMemo(() => {
            if (!message || message.role !== 'user' || !messages) return false;
            const userMessages = messages.filter(m => m.role === 'user');
            return userMessages.length > 0 && userMessages[userMessages.length - 1].id === message.id;
        }, [message, messages]);
        
        if (!isOpen || !message) return null;

        const isLastModelMessage = message.id === messages[messages.length - 1]?.id && messages[messages.length - 1]?.role === 'model';

        const handleCopy = () => {
            const textContent = message.parts.reduce((acc, part) => 'text' in part ? acc + part.text : acc, '');
            const plainText = message.role === 'model' ? markdownToPlainText(textContent) : textContent;
            navigator.clipboard.writeText(plainText);
            showAlertModal({ title: "Copied!", message: "Message copied to clipboard.", type: 'success' });
            closeContextMenu();
        };

        if (message.role === 'user') {
            return (
                <motion.div
                    ref={contextMenuRef}
                    className="fixed z-50 w-48 bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md rounded-xl border border-white/10 shadow-3xl p-2"
                    style={{ top: position.y, left: position.x }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                >
                    <button onClick={handleCopy} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><Copy size={16}/>Copy</span></button>
                    <button onClick={handleSelectText} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><TextSelect size={16}/>Select Text</span></button>
                    {isLatestUserMessage && <button onClick={() => handleEditMessage(message)} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><SquarePen size={16}/>Edit</span></button>}
                </motion.div>
            );
        }

        // AI (model) message context menu
        return (
            <motion.div
                ref={contextMenuRef}
                className="fixed z-50 w-48 bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md rounded-xl border border-white/10 shadow-3xl p-2"
                style={{ top: position.y, left: position.x }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 600, damping: 35 }}
            >
                <button onClick={handleCopy} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><Copy size={16}/>Copy</span></button>
                <button onClick={() => handleShare(message)} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><Share2 size={16}/>Share</span></button>
                <button onClick={handleSelectText} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><TextSelect size={16}/>Select Text</span></button>
                {isLastModelMessage && <button onClick={handleRegenerate} className="w-full flex items-center justify-between text-left px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><Repeat size={16}/>Regenerate</span></button>}
                <div className="h-px bg-black/10 dark:bg-white/10 my-1"/>
                <button onClick={() => handleFeedback('like')} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><ThumbsUp size={16}/>Like</span></button>
                <button onClick={() => handleFeedback('dislike')} className="w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5"><span className="flex items-center gap-3"><ThumbsDown size={16}/>Dislike</span></button>
            </motion.div>
        );
    };

    const HeaderActions = (
        <div className="flex items-center gap-1">
            <button onClick={handleHistoryClick} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" aria-label="Chat history">
                <Clock size={20} />
            </button>
            <button onClick={handleNewChat} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" aria-label="New chat">
                <SquarePen size={20} />
            </button>
        </div>
    );
    
    const starterPrompts = [
        { text: "Journal prompt for self-reflection", icon: <BookText size={20} /> },
        { text: "Motivational quote for focus", icon: <MessageSquare size={20} /> },
        { text: "Breathing exercise for calm", icon: <Wind size={20} /> },
        { text: "Plan my day for wellness", icon: <CheckCircle size={20} /> },
    ];

    const InitialView = (
    <motion.div key="initial-view" className="flex-grow flex flex-col items-center justify-center text-center px-4">
        <div className="flex flex-col items-center justify-center">
            <motion.div exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-col items-center">
                <div className="w-20 h-20 mb-4 rounded-full flex items-center justify-center bg-[#f4f4f4] border border-black/5">
                    <Sparkles size={40} className="text-black"/>
                </div>
                <h2 className="text-2xl font-semibold">How can I help you today?</h2>
            </motion.div>
        </div>
        
        <div className="w-full max-w-xl md:max-w-3xl my-8">
            <motion.div layout exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }} className="w-full">
                <h3 className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-3 text-left">What should we do?</h3>
                <div className="grid grid-cols-2 gap-3 w-full">
                    {starterPrompts.map(prompt => 
                        <button key={prompt.text} onClick={() => handleProgrammaticSend(prompt.text)} className="p-4 bg-[#f4f4f4] rounded-xl text-left text-sm border border-black/5 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                            <span className="text-black">{prompt.icon}</span>
                            <span className="text-black">{prompt.text}</span>
                        </button>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {attachments.length > 0 && (
                    <motion.div 
                        className="w-full mt-4" 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onRemove={() => handleRemoveAttachment(att.id)} />)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <motion.form layoutId="aura-ai-input-form" layout transition={{ type: 'spring', stiffness: 500, damping: 40 }} onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="group w-full mx-auto mt-4">
                <div className="relative rounded-2xl shadow-xl p-[2px]">
                    <div className="relative flex flex-col bg-[#ffffff] rounded-[14px] min-h-[136px] transition-colors duration-300">
                        <div className="p-3 flex gap-2">
                            <motion.button type="button" onClick={handleAddContextClick} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1.5 px-3 h-9 text-sm rounded-full text-black bg-black/5 hover:bg-black/10 transition-colors">
                                <BookText size={16} /><span className="text-sm">Add context</span>
                            </motion.button>
                            <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { vibrate(); setIsResearchMode(prev => !prev); }} className={`flex items-center gap-2 px-3 h-9 text-sm rounded-full transition-colors ${isResearchMode ? 'bg-black text-white' : 'text-black bg-black/5 hover:bg-black/10'}`}>
                                <BrainCircuit size={16}/><span>Research {isResearchMode ? 'On' : 'Off'}</span>
                            </motion.button>
                        </div>
                        <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); setSelectableMessageId(null); }} onFocus={() => setIsTextareaFocused(true)} onBlur={() => setIsTextareaFocused(false)} onKeyDown={handleKeyDown} placeholder={isListening ? "Listening..." : "Ask, search, or make anything..."} disabled={isLoading} rows={1} className={`w-full flex-grow bg-transparent focus:outline-none resize-none overflow-y-hidden self-center px-4 py-2 text-base text-black ${input.includes('```') ? 'font-mono' : ''}`} />
                        <div className="p-2 flex justify-between items-center">
                            <div className="flex items-center gap-1"><button type="button" onClick={handleAttachmentClick} className="p-2 text-black hover:bg-black/5 rounded-full transition-colors flex-shrink-0"><Paperclip size={20} /></button></div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={handleMicClick} className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-black hover:bg-black/5'}`}>{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
                                <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isLoading} className="w-9 h-9 flex items-center justify-center bg-black text-white rounded-full disabled:opacity-50 transition-transform duration-200"><Send size={18} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.form>
        </div>
    </motion.div>
);
    
    const ChatView = (
        <motion.div key="chat-view" className="flex-grow flex flex-col w-full min-h-0">
            <OverscrollContainer ref={scrollRef} className="flex-grow w-full overflow-y-auto pb-28 md:pb-32">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
                    <div className="p-4 space-y-6">
                        {messages.map((msg, index) => {
                            const textParts = msg.parts.filter(p => 'text' in p && p.text.trim());
                            const attachmentParts = msg.parts.filter(p => 'inlineData' in p);
                            const hasText = textParts.length > 0;
                            const hasAttachments = attachmentParts.length > 0;
                            const modelHasText = msg.parts[0] && 'text' in msg.parts[0] && msg.parts[0].text;
                            const modelIsThinking = msg.role === 'model' && msg.thinkingSteps?.length && !modelHasText;
                            const modelHasIntermediateThought = msg.role === 'model' && msg.intermediateThought && !modelHasText;
                            const isLastMessage = index === messages.length - 1;
                            const animate = isLastMessage && msg.role === 'model' && animateLastMessage;
                            
                            return (
                                <div key={msg.id} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {modelIsThinking ? <ThinkingBubble /> : modelHasIntermediateThought ? <ThoughtBubble text={msg.intermediateThought!} /> : (
                                        <div
                                            style={{ userSelect: selectableMessageId === msg.id ? 'text' : 'none' }}
                                            className={`flex items-start gap-3 w-full max-w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            onContextMenu={(e) => handleContextMenuEvent(e, msg)}
                                            onPointerDown={(e) => handlePointerDown(e, msg)}
                                            onPointerMove={handlePointerMove}
                                            onPointerUp={handlePointerUp}
                                            onPointerLeave={handlePointerUp}
                                        >
                                            {msg.role === 'model' && <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-black/5 text-black"><Sparkles size={18} /></div>}
                                            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                                {msg.role === 'user' ? (
                                                    (hasText || hasAttachments) && (
                                                        <>
                                                            {hasAttachments && (
                                                                <div className="flex flex-wrap justify-end gap-2 mb-2">
                                                                    {attachmentParts.map((part, i) => {
                                                                        const { mimeType, name } = (part as any).inlineData;
                                                                        return (
                                                                            <div key={i} className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl max-w-xs backdrop-blur-sm">
                                                                                <div className="w-8 h-8 flex-shrink-0">
                                                                                    <AttachmentIcon type={mimeType || ''} className="w-full h-full" />
                                                                                </div>
                                                                                <span className="text-sm text-light-text dark:text-dark-text truncate">{name || 'Attachment'}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            {hasText && (
                                                                <div className="p-3 rounded-2xl bg-[#f4f4f4] text-[#000] rounded-br-lg">
                                                                {textParts.map((part, i) => (
                                                                    <div key={i} className="text-lg" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{(part as any).text}</div>
                                                                ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )
                                                ) : (
                                                    <div className={`text-lg ${isLoading && isLastMessage ? 'typing-cursor' : ''}`}>
                                                        {modelHasText ? <StreamingMarkdownRenderer text={(msg.parts[0] as any).text} animate={animate} onFinished={() => {
                                                            setFinishedTypingMessages(prev => {
                                                                if (prev.has(msg.id)) return prev;
                                                                const next = new Set(prev);
                                                                next.add(msg.id);
                                                                return next;
                                                            });
                                                        }}/> : <span className="opacity-0">.</span>}
                                                    </div>
                                                )}
                                            </div>
                                            {msg.role === 'user' && <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-black/5 text-black"><UserIcon size={18} /></div>}
                                        </div>
                                    )}
                                    <AnimatePresence>
                                    {msg.role === 'model' && !modelIsThinking && !modelHasIntermediateThought && modelHasText && finishedTypingMessages.has(msg.id) && !isLoading && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 5 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="flex flex-col items-start gap-2 mt-2 ml-11"
                                        >
                                            <ActionButtons message={msg} />
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                        <AnimatePresence>
                           {isLoading && isResearchMode && <ThinkingBubble />}
                       </AnimatePresence>
                    </div>
                </motion.div>
            </OverscrollContainer>
             <div className="absolute bottom-0 left-0 right-0 p-4 pt-10 bg-gradient-to-t from-[#f4f4f4] via-[#f4f4f4]/80 to-transparent">
                <AnimatePresence>{attachments.length > 0 && <motion.div className="w-full pb-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><div className="flex gap-3 overflow-x-auto pb-2">{attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onRemove={() => handleRemoveAttachment(att.id)} />)}</div></motion.div>}</AnimatePresence>
                 <motion.div layoutId="aura-ai-input-form" layout transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="relative">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex gap-2 items-end p-2 rounded-[70.4px] bg-[#ffffff] border-none transition-colors shadow-lg">
                        <button type="button" onClick={handleAttachmentClick} className="p-3 text-black hover:bg-black/5 rounded-full transition-colors flex-shrink-0" aria-label="Attach file"><Paperclip size={20} /></button>
                        <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); setSelectableMessageId(null); }} onFocus={() => setIsTextareaFocused(true)} onBlur={() => setIsTextareaFocused(false)} onKeyDown={handleKeyDown} placeholder={isListening ? "Listening..." : "Ask anything..."} disabled={isLoading} rows={1} className={`w-full bg-transparent focus:outline-none resize-none overflow-y-hidden self-center max-h-32 text-base px-2 py-2.5 text-black ${input.includes('```') ? 'font-mono' : ''}`} />
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button 
                                type="button" 
                                onClick={() => { vibrate(); setIsResearchMode(!isResearchMode); }} 
                                className={`p-2 rounded-full transition-all duration-300 ${isResearchMode ? 'bg-black text-white shadow-md' : 'text-black hover:bg-black/5'}`}
                                aria-label="Toggle Research Mode"
                            >
                                <BrainCircuit size={20} />
                            </button>
                            <button type="button" onClick={handleMicClick} className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-black hover:bg-black/5'}`} style={{ marginRight: '1px', marginLeft: '1px', paddingLeft: '1px', paddingRight: '1px', paddingBottom: '-9px', marginBottom: '3px' }}>{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
                            <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isLoading} className="w-9 h-9 flex items-center justify-center bg-black text-white rounded-full disabled:opacity-50 transition-transform duration-200"><Send size={18} /></button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </motion.div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-[#ffffff] font-['Montserrat',_Arial,_sans-serif] text-black">
            <Header title="Aura AI" showBackButton onBack={handleBack} rightAction={HeaderActions} titleClassName="text-black" />
            <div className="absolute top-[64px] left-0 right-0 h-16 bg-gradient-to-b from-[#f4f4f4] to-transparent z-10 pointer-events-none" />
            <ContextMenu />
            <AnimatePresence>
                {isHistoryOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-transparent backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { 
                            if (!isHistorySelectionMode) {
                                vibrate();
                                playUISound('tap');
                                setIsHistoryOpen(false);
                            }
                        }}
                    >
                        <motion.div 
                            className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-light-bg-secondary dark:bg-dark-bg-secondary border-l border-white/10 flex flex-col"
                            initial={{ x: "100%" }} 
                            animate={{ x: "0%" }} 
                            exit={{ x: "100%" }} 
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
                            onClick={e => e.stopPropagation()}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0}
                            onDragEnd={(event, info) => {
                                if (info.offset.x > 100 && info.velocity.x > 200) { // Swipe right to close
                                    if (!isHistorySelectionMode) {
                                        vibrate();
                                        playUISound('tap');
                                        setIsHistoryOpen(false);
                                    }
                                }
                            }}
                        >
                            <Header {...historyHeaderProps} />
                            <OverscrollContainer className="flex-grow overflow-y-auto">
                                <div className="p-4 space-y-3">
                                    {auraChatSessions.length > 0 ? auraChatSessions.map((session, index) => {
                                        const firstUserMessage = session.messages.find(msg => msg.role === 'user')?.parts.find(p => 'text' in p) as { text: string } | undefined;
                                        const isSelected = selectedHistoryIndices.includes(index);
                                        return (
                                            <motion.div
                                                key={index}
                                                onClick={() => handleHistoryItemClick(session, index)}
                                                onPointerDown={() => handleHistoryPointerDown(index)}
                                                onPointerUp={handleHistoryPointerUpOrLeave}
                                                onPointerLeave={handleHistoryPointerUpOrLeave}
                                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 border cursor-pointer ${isSelected ? 'bg-light-primary/20 dark:bg-dark-primary/20 border-light-primary/50 dark:border-dark-primary/50' : 'bg-light-glass dark:bg-dark-glass border-transparent'}`}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <AnimatePresence>
                                                    {isHistorySelectionMode && (
                                                        <motion.div
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            exit={{ scale: 0, opacity: 0 }}
                                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                            className="w-6 h-6 flex-shrink-0"
                                                        >
                                                            <div className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-light-primary dark:bg-dark-primary border-transparent' : 'border-gray-400'}`}>
                                                                {isSelected && <Check size={16} className="text-white" />}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                <div className="flex-grow overflow-hidden">
                                                    <p className="font-medium truncate">{firstUserMessage?.text || "Chat with attachments"}</p>
                                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{formatTimeAgo(session.timestamp)}</p>
                                                </div>
                                            </motion.div>
                                        );
                                    }) : <div className="text-center text-light-text-secondary dark:text-dark-text-secondary pt-16"><BookText size={40} className="mx-auto mb-4" /><p>No recent chats.</p></div>}
                                </div>
                            </OverscrollContainer>
                             {!isHistorySelectionMode && (
                                <div className="p-4 flex-shrink-0 border-t border-white/10">
                                    <p className="text-xs text-center text-light-text-secondary dark:text-dark-text-secondary mb-3">
                                        Only the last 10 chat sessions are stored.
                                    </p>
                                    <button onClick={() => navigateTo('auraAiSettings')} className="w-full flex items-center justify-start gap-3 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <SettingsIcon size={18} /><span>AI Settings</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                className="flex-grow flex flex-col w-full min-h-0"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                onDragEnd={(event, info) => {
                    if (info.offset.x < -100 && info.velocity.x < -200) { // Swipe left to open
                        if (!isHistoryOpen) {
                            handleHistoryClick();
                        }
                    }
                }}
            >
                <AnimatePresence>{chatState === 'initial' ? InitialView : ChatView}</AnimatePresence>
            </motion.div>
            <JournalContextModal isOpen={isJournalContextModalOpen} onClose={() => setIsJournalContextModalOpen(false)} onAddContext={handleAddJournalContext} />
            <AttachmentTypeModal isOpen={showAttachmentModal} onClose={() => setShowAttachmentModal(false)} onSelect={handleAttachmentTypeSelect} />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
             <style>{`
                .prose-styles {
                    line-height: 1.7;
                    word-wrap: break-word;
                }
                .prose-styles p, .prose-styles ul, .prose-styles ol, .prose-styles table {
                    margin-top: 0.75em;
                    margin-bottom: 0.75em;
                }
                .prose-styles h1, .prose-styles h2, .prose-styles h3, .prose-styles h4 {
                    margin-top: 1em;
                    margin-bottom: 0.25em;
                }
                .prose-styles h1 { font-size: 1.8em; font-weight: bold; }
                .prose-styles h2 { font-size: 1.5em; font-weight: bold; }
                .prose-styles h3 { font-size: 1.25em; font-weight: bold; }
                .prose-styles h4 { font-size: 1.1em; font-weight: bold; }
                .prose-styles ul { list-style-type: disc; padding-left: 1.5rem; }
                .prose-styles ol { list-style-type: decimal; padding-left: 1.5rem; }
                .prose-styles a { color: #60a5fa; text-decoration: underline; }
                .prose-styles hr { border: none; border-top: 1px solid rgba(128, 128, 128, 0.2); margin: 1.5rem 0; }
                .prose-styles code {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                    background-color: rgba(128, 128, 128, 0.1);
                    padding: 0.2em 0.4em;
                    border-radius: 0.25rem;
                    font-size: 0.9em;
                }
                .prose-styles pre {
                    background-color: rgba(0,0,0,0.8) !important;
                    color: #f8f8f2 !important;
                    padding: 0;
                    border-radius: 0.75rem;
                    overflow: hidden;
                    font-size: 0.9em;
                }
                .prose-styles pre code {
                    background-color: transparent !important;
                    padding: 1rem;
                    display: block;
                    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
                }
                .prose-styles .math-formula-block {
                    overflow-x: auto;
                    padding: 0.5rem;
                    margin: 0.5rem 0;
                }
                .prose-styles table.aura-table { width: 100%; border-collapse: collapse; margin: 1rem 0; border-radius: 0.5rem; overflow: hidden; border: 1px solid rgba(128, 128, 128, 0.2); }
                .prose-styles table.aura-table th, .prose-styles table.aura-table td { border: 1px solid rgba(128, 128, 128, 0.2); padding: 0.5rem; text-align: left; }
                .prose-styles table.aura-table th { font-weight: 600; background-color: rgba(128, 128, 128, 0.05); }
                .prose-styles blockquote {
                    border-left: 4px solid rgba(128, 128, 128, 0.2);
                    padding-left: 1rem;
                    margin-left: 0;
                    margin-right: 0;
                    font-style: italic;
                    color: #a0a0a0;
                }
                html.light .prose-styles blockquote {
                    color: #606060;
                }

                @keyframes typing-blink {
                    0% { opacity: 1; }
                    50% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .typing-cursor::after {
                    content: '▋';
                    animation: typing-blink 1s infinite;
                    font-size: 1em;
                    line-height: 1;
                    margin-left: 0.1em;
                    vertical-align: baseline;
                    color: #a0a0a0;
                }
                .dark\\:bg-dark-primary { background-color: hsl(var(--accent-dark)); }
                .bg-light-primary { background-color: hsl(var(--accent-light)); }
                .dark\\:text-dark-primary { color: hsl(var(--accent-dark)); }
                .text-light-primary { color: hsl(var(--accent-light)); }
                .bg-light-primary\\/10 { background-color: hsla(var(--accent-light), 0.1); }
                .dark\\:bg-dark-primary\\/10 { background-color: hsla(var(--accent-dark), 0.1); }
                .bg-light-primary\\/20 { background-color: hsla(var(--accent-light), 0.2); }
                .dark\\:bg-dark-primary\\/20 { background-color: hsla(var(--accent-dark), 0.2); }
                .border-light-primary\\/50 { border-color: hsla(var(--accent-light), 0.5); }
                .dark\\:border-dark-primary\\/50 { border-color: hsla(var(--accent-dark), 0.5); }
                .focus-within\\:border-light-primary\\/50:focus-within { border-color: hsla(var(--accent-light), 0.5); }
                .dark\\:focus-within\\:border-dark-primary\\/50:focus-within { border-color: hsla(var(--accent-dark), 0.5); }
                .hover\\:bg-light-primary\\/10:hover { background-color: hsla(var(--accent-light), 0.1); }
                .dark\\:hover\\:bg-dark-primary\\/10:hover { background-color: hsla(var(--accent-dark), 0.1); }
                .hover\\:text-light-primary:hover { color: hsl(var(--accent-light)); }
                .dark\\:hover\\:text-dark-primary:hover { color: hsl(var(--accent-dark)); }
             `}</style>
        </div>
    );
};

export default AuraAiPage;
