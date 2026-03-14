"use client";

type Props = {
  newWordsPerConversation: number;
  onNewWordsChange: (n: number) => void;
  debugMode: boolean;
  onDebugChange: (on: boolean) => void;
  open: boolean;
};

export default function SettingsMenu({
  newWordsPerConversation,
  onNewWordsChange,
  debugMode,
  onDebugChange,
  open,
}: Props) {
  if (!open) return null;
  return (
    <div className="absolute right-0 top-full mt-1 w-64 p-4 bg-white border border-gray-200 rounded-lg shadow z-10">
      <div className="mb-3">
        <span className="font-medium text-gray-900">Settings</span>
      </div>
      <label className="block text-sm text-gray-700 mb-3">
        New words per conversation
        <input
          type="number"
          min={1}
          max={50}
          value={newWordsPerConversation}
          onChange={(e) => onNewWordsChange(parseInt(e.target.value, 10) || 10)}
          className="mt-1 w-full px-2 py-1 border rounded"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(e) => onDebugChange(e.target.checked)}
          className="rounded"
        />
        Debug mode
      </label>
      <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
        <a
          href={`/vocabulary?newWordsPerConversation=${newWordsPerConversation}&debug=${debugMode}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-blue-600 hover:underline"
        >
          Show current vocabulary
        </a>
        <a
          href="/words"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-blue-600 hover:underline"
        >
          Inspect word database
        </a>
      </div>
    </div>
  );
}
