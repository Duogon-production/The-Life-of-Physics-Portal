/**
 * Site-wide static assets (logos, brand images). Per the image URL standard
 * these are external web URLs, configured through env variables.
 * The EduLabs mark itself is rendered as inline SVG (frontend/components/edulabs-mark.tsx).
 * Leave a value empty to render nothing / the inline fallback.
 */
export const SITE_ASSETS = {
	logoUrl: process.env.NEXT_PUBLIC_LOGO_URL ?? '',
	textbookTemplateUrl: process.env.NEXT_PUBLIC_TEXTBOOK_TEMPLATE_URL ?? '',
} as const;
