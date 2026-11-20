import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const staff = [
  { id:"researcher", name:"الباحث", role:"باحث الترندات", task:"اكتشاف الأفكار والاتجاهات اليومية" },
  { id:"writer", name:"كاتب السيناريو", role:"كاتب محتوى", task:"تحويل الفكرة إلى سيناريو جذاب" },
  { id:"designer", name:"مصمم الشخصيات", role:"مصمم بصري", task:"وصف الشخصيات والمشاهد" },
  { id:"animator", name:"مهندس الأنيميشن", role:"مخطط حركة", task:"إعداد خطة الحركة واللقطات" },
  { id:"editor", name:"المونتير", role:"محرر فيديو", task:"خطة المونتاج والعناوين والصوت" },
  { id:"publisher", name:"مسؤول النشر", role:"مراجع النشر", task:"تجهيز بيانات النشر وطلب موافقة المالك" }
];

const prompts = {
  researcher: "أنت باحث ترندات في شركة إنتاج محتوى عربي. اقترح أفكارًا قابلة للتنفيذ، ولا تدّعِ أنك تحققت من ترند حي إذا لم تتوفر أداة بحث.",
  writer: "أنت كاتب سيناريوهات فيديوهات قصيرة باللهجة المصرية. اكتب افتتاحية جذابة، مشاهد، حوارًا، وخاتمة ودعوة تفاعل.",
  designer: "أنت مصمم شخصيات ومشاهد. قدم وصفًا بصريًا متسقًا للشخصيات والملابس والخلفيات واللقطات.",
  animator: "أنت مهندس تخطيط أنيميشن. قدم storyboard وتوقيت كل لقطة وحركة الشخصية وتعليمات الانتقال.",
  editor: "أنت مونتير فيديوهات قصيرة. قدم خطة مونتاج، توقيت القطع، النصوص على الشاشة، المؤثرات الصوتية، والمقاس المناسب.",
  publisher: "أنت مسؤول تجهيز النشر. جهز عنوانًا ووصفًا وهاشتاجات وموعدًا مقترحًا. ممنوع النشر أو الإرسال؛ اطلب موافقة المالك فقط."
};

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { tasks: [], approvals: [], events: [] }; }
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function getClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  apiConfigured: Boolean(process.env.OPENAI_API_KEY),
  message: process.env.OPENAI_API_KEY ? "الخادم جاهز للاتصال بالذكاء الاصطناعي" : "الخادم يعمل، وينتظر إضافة مفتاح API في إعدادات الخادم"
}));
app.get("/api/staff", (_req, res) => res.json(staff));
app.get("/api/tasks", (_req, res) => res.json(loadData().tasks));
app.get("/api/approvals", (_req, res) => res.json(loadData().approvals));

app.post("/api/agents/:id/run", async (req, res) => {
  const agent = staff.find(s => s.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "موظف غير معروف" });
  const taskText = String(req.body?.task || "").trim();
  if (!taskText) return res.status(400).json({ error: "اكتب المهمة أولاً" });

  const data = loadData();
  const task = {
    id: crypto.randomUUID(), agentId: agent.id, agentName: agent.name,
    task: taskText, status: "working", result: "", createdAt: new Date().toISOString()
  };
  data.tasks.unshift(task);
  saveData(data);

  try {
    const response = await getClient().responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: prompts[agent.id],
      input: taskText
    });
    task.result = response.output_text || "لم يتم استلام نص من النموذج.";
    task.status = "completed";
    task.completedAt = new Date().toISOString();

    if (agent.id === "publisher") {
      const approval = {
        id: crypto.randomUUID(), taskId: task.id, title: "مراجعة محتوى قبل النشر",
        content: task.result, status: "pending_owner_approval",
        createdAt: new Date().toISOString()
      };
      data.approvals.unshift(approval);
      data.events.unshift({ id: crypto.randomUUID(), type:"approval_required", message:"مسؤول النشر جهّز المحتوى وينتظر موافقة المالك." });
    }
    data.tasks[0] = task;
    saveData(data);
    res.json({ task, approvalRequired: agent.id === "publisher" });
  } catch (err) {
    task.status = "error";
    task.result = err.message;
    data.tasks[0] = task;
    saveData(data);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/approvals/:id/decision", (req, res) => {
  const decision = req.body?.decision;
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "القرار يجب أن يكون approved أو rejected" });
  }
  const data = loadData();
  const item = data.approvals.find(a => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: "طلب الموافقة غير موجود" });
  if (item.status !== "pending_owner_approval") return res.status(409).json({ error: "تم اتخاذ قرار سابق" });
  item.status = decision;
  item.decidedAt = new Date().toISOString();
  data.events.unshift({ id: crypto.randomUUID(), type:"owner_decision", message: decision === "approved" ? "وافق المالك على المحتوى." : "رفض المالك المحتوى." });
  saveData(data);
  res.json({ approval: item, note: "هذا القرار يسجل الموافقة داخل النظام فقط؛ لا ينفذ نشرًا أو إرسالًا خارجيًا." });
});

app.listen(PORT, () => console.log(`MFAA AI Company server listening on ${PORT}`));
