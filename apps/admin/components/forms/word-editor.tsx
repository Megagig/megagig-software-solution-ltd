"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { uploadFile } from "@/lib/api-client";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code,
  Link as LinkIcon, Image as ImageIcon, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Palette, Table as TableIcon, Minus,
} from "@/lib/icons";

interface WordEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Called when the editor loses focus — handy for autosave. */
  onBlur?: () => void;
  /** Force editor height when used outside a flex layout. */
  minHeight?: number;
}

/**
 * MS-Word-style Tiptap editor.
 *
 * Toolbar: undo/redo · headings 1-3 · bold/italic/underline/strikethrough ·
 * text color · highlight · alignment 4-way · bullet/ordered lists ·
 * blockquote/code · link/image/table · horizontal rule.
 *
 * The container is a single rounded card so it reads like a Word page;
 * the toolbar sticks to the top of the card so it stays accessible while
 * scrolling through long content.
 */
export function WordEditor({ value, onChange, placeholder, onBlur, minHeight }: WordEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-accent underline" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg my-3 max-w-full" },
        allowBase64: false,
      }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "border-collapse border border-border my-3" } }),
      TableRow,
      TableHeader.configure({ HTMLAttributes: { class: "border border-border bg-bg-hover px-3 py-2 font-semibold" } }),
      TableCell.configure({ HTMLAttributes: { class: "border border-border px-3 py-2 align-top" } }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        // Word-page feel: white-ish surface, generous padding, prose
        // typography that survives the dark/light flip via theme tokens.
        class:
          "prose max-w-none p-8 focus:outline-none text-foreground " +
          "prose-headings:text-foreground prose-headings:font-bold " +
          "prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground " +
          "prose-li:text-foreground prose-a:text-accent " +
          "prose-blockquote:text-text-secondary prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:bg-bg-hover prose-blockquote:px-4 prose-blockquote:py-1 " +
          "prose-code:text-accent prose-code:bg-bg-hover prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none " +
          "prose-pre:bg-bg-secondary prose-pre:border prose-pre:border-border prose-pre:rounded-lg",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // emitUpdate=false suppresses the onUpdate echo.
      editor.commands.setContent(value || "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    try {
      const res = await uploadFile(file);
      const url = (res.data as Record<string, unknown>)?.url as string;
      if (url) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch {
      // Image upload errors surface via the toaster from useToastedMutation
      // when wired by the caller — the editor itself stays silent.
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const insertLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (!editor) {
    return (
      <div className="rounded-xl border border-border bg-bg-elevated p-8 text-sm text-text-muted">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-elevated shadow-sm overflow-hidden">
      {/* Sticky toolbar — stays anchored to the top of the editor card
          so it's always accessible while writing long articles. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-bg-elevated/95 backdrop-blur px-3 py-2">
        <ToolbarGroup>
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} aria-label="Undo" disabled={!editor.can().undo()}>
            <Undo className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} aria-label="Redo" disabled={!editor.can().redo()}>
            <Redo className="h-4 w-4" />
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarSep />

        <ToolbarGroup>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} aria-label="Heading 1">
            <Heading1 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} aria-label="Heading 2">
            <Heading2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} aria-label="Heading 3">
            <Heading3 className="h-4 w-4" />
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarSep />

        <ToolbarGroup>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} aria-label="Bold">
            <Bold className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} aria-label="Italic">
            <Italic className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} aria-label="Underline">
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} aria-label="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarSep />

        {/* Text color + highlight — pick from a small native palette so
            we don't pull in a separate picker component for v3.31. */}
        <ToolbarGroup>
          <label className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover" title="Text color">
            <Palette className="h-4 w-4" />
            <input
              type="color"
              onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <label className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover" title="Highlight">
            <Highlighter className="h-4 w-4" />
            <input
              type="color"
              defaultValue="#fef08a"
              onInput={(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </ToolbarGroup>

        <ToolbarSep />

        <ToolbarGroup>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} aria-label="Align left">
            <AlignLeft className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} aria-label="Align center">
            <AlignCenter className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} aria-label="Align right">
            <AlignRight className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} aria-label="Justify">
            <AlignJustify className="h-4 w-4" />
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarSep />

        <ToolbarGroup>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} aria-label="Bullet list">
            <List className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} aria-label="Ordered list">
            <ListOrdered className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} aria-label="Blockquote">
            <Quote className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} aria-label="Code block">
            <Code className="h-4 w-4" />
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarSep />

        <ToolbarGroup>
          <ToolbarBtn onClick={insertLink} active={editor.isActive("link")} aria-label="Insert link">
            <LinkIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => fileInputRef.current?.click()} aria-label="Insert image">
            <ImageIcon className="h-4 w-4" />
          </ToolbarBtn>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <ToolbarBtn onClick={insertTable} aria-label="Insert table">
            <TableIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Horizontal rule">
            <Minus className="h-4 w-4" />
          </ToolbarBtn>
        </ToolbarGroup>
      </div>

      <div style={minHeight ? { minHeight: minHeight + "px" } : undefined}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarSep() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

interface ToolbarBtnProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  "aria-label": string;
}

function ToolbarBtn({ children, onClick, active, disabled, ...rest }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent " +
        (active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-bg-hover hover:text-foreground")
      }
      {...rest}
    >
      {children}
    </button>
  );
}
