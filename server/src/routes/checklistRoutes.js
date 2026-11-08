const express = require('express');
const router = express.Router({ mergeParams: true });
const validate = require('../middleware/validate');
const validators = require('../validators/checklist.validators');
const service = require('../services/checklistService');

/**
 * @swagger
 * /api/tasks/{taskId}/checklist-items:
 *   get:
 *     summary: List checklist items and completion summary
 *     tags: [Checklist]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Ordered checklist items and done/total summary }
 *       404: { description: Task not found }
 *   post:
 *     summary: Add a checklist item
 *     tags: [Checklist]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201: { description: Checklist item created }
 *       400: { description: Invalid title }
 *       404: { description: Task not found }
 */
router.get('/', async (req, res, next) => {
  try { res.json({ success: true, ...(await service.list(req.user.id, req.params.taskId)) }); }
  catch (error) { next(error); }
});

router.post('/', validate(validators.createItem), async (req, res, next) => {
  try { res.status(201).json({ success: true, ...(await service.create(req.user.id, req.params.taskId, req.body.title)) }); }
  catch (error) { next(error); }
});

/**
 * @swagger
 * /api/tasks/{taskId}/checklist-items/{itemId}:
 *   patch:
 *     summary: Rename or check a checklist item
 *     tags: [Checklist]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Checklist item updated }
 *       400: { description: Invalid input }
 *       404: { description: Task or checklist item not found }
 *   delete:
 *     summary: Delete a checklist item
 *     tags: [Checklist]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Checklist item deleted }
 *       404: { description: Task or checklist item not found }
 */
router.patch('/:itemId', validate(validators.updateItem), async (req, res, next) => {
  try { res.json({ success: true, ...(await service.update(req.user.id, req.params.taskId, req.params.itemId, req.body)) }); }
  catch (error) { next(error); }
});

router.delete('/:itemId', async (req, res, next) => {
  try { await service.remove(req.user.id, req.params.taskId, req.params.itemId); res.status(204).send(); }
  catch (error) { next(error); }
});

module.exports = router;
