import { useEffect, useState } from "react";
import { useAuth } from "./auth.jsx";
import { useApiData } from "./useApiData.js";

const OPTIONS = {
  status: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
  category: ["BILLING", "BUG", "FEATURE_REQUEST", "LOGIN", "DELIVERY"],
  priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
};
const LABELS = { status: "Status", category: "Category", priority: "Priority", assigneeId: "Assignee" };
const FILTER_FIELDS = Object.keys(OPTIONS);
const EDIT_FIELDS = [...FILTER_FIELDS, "assigneeId"];
const label = (value) => value == null ? "—" : String(value).replaceAll("_", " ");
const timestamp = (value) => new Date(value).toLocaleString();

function QueryStatus({ query, name, retry, disabled }) {
  if (query.error) {
    return <div className="ticket-feedback">
      <p className="error" role="alert">{query.error}</p>
      <button type="button" className="secondary" onClick={retry} disabled={disabled}>Retry</button>
    </div>;
  }
  return query.loading && !query.data ? <p role="status">Loading {name}…</p> : null;
}

function TicketStats({ query, retry, busy }) {
  const stats = query.data;
  return (
    <section aria-label="Ticket statistics">
      <QueryStatus query={query} name="statistics" retry={retry} disabled={busy} />
      {stats && <dl className="ticket-metrics">
        <div><dt>Total tickets</dt><dd>{Object.values(stats.byStatus).reduce((sum, count) => sum + count, 0)}</dd></div>
        <div><dt>Open</dt><dd>{stats.byStatus.OPEN}</dd></div>
        <div><dt>Urgent</dt><dd>{stats.byPriority.URGENT}</dd></div>
        <div><dt>Reviewed</dt><dd>{stats.reviewedCount}</dd></div>
        <div><dt>Model Agreement Rate</dt><dd>{stats.modelAgreementRate}%</dd></div>
      </dl>}
    </section>
  );
}

function TicketFeed({ busy, importing, onImport, feedback }) {
  return (
    <details className="card ticket-feed">
      <summary>Ticket feed</summary>
      <form onSubmit={onImport}>
        <label>Ticket feed (JSON)
          <textarea name="feed" rows={5} required spellCheck={false} placeholder='[{"externalId":"SUP-101","subject":"Issue with login","body":"Unable to sign in."}]' />
        </label>
        <button disabled={busy}>{importing ? "Importing…" : "Re-Import Feed"}</button>
        {feedback && <p className={feedback.type} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      </form>
    </details>
  );
}

function EnumOptions({ name }) {
  return OPTIONS[name].map((value) => <option key={value} value={value}>{label(value)}</option>);
}

function TicketFilters({ filters, onChange, busy }) {
  return (
    <fieldset className="ticket-filters" aria-label="Ticket filters" disabled={busy}>
      <label className="ticket-search">
        Search tickets
        <input type="search" value={filters.q} onChange={(event) => onChange("q", event.target.value)} />
      </label>
      {FILTER_FIELDS.map((name) => (
        <label key={name}>{LABELS[name]}
          <select value={filters[name]} onChange={(event) => onChange(name, event.target.value)}>
            <option value="">All</option>
            <EnumOptions name={name} />
          </select>
        </label>
      ))}
    </fieldset>
  );
}

function TicketTags({ ticket }) {
  return <span className="ticket-tags">
    <span>{label(ticket.category)}</span>
    <span>{label(ticket.status)}</span>
    <span>{label(ticket.priority)}</span>
  </span>;
}

function TicketReview({ detail, ticket, userId, busy, saving, feedback, formVersion, onSave }) {
  const current = detail.ticket;

  function submit(event) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    const assignee = input.assigneeId.trim();
    input.assigneeId = assignee === "" ? null : Number(assignee);
    const changes = Object.fromEntries(EDIT_FIELDS.filter((key) => input[key] !== current[key])
      .map((key) => [key, input[key]]));
    onSave(current.id, changes);
  }

  return (
    <>
      <p className="ticket-meta">#{ticket.id} · {ticket.externalId}</p>
      <h3 className="ticket-subject">{ticket.subject}</h3>
      <TicketTags ticket={ticket} />
      <p className="ticket-body">{ticket.body}</p>
      <dl className="ticket-facts">
        <div><dt>Original category</dt><dd>{label(ticket.autoCategory)}</dd></div>
        <div><dt>Review</dt><dd>{ticket.isReviewed ? "Reviewed" : "Unreviewed"}</dd></div>
        <div><dt>Updated</dt><dd>{timestamp(ticket.updatedAt)}</dd></div>
      </dl>
      {ticket.isHumanOverride && <p className="notice">Manual category override</p>}
      <form key={formVersion} onSubmit={submit} className="ticket-edit">
        <fieldset disabled={busy} className="ticket-edit-fields">
          {FILTER_FIELDS.map((name) => (
            <label key={name}>{LABELS[name]}
              <select name={name} defaultValue={current[name]}><EnumOptions name={name} /></select>
            </label>
          ))}
          <label>Assignee user ID
            <input name="assigneeId" type="number" step="1" min="1" max="2147483647"
              defaultValue={current.assigneeId ?? ""} aria-describedby="assignee-hint" />
            <small id="assignee-hint">Your ID is {userId}. Leave blank to unassign.</small>
          </label>
        </fieldset>
        <button disabled={busy}>{saving ? "Saving…" : "Save changes"}</button>
        {feedback && <p className={feedback.type} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      </form>
      <h3>Audit history</h3>
      {detail.events.length === 0 ? <p>No audit events yet.</p> : <ol className="ticket-events">
        {detail.events.map((event) => <li key={event.id}>
          <strong>{LABELS[event.field] ?? event.field}</strong>
          <span>{label(event.oldValue)} → {label(event.newValue)}</span>
          <small>{event.actor} · {timestamp(event.createdAt)}</small>
        </li>)}
      </ol>}
    </>
  );
}

export default function TicketQueue() {
  const { user, request } = useAuth();
  const [filters, setFilters] = useState({ q: "", status: "", category: "", priority: "" });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(null);
  const [formVersion, setFormVersion] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState(null);
  const [importing, setImporting] = useState(false);
  const [feedFeedback, setFeedFeedback] = useState(null);

  const params = new URLSearchParams({ page: String(page) });
  for (const [name, value] of Object.entries(filters)) {
    if (value.trim()) params.set(name, value.trim());
  }

  const stats = useApiData("/stats", revision);
  const queue = useApiData(`/tickets?${params}`, revision, 200);
  const detail = useApiData(selectedId === null ? null : `/tickets/${selectedId}`, revision);
  const busy = Boolean(pending) || importing;
  const refresh = () => setRevision((value) => value + 1);

  const lastPage = queue.data && !queue.loading ? Math.max(1, queue.data.totalPages) : null;
  useEffect(() => {
    if (lastPage !== null && page > lastPage) setPage(lastPage);
  }, [lastPage, page]);

  function changeFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setPage(1);
  }

  function selectTicket(id) {
    setSelectedId(id);
    setReviewFeedback(null);
    if (window.matchMedia?.("(max-width: 56rem)").matches) {
      document.getElementById("ticket-detail")?.scrollIntoView({ block: "start" });
    }
  }

  function preview(ticket) {
    if (pending?.id !== ticket.id) return ticket;
    const { changes } = pending;
    const categoryChanged = changes.category !== undefined && changes.category !== ticket.category;
    const leftOpen = ticket.status === "OPEN" && changes.status !== undefined && changes.status !== "OPEN";
    return {
      ...ticket, ...changes,
      isHumanOverride: ticket.isHumanOverride || categoryChanged,
      isReviewed: ticket.isReviewed || categoryChanged || leftOpen,
    };
  }

  async function saveTicket(id, changes) {
    if (busy) return;
    if (Object.keys(changes).length === 0) {
      setReviewFeedback({ type: "notice", text: "No changes to save." });
      return;
    }

    setReviewFeedback(null);
    setPending({ id, changes });
    try {
      const result = await request(`/tickets/${id}`, { method: "PATCH", body: changes });
      detail.replaceData(() => result);
      queue.replaceData((data) => ({
        ...data, data: data.data.map((row) => row.id === id ? result.ticket : row),
      }));
      setReviewFeedback({ type: "notice", text: "Ticket saved." });
      refresh();
    } catch (error) {
      setReviewFeedback({ type: "error", text: `Changes rolled back. ${error.message}` });
    } finally {
      setPending(null);
      setFormVersion((value) => value + 1);
    }
  }

  async function importFeed(event) {
    event.preventDefault();
    if (busy) return;
    const payload = new FormData(event.currentTarget).get("feed");
    setFeedFeedback(null);
    setImporting(true);
    try {
      const feed = JSON.parse(payload);
      const tickets = Array.isArray(feed) ? feed : feed?.tickets;
      if (!Array.isArray(tickets)) throw new Error("Paste a JSON array or an object with a tickets array.");
      const result = await request("/tickets/import", { method: "POST", body: { tickets } });
      setFeedFeedback({
        type: "notice",
        text: `${result.importedCount} new · ${result.updatedCount} updated · ${result.skippedOverrideCount} overrides preserved`,
      });
      refresh();
    } catch (error) {
      setFeedFeedback({ type: "error", text: error instanceof SyntaxError ? "Enter valid JSON." : error.message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="ticket-page">
      <h1>Tickets</h1>
      <TicketStats query={stats} retry={refresh} busy={busy} />
      <TicketFeed busy={busy} importing={importing} onImport={importFeed} feedback={feedFeedback} />
      <div className="ticket-layout">
        <section className="card" aria-labelledby="ticket-queue-title">
          <h2 id="ticket-queue-title">Ticket queue</h2>
          <TicketFilters filters={filters} onChange={changeFilter} busy={busy} />
          <QueryStatus query={queue} name="tickets" retry={refresh} disabled={busy} />
          {queue.data && (
            <>
              {queue.data.data.length ? <ul className="ticket-list">
                {queue.data.data.map((row) => {
                  const ticket = preview(row);
                  return <li key={ticket.id}>
                    <button type="button" className="ticket-row" aria-pressed={selectedId === ticket.id}
                      aria-controls="ticket-detail" disabled={busy} onClick={() => selectTicket(ticket.id)}>
                      <span className="ticket-meta">#{ticket.id} · {ticket.externalId}</span>
                      <strong>{ticket.subject}</strong>
                      <TicketTags ticket={ticket} />
                    </button>
                  </li>;
                })}
              </ul> : <p>No tickets match these filters.</p>}
              {queue.data.totalPages > 1 && <div className="ticket-pager" aria-label="Ticket pages">
                <button className="secondary" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {page} of {queue.data.totalPages}</span>
                <button className="secondary" disabled={busy || page >= queue.data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>}
            </>
          )}
        </section>
        <section className="card" id="ticket-detail" aria-labelledby="ticket-detail-title">
          <h2 id="ticket-detail-title">Review ticket</h2>
          {selectedId === null && <p>Select a ticket to see its details and audit history.</p>}
          <QueryStatus query={detail} name="ticket details" retry={refresh} disabled={busy} />
          {detail.data && <TicketReview detail={detail.data} ticket={preview(detail.data.ticket)}
            userId={user.id} busy={busy || detail.loading || queue.loading} saving={Boolean(pending)}
            feedback={reviewFeedback} formVersion={`${selectedId}:${detail.data.ticket.updatedAt}:${formVersion}`} onSave={saveTicket} />}
        </section>
      </div>
    </div>
  );
}
