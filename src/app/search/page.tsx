"use client";

import { useEffect, useRef, useState } from "react";

type SearchResult = {
  id: number;
  name: string;
  tags: string[];
  short_description: string | null;
  avg_rating: number;
  vote_count: number;
};

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

function MiniStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const gold = "#FBC02D";
  const grey = "#dadce0";

  return (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => {
        let fill: "full" | "half" | "empty" = "empty";
        if (rating >= s) fill = "full";
        else if (rating >= s - 0.5) fill = "half";

        const id = `sr-${s}-${Math.random().toString(36).slice(2, 7)}`;

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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const tagMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setShowTagMenu(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function doSearch(val: string, tags: string[]) {
    if (val.trim().length < 2 && tags.length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (val.trim().length >= 2) params.set("q", val.trim());
      if (tags.length > 0) params.set("tags", tags.join(","));

      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();
      setResults(json.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  function handleChange(val: string) {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (val.trim().length < 2 && selectedTags.length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    timerRef.current = setTimeout(() => doSearch(val, selectedTags), 300);
  }

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    setSearching(true);
    timerRef.current = setTimeout(() => doSearch(query, next), 200);
  }

  function clearTags() {
    setSelectedTags([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(() => doSearch(query, []), 200);
  }

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const tagsParam = params.get("tags");

    const initTags = tagsParam
      ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    if (initTags.length > 0) setSelectedTags(initTags);

    if ((q && q.trim().length >= 2) || initTags.length > 0) {
      if (q) setQuery(q);
      doSearch(q ?? "", initTags);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <main className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← vote
          </a>
          <span className="text-base font-semibold tracking-tight">
            search
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="search clubs..."
            autoFocus
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
          />
          <div className="relative" ref={tagMenuRef}>
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                selectedTags.length > 0
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
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
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              tags
              {selectedTags.length > 0 && (
                <span className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs font-semibold">
                  {selectedTags.length}
                </span>
              )}
            </button>

            {showTagMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    filter by tag
                  </span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={clearTags}
                      className="text-xs text-amber-600 hover:text-amber-800 font-medium cursor-pointer"
                    >
                      clear all
                    </button>
                  )}
                </div>
                {ALL_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                        active
                          ? "bg-amber-50 text-amber-900"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          active
                            ? "bg-amber-400 border-amber-400"
                            : "border-gray-300"
                        }`}
                      >
                        {active && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                {tag}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {searching && results.length === 0 && (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-50 rounded-xl" />
            ))}
          </div>
        )}

        {!searching && searched && results.length === 0 && (
          <p className="text-center py-12 text-gray-400 text-sm">
            no clubs found
          </p>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {results.map((r) => (
              <a
                key={r.id}
                href={`/?club=${r.id}`}
                className="block border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
              >
                <div className="text-center">
                  <div className="font-semibold text-sm">{r.name}</div>
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                      {r.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className={`text-xs px-2.5 py-0.5 rounded-full border ${
                            selectedTags.includes(t)
                              ? "bg-amber-100 text-amber-900 border-amber-300 font-medium"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.short_description && (
                    <p className="mt-3 text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {r.short_description}
                    </p>
                  )}
                  {r.vote_count > 0 ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <MiniStars rating={r.avg_rating} size={13} />
                      <span className="text-xs text-gray-400">
                        {r.avg_rating.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-400 italic">
                      not yet rated
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
