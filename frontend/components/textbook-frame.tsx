import React from 'react';

/**
 * Top-Right Cyan Waves for the Header Bar
 * Extracted directly from /mnt/LocalDisk/E-Book - Template/index.html (viewBox 0 0 422 263)
 */
export const HeaderTopRightWaves = ({ className = '' }: { className?: string }) => (
	<div
		className={`absolute right-0 top-0 h-full w-64 sm:w-96 pointer-events-none select-none overflow-hidden z-0 ${className}`}
		aria-hidden="true"
	>
		<svg
			viewBox="0 0 422 263"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-full w-full object-cover"
			preserveAspectRatio="none"
			shapeRendering="geometricPrecision"
		>
			{/* Translucent white accent wave from template line 152 */}
			<path
				fill="#FFFFFF"
				fillOpacity="0.08"
				d="M188 0H422V263H415C397 259 383 251 376 246C368 239 360 225 364 212C358 199 355 190 354 182C351 164 354 147 350 134C346 121 339 116 333 110C326 104 316 100 310 98C289 90 258 83 246 78C231 72 217 62 202 42C196 30 201 11 188 0Z"
			/>
			{/* Slate/Dark wave */}
			<path
				fill="#1A4552"
				d="M0 0C22 10 61 19 83 31C103 43 105 78 123 121C141 156 166 170 193 166C218 162 250 154 270 160C290 166 300 190 316 220C329 240 362 258 421 262C389 258 360 247 340 235C320 220 315 192 302 168C292 151 280 143 260 140C239 137 221 144 208 141C187 137 168 119 157 96C146 73 144 43 139 21C136 10 137 4 127 0Z"
			/>
			{/* Deep Cyan primary wave (#7ed957) */}
			<path
				fill="#7ed957"
				d="M129 0C137 17 141 38 146 62C151 86 163 111 181 126C200 141 238 138 268 139C286 140 295 149 302 166C311 187 318 214 338 231C360 251 390 261 417 260C399 252 379 237 368 220C357 204 359 190 354 182C351 166 354 146 350 134C346 121 339 116 333 110C326 104 316 100 310 98C289 90 258 83 246 78C230 71 216 61 202 42C195 29 201 11 190 0Z"
			/>
		</svg>
	</div>
);

/**
 * Bottom-Left Corner Swoop for the Footer
 * Extracted directly from /mnt/LocalDisk/E-Book - Template/index.html (viewBox 0 0 240 260)
 */
export const FooterBottomLeftSwoop = ({ className = '' }: { className?: string }) => (
	<div
		className={`absolute left-0 bottom-0 h-full w-56 sm:w-80 pointer-events-none select-none overflow-hidden z-0 ${className}`}
		aria-hidden="true"
	>
		<svg
			viewBox="0 0 240 260"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-full w-full object-cover"
			preserveAspectRatio="none"
			shapeRendering="geometricPrecision"
		>
			<path
				fill="#1A4552"
				d="M25 3C43 18 61 40 71 54C83 75 78 104 80 121C82 139 94 150 107 157C125 167 147 169 158 173C178 180 189 198 193 218C196 234 197 248 197 259H237C238 238 233 214 216 180C206 166 193 160 184 156C169 151 144 149 127 147C110 145 99 138 93 114C87 91 84 63 75 47C67 33 58 25 52 21C40 11 32 5 25 3Z"
			/>
			<path
				fill="#7ed957"
				d="M22 6C17 8 14 10 15 12C26 31 35 55 36 72C37 95 28 116 23 134C20 150 29 164 48 181C63 194 92 214 103 221C119 234 128 246 131 259H195C196 239 191 216 173 187C160 174 145 167 126 163C111 158 98 156 85 141C75 128 80 106 76 78C73 58 64 42 55 33C42 21 31 11 22 6Z"
			/>
		</svg>
	</div>
);

/**
 * 3-Layer Isometric Stacked Publishing Emblem
 * Extracted directly from /mnt/LocalDisk/E-Book - Template/index.html (viewBox 0 0 64 43)
 */
export const PublishingDiamondsLogo = ({ className = 'h-5 w-7' }: { className?: string }) => (
	<svg
		viewBox="0 0 64 43"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className={className}
		aria-hidden="true"
	>
		<path fill="#263E45" d="M4 29 32 21 60 29 32 39Z" />
		<path fill="#7ed957" d="M4 20 32 12 60 20 32 30Z" />
		<path fill="#B4B4B4" d="M4 11 32 3 60 11 32 21Z" />
	</svg>
);
