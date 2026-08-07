import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireUser, AuthedRequest } from "../middleware/auth";
import { generateChatReply } from "../services/chat.service";

export const chatRouter = Router();

const HISTORY_WINDOW = 20; // even number - keeps user/bot pairs aligned

chatRouter.get("/history", requireUser, async (req: AuthedRequest, res) => {
  const messages = await prisma.chatMessage.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  res.json({ messages });
});

const sendSchema = z.object({ message: z.string().min(1).max(1000) });

chatRouter.post("/message", requireUser, async (req: AuthedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });

  const recent = await prisma.chatMessage.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    take: HISTORY_WINDOW,
  });
  const historyTurns = recent
    .reverse()
    .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));

  const turns = [...historyTurns, { role: "user" as const, content: parsed.data.message }];
  const { text, configured } = await generateChatReply(turns, user?.name);

  const [userMessage, botMessage] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { userId: req.user!.sub, role: "USER", content: parsed.data.message },
    }),
    prisma.chatMessage.create({
      data: { userId: req.user!.sub, role: "BOT", content: text },
    }),
  ]);

  res.status(201).json({ userMessage, botMessage, aiConfigured: configured });
});
