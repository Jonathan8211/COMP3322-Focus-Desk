const express = require('express');
const auth = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const validators = require('../validators/review.validators');
const service = require('../services/reviewService');

const router = express.Router();
const attempts = new Map();
const period = (req, res, next) => {
  if (!['week', 'month'].includes(req.params.period)) return res.status(400).json({ success: false, message: 'Choose a week or month.' });
  next();
};
function limit(req, res, next) {
  const now = Date.now();
  const recent = (attempts.get(req.user.id) || []).filter((time) => now - time < 60000);
  if (recent.length >= 3) return res.status(429).json({ success: false, message: 'Please wait before generating another review.' });
  recent.push(now);
  attempts.set(req.user.id, recent);
  next();
}

router.use(auth);
router.get('/:period', period, validateQuery(validators.query), async (req, res, next) => {
  try { res.json({ success: true, data: await service.factsFor(req.user.id, req.params.period, req.validatedQuery.anchor) }); }
  catch (error) { next(error); }
});
router.post('/:period/preview', period, validate(validators.preview), async (req, res, next) => {
  try { res.json({ success: true, data: await service.prepareScope(req.user.id, req.params.period, req.body.anchor) }); }
  catch (error) { next(error); }
});
router.post('/:period/generate', period, validate(validators.generate), limit, async (req, res, next) => {
  const controller = new AbortController();
  const onClose = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', onClose);
  try { res.json({ success: true, data: await service.generate(req.user.id, req.params.period, req.body, controller.signal) }); }
  catch (error) {
    if (error.isModelError && !res.destroyed) {
      return res.status(error.statusCode).json({ success: false, message: error.message, data: error.fallback || null });
    }
    if (!res.destroyed) next(error);
  } finally { res.off('close', onClose); }
});

module.exports = router;
