// src/services/aiService.ts
import { IssueType } from "../types";

export type SuggestionLang = "en" | "bn";

const SUGGESTIONS: Record<IssueType, Record<SuggestionLang, string>> = {
  THREAD_BREAKING: {
    en: [
      "Possible causes:",
      "- Check needle damage or wrong needle size.",
      "- Make sure thread path is correct and not catching.",
      "- Reduce upper tension slightly and test again.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- সুঁই ক্ষতিগ্রস্ত হতে পারে বা ভুল সাইজের সুঁই ব্যবহার হচ্ছে।",
      "- থ্রেড পথ ঠিক আছে কিনা এবং কোথাও জড়িয়ে যাচ্ছে কিনা পরীক্ষা করুন।",
      "- উপরের টেনশন কিছুটা কমিয়ে আবার পরীক্ষা করুন।",
    ].join("\n"),
  },
  STITCH_SKIPPING: {
    en: [
      "Possible causes:",
      "- Needle too small for fabric or bent.",
      "- Check hook timing and needle bar height.",
      "- Ensure presser foot pressure is appropriate.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- কাপড়ের জন্য সুঁই ছোট বা বাঁকা হতে পারে।",
      "- হুক টাইমিং এবং নিডল বার উচ্চতা পরীক্ষা করুন।",
      "- প্রেসার ফুট প্রেশার যথাযথ আছে কিনা নিশ্চিত করুন।",
    ].join("\n"),
  },
  FABRIC_NOT_FEEDING: {
    en: [
      "Possible causes:",
      "- Feed dog height too low or dirty.",
      "- Increase presser foot pressure slightly.",
      "- Clean lint around feed dog and needle plate.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- ফিড ডগের উচ্চতা কম বা ময়লা জমে থাকতে পারে।",
      "- প্রেসার ফুট প্রেশার কিছুটা বাড়ান।",
      "- নিডল প্লেটের চারপাশে ফিড ডগ ও সুঁইয়ের প্লেট পরিষ্কার করুন।",
    ].join("\n"),
  },
};

// later you can replace this with a real OpenAI call
export async function generateAiSuggestion(
  issueType: IssueType,
  description: string,
  lang: SuggestionLang = "en"
): Promise<string> {
  const byIssue = SUGGESTIONS[issueType];
  if (byIssue) return byIssue[lang];

  return lang === "bn"
    ? `সাধারণ পরামর্শ: উপর ও নিচের থ্রেড নতুন করে লাগান, সুঁই পরীক্ষা করুন, মেশিন পরিষ্কার করুন। বিবরণ: ${description}`
    : `Generic advice: re-thread top and bottom, check needle, clean machine. Description: ${description}`;
}
