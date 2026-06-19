'use client';

import { useState, useEffect } from 'react';

interface AnimatedTimeProps {
  minutes: number;
}

export function AnimatedTime({ minutes }: AnimatedTimeProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.floor(easeOut * minutes));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [minutes]);

  const hrs = Math.floor(current / 60);
  const mins = current % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}
