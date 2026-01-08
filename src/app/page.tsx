"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ALL_TAGS = [
  "Culture",
  "Tech",
  "Engineering",
  "Arts",
  "Design Team",
  "Sports",
  "Academic",
  "Health",
  "Volunteer",
  "Gaming",
  "Business",
  "Faith",
  "Science",
  "Social Club",
  "Student Society",
  "Social Justice",
  "Environment",
];

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
  avg_rating: number;
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
          <div
            className="absolute inset-0 w-1/2 z-10"
            onMouseEnter={() => setHover(star - 0.5)}
            onClick={() => !disabled && onRate(star - 0.5)}
          />
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

function SuggestClubButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubName: name.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setName("");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full bg-gray-900 text-white px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        can't find your club?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            if (status !== "sending") {
              setOpen(false);
              setStatus("idle");
              setName("");
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">suggest a club</h2>
            <p className="mt-1 text-sm text-gray-500">
              missing a club? drop the name and we&apos;ll add it.
            </p>

            {status === "sent" ? (
              <div className="mt-5 text-center py-4">
                <span className="text-green-600 font-medium text-sm">
                  ✓ suggestion sent - thanks!
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="club name"
                  maxLength={200}
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                />
                {status === "error" && (
                  <p className="text-xs text-red-500">
                    something went wrong. please try again.
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setStatus("idle");
                      setName("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 cursor-pointer"
                  >
                    cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || status === "sending"}
                    className="text-sm font-medium bg-gray-900 text-white rounded-lg px-4 py-1.5 hover:bg-gray-800 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {status === "sending" ? "sending…" : "submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
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

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showDiscoverDropdown, setShowDiscoverDropdown] = useState(false);
  const discoverRef = useRef<HTMLDivElement>(null);

  const tagPills = useMemo(() => (club?.tags ?? []).slice(0, 3), [club]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
      if (discoverRef.current && !discoverRef.current.contains(e.target as Node)) {
        setShowDiscoverDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function fetchRandom(tagOverride?: string | null) {
    setLoading(true);
    setRankInfo(null);
    setShowReveal(false);
    setShortDesc(null);
    setDescLoading(false);

    const tag = tagOverride !== undefined ? tagOverride : activeTag;
    const url = tag ? `/api/random?tag=${encodeURIComponent(tag)}` : "/api/random";
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    const nextClub = (json.club ?? null) as Club | null;
    setClub(nextClub);
    setShortDesc(nextClub?.short_description ?? null);
    setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clubId = params.get("club");

    if (clubId) {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/club/${clubId}`);
          const json = await res.json();
          const c = (json.club ?? null) as Club | null;
          if (c) {
            setClub(c);
            setShortDesc(c.short_description ?? null);
            setLoading(false);
            window.history.replaceState({}, "", "/");
            return;
          }
        } catch {}
        fetchRandom();
      })();
    } else {
      fetchRandom();
    }
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
            leaderboard →
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
              no clubs found — run the seed script first.
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
                  ? "loading…"
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
                      <MiniStars rating={rankInfo.avg_rating} />
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400">updating…</span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {searchOpen ? (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim().length >= 2) {
                window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search clubs..."
              autoFocus
              className="text-sm border border-gray-200 bg-white rounded-full px-4 py-2.5 outline-none focus:border-gray-400 transition-colors w-56"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSearchQuery("");
                  setShowTagDropdown(false);
                }
              }}
            />
            <div className="relative" ref={tagDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="flex items-center gap-1 text-sm bg-white border border-gray-200 rounded-full px-3.5 py-2.5 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer text-gray-600 font-medium"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                tags
              </button>

              {showTagDropdown && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                  <div className="px-3 pb-2 mb-1 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      browse by tag
                    </span>
                  </div>
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        window.location.href = `/search?tags=${encodeURIComponent(tag)}`;
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-900 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setShowTagDropdown(false);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => {
            setSearchOpen(true);
            setTimeout(() => searchRef.current?.focus(), 0);
          }}
          className="fixed top-5 right-5 z-50 flex items-center gap-1.5 rounded-full bg-white text-gray-700 border border-gray-200 px-4 py-2.5 text-sm font-medium hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          search
        </button>
      )}

      <div className="fixed top-5 left-5 z-50 flex items-center gap-2" ref={discoverRef}>
        {activeTag ? (
          <>
            <button
              onClick={() => {
                setActiveTag(null);
                fetchRandom(null);
                setShowDiscoverDropdown(false);
              }}
              className="flex items-center gap-1.5 rounded-full bg-white text-gray-700 border border-gray-200 px-4 py-2.5 text-sm font-medium hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              all clubs
            </button>
            <span className="text-sm text-gray-500">
              {activeTag}
            </span>
          </>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowDiscoverDropdown(!showDiscoverDropdown)}
              className="flex items-center gap-1.5 rounded-full bg-white text-gray-700 border border-gray-200 px-4 py-2.5 text-sm font-medium hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
            >
              discover clubs
            </button>

            {showDiscoverDropdown && (
              <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                <div className="px-3 pb-2 mb-1 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    pick a category
                  </span>
                </div>
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setActiveTag(tag);
                      setShowDiscoverDropdown(false);
                      fetchRandom(tag);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SuggestClubButton />
    </main>
  );
}
