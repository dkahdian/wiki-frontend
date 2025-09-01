export const environment = {
  production: true,
  // These should be set via environment variables in your deployment
  apiBaseUrl: process.env['API_BASE_URL'] || '',
  domain: process.env['DOMAIN'] || '',
  defaultSearchLimit: parseInt(process.env['DEFAULT_SEARCH_LIMIT'] || '10', 10),
  graphPerRootMax: parseInt(process.env['GRAPH_PER_ROOT_MAX'] || '50', 10),
  graphOverallMax: parseInt(process.env['GRAPH_OVERALL_MAX'] || '200', 10),
  graphLayout: process.env['GRAPH_LAYOUT'] || 'force'
};
