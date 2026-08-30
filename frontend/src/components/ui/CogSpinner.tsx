'use client';

import { ReactNode } from 'react';

/**
 * CogSpinner - A gear/cog loading spinner component
 * Replaces all previous loading animations (Pac-Man, etc.)
 * White color, no opacity, configurable size
 */
interface CogSpinnerProps {
  size?: number; // size in pixels
  className?: string;
}

export function CogSpinner({ size = 32, className = '' }: CogSpinnerProps) {
  return (
    <svg
      className={`cog-spinner ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="-13 -13 45 45"
      enableBackground="new 0 0 96 96"
      xmlSpace="preserve"
      aria-hidden="true"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
    >
      <style>{`
        .box5631 {
          -webkit-transform-origin: 50% 50%;
          transform-origin: 50% 50%;
          fill: currentColor;
          will-change: transform;
        }

        @-webkit-keyframes moveBox5631-1 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          45.4545454545% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          54.5454545455% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          63.6363636364% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          72.7272727273% { -webkit-transform: translate(12px, 0px); transform: translate(12px, 0px); }
          81.8181818182% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          90.9090909091% { -webkit-transform: translate(-12px, 0px); transform: translate(-12px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-1 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          45.4545454545% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          54.5454545455% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          63.6363636364% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          72.7272727273% { -webkit-transform: translate(12px, 0px); transform: translate(12px, 0px); }
          81.8181818182% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          90.9090909091% { -webkit-transform: translate(-12px, 0px); transform: translate(-12px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(1) { -webkit-animation: moveBox5631-1 4s infinite; animation: moveBox5631-1 4s infinite; }

        @-webkit-keyframes moveBox5631-2 {
          9.0909090909% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          18.1818181818% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          45.4545454545% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          54.5454545455% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          63.6363636364% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          72.7272727273% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          81.8181818182% { -webkit-transform: translate(0px, 12px); transform: translate(0px, 12px); }
          90.9090909091% { -webkit-transform: translate(0px, 12px); transform: translate(0px, 12px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-2 {
          9.0909090909% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          18.1818181818% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          45.4545454545% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          54.5454545455% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          63.6363636364% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          72.7272727273% { -webkit-transform: translate(12px, 12px); transform: translate(12px, 12px); }
          81.8181818182% { -webkit-transform: translate(0px, 12px); transform: translate(0px, 12px); }
          90.9090909091% { -webkit-transform: translate(0px, 12px); transform: translate(0px, 12px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(2) { -webkit-animation: moveBox5631-2 4s infinite; animation: moveBox5631-2 4s infinite; }

        @-webkit-keyframes moveBox5631-3 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          45.4545454545% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          54.5454545455% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          63.6363636364% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          72.7272727273% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          81.8181818182% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-3 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          45.4545454545% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          54.5454545455% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          63.6363636364% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          72.7272727273% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          81.8181818182% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(3) { -webkit-animation: moveBox5631-3 4s infinite; animation: moveBox5631-3 4s infinite; }

        @-webkit-keyframes moveBox5631-4 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          36.3636363636% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          45.4545454545% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          54.5454545455% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          90.9090909091% { -webkit-transform: translate(-12px, 0px); transform: translate(-12px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-4 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          36.3636363636% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          45.4545454545% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          54.5454545455% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          90.9090909091% { -webkit-transform: translate(-12px, 0px); transform: translate(-12px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(4) { -webkit-animation: moveBox5631-4 4s infinite; animation: moveBox5631-4 4s infinite; }

        @-webkit-keyframes moveBox5631-5 {
          9.0909090909% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          18.1818181818% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          27.2727272727% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          36.3636363636% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          45.4545454545% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          54.5454545455% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          63.6363636364% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          72.7272727273% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          81.8181818182% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-5 {
          9.0909090909% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          18.1818181818% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          27.2727272727% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          36.3636363636% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          45.4545454545% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          54.5454545455% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          63.6363636364% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          72.7272727273% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          81.8181818182% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(5) { -webkit-animation: moveBox5631-5 4s infinite; animation: moveBox5631-5 4s infinite; }

        @-webkit-keyframes moveBox5631-6 {
          9.0909090909% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          18.1818181818% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          27.2727272727% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          36.3636363636% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          45.4545454545% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          54.5454545455% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-6 {
          9.0909090909% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          18.1818181818% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          27.2727272727% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          36.3636363636% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          45.4545454545% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          54.5454545455% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(6) { -webkit-animation: moveBox5631-6 4s infinite; animation: moveBox5631-6 4s infinite; }

        @-webkit-keyframes moveBox5631-7 {
          9.0909090909% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          18.1818181818% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          27.2727272727% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          36.3636363636% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          45.4545454545% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          54.5454545455% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-7 {
          9.0909090909% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          18.1818181818% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          27.2727272727% { -webkit-transform: translate(12px, 0); transform: translate(12px, 0); }
          36.3636363636% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          45.4545454545% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          54.5454545455% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          90.9090909091% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(7) { -webkit-animation: moveBox5631-7 4s infinite; animation: moveBox5631-7 4s infinite; }

        @-webkit-keyframes moveBox5631-8 {
          9.0909090909% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          36.3636363636% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          45.4545454545% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          54.5454545455% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          90.9090909091% { -webkit-transform: translate(12px, 0px); transform: translate(12px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-8 {
          9.0909090909% { -webkit-transform: translate(0, 0); transform: translate(0, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(-12px, -12px); transform: translate(-12px, -12px); }
          36.3636363636% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          45.4545454545% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          54.5454545455% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          63.6363636364% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          72.7272727273% { -webkit-transform: translate(0px, -12px); transform: translate(0px, -12px); }
          81.8181818182% { -webkit-transform: translate(12px, -12px); transform: translate(12px, -12px); }
          90.9090909091% { -webkit-transform: translate(12px, 0px); transform: translate(12px, 0px); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(8) { -webkit-animation: moveBox5631-8 4s infinite; animation: moveBox5631-8 4s infinite; }

        @-webkit-keyframes moveBox5631-9 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          45.4545454545% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          54.5454545455% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          63.6363636364% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          72.7272727273% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          81.8181818182% { -webkit-transform: translate(-24px, 0); transform: translate(-24px, 0); }
          90.9090909091% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        @keyframes moveBox5631-9 {
          9.0909090909% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          18.1818181818% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          27.2727272727% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          36.3636363636% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          45.4545454545% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          54.5454545455% { -webkit-transform: translate(0px, 0); transform: translate(0px, 0); }
          63.6363636364% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          72.7272727273% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          81.8181818182% { -webkit-transform: translate(-24px, 0); transform: translate(-24px, 0); }
          90.9090909091% { -webkit-transform: translate(-12px, 0); transform: translate(-12px, 0); }
          100% { -webkit-transform: translate(0px, 0px); transform: translate(0px, 0px); }
        }
        .box5631:nth-child(9) { -webkit-animation: moveBox5631-9 4s infinite; animation: moveBox5631-9 4s infinite; }
      `}</style>
      <g>
        <circle className="box5631" cx="13" cy="1" r="5"/>
        <circle className="box5631" cx="1" cy="1" r="5"/>
        <circle className="box5631" cx="25" cy="25" r="5"/>
        <circle className="box5631" cx="1" cy="13" r="5"/>
        <circle className="box5631" cx="13" cy="13" r="5"/>
        <circle className="box5631" cx="25" cy="13" r="5"/>
        <circle className="box5631" cx="1" cy="25" r="5"/>
        <circle className="box5631" cx="13" cy="25" r="5"/>
        <circle className="box5631" cx="25" cy="1" r="5"/>
      </g>
    </svg>
  );
}