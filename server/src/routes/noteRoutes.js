const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const noteValidators = require("../validators/note.validators");
const noteService = require("../services/noteService");

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Synced notes pages
 */

/** @swagger
 * /api/notes:
 *   get:
 *     tags: [Notes]
 *     summary: List current user's notes
 *     responses:
 *       200:
 *         description: Notes returned
 *   post:
 *     tags: [Notes]
 *     summary: Create a note
 *     responses:
 *       201:
 *         description: Note created
 */
router.get("/", async (req, res, next) => {
  try {
    const data = await noteService.listNotes(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post("/", validate(noteValidators.createNote), async (req, res, next) => {
  try {
    const data = await noteService.createNote(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/** @swagger
 * /api/notes/{id}:
 *   patch:
 *     tags: [Notes]
 *     summary: Update a note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Note updated
 *   delete:
 *     tags: [Notes]
 *     summary: Delete a note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Note deleted
 */
router.patch("/:id", validate(noteValidators.updateNote), async (req, res, next) => {
  try {
    const data = await noteService.updateNote(req.params.id, req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await noteService.deleteNote(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
