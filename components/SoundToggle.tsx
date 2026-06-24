"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "../lib/i18n/LocaleProvider";

/**
 * SoundToggle — the optional ambient temple-tone for the imperial-lacquer
 * redesign. Off (silent) by default; the drone only begins on an explicit tap,
 * which also satisfies browser autoplay rules (an AudioContext may only start
 * from a user gesture).
 *
 * The tone is synthesized in the Web Audio API — a low, slowly-beating drone
 * (root + fifth + octave through a lowpass), faded in/out on toggle — so there
 * is no binary audio asset to ship or license. Fixed bottom-right so it never
 * collides with the ExitButton (top-left) or LanguageSwitcher (top-right).
 */
type Graph = { ctx: AudioContext; master: GainNode };

export function SoundToggle() {
  const t = useT();
  const [on, setOn] = useState(false);
  const graphRef = useRef<Graph | null>(null);

  function ensureGraph(): Graph {
    if (graphRef.current) return graphRef.current;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor!();

    const master = ctx.createGain();
    master.gain.value = 0; // silent until toggled on
    master.connect(ctx.destination);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 680;
    lp.connect(master);

    // A slow temple drone: root, fifth, octave — each lightly detuned so the
    // partials beat against one another for a singing-bowl shimmer.
    const voices: Array<[freq: number, gain: number, detune: number]> = [
      [110, 0.5, -5],
      [165, 0.4, 4],
      [220, 0.22, -3],
    ];
    for (const [freq, gain, detune] of voices) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(lp);
      osc.start();
    }

    graphRef.current = { ctx, master };
    return graphRef.current;
  }

  async function toggle() {
    const { ctx, master } = ensureGraph();
    if (ctx.state === "suspended") await ctx.resume();
    const next = !on;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(next ? 0.05 : 0, now + 1.4);
    setOn(next);
  }

  // Tear down the AudioContext on unmount.
  useEffect(() => {
    return () => {
      graphRef.current?.ctx.close().catch(() => {});
      graphRef.current = null;
    };
  }, []);

  const label = t("nav.sound");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={on}
      className={`fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface/70 backdrop-blur-sm transition-colors duration-200 ${
        on ? "text-gold" : "text-text-muted hover:text-text"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" />
        {on ? (
          <>
            <path d="M16 9a4 4 0 0 1 0 6" strokeLinecap="round" />
            <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" strokeLinecap="round" opacity="0.7" />
          </>
        ) : (
          <path d="M16 9l5 6M21 9l-5 6" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
