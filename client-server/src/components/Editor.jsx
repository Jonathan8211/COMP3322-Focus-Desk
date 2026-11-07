import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import SlashCommands from "./SlashCommands";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
} from "lucide-react";

const ToolbarButton = ({ onClick, active, title, children }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition ${
      active ? "bg-gray-900 dark:bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
    }`}
  >
    {children}
  </button>
);

export default function Editor({ content, onChange, placeholder = "Start typing here..." }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      SlashCommands,
    ],
    content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px] prose prose-sm max-w-none text-gray-800 dark:text-gray-100",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-gray-100 dark:border-gray-800 pb-2 mb-3">
        {/* Text style */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}