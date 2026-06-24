import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn";
export type SuggestionLang = Lang;

const LANG_KEY = "fm_customer_lang";

const dict = {
  "nav.overview": { en: "Overview", bn: "ওভারভিউ" },
  "nav.sewing": { en: "Sewing Machines", bn: "সেলাই মেশিন" },
  "nav.automated": { en: "Automated Machines", bn: "অটোমেটেড মেশিন" },
  "nav.needles": { en: "Needles", bn: "সুঁই" },
  "nav.spareparts": { en: "Spare Parts", bn: "স্পেয়ার পার্টস" },
  "nav.garments": { en: "Garment Guide", bn: "পোশাক গাইড" },
  "nav.tickets": { en: "Ticket History", bn: "টিকেট ইতিহাস" },
  "nav.purchases": { en: "Purchase History", bn: "ক্রয় ইতিহাস" },
  "nav.settings": { en: "Settings", bn: "সেটিংস" },
  "nav.logout": { en: "Log out", bn: "লগ আউট" },
  "topbar.subtitle": { en: "FM Factory Support — Customer Portal", bn: "এফএম ফ্যাক্টরি সাপোর্ট — কাস্টমার পোর্টাল" },

  "overview.machinesOwned": { en: "Machines Owned", bn: "মালিকানাধীন মেশিন" },
  "overview.totalIssues": { en: "Total Issues Raised", bn: "মোট সমস্যা" },
  "overview.openIssues": { en: "Open Issues", bn: "খোলা সমস্যা" },
  "overview.needleOrders": { en: "Needle Orders", bn: "সুঁইয়ের অর্ডার" },
  "overview.purchaseRecords": { en: "Purchase Records", bn: "ক্রয় রেকর্ড" },
  "overview.whatWeSupply": { en: "What we supply", bn: "আমরা যা সরবরাহ করি" },
  "overview.recentIssues": { en: "Recent issues", bn: "সাম্প্রতিক সমস্যা" },
  "overview.garmentGuideCta": {
    en: "👕 Not sure which machine or needle fits your garment? Try the Garment Guide",
    bn: "👕 আপনার পোশাকের জন্য কোন মেশিন বা সুঁই উপযুক্ত জানেন না? পোশাক গাইড দেখুন",
  },
  "overview.noIssues": {
    en: "No issues raised yet. Your factory's IE can report one from the Sewing Machines or Automated Machines page.",
    bn: "এখনো কোনো সমস্যা রিপোর্ট করা হয়নি। আপনার কারখানার IE সুইং মেশিন বা অটোমেটেড মেশিন পেজ থেকে রিপোর্ট করতে পারবেন।",
  },

  "issue.threadBreaking": { en: "Thread Breaking", bn: "থ্রেড ছিঁড়ে যাওয়া" },
  "issue.stitchSkipping": { en: "Stitch Skipping", bn: "স্টিচ স্কিপিং" },
  "issue.fabricNotFeeding": { en: "Fabric Not Feeding", bn: "ফেব্রিক ফিড না হওয়া" },

  "table.issueType": { en: "Issue Type", bn: "ইস্যু টাইপ" },
  "table.description": { en: "Description", bn: "বিবরণ" },
  "table.status": { en: "Status", bn: "অবস্থা" },
  "table.raisedAt": { en: "Raised At", bn: "রিপোর্টের সময়" },
  "table.machine": { en: "Machine", bn: "মেশিন" },
  "table.assignedTo": { en: "Assigned To", bn: "নিযুক্ত" },
  "table.item": { en: "Item", bn: "আইটেম" },
  "table.type": { en: "Type", bn: "ধরন" },
  "table.model": { en: "Model", bn: "মডেল" },
  "table.serialNumber": { en: "Serial Number", bn: "সিরিয়াল নম্বর" },
  "table.qty": { en: "Qty", bn: "পরিমাণ" },
  "table.unitPrice": { en: "Unit Price", bn: "একক মূল্য" },
  "table.total": { en: "Total", bn: "সর্বমোট" },
  "table.date": { en: "Date", bn: "তারিখ" },
  "table.system": { en: "System", bn: "সিস্টেম" },
  "table.usedOn": { en: "Used On", bn: "ব্যবহৃত হয়েছে" },

  "machines.intro.sewing": {
    en: "Lockstitch and overlock machines for everyday garment sewing. Select your machine, describe the problem, and get instant AI guidance.",
    bn: "নিয়মিত পোশাক সেলাইয়ের জন্য লকস্টিচ ও ওভারলক মেশিন। আপনার মেশিন নির্বাচন করুন, সমস্যাটি লিখুন, এবং তাৎক্ষণিক AI পরামর্শ পান।",
  },
  "machines.intro.automated": {
    en: "Computerized template and interlock machines for automated pattern sewing. Select your machine, describe the problem, and get instant AI guidance.",
    bn: "অটোমেটেড প্যাটার্ন সেলাইয়ের জন্য কম্পিউটারাইজড টেমপ্লেট ও ইন্টারলক মেশিন। আপনার মেশিন নির্বাচন করুন, সমস্যাটি লিখুন, এবং তাৎক্ষণিক AI পরামর্শ পান।",
  },
  "machines.whatsProblem": { en: "What's the problem?", bn: "সমস্যাটি কী?" },
  "machines.describe": { en: "Describe it in your own words", bn: "আপনার ভাষায় সমস্যাটি লিখুন" },
  "machines.descriptionPlaceholder": {
    en: "e.g. The machine keeps skipping stitches whenever I sew denim fabric",
    bn: "যেমন: ডেনিম কাপড় সেলাই করার সময় মেশিনটি বারবার স্টিচ স্কিপ করছে",
  },
  "machines.askAi": { en: "Ask AI for help", bn: "AI থেকে সাহায্য নিন" },
  "machines.asking": { en: "Asking AI...", bn: "AI কে জিজ্ঞাসা করা হচ্ছে..." },
  "machines.aiSuggestion": { en: "AI Suggestion", bn: "AI পরামর্শ" },
  "ai.ticketLabel": { en: "Ticket", bn: "টিকেট" },
  "ai.fromCache": { en: "Answered from cache (free)", bn: "ক্যাশ থেকে উত্তর দেওয়া হয়েছে (ফ্রি)" },
  "ai.usedCredit": { en: "Answered using 1 AI credit", bn: "১টি AI ক্রেডিট ব্যবহার করে উত্তর দেওয়া হয়েছে" },
  "ai.creditsRemaining": { en: "credits remaining", bn: "ক্রেডিট অবশিষ্ট" },
  "machines.viewDetails": { en: "Details", bn: "বিস্তারিত" },
  "machines.selectThisMachine": { en: "Select this machine", bn: "এই মেশিনটি নির্বাচন করুন" },
  "machines.selected": { en: "Selected ✓", bn: "নির্বাচিত ✓" },
  "machines.selectSerial": { en: "Which machine? (serial number)", bn: "কোন মেশিন? (সিরিয়াল নম্বর)" },
  "machines.noMachinesForFactory": {
    en: "Your factory has no machines of this type registered yet. Contact us to purchase one.",
    bn: "আপনার কারখানায় এই ধরনের কোনো মেশিন এখনো নিবন্ধিত নেই। কেনার জন্য আমাদের সাথে যোগাযোগ করুন।",
  },
  "machines.noInstances": {
    en: "Your factory has no registered units of this model yet. Contact us to purchase one, or pick a different machine.",
    bn: "আপনার কারখানায় এই মডেলের কোনো নিবন্ধিত ইউনিট নেই। কেনার জন্য যোগাযোগ করুন, বা অন্য মেশিন নির্বাচন করুন।",
  },
  "machines.loadingSerials": { en: "Loading serial numbers...", bn: "সিরিয়াল নম্বর লোড হচ্ছে..." },
  "machines.attachPhoto": { en: "Attach a photo or video (optional)", bn: "একটি ছবি বা ভিডিও যুক্ত করুন (ঐচ্ছিক)" },
  "machines.uploading": { en: "Uploading attachment...", bn: "অ্যাটাচমেন্ট আপলোড হচ্ছে..." },
  "machines.uploadFailed": { en: "Ticket created, but the attachment failed to upload.", bn: "টিকেট তৈরি হয়েছে, কিন্তু অ্যাটাচমেন্ট আপলোড ব্যর্থ হয়েছে।" },

  "needles.intro": {
    en: "We supply Groz-Beckert needles to garment factories across Bangladesh — the most trusted needle brand for industrial sewing.",
    bn: "আমরা বাংলাদেশের গার্মেন্টস ফ্যাক্টরিগুলোতে Groz-Beckert সুঁই সরবরাহ করি — শিল্প সেলাইয়ের জন্য সবচেয়ে বিশ্বাসযোগ্য সুঁই ব্র্যান্ড।",
  },
  "needles.catalog": { en: "Groz-Beckert needle catalog", bn: "Groz-Beckert সুঁই ক্যাটালগ" },
  "needles.orderHistory": { en: "Your needle order history", bn: "আপনার সুঁই অর্ডার ইতিহাস" },
  "needles.searchLabel": { en: "Search by needle system or machine serial number", bn: "সুঁই সিস্টেম বা মেশিন সিরিয়াল নম্বর দিয়ে খুঁজুন" },
  "needles.noOrders": { en: "No needle orders found.", bn: "কোনো সুঁই অর্ডার পাওয়া যায়নি।" },

  "spareparts.intro": {
    en: "Common wear-and-tear spare parts for your machines — bobbin cases, presser feet, belts, and more.",
    bn: "আপনার মেশিনের জন্য সাধারণ স্পেয়ার পার্টস — ববিন কেস, প্রেসার ফুট, বেল্ট এবং আরও অনেক কিছু।",
  },
  "spareparts.catalog": { en: "Spare parts catalog", bn: "স্পেয়ার পার্টস ক্যাটালগ" },
  "spareparts.orderHistory": { en: "Your spare parts order history", bn: "আপনার স্পেয়ার পার্টস অর্ডার ইতিহাস" },
  "spareparts.searchLabel": { en: "Search by part name", bn: "পার্টের নাম দিয়ে খুঁজুন" },
  "spareparts.noOrders": { en: "No spare part orders found.", bn: "কোনো স্পেয়ার পার্টস অর্ডার পাওয়া যায়নি।" },
  "spareparts.compatibleWith": { en: "Compatible with", bn: "যেসব মেশিনের সাথে সামঞ্জস্যপূর্ণ" },

  "purchases.searchLabel": { en: "Search by machine model or serial number", bn: "মেশিন মডেল বা সিরিয়াল নম্বর দিয়ে খুঁজুন" },
  "purchases.searchPlaceholder": { en: "e.g. A4C or A6-001-2025", bn: "যেমন: A4C বা A6-001-2025" },
  "purchases.none": { en: "No purchases found.", bn: "কোনো ক্রয় পাওয়া যায়নি।" },
  "purchases.loading": { en: "Loading purchase history...", bn: "ক্রয় ইতিহাস লোড হচ্ছে..." },

  "itemType.machine": { en: "Machine", bn: "মেশিন" },
  "itemType.needle": { en: "Needle", bn: "সুঁই" },
  "itemType.sparePart": { en: "Spare Part", bn: "স্পেয়ার পার্ট" },
  "table.reorder": { en: "Reorder", bn: "পুনরায় অর্ডার" },

  "reorder.button": { en: "Reorder", bn: "পুনরায় অর্ডার করুন" },
  "reorder.requesting": { en: "Requesting...", bn: "অনুরোধ করা হচ্ছে..." },
  "reorder.requested": { en: "Reorder requested", bn: "পুনরায় অর্ডারের অনুরোধ করা হয়েছে" },
  "reorder.yourRequests": { en: "Your reorder requests", bn: "আপনার পুনরায় অর্ডারের অনুরোধ" },
  "reorder.noRequests": { en: "No reorder requests yet.", bn: "এখনো কোনো পুনরায় অর্ডারের অনুরোধ নেই।" },
  "reorder.status.PENDING": { en: "Pending", bn: "অপেক্ষমান" },
  "reorder.status.CONFIRMED": { en: "Confirmed", bn: "নিশ্চিত করা হয়েছে" },
  "reorder.status.FULFILLED": { en: "Fulfilled", bn: "সম্পন্ন হয়েছে" },

  "tickets.viewDetails": { en: "View timeline", bn: "টাইমলাইন দেখুন" },
  "tickets.hideDetails": { en: "Hide timeline", bn: "টাইমলাইন বন্ধ করুন" },
  "tickets.addComment": { en: "Add a follow-up comment", bn: "একটি ফলো-আপ মন্তব্য যুক্ত করুন" },
  "tickets.commentPlaceholder": { en: "Type an update or question...", bn: "একটি আপডেট বা প্রশ্ন লিখুন..." },
  "tickets.postComment": { en: "Post comment", bn: "মন্তব্য পোস্ট করুন" },
  "tickets.posting": { en: "Posting...", bn: "পোস্ট করা হচ্ছে..." },
  "tickets.none": { en: "No issues raised yet.", bn: "এখনো কোনো সমস্যা রিপোর্ট করা হয়নি।" },
  "tickets.loading": { en: "Loading ticket history...", bn: "টিকেট ইতিহাস লোড হচ্ছে..." },
  "table.actions": { en: "Actions", bn: "অ্যাকশন" },

  "settings.name": { en: "Name", bn: "নাম" },
  "settings.factory": { en: "Factory", bn: "কারখানা" },
  "settings.role": { en: "Role", bn: "ভূমিকা" },
  "settings.account": { en: "Account", bn: "অ্যাকাউন্ট" },
  "settings.switchAccount": { en: "Switch account", bn: "অ্যাকাউন্ট পরিবর্তন করুন" },
  "settings.language": { en: "Language", bn: "ভাষা" },
  "role.ie": { en: "Industrial Engineer (IE)", bn: "Industrial Engineer (IE)" },
  "settings.demoNotice": {
    en: "Real customer login isn't enabled yet — you're using the account picker as a stand-in while we test the dashboard.",
    bn: "এখনো প্রকৃত কাস্টমার লগইন চালু করা হয়নি — ড্যাশবোর্ড পরীক্ষা করার সময় আপনি অ্যাকাউন্ট পিকার ব্যবহার করছেন।",
  },

  "search.placeholder": {
    en: "Ask anything — \"I need needles\", \"why does my machine skip stitches?\"...",
    bn: "যা কিছু জিজ্ঞাসা করুন — \"সুঁই দরকার\", \"মেশিন স্টিচ স্কিপ করছে কেন?\"...",
  },
  "search.button": { en: "Ask AI", bn: "AI কে জিজ্ঞাসা করুন" },
  "search.thinking": { en: "Thinking...", bn: "ভাবা হচ্ছে..." },
  "support.callTechnician": { en: "Call a technician", bn: "টেকনিশিয়ানকে কল করুন" },
  "support.stillNeedHelp": {
    en: "Still need help? Talk to a technician directly.",
    bn: "তবুও সাহায্য প্রয়োজন? সরাসরি একজন টেকনিশিয়ানের সাথে কথা বলুন।",
  },

  "garments.intro": {
    en: "Not sure which machine or needle to use? Pick a garment to see what we recommend for sewing it.",
    bn: "কোন মেশিন বা সুঁই ব্যবহার করবেন বুঝতে পারছেন না? কোনো পোশাক নির্বাচন করুন, আমরা সেলাইয়ের জন্য কী সুপারিশ করি দেখুন।",
  },
  "garment.SHIRTS": { en: "Shirts", bn: "শার্ট" },
  "garment.PANTS": { en: "Pants", bn: "প্যান্ট" },
  "garment.JEANS": { en: "Jeans", bn: "জিন্স" },
  "garments.productionProcess": { en: "Production Process", bn: "উৎপাদন প্রক্রিয়া" },
  "garments.overallRecommendation": { en: "Overall recommendation", bn: "সার্বিক সুপারিশ" },
  "garments.recommendedMachines": { en: "Recommended machines", bn: "প্রস্তাবিত মেশিন" },
  "garments.recommendedNeedles": { en: "Recommended needles", bn: "প্রস্তাবিত সুঁই" },
  "garments.askAi": { en: "Ask AI for more detail", bn: "আরও বিস্তারিত জানতে AI কে জিজ্ঞাসা করুন" },
  "garments.asking": { en: "Asking AI...", bn: "AI কে জিজ্ঞাসা করা হচ্ছে..." },

  "picker.subtitle": {
    en: "Continue as your factory's Industrial Engineer (IE).",
    bn: "আপনার কারখানার Industrial Engineer (IE) হিসেবে চালিয়ে যান।",
  },
} satisfies Record<string, Record<Lang, string>>;

export type TranslationKey = keyof typeof dict;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "en");

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
  }

  function t(key: TranslationKey): string {
    return dict[key][lang];
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
