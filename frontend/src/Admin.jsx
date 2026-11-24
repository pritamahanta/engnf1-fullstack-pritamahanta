import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { useApiData } from "./useApiData.js";
import "./admin.css";

const TYPES = ["ROOM", "LAB", "EQUIPMENT"];
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function AdminArea() {
  const { user } = useAuth();
  if (user.role !== "ADMIN") return <Navigate to="/tickets" replace />;

  return (
    <section className="admin">
      <h1>Admin</h1>
      <nav className="app-nav" aria-label="Admin navigation">
        <NavLink to="/admin" end>Analytics</NavLink>
        <NavLink to="/admin/resources">Manage resources</NavLink>
        <NavLink to="/admin/bookings">Manage bookings</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}

function useAdminList(path) {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const params = new URLSearchParams({ ...filters, page: String(page) });
  const query = useApiData(`${path}?${params}`, revision);

  const lastPage = query.data && !query.loading && !query.error
    ? Math.max(1, query.data.totalPages)
    : null;
  useEffect(() => {
    if (lastPage !== null && page > lastPage) setPage(lastPage);
  }, [lastPage, page]);

  function filter(values) {
    setFilters(Object.fromEntries(Object.entries(values).filter(([, value]) => value)));
    setPage(1);
  }

  return { ...query, page, setPage, filter, refresh: () => setRevision((value) => value + 1) };
}

function useAdminAction(refresh) {
  const { request } = useAuth();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function run(path, options, message, onSuccess) {
    setBusy(true);
    setFeedback(null);
    try {
      await request(path, options);
      onSuccess?.();
      setFeedback({ type: "notice", text: message });
      refresh();
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
      if (error.status === 404 || error.status === 409) refresh();
    } finally {
      setBusy(false);
    }
  }

  return { busy, feedback, run };
}

function Feedback({ feedback }) {
  if (!feedback) return null;
  return <p className={feedback.type} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>;
}

function QueryStatus({ query, label }) {
  if (query.loading) return <p role="status">Loading {label}…</p>;
  if (query.error) return <Feedback feedback={{ type: "error", text: query.error }} />;
  if (query.data?.data?.length === 0) return <p>No {label} match the filters.</p>;
  return null;
}

function Pagination({ list, busy }) {
  if (!list.data || list.data.totalPages <= 1) return null;
  const blocked = busy || list.loading;
  return (
    <div className="ticket-pager" aria-label="Pagination">
      <button className="secondary" disabled={blocked || list.page <= 1} onClick={() => list.setPage(list.page - 1)}>Previous</button>
      <span>Page {list.page} of {list.data.totalPages}</span>
      <button className="secondary" disabled={blocked || list.page >= list.data.totalPages} onClick={() => list.setPage(list.page + 1)}>Next</button>
    </div>
  );
}

function ResourceForm({ resource, disabled, onSave, onCancel }) {
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    onSave({
      name: values.name.trim(),
      type: values.type,
      capacity: Number(values.capacity),
      description: values.description.trim() || null,
    }, () => form.reset());
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="admin-fields" disabled={disabled}>
        <label>Name<input name="name" required minLength={3} maxLength={60} defaultValue={resource?.name} /></label>
        <label>Type<select name="type" defaultValue={resource?.type ?? TYPES[0]}>
          {TYPES.map((type) => <option key={type}>{type}</option>)}
        </select></label>
        <label>Capacity<input name="capacity" type="number" min="1" max="500" required defaultValue={resource?.capacity} /></label>
        <label className="admin-wide">Description<textarea name="description" maxLength={300} defaultValue={resource?.description ?? ""} /></label>
        <div className="admin-actions admin-wide">
          <button>{resource ? "Save changes" : "Create resource"}</button>
          {onCancel && <button type="button" className="secondary" onClick={onCancel}>Close editor</button>}
        </div>
      </fieldset>
    </form>
  );
}

export function AdminResources() {
  const list = useAdminList("/resources");
  const { busy, feedback, run } = useAdminAction(list.refresh);
  const [editing, setEditing] = useState(null);

  function filter(event) {
    event.preventDefault();
    setEditing(null);
    const values = new FormData(event.currentTarget);
    list.filter({ search: values.get("search").trim(), type: values.get("type") });
  }

  return (
    <div className="admin-content">
      <h2>Manage resources</h2>
      <Feedback feedback={feedback} />
      <section className="card">
        <h3>New resource</h3>
        <ResourceForm disabled={busy} onSave={(body, reset) => run("/resources", { method: "POST", body }, "Resource created.", reset)} />
      </section>
      <form className="card" onSubmit={filter}>
        <fieldset className="admin-fields" disabled={busy}>
          <label>Search by name<input name="search" type="search" /></label>
          <label>Resource type<select name="type">
            <option value="">All types</option>
            {TYPES.map((type) => <option key={type}>{type}</option>)}
          </select></label>
          <button className="secondary">Filter resources</button>
        </fieldset>
      </form>
      <QueryStatus query={list} label="resources" />
      {list.data?.data.map((resource) => (
        <article className="card admin-row" key={resource.id}>
          <h3>{resource.name}</h3>
          <p>{resource.type} · Capacity {resource.capacity} · {resource.isActive ? "Active" : "Inactive"}</p>
          {resource.description && <p>{resource.description}</p>}
          {editing === resource.id ? (
            <ResourceForm resource={resource} disabled={busy || list.loading} onCancel={() => setEditing(null)}
              onSave={(body) => run(`/resources/${resource.id}`, { method: "PATCH", body }, "Resource updated.", () => setEditing(null))} />
          ) : (
            <div className="admin-actions">
              <button className="secondary" disabled={busy || list.loading} onClick={() => setEditing(resource.id)}>Edit</button>
              <button className="secondary" disabled={busy || list.loading} onClick={() => {
                const body = { isActive: !resource.isActive };
                run(`/resources/${resource.id}`, { method: "PATCH", body }, body.isActive ? "Resource activated." : "Resource deactivated.");
              }}>{resource.isActive ? "Deactivate" : "Activate"}</button>
            </div>
          )}
        </article>
      ))}
      <Pagination list={list} busy={busy} />
    </div>
  );
}

export function AdminBookings() {
  const list = useAdminList("/bookings");
  const { busy, feedback, run } = useAdminAction(list.refresh);
  const [rejecting, setRejecting] = useState(null);
  const [filterError, setFilterError] = useState("");

  function filter(event) {
    event.preventDefault();
    const { status, resourceId, from, to } = Object.fromEntries(new FormData(event.currentTarget));
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;
    if (start && end && start >= end) {
      setFilterError("From must come before To.");
      return;
    }
    setFilterError("");
    setRejecting(null);
    list.filter({
      status,
      resourceId: resourceId ? String(Number(resourceId)) : "",
      from: start?.toISOString(),
      to: end?.toISOString(),
    });
  }

  function decide(id, action, body) {
    run(`/bookings/${id}/${action}`, { method: "PATCH", body },
      `Booking #${id} ${action === "approve" ? "approved" : "rejected"}.`, () => setRejecting(null));
  }

  return (
    <div className="admin-content">
      <h2>Manage bookings</h2>
      <form className="card" onSubmit={filter}>
        <fieldset className="admin-fields" disabled={busy}>
          <label>Status<select name="status">
            <option value="">All statuses</option>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select></label>
          <label>Resource ID<input name="resourceId" type="number" min="1" max="2147483647" /></label>
          <label>From (local time)<input name="from" type="datetime-local" /></label>
          <label>To (local time)<input name="to" type="datetime-local" /></label>
          <button className="secondary">Filter bookings</button>
        </fieldset>
        {filterError && <Feedback feedback={{ type: "error", text: filterError }} />}
      </form>
      <Feedback feedback={feedback} />
      <QueryStatus query={list} label="bookings" />
      {list.data?.data.map((booking) => (
        <article className="card admin-row" key={booking.id}>
          <h3>Booking #{booking.id} · {booking.status}</h3>
          <p>Resource #{booking.resourceId} · Requested by user #{booking.userId}</p>
          <p>{dateTime.format(new Date(booking.startTime))} to {dateTime.format(new Date(booking.endTime))}</p>
          <p>{booking.purpose}</p>
          {booking.ticketId != null && <p>Ticket #{booking.ticketId}</p>}
          {booking.decisionNote && <p>Decision note: {booking.decisionNote}</p>}
          {booking.status === "PENDING" && Date.parse(booking.startTime) > Date.now() && (
            rejecting === booking.id ? (
              <form onSubmit={(event) => {
                event.preventDefault();
                const note = new FormData(event.currentTarget).get("note").trim();
                decide(booking.id, "reject", { note });
              }}>
                <fieldset className="admin-fields" disabled={busy || list.loading}>
                  <label className="admin-wide">Rejection note<textarea name="note" required minLength={5} maxLength={200} /></label>
                  <div className="admin-actions admin-wide">
                    <button>Confirm rejection</button>
                    <button type="button" className="secondary" onClick={() => setRejecting(null)}>Back</button>
                  </div>
                </fieldset>
              </form>
            ) : (
              <div className="admin-actions">
                <button disabled={busy || list.loading} onClick={() => decide(booking.id, "approve")}>Approve</button>
                <button className="secondary" disabled={busy || list.loading} onClick={() => setRejecting(booking.id)}>Reject</button>
              </div>
            )
          )}
        </article>
      ))}
      <Pagination list={list} busy={busy} />
    </div>
  );
}

function Counts({ values }) {
  return (
    <dl className="ticket-metrics">
      {Object.entries(values).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

export function AdminAnalytics() {
  const query = useApiData("/admin/stats");
  const stats = query.data;
  return (
    <div className="admin-content">
      <h2>Analytics</h2>
      <QueryStatus query={query} label="analytics" />
      {stats && <>
        <section className="card">
          <h3>Bookings and resources</h3>
          <Counts values={{ "Active resources": stats.activeResources, ...stats.bookingsByStatus }} />
          <h3>Top resources by bookings</h3>
          {stats.topResources.length ? (
            <ol>{stats.topResources.map(({ resourceId, name, bookingCount }) => (
              <li key={resourceId}>{name} ({bookingCount})</li>
            ))}</ol>
          ) : <p>No resources have bookings yet.</p>}
        </section>
        <section className="card">
          <h3>Ticket review</h3>
          <Counts values={{
            "Reviewed tickets": stats.ticketStats.reviewedCount,
            "Model agreement rate": `${stats.ticketStats.modelAgreementRate}%`,
          }} />
          <h3>By category</h3>
          <Counts values={stats.ticketStats.byCategory} />
          <h3>By priority</h3>
          <Counts values={stats.ticketStats.byPriority} />
          <h3>By status</h3>
          <Counts values={stats.ticketStats.byStatus} />
        </section>
      </>}
    </div>
  );
}
