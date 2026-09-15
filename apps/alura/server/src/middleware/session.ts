import session from 'express-session';

import db from '../db/db.js';
import MySQLSessionStore from './MySQLSessionStore.js';

import dotenv from 'dotenv';

dotenv.config();

const sessionStore = new MySQLSessionStore(db);

const sessionMW = session({
    name: 'admin_session',
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 2
    }
});

export default sessionMW;