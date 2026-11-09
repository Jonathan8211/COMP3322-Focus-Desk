import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";
import BrandMark from "../components/BrandMark";
import ThemeSwitcher from "../components/ThemeSwitcher";

const PASSWORD_RULES = [
  {
    test: (password) => password.length >= 8,
    message: "Password must be at least 8 characters long.",
  },
  {
    test: (password) => /[A-Z]/.test(password),
    message: "Password must contain at least 1 uppercase letter (A-Z).",
  },
  {
    test: (password) => /[0-9]/.test(password),
    message: "Password must contain at least 1 number.",
  },
  {
    test: (password) => /[^A-Za-z0-9]/.test(password),
    message: "Password must contain at least 1 special character (e.g. !@#$).",
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const invalidRule = PASSWORD_RULES.find((rule) => !rule.test(form.password));
    if (invalidRule) {
      setError(invalidRule.message);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Confirmation password does not match the password.");
      return;
    }

    setLoading(true);

    const res = await registerUser({
      name: form.name,
      email: form.email,
      password: form.password,
      timezone,
    });

    if (res.success) {
      setSuccess("Account created successfully! Please sign in.");
      setForm({ name: "", email: "", password: "", confirmPassword: "" });
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 transition-colors duration-200">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end"><ThemeSwitcher /></div>
        <div className="text-center mb-10">
          <div className="flex justify-center">
            <BrandMark size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-3 tracking-tight">FocusDesk</h1>
          <p className="text-gray-400 text-sm mt-1">Create a new account</p>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-2xl mb-5 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="bg-blue-50 border border-blue-100 text-blue-600 px-4 py-3 rounded-2xl mb-5 text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 transition-colors duration-200">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
            <input
              type="email"
              placeholder="rith@gmail.com"
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
            <p className="text-[11px] text-gray-400 mt-1.5">
              Minimum 8 characters, with an uppercase letter, a number, and a special character.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Time zone</label>
            <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400" required />
            <p className="text-[11px] text-gray-400 mt-1">Use an IANA time zone, such as Asia/Shanghai.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl transition text-sm disabled:opacity-50 mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-gray-400 text-xs text-center mt-6">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-gray-900 font-medium hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
