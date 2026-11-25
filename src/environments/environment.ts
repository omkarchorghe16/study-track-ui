export const environment = {
  // API calls use relative /api/... paths; the dev proxy (proxy.conf.json) sends them to study-track-api.
  // This host is only used for links that must open on the API itself, such as its Swagger UI.
  apiDocsBaseUrl: 'http://localhost:8083',
};
