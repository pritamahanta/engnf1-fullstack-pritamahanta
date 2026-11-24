# TriageSync solution

## A. Architecture and ticket import trace

```text
[React browser] <---- HTTPS ----> [Render / Express]
                                   |-- serves compiled React assets
                                   |-- REST routes and auth middleware
                                             |
                                          controllers
                                             |
                                      services and rules
                                             |
                                      SQL repositories
                                             |
                                  [Neon PostgreSQL over TLS]
```

1. [`TicketQueue.importFeed`](frontend/src/TicketQueue.jsx#L219) parses the JSON input and sends `{ tickets }` to `POST /api/tickets/import` using the authenticated API client.
2. [`authenticate`](backend/src/middlewares/auth.js#L5) verifies the bearer token and loads the user. [`importFeed`](backend/src/controllers/ticketController.js#L36) validates the request body with Zod and calls `importTickets`.
3. [`importTickets`](backend/src/services/ticketService.js#L20) deduplicates external IDs within the feed, sorts them for consistent lock order, and processes the batch in a transaction. For new tickets, [`classifyTicket`](backend/src/utils/classifier.js#L22) applies deterministic category and priority rules. The repository inserts the ticket or takes the existing-ticket path described below.
4. After a successful import, `TicketQueue` increments its refresh counter. `useApiData` reloads the current ticket page and `GET /api/stats`.
5. [`getTickets`](backend/src/controllers/ticketController.js#L42) validates filters and pagination. `listTickets` calls `findTickets`, maps database rows with `toTicket`, and returns the page with the total. `getTicketStats` calls `readTicketStats` and maps the grouped counts and agreement rate. React displays the queue and the refreshed stats.

A ticket becomes **reviewed** when an agent changes its category or moves its status out of `OPEN`. Priority and assignee changes are audited but do not set the flag by themselves. The flag stays true once set. The agreement rate is the percentage of reviewed tickets whose current category equals their original `autoCategory`. With zero reviewed tickets, the rate is zero.

## B. Booking concurrency and human override protection

**Booking races.** In [`createBooking`](backend/src/services/bookingService.js#L38), a transaction locks the user row before counting future pending and approved bookings. Requests for the same user therefore cannot both read an outdated count and exceed the three-booking limit. It also holds a shared lock on the resource while validating that it is active and inserting the booking. Status changes take a conflicting resource-row lock, so they coordinate with inserts.

The [`bookings_no_overlap` constraint](backend/migrations/006_bookings.sql#L14) uses a PostgreSQL GiST exclusion constraint for pending and approved bookings. It rejects overlapping time ranges on the same resource even when requests come from different users. Ranges use `[start, end)`, so adjacent bookings are allowed. A conflicting insert produces SQLSTATE `23P01`, rolls back, and returns HTTP `409`. Rejected and cancelled bookings release their slots. The same-slot race check produced one `201` and nine `409` responses for ten concurrent requests.

**Repeat imports and overrides.** The unique `external_id` constraint is the final guard against duplicates. `lockTicketByExternalId` locks an existing row. If two requests race to insert it, `INSERT ... ON CONFLICT DO NOTHING` lets the second request lock and reread the winning row. It can then refresh the subject and body while preserving the category and priority when `isHumanOverride` is true. The original `autoCategory` is preserved on every re-import.

[`updateTicket`](backend/src/services/ticketService.js#L77) also locks the ticket row before editing it. It sets the override flag when the category changes and saves the ticket plus an audit event for every changed field in the same transaction. Using the same row lock for review and import prevents a concurrent import from overwriting a committed override.

## C. Measure first, then optimise

Measured the authenticated `GET /api/tickets?limit=100` endpoint before and after migration `007` and the query change. The Express process and PostgreSQL 17.12 ran locally with Node.js 24.22.3. The same database held 17 seeded tickets and 5,000 synthetic tickets loaded through the import API. Each version used 25 warm-up calls and 150 sequential measured requests. Timing covered the HTTP request through receipt of the complete response body.

| Metric | Before | After |
| --- | ---: | ---: |
| Median HTTP latency | 7.36 ms | 4.04 ms |
| p95 HTTP latency | 10.76 ms | 5.16 ms |
| Mean HTTP latency | 7.79 ms | 4.13 ms |

The original query materialized the filtered rows for reuse and sorted them to get the first page. [Migration 007](backend/migrations/007_ticket_list_order.sql) adds a B-tree index on `(created_at DESC, id DESC)`. Marking the CTE `NOT MATERIALIZED` lets PostgreSQL plan the ordered page and exact count independently in one SQL statement. After the change, `EXPLAIN (ANALYZE, BUFFERS)` showed an index scan returning the first 100 rows. The response was unchanged for pagination, combined filters, literal percent and underscore searches, and empty pages.

**Trade-off.** The index uses storage and adds work to inserts. The exact count still checks all matching rows, and the planner can choose a different plan for highly selective filters.

## D. What I would improve with one more day

Add a repeatable integration test for [`createBooking`](backend/src/services/bookingService.js#L38) against PostgreSQL. It would assert one success and nine conflicts for a contested slot using different owners, then check that adjacent slots succeed and concurrent requests cannot bypass an owner's three-booking limit.
