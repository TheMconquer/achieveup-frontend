import React from 'react';
import { Cog } from 'lucide-react';

interface SyncOverlayProps {
  quizzesDone?: number;
  quizzesTotal?: number;
}

/**
 * Blurs the content it's placed over (the parent must be `relative`) while a
 * course sync runs, so half-rebuilt scores are never shown. Two meshing gears
 * turn until the sync finishes; they hold still for reduced-motion users.
 */
const SyncOverlay: React.FC<SyncOverlayProps> = ({ quizzesDone = 0, quizzesTotal = 0 }) => {
  const progress =
    quizzesTotal > 0
      ? `${Math.min(quizzesDone, quizzesTotal)} of ${quizzesTotal} quizzes synced…`
      : 'Fetching quizzes from Canvas…';

  return (
    <div
      className="absolute inset-0 z-20 flex justify-center backdrop-blur-sm"
      data-testid="sync-overlay"
    >
      {/* Theme colors are CSS variables, which Tailwind's /opacity can't
          apply to, so the tint is its own layer. */}
      <div className="absolute inset-0 bg-white opacity-60" aria-hidden="true" />
      {/* Sticky so the card stays in view while scrolling a long table. */}
      <div className="sticky top-1/3 z-10 mt-16 mb-auto h-fit">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-lg"
        >
          <div className="relative h-16 w-20" aria-hidden="true">
            <Cog className="absolute left-0 top-1 h-12 w-12 text-amber-600 dark:text-ucf-gold motion-safe:animate-gear-cw" />
            <Cog className="absolute right-0 top-0 h-8 w-8 text-gray-500 motion-safe:animate-gear-ccw" />
          </div>
          <p className="mt-3 text-base font-medium text-gray-900">Syncing with Canvas</p>
          <p className="mt-1 text-sm text-gray-600">{progress}</p>
          <p className="mt-3 max-w-xs text-center text-xs text-gray-500">
            Scores will appear here when the sync finishes. You can leave this page; the sync keeps running.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SyncOverlay;
