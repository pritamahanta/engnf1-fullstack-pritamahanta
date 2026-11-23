import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { AGENT_EMAIL, users, resources, tickets } from "./seedData.js";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let usersInserted = 0;
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const r = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ((lower(email))) DO NOTHING`,
        [u.name, u.email, hash, u.role]
      );
      usersInserted += r.rowCount;
    }

    let resourcesInserted = 0;
    for (const res of resources) {
      const r = await client.query(
        `INSERT INTO resources (name, type, capacity, description, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ((lower(name))) DO NOTHING`,
        [res.name, res.type, res.capacity, res.description, res.isActive]
      );
      resourcesInserted += r.rowCount;
    }

    const agent = await client.query(
      "SELECT id FROM users WHERE lower(email) = $1",
      [AGENT_EMAIL]
    );
    const agentId = agent.rows[0].id;

    let ticketsInserted = 0;
    let eventsInserted = 0;
    for (const t of tickets) {
      const r = await client.query(
        `INSERT INTO tickets
           (external_id, subject, body, auto_category, category,
            is_human_override, priority, status, assignee_id, is_reviewed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (external_id) DO NOTHING
         RETURNING id`,
        [
          t.externalId,
          t.subject,
          t.body,
          t.autoCategory,
          t.category,
          t.isHumanOverride ?? false,
          t.priority,
          t.status ?? "OPEN",
          t.assigned ? agentId : null,
          t.isReviewed ?? false,
        ]
      );
      if (r.rowCount === 0) continue;
      ticketsInserted++;

      const events = [...(t.events ?? [])];
      if (t.assigned) {
        events.push(["assigneeId", null, String(agentId)]);
      }
      for (const [field, oldValue, newValue] of events) {
        await client.query(
          `INSERT INTO ticket_events (ticket_id, field, old_value, new_value, actor)
           VALUES ($1, $2, $3, $4, $5)`,
          [r.rows[0].id, field, oldValue, newValue, AGENT_EMAIL]
        );
        eventsInserted++;
      }
    }

    await client.query("COMMIT");
    console.log(`users inserted:     ${usersInserted}`);
    console.log(`resources inserted: ${resourcesInserted}`);
    console.log(`tickets inserted:   ${ticketsInserted}`);
    console.log(`events inserted:    ${eventsInserted}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

try {
  await seed();
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}