const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const projectValidators = require("../validators/project.validators");
const projectService = require("../services/projectService");

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management endpoints
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects for authenticated user
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 */
router.get("/", async (req, res, next) => {
  try {
    const data = await projectService.getProjectsByUser(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Work
 *               color:
 *                 type: string
 *                 example: "#6366f1"
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 */
router.post("/", validate(projectValidators.createProject), async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const data = await projectService.createProject(req.user.id, name, color);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
