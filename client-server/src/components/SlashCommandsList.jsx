import { useState, useEffect, useImperativeHandle, forwardRef } from "react";

const SlashCommandsList = forwardRef(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = (index) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden w-64 py-1">
      <p className="text-xs text-gray-400 px-3 py-2 border-b border-gray-100 font-medium uppercase tracking-wider">
        Blocks
      </p>
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
        <button
          key={index}
          onClick={() => selectItem(index)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
            index === selectedIndex
              ? "bg-indigo-50"
              : "hover:bg-gray-50"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            index === selectedIndex
              ? "bg-indigo-100 text-indigo-600"
              : "bg-gray-100 text-gray-600"
          }`}>
            {Icon ? <Icon className="w-4 h-4" strokeWidth={1.75} /> : null}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{item.title}</p>
            <p className="text-xs text-gray-400">{item.description}</p>
          </div>
        </button>
            );
          })}
    </div>
  );
});

SlashCommandsList.displayName = "SlashCommandsList";
export default SlashCommandsList;