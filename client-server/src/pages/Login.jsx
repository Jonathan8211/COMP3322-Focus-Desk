import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../contexts/useAuth";
import ThemeSwitcher from "../components/ThemeSwitcher";

export default function Login() {
  const { acceptSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await loginUser(form);
    if (res.success) {
      acceptSession(res.data);
      navigate("/dashboard");
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 transition-colors duration-200">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end"><ThemeSwitcher /></div>
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center">
            <BrandMark size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-3 tracking-tight">FocusDesk</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to continue</p>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-2xl mb-5 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 transition-colors duration-200">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl transition text-sm disabled:opacity-50 mt-2"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-gray-400 text-xs text-center mt-6">
          Don&apos;t have an account?{" "}
          <button onClick={() => navigate("/register")} className="text-gray-900 font-medium hover:underline">
            Sign up now
          </button>
        </p>
      </div>
    </div>
  );
}
