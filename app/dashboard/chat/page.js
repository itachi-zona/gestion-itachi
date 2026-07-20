"use client";
import { useEffect, useRef, useState } from "react";
import Topbar from "@/components/Topbar";

const SUGGESTIONS = [
  "¿Cuánto he ganado este mes?",
  "¿Qué clientes tienen pagos vencidos?",
  "¿Cuál servicio me da más ingresos?",
  "¿Quiénes son mis mejores clientes?"
];

const GREETING = { role: "assistant", content: "Hola, soy tu asistente de ventas. Pregúntame lo que quieras sobre tus clientes, ingresos, vencimientos o servicios." };

export default function ChatIAPage() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  async function loadHistory() {
    setLoadingHistory(true);
    const rows = await fetch("/api/chat").then((r) => r.json());
    if (Array.isArray(rows) && rows.length > 0) {
      setMessages([GREETING, ...rows.map((r) => ({ role: r.role, content: r.content }))]);
    }
    setLoadingHistory(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError("");
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo obtener respuesta.");
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
  }

  async function newConversation() {
    if (!confirm("¿Borrar el historial de esta conversación?")) return;
    await fetch("/api/chat", { method: "DELETE" });
    setMessages([GREETING]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between -mt-2 mb-4">
        <Topbar title="Chat con IA sobre mis ventas" />
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500">{loadingHistory ? "Cargando conversación..." : "Tu historial se guarda automáticamente"}</p>
          <button className="text-xs text-gray-400 hover:text-red-400 hover:underline" onClick={newConversation}>
            Nueva conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-accent text-white" : "bg-panel2 border border-border text-gray-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-panel2 border border-border rounded-2xl px-4 py-2 text-sm text-gray-400">Pensando...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        {messages.length <= 1 && !loadingHistory && (
          <div className="flex flex-wrap gap-2 mt-4">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="text-xs border border-border rounded-full px-3 py-1.5 text-gray-300 hover:border-accent hover:text-accent-light" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-3 mt-4"
        >
          <input
            className="input flex-1"
            placeholder="Escribe tu pregunta sobre tus ventas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn-primary" disabled={loading}>Enviar</button>
        </form>
      </div>
    </div>
  );
}
