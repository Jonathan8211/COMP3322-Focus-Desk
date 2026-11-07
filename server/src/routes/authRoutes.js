const router = require("express").Router();
const controller = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const rules = require("../validators/auth.validators");
const auth = require("../middleware/authMiddleware");

/** @swagger
 * tags:
 *   name: Auth
 *   description: Account and session endpoints
 */
/** @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account
 *     responses:
 *       201:
 *         description: Account created
 */
router.post("/register", authLimiter, validate(rules.register), controller.register);
/** @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in
 *     responses:
 *       200:
 *         description: Signed in
 */
router.post("/login", authLimiter, validate(rules.login), controller.login);
/** @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh the access token
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post("/refresh", authLimiter, controller.refreshAccessToken);
/** @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out
 *     responses:
 *       200:
 *         description: Signed out
 */
router.post("/logout", controller.logout);
/** @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current account
 *     responses:
 *       200:
 *         description: Account details
 *   patch:
 *     tags: [Auth]
 *     summary: Update current account
 *     responses:
 *       200:
 *         description: Account updated
 */
router.get("/me", auth, controller.getMe);
router.patch("/me", auth, validate(rules.updateMe), controller.updateMe);
module.exports = router;
