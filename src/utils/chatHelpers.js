// ─── Sanitise HTML to prevent XSS in chat ───
export function sanitizeForHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderChatHtml(text, linkColor) {
  const safe = sanitizeForHtml(text);
  return safe
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener" style="color:${linkColor || "#1B8F6A"};text-decoration:underline;font-weight:500">$1</a>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}
