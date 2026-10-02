"use client";

/** Последний рубеж: упал сам layout, провайдеров и словарей нет — только инлайн-стили. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#050506",
          color: "#fff",
          fontFamily: "Segoe UI, system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ padding: 24, maxWidth: 480 }}>
          <h1 style={{ fontSize: 32, textTransform: "uppercase", margin: 0 }}>RouteX: что-то сломалось</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", marginTop: 12 }}>
            Страница не загрузилась. Обнови её через пару секунд. · Something broke, please reload.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              background: "#e10600",
              color: "#fff",
              border: 0,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Обновить · Reload
          </button>
        </main>
      </body>
    </html>
  );
}
