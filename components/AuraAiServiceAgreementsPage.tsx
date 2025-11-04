import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import Header from './Header';
import OverscrollContainer from './OverscrollContainer';

const AuraAiServiceAgreementsPage: React.FC = () => {
    const { navigateBack } = useAppContext();

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Service Agreements" showBackButton onBack={navigateBack} />
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-2xl mx-auto p-4">
                    <div className="space-y-8 pt-8 pb-24 prose-styles">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">Terms of Use</h2>
                            <p>Welcome to Aura. By using our services, you agree to these terms. Please read them carefully.</p>
                            <p>Our services are designed to provide a calm and focused environment. Misuse of the services is strictly prohibited. You are responsible for your content and must respect intellectual property rights.</p>
                            <p>We may suspend or stop providing our services to you if you do not comply with our terms or policies or if we are investigating suspected misconduct. All AI-generated content is for informational purposes only and should not be considered as professional advice.</p>
                            <p><em>This is placeholder text. A full Terms of Use agreement should be provided.</em></p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">Privacy Policy</h2>
                            <p>Your privacy is important to us. This policy explains what personal data we collect from you and how we use it.</p>
                            <p>We collect data to operate effectively and provide you with the best experiences with our services. This includes data you provide directly, such as when you create an account, and data we get from your use of our services, such as journal entries and focus session history. All your data is stored securely.</p>
                            <p>We use the data to provide and improve the services we offer, and to personalize your experiences. We do not share your personal data with third parties without your consent, except as necessary to provide our services or as required by law.</p>
                             <p><em>This is placeholder text. A full Privacy Policy should be provided.</em></p>
                        </motion.div>
                    </div>
                </div>
            </OverscrollContainer>
             <style>{`
                .prose-styles { line-height: 1.7; }
                .prose-styles p { margin-bottom: 1rem; }
            `}</style>
        </div>
    );
};

export default AuraAiServiceAgreementsPage;
