"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  club_id: number;
  name: string;
  tags: string[];
  vote_count: number;
  avg_rating: number;
  score: number;
};

function MiniStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const gold = "#FBC02D";
  const grey = "#dadce0";

  return (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => {
        let fill: "full" | "half" | "empty" = "empty";
        if (rating >= s) fill = "full";
        else if (rating >= s - 0.5) fill = "half";

        const id = `lb-${s}-${Math.random().toString(36).slice(2, 7)}`;

        return (
          <svg key={s} width={size} height={size} viewBox="0 0 24 24">
            {fill === "half" && (
              <defs>
                <linearGradient id={id}>
                  <stop offset="50%" stopColor={gold} />
                  <stop offset="50%" stopColor={grey} />
                </linearGradient>
              </defs>
            )}
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
              fill={
                fill === "full" ? gold : fill === "half" ? `url(#${id})` : grey
              }
              stroke="none"
            />
          </svg>
        );
      })}
    </span>
  );
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setRows(json.leaderboard ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Vote
          </a>
          <span className="text-base font-semibold tracking-tight">
            Leaderboard
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-gray-400 hover:text-gray-600"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center py-16 text-gray-400">
            No votes yet — go rate some clubs!
          </p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Top 3 */}
            {top3.map((r, idx) => (
              <div
                key={r.club_id}
                className={`flex items-center gap-4 px-4 py-4 ${
                  idx > 0 ? "border-t border-gray-100" : ""
                } ${idx === 0 ? "bg-amber-50/50" : ""}`}
              >
                <span className="text-lg w-8 text-center shrink-0">
                  {medals[idx]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{r.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MiniStars rating={Number(r.avg_rating)} />
                    <span className="text-xs text-gray-400">
                      {Number(r.avg_rating).toFixed(1)} · {r.vote_count} vote
                      {r.vote_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Rest */}
            {rest.map((r, i) => (
              <div
                key={r.club_id}
                className="flex items-center gap-4 px-4 py-3 border-t border-gray-100"
              >
                <span className="text-xs text-gray-300 w-8 text-center shrink-0 tabular-nums">
                  {i + 4}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{r.name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <MiniStars rating={Number(r.avg_rating)} size={12} />
                  <span className="text-xs text-gray-400 tabular-nums">
                    {Number(r.avg_rating).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-300 tabular-nums">
                    ({r.vote_count})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
