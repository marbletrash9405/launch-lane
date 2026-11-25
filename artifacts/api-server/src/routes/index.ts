import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import bookingsRouter from "./bookings";
import guardianRouter from "./guardian";
import storageRouter from "./storage";
// @ts-ignore - this route preserves the original JavaScript form validation and mail helpers.
import submitRouter from "./submit.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(bookingsRouter);
router.use(guardianRouter);
router.use(storageRouter);
router.use(submitRouter);

export default router;
