import session from "express-session";
import type { Pool, RowDataPacket } from "mysql2/promise";

type SessionRow = {
  data: string | null;
};

class MySQLSessionStore extends session.Store {
  private db: Pool;

  constructor(db: Pool) {
    super();

    this.db = db;
  }

  get(
    sessionId: string,
    callback: (err: Error | null, session?: session.SessionData | null) => void,
  ): void {
    this.db
      .query<(SessionRow & RowDataPacket)[]>(
        `SELECT data FROM sessions WHERE session_id = ? AND expires > ?`,
        [sessionId, Math.floor(Date.now() / 1000)],
      )
      .then(([rows]) => {
        const row = rows[0];

        if (!row || !row.data) {
          callback(null, null);
          return;
        }

        callback(null, JSON.parse(row.data));
      })
      .catch((err) => {
        callback(err);
      });
  }

  set(
    sessionId: string,
    sessionData: session.SessionData,
    callback: (err?: Error | null) => void,
  ): void {
    const expires = sessionData.cookie.expires;

    if (!expires) {
      callback(new Error("Session cookie has no expiration date"));
      return;
    }

    this.db
      .query(
        `
        INSERT INTO sessions (session_id, expires, data)
          VALUES (?, ?, ?) AS new
          ON DUPLICATE KEY UPDATE
              expires = new.expires,
              data = new.data
        `,
        [
          sessionId,
          Math.floor(new Date(expires).getTime() / 1000),
          JSON.stringify(sessionData),
        ],
      )
      .then(() => {
        callback(null);
      })
      .catch((err) => {
        callback(err);
      });
  }

  touch(
    sessionId: string,
    sessionData: session.SessionData,
    callback: (err?: Error | null) => void,
  ): void {
    const expires = sessionData.cookie.expires;

    if (!expires) {
      callback(new Error("Session cookie has no expiration date"));
      return;
    }

    this.db
      .query(`UPDATE sessions SET expires = ? WHERE session_id = ?`, [
        Math.floor(new Date(expires).getTime() / 1000),
        sessionId,
      ])
      .then(() => {
        callback(null);
      })
      .catch((err) => {
        callback(err);
      });
  }

  destroy(
    sessionId: string, 
    callback: (err?: Error | null) => void,
  ): void {
    this.db
      .query("DELETE FROM sessions WHERE session_id = ?", [sessionId])
      .then(() => {
        callback(null);
      })
      .catch((err) => {
        callback(err);
      });
  }
}

export default MySQLSessionStore;
