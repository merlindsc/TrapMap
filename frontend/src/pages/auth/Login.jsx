import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password);

    if (result?.error) {
      setError(result.message || "Login fehlgeschlagen");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-96 border border-gray-700">

        <h1 className="text-white text-2xl mb-6 font-bold text-center">
          TrapMap Login
        </h1>

        {error && (
          <div className="mb-4 text-red-400 bg-red-900/40 border border-red-700 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-Mail"
            className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Passwort"
            className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-semibold"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
