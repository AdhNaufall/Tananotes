import React from 'react';

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Back tab */}
            <path d="M22 26C22 20.477 26.477 16 32 16H47C50.314 16 53 18.686 53 22V40H22V26Z" fill="#335A7B" />
            {/* Main folder body */}
            <rect x="22" y="25" width="56" height="55" rx="10" fill="#7FAED0" />
            {/* Top vertical notches */}
            <rect x="38" y="26" width="2" height="6" rx="1" fill="#FFFFFF" />
            <rect x="45" y="26" width="2" height="6" rx="1" fill="#FFFFFF" />
            <rect x="52" y="26" width="2" height="6" rx="1" fill="#FFFFFF" />
            <rect x="59" y="26" width="2" height="6" rx="1" fill="#FFFFFF" />

            {/* Left eye (circle) */}
            <circle cx="37" cy="45" r="4.5" fill="#335A7B" stroke="#FFFFFF" strokeWidth="1" />

            {/* Right eye/gamepad shape */}
            <path d="M54 47C54 44 56 43 58 43C60 43 62 44 62 47" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

            {/* Horizontal lines at bottom */}
            <rect x="27" y="60" width="46" height="1.5" rx="0.75" fill="#FFFFFF" />
            <rect x="27" y="64" width="38" height="1.5" rx="0.75" fill="#FFFFFF" />
            <rect x="27" y="68" width="28" height="1.5" rx="0.75" fill="#FFFFFF" />
        </svg>
    );
}
