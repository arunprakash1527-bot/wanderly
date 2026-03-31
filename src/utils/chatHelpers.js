// ─── Sanitise HTML to prevent XSS in chat ───
export function sanitizeForHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderChatHtml(text, linkColor) {
  const safe = sanitizeForHtml(text);
  const lines = safe.split("\n");
  let html = "";
  let inList = false; // "ul" | "ol" | false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Bullet list item: - or *
    const ulMatch = line.match(/^\s*[-*]\s+(.*)/);
    // Numbered list item: 1. 2. etc
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/);

    if (ulMatch) {
      if (inList !== "ul") { if (inList) html += inList === "ol" ? "</ol>" : "</ul>"; html += '<ul style="margin:4px 0 4px 16px;padding:0">'; inList = "ul"; }
      html += `<li style="margin:2px 0">${inlineFormat(ulMatch[1], linkColor)}</li>`;
      continue;
    }
    if (olMatch) {
      if (inList !== "ol") { if (inList) html += inList === "ol" ? "</ol>" : "</ul>"; html += '<ol style="margin:4px 0 4px 16px;padding:0">'; inList = "ol"; }
      html += `<li style="margin:2px 0">${inlineFormat(olMatch[1], linkColor)}</li>`;
      continue;
    }

    // Close any open list
    if (inList) { html += inList === "ol" ? "</ol>" : "</ul>"; inList = false; }

    // Headings: ### or ##
    if (/^###\s+(.*)/.test(line)) { html += `<strong style="display:block;margin:8px 0 4px;font-size:13px">${inlineFormat(line.replace(/^###\s+/, ""), linkColor)}</strong>`; continue; }
    if (/^##\s+(.*)/.test(line)) { html += `<strong style="display:block;margin:8px 0 4px;font-size:14px">${inlineFormat(line.replace(/^##\s+/, ""), linkColor)}</strong>`; continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { html += '<hr style="border:none;border-top:1px solid rgba(0,0,0,0.1);margin:8px 0"/>'; continue; }

    // Regular line
    html += inlineFormat(line, linkColor) + "<br/>";
  }

  if (inList) html += inList === "ol" ? "</ol>" : "</ul>";
  // Clean trailing <br/>
  html = html.replace(/(<br\/>)+$/, "");
  return html;
}

// Inline formatting: links, bold, italic, inline code
function inlineFormat(text, linkColor) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener" style="color:${linkColor || "#1B8F6A"};text-decoration:underline;font-weight:500">$1</a>`)
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
