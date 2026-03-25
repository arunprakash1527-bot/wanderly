/**
 * Export trip itinerary as a print-friendly PDF using browser print dialog.
 * Uses a hidden iframe to avoid popup blockers, then triggers print.
 */
export function exportItineraryAsPDF(trip, tripStart) {
  if (!trip) return;

  const numDays = (() => {
    if (trip.rawStart && trip.rawEnd) {
      return Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
    }
    return trip.timeline ? Math.max(...trip.timeline.map(t => t.day || 1), 1) : 1;
  })();

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatDayDate = (dayNum) => {
    if (!tripStart) return "";
    const d = new Date(tripStart.getTime() + (dayNum - 1) * 86400000);
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const escHtml = (str) => {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  // Gather travellers
  const travellers = [];
  const t = trip.travellers || {};
  if (t.adults) t.adults.forEach(a => travellers.push({ name: a.name, type: "Adult" }));
  if (t.olderKids) t.olderKids.forEach(c => travellers.push({ name: c.name, type: "Older child" }));
  if (t.youngerKids) t.youngerKids.forEach(c => travellers.push({ name: c.name, type: "Younger child" }));
  if (t.infants) t.infants.forEach(c => travellers.push({ name: c.name, type: "Infant" }));

  // Build days HTML
  let daysHtml = "";
  for (let day = 1; day <= numDays; day++) {
    const dayItems = (trip.timeline || []).filter(item => item.day === day).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    daysHtml += `
      <div class="day-section">
        <h2>Day ${day}${formatDayDate(day) ? ` &mdash; ${formatDayDate(day)}` : ""}</h2>
        ${dayItems.length === 0 ? '<p class="empty">No activities planned</p>' : ""}
        ${dayItems.map(item => `
          <div class="timeline-item">
            <div class="time">${escHtml(item.time) || "TBD"}</div>
            <div class="details">
              <div class="title">${escHtml(item.title)}</div>
              ${item.desc ? `<div class="desc">${escHtml(item.desc)}</div>` : ""}
              ${item.group ? `<div class="group">${escHtml(item.group)}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // Build stays HTML
  let staysHtml = "";
  if (trip.stays && trip.stays.length > 0) {
    staysHtml = `
      <div class="day-section">
        <h2>Accommodation</h2>
        ${trip.stays.map(s => `
          <div class="stay-item">
            <div class="stay-name">${escHtml(s.name || s.hotel || "Unnamed stay")}</div>
            <div class="stay-dates">
              ${s.checkIn ? `Check-in: ${escHtml(s.checkIn)}` : ""}
              ${s.checkOut ? ` &middot; Check-out: ${escHtml(s.checkOut)}` : ""}
            </div>
            ${s.address ? `<div class="stay-address">${escHtml(s.address)}</div>` : ""}
            ${s.notes ? `<div class="stay-notes">${escHtml(s.notes)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escHtml(trip.name)} — Itinerary</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header .dates {
      font-size: 14px;
      color: #555;
    }
    .header .destinations {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }
    .travellers {
      margin-bottom: 24px;
    }
    .travellers h3 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 6px;
    }
    .travellers .list {
      font-size: 13px;
      color: #444;
    }
    .day-section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .day-section h2 {
      font-size: 16px;
      font-weight: 700;
      border-bottom: 1px solid #ddd;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .timeline-item {
      display: flex;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-item .time {
      width: 60px;
      flex-shrink: 0;
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }
    .timeline-item .details { flex: 1; }
    .timeline-item .title {
      font-size: 14px;
      font-weight: 500;
    }
    .timeline-item .desc {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }
    .timeline-item .group {
      display: inline-block;
      font-size: 10px;
      color: #888;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 1px 8px;
      margin-top: 4px;
    }
    .empty {
      font-size: 13px;
      color: #999;
      font-style: italic;
    }
    .stay-item {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .stay-item:last-child { border-bottom: none; }
    .stay-name { font-size: 14px; font-weight: 600; }
    .stay-dates { font-size: 12px; color: #555; margin-top: 2px; }
    .stay-address { font-size: 12px; color: #777; margin-top: 2px; }
    .stay-notes { font-size: 12px; color: #888; font-style: italic; margin-top: 2px; }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #aaa;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .day-section { page-break-inside: avoid; }
      .day-section h2 { page-break-after: avoid; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escHtml(trip.name)}</h1>
    <div class="dates">${trip.rawStart && trip.rawEnd ? `${fmtDate(trip.rawStart)} &ndash; ${fmtDate(trip.rawEnd)}` : ""}</div>
    ${trip.places && trip.places.length > 0 ? `<div class="destinations">${trip.places.map(p => escHtml(typeof p === "string" ? p : p.name || p.label || "")).join(" &middot; ")}</div>` : ""}
  </div>

  ${travellers.length > 0 ? `
    <div class="travellers">
      <h3>Travellers</h3>
      <div class="list">${travellers.map(tr => `${escHtml(tr.name)} (${tr.type})`).join(", ")}</div>
    </div>
  ` : ""}

  ${daysHtml}
  ${staysHtml}

  <div class="footer">Exported from Wanderly</div>

</body>
</html>`;

  // Use hidden iframe + print to avoid popup blockers
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to render, then print
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch (e) { /* already removed */ }
    }, 1000);
  }, 500);
}
