/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Check, 
  Layers, 
  Palette, 
  Droplets,
  Zap,
  Trash2,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { removeBackground } from '@imgly/background-removal';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';

// --- Types ---
interface ProcessingState {
  status: 'idle' | 'loading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface ImageResult {
  originalUrl: string;
  processedUrl: string;
  blob: Blob;
}

interface EditSettings {
  backgroundColor: string;
  isGrayscale: boolean;
  blur: number;
}

export default function App() {
  // --- State ---
  const [image, setImage] = useState<ImageResult | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [settings, setSettings] = useState<EditSettings>({
    backgroundColor: 'transparent',
    isGrayscale: false,
    blur: 0,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Theme Toggle ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- Background Removal Logic ---
  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setProcessing({ status: 'error', progress: 0, error: 'Please upload a valid image file.' });
      return;
    }

    const originalUrl = URL.createObjectURL(file);
    setProcessing({ status: 'processing', progress: 0 });
    
    try {
      // Using @imgly/background-removal for browser-side AI processing
      // This is faster and more private than server-side Python processing
      const resultBlob = await removeBackground(file, {
        progress: (instance, progress) => {
          setProcessing(prev => ({ ...prev, progress: Math.round(progress * 100) }));
        },
        model: 'isnet_fp16', // High quality, optimized for web
      });

      const processedUrl = URL.createObjectURL(resultBlob);
      setImage({
        originalUrl,
        processedUrl,
        blob: resultBlob
      });
      
      setProcessing({ status: 'success', progress: 100 });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b']
      });
    } catch (error) {
      console.error('Background removal failed:', error);
      setProcessing({ 
        status: 'error', 
        progress: 0, 
        error: 'Failed to process image. Please try another one.' 
      });
    }
  };

  // --- Handlers ---
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  const reset = () => {
    if (image) {
      URL.revokeObjectURL(image.originalUrl);
      URL.revokeObjectURL(image.processedUrl);
    }
    setImage(null);
    setProcessing({ status: 'idle', progress: 0 });
    setSettings({ backgroundColor: 'transparent', isGrayscale: false, blur: 0 });
  };

  const downloadImage = () => {
    if (!image) return;
    
    // Create a temporary canvas to apply settings (bg color, blur, etc.)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        // Apply background color
        if (settings.backgroundColor !== 'transparent') {
          ctx.fillStyle = settings.backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Apply filters
        let filter = '';
        if (settings.isGrayscale) filter += 'grayscale(100%) ';
        if (settings.blur > 0) filter += `blur(${settings.blur}px) `;
        ctx.filter = filter.trim() || 'none';
        
        ctx.drawImage(img, 0, 0);
        
        // Trigger download
        const link = document.createElement('a');
        link.download = 'clearcut-result.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    img.src = image.processedUrl;
  };

  // --- Render Helpers ---
  const renderUploadZone = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300",
          "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl",
          "border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-50/10",
          "p-12 text-center"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept="image/*"
          className="hidden"
        />
        
        <div className="relative z-10 space-y-4">
          <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Upload an image
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              Drag and drop or click to browse
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <span className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">PNG</span>
            <span className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">JPG</span>
            <span className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">WEBP</span>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full" />
      </div>
    </motion.div>
  );

  const renderProcessing = () => (
    <div className="max-w-md mx-auto text-center space-y-8 py-12">
      <div className="relative inline-block">
        <div className="w-32 h-32 rounded-full border-4 border-zinc-100 dark:border-zinc-800 border-t-emerald-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-emerald-500">{processing.progress}%</span>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Removing background...</h3>
        <p className="text-zinc-500 dark:text-zinc-400">Our AI is working its magic. This usually takes a few seconds.</p>
      </div>
      
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
        <motion.div 
          className="bg-emerald-500 h-full"
          initial={{ width: 0 }}
          animate={{ width: `${processing.progress}%` }}
        />
      </div>
    </div>
  );

  const renderResult = () => {
    if (!image) return null;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Before */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Original</span>
              <span className="px-2 py-1 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 rounded">BEFORE</span>
            </div>
            <div className="aspect-square rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <img 
                src={image.originalUrl} 
                alt="Original" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* After */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Result</span>
              <span className="px-2 py-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">AFTER</span>
            </div>
            <div 
              className="aspect-square rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-700 relative"
              style={{ 
                backgroundColor: settings.backgroundColor === 'transparent' ? '' : settings.backgroundColor,
                backgroundImage: settings.backgroundColor === 'transparent' ? 'repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 50% / 20px 20px' : 'none'
              }}
            >
              <img 
                src={image.processedUrl} 
                alt="Processed" 
                className="w-full h-full object-contain transition-all duration-300"
                style={{ 
                  filter: `${settings.isGrayscale ? 'grayscale(100%)' : ''} blur(${settings.blur}px)`,
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              {/* Background Color */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Background
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { name: 'Transparent', value: 'transparent' },
                    { name: 'White', value: '#ffffff' },
                    { name: 'Black', value: '#000000' },
                    { name: 'Gray', value: '#64748b' },
                    { name: 'Blue', value: '#3b82f6' },
                    { name: 'Emerald', value: '#10b981' },
                    { name: 'Rose', value: '#f43f5e' },
                  ].map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSettings(s => ({ ...s, backgroundColor: color.value }))}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        settings.backgroundColor === color.value ? "border-emerald-500 scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ 
                        backgroundColor: color.value === 'transparent' ? 'white' : color.value,
                        backgroundImage: color.value === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px' : 'none'
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Blur */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                  <Droplets className="w-3 h-3" /> Blur
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  value={settings.blur}
                  onChange={(e) => setSettings(s => ({ ...s, blur: parseInt(e.target.value) }))}
                  className="w-32 accent-emerald-500"
                />
              </div>

              {/* B&W Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Effects
                </label>
                <button
                  onClick={() => setSettings(s => ({ ...s, isGrayscale: !s.isGrayscale }))}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    settings.isGrayscale 
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" 
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
                  )}
                >
                  Black & White
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                title="Start Over"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={downloadImage}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ImageIcon className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
              ClearCut<span className="text-emerald-500">AI</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <a 
              href="https://github.com" 
              target="_blank" 
              className="hidden sm:block text-sm font-medium text-zinc-500 hover:text-emerald-500 transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
        {/* Hero Section */}
        {processing.status === 'idle' && (
          <div className="text-center space-y-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">
                AI-Powered Magic
              </span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl sm:text-7xl font-black tracking-tight leading-tight"
            >
              Remove backgrounds <br />
              <span className="text-emerald-500">instantly.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto"
            >
              Professional-grade background removal using browser-side AI. 
              Fast, free, and 100% private.
            </motion.p>
          </div>
        )}

        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={processing.status}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {processing.status === 'idle' && renderUploadZone()}
            {(processing.status === 'processing' || processing.status === 'loading') && renderProcessing()}
            {processing.status === 'success' && renderResult()}
            {processing.status === 'error' && (
              <div className="max-w-md mx-auto p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-rose-900 dark:text-rose-100">Something went wrong</h3>
                <p className="text-rose-600 dark:text-rose-400">{processing.error}</p>
                <button 
                  onClick={reset}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Features Grid */}
        {processing.status === 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
            {[
              { 
                icon: <Zap className="w-6 h-6 text-amber-500" />, 
                title: "Instant Results", 
                desc: "Remove backgrounds in seconds using high-performance AI models." 
              },
              { 
                icon: <Layers className="w-6 h-6 text-blue-500" />, 
                title: "Privacy First", 
                desc: "Your images never leave your browser. Processing happens locally on your device." 
              },
              { 
                icon: <Download className="w-6 h-6 text-emerald-500" />, 
                title: "High Quality", 
                desc: "Download full-resolution PNGs with perfect transparency for any project." 
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-200 dark:border-zinc-800 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm font-bold tracking-tight">ClearCut AI</span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            © 2026 ClearCut AI. Built with React & AI.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-emerald-500 uppercase tracking-widest">Privacy</a>
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-emerald-500 uppercase tracking-widest">Terms</a>
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-emerald-500 uppercase tracking-widest">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
