from __future__ import annotations
import asyncio
import httpx
from bs4 import BeautifulSoup
from urllib.parse import unquote, parse_qs


UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


async def ddg_search(query: str, n: int = 5) -> list[dict]:
    """Scrape DuckDuckGo HTML (no API key required). Returns list of {title, url, snippet}."""
    url = "https://html.duckduckgo.com/html/"
    params = {"q": query, "kl": "us-en"}
    headers = {"User-Agent": UA}
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
        r = await client.post(url, data=params)
        r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    results: list[dict] = []
    for item in soup.select("div.result")[:n]:
        a = item.select_one("a.result__a")
        if not a:
            continue
        raw_href = a.get("href", "")
        href = raw_href
        if "uddg=" in raw_href:
            qs = parse_qs(unquote(raw_href.split("?", 1)[-1]))
            href = qs.get("uddg", [raw_href])[0]
        snippet_el = item.select_one("a.result__snippet") or item.select_one(".result__snippet")
        snippet = snippet_el.get_text(" ", strip=True) if snippet_el else ""
        results.append({"title": a.get_text(strip=True), "url": href, "snippet": snippet})
    return results


async def fetch_url(url: str, max_chars: int = 4000) -> str:
    """Fetch a URL and return visible text, truncated."""
    headers = {"User-Agent": UA}
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
        r = await client.get(url)
        r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = " ".join(soup.get_text(" ", strip=True).split())
    return text[:max_chars]


def format_results_for_context(query: str, results: list[dict]) -> str:
    if not results:
        return f"[Web search for '{query}']\nNo results found."
    lines = [f"[Web search results for '{query}']"]
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. {r['title']} - {r['url']}")
        if r.get("snippet"):
            lines.append(f"   {r['snippet']}")
    return "\n".join(lines)


async def run_search(query: str, n: int = 5) -> tuple[str, list[dict]]:
    results = await ddg_search(query, n=n)
    return format_results_for_context(query, results), results


if __name__ == "__main__":
    q = "OpenChat LM"
    formatted, raw = asyncio.run(run_search(q, 5))
    print(formatted)
    print("---")
    print(len(raw), "results")