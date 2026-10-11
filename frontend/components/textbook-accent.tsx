import React from 'react';

interface WaveProps {
	className?: string;
	opacity?: number;
}

/**
 * Top-Right Textbook Wave: Matches the print textbook cover template
 * Layered dark slate curve (#1e293b) + vibrant deep cyan wave (#7ed957).
 */
export const TextbookWaveTopRight: React.FC<WaveProps> = ({
	className = '',
	opacity = 0.85,
}) => (
	<div
		className={`absolute right-0 top-0 h-28 w-44 sm:h-36 sm:w-64 pointer-events-none overflow-hidden select-none z-0 ${className}`}
		aria-hidden="true"
	>
		<svg
			viewBox="0 0 260 140"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-full w-full object-cover"
			preserveAspectRatio="none"
		>
			<path
				d="M30 0C90 75 140 25 260 100V0H30Z"
				fill="#0f172a"
				fillOpacity={opacity * 0.9}
			/>
			<path
				d="M85 0C135 90 175 35 260 140V0H85Z"
				fill="#7ed957"
				fillOpacity={opacity}
			/>
		</svg>
	</div>
);

/**
 * Bottom-Left Textbook Curve: Matches the print textbook cover template
 * Layered dark slate curve + deep cyan fluid wave.
 */
export const TextbookWaveBottomLeft: React.FC<WaveProps> = ({
	className = '',
	opacity = 0.85,
}) => (
	<div
		className={`absolute left-0 bottom-0 h-28 w-44 sm:h-36 sm:w-64 pointer-events-none overflow-hidden select-none z-0 ${className}`}
		aria-hidden="true"
	>
		<svg
			viewBox="0 0 260 140"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-full w-full object-cover"
			preserveAspectRatio="none"
		>
			<path
				d="M0 140V30C80 30 135 105 230 140H0Z"
				fill="#0f172a"
				fillOpacity={opacity * 0.9}
			/>
			<path
				d="M0 140V80C65 80 110 120 175 140H0Z"
				fill="#7ed957"
				fillOpacity={opacity}
			/>
		</svg>
	</div>
);
