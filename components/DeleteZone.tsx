import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const DeleteZone: React.FC = () => {
    return (
        <motion.div
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
            <div className="flex items-center justify-center w-20 h-20 bg-red-500/80 rounded-full border-2 border-white/50 shadow-2xl">
                <Trash2 className="w-8 h-8 text-white" />
            </div>
            <p className="text-sm font-medium text-white/80">Drag here to reset</p>
        </motion.div>
    );
};

export default DeleteZone;
