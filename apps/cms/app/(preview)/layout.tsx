export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body
        style={{ fontFamily: 'system-ui', background: '#fff9ef', padding: 32 }}
      >
        {children}
      </body>
    </html>
  );
}
