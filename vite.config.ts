import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:'/',build:{rollupOptions:{output:{manualChunks:{firebase:['firebase/app','firebase/auth','firebase/firestore','firebase/functions','firebase/app-check'],react:['react','react-dom','react-router-dom']}}}}});
