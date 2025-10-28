import React from 'react';
import Header from './Header';
import { useAppContext } from '../App';
import { Attachment } from '../types';
import { FileQuestion, Download } from 'lucide-react';

interface AttachmentViewerPageProps {
    attachment: Attachment;
}

const AttachmentViewerPage: React.FC<AttachmentViewerPageProps> = ({ attachment }) => {
    const { navigateBack } = useAppContext();

    const renderContent = () => {
        const type = attachment.type.toLowerCase();
        if (type.startsWith('image/')) {
            return <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain" />;
        }
        if (type === 'application/pdf') {
            return <iframe src={attachment.url} className="w-full h-full border-none" title={attachment.name} />;
        }
        
        if (type.includes('powerpoint') || type.includes('presentation')) {
            return (
                <div className="text-center p-8 flex flex-col items-center justify-center gap-4">
                    <FileQuestion size={64} className="text-light-text-secondary dark:text-dark-text-secondary" />
                    <h2 className="text-xl font-semibold">Preview not available</h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">{attachment.name}</p>
                    <a href={attachment.url} download={attachment.name} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full shadow-lg">
                        <Download size={20} />
                        <span>Download File</span>
                    </a>
                </div>
            );
        }

        return (
            <div className="text-center p-8 flex flex-col items-center justify-center gap-4">
                <FileQuestion size={64} className="text-light-text-secondary dark:text-dark-text-secondary" />
                <h2 className="text-xl font-semibold">Unsupported file type</h2>
                 <p className="text-light-text-secondary dark:text-dark-text-secondary">{attachment.name}</p>
                <a href={attachment.url} download={attachment.name} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full shadow-lg">
                    <Download size={20} />
                    <span>Download File</span>
                </a>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title={attachment.name} showBackButton onBack={navigateBack} />
            <div className="flex-grow w-full h-full flex items-center justify-center p-1 overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
};

export default AttachmentViewerPage;
