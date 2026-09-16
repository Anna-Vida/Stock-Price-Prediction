import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import CryptoWorkspace from '@/components/ui/crypto-workspace';

const root = document.getElementById('cryptoRoot');
if (root) createRoot(root).render(<MotionConfig reducedMotion="user"><CryptoWorkspace /></MotionConfig>);
