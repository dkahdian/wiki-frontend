# Wikipedia Graph Explorer (Frontend)

An Angular web application for visualizing Wikipedia article connections as an interactive, expandable directed graph. Users can search one or more starting articles, see outbound links as nodes, expand nodes to fetch links, and collapse nodes to hide children.

## Features

- Article search with typeahead results from your backend (min chars: 0; limit: 10)
- Interactive graph rendering with Cytoscape.js (canvas-based)
- Double-headed edges when reciprocal links are detected
- Click to expand a node (loads its outbound links) or collapse it (hides its children)
- Multi-root support: start from one or several seed articles
- In-memory caching to prevent repeated fetches for the same node
- Simple keyboard/mouse interactions; mobile touch/gesture support is desired throughout

## Soft rate limit handling (important)

Backend soft limit is 1 request/sec. The frontend enforces this with two independent pipelines:

- Search requests
  - Min chars: 1; default limit: 10
  - Debounced (~1000 ms) with distinct-until-changed
  - Latest query cancels in-flight search requests

- Graph action queue (expand/collapse)
  - FIFO queue, processed at max 1 action/sec
  - Max queue length: 3; no drop/cancel behavior; duplicates allowed
  - Expand enqueues a fetch if needed; collapse enqueues a UI action (no API call)
  - When the queue is full (3), additional clicks are ignored until space frees; show a brief non-blocking toast

Pipelines are independent; one search and one graph action may occur within the same second.

## Architecture

- Components
  - SearchBar: query input, result list, and seed selection; shows loading/“no results”; no match-highlighting
  - GraphCanvas: renders and manages the interactive graph; Cytoscape.js with force-directed layout only
  - NodeInfoPanel: shows only article title as a link to the live article; clicking anywhere else toggles collapse; title highlights on hover for affordance

- Services
  - ApiClientService: HTTP integration with backend endpoints
  - GraphStoreService: in-memory graph state, caching (memory-only, no TTL), and dedupe
  - RateLimiterService: search debounce and graph action queue (FIFO, max 3)

- Models
  - GraphNode: id/title, expanded, degree (from API, capped at 50)
  - GraphLink: source, target, bidirectional

- Rendering
  - Cytoscape.js (canvas-based) with a force-directed layout; smooth transitions
  - Arrowheads indicate direction; double-headed styling for reciprocal edges
  - Labels: hidden by default to reduce clutter; show title on hover/selection and in the NodeInfoPanel

## API integration

Base URL is configurable via Angular environments.

- Search articles
  - Path: `/search/q={query}` (server default limit 10)
  - Response shape:
    {
      "search": ["Albert Einstein", "Einstein family", ...],
      "totalhits": 15428
    }

- Get article links
  - Path: `/links/{title}`
  - Response shape:
    {
      "count": 132,
      "title": "google",
      "linkedArticles": [
        "Adscape",
        "Advertising",
        "Android (operating system)",
        ...
      ]
    }
  - No pagination; frontend orders `linkedArticles` by ascending title length, then alphabetically

Normalization and filtering
- ASCII-only is strict. Display titles with spaces; internally, use standard Wikipedia title keys with spaces → underscores. Parentheses and other normalization beyond this are not altered client-side.
- API calls use underscore form in paths (e.g., `/links/Albert_Einstein`).
- Node degree is provided by the API (`count`); displayed degree equals `min(count, perRootMax)`.

## Getting started

### Prerequisites
- Node.js 20 LTS or later
- Angular CLI 18 or later
- Running instance of the Wikipedia API Service backend

### Local development
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure `environment.ts` with `apiBaseUrl` (e.g., http://localhost:8080) and domain as needed
4. Start the dev server: `ng serve`
5. Open http://localhost:4200

### Production build
1. Run: `ng build --configuration production`
2. Serve the contents of `dist` with your preferred static host (GitHub Pages supported)

## Configuration

Angular environments (`environment.ts` / `environment.prod.ts`):
- `apiBaseUrl`: backend base URL
- `domain`: custom domain for deployment (used for metadata and links)
- `defaultSearchLimit`: default number of results for search (10)
- `graph`:
  - `perRootMax`: 50 (links per root; order by title length then alphabetical)
  - `overallMax`: 200 (if exceeded: clear canvas; last expanded root remains; others hidden)
  - `layout`: force (only)

Styling
- Tailwind CSS (dark mode default): dark blue background; beige nodes

## Graph behavior

- Search & seed flow
  - Option 1 (initial seeding): user searches, clicks a result; search area collapses and the article appears as a root
  - Option 2 (graph interaction): with existing nodes, clicking a node toggles expand/collapse
    - The search area can be reopened via a persistent search button/icon in the header

- Expansion
  - Clicking a collapsed node enqueues an expand action; if not cached, one fetch to `/links/{title}` is made when processed
  - New nodes/edges merge into the current graph; `linkedArticles` are ordered by title length then alphabetical
  - Per-root visible children cap: 50

- Collapse
  - Clicking an expanded node enqueues a collapse action; this hides direct children edges and dependent nodes not referenced elsewhere
  - Expanded state is kept in memory for quick re-show without refetch

- Global visible cap
  - If total visible nodes exceeds 200: clear the canvas; keep only the last-expanded root (expanded); hide all other roots

- Reciprocal links
  - When adding A → B, if B → A exists in the current graph or cache, the edge is marked bidirectional and styled accordingly (double arrowheads)

## Performance and stability

- Caching
  - Results of `/links/{title}` cached in memory by exact article title (ASCII, spaces→underscores); no TTL; no localStorage
  - When expanding, if cached, use cache and do not refetch

- Deduplication
  - Nodes keyed by exact article title
  - Links keyed by source-target pair
  - Queue does not coalesce duplicates; duplicates are allowed and processed FIFO

- Large graphs
  - Enforced caps as described above (50 per root, 200 global)
  - Progressive reveal may be used to keep UI responsive (no offscreen rendering optimizations initially)

- Error handling
  - Network errors display a toast and keep the queue running
  - No retries/backoff by default (soft limit etiquette observed via queue)

## Folder structure (planned)

src
- app
  - components
    - search-bar
    - graph-canvas
    - node-info-panel
  - services
    - api-client.service
    - graph-store.service
    - rate-limiter.service
  - models
    - graph-node
    - graph-link
  - app.component
- styles
  - tailwind.css (Tailwind directives)
tailwind.config.js
postcss.config.js
.eslintrc.json


## Angular and libraries (modern, minimal deps)

- Angular 18 (standalone APIs), Signals-based store for in-memory graph state
- `provideHttpClient(withFetch())` for modern fetch-based HTTP client
- Cytoscape.js for graph rendering (force-directed layout)
- Tailwind CSS (dark mode default)
- ESLint (no test framework configured)
- No Angular Router (single-route app)

## Deployment (GitHub Pages and custom domain)

- Deploy under a custom domain; base href `/`
- SPA fallback: include a `404.html` that redirects to `index.html`
- Environment config baked at build time (no runtime config file)
- CI: GitHub Actions workflow may be added to build and publish to Pages (optional)
- For custom domains on GitHub Pages, include a `CNAME` file in the published site root with your domain name

## Accessibility and i18n

- Standard accessibility features (focus states, ARIA where appropriate)
- English-only UI

## Legal and attribution

- Display a small footer attribution such as: “Data from Wikipedia via MediaWiki’s APIs.”
- Follow Wikimedia API etiquette and terms:
  - Be conservative with request rates; we use 1 req/sec soft limit
  - Set a descriptive User-Agent/Api-User-Agent header (on the backend, if proxying)
  - See: https://www.mediawiki.org/wiki/API:Etiquette and https://www.mediawiki.org/wiki/Wikimedia_REST_API#Terms_and_conditions
- “Wikimedia Foundation” and “Wikipedia” are trademarks of the Wikimedia Foundation; this project is not endorsed by or affiliated with Wikimedia.

## License

MIT
