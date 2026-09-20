import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api, { formatApiError } from '../../core/api';
import { formatEuDate } from '../../utils/dateFormatter';
import styles from '../../styles/Admin.module.css';

const DEFAULT_CLANS = [
  'Ventrue', 'Brujah', 'Toreador', 'Tremere', 'Malkavian',
  'Nosferatu', 'Gangrel', 'Lasombra', 'Banu Haqim', 'Ministry',
  'Hecata', 'Ravnos', 'Tzimisce', 'Salubri', 'Thin Blood'
];

const DEFAULT_MOCK_NAMES = [
  'Lord Nathaniel Vance', 'Kallisto Vane', 'Julian Mercer', 'Helena Cross',
  'Damian Thorne', 'Sophia Drake', 'Victor Sterling', 'Kassandra Bell',
  'Nikolaos Karas', 'Valeria Ross', 'Marcus Blackwood', 'Elena Frost',
  'Caius Rhodes', 'Cassandra Croft', 'Evander Blake', 'Seraphina Mortis',
  'Dimitris Loukas', 'Aurelia Vex', 'Constantine Ward', 'Iris Sterling'
];

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[-—]/g, ':')
    .trim();
}

function formatDateForInput(d) {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  const mm = pad(dateObj.getMonth() + 1);
  const dd = pad(dateObj.getDate());
  const hh = pad(dateObj.getHours());
  const min = pad(dateObj.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatDateOnly(d) {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  const mm = pad(dateObj.getMonth() + 1);
  const dd = pad(dateObj.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function parseFlexibleDate(str) {
  if (!str) return '';
  const trimmed = str.trim();
  // Match YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Match DD/MM/YYYY
  const euMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return formatDateOnly(d);
  }
  return '';
}

export default function AdminCalendarTab() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Events state
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  // Downtimes state (Single active)
  const [downtimeOpening, setDowntimeOpening] = useState('');
  const [downtimeDeadline, setDowntimeDeadline] = useState('');
  const [downtimePhase, setDowntimePhase] = useState('standard');
  const [savingDt, setSavingDt] = useState(false);

  // Multiple Downtime Cycles state
  const [dtCycles, setDtCycles] = useState([]);
  const [activeCycleId, setActiveCycleId] = useState(null);
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [savingCycles, setSavingCycles] = useState(false);

  // New Cycle quick add form
  const [newCycleTitle, setNewCycleTitle] = useState('');
  const [newCycleOpening, setNewCycleOpening] = useState('');
  const [newCycleClosing, setNewCycleClosing] = useState('');

  // RSVP state
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [rsvpCount, setRsvpCount] = useState(18);
  const [rsvpMaybeCount, setRsvpMaybeCount] = useState(3);
  const [rsvpList, setRsvpList] = useState([]);
  const [availableChars, setAvailableChars] = useState([]);
  const [savingRsvp, setSavingRsvp] = useState(false);

  // Comms calendar state (Default to October 2026 or active chronicle month)
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 9, 1));
  const [chatSchedule, setChatSchedule] = useState({});
  const [commsLoading, setCommsLoading] = useState(false);

  const showFeedback = (message, isError = false) => {
    if (isError) {
      setErr(message);
      setMsg('');
    } else {
      setMsg(message);
      setErr('');
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [eventsRes, dtRes, commsRes, rsvpRes, cyclesRes] = await Promise.all([
        api.get('/admin/events').catch(() => ({ data: { events: [] } })),
        api.get('/downtimes/config').catch(() => ({ data: {} })),
        api.get('/admin/comms/config').catch(() => ({ data: { schedule: {} } })),
        api.get('/admin/events/rsvp').catch(() => ({ data: { config: null, roster: [] } })),
        api.get('/admin/downtimes/cycles').catch(() => ({ data: { cycles: [] } }))
      ]);

      const loadedEvents = eventsRes.data?.events || [];
      setEvents(loadedEvents);

      // Downtimes config
      const dtData = dtRes.data || {};
      const curOpening = formatDateOnly(dtData.downtime_opening) || '';
      const curDeadline = formatDateOnly(dtData.downtime_deadline) || '';
      setDowntimeOpening(curOpening);
      setDowntimeDeadline(curDeadline);
      setDowntimePhase(dtData.downtime_active_phase || 'standard');

      // Multiple DT Cycles
      const loadedCycles = cyclesRes.data?.cycles || [];
      setDtCycles(loadedCycles);

      // Comms schedule
      setChatSchedule(commsRes.data?.schedule || {});

      // Roster and RSVP
      const roster = rsvpRes.data?.roster || [];
      setAvailableChars(roster);

      const rsvpCfg = rsvpRes.data?.config;
      if (rsvpCfg) {
        setRsvpEnabled(rsvpCfg.enabled !== false);
        setRsvpCount(Number(rsvpCfg.count) || 18);
        setRsvpMaybeCount(Number(rsvpCfg.maybeCount) || 3);
        if (Array.isArray(rsvpCfg.attendees) && rsvpCfg.attendees.length > 0) {
          setRsvpList(rsvpCfg.attendees);
        } else {
          generateInitialAttendees(roster, Number(rsvpCfg.count) || 18, Number(rsvpCfg.maybeCount) || 3);
        }
      } else {
        generateInitialAttendees(roster, 18, 3);
      }

      // Pick next upcoming event
      const now = new Date();
      const upcoming = loadedEvents.find(e => new Date(e.date) >= now) || loadedEvents[0];
      if (upcoming) {
        setSelectedEventId(upcoming.id);
        setEventTitle(cleanTitle(upcoming.title) || '');
        setEventDate(formatDateForInput(upcoming.date));
        setEventDescription(upcoming.description || '');

        const uDate = new Date(upcoming.date);
        if (!isNaN(uDate.getTime())) {
          setCurrentMonth(new Date(uDate.getFullYear(), uDate.getMonth(), 1));
        }
      }
    } catch (e) {
      console.error('[AdminCalendarTab] Failed loading calendar data', e);
      showFeedback(formatApiError(e, 'Failed to load calendar data'), true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync selected event form when user changes selection
  const handleSelectEvent = (id) => {
    const ev = events.find(e => e.id === Number(id));
    if (!ev) return;
    setSelectedEventId(ev.id);
    setEventTitle(cleanTitle(ev.title) || '');
    setEventDate(formatDateForInput(ev.date));
    setEventDescription(ev.description || '');

    const evDate = new Date(ev.date);
    if (!isNaN(evDate.getTime())) {
      setCurrentMonth(new Date(evDate.getFullYear(), evDate.getMonth(), 1));
    }
  };

  const nextUpcomingEvent = useMemo(() => {
    const now = new Date();
    const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.find(e => new Date(e.date) >= now) || sorted[0] || null;
  }, [events]);

  const activeEvent = useMemo(() => {
    if (selectedEventId) {
      return events.find(e => e.id === selectedEventId) || nextUpcomingEvent;
    }
    return nextUpcomingEvent;
  }, [events, selectedEventId, nextUpcomingEvent]);

  // Generator for mock RSVPs
  const generateInitialAttendees = (roster, confirmedNum, maybeNum) => {
    const total = confirmedNum + maybeNum;
    const generated = [];
    const usedNames = new Set();

    for (let i = 0; i < total; i++) {
      let charName = '';
      let clanName = '';
      let playerName = '';

      if (i < roster.length && roster[i]) {
        charName = roster[i].name;
        clanName = roster[i].clan || DEFAULT_CLANS[i % DEFAULT_CLANS.length];
        playerName = roster[i].display_name || 'Kindred Player';
      } else {
        const pickName = DEFAULT_MOCK_NAMES[i % DEFAULT_MOCK_NAMES.length];
        charName = usedNames.has(pickName) ? `${pickName} II` : pickName;
        clanName = DEFAULT_CLANS[i % DEFAULT_CLANS.length];
        playerName = `Storyteller Cast ${i + 1}`;
      }
      usedNames.add(charName);

      const isMaybe = i >= confirmedNum;
      generated.push({
        id: `rsvp_${i + 1}`,
        name: charName,
        clan: clanName,
        player: playerName,
        status: isMaybe ? 'Maybe' : 'Attending',
        timeAgo: `${(i % 5) + 1} days ago`
      });
    }
    setRsvpList(generated);
  };

  const handleShuffleRsvp = () => {
    const totalConfirmed = Number(rsvpCount) || 12;
    const totalMaybe = Number(rsvpMaybeCount) || 3;
    const shuffledRoster = [...availableChars].sort(() => 0.5 - Math.random());
    generateInitialAttendees(shuffledRoster, totalConfirmed, totalMaybe);
    showFeedback('RSVP attendee list regenerated');
  };

  // Save Event updates
  const handleSaveEvent = async (e) => {
    if (e) e.preventDefault();
    if (!activeEvent || !activeEvent.id) return;
    setSavingEvent(true);
    try {
      await api.patch(`/admin/events/${activeEvent.id}`, {
        title: eventTitle,
        date_string: eventDate,
        description: eventDescription
      });
      showFeedback('Event updated successfully');
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return { ...ev, title: eventTitle, date: new Date(eventDate), description: eventDescription };
        }
        return ev;
      }));
    } catch (error) {
      console.error('[AdminCalendarTab] Event update failed', error);
      showFeedback(formatApiError(error, 'Failed to update event'), true);
    } finally {
      setSavingEvent(false);
    }
  };

  // Auto calculate DT close (Sunday 1 week before event)
  const handleAutoCalculateDtClose = async () => {
    if (!activeEvent || !activeEvent.date) {
      showFeedback('No event selected to calculate downtime close date', true);
      return;
    }
    const evDate = new Date(activeEvent.date);
    if (isNaN(evDate.getTime())) {
      showFeedback('Invalid event date', true);
      return;
    }

    const dayOfWeek = evDate.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 7 : dayOfWeek;
    const calculatedClose = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate() - daysToSubtract);

    const closeStr = formatDateOnly(calculatedClose);
    setDowntimeDeadline(closeStr);

    setSavingDt(true);
    try {
      await api.post('/admin/downtimes/config', {
        downtime_opening: downtimeOpening || null,
        downtime_deadline: closeStr,
        downtime_active_phase: downtimePhase
      });
      showFeedback(`Downtime close set to Sunday ${formatEuDate(closeStr)} (1 week before ${cleanTitle(activeEvent.title)})`);
    } catch (error) {
      console.error('[AdminCalendarTab] Auto DT save failed', error);
      showFeedback(formatApiError(error, 'Failed to auto save downtime deadline'), true);
    } finally {
      setSavingDt(false);
    }
  };

  // Save Downtimes manually
  const handleSaveDowntimes = async () => {
    setSavingDt(true);
    try {
      await api.post('/admin/downtimes/config', {
        downtime_opening: downtimeOpening || null,
        downtime_deadline: downtimeDeadline || null,
        downtime_active_phase: downtimePhase
      });
      showFeedback('Downtime schedule saved');
    } catch (error) {
      console.error('[AdminCalendarTab] Downtimes save failed', error);
      showFeedback(formatApiError(error, 'Failed to save downtime configuration'), true);
    } finally {
      setSavingDt(false);
    }
  };

  // Save RSVP settings
  const handleSaveRsvp = async () => {
    setSavingRsvp(true);
    try {
      const configPayload = {
        enabled: rsvpEnabled,
        count: Number(rsvpCount),
        maybeCount: Number(rsvpMaybeCount),
        eventId: activeEvent ? activeEvent.id : null,
        attendees: rsvpList
      };
      await api.post('/admin/events/rsvp', configPayload);
      showFeedback('Fake RSVP configuration saved');
    } catch (error) {
      console.error('[AdminCalendarTab] RSVP save failed', error);
      showFeedback(formatApiError(error, 'Failed to save RSVP configuration'), true);
    } finally {
      setSavingRsvp(false);
    }
  };

  // Multiple Downtime Cycles Management
  const handleSaveCycles = async (updatedCycles, activeId = null) => {
    setSavingCycles(true);
    try {
      await api.post('/admin/downtimes/cycles', {
        cycles: updatedCycles,
        activeCycleId: activeId
      });
      setDtCycles(updatedCycles);
      if (activeId) {
        setActiveCycleId(activeId);
        const active = updatedCycles.find(c => c.id === activeId);
        if (active) {
          if (active.opening_date) setDowntimeOpening(active.opening_date);
          if (active.closing_date) setDowntimeDeadline(active.closing_date);
        }
      }
      showFeedback('Downtime cycles saved successfully');
    } catch (error) {
      console.error('[AdminCalendarTab] Save cycles failed', error);
      showFeedback(formatApiError(error, 'Failed to save downtime cycles'), true);
    } finally {
      setSavingCycles(false);
    }
  };

  const handleSetActiveCycle = async (cycle) => {
    setActiveCycleId(cycle.id);
    setDowntimeOpening(cycle.opening_date || '');
    setDowntimeDeadline(cycle.closing_date || '');
    await handleSaveCycles(dtCycles, cycle.id);
    showFeedback(`Active cycle set to ${cycle.title}`);
  };

  const handleDeleteCycle = async (id) => {
    const next = dtCycles.filter(c => c.id !== id);
    await handleSaveCycles(next);
  };

  const handleAddSingleCycle = async (e) => {
    if (e) e.preventDefault();
    if (!newCycleTitle || !newCycleClosing) {
      showFeedback('Title and Closing date are required', true);
      return;
    }
    const newCycle = {
      id: `cycle_${Date.now()}`,
      title: cleanTitle(newCycleTitle),
      opening_date: newCycleOpening || null,
      closing_date: newCycleClosing,
      status: 'scheduled'
    };
    const next = [...dtCycles, newCycle];
    await handleSaveCycles(next);
    setNewCycleTitle('');
    setNewCycleOpening('');
    setNewCycleClosing('');
  };

  // Auto Generate all 12 DT Cycles from chronicle events
  const handleAutoGenerateCycles = async () => {
    const sorted = [...events].filter(e => e.date).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length === 0) {
      showFeedback('No chronicle events found to generate cycles from', true);
      return;
    }

    const generated = [];
    for (let i = 0; i < sorted.length; i++) {
      const ev = sorted[i];
      const evDate = new Date(ev.date);
      const dayOfWeek = evDate.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 7 : dayOfWeek;
      const closeObj = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate() - daysToSubtract);
      const closeStr = formatDateOnly(closeObj);

      // Opening date: Sunday after previous event, or 14 days before close date for the first event
      let openStr = '';
      if (i === 0) {
        const openObj = new Date(closeObj.getFullYear(), closeObj.getMonth(), closeObj.getDate() - 14);
        openStr = formatDateOnly(openObj);
      } else {
        const prevEv = sorted[i - 1];
        const prevDate = new Date(prevEv.date);
        const prevSunday = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate() + 1);
        openStr = formatDateOnly(prevSunday);
      }

      if (openStr > closeStr) {
        // Skip events that fall in the same weekend or before close (e.g. Grand Event Day 2)
        continue;
      }

      generated.push({
        id: `event_cycle_${ev.id}`,
        title: `DT Cycle for ${cleanTitle(ev.title)}`,
        opening_date: openStr,
        closing_date: closeStr,
        linked_event_id: ev.id,
        status: i === 1 ? 'active' : (i === 0 ? 'closed' : 'scheduled')
      });
    }

    await handleSaveCycles(generated);
    showFeedback(`Generated ${generated.length} Downtime cycles from chronicle events`);
  };

  // Parse bulk paste text (supports CSV, tab separated, labeled text, JSON)
  const handleParseBulkPaste = async () => {
    if (!bulkPasteText.trim()) return;
    const text = bulkPasteText.trim();
    const parsed = [];

    // Check if JSON
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const arr = JSON.parse(text);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (item.closing_date || item.closing || item.deadline) {
              parsed.push({
                id: item.id || `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                title: cleanTitle(item.title || item.name || 'Downtime Cycle'),
                opening_date: parseFlexibleDate(item.opening_date || item.opening || ''),
                closing_date: parseFlexibleDate(item.closing_date || item.closing || item.deadline || ''),
                status: item.status || 'scheduled'
              });
            }
          }
        }
      } catch (_) {}
    }

    if (parsed.length === 0) {
      // Split into lines
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        // Split by comma or tab or semicolon
        const parts = line.split(/[,\t;]/).map(p => p.trim());
        if (parts.length >= 2) {
          // Check which parts are dates
          let open = '';
          let close = '';
          let title = '';

          const d1 = parseFlexibleDate(parts[0]);
          const d2 = parseFlexibleDate(parts[1]);

          if (d1 && d2) {
            open = d1;
            close = d2;
            title = parts.slice(2).join(' ') || `Downtime Cycle ${dtCycles.length + parsed.length + 1}`;
          } else if (d1 && !d2) {
            close = d1;
            title = parts.slice(1).join(' ') || `Downtime Cycle ${dtCycles.length + parsed.length + 1}`;
          } else {
            // maybe format is: Title, Open, Close
            const dEnd1 = parseFlexibleDate(parts[parts.length - 2]);
            const dEnd2 = parseFlexibleDate(parts[parts.length - 1]);
            if (dEnd1 && dEnd2) {
              open = dEnd1;
              close = dEnd2;
              title = parts.slice(0, parts.length - 2).join(' ');
            } else if (dEnd2) {
              close = dEnd2;
              title = parts.slice(0, parts.length - 1).join(' ');
            }
          }

          if (close) {
            parsed.push({
              id: `cycle_${Date.now()}_${idx}`,
              title: cleanTitle(title || `Downtime Cycle ${dtCycles.length + parsed.length + 1}`),
              opening_date: open || null,
              closing_date: close,
              status: 'scheduled'
            });
          }
        }
      }
    }

    if (parsed.length === 0) {
      showFeedback('Could not parse valid dates from text. Please format as: Opening Date, Closing Date, Title', true);
      return;
    }

    const next = [...dtCycles, ...parsed];
    await handleSaveCycles(next);
    setBulkPasteText('');
    setBulkPasteOpen(false);
    showFeedback(`Successfully parsed and imported ${parsed.length} Downtime cycles`);
  };

  // Comms Schedule Actions
  const saveCommsSchedule = async (customSchedule) => {
    const target = customSchedule || chatSchedule;
    setCommsLoading(true);
    try {
      await api.post('/admin/comms/schedule', { schedule: target });
      showFeedback('Comms schedule saved');
    } catch (error) {
      console.error('[AdminCalendarTab] Comms schedule save failed', error);
      showFeedback(formatApiError(error, 'Failed to save comms schedule'), true);
    } finally {
      setCommsLoading(false);
    }
  };

  const toggleDay = async (dateStr) => {
    const next = { ...chatSchedule };
    if (next[dateStr] === undefined) {
      next[dateStr] = '17:00';
    } else if (next[dateStr] === '17:00') {
      next[dateStr] = false;
    } else if (next[dateStr] === false) {
      next[dateStr] = true;
    } else if (next[dateStr] === true) {
      next[dateStr] = 'event';
    } else {
      delete next[dateStr];
    }
    setChatSchedule(next);
    await saveCommsSchedule(next);
  };

  const applyDefaultHoursForWeek = async (weekIndex) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startDayOffset = (firstDay + 6) % 7;

    const weekDefaults = [
      false,
      false,
      true,
      false,
      '17:00',
      '17:00',
      false
    ];

    const weekDateStrs = [];
    let alreadyDefault = true;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(year, month, 1 - startDayOffset + (weekIndex * 7) + dayOffset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      weekDateStrs.push(dateStr);

      if (chatSchedule[dateStr] !== weekDefaults[dayOffset]) {
        alreadyDefault = false;
      }
    }

    const next = { ...chatSchedule };
    if (alreadyDefault) {
      for (const dateStr of weekDateStrs) {
        delete next[dateStr];
      }
    } else {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        next[weekDateStrs[dayOffset]] = weekDefaults[dayOffset];
      }
    }
    setChatSchedule(next);
    await saveCommsSchedule(next);
  };

  const applyEventWeek = async (weekIndex, eventDaysCount = 1) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startDayOffset = (firstDay + 6) % 7;

    const weekDateStrs = [];
    let alreadyEvent = true;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(year, month, 1 - startDayOffset + (weekIndex * 7) + dayOffset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      weekDateStrs.push(dateStr);

      const expected = (dayOffset === 5 || (dayOffset === 6 && eventDaysCount === 2)) ? 'event' : false;
      if (chatSchedule[dateStr] !== expected) {
        alreadyEvent = false;
      }
    }

    const next = { ...chatSchedule };
    if (alreadyEvent) {
      for (const dateStr of weekDateStrs) {
        delete next[dateStr];
      }
    } else {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dateStr = weekDateStrs[dayOffset];
        if (dayOffset === 5) {
          next[dateStr] = 'event';
        } else if (dayOffset === 6 && eventDaysCount === 2) {
          next[dateStr] = 'event';
        } else {
          next[dateStr] = false;
        }
      }
    }
    setChatSchedule(next);
    await saveCommsSchedule(next);
  };

  const applyDefaultHoursForMonth = async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startDayOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDays = startDayOffset + daysInMonth;
    const totalWeeks = Math.ceil(totalDays / 7);

    const weekDefaults = [
      false,
      false,
      true,
      false,
      '17:00',
      '17:00',
      false
    ];

    const allDates = [];
    let allAlreadyDefault = true;

    for (let w = 0; w < totalWeeks; w++) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(year, month, 1 - startDayOffset + (w * 7) + dayOffset);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayNum}`;
        allDates.push({ dateStr, expected: weekDefaults[dayOffset] });
        if (chatSchedule[dateStr] !== weekDefaults[dayOffset]) {
          allAlreadyDefault = false;
        }
      }
    }

    const next = { ...chatSchedule };
    if (allAlreadyDefault) {
      for (const item of allDates) {
        delete next[item.dateStr];
      }
    } else {
      for (const item of allDates) {
        next[item.dateStr] = item.expected;
      }
    }
    setChatSchedule(next);
    await saveCommsSchedule(next);
  };

  // Map of event dates for calendar markers
  const eventDateMap = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const dStr = formatDateOnly(ev.date);
      if (dStr) {
        map[dStr] = ev;
      }
    }
    return map;
  }, [events]);

  // Combined DT Close map: computes from events AND from all configured dtCycles
  const dtCloseMap = useMemo(() => {
    const map = {};
    // From all chronicle events
    for (const ev of events) {
      if (!ev.date) continue;
      const evDate = new Date(ev.date);
      if (isNaN(evDate.getTime())) continue;
      const d = evDate.getDay();
      const sub = d === 0 ? 7 : d;
      const closeObj = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate() - sub);
      const closeStr = formatDateOnly(closeObj);
      if (closeStr) {
        if (!map[closeStr]) map[closeStr] = [];
        map[closeStr].push({ title: cleanTitle(ev.title), type: 'event' });
      }
    }
    // From configured DT cycles
    for (const cycle of dtCycles) {
      if (!cycle.closing_date) continue;
      const closeStr = cycle.closing_date;
      if (!map[closeStr]) map[closeStr] = [];
      map[closeStr].push({ title: cycle.title, type: 'cycle' });
    }
    return map;
  }, [events, dtCycles]);

  // DT Open map: computes from configured dtCycles AND downtimeOpening
  const dtOpenMap = useMemo(() => {
    const map = {};
    if (downtimeOpening) {
      map[downtimeOpening] = [{ title: 'Active Downtime Open', type: 'active' }];
    }
    for (const cycle of dtCycles) {
      if (!cycle.opening_date) continue;
      const openStr = cycle.opening_date;
      if (!map[openStr]) map[openStr] = [];
      map[openStr].push({ title: cycle.title, type: 'cycle' });
    }
    return map;
  }, [downtimeOpening, dtCycles]);

  // Full chronicle schedule overview items
  const chronicleSchedule = useMemo(() => {
    return [...events]
      .filter(ev => ev.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(ev => {
        const evDate = new Date(ev.date);
        const d = evDate.getDay();
        const sub = d === 0 ? 7 : d;
        const closeObj = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate() - sub);
        return {
          id: ev.id,
          title: cleanTitle(ev.title),
          rawDate: ev.date,
          eventDateStr: formatDateOnly(evDate),
          closeDateStr: formatDateOnly(closeObj),
          isNext: nextUpcomingEvent && nextUpcomingEvent.id === ev.id
        };
      });
  }, [events, nextUpcomingEvent]);

  // Calendar rendering
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startDayOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startDayOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={styles.btn}
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            >
              Next
            </button>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={applyDefaultHoursForMonth}
            disabled={commsLoading}
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
            title="Apply default hours to all weeks in this month"
          >
            Apply Default Hours to Month
          </button>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 180px) repeat(7, minmax(44px, 1fr))', gap: '8px', textAlign: 'center', minWidth: '700px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Action Presets
            </div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>{d}</div>
            ))}

            {weeks.map((weekDays, weekIdx) => (
              <React.Fragment key={weekIdx}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => applyDefaultHoursForWeek(weekIdx)}
                    disabled={commsLoading}
                    title="Apply default hours for this week"
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      background: 'rgba(157, 124, 255, 0.08)',
                      border: '1px solid rgba(157, 124, 255, 0.25)',
                      color: 'var(--accent-purple)',
                      cursor: commsLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Default Hours
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => applyEventWeek(weekIdx, 1)}
                      disabled={commsLoading}
                      title="Set whole week OFF with Saturday as Event"
                      style={{
                        fontSize: '0.68rem',
                        padding: '3px 4px',
                        borderRadius: '4px',
                        background: 'rgba(255, 179, 0, 0.1)',
                        border: '1px solid rgba(255, 179, 0, 0.35)',
                        color: '#ffb300',
                        cursor: commsLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>event</span>
                      Event: Sat
                    </button>
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => applyEventWeek(weekIdx, 2)}
                      disabled={commsLoading}
                      title="Set whole week OFF with Saturday and Sunday as Event"
                      style={{
                        fontSize: '0.68rem',
                        padding: '3px 4px',
                        borderRadius: '4px',
                        background: 'rgba(255, 179, 0, 0.1)',
                        border: '1px solid rgba(255, 179, 0, 0.35)',
                        color: '#ffb300',
                        cursor: commsLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>event</span>
                      Sat + Sun
                    </button>
                  </div>
                </div>

                {weekDays.map((d, dayIdx) => {
                  if (!d) return <div key={dayIdx} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const state = chatSchedule[dateStr];
                  const hasEvent = eventDateMap[dateStr];
                  const dtCloseItems = dtCloseMap[dateStr] || [];
                  const isExplicitDtClose = downtimeDeadline === dateStr;
                  const hasDtClose = dtCloseItems.length > 0 || isExplicitDtClose;

                  const dtOpenItems = dtOpenMap[dateStr] || [];
                  const isExplicitDtOpen = downtimeOpening === dateStr;
                  const hasDtOpen = dtOpenItems.length > 0 || isExplicitDtOpen;

                  let bg = 'var(--glass-inset)';
                  let border = '1px solid var(--glass-border)';
                  let color = 'var(--text-primary)';
                  let commsLabel = null;

                  if (state === true) {
                    bg = 'rgba(0, 230, 118, 0.12)';
                    border = '1px solid rgba(0, 230, 118, 0.4)';
                    color = 'var(--color-success)';
                    commsLabel = '00:01';
                  } else if (state === '17:00') {
                    bg = 'rgba(0, 150, 255, 0.12)';
                    border = '1px solid rgba(0, 150, 255, 0.4)';
                    color = '#0096FF';
                    commsLabel = '5pm';
                  } else if (state === false) {
                    bg = 'rgba(255, 77, 77, 0.12)';
                    border = '1px solid rgba(255, 77, 77, 0.3)';
                    color = 'var(--color-error)';
                    commsLabel = 'OFF';
                  } else if (state === 'event') {
                    bg = 'rgba(255, 179, 0, 0.15)';
                    border = '1px solid rgba(255, 179, 0, 0.5)';
                    color = '#ffb300';
                    commsLabel = hasEvent ? null : 'EVENT';
                  }

                  // Emphasize operational days with distinctive borders
                  if (hasDtClose) {
                    border = '1px solid rgba(255, 64, 129, 0.7)';
                    bg = 'rgba(255, 64, 129, 0.1)';
                  }
                  if (hasEvent) {
                    border = '1px solid rgba(255, 179, 0, 0.75)';
                    bg = 'rgba(255, 179, 0, 0.18)';
                  }
                  if (hasDtOpen) {
                    border = '1px solid rgba(0, 230, 118, 0.75)';
                  }

                  return (
                    <div
                      key={dayIdx}
                      onClick={() => toggleDay(dateStr)}
                      style={{
                        background: bg,
                        border: border,
                        color: color,
                        padding: '6px 3px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '74px',
                        position: 'relative',
                        boxShadow: hasDtClose ? '0 0 10px rgba(255, 64, 129, 0.2)' : hasEvent ? '0 0 10px rgba(255, 179, 0, 0.25)' : 'none'
                      }}
                      title={`Date: ${dateStr.replace(/-/g, '/')}. Click to cycle comms status.`}
                    >
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                          {d}
                        </span>
                        {commsLabel && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: 'rgba(0,0,0,0.4)' }}>
                            {commsLabel}
                          </span>
                        )}
                      </div>

                      {/* Operational markers with distinct icons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', marginTop: '3px' }}>
                        {hasEvent && (
                          <div
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              background: 'rgba(255, 179, 0, 0.35)',
                              border: '1px solid #ffb300',
                              color: '#ffd54f',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.2
                            }}
                            title={`Live Event: ${cleanTitle(hasEvent.title)}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '12px', flexShrink: 0 }}>celebration</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cleanTitle(hasEvent.title) || 'EVENT'}
                            </span>
                          </div>
                        )}

                        {hasDtClose && (
                          <div
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              background: 'rgba(255, 64, 129, 0.3)',
                              border: '1px solid #ff4081',
                              color: '#ff80ab',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.2
                            }}
                            title={`Downtime Deadline for: ${dtCloseItems.map(e => cleanTitle(e.title)).join(', ') || 'Next Event'}`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '11px', flexShrink: 0 }}>alarm_off</span>
                              <span>DT CLOSE</span>
                            </div>
                            {dtCloseItems.length > 0 && (
                              <div style={{ fontSize: '0.54rem', opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffb2dd' }}>
                                {cleanTitle(dtCloseItems[0].title).replace(/Modern Day Event|Past Time Event|Grand Event/gi, 'Event')}
                              </div>
                            )}
                          </div>
                        )}

                        {hasDtOpen && (
                          <div
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              background: 'rgba(0, 230, 118, 0.25)',
                              border: '1px solid var(--color-success)',
                              color: '#69f0ae',
                              borderRadius: '3px',
                              padding: '2px 4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2
                            }}
                            title={`Downtimes Open: ${dtOpenItems.map(o => cleanTitle(o.title)).join(', ')}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '11px', flexShrink: 0 }}>lock_open_right</span>
                            <span>DT OPEN</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.75rem', background: 'var(--glass-inset)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#0096FF' }} />
            <span>Blue: 5pm Open</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-success)' }} />
            <span>Green: Midnight Open</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-error)' }} />
            <span>Red: Force OFF</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ffb300' }}>celebration</span>
            <span>Amber: Live Event</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ff4081' }}>alarm_off</span>
            <span>Rose: Downtime Deadline (Closes Sunday 1 week prior)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-success)' }}>lock_open_right</span>
            <span>Emerald: Downtime Opening</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.adminCard}>
      {/* Tab Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.8rem', color: 'var(--accent-purple)' }}>calendar_month</span>
            Operations Calendar
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            Manage Comms schedule, Next Event details, Multiple Downtime operations, and Simulated RSVP attendance.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className={`${styles.btn} ${styles.btnSecondary}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
          Refresh Data
        </button>
      </div>

      {/* Alerts */}
      {msg && <div className={`${styles.alert} ${styles.alertSuccess}`} style={{ marginBottom: '1rem' }}>{msg}</div>}
      {err && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '1rem' }}>{err}</div>}

      {/* Grid: Next Event & Active Downtimes */}
      <div className={styles.rGrid2} style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Feature 1: Next Event Details */}
        <div style={{ background: 'var(--glass-inset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ffb300' }}>event</span>
              Next Chronicle Event
            </h3>
            {events.length > 1 && (
              <select
                value={selectedEventId || ''}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className={styles.input}
                style={{ width: 'auto', fontSize: '0.78rem', padding: '4px 8px' }}
                aria-label="Select Target Event"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {cleanTitle(ev.title)} ({formatEuDate(ev.date)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label className={styles.labeledInput}>
              <span>Event Name</span>
              <input
                type="text"
                className={styles.input}
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event Title"
                required
              />
            </label>

            <label className={styles.labeledInput}>
              <span>Date and Time</span>
              <input
                type="datetime-local"
                className={styles.input}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </label>

            <label className={styles.labeledInput}>
              <span>Description or Venue</span>
              <textarea
                className={styles.input}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows="2"
                placeholder="Optional description or IC location"
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {activeEvent?.date ? `Scheduled for ${formatEuDate(activeEvent.date)}` : 'No date set'}
              </span>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={savingEvent || !eventTitle || !eventDate}
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
              >
                {savingEvent ? 'Saving...' : 'Save Event Name and Date'}
              </button>
            </div>
          </form>
        </div>

        {/* Feature 2: Active Downtimes Automation */}
        <div style={{ background: 'var(--glass-inset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-success)' }}>schedule</span>
              Active Downtime Cycle
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 230, 118, 0.15)', color: 'var(--color-success)' }}>
              Phase: {downtimePhase}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label className={styles.labeledInput}>
              <span>DT Opening Date</span>
              <input
                type="date"
                className={styles.input}
                value={downtimeOpening}
                onChange={(e) => setDowntimeOpening(e.target.value)}
              />
            </label>

            <label className={styles.labeledInput}>
              <span>DT Deadline (Close)</span>
              <input
                type="date"
                className={styles.input}
                value={downtimeDeadline}
                onChange={(e) => setDowntimeDeadline(e.target.value)}
              />
            </label>
          </div>

          {/* Individual Feature: Auto calculate DT Close 1 week before event */}
          <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(157, 124, 255, 0.08)', border: '1px solid rgba(157, 124, 255, 0.25)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bolt</span>
              Automatic DT Close Rule
            </div>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
              Downtimes close 1 week before the event. If the event is on Saturday, downtimes close on the preceding Sunday at midnight.
            </p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleAutoCalculateDtClose}
              disabled={savingDt || !activeEvent}
              style={{ alignSelf: 'flex-start', fontSize: '0.78rem', padding: '0.4rem 0.8rem', marginTop: '2px' }}
            >
              {savingDt ? 'Setting...' : 'Calculate and Set DT Close from Next Event'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <select
              value={downtimePhase}
              onChange={(e) => setDowntimePhase(e.target.value)}
              className={styles.input}
              style={{ width: 'auto', fontSize: '0.78rem', padding: '4px 8px' }}
              aria-label="Downtime Active Phase"
            >
              <option value="standard">Standard Submission Phase</option>
              <option value="resolving">Storyteller Resolving Phase</option>
              <option value="closed">Closed Phase</option>
            </select>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={handleSaveDowntimes}
              disabled={savingDt}
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
            >
              {savingDt ? 'Saving...' : 'Save Downtime Dates'}
            </button>
          </div>
        </div>
      </div>

      {/* Feature 3: Multiple Downtime Operations & Bulk Paste Tool */}
      <div style={{ background: 'var(--glass-inset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent-purple)' }}>playlist_add_check</span>
              Multiple Downtime Operations Manager
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Configure and schedule multiple future downtime cycles. Paste them in bulk or auto generate all 12 from chronicle events.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={handleAutoGenerateCycles}
              disabled={savingCycles || events.length === 0}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Auto generate cycles for all 12 chronicle events"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_awesome</span>
              Generate from All 12 Events
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setBulkPasteOpen(prev => !prev)}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_paste</span>
              {bulkPasteOpen ? 'Close Paste Tool' : 'Bulk Paste DT Cycles'}
            </button>
          </div>
        </div>

        {/* Bulk Paste Area (Expandable) */}
        {bulkPasteOpen && (
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(157, 124, 255, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
              Paste Multiple Downtime Cycles
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Paste lines formatted as: Opening Date, Closing Date, Cycle Title (e.g. 2026/09/20, 2026/10/04, Cycle 2), tab separated from spreadsheets, or JSON.
            </p>
            <textarea
              className={styles.input}
              rows="5"
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              placeholder={`2026/09/01, 2026/09/13, DT Cycle 1\n2026/09/20, 2026/10/04, DT Cycle 2\n2026/10/11, 2026/10/25, DT Cycle 3`}
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setBulkPasteOpen(false)}
                style={{ fontSize: '0.78rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleParseBulkPaste}
                disabled={!bulkPasteText.trim() || savingCycles}
                style={{ fontSize: '0.78rem' }}
              >
                {savingCycles ? 'Importing...' : 'Parse and Add Cycles'}
              </button>
            </div>
          </div>
        )}

        {/* Single Cycle Quick Add Row */}
        <form onSubmit={handleAddSingleCycle} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(130px, 1fr) minmax(130px, 1fr) auto', gap: '8px', alignItems: 'flex-end' }}>
          <label className={styles.labeledInput} style={{ margin: 0 }}>
            <span>New Cycle Name</span>
            <input
              type="text"
              className={styles.input}
              value={newCycleTitle}
              onChange={(e) => setNewCycleTitle(e.target.value)}
              placeholder="e.g. DT Cycle 3"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            />
          </label>
          <label className={styles.labeledInput} style={{ margin: 0 }}>
            <span>Opening Date</span>
            <input
              type="date"
              className={styles.input}
              value={newCycleOpening}
              onChange={(e) => setNewCycleOpening(e.target.value)}
              style={{ padding: '5px 8px', fontSize: '0.8rem' }}
            />
          </label>
          <label className={styles.labeledInput} style={{ margin: 0 }}>
            <span>Closing Date</span>
            <input
              type="date"
              className={styles.input}
              value={newCycleClosing}
              onChange={(e) => setNewCycleClosing(e.target.value)}
              style={{ padding: '5px 8px', fontSize: '0.8rem' }}
            />
          </label>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!newCycleTitle || !newCycleClosing || savingCycles}
            style={{ padding: '6px 12px', fontSize: '0.8rem', height: '36px' }}
          >
            Add Cycle
          </button>
        </form>

        {/* Cycles Roster Table */}
        <div style={{ marginTop: '0.5rem', overflowX: 'auto' }}>
          {dtCycles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.82rem' }}>
              No multiple downtime operations configured yet. Click "Generate from All 12 Events" or "Bulk Paste DT Cycles" to add them.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Operation / Cycle</th>
                  <th style={{ padding: '8px' }}>Opening Date</th>
                  <th style={{ padding: '8px' }}>Closing Deadline</th>
                  <th style={{ padding: '8px' }}>Active in System</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dtCycles.map((cycle) => {
                  const isActive = downtimeOpening === cycle.opening_date && downtimeDeadline === cycle.closing_date;
                  return (
                    <tr
                      key={cycle.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isActive ? 'rgba(0, 230, 118, 0.05)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--accent-purple)' }}>event_repeat</span>
                          <span>{cycle.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px', color: cycle.opening_date ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        {cycle.opening_date ? formatEuDate(cycle.opening_date) : 'Unset'}
                      </td>
                      <td style={{ padding: '8px', color: '#ff80ab', fontWeight: 700 }}>
                        {formatEuDate(cycle.closing_date)}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {isActive ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 230, 118, 0.18)', color: 'var(--color-success)' }}>
                            CURRENT ACTIVE
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => handleSetActiveCycle(cycle)}
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteCycle(cycle.id)}
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                          title="Delete this cycle"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Feature 4: Simulated / Fake RSVP System */}
      <div style={{ background: 'var(--glass-inset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#00e5ff' }}>how_to_reg</span>
              Simulated RSVP Attendance System
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Simulate player RSVPs and attendance counts for {activeEvent ? cleanTitle(activeEvent.title) : 'the next event'}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rsvpEnabled}
                onChange={(e) => setRsvpEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-purple)' }}
              />
              RSVP Simulation Active
            </label>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={handleShuffleRsvp}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>shuffle</span>
              Regenerate Roster
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleSaveRsvp}
              disabled={savingRsvp}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
            >
              {savingRsvp ? 'Saving...' : 'Save RSVP Settings'}
            </button>
          </div>
        </div>

        {/* Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>{rsvpCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Confirmed Attendees</div>
          </div>
          <div style={{ background: 'rgba(255, 204, 0, 0.08)', border: '1px solid rgba(255, 204, 0, 0.25)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warn)' }}>{rsvpMaybeCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tentative RSVPs</div>
          </div>
          <div style={{ background: 'rgba(157, 124, 255, 0.08)', border: '1px solid rgba(157, 124, 255, 0.25)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{Number(rsvpCount) + Number(rsvpMaybeCount)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Projected Kindred</div>
          </div>
        </div>

        {/* Inputs to tune counts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label className={styles.labeledInput}>
            <span>Confirmed Attendees Count</span>
            <input
              type="number"
              min="1"
              max="100"
              className={styles.input}
              value={rsvpCount}
              onChange={(e) => setRsvpCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </label>
          <label className={styles.labeledInput}>
            <span>Tentative Attendees Count</span>
            <input
              type="number"
              min="0"
              max="50"
              className={styles.input}
              value={rsvpMaybeCount}
              onChange={(e) => setRsvpMaybeCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </label>
        </div>

        {/* Attendees List preview */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Simulated Attendees Roster ({rsvpList.length} Kindred)
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', paddingRight: '4px' }}>
            {rsvpList.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  fontSize: '0.78rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                    Clan: {item.clan} , Player: {item.player}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: item.status === 'Attending' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 204, 0, 0.15)',
                    color: item.status === 'Attending' ? 'var(--color-success)' : 'var(--color-warn)'
                  }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature 5: Chronicle Sessions & Downtime Deadlines Tracker */}
      <div style={{ background: 'var(--glass-inset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent-purple)' }}>date_range</span>
              Chronicle Sessions and Downtime Deadlines
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              All 12 chronicle events with their automatically computed Sunday downtime closing deadlines (1 week prior). Click any session to view its month in the calendar below.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {chronicleSchedule.map(item => (
            <div
              key={item.id}
              onClick={() => handleSelectEvent(item.id)}
              style={{
                background: item.isNext ? 'rgba(157, 124, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                border: item.isNext ? '1px solid var(--accent-purple)' : '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {item.title}
                </div>
                {item.isNext && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-purple)', color: '#fff', whiteSpace: 'nowrap' }}>
                    NEXT
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffd54f' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>celebration</span>
                  <span>Event: {formatEuDate(item.eventDateStr)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff80ab' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>alarm_off</span>
                  <span>DT Close: Sunday {formatEuDate(item.closeDateStr)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature 6: Interactive Comms & Events Operational Calendar */}
      <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent-purple)' }}>calendar_view_month</span>
              Interactive Comms Schedule Calendar
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Click any date box to cycle through comms states. Badges and icons highlight Live Events, DT Close deadlines, and DT Opening dates across all scheduled operations.
            </p>
          </div>
        </div>

        {renderCalendar()}
      </div>
    </div>
  );
}
