import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import dotenv from 'dotenv';

dotenv.config();

const MySQLSessionStore = MySQLStore(session);
const sessionStore = new MySQLSessionStore({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const sessionMW = session({
    name: 'admin_session',
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // set to true if using HTTPS
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 2 // 2 hours
    }
});

export default sessionMW;