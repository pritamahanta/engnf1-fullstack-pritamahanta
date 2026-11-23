import net from "net";
import pg from "pg";

net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export default pool;