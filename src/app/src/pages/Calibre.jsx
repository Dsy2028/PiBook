import { useState, useEffect, useMemo } from "react";
import Button from "../components/Button";
import { useToast } from "../components/Toast";
import Message from "../components/Message";

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "all",         label: "All"         },
  { key: "manga",       label: "Manga"       },
  { key: "philosophy",  label: "Philosophy"  },
  { key: "tech",        label: "Technology"  },
  { key: "economics",   label: "Economics"   },
  { key: "science",     label: "Science"     },
  { key: "fiction",     label: "Fiction"     },
  { key: "history",     label: "History"     },
  { key: "biography",   label: "Biography"   },
];

// Category color accents — each tag gets its own flat color
const CATEGORY_COLORS = {
  manga:      "bg-magenta text-white",
  philosophy: "bg-cobalt  text-white",
  tech:       "bg-lime    text-ink",
  economics:  "bg-gold    text-ink",
  science:    "bg-sky     text-ink",
  fiction:    "bg-[#FF6B6B] text-white",
  history:    "bg-[#8B4513] text-white",
  biography:  "bg-[#9C27B0] text-white",
};

const BOOKS_PER_PAGE = 12;

// ── JoJo Star SVG ────────────────────────────────────────────────────────────
// Displayed top-right when book is downloaded to the Pi
function JojoStar() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7 drop-shadow-md "
      fill="#98858D"
      stroke="#0D0D0D"
      strokeWidth="1"
    >
      <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
    </svg>
  );
}

// ── Selection polygon backdrop ────────────────────────────────────────────────
// The JoJo-style polygon that appears behind a selected book card
function SelectionPolygon() {
  return (
    <div
      className="absolute -inset-2 bg-[#FD5CD4] border-3 border-ink -z-10"
      style={{
        clipPath:
          "polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)",
      }}
    />
  );
}

// ── Book Card ─────────────────────────────────────────────────────────────────
function BookCard({ bookId, book, isSelected, isDownloaded, onToggleSelect }) {
  const coverUrl = `/calibre-api/get/cover/${bookId}/calibre-library`;
  const authors  = Array.isArray(book.authors) ? book.authors.join(", ") : book.authors ?? "Unknown";

  // Guess category from tags if available
  const tag = (book.tags?.[0] ?? "").toLowerCase();

  return (
    <div
      className="relative cursor-pointer group"
      onClick={() => onToggleSelect(bookId,book.title)}
    >
      {/* JoJo polygon selection backdrop */}
      {isSelected && <SelectionPolygon />}

      {/* Card */}
      <div
        className={`
          relative flex flex-col border-3 border-ink transition-all duration-100
          ${isSelected
            ? "shadow-[6px_6px_0_#0D0D0D] -translate-x-0.5 -translate-y-0.5 bg-[#fff8fc]"
            : "shadow-hard-sm bg-[#FAFAF2] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
          }
        `}
      >
        {/* Downloaded star badge */}
        {isDownloaded && (
          <div className="absolute top-2 right-2 z-20">
            <JojoStar />
          </div>
        )}

        {/* Selected checkmark badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 z-20 w-6 h-6 bg-magenta border-2 border-ink
                          flex items-center justify-center">
            <span className="text-white text-xs font-black">✓</span>
          </div>
        )}

        {/* Cover image */}
        <div className="relative overflow-hidden bg-dark aspect-2/3 border-b-3 border-ink">
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />
          {/* Fallback if no cover */}
          <div className="hidden absolute inset-0 items-center justify-center bg-dark">
            <span className="font-display text-4xl text-white/20">📖</span>
          </div>

          {/* Hover overlay */}
          <div className={`absolute inset-0 bg-magenta/20 transition-opacity duration-100
                           ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1 flex-1">
          <p className="font-bold text-xs leading-tight line-clamp-2 text-ink">
            {book.title}
          </p>
          <p className="text-[11px] text-ink/50 line-clamp-1">{authors}</p>

          {/* Category tag */}
          {tag && CATEGORY_COLORS[tag] && (
            <span className={`self-start mt-auto text-[9px] font-bold tracking-widest
                              uppercase px-1.5 py-0.5 border border-ink
                              ${CATEGORY_COLORS[tag]}`}>
              {tag}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Calibre Component ────────────────────────────────────────────────────
export default function Calibre() {
  const toast = useToast();

  const [books,           setBooks]           = useState({});
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [search,          setSearch]          = useState("");
  const [activeCategory,  setActiveCategory]  = useState("all");
  const [selected,        setSelected]        = useState(new Set());
  const [downloaded,      setDownloaded]      = useState(new Set());
  const [downloading,     setDownloading]     = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [message,setMessage] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch books from Calibre ──
  useEffect(() => {
    setLoading(true);
    fetch("/api/books")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setBooks(data || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to connect to Calibre:", err);
        setError("Could not connect to Calibre. Make sure the server is running.");
        setLoading(false);
      });

    // Fetch already-downloaded books from the Pi API
    fetch("/api/books/downloaded")
      .then((r) => r.json())
      .then((ids) => setDownloaded(new Set(ids)))
      .catch(() => {});
  }, []);

  // ── Filter + search ──
  const filteredBooks = useMemo(() => {
    const q = search.toLowerCase().trim();

    return Object.entries(books).filter(([, book]) => {
      const title   = (book.title   ?? "").toLowerCase();
      const authors = (Array.isArray(book.authors)
        ? book.authors.join(" ")
        : book.authors ?? ""
      ).toLowerCase();
      const tags    = (book.tags ?? []).map((t) => t.toLowerCase());

      const matchesSearch   = !q || title.includes(q) || authors.includes(q);
      const matchesCategory =
        activeCategory === "all" ||
        tags.some((t) => t.includes(activeCategory));

      return matchesSearch && matchesCategory;
    });
  }, [books, search, activeCategory]);

  // ── Pagination ──
  const totalPages  = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PER_PAGE));
  const safePage    = Math.min(currentPage, totalPages);
  const pageBooks   = filteredBooks.slice(
    (safePage - 1) * BOOKS_PER_PAGE,
    safePage * BOOKS_PER_PAGE
  );

  // Reset to page 1 when filter/search changes
  useEffect(() => { setCurrentPage(1); }, [search, activeCategory]);

  // ── Selection ──
  function toggleSelect(id) {
  
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // ── Download selected books to Pi ──
  async function downloadSelected() {
    if (selected.size === 0) return;
    let updatedSelectedList =  [];

   selected.forEach((key,index) => {
       if(!downloaded.has(key)){
        updatedSelectedList.push(key);
    }  
   })
  
   const tempSelected = new Set (updatedSelectedList)

     setDownloading(true); 

    try {
      const res = await fetch("/api/books/download", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ book_ids: [...tempSelected] }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Mark all selected as downloaded
      setDownloaded((prev) => new Set([...prev, ...tempSelected]));
      toast(`${tempSelected.size} book${tempSelected.size > 1 ? "s" : ""} sent to Pi ⭐`, "success");
      clearSelection();
    } catch (err) {
      console.error("Download failed:", err);
      toast("Download failed — check Pi connection.", "error");
    } finally {
      setDownloading(false);
    } 
  
  }
  async function deleteSelected(){
     let updatedSelectedList =  [];

   selected.forEach((key,index) => {
       if(downloaded.has(key)){
        updatedSelectedList.push(key);
    }  
   })
  
   const tempSelected = new Set (updatedSelectedList)
   
   setDeleting(true);

    try {
    const res = await fetch("/api/books/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ book_ids: [...tempSelected] }),
    })
    
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Mark all selected as downloaded
      const data = await res.json();
      setDownloaded(new Set(data.downloaded));
      toast(`${tempSelected.size} book${tempSelected.size > 1 ? "s" : ""} deleted from Pi`, "success");
      clearSelection();
   } catch (error) {
      console.error("Download failed:", error);
      toast("Download failed — check Pi connection.", "error");
   } finally {
   setDeleting(false);
  } 
  }

  // ── Render ──
  return (
    <div className="text-ink">
  {message && <Message type={message?.type} message={message?.message} setMessage={setMessage}  dismissible></Message>}

      

      {/* ── Search + filter bar ── */}
      <div className="mb-6 flex flex-col gap-4">

        {/* Search input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or author..."
              className="w-full pl-9 pr-4 py-2.5 text-sm font-medium
                         bg-white border-3 border-ink shadow-hard-sm
                         focus:outline-none focus:shadow-hard focus:border-magenta
                         transition-all"
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              ✕ Clear
            </Button>
          )}
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                clipPath:
                  "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
              }}
              className={`
                px-4 py-1.5 text-xs font-bold tracking-wide border-2 transition-all
                ${activeCategory === cat.key
                  ? "bg-ink text-paper border-ink shadow-hard-sm -translate-y-0.5"
                  : "bg-white text-ink border-ink hover:bg-gold hover:border-ink"
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Selection action bar — appears when books are selected ── */}
      {selected.size > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4
                        bg-magenta border-3 border-ink shadow-hard px-5 py-3">
          <div className="flex items-center gap-3">
            {/* Mini JoJo star */}
            <JojoStar />
            <span className="font-bold text-white text-sm">
              {selected.size} book{selected.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm"
                    className="cursor-pointer"
                    onClick={clearSelection}>
              Clear Selections
            </Button>
            <Button variant="danger" className="outline-1 outline-black" size="sm"  loading={deleting} onClick={deleteSelected}>Delete From Pi</Button>
            <Button variant="gold" className=" " size="sm"
                    loading={downloading}
                    onClick={downloadSelected}>
               Send to Pi
            </Button>
          </div>
        </div>
      )}

      {/* ── Results count ── */}
      {!loading && !error && (
        <div className="flex items-center gap-3 mb-5">
          <div className="w-2 h-2 bg-magenta border border-ink rotate-45 shrink-0" />
          <p className="text-xs font-bold tracking-wide text-ink/50 uppercase">
            {filteredBooks.length} book{filteredBooks.length !== 1 ? "s" : ""}
            {activeCategory !== "all" && ` in ${activeCategory}`}
            {search && ` matching "${search}"`}
          </p>
          <div className="flex-1 h-px bg-ink/10" />
          {downloaded.size > 0 && (
            <p className="text-xs font-bold text-gold flex items-center gap-1">
              <JojoStar /> {downloaded.size} on Pi
            </p>
          )}
        </div>
      )}
     
      {/* ── States ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-3 border-magenta border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-ink/40 tracking-wide text-sm uppercase">
            Connecting to Calibre...
          </p>
        </div>
      )}

      {error && (
        <div className="border-3 border-danger bg-white shadow-hard p-6">
          <p className="font-bold text-danger mb-1">Connection Error</p>
          <p className="text-sm text-ink/60">{error}</p>
        </div>
      )}

      {!loading && !error && filteredBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="font-display text-6xl text-ink/10">📚</div>
          <p className="font-bold text-ink/30 text-sm uppercase tracking-wide">
            No books found
          </p>
        </div>
      )}

      {/* ── Book grid ── */}
      {!loading && !error && filteredBooks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pageBooks.map(([id, book]) => (
            <BookCard
              key={id}
              bookId={id}
              book={book}
              isSelected={selected.has(id)}
              isDownloaded={downloaded.has(id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button
            variant="ghost" size="sm"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            ← Prev
          </Button>

          {/* Page number buttons */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) {
                acc.push("...");
              }
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-ink/30 font-bold">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`
                    w-9 h-9 text-sm font-bold border-2 transition-all
                    ${safePage === p
                      ? "bg-ink text-paper border-ink shadow-hard-sm"
                      : "bg-white text-ink border-ink hover:bg-gold"
                    }
                  `}
                >
                  {p}
                </button>
              )
            )}

          <Button
            variant="ghost" size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      )}

    </div>
  );
}