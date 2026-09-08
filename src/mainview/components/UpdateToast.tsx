import { useEffect, useState } from "react";
import { Sparkles, Download, X, ArrowRight } from "lucide-react";

type Props = {
  latestVersion: string;
  onDownload: () => void;
  onClose: () => void;
};

export default function UpdateToast({ latestVersion, onDownload, onClose }: Props) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
    }, 300); // match animation duration
  };

  const handleDownload = () => {
    onDownload();
    handleClose();
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden backdrop-blur-md bg-opacity-95 ${
        isAnimatingOut ? "animate-slide-out-right" : "animate-slide-in-right"
      }`}
    >
      {/* Top accent line with animated gradient */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      <div className="p-4 flex gap-3.5">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-[var(--accent-blue)] border border-blue-500/20">
          <Sparkles className="w-5 h-5 animate-pulse text-blue-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--text-main)] tracking-tight">
              ¡Actualización Disponible!
            </h4>
            <button
              onClick={handleClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-0.5 rounded-lg hover:bg-[var(--accent-hover)]"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)] leading-normal">
            La versión <span className="font-semibold text-[var(--text-main)]">v{latestVersion}</span> de MDPOWER ya está disponible. Descárgala para disfrutar de las últimas mejoras.
          </p>
          
          <div className="mt-4 flex gap-2 justify-end items-center">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors rounded-md hover:bg-[var(--accent-hover)]"
            >
              Más tarde
            </button>
            <button
              onClick={handleDownload}
              className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all group overflow-hidden"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar ahora</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
