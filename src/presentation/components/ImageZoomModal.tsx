import { useEffect, useState, type MouseEvent } from 'react';

/**
 * ImageZoomModal — full-screen viewer for a document photo.
 *
 * Implements blueprint §3.13 "Zoom Receipt Photo". Clicking the image
 * cycles through three zoom levels (1× / 2× / 3×) so users can read
 * fine print on a receipt without leaving the Purchase Details page.
 * Esc or the backdrop close the modal.
 */
export default function ImageZoomModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function cycleZoom() {
    setZoom((current) => (current === 1 ? 2 : current === 2 ? 3 : 1));
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Document photo viewer"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
    >
      <div className="relative max-h-full max-w-full overflow-auto">
        <img
          src={src}
          alt={alt}
          onClick={cycleZoom}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="block max-h-[85vh] max-w-[90vw] cursor-zoom-in rounded-md bg-surface shadow-xl transition-transform duration-150"
        />
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <span className="rounded-md bg-surface/90 px-2 py-1 text-xs font-semibold text-slate-300 shadow-sm">
          {zoom}×
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-slate-300 shadow-md hover:bg-surface-muted"
        >
          ✕
        </button>
      </div>
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm">
        Tap the image to zoom · Esc to close
      </p>
    </div>
  );
}
