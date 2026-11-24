import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { useApiData } from "./useApiData.js";
import "./my-bookings.css";

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function MyBookings() {
  const { request } = useAuth();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [confirmId, setConfirmId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const query = useApiData(`/bookings/mine?${params}`, revision);
  const refresh = () => setRevision((n) => n + 1);
  const lastPage = query.data && !query.loading && !query.error
    ? Math.max(1, query.data.totalPages)
    : null;

  useEffect(() => {
    if (lastPage !== null && page > lastPage) setPage(lastPage);
  }, [lastPage, page]);

  function jump(nextPage) {
    setConfirmId(null);
    setPage(nextPage);
  }

  async function cancelBooking(bookingId) {
    if (cancelling || query.loading) return;
    setCancelling(true);
    setFeedback(null);
    try {
      const booking = await request(`/bookings/${bookingId}/cancel`, { method: "PATCH" });
      setFeedback({ type: "notice", text: `Booking #${booking.id} cancelled.` });
      setConfirmId(null);
      refresh();
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
      if (error.status === 404 || error.status === 409) {
        setConfirmId(null);
        refresh();
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="my-bookings" aria-labelledby="my-bookings-title">
      <h1 id="my-bookings-title">My Bookings</h1>
      <label className="my-bookings-filter">Status
        <select value={status} disabled={cancelling} onChange={(event) => {
          setStatus(event.target.value);
          jump(1);
        }}>
          <option value="">All statuses</option>
          {STATUSES.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      {feedback && <p className={feedback.type} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      {query.loading && <p role="status">Loading bookings…</p>}
      {query.error && <div className="my-booking-actions">
        <p className="error" role="alert">{query.error}</p>
        <button type="button" className="secondary" onClick={refresh}>Retry</button>
      </div>}
      {query.data && <>
        {query.data.data.length === 0 && <p className="card">No bookings match this status.</p>}
        <ul className="my-booking-list">
          {query.data.data.map((booking) => {
            const canCancel = ["PENDING", "APPROVED"].includes(booking.status) && Date.parse(booking.startTime) > Date.now();
            return <li key={booking.id} className="card">
              <div className="my-booking-heading">
                <h2>Booking #{booking.id}</h2>
                <span className="my-booking-status">{booking.status}</span>
              </div>
              <p><Link to={`/resources/${booking.resourceId}`}>Resource #{booking.resourceId}</Link>
                {booking.ticketId != null && ` · Ticket #${booking.ticketId}`}</p>
              <p>{formatter.formatRange(new Date(booking.startTime), new Date(booking.endTime))}</p>
              <p>{booking.purpose}</p>
              {booking.decisionNote && <p>Decision note: {booking.decisionNote}</p>}
              {canCancel && (confirmId === booking.id ? (
                <div className="my-booking-actions" role="group" aria-label={`Cancel booking #${booking.id}?`}>
                  <span>Cancel this booking?</span>
                  <button type="button" disabled={cancelling || query.loading || Boolean(query.error)} onClick={() => cancelBooking(booking.id)}>
                    {cancelling ? "Cancelling…" : "Confirm cancellation"}
                  </button>
                  <button type="button" className="secondary" disabled={cancelling} onClick={() => setConfirmId(null)}>Keep booking</button>
                </div>
              ) : <button type="button" className="secondary" disabled={cancelling || query.loading || Boolean(query.error)}
                onClick={() => { setFeedback(null); setConfirmId(booking.id); }}>Cancel booking</button>)}
            </li>;
          })}
        </ul>
        {(page > 1 || query.data.totalPages > 1) && <div className="ticket-pager" aria-label="Booking pages">
          <button className="secondary" disabled={cancelling || query.loading || page <= 1} onClick={() => jump(page - 1)}>Previous</button>
          <span>Page {page} of {Math.max(1, query.data.totalPages)}</span>
          <button className="secondary" disabled={cancelling || query.loading || page >= query.data.totalPages} onClick={() => jump(page + 1)}>Next</button>
        </div>}
      </>}
    </section>
  );
}
