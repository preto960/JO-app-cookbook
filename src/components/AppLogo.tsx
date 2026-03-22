// src/components/AppLogo.tsx
// SVG recortado al círculo del emblema (viewBox centrado en el logo)
// Funciona en web, iOS y Android sin dependencias extra.
import React from 'react';
import { Image, View } from 'react-native';

// viewBox recortado: solo el círculo del emblema
// Centro original: cx=340, cy=192, r=148 → caja: 192,44 → 488,340
// Añadimos 4px de padding: 188,40 → 492,344 = 304x304
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="188 40 304 304">
<defs>
  <style>
    .bg-ring  { fill:#111827; stroke:#00D4FF; }
    .bg-ring2 { fill:none; stroke:#00D4FF; stroke-opacity:0.2; }
    .bg-ring3 { fill:none; stroke:#00D4FF; stroke-opacity:0.1; }
    .book-pg    { fill:#FFFFFF; }
    .book-spine { fill:#E2E8F0; }
    .book-line  { stroke:#94A3B8; fill:none; stroke-linecap:round; }
    .book-curve { stroke:#CBD5E1; fill:none; stroke-linecap:round; stroke-width:1.8; }
    .vapor      { stroke:#1E293B; fill:none; stroke-linecap:round; stroke-width:2.2; }
    .c-letter   { fill:#FFFFFF; font-family:sans-serif; font-size:42px; font-weight:500; }
    .b-letter   { fill:#00D4FF; font-family:sans-serif; font-size:42px; font-weight:500; }
  </style>
</defs>

<!-- Rings -->
<circle class="bg-ring"  cx="340" cy="192" r="148" stroke-width="2.5"/>
<circle class="bg-ring2" cx="340" cy="192" r="132" stroke-width="1"/>
<circle class="bg-ring3" cx="340" cy="192" r="116" stroke-width="0.8"/>

<!-- LIBRO ABIERTO - blanco -->
<path class="book-pg" d="M300 158 Q300 138 320 136 L342 134 L342 192 L320 194 Q300 196 300 178 Z"/>
<path class="book-pg" d="M386 158 Q386 138 366 136 L342 134 L342 192 L366 194 Q386 196 386 178 Z"/>
<rect class="book-spine" x="339" y="134" width="6" height="58" rx="2"/>
<path fill="none" stroke="#CBD5E1" stroke-width="0.8" d="M300 158 Q300 138 320 136 L342 134 L342 192 L320 194 Q300 196 300 178 Z"/>
<path fill="none" stroke="#CBD5E1" stroke-width="0.8" d="M386 158 Q386 138 366 136 L342 134 L342 192 L366 194 Q386 196 386 178 Z"/>
<line class="book-line" x1="310" y1="150" x2="336" y2="149" stroke-width="1.6" opacity="0.7"/>
<line class="book-line" x1="310" y1="158" x2="336" y2="157" stroke-width="1.6" opacity="0.7"/>
<line class="book-line" x1="310" y1="166" x2="336" y2="165" stroke-width="1.6" opacity="0.6"/>
<line class="book-line" x1="310" y1="174" x2="330" y2="173" stroke-width="1.6" opacity="0.45"/>
<line class="book-line" x1="348" y1="150" x2="374" y2="149" stroke-width="1.6" opacity="0.7"/>
<line class="book-line" x1="348" y1="158" x2="374" y2="157" stroke-width="1.6" opacity="0.7"/>
<line class="book-line" x1="348" y1="166" x2="374" y2="165" stroke-width="1.6" opacity="0.6"/>
<line class="book-line" x1="348" y1="174" x2="368" y2="173" stroke-width="1.6" opacity="0.45"/>
<path class="book-curve" d="M300 178 Q321 204 343 200 Q365 204 386 178"/>

<!-- CB -->
<text x="343" y="248" text-anchor="middle" dominant-baseline="central" letter-spacing="5">
  <tspan class="c-letter">C</tspan><tspan class="b-letter">B</tspan>
</text>

<!-- VAPOR - oscuro -->
<path class="vapor" opacity="0.75" d="M326 126 Q322 118 326 110 Q330 102 326 94"/>
<path class="vapor" opacity="0.75" d="M343 124 Q339 116 343 108 Q347 100 343 92"/>
<path class="vapor" opacity="0.75" d="M360 126 Q356 118 360 110 Q364 102 360 94"/>

<!-- TENEDOR - naranja -->
<g transform="translate(226,175) rotate(-18)">
  <rect fill="#E8893A" x="-4" y="28" width="8" height="42" rx="4"/>
  <rect fill="#E8893A" x="-3" y="12" width="6" height="18" rx="1"/>
  <rect fill="#E8893A" x="-11" y="-10" width="5" height="24" rx="2.5"/>
  <rect fill="#E8893A" x="-3"  y="-10" width="5" height="24" rx="2.5"/>
  <rect fill="#E8893A" x="5"   y="-10" width="5" height="24" rx="2.5"/>
</g>

<!-- CUCHILLO - plateado -->
<g transform="translate(256,172) rotate(-10)">
  <rect fill="#8B9AAF" x="-4" y="20" width="8" height="44" rx="4"/>
  <rect fill="#6B7A8F" x="-6" y="14" width="12" height="8" rx="2"/>
  <path fill="#C8D4E0" d="M-3 14 L-3 -24 Q0 -30 3 -24 L3 14 Z"/>
  <path fill="#E8EFF5" d="M1 14 L1 -24 Q2 -28 3 -24 L3 14 Z" opacity="0.6"/>
</g>

<!-- SARTEN - grafito/rojo -->
<g transform="translate(444,175)">
  <ellipse fill="#3A4558" cx="0" cy="0" rx="30" ry="24"/>
  <ellipse fill="#111827" cx="0" cy="0" rx="22" ry="17" opacity="0.7"/>
  <path fill="#4A5568" d="M-30 0 Q-30 -6 0 -6 Q30 -6 30 0" opacity="0.8"/>
  <rect fill="#C0392B" x="28" y="-5" width="36" height="10" rx="5"/>
  <rect fill="#E74C3C" x="30" y="-3" width="30" height="6" rx="3" opacity="0.5"/>
</g>

<!-- BATIDORA - morado -->
<g transform="translate(430,232) rotate(20)">
  <rect fill="#7C3AED" x="-11" y="-18" width="22" height="30" rx="5"/>
  <circle fill="#9F67F5" cx="0" cy="-5" r="4.5"/>
  <circle fill="#FFFFFF" cx="0" cy="-5" r="2.8" opacity="0.35"/>
  <rect fill="#7C3AED" x="-4" y="12" width="8" height="9" rx="2"/>
  <path stroke="#B0BEC5" stroke-width="2.2" stroke-linecap="round" fill="none" d="M-5 21 Q-9 31 -5 41 Q-1 51 -5 61"/>
  <path stroke="#B0BEC5" stroke-width="2.2" stroke-linecap="round" fill="none" d="M5 21 Q9 31 5 41 Q1 51 5 61"/>
</g>

<!-- OLLA - verde -->
<g transform="translate(240,248)">
  <path fill="#2E7D52" d="M-32 0 Q-32 36 0 36 Q32 36 32 0 Z"/>
  <rect fill="#2E7D52" x="-32" y="-6" width="64" height="10" rx="4"/>
  <rect fill="#4A5568" x="-28" y="-18" width="56" height="8" rx="4"/>
  <rect fill="#6B7A8F" x="-5"  y="-26" width="10" height="10" rx="5"/>
  <rect fill="#E8893A" x="-46" y="-8" width="16" height="7" rx="3.5"/>
  <rect fill="#E8893A" x="30"  y="-8" width="16" height="7" rx="3.5"/>
  <path fill="#3D9E68" d="M-28 0 Q-28 8 0 10 Q28 8 28 0 Z" opacity="0.35"/>
</g>

<!-- CUCHARA - dorado -->
<g transform="translate(432,136) rotate(30)">
  <rect fill="#C4922A" x="-3" y="12" width="6" height="44" rx="3"/>
  <ellipse fill="#D4A843" cx="0" cy="4" rx="10" ry="14"/>
  <ellipse fill="#111827" cx="0" cy="6" rx="7" ry="10" opacity="0.45"/>
  <ellipse fill="#EFC96A" cx="-2" cy="0" rx="4" ry="6" opacity="0.4"/>
</g>

<!-- Puntos decorativos -->
<circle fill="#E8893A" cx="297" cy="270" r="2.2" opacity="0.4"/>
<circle fill="#7C3AED" cx="390" cy="274" r="2"   opacity="0.35"/>
<circle fill="#2E7D52" cx="352" cy="292" r="1.8" opacity="0.3"/>
<circle fill="#C4922A" cx="316" cy="112" r="2"   opacity="0.35"/>
<circle fill="#C0392B" cx="368" cy="110" r="1.8" opacity="0.3"/>
</svg>`;

function svgToUri(svg: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svg.trim())));
  return `data:image/svg+xml;base64,${encoded}`;
}

const LOGO_URI = svgToUri(LOGO_SVG);

interface AppLogoProps {
  /** Tamaño del lado del logo (es cuadrado). Default: 140 */
  size?: number;
}

export default function AppLogo({ size = 140 }: AppLogoProps) {
  return (
    <Image
      source={{ uri: LOGO_URI }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
