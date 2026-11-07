import { useState } from "react";
import { getMe, updateMe } from "../services/api";

export default function Settings({ user, onUserUpdated }) {
  const [name, setName] = useState(user?.name || "");
  const [message, setMessage] = useState("");
  const save = async (event) => {
    event.preventDefault();
    const result = await updateMe({ name });
    if (result.success) { onUserUpdated?.(result.data); setMessage("Saved"); }
    else setMessage(result.message || "Could not save settings.");
  };
  const refresh = async () => {
    const result = await getMe();
    if (result.success) { setName(result.data.name); onUserUpdated?.(result.data); }
  };
  return <section className="max-w-xl p-8 mx-auto"><h1 className="text-2xl font-bold">Settings</h1><p className="text-gray-500 mt-2">Manage your account.</p>
    <form onSubmit={save} className="bg-white border rounded-2xl p-5 mt-6 space-y-4">
      <label className="block text-sm">Name<input className="block border rounded-lg p-2 w-full mt-1" value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="block text-sm">Email<input className="block border rounded-lg p-2 w-full mt-1 bg-gray-50" value={user?.email || ""} disabled /></label>
      <div className="flex gap-3"><button className="bg-indigo-600 text-white rounded-lg px-4 py-2">Save</button><button type="button" onClick={refresh} className="text-gray-600">Refresh</button></div>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  </section>;
}
