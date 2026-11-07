import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy from "tippy.js";
import SlashCommandsList from "./SlashCommandsList.jsx";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Bold,
  Italic,
} from "lucide-react";

const COMMANDS = [
  { title: "Heading 1", description: "Large heading", icon: Heading1, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run() },
  { title: "Heading 2", description: "Medium heading", icon: Heading2, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run() },
  { title: "Heading 3", description: "Small heading", icon: Heading3, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run() },
  { title: "Bullet List", description: "Bulleted list", icon: List, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: "Numbered List", description: "Numbered list", icon: ListOrdered, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: "Blockquote", description: "Quoted text", icon: Quote, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: "Code Block", description: "Block of code", icon: Code, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { title: "Divider", description: "Horizontal divider", icon: Minus, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  { title: "Bold", description: "Bold text", icon: Bold, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBold().run() },
  { title: "Italic", description: "Italic text", icon: Italic, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleItalic().run() },
];

export default Extension.create({
  name: "slashCommands",
  addOptions() {
    return { suggestion: { char: "/", command: ({ editor, range, props }) => props.command({ editor, range }) } };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => COMMANDS.filter((item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8),
        render: () => {
          let component;
          let popup;
          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandsList, { props, editor: props.editor });
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate: (props) => {
              component.updateProps(props);
              popup[0].setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") { popup[0].hide(); return true; }
              return component.ref?.onKeyDown(props);
            },
            onExit: () => {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});