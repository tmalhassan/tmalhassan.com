import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db/db.ts';
import type { RowDataPacket } from 'mysql2';
import { API_PATHS } from '../../../shared/constants/apiRouts.ts';
import type { UserSession } from '../../../shared/types/UserTypes.ts';
import validateParams from '../tools/validateQueryParams.ts';
import upload from '../middleware/upload.ts';
import type { ServerApiResponse, ServerResponseCodes, ServerResponseTypes } from '../../../shared/types/ServerResponseTypes.ts';

const router = express.Router();

router.post(API_PATHS.AUTH.LOGIN, async (req, res) => {
    const { username, password }:{ username: string; password: string; } = req.body;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
    const column = isEmail ? 'email' : 'username';
    
    if (column !== 'email' && column !== 'username') {
        res.status(400).send('Invalid login field.');
        return;
    }
    
    const isValid = validateParams(req.body, {
        username: column === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/ : /^[a-zA-Z0-9._-]+$/,
        password: /^[\S]+$/
    });

    if (!isValid) {
        res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'Internal Server Error'));
        return;
    }

    const connection = await db.getConnection();

    try {
        const query = `SELECT * FROM ADMINS WHERE ${column} = ?`;
        const [rows] = await connection.query<RowDataPacket[]>(query, [username]);

        if (!rows.length) {
            res.status(401).send('Invalid credentials');
            return;
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            res.status(401).send('Invalid credentials');
            return;
        }

        const sessionUser: UserSession = {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.display_name,
            adminLevel: user.admin_level,
        };

        req.session.user = sessionUser;
        res.json({ ...sessionUser, pfpCounter: user.pfp_counter, phoneNumber: user.phone_number });
    } catch (err) {
        console.log(err); // Handle the error
        res.status(500).send('Internal Server Error'); // Send an error response
    } finally {
        connection.release();
    }
});

// GET /me (check login status)
router.get(API_PATHS.AUTH.GET_USER, async (req, res) => {
    const isValid = validateParams(req.query, {});

    if (!isValid) {
        res.status(400).json({ message: 'Invalid query parameters/values' });
        return;
    }

    console.log(req.session);
    if (!req.session.user) {
        res.status(401).json({ message: 'Not logged in' });
        return;
    }

    let pfpCounter, phoneNumber;

    const connection = await db.getConnection();

    try {
        const query = `SELECT \`pfp_counter\`, \`phone_number\` FROM ADMINS WHERE id = ?`;
        const [result] = await connection.query<RowDataPacket[]>(query, [req.session.user.id]);

        pfpCounter = result[0].pfp_counter;
        phoneNumber = result[0].phone_number;

    } catch (err) {
        console.log(err); // Handle the error
        res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'Internal Server Error'));
    } finally {
        connection.release();
    }

    console.log({...req.session.user, pfpCounter, phoneNumber});
    res.json({...req.session.user, pfpCounter, phoneNumber});
});

// POST /logout
router.post(API_PATHS.AUTH.LOGOUT, (req, res) => {
    const isValid = validateParams(req.body, {});

    if (!isValid) {
        res.status(400).json({ message: 'Invalid query parameters/values' });
        return;
    }

    req.session.destroy(err => {
        if (err) res.status(500).json({ message: 'Logout failed' });
        res.clearCookie('admin_session');
        res.json({ message: 'Logged out' });
    });
});

router.post(API_PATHS.AUTH.SET_PFP, upload.single('user_pfp'), async (req, res) => {

    if (!req.session.user) {
        res.status(401).json(ResponseObj('ERR_UNAUTHORIZED', 'error', 'Unauthorized request! Please contact an admin with the required permissions'));
        return;
    }

    const userId = req.session.user.id;
    const pfpImageFile = req.file as Express.Multer.File;
    let pfpCounter = 0;

    console.log(pfpImageFile);

    const connection = await db.getConnection();

    try {
        const selectQuery = `SELECT \`pfp_counter\` FROM ADMINS WHERE id = ?`;
        const [result] = await connection.query<RowDataPacket[]>(selectQuery, [userId]);

        if (result[0].pfp_counter != null) {
            pfpCounter = parseInt(result[0].pfp_counter) + 1;
        }

        const query = `UPDATE ADMINS SET \`profile_pic\` = ?, pfp_counter = ? WHERE id = ?`;
        await connection.query(query, [pfpImageFile.buffer, pfpCounter, userId]);

        res.status(200).json({...ResponseObj('OK_UPDATED', 'success', `User image was updated successfully!`), data: { pfpCounter }});
    } catch (err) {
        console.log(err); // Handle the error
        res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'Internal Server Error'));
    } finally {
        connection.release();
    }
});

router.get(API_PATHS.AUTH.GET_PFP, async (req, res) => {
    if (!req.session.user) {
        res.status(401).json(ResponseObj('ERR_UNAUTHORIZED', 'error', 'Unauthorized request! Please contact an admin with the required permissions'));
        return;
    }

    const userId = req.session.user.id;

    const connection = await db.getConnection();

    try {
        const query = `SELECT \`profile_pic\`, \`pfp_counter\` FROM ADMINS WHERE id = ?`;
        const [result] = await connection.query<RowDataPacket[]>(query, [userId]);

        if (!result.length || !result[0].profile_pic) {
            res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'Internal Server Error'));
            return;
        }

        const base64Image = `data:image/webp;base64,${Buffer.from(result[0].profile_pic).toString('base64')}`;
        const pfpCounter = result[0].pfp_counter;
        res.json({ img: base64Image, pfp_counter: pfpCounter });

    } catch (err) {
        console.log(err); // Handle the error
        res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'Internal Server Error'));
    } finally {
        connection.release();
    }
});

function ResponseObj(code: ServerResponseCodes, type: ServerResponseTypes, message: string): ServerApiResponse {
    return { code, type, message }
}

export default router;