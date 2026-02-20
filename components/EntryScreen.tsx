"use client";

type Props = {
  onNew: (topic: string) => void;
  onContinue: () => void;
};

export default function EntryScreen({ onNew, onContinue }: Props) {
  const handleNew = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const topic = (form.elements.namedItem("topic") as HTMLInputElement)?.value?.trim() || "";
    onNew(topic);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Chinese vocabulary chat</h1>
      <p className="text-gray-600">Choose how to start:</p>
      <div className="space-y-4">
        <form onSubmit={handleNew} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            New conversation — optional topic (English)
          </label>
          <input
            name="topic"
            type="text"
            placeholder="e.g. food, travel"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200 focus:border-blue-500"
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            New conversation
          </button>
        </form>
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-2 px-4 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
