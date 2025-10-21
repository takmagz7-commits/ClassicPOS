const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getAll, getById, insert, update, query, queryOne } = require('../db/dbService.cjs');
const { attendanceToDb, dbToAttendance } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { z } = require('zod');

const clockInSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  date: z.string(),
  remarks: z.string().optional(),
});

const clockOutSchema = z.object({
  id: z.string(),
});

const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Validation error', details: error.errors });
  }
};

router.get('/', authMiddleware, (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    let sqlQuery = 'SELECT * FROM attendance';
    const params = [];
    const conditions = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    if (startDate) {
      conditions.push('date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('date <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sqlQuery += ' WHERE ' + conditions.join(' AND ');
    }

    sqlQuery += ' ORDER BY date DESC, clock_in DESC';

    const dbAttendances = query(sqlQuery, params);
    const attendances = dbAttendances.map(dbToAttendance);
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const dbAttendance = getById('attendance', req.params.id);
    if (!dbAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json(dbToAttendance(dbAttendance));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clock-in', authMiddleware, activityLogger('attendance', 'Clock In'), validateRequest(clockInSchema), (req, res) => {
  try {
    const { userId, userName, date, remarks } = req.body;

    const existingRecord = queryOne(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ? AND clock_out IS NULL',
      [userId, date]
    );

    if (existingRecord) {
      return res.status(400).json({
        error: 'Already clocked in',
        message: 'User already has an active clock-in for this date'
      });
    }

    const newAttendance = {
      id: crypto.randomUUID(),
      userId,
      userName,
      clockIn: new Date().toISOString(),
      clockOut: undefined,
      totalHours: 0,
      date,
      remarks,
    };

    const dbAttendance = attendanceToDb(newAttendance);
    insert('attendance', dbAttendance);

    res.status(201).json(newAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clock-out', authMiddleware, activityLogger('attendance', 'Clock Out'), validateRequest(clockOutSchema), (req, res) => {
  try {
    const { id } = req.body;

    const dbAttendance = getById('attendance', id);
    if (!dbAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    if (dbAttendance.clock_out) {
      return res.status(400).json({
        error: 'Already clocked out',
        message: 'This attendance record has already been clocked out'
      });
    }

    const clockOutTime = new Date().toISOString();
    const clockInTime = new Date(dbAttendance.clock_in);
    const clockOutDate = new Date(clockOutTime);
    const totalHours = (clockOutDate - clockInTime) / (1000 * 60 * 60);

    const updatedData = {
      clock_out: clockOutTime,
      total_hours: parseFloat(totalHours.toFixed(2)),
    };

    update('attendance', id, updatedData);

    const updatedAttendance = dbToAttendance({ ...dbAttendance, ...updatedData });
    res.json(updatedAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, activityLogger('attendance'), (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, clockIn, clockOut } = req.body;

    const dbAttendance = getById('attendance', id);
    if (!dbAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const updatedData = {};
    
    if (remarks !== undefined) updatedData.remarks = remarks;
    if (clockIn) updatedData.clock_in = clockIn;
    if (clockOut) updatedData.clock_out = clockOut;

    if (clockIn && clockOut) {
      const clockInTime = new Date(clockIn);
      const clockOutTime = new Date(clockOut);
      const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
      updatedData.total_hours = parseFloat(totalHours.toFixed(2));
    }

    update('attendance', id, updatedData);

    const updatedAttendance = dbToAttendance({ ...dbAttendance, ...updatedData });
    res.json(updatedAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, activityLogger('attendance'), (req, res) => {
  try {
    const { id } = req.params;

    const dbAttendance = getById('attendance', id);
    if (!dbAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const { remove } = require('../db/dbService.cjs');
    remove('attendance', id);

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let sqlQuery = 'SELECT * FROM attendance WHERE user_id = ?';
    const params = [userId];

    if (startDate) {
      sqlQuery += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sqlQuery += ' AND date <= ?';
      params.push(endDate);
    }

    const dbAttendances = query(sqlQuery, params);
    const attendances = dbAttendances.map(dbToAttendance);

    const summary = {
      totalDays: attendances.length,
      totalHours: attendances.reduce((sum, att) => sum + (att.totalHours || 0), 0),
      averageHoursPerDay: 0,
      attendances,
    };

    if (summary.totalDays > 0) {
      summary.averageHoursPerDay = parseFloat((summary.totalHours / summary.totalDays).toFixed(2));
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
