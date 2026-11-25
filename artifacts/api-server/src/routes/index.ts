import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import bookingsRouter from "./bookings";
import jobsRouter from "./jobs";
import jobModerationRouter from "./job-moderation";
import guardianRouter from "./guardian";
import guardianDashboardRouter from "./guardian-dashboard";
import chatRouter from "./chat";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(bookingsRouter);
router.use(jobsRouter);
router.use(jobModerationRouter);
router.use(guardianRouter);
router.use(guardianDashboardRouter);
router.use(chatRouter);
router.use(storageRouter);

export default router;
