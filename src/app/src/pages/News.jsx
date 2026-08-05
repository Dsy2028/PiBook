import { useState,useEffect } from "react";
export default function News() {
 const  [loading,setLoading] = useState(false);
/*  const []
   useEffect(() => {
    setLoading(true);
    fetch("/calibre-api/ajax/books")
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
    }) */
  return (
    <div className="text-ink/40 font-display text-3xl tracking-wide">
      News — coming soon
    </div>
  );
}
