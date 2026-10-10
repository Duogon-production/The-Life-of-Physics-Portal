'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import 'react-quill-new/dist/quill.snow.css';

interface EditorProps {
	value: string;
	onChange: (value: string) => void;
}

export const Editor = ({ value, onChange }: EditorProps) => {
	const ReactQuill = useMemo(
		() => dynamic(() => import('react-quill-new'), { ssr: false }),
		[]
	);

	return (
		<div className="bg-white">
			<ReactQuill theme="snow" value={value} onChange={onChange} useSemanticHTML={false} />
		</div>
	);
};
