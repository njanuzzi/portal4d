/** Biblioteca 4D — editor Tiptap restrito a blocos seguros de leitura editorial. */
import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Bold, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}

function EditorButton({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`content-editor__tool ${active ? 'content-editor__tool--active' : ''}`}>{children}</button>;
}

export function RichTextEditor({ content, onChange, onUploadImage }: RichTextEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content,
    editorProps: { attributes: { class: 'content-editor__surface', 'aria-label': 'Corpo do artigo' } },
    onUpdate: ({ editor: nextEditor }) => onChange(nextEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content || '<p></p>', false);
  }, [content, editor]);

  const addLink = () => {
    const previous = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Cole o link completo', previous || 'https://');
    if (!editor || url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const handleImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    const url = await onUploadImage(file);
    if (url) editor.chain().focus().setImage({ src: url, alt: '' }).run();
    event.target.value = '';
  };

  if (!editor) return <div className="content-editor content-editor--loading">Carregando editor…</div>;

  return (
    <div className="content-editor">
      <div className="content-editor__toolbar" aria-label="Ferramentas de formatação">
        <EditorButton label="Desfazer" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></EditorButton>
        <EditorButton label="Refazer" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></EditorButton>
        <span className="content-editor__separator" />
        <EditorButton label="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></EditorButton>
        <EditorButton label="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></EditorButton>
        <EditorButton label="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</EditorButton>
        <EditorButton label="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</EditorButton>
        <EditorButton label="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></EditorButton>
        <EditorButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></EditorButton>
        <EditorButton label="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></EditorButton>
        <EditorButton label="Inserir link" active={editor.isActive('link')} onClick={addLink}><Link2 size={16} /></EditorButton>
        <EditorButton label="Enviar imagem" onClick={() => inputRef.current?.click()}><ImagePlus size={16} /></EditorButton>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImage} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
