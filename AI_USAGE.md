# AI usage

## Tool and uses

I used OpenAI ChatGPT with Codex during the assessment window for planning, code writing, debugging, testing, deployment guidance, and drafting documentation. It generated code for backend endpoints and React screens, helped verify the API contract, and ran the ticket-list performance comparison in an isolated PostgreSQL database.

## Example I verified

An early ticket import returned HTTP `404`. I checked the Express middleware order and found that the catch-all handler ran before the ticket router. After putting the router first, I verified that a request without a session returned `401` and an authenticated import returned `200`. I then changed a ticket's category and priority and re-imported it to verify that the human override was preserved.
