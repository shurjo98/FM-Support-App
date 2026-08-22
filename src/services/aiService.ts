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
  NEEDLE_BREAKING: {
    en: [
      "Possible causes:",
      "- Needle size too thin for the fabric, or bent/blunt needle.",
      "- Needle inserted incorrectly or not fully seated in the clamp.",
      "- Timing between needle and hook is off — have a technician check hook timing.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- কাপড়ের তুলনায় সুঁই পাতলা, বাঁকা বা ভোঁতা হয়ে গেছে।",
      "- সুঁই ভুলভাবে বসানো বা ক্ল্যাম্পে পুরোপুরি আটকানো নেই।",
      "- সুঁই ও হুকের টাইমিং ঠিক নেই — টেকনিশিয়ান দিয়ে হুক টাইমিং পরীক্ষা করান।",
    ].join("\n"),
  },
  TENSION_PROBLEM: {
    en: [
      "Possible causes:",
      "- Upper or lower (bobbin case) tension set too tight or too loose.",
      "- Thread not seated properly in the tension discs.",
      "- Bobbin case spring worn or bobbin inserted the wrong way.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- উপরের বা নিচের (ববিন কেস) টেনশন খুব বেশি বা খুব কম।",
      "- থ্রেড টেনশন ডিস্কে ঠিকভাবে বসেনি।",
      "- ববিন কেসের স্প্রিং দুর্বল বা ববিন উল্টো দিকে বসানো।",
    ].join("\n"),
  },
  BOBBIN_PROBLEM: {
    en: [
      "Possible causes:",
      "- Bobbin wound unevenly or with the wrong thread tension.",
      "- Bobbin case dirty or has lint trapped inside.",
      "- Wrong bobbin type for this machine model.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- ববিন অসমভাবে বা ভুল টেনশনে ওয়াইন্ড করা হয়েছে।",
      "- ববিন কেস ময়লা বা ভেতরে সুতার আঁশ জমে আছে।",
      "- এই মেশিন মডেলের জন্য ভুল ববিন ব্যবহার হচ্ছে।",
    ].join("\n"),
  },
  NOISE: {
    en: [
      "Possible causes:",
      "- Belt tension loose or belt worn.",
      "- Motor bearing or hook race needs lubrication.",
      "- A loose screw or panel vibrating — stop and inspect before continuing.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- বেল্ট ঢিলা বা ক্ষয়প্রাপ্ত হয়ে গেছে।",
      "- মোটর বেয়ারিং বা হুক রেসে লুব্রিকেশন দরকার।",
      "- কোনো স্ক্রু ঢিলা হয়ে কম্পন করছে — চালিয়ে যাওয়ার আগে বন্ধ করে পরীক্ষা করুন।",
    ].join("\n"),
  },
  MACHINE_NOT_STARTING: {
    en: [
      "Possible causes:",
      "- Power cable, foot pedal, or control box connection loose.",
      "- Machine in sleep/stop mode — check the control box display.",
      "- Safety switch (e.g. machine head tipped up) not reset.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- পাওয়ার কেবল, ফুট প্যাডেল বা কন্ট্রোল বক্সের সংযোগ ঢিলা।",
      "- মেশিন স্লিপ/স্টপ মোডে আছে — কন্ট্রোল বক্সের ডিসপ্লে দেখুন।",
      "- সেফটি সুইচ (যেমন মেশিন হেড তোলা অবস্থায়) রিসেট করা হয়নি।",
    ].join("\n"),
  },
  ERROR_CODE: {
    en: [
      "Please note down the exact code shown on the control box display (e.g. E06, ERR-08) and include it in the description below.",
      "- Try turning the machine off and on once before reporting.",
      "- Do not clear the alarm repeatedly — this can hide a real fault.",
    ].join("\n"),
    bn: [
      "কন্ট্রোল বক্সের ডিসপ্লেতে দেখানো সঠিক কোডটি (যেমন E06, ERR-08) নিচের বিবরণে লিখুন।",
      "- রিপোর্ট করার আগে একবার মেশিন বন্ধ করে আবার চালু করে দেখুন।",
      "- বারবার অ্যালার্ম ক্লিয়ার করবেন না — এতে আসল সমস্যা লুকিয়ে যেতে পারে।",
    ].join("\n"),
  },
  THREAD_TRIMMER_FAULT: {
    en: [
      "Possible causes:",
      "- Trimmer blade dull, misaligned, or jammed with lint/thread.",
      "- Trimmer solenoid or timing needs adjustment.",
      "- Wrong thread type causing the trim to fail.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- ট্রিমার ব্লেড ভোঁতা, বেঠিক অবস্থানে বা সুতা/আঁশে জ্যাম হয়ে আছে।",
      "- ট্রিমার সলেনয়েড বা টাইমিং সমন্বয় করা দরকার।",
      "- ভুল ধরনের সুতা ব্যবহারের কারণে ট্রিম হচ্ছে না।",
    ].join("\n"),
  },
  OIL_LEAKAGE: {
    en: [
      "Possible causes:",
      "- Oil reservoir overfilled, or oil wick/felt worn out.",
      "- Oil seal or gasket worn and needs replacement.",
      "- Wipe down and monitor — if it continues, request a technician visit.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- অয়েল রিজার্ভার বেশি ভরা, বা অয়েল উইক/ফেল্ট ক্ষয়প্রাপ্ত।",
      "- অয়েল সিল বা গ্যাসকেট ক্ষয়প্রাপ্ত, পরিবর্তন দরকার।",
      "- মুছে পর্যবেক্ষণ করুন — চলতে থাকলে টেকনিশিয়ান কল করুন।",
    ].join("\n"),
  },
  OVERHEATING: {
    en: [
      "Possible causes:",
      "- Continuous high-speed running without rest — let the motor cool down.",
      "- Motor bearing dry or dirty, needs lubrication/cleaning.",
      "- Ventilation around the motor blocked by lint or dust.",
    ].join("\n"),
    bn: [
      "সম্ভাব্য কারণ:",
      "- বিরতি ছাড়া দীর্ঘক্ষণ হাই-স্পিডে চালানো হয়েছে — মোটর ঠান্ডা হতে দিন।",
      "- মোটর বেয়ারিং শুকনো বা ময়লা, লুব্রিকেশন/পরিষ্কার দরকার।",
      "- মোটরের চারপাশে ধুলা/আঁশ জমে বাতাস চলাচল বন্ধ হয়ে গেছে।",
    ].join("\n"),
  },
  OTHER: {
    en: "Thanks for the report — please describe exactly what's happening in as much detail as you can below. Our team will review it and get back to you.",
    bn: "রিপোর্ট করার জন্য ধন্যবাদ — নিচে বিস্তারিতভাবে সমস্যাটি লিখুন। আমাদের টিম এটি পর্যালোচনা করে আপনাকে জানাবে।",
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
