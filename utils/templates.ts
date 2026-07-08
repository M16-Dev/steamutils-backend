/**
 * Renders an HTML page with a given title and message.
 * @param title - The title of the page.
 * @param message - The message to display on the page.
 * @param isError - Whether the message is an error.
 * @param autoRedirect - Optional auto-redirect URL.
 * @returns The rendered HTML page as a string.
 */
export function renderHtmlPage(title: string, message: string, isError: boolean = false, autoRedirect?: string) {
  const color = isError ? "#ef4444" : "#22c55e";
  const icon = isError
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

  const metaRefresh = autoRedirect ? `<meta http-equiv="refresh" content="0;url=${autoRedirect}">` : "";

  return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${metaRefresh}
    <style>
        body {
            font-family: system-ui, sans-serif;
            background-color: #111111;
            color: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 1rem;
            box-sizing: border-box;
        }
        .card {
            background-color: #1a1b1e;
            padding: 2rem;
            border-radius: 0.75rem;
            text-align: center;
            max-width: 28rem;
            width: 100%;
            border: 1px solid ${isError ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)"};
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .icon {
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: center;
        }
        h1 {
            margin-top: 0;
            margin-bottom: 0.75rem;
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.025em;
        }
        p {
            color: #9ca3af;
            line-height: 1.625;
            margin-bottom: 2rem;
        }
        .badge {
            display: inline-block;
            background-color: #141517;
            color: #6b7280;
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">
            ${icon}
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        ${!isError ? (autoRedirect ? "" : `<div class="badge">You can safely close this window</div>`) : ""}
    </div>
</body>
</html>`;
}
