'use client';

import Image from 'next/image';
import { useState } from 'react';

export function CrabLogo() {
  const [isBouncing, setIsBouncing] = useState(false);

  return (
    <button
      className="crabButton"
      type="button"
      aria-label="Make the Krabikani crab bounce"
      onClick={() => {
        setIsBouncing(false);
        window.setTimeout(() => setIsBouncing(true), 0);
      }}
      onAnimationEnd={() => setIsBouncing(false)}
    >
      <Image
        className={isBouncing ? 'crabIcon isBouncing' : 'crabIcon'}
        src="/images/krabikani-icon.png"
        alt=""
        width={40}
        height={40}
        priority
      />
    </button>
  );
}
