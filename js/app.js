(function () {
  "use strict";

  const STORAGE_KEY = "meridian_team_v1";

  const meetingTitleInput = document.getElementById("meetingTitleInput");
  const dateInput = document.getElementById("dateInput");
  const refZoneSelect = document.getElementById("refZoneSelect");
  const durationSelect = document.getElementById("durationSelect");
  const hourSlider = document.getElementById("hourSlider");
  const selectedAxisReadout = document.getElementById("selectedAxisReadout");

  const overlapScore = document.getElementById("overlapScore");
  const overlapDetail = document.getElementById("overlapDetail");
  const bestSlotsEl = document.getElementById("bestSlots");
  const timelineGrid = document.getElementById("timelineGrid");

  const formatToggleBtn = document.getElementById("formatToggleBtn");
  const resetTeamBtn = document.getElementById("resetTeamBtn");
  const copyInviteBtn = document.getElementById("copyInviteBtn");

  const addMemberForm = document.getElementById("addMemberForm");
  const memberNameInput = document.getElementById("memberNameInput");
  const memberRoleInput = document.getElementById("memberRoleInput");
  const memberZoneSelect = document.getElementById("memberZoneSelect");
  const toastEl = document.getElementById("toast");

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const state = {
    team: loadTeam(),
    refTz: "Europe/London",
    dateStr: todayIso(),
    slotIndex: 28, // 14:00 in ref zone initially
    durationMin: 60,
    use24h: true
  };

  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2300);
  }

  function loadTeam() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {
      // Ignore storage errors
    }
    return window.MeridianZones.DEFAULT_TEAM.map((m) => ({ ...m }));
  }

  function saveTeam() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.team));
    } catch (_e) {
      // Ignore storage quota errors
    }
  }

  function populateCityDropdowns() {
    const fill = (selectEl, selectedVal) => {
      selectEl.innerHTML = "";
      window.MeridianZones.CITIES.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.tz;
        opt.textContent = c.label;
        opt.dataset.city = c.city;
        selectEl.appendChild(opt);
      });
      selectEl.value = selectedVal;
    };
    fill(refZoneSelect, state.refTz);
    fill(memberZoneSelect, "Asia/Singapore");
  }

  function getSelectedRange() {
    const hour = Math.floor(state.slotIndex / 2);
    const minute = (state.slotIndex % 2) * 30;
    const startDate = window.MeridianZones.wallTimeToDate(state.dateStr, hour, minute, state.refTz);
    const endDate = new Date(startDate.getTime() + state.durationMin * 60000);
    return { hour, minute, startDate, endDate };
  }

  function scoreSlot(slotIdx) {
    const hour = Math.floor(slotIdx / 2);
    const minute = (slotIdx % 2) * 30;
    const instant = window.MeridianZones.wallTimeToDate(state.dateStr, hour, minute, state.refTz);
    let points = 0;
    let workCount = 0;
    let flexCount = 0;
    let sleepCount = 0;

    state.team.forEach((member) => {
      const parts = window.MeridianZones.getPartsInZone(instant, member.tz);
      const band = window.MeridianZones.classifyHour(parts.hour);
      if (band === "work") {
        points += 3;
        workCount++;
      } else if (band === "flex") {
        points += 1;
        flexCount++;
      } else {
        points -= 4;
        sleepCount++;
      }
    });

    return { slotIdx, instant, points, workCount, flexCount, sleepCount };
  }

  function renderOverlapAndBestSlots() {
    const { startDate, endDate } = getSelectedRange();
    const curScore = scoreSlot(state.slotIndex);
    const total = state.team.length;

    selectedAxisReadout.textContent =
      `${window.MeridianZones.formatTime(startDate, state.refTz, state.use24h)} - ${window.MeridianZones.formatTime(endDate, state.refTz, state.use24h)} (${state.refTz})`;

    overlapScore.textContent =
      total === 0
        ? "Add teammates below to calculate overlap"
        : `${curScore.workCount} / ${total} in Core Work · ${curScore.flexCount} Flexible · ${curScore.sleepCount} Asleep`;

    if (total > 0) {
      const details = state.team.map((m) => {
        const localStr = window.MeridianZones.formatTime(startDate, m.tz, state.use24h);
        return `${m.city}: ${localStr}`;
      });
      overlapDetail.textContent = details.join("  |  ");
    } else {
      overlapDetail.textContent = "";
    }

    // Score all 48 half-hour slots
    const ranked = [];
    for (let s = 0; s < 48; s++) {
      ranked.push(scoreSlot(s));
    }
    ranked.sort((a, b) => b.points - a.points || b.workCount - a.workCount);
    const topSlots = ranked.slice(0, 3);

    bestSlotsEl.innerHTML = "";
    if (total > 0) {
      const prefix = document.createElement("span");
      prefix.style.fontSize = "12px";
      prefix.style.fontWeight = "700";
      prefix.style.color = "var(--text-sub)";
      prefix.textContent = "Best Slots:";
      bestSlotsEl.appendChild(prefix);

      topSlots.forEach((slot) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot-pill" + (slot.slotIdx === state.slotIndex ? " is-selected" : "");
        const tLabel = window.MeridianZones.formatTime(slot.instant, state.refTz, state.use24h);
        btn.textContent = `${tLabel} (${slot.workCount}/${total} work)`;
        btn.addEventListener("click", () => {
          state.slotIndex = slot.slotIdx;
          hourSlider.value = String(slot.slotIdx);
          renderAll();
        });
        bestSlotsEl.appendChild(btn);
      });
    }
  }

  function renderTimeline() {
    timelineGrid.innerHTML = "";
    const midnightRef = window.MeridianZones.wallTimeToDate(state.dateStr, 0, 0, state.refTz);
    const { startDate } = getSelectedRange();
    const selectedStartHour = Math.floor(state.slotIndex / 2);
    const spanHours = Math.max(1, Math.ceil(state.durationMin / 60));

    const isHighlightedHour = (colHour) => {
      for (let offset = 0; offset < spanHours; offset++) {
        if ((selectedStartHour + offset) % 24 === colHour) return true;
      }
      return false;
    };

    // Axis row
    const axisRow = document.createElement("div");
    axisRow.className = "axis-row";
    const axisLabel = document.createElement("div");
    axisLabel.className = "axis-label";
    axisLabel.textContent = `TEAMMATE · REF (${state.refTz.split("/").pop().replace("_", " ")})`;
    axisRow.appendChild(axisLabel);

    for (let h = 0; h < 24; h++) {
      const colDate = new Date(midnightRef.getTime() + h * 3600000);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "axis-hour" + (h === selectedStartHour ? " is-selected" : "");
      if (state.use24h) {
        btn.textContent = `${String(h).padStart(2, "0")}`;
      } else {
        const ap = h < 12 ? "a" : "p";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        btn.textContent = `${h12}${ap}`;
      }
      btn.title = `Select ${window.MeridianZones.formatTime(colDate, state.refTz, state.use24h)}`;
      btn.addEventListener("click", () => {
        state.slotIndex = h * 2;
        hourSlider.value = String(state.slotIndex);
        renderAll();
      });
      axisRow.appendChild(btn);
    }
    timelineGrid.appendChild(axisRow);

    // Teammate rows
    state.team.forEach((member) => {
      const row = document.createElement("div");
      row.className = "member-row";

      const info = document.createElement("div");
      info.className = "member-info";

      const names = document.createElement("div");
      names.className = "member-names";
      const nEl = document.createElement("div");
      nEl.className = "member-name";
      nEl.textContent = member.name;
      const zEl = document.createElement("div");
      zEl.className = "member-zone";
      zEl.textContent = `${member.city}${member.role ? " · " + member.role : ""}`;
      names.appendChild(nEl);
      names.appendChild(zEl);

      const clockEl = document.createElement("span");
      clockEl.className = "member-clock";
      clockEl.textContent = window.MeridianZones.formatTime(startDate, member.tz, state.use24h);

      const rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.className = "remove-btn";
      rmBtn.innerHTML = "&times;";
      rmBtn.title = `Remove ${member.name}`;
      rmBtn.setAttribute("aria-label", `Remove ${member.name}`);
      rmBtn.addEventListener("click", () => {
        state.team = state.team.filter((t) => t.id !== member.id);
        saveTeam();
        renderAll();
        showToast(`Removed ${member.name}`);
      });

      info.appendChild(names);
      info.appendChild(clockEl);
      info.appendChild(rmBtn);
      row.appendChild(info);

      for (let h = 0; h < 24; h++) {
        const instant = new Date(midnightRef.getTime() + h * 3600000);
        const parts = window.MeridianZones.getPartsInZone(instant, member.tz);
        const band = window.MeridianZones.classifyHour(parts.hour);

        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = `hour-tile tile-${band}` + (isHighlightedHour(h) ? " is-in-window" : "");
        if (state.use24h) {
          tile.textContent = String(parts.hour).padStart(2, "0");
        } else {
          const ap = parts.hour < 12 ? "a" : "p";
          const h12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
          tile.textContent = `${h12}${ap}`;
        }
        tile.title = `${member.name} (${member.city}): ${window.MeridianZones.formatTime(instant, member.tz, state.use24h)} · ${window.MeridianZones.formatDayShort(instant, member.tz)}`;
        tile.addEventListener("click", () => {
          state.slotIndex = h * 2;
          hourSlider.value = String(state.slotIndex);
          renderAll();
        });
        row.appendChild(tile);
      }

      timelineGrid.appendChild(row);
    });
  }

  function renderAll() {
    renderOverlapAndBestSlots();
    renderTimeline();
  }

  dateInput.value = state.dateStr;
  dateInput.addEventListener("change", () => {
    if (dateInput.value) {
      state.dateStr = dateInput.value;
      renderAll();
    }
  });

  refZoneSelect.addEventListener("change", () => {
    state.refTz = refZoneSelect.value;
    renderAll();
  });

  durationSelect.addEventListener("change", () => {
    state.durationMin = Number(durationSelect.value);
    renderAll();
  });

  hourSlider.addEventListener("input", () => {
    state.slotIndex = Number(hourSlider.value);
    renderAll();
  });

  formatToggleBtn.addEventListener("click", () => {
    state.use24h = !state.use24h;
    formatToggleBtn.textContent = state.use24h ? "24h Format" : "12h Format";
    formatToggleBtn.classList.toggle("is-active", !state.use24h);
    renderAll();
  });

  resetTeamBtn.addEventListener("click", () => {
    state.team = window.MeridianZones.DEFAULT_TEAM.map((m) => ({ ...m }));
    saveTeam();
    renderAll();
    showToast("Restored default distributed team");
  });

  addMemberForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = memberNameInput.value.trim();
    if (!name) return;
    const role = memberRoleInput.value.trim() || "Member";
    const tz = memberZoneSelect.value;
    const cityObj = window.MeridianZones.CITIES.find((c) => c.tz === tz);
    state.team.push({
      id: `m_${Date.now()}`,
      name,
      role,
      city: cityObj ? cityObj.city : tz.split("/").pop(),
      tz
    });
    saveTeam();
    memberNameInput.value = "";
    memberRoleInput.value = "";
    renderAll();
    showToast(`Added ${name} (${cityObj ? cityObj.city : tz})`);
  });

  copyInviteBtn.addEventListener("click", async () => {
    const title = meetingTitleInput.value.trim() || "Team Sync";
    const { startDate, endDate } = getSelectedRange();
    const lines = [
      `${title} (${state.durationMin} min)`,
      `UTC: ${window.MeridianZones.formatDayShort(startDate, "UTC")}, ${window.MeridianZones.formatTime(startDate, "UTC", state.use24h)} - ${window.MeridianZones.formatTime(endDate, "UTC", state.use24h)}`,
      ""
    ];
    state.team.forEach((m) => {
      const s = window.MeridianZones.formatTime(startDate, m.tz, state.use24h);
      const e = window.MeridianZones.formatTime(endDate, m.tz, state.use24h);
      const day = window.MeridianZones.formatDayShort(startDate, m.tz);
      lines.push(`- ${m.city} (${m.name}): ${day}, ${s} - ${e}`);
    });
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch (_e) {
      // Ignore clipboard failures
    }
    showToast("Copied multi-timezone calendar invite!");
  });

  populateCityDropdowns();
  renderAll();
})();
