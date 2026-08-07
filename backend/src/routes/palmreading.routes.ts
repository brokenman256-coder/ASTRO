import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { optionalUser, AuthedRequest } from "../middleware/auth";
import { generatePalmReading } from "../services/prediction.service";

export const palmReadingRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or WEBP images are supported"));
    }
    cb(null, true);
  },
});

palmReadingRouter.post("/", optionalUser, upload.single("image"), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "Palm image is required" });

  const imageBase64 = req.file.buffer.toString("base64");
  const { text, configured } = await generatePalmReading(imageBase64, req.file.mimetype);

  const reading = await prisma.palmReading.create({
    data: {
      userId: req.user?.sub,
      imageData: `data:${req.file.mimetype};base64,${imageBase64}`,
      resultText: text,
    },
  });

  res.status(201).json({
    reading: { id: reading.id, resultText: reading.resultText, createdAt: reading.createdAt },
    aiConfigured: configured,
  });
});

palmReadingRouter.get("/mine", optionalUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Login required" });
  const readings = await prisma.palmReading.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, resultText: true, createdAt: true },
  });
  res.json({ readings });
});
