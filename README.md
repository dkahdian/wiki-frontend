# Wikipedia Graph Explorer (Frontend)

An Angular web application for visualizing Wikipedia article connections as an interactive, expandable directed graph. Users can search one or more starting articles, see all outbound links as nodes, expand any node to fetch its links, and collapse nodes to hide their children.

## Features

- Article search with typeahead results from your backend  
- Interactive graph rendering of linked articles as nodes and directed edges  
- Double-headed edges when reciprocal links are detected  
- Click to expand a node (loads its outbound links) or collapse it (hides its children)  
- Multi-root support: start from one or several seed articles  
- Caching and de-duplication to prevent repeated fetches for the same node  
- Keyboard and mouse interactions: zoom, pan, focus  

## Soft Rate Limit Handling (Important)

Your API has a soft rate limit of one request per second. The frontend enforces this with two independent pipelines:

- **Search requests**  
  - The search bar input stream is debounced to 1000 ms and uses distinct-until-changed semantics.  
  - At most one request per second is sent while the user types.  
  - The latest query cancels in-flight search requests to avoid stale results.  

- **Graph expansion requests**  
  - Node-click expansion events are queued and processed at a maximum rate of one request per second.  
  - The queue coalesces duplicate expansion tasks for the same article and skips nodes already expanded or cached.  
  - Collapsing nodes is a local UI operation and does not call the API.  

These two pipelines are independent; they do not coordinate within the same second, per your requirement.

## Architecture

- **Components**  
  - SearchBar: query input, result list, and seed selection  
  - GraphCanvas: renders and manages the interactive graph  
  - NodeInfoPanel (optional): shows selected node details  

- **Services**  
  - ApiClientService: HTTP integration with the backend endpoints  
  - GraphStoreService: in-memory graph state, caching, and deduplication  
  - RateLimiterService: search debounce and expansion request queue  

- **Models**  
  - GraphNode: id, label, expanded, pinned, degree  
  - GraphLink: source, target, bidirectional, weight  

- **Rendering**  
  - Uses a force-directed or dagre-style layout via a graph library (for example ngx-graph or a D3-based renderer)  
  - Arrowheads indicate direction; double-headed styling for reciprocal edges  

## API Integration

Base URL is configurable via Angular environments.  

- Search articles: GET /search?q={query}&limit={limit}  
- Get article links: GET /links/{title}  

Filtering and normalization are handled by the backend; the frontend trusts ASCII-only, main-namespace results.

## Getting Started

### Prerequisites
- Node.js 18 or later  
- Angular CLI 17 or later  
- Running instance of the Wikipedia API Service backend  

### Local development
1. Clone the repository  
2. Install dependencies: npm install  
3. Configure environment.ts with apiBaseUrl pointing to your backend (for example http://localhost:8080)  
4. Start the dev server: ng serve  
5. Open http://localhost:4200  

### Production build
1. Run: ng build --configuration production  
2. Serve the contents of dist with your preferred static host or reverse proxy  

## Configuration

environment.ts:  
- apiBaseUrl: backend base URL  
- defaultSearchLimit: default number of results for search  
- graph  
  - maxVisibleNodes: optional soft cap to guard performance  
  - layout: force or dagre  
  - linkDistance and charge: tuning knobs for force-directed layouts  

## Graph Behavior

- **Expansion**  
  - Clicking a collapsed node enqueues one fetch for /links/{title}  
  - New nodes and edges are merged into the existing graph  

- **Collapse**  
  - Clicking an expanded node hides its direct children edges and dependent nodes not referenced elsewhere  
  - Expanded state is preserved in memory for quick re-show without refetching (unless you clear cache)  

- **Reciprocal links**  
  - When adding A → B, if B → A exists in the current graph or cache, the edge is marked bidirectional and styled accordingly  

## Performance and Stability

- **Caching**  
  - Results of /links/{title} are cached by normalized title  
  - The queue skips expansions for titles with cached results  

- **Deduplication**  
  - Nodes are keyed by normalized title  
  - Links are keyed by source-target pair  

- **Large graphs**  
  - Optional soft cap on visible nodes, with a prompt to refine or collapse  
  - Progressive reveal: render first, then animate into layout to keep UI responsive  

- **Error handling**  
  - Network errors display a toast and keep the queue running for subsequent tasks  
  - Optionally retry with backoff for transient failures  

## Folder Structure

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


## License

MIT
