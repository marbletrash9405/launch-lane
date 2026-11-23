import { Router, type IRouter } from "express";
import healthRouter from "./health";
// @ts-ignore - this route preserves the original JavaScript form validation and mail helpers.
import submitRouter from "./submit.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(submitRouter);

export default router;
