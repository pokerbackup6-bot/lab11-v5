
import React from 'react';

export const CARD_BACK_URL = "https://raw.githubusercontent.com/Cody-Tan/poker-assets/master/card-back.png"; // Placeholder for card back pattern

export const PokerChipsIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeDasharray="4 2" />
    <circle cx="12" cy="12" r="6" fill="white" fillOpacity="0.2" />
  </svg>
);
