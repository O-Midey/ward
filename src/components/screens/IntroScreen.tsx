'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui';

interface Slide { icon: IconName; title: string; body: string; }

const SLIDES: Slide[] = [
  {
    icon: 'shield-lock',
    title: 'Your keys,\nyour control',
    body: 'Ward generates and encrypts your keys on this device. No server ever sees your seed phrase — not even ours.',
  },
  {
    icon: 'search',
    title: 'Sign with\nconfidence',
    body: 'Every transaction is decoded before you sign. Unlimited approvals and unknown calls are flagged in plain language.',
  },
  {
    icon: 'layers',
    title: 'Five testnets,\none wallet',
    body: 'Ethereum, Base, Optimism, Arbitrum, Polygon — your tokens and NFTs in one elegant place. Never real funds.',
  },
];

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function IntroScreen({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const go = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50) go(index + 1);
    else if (info.offset.x > 50) go(index - 1);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--grad-hero)', paddingTop: 'var(--ward-safe-top)' }}
    >
      {/* Ward + Testnet badge — clears Dynamic Island */}
      <div className="flex-shrink-0 flex flex-col items-center pt-5 pb-0 px-6 gap-1">
        <span className="font-display text-[1.25rem] text-white/90 tracking-tight">Ward</span>
        <span className="text-[0.6rem] font-bold tracking-[0.18em] uppercase text-white/35 border border-white/15 px-2.5 py-0.5 rounded-full">
          Sepolia Testnet
        </span>
      </div>

      {/* Slide area — fills space between badge and bottom */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            initial={{ opacity: 0, x: dir * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -36 }}
            transition={{ duration: 0.3, ease: EASE }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center"
          >
            {/* Icon */}
            <div className="relative flex items-center justify-center mb-10">
              <div className="absolute w-44 h-44 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />
              <div className="absolute w-28 h-28 rounded-full"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: '80px', height: '80px', borderRadius: '26px',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Icon name={SLIDES[index].icon} size={36} strokeWidth={1.4} className="text-white" />
              </div>
            </div>

            {/* Title */}
            <h1 className="font-display text-[2.5rem] leading-[1.06] text-white tracking-tight mb-4 whitespace-pre-line">
              {SLIDES[index].title}
            </h1>
            <p className="text-[0.9375rem] text-white/55 leading-relaxed max-w-[17rem]">
              {SLIDES[index].body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom — dots + buttons */}
      <div className="flex-shrink-0 px-7 pb-[max(env(safe-area-inset-bottom,0px),2rem)]">
        {/* Dots — centered */}
        <div className="flex items-center justify-center gap-2 mb-7">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`}
              className="press transition-all duration-300"
              style={{
                height: '4px',
                width: i === index ? '28px' : '8px',
                borderRadius: '9999px',
                background: i === index ? '#fff' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>

        <div className="space-y-2.5">
          <button
            onClick={isLast ? onCreate : () => go(index + 1)}
            className="press w-full h-[52px] rounded-[var(--radius-lg)] font-semibold text-[0.9375rem] flex items-center justify-center"
            style={{ background: '#fff', color: 'var(--c-accent)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
          >
            {isLast ? 'Create new wallet' : 'Continue'}
          </button>
          <button
            onClick={onImport}
            className="press w-full h-[52px] rounded-[var(--radius-lg)] font-semibold text-[0.9375rem] flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            I already have a wallet
          </button>
        </div>
      </div>
    </motion.div>
  );
}
