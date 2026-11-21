
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const staff = [
  { id:"researcher", name:"الباحث", role:"باحث الترندات", task:"اكتشاف الأفكار والاتجاهات اليومية" },
  { id:"writer", name:"كاتب السيناريو", role:"كاتب محتوى", task:"تحويل الفكرة إلى سيناريو جذاب" },
  { id:"designer", name:"مصمم الشخصيات", role:"مصمم بصري", task:"وصف الشخصيات والمشاهد" },
  { id:"animator", name:"مهندس الأنيميشن", role:"مخطط حركة", task:"إعداد خطة الحركة واللقطات" },
  { id:"editor", name:"المونتير", role:"محرر فيديو", task:"خطة المونتاج والعناوين والصوت" },
  { id:"publisher", name:"مسؤول النشر", role:"مراجع النشر", task:"تجهيز بيانات النشر وطلب موافقة المالك" }
];

const prompts = {
  researcher: "أنت باحث ترندات في شركة إنتاج محتوى عربي.",
  writer: "أنت كاتب سيناريوهات فيديوهات قصيرة باللهجة المصرية.",
  designer: "أنت مصمم شخصيات ومشاهد.",
  animator: "أنت مهندس تخطيط أنيميشن.",
  editor: "أنت مونتير فيديوهات قصيرة.",
  publisher: "أنت مسؤول تجهيز النشر. لا تنشر أي محتوى؛ اطلب موافقة المالك."
};

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    apiConfigured: Boolean(process.env.OPENAI_API_KEY),
    message: "MFAA AI COMPANY server is ready"
  });
});

app.get("/api/staff", (req, res) => res.json(staff));

app.get("/api/tasks", (req, res) => res.json([]));

app.get("/api/approvals", (req, res) => res.json([]));

app.post("/api/agents/:id/run", async (req, res) => {
  try {
    const agent = staff.find(s => s.id === req.params.id);
    if (!agent) return res.status(404).json({ error: "موظف غير معروف" });

    const task = String(req.body?.task || "").trim();
    if (!task) return res.status(400).json({ error: "اكتب المهمة أولاً" });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: prompts[agent.id],
      input: task
    });

    res.json({
      task: {
        agentName: agent.name,
        task,
        status: "completed",
        result: response.output_text || "لم يتم استلام نتيجة"
      },
      approvalRequired: agent.id === "publisher"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
