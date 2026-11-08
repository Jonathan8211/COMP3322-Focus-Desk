const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const noteValidators = require("../validators/note.validators");
const noteService = require("../services/noteService");

router.use(auth);

const validateNoteId = (req, res, next) => {
  const value = req.params.id;
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'Note ID must be a positive integer.' });
  }
  req.noteId = id;
  next();
};

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
 *       204:
 *         description: Note deleted
 */
router.patch("/:id", validateNoteId, validate(noteValidators.updateNote), async (req, res, next) => {
  try {
    const data = await noteService.updateNote(req.noteId, req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", validateNoteId, async (req, res, next) => {
  try {
    await noteService.deleteNote(req.noteId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
