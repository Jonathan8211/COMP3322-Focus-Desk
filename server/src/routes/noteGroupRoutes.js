const express = require('express');
const auth = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const validators = require('../validators/noteGroup.validators');
const service = require('../services/noteGroupService');

const router = express.Router();
router.use(auth);

const validateGroupId = (req, res, next) => {
  const value = req.params.id;
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'Group ID must be a positive integer.' });
  }
  req.groupId = id;
  next();
};

router.get('/', async (req, res, next) => {
  try { res.json({ success: true, data: await service.listGroups(req.user.id) }); }
  catch (error) { next(error); }
});

router.post('/', validate(validators.group), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await service.createGroup(req.user.id, req.body.name) }); }
  catch (error) { next(error); }
});

router.patch('/:id', validateGroupId, validate(validators.group), async (req, res, next) => {
  try { res.json({ success: true, data: await service.renameGroup(req.groupId, req.user.id, req.body.name) }); }
  catch (error) { next(error); }
});

router.delete('/:id', validateGroupId, async (req, res, next) => {
  try { await service.deleteGroup(req.groupId, req.user.id); res.status(204).send(); }
  catch (error) { next(error); }
});

module.exports = router;
