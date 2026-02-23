"use client";

import { useEffect, useMemo, useState } from "react";

type Club = {
  id: number;
  name: string;
  description: string | null;
  short_description?: string | null;
  tags: string[];
};

type RankInfo = {
  rank: number;
  total: number;
  score: number;
};

function StarIcon({
  fill,
  size = 36,
}: {
  fill: "full" | "half" | "empty";
  size?: number;
}) {
  const gold = "#FBC02D";
  const grey = "#dadce0";
  const id = `half-${Math.random().toString(36).slice(2, 9)}`;

  if (fill === "full") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
          fill={gold}
          stroke="none"
        />
      </svg>
    );
  }
  if (fill === "half") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor={gold} />
            <stop offset="50%" stopColor={grey} />
          </linearGradient>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
          fill={`url(#${id})`}
          stroke="none"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
        fill={grey}
        stroke="none"
      />
    </svg>
  );
}

function StarRating({
  onRate,
  disabled,
}: {
  onRate: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  function getFillForStar(
    starIndex: number,
    value: number
  ): "full" | "half" | "empty" {
    if (value >= starIndex) return "full";
    if (value >= starIndex - 0.5) return "half";
    return "empty";
  }

  const displayValue = hover ?? 0;

  return (
    <div className="flex items-center justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          className={`relative cursor-pointer select-none ${
            disabled ? "opacity-40 pointer-events-none" : ""
          }`}
          onMouseLeave={() => setHover(null)}
        >
          {/* left half */}
          <div
            className="absolute inset-0 w-1/2 z-10"
            onMouseEnter={() => setHover(star - 0.5)}
            onClick={() => !disabled && onRate(star - 0.5)}
          />
          {/* right half */}
          <div
            className="absolute inset-0 left-1/2 w-1/2 z-10"
            onMouseEnter={() => setHover(star)}
            onClick={() => !disabled && onRate(star)}
          />
          <StarIcon fill={getFillForStar(star, displayValue)} size={40} />
        </div>
      ))}
    </div>
  );
}

function MiniStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => {
        let fill: "full" | "half" | "empty" = "empty";
        if (rating >= s) fill = "full";
        else if (rating >= s - 0.5) fill = "half";
        return <StarIcon key={s} fill={fill} size={size} />;
      })}
    </span>
  );
}

export default function Home() {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [shortDesc, setShortDesc] = useState<string | null>(null);
  const [descLoading, setDescLoading] = useState(false);

  const tagPills = useMemo(() => (club?.tags ?? []).slice(0, 3), [club]);

  async function fetchRandom() {
    setLoading(true);
    setRankInfo(null);
    setShowReveal(false);
    setShortDesc(null);
    setDescLoading(false);

    const res = await fetch("/api/random", { cache: "no-store" });
    const json = await res.json();

    const nextClub = (json.club ?? null) as Club | null;
    setClub(nextClub);
    setShortDesc(nextClub?.short_description ?? null);
    setLoading(false);
  }

  useEffect(() => {
    fetchRandom();
  }, []);

  useEffect(() => {
    if (!club) return;
    if (club.short_description) return;
    if (shortDesc) return;

    let cancelled = false;

    (async () => {
      try {
        setDescLoading(true);
        const res = await fetch("/api/club-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubName: club.name }),
        });
        const data = await res.json();
        if (!cancelled && data?.short_description) {
          setShortDesc(data.short_description);
        }
      } catch {
      } finally {
        if (!cancelled) setDescLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [club, shortDesc]);

  async function handleRate(rating: number) {
    if (!club) return;
    setSubmitting(true);

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId: club.id, rating }),
    });

    const json = await res.json();
    setRankInfo(json.rankInfo ?? null);
    setShowReveal(true);

    setTimeout(async () => {
      setShowReveal(false);
      await fetchRandom();
      setSubmitting(false);
    }, 1800);
  }

  function handleSkip() {
    if (submitting) return;
    fetchRandom();
  }

  const descriptionToShow =
    shortDesc?.trim() ||
    club?.short_description?.trim() ||
    club?.description?.trim() ||
    "";

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-semibold tracking-tight">
            rateuwclubs
          </span>
          <a
            href="/leaderboard"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Leaderboard →
          </a>
        </div>

        <div className="relative border border-gray-200 rounded-xl p-6 bg-white">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-2/3 bg-gray-100 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-4/5 bg-gray-100 rounded" />
              <div className="h-10 w-full bg-gray-100 rounded mt-6" />
            </div>
          ) : !club ? (
            <p className="text-center text-gray-500 py-8">
              No clubs found — run the seed script first.
            </p>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-center leading-snug">
                {club.name}
              </h1>

              {tagPills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {tagPills.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-4 text-sm text-center text-gray-500 leading-relaxed min-h-[2.5rem]">
                {descriptionToShow
                  ? descriptionToShow
                  : descLoading
                  ? "Loading…"
                  : ""}
              </p>

              <hr className="my-5 border-gray-100" />

              <StarRating onRate={handleRate} disabled={submitting} />

              <div className="mt-5 text-center">
                <button
                  onClick={handleSkip}
                  disabled={submitting}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  skip
                </button>
              </div>
            </>
          )}

          {showReveal && (
            <div className="absolute inset-0 rounded-xl bg-white/95 flex items-center justify-center">
              <div className="text-center">
                {rankInfo ? (
                  <>
                    <div className="text-3xl font-bold">
                      #{rankInfo.rank}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      out of {rankInfo.total} clubs
                    </div>
                    <div className="mt-3">
                      <MiniStars rating={rankInfo.score} />
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400">Updating…</span>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-300">
          Rate clubs at the University of Waterloo
        </p>
      </div>
    </main>
  );
}
