export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", maxWidth: 980, margin: "40px auto", padding: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 700 }}>Onboarding Platform</div>
          <nav style={{ display: "flex", gap: 12 }}>
            <a href="/">Home</a>
            <a href="/health">Health</a>
            <a href="/tasks">Tasks</a>
            <a href="/cases">Cases</a>
            <a href="/templates">Templates</a>
          </nav>
        </header>
        <hr style={{ margin: "16px 0" }} />
        {children}
      </body>
    </html>
  );
}
