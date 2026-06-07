import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import ticketsRouter from "./tickets";
import projectsRouter from "./projects";
import todosRouter from "./todos";
import notificationsRouter from "./notifications";
import calendarRouter from "./calendar";
import timesheetsRouter from "./timesheets";
import auditRouter from "./audit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(ticketsRouter);
router.use(projectsRouter);
router.use(todosRouter);
router.use(notificationsRouter);
router.use(calendarRouter);
router.use(timesheetsRouter);
router.use(auditRouter);

export default router;
