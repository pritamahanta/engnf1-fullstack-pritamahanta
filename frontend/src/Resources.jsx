import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { useApiData } from "./useApiData.js";
import "./resources.css";

const TYPES = ["ROOM", "LAB", "EQUIPMENT"];
const HALF_HOUR = 30 * 60_000;
const MAX_DURATION = 8 * HALF_HOUR;
const MAX_LEAD = 30 * 24 * 60 * 60_000;
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function localDate(time) {
  const date = new Date(time);
  const pad = (value) => String(value).padStart(2, "0");
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
}

function dayBounds(value) {
  const start = new Date(value + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

function timeOptions(from, to, step = HALF_HOUR) {
  const times = [];
  for (let time = from; time < to; time += step) times.push(time);
  return times;
}

const iso = (time) => new Date(time).toISOString();
const overlaps = (from, to, slot) => from < Date.parse(slot.endTime) && to > Date.parse(slot.startTime);

function QueryFeedback({ query, label, retry }) {
  if (query.error) {
    return <div className="resource-feedback">
      <p className="error" role="alert">{query.error}</p>
      <button type="button" className="secondary" onClick={retry}>Retry</button>
    </div>;
  }
  return query.loading && <p role="status">Loading {label}…</p>;
}

export function ResourceBrowser() {
  const [filters, setFilters] = useState({ search: "", type: "", minCapacity: "" });
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const capacity = Number(filters.minCapacity);
  const validCapacity = !filters.minCapacity || (Number.isInteger(capacity) && capacity >= 1 && capacity <= 500);
  const params = new URLSearchParams({ page: String(page) });
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) params.set(key, value.trim());
  }
  const query = useApiData(validCapacity ? `/resources?${params}` : null, revision, 200);

  function changeFilter(event) {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
    setPage(1);
  }

  return (
    <section className="resource-page" aria-labelledby="resources-title">
      <h1 id="resources-title">Resources</h1>
      <div className="card resource-filters">
        <label>Search by name<input type="search" name="search" value={filters.search} onChange={changeFilter} /></label>
        <label>Type<select name="type" value={filters.type} onChange={changeFilter}>
          <option value="">All types</option>
          {TYPES.map((type) => <option key={type}>{type}</option>)}
        </select></label>
        <label>Minimum capacity<input type="number" name="minCapacity" min="1" max="500" step="1"
          value={filters.minCapacity} onChange={changeFilter} aria-invalid={!validCapacity} /></label>
        {!validCapacity && <p className="error" role="alert">Enter a whole number from 1 to 500.</p>}
      </div>
      <QueryFeedback query={query} label="resources" retry={() => setRevision((n) => n + 1)} />
      {query.data && (
        <>
          {query.data.data.length ? <ul className="resource-grid">
            {query.data.data.map((resource) => <li key={resource.id} className="card">
              <h2><Link to={`/resources/${resource.id}`}>{resource.name}</Link></h2>
              <p>{resource.type} · Capacity {resource.capacity}{!resource.isActive && " · Inactive"}</p>
              {resource.description && <p>{resource.description}</p>}
            </li>)}
          </ul> : <p className="card">No resources match these filters.</p>}
          {(page > 1 || query.data.totalPages > 1) && <div className="ticket-pager">
            <button className="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page}{query.data.totalPages > 0 && ` of ${query.data.totalPages}`}</span>
            <button className="secondary" disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>}
        </>
      )}
    </section>
  );
}

function Availability({ slots }) {
  return slots.length ? <ul className="resource-slots">
    {slots.map((slot) => <li key={slot.startTime}>
      <span>{dateTimeFormat.formatRange(new Date(slot.startTime), new Date(slot.endTime))}</span>
      <strong>{slot.status}</strong>
    </li>)}
  </ul> : <p>No bookings for this date.</p>;
}

function BookingForm({ resourceId, date, minDate, maxDate, from, to, slots, disabled, onDateChange, onRefresh }) {
  const { request } = useAuth();
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const now = Date.now();
  const starts = slots ? timeOptions(Math.ceil(from / HALF_HOUR) * HALF_HOUR, to).filter((time) =>
    time > now && time <= now + MAX_LEAD && !slots.some((slot) => overlaps(time, time + HALF_HOUR, slot))
  ) : [];
  const start = starts.includes(Number(selectedStart)) ? selectedStart : "";
  const ends = start ? timeOptions(Number(start) + HALF_HOUR, Number(start) + MAX_DURATION + HALF_HOUR)
    .filter((time) => !slots.some((slot) => overlaps(Number(start), time, slot))) : [];
  const end = ends.includes(Number(selectedEnd)) ? selectedEnd : "";

  async function submit(event) {
    event.preventDefault();
    if (!start || !end || disabled || pending) return;
    const form = event.currentTarget;
    const input = new FormData(form);
    const ticket = input.get("ticketId");
    const body = {
      resourceId,
      startTime: iso(Number(start)),
      endTime: iso(Number(end)),
      purpose: input.get("purpose").trim(),
      ...(ticket ? { ticketId: Number(ticket) } : {}),
    };
    if (body.purpose.length < 5) {
      setFeedback({ type: "error", text: "Enter a purpose of at least 5 characters." });
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      const booking = await request("/bookings", { method: "POST", body });
      setFeedback({ type: "notice", text: `Booking #${booking.id} submitted. Status: ${booking.status}.` });
      setSelectedStart("");
      setSelectedEnd("");
      form.reset();
      onRefresh();
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
      if (error.status === 409) onRefresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <label>Date<input type="date" value={date} min={minDate} max={maxDate} disabled={pending}
        onChange={(event) => {
          setSelectedStart("");
          setSelectedEnd("");
          setFeedback(null);
          onDateChange(event.target.value);
        }} /></label>
      {slots && !disabled && starts.length === 0 && <p>No bookable start times for this date.</p>}
      <form onSubmit={submit}>
        <fieldset className="resource-fields" disabled={disabled || pending}>
          <label>Start time<select value={start} required onChange={(event) => {
            setSelectedStart(event.target.value);
            setSelectedEnd("");
          }}>
            <option value="">Choose a start</option>
            {starts.map((time) => <option key={time} value={time}>{timeFormat.format(time)}</option>)}
          </select></label>
          <label>End time<select value={end} required disabled={!start} onChange={(event) => setSelectedEnd(event.target.value)}>
            <option value="">Choose an end</option>
            {ends.map((time) => <option key={time} value={time}>
              {localDate(time) === date ? timeFormat.format(time) : dateTimeFormat.format(time)}
            </option>)}
          </select></label>
          <label>Purpose<input name="purpose" minLength={5} maxLength={200} required /></label>
          <label>Ticket ID (optional)<input name="ticketId" type="number" min="1" max="2147483647" step="1" /></label>
        </fieldset>
        <button disabled={disabled || pending || !start || !end}>{pending ? "Submitting…" : "Request booking"}</button>
        {feedback && <p className={feedback.type} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      </form>
    </>
  );
}

function ResourceSchedule({ resource }) {
  const [date, setDate] = useState(() => localDate(Date.now()));
  const [revision, setRevision] = useState(0);
  const minDate = localDate(Date.now());
  const maxDate = localDate(Date.now() + MAX_LEAD);
  const validDate = date && date >= minDate && date <= maxDate;
  const [from, to] = dayBounds(date);
  const range = validDate ? new URLSearchParams({ from: iso(from), to: iso(to + MAX_DURATION) }) : null;
  const query = useApiData(range ? `/resources/${resource.id}/availability?${range}` : null, revision);
  const refresh = () => setRevision((n) => n + 1);
  const slots = query.data?.bookings;
  return (
    <div className="resource-schedule">
      <section className="card">
        <h2>Book a time</h2>
        {!validDate && <p className="error" role="alert">Choose a date within the next 30 days.</p>}
        <BookingForm resourceId={resource.id} date={date} minDate={minDate} maxDate={maxDate}
          from={from} to={to} slots={slots} onDateChange={setDate} onRefresh={refresh}
          disabled={!slots || query.loading || Boolean(query.error)} />
      </section>
      <section className="card">
        <h2>Booked times</h2>
        <QueryFeedback query={query} label="availability" retry={refresh} />
        {slots && <Availability slots={slots.filter((slot) => overlaps(from, to, slot))} />}
      </section>
    </div>
  );
}

export function ResourceDetail() {
  const { id } = useParams();
  const [revision, setRevision] = useState(0);
  const query = useApiData(`/resources/${encodeURIComponent(id)}`, revision);
  const resource = query.data;
  return (
    <section className="resource-page" aria-labelledby="resource-title">
      <Link to="/resources">Back to resources</Link>
      <h1 id="resource-title">{resource?.name ?? "Resource details"}</h1>
      <QueryFeedback query={query} label="resource details" retry={() => setRevision((n) => n + 1)} />
      {resource && <>
        <div className="card resource-info">
          <p>{resource.type} · Capacity {resource.capacity}</p>
          {resource.description && <p>{resource.description}</p>}
        </div>
        {resource.isActive ? <ResourceSchedule key={id} resource={resource} /> : <p className="card">This resource is inactive.</p>}
      </>}
    </section>
  );
}
