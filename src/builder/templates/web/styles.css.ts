export function renderWebStyles() {
  return `:root {
  font-family: system-ui, -apple-system, sans-serif;
  color: #0b0b0f;
}

body {
  margin: 0;
  padding: 16px;
  background: #f6f8fb;
}

.app-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

h1 {
  font-size: 1.4rem;
  margin: 0;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
}

.card h2 {
  margin-top: 0;
  font-size: 1.1rem;
}
`;
}
