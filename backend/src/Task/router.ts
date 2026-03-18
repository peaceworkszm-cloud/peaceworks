import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { StatusCodes } from "http-status-codes";
import acceptRouter from "./acceptRoute";

const taskRouter = Router();

taskRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.status(StatusCodes.OK).json(tasks);
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to load tasks",
      error: error?.message || error,
    });
  }
});

taskRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const task = await prisma.task.create({ data });
    res.status(StatusCodes.CREATED).json(task);
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create task",
      error: error?.message || error,
    });
  }
});

taskRouter.use("/", acceptRouter);

taskRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const task = await prisma.task.update({
      where: { id },
      data: payload,
    });
    res.status(StatusCodes.OK).json(task);
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update task",
      error: error?.message || error,
    });
  }
});

taskRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.task.delete({ where: { id } });
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete task",
      error: error?.message || error,
    });
  }
});

export default taskRouter;
