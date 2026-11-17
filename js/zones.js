(function (global) {
  "use strict";

  const CITIES = [
    { city: "San Francisco", label: "San Francisco (PST/PDT)", tz: "America/Los_Angeles" },
    { city: "Denver", label: "Denver (MST/MDT)", tz: "America/Denver" },
    { city: "Chicago", label: "Chicago (CST/CDT)", tz: "America/Chicago" },
    { city: "New York", label: "New York (EST/EDT)", tz: "America/New_York" },
    { city: "Toronto", label: "Toronto (EST/EDT)", tz: "America/Toronto" },
    { city: "Sao Paulo", label: "Sao Paulo (BRT)", tz: "America/Sao_Paulo" },
    { city: "UTC", label: "UTC (Coordinated)", tz: "UTC" },
    { city: "London", label: "London (GMT/BST)", tz: "Europe/London" },
    { city: "Paris", label: "Paris (CET/CEST)", tz: "Europe/Paris" },
    { city: "Berlin", label: "Berlin (CET/CEST)", tz: "Europe/Berlin" },
    { city: "Dubai", label: "Dubai (GST)", tz: "Asia/Dubai" },
    { city: "Bengaluru", label: "Bengaluru (IST)", tz: "Asia/Kolkata" },
    { city: "Singapore", label: "Singapore (SGT)", tz: "Asia/Singapore" },
    { city: "Manila", label: "Manila (PHT)", tz: "Asia/Manila" },
    { city: "Tokyo", label: "Tokyo (JST)", tz: "Asia/Tokyo" },
    { city: "Seoul", label: "Seoul (KST)", tz: "Asia/Seoul" },
    { city: "Sydney", label: "Sydney (AEST/AEDT)", tz: "Australia/Sydney" },
    { city: "Auckland", label: "Auckland (NZST/NZDT)", tz: "Pacific/Auckland" }
  ];

  const DEFAULT_TEAM = [
    { id: "m1", name: "Maya Lin", role: "Design Systems", city: "San Francisco", tz: "America/Los_Angeles" },
    { id: "m2", name: "Devon Brooks", role: "Product Engineering", city: "New York", tz: "America/New_York" },
    { id: "m3", name: "Hannah Wright", role: "Staff Backend", city: "London", tz: "Europe/London" },
    { id: "m4", name: "Jonas Weber", role: "Infrastructure", city: "Berlin", tz: "Europe/Berlin" },
    { id: "m5", name: "Marco Santos", role: "Frontend Lead", city: "Manila", tz: "Asia/Manila" },
    { id: "m6", name: "Kenji Sato", role: "Mobile Eng", city: "Tokyo", tz: "Asia/Tokyo" }
  ];

  function getPartsInZone(date, tz) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = dtf.formatToParts(date);
    const map = {};
    parts.forEach((p) => {
      if (p.type !== "literal") map[p.type] = Number(p.value);
    });
    if (map.hour === 24) map.hour = 0;
    return map;
  }

  function wallTimeToDate(dateStr, hour, minute, tz) {
    const [y, m, d] = dateStr.split("-").map(Number);
    let ts = Date.UTC(y, m - 1, d, hour, minute, 0);
    for (let i = 0; i < 2; i++) {
      const p = getPartsInZone(new Date(ts), tz);
      const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
      const desired = Date.UTC(y, m - 1, d, hour, minute, 0);
      ts += desired - shown;
    }
    return new Date(ts);
  }

  function formatTime(date, tz, use24h) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: !use24h
    }).format(date);
  }

  function formatDayShort(date, tz) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function classifyHour(hour) {
    if (hour >= 9 && hour <= 17) return "work";
    if ((hour >= 7 && hour <= 8) || (hour >= 18 && hour <= 20)) return "flex";
    return "sleep";
  }

  global.MeridianZones = {
    CITIES,
    DEFAULT_TEAM,
    getPartsInZone,
    wallTimeToDate,
    formatTime,
    formatDayShort,
    classifyHour
  };
})(window);
