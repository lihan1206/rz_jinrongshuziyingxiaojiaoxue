import { z } from "zod";

export const loginRule = z.object({
  username: z.string().min(3, "账号至少 3 位"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const registerRule = loginRule.extend({
  full_name: z.string().min(2, "姓名至少 2 位"),
  role: z.enum(["teacher", "student"], { message: "请选择角色" }),
});

export const articleRule = z.object({
  title: z.string().min(2, "请输入标题"),
  category: z.string().min(2, "请输入分类"),
  brief: z.string().min(6, "简介至少 6 个字"),
  body_text: z.string().min(20, "正文至少 20 个字"),
  video_link: z.string().url("视频链接格式不正确").or(z.literal("")).optional(),
});

export const taskRule = z.object({
  title: z.string().min(2, "请输入任务标题"),
  scene: z.string().min(2, "请输入应用场景"),
  intro: z.string().min(6, "任务简介至少 6 个字"),
  demand_text: z.string().min(20, "任务要求至少 20 个字"),
  rubric: z.string().min(10, "评分标准至少 10 个字"),
  due_at: z.string().min(1, "请选择截止时间"),
});

export const submissionRule = z.object({
  summary_text: z.string().min(20, "提交内容至少 20 个字"),
  attach_url: z.string().url("附件地址格式不正确").or(z.literal("")).optional(),
});

export const reviewRule = z.object({
  score: z.number().min(0, "分数不能小于 0").max(100, "分数不能大于 100"),
  teacher_note: z.string().min(6, "评语至少 6 个字"),
});

export const campRule = z.object({
  name: z.string().min(2, "请输入方案名称"),
  channel: z.string().min(2, "请选择渠道"),
  segment: z.string().min(2, "请选择客群"),
  product_name: z.string().min(2, "请输入产品名称"),
  message_body: z.string().min(10, "营销文案至少 10 个字"),
  landing_title: z.string().min(2, "请输入落地页标题"),
  landing_copy: z.string().min(10, "落地页内容至少 10 个字"),
  ab_mode: z.string().min(1, "请选择 A/B 版本"),
});

