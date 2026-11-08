export const StoryPlatformLink = () => (
  <a
    href={process.env.CLIENT_ORIGIN || 'http://localhost:8081'}
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: 'block', marginTop: 20, padding: '10px 0' }}
  >
    Open story platform ↗
  </a>
);
