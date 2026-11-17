const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const validators = require('../validators/dailyEntry.validators');
const service = require('../services/dailyEntryService');
const mood = require('../services/moodService');
const moodAttempts = new Map();
function limitMood(req, res, next) {
  const now = Date.now();
  const attempts = (moodAttempts.get(req.user.id) || []).filter((time) => now - time < 60000);
  if (attempts.length >= 3) return res.status(429).json({ success: false, message: 'Please wait before trying mood analysis again.' });
  attempts.push(now);
  moodAttempts.set(req.user.id, attempts);
  next();
}

const validateDate = (req, res, next) => {
  const { error, value } = validators.dateParam.validate(req.params);
  if (error) return res.status(400).json({ success: false, message: 'Date must be YYYY-MM-DD.' });
  req.localDate = value.date;
  next();
};

router.use(auth);

/**
 * @swagger
 * /api/daily-entries:
 *   get:
 *     summary: List the current user's journal entries in a date range
 *     tags: [Daily Entries]
 *     responses:
 *       200: { description: Journal entries ordered by local date descending }
 *       400: { description: Invalid date range }
 */
router.get('/', validateQuery(validators.listQuery), async (req, res, next) => {
  try { res.json({ success: true, data: await service.list(req.user.id, req.validatedQuery.from, req.validatedQuery.to) }); }
  catch (error) { next(error); }
});

/**
 * @swagger
 * /api/daily-entries/{date}:
 *   get:
 *     summary: Get a journal entry by local date
 *     tags: [Daily Entries]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Journal entry returned }
 *       404: { description: No entry for this user and date }
 *   put:
 *     summary: Save a journal entry and reflection
 *     tags: [Daily Entries]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Journal entry updated }
 *       201: { description: Journal entry created }
 *       400: { description: Invalid or empty entry }
 *   delete:
 *     summary: Delete a journal entry
 *     tags: [Daily Entries]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       204: { description: Journal entry deleted }
 *       404: { description: No entry for this user and date }
 */
router.get('/:date', validateDate, async (req, res, next) => {
  try { res.json({ success: true, data: await service.get(req.user.id, req.localDate) }); }
  catch (error) { next(error); }
});

router.put('/:date', validateDate, validate(validators.saveEntry), async (req, res, next) => {
  try {
    const result = await service.save(req.user.id, req.localDate, req.body);
    res.status(result.created ? 201 : 200).json({ success: true, data: result.data });
  } catch (error) { next(error); }
});

router.delete('/:date', validateDate, async (req, res, next) => {
  try { await service.remove(req.user.id, req.localDate); res.status(204).send(); }
  catch (error) { next(error); }
});

router.get('/:date/mood', validateDate, async (req, res, next) => {
  try { res.json({ success: true, data: await mood.get(req.user.id, req.localDate) }); }
  catch (error) { next(error); }
});

router.delete('/:date/mood', validateDate, async (req, res, next) => {
  try { await mood.remove(req.user.id, req.localDate); res.status(204).send(); }
  catch (error) { next(error); }
});

router.post('/:date/mood', validateDate, validate(validators.moodRequest), limitMood, async (req, res, next) => {
  const controller = new AbortController();
  const onClose = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', onClose);
  try { res.status(201).json({ success: true, data: await mood.analyze(req.user.id, req.localDate, req.body, controller.signal) }); }
  catch (error) { if (!res.destroyed) next(error); }
  finally { res.off('close', onClose); }
});

module.exports = router;
