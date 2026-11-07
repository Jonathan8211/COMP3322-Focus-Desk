import { useState, useEffect, useRef } from "react";
import Editor from "../components/Editor";
import { FileText, Plus, X } from "lucide-react";
import { getNotes, createNote, updateNote, deleteNote } from "../services/api";

const EMOJI_LIST = ["📄", "📝", "💡", "🎯", "📊", "🚀", "⭐", "🔥", "💼", "🎨", "📚", "🌟"];
const LOCAL_KEY = "notion_pages";

export default function NotionPages() {
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const saveTimers = useRef({});

  const currentPage = pages.find((p) => p.id === activePage);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      setLoading(true);
      setError("");
      const res = await getNotes();
      if (!active) return;

      if (!res.success) {
        setError(res.message || "Could not load notes");
        setLoading(false);
        return;
      }

      let notes = res.data;
      if (notes.length === 0) {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          try {
            const local = JSON.parse(raw);
            if (Array.isArray(local) && local.length > 0) {
              const imported = [];
              for (const page of local) {
                const created = await createNote({
                  title: page.title || "Untitled",
                  emoji: page.emoji || "📄",
                  content: page.content || "",
                });
                if (created.success) imported.push(created.data);
              }
              notes = imported;
              localStorage.removeItem(LOCAL_KEY);
            }
          } catch {
            /* ignore bad local cache */
          }
        }
      }

      setPages(notes);
      setActivePage(notes[0]?.id || null);
      setLoading(false);
    };

    boot();
    const timers = saveTimers.current;
    return () => {
      active = false;
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const pendingSaves = useRef({});

  const scheduleSave = (id, data) => {
    pendingSaves.current[id] = { ...(pendingSaves.current[id] || {}), ...data };
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      const payload = pendingSaves.current[id];
      delete pendingSaves.current[id];
      const res = await updateNote(id, payload);
      if (!res.success) {
        setError(res.message || "Could not save note");
        return;
      }
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...res.data } : p)));
    }, 500);
  };

  const createPage = async () => {
    setError("");
    const res = await createNote({
      title: "Untitled",
      emoji: EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
      content: "",
    });
    if (!res.success) {
      setError(res.message || "Could not create note");
      return;
    }
    setPages((prev) => [res.data, ...prev]);
    setActivePage(res.data.id);
  };

  const updatePage = (id, data) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      )
    );
    scheduleSave(id, data);
  };

  const removePage = async (id) => {
    setError("");
    const res = await deleteNote(id);
    if (!res.success) {
      setError(res.message || "Could not delete note");
      return;
    }
    setPages((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      setActivePage((current) => (current === id ? remaining[0]?.id || null : current));
      return remaining;
    });
  };

  const changeEmoji = (id) => {
    const emoji = EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
    updatePage(id, { emoji });
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-screen">
      <div className="w-56 bg-gray-50 dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Pages
          </span>
          <button
            onClick={createPage}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            aria-label="New page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {pages.length === 0 ? (
            <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6 px-4">No pages yet</p>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition ${
                  activePage === page.id
                    ? "bg-white dark:bg-gray-900 shadow-sm dark:shadow-none text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-900 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span className="text-sm flex-shrink-0">{page.emoji}</span>
                <span className="text-xs font-medium truncate flex-1">{page.title || "Untitled"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePage(page.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-red-400 transition"
                  aria-label="Delete page"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={createPage}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-900 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="text-sm text-red-500 px-8 pt-4">{error}</p>
        )}
        {!currentPage ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" strokeWidth={1.5} />
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Select a page or create a new one</p>
            <button
              onClick={createPage}
              className="inline-flex items-center gap-1.5 bg-gray-900 dark:bg-blue-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-gray-700 dark:hover:bg-blue-500 transition"
            >
              <Plus className="w-4 h-4" /> New Page
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-12">
            <button
              onClick={() => changeEmoji(currentPage.id)}
              className="text-5xl mb-4 hover:opacity-70 transition block"
              title="Click to change emoji"
            >
              {currentPage.emoji}
            </button>

            {editingTitle ? (
              <input
                autoFocus
                value={currentPage.title}
                onChange={(e) => updatePage(currentPage.id, { title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                className="w-full text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 outline-none bg-transparent mb-6 border-b border-gray-200 dark:border-gray-700 pb-2"
                placeholder="Untitled"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 cursor-text hover:opacity-70 transition"
              >
                {currentPage.title || (
                  <span className="text-gray-300 dark:text-gray-600">Untitled</span>
                )}
              </h1>
            )}

            <p className="text-xs text-gray-300 dark:text-gray-600 mb-8">
              Updated {formatDate(currentPage.updatedAt)}
            </p>

            <div className="border-t border-gray-100 dark:border-gray-800 mb-8" />

            <Editor
              key={currentPage.id}
              content={currentPage.content}
              onChange={(html) => updatePage(currentPage.id, { content: html })}
              placeholder="Start typing... Use the toolbar above to format your text."
            />
          </div>
        )}
      </div>
    </div>
  );
}
