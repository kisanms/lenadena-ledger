import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LangCode = "en" | "hi" | "hinglish" | "gu" | "mr";

export interface Language {
  code: LangCode;
  label: string;
  nativeLabel: string;
}

export const languages: Language[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "hinglish", label: "Hinglish", nativeLabel: "Hinglish" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
];

export const translations = {
  // App Header & Navigation
  app_name: {
    en: "LenaDena",
    hi: "लेनादेना",
    hinglish: "LenaDena",
    gu: "લેણદેણ",
    mr: "लेनादेना",
  },
  digital_khata: {
    en: "Digital Khata",
    hi: "डिजिटल खाता",
    hinglish: "Digital Khata",
    gu: "ડિજિટલ ખાતાવહી",
    mr: "डिजिटल खातावही",
  },
  customers: {
    en: "Customers",
    hi: "ग्राहक",
    hinglish: "Customers",
    gu: "ગ્રાહકો",
    mr: "ग्राहक",
  },
  suppliers: {
    en: "Suppliers",
    hi: "सप्लायर्स",
    hinglish: "Suppliers",
    gu: "સપ્લાયર્સ",
    mr: "सप्लायर्स",
  },
  net_balance: {
    en: "Net Balance",
    hi: "कुल बाकी",
    hinglish: "Net Balance",
    gu: "કુલ બાકી",
    mr: "एकूण बाकी",
  },
  you_will_get: {
    en: "You'll get",
    hi: "आपको मिलेंगे",
    hinglish: "Aapko milenge",
    gu: "તમને મળશે",
    mr: "तुम्हाला येणे आहे",
  },
  you_will_give: {
    en: "You'll give",
    hi: "आपको देने हैं",
    hinglish: "Aapko dene hain",
    gu: "તમારે આપવાના છે",
    mr: "तुम्हाला देणे आहे",
  },
  settled: {
    en: "Settled",
    hi: "हिसाब चुकता",
    hinglish: "Hisab barabar",
    gu: "હિસાબ સરભર",
    mr: "हिशोब पूर्ण",
  },
  search_placeholder: {
    en: "Search customer or supplier...",
    hi: "ग्राहक या सप्लायर खोजें...",
    hinglish: "Customer ya supplier search karein...",
    gu: "ગ્રાહક અથવા સપ્લાયર શોધો...",
    mr: "ग्राहक किंवा सप्लायर शोधा...",
  },
  add_customer: {
    en: "Add Customer",
    hi: "ग्राहक जोड़ें",
    hinglish: "Customer Add Karein",
    gu: "ગ્રાહક ઉમેરો",
    mr: "ग्राहक जोडा",
  },
  add_supplier: {
    en: "Add Supplier",
    hi: "सप्लायर जोड़ें",
    hinglish: "Supplier Add Karein",
    gu: "સપ્લાયર ઉમેરો",
    mr: "सप्लायर जोडा",
  },
  no_customers_yet: {
    en: "No customers yet",
    hi: "अभी कोई ग्राहक नहीं है",
    hinglish: "Abhi koi customer nahi hai",
    gu: "હજુ સુધી કોઈ ગ્રાહક નથી",
    mr: "अजून कोणतेही ग्राहक नाहीत",
  },
  no_suppliers_yet: {
    en: "No suppliers yet",
    hi: "अभी कोई सप्लायर नहीं है",
    hinglish: "Abhi koi supplier nahi hai",
    gu: "હજુ સુધી કોઈ સપ્લાયર નથી",
    mr: "अजून कोणतेही सप्लायर नाहीत",
  },
  add_first_party_hint: {
    en: "Add your first party to start tracking udhaar and payments.",
    hi: "उधार और भुगतान ट्रैक करने के लिए पहली पार्टी जोड़ें।",
    hinglish: "Udhaar aur payment track karne ke liye pehli party add karein.",
    gu: "ઉધાર અને ચુકવણી ટ્રેક કરવા માટે પ્રથમ પાર્ટી ઉમેરો.",
    mr: "उधार आणि पेमेंट नोंदवण्यासाठी पहिली पार्टी जोडा.",
  },

  // Party detail screen
  call: {
    en: "Call",
    hi: "कॉल करें",
    hinglish: "Call",
    gu: "કૉલ",
    mr: "कॉल",
  },
  whatsapp: {
    en: "WhatsApp",
    hi: "व्हाट्सएप",
    hinglish: "WhatsApp",
    gu: "વ્હોટ્સએપ",
    mr: "व्हॉट्सॲप",
  },
  statement: {
    en: "Statement",
    hi: "स्टेटमेंट",
    hinglish: "Statement",
    gu: "સ્ટેટમેન્ટ",
    mr: "स्टेटमेंट",
  },
  download_statement: {
    en: "Download statement",
    hi: "स्टेटमेंट डाउनलोड करें",
    hinglish: "Statement download karein",
    gu: "સ્ટેટમેન્ટ ડાઉનલોડ કરો",
    mr: "स्टेटमेंट डाउनलोड करा",
  },
  entries: {
    en: "Entries",
    hi: "लेनदेन",
    hinglish: "Entries",
    gu: "નોંધો",
    mr: "नोंदी",
  },
  no_entries_yet: {
    en: "No entries yet",
    hi: "अभी कोई लेनदेन नहीं है",
    hinglish: "Abhi koi entry nahi hai",
    gu: "હજુ સુધી કોઈ નોંધ નથી",
    mr: "अजून कोणतीही नोंद नाही",
  },
  opening_balance: {
    en: "Opening balance",
    hi: "प्रारंभिक शेष (Opening Balance)",
    hinglish: "Opening Balance",
    gu: "શરૂઆતની બાકી",
    mr: "सुरुवातीची बाकी",
  },
  delete_party: {
    en: "Delete party",
    hi: "पार्टी हटाएं",
    hinglish: "Party delete karein",
    gu: "પાર્ટી કાઢી નાખો",
    mr: "पार्टी हटवा",
  },

  // Gave / Got Buttons & Labels
  you_gave: {
    en: "You Gave",
    hi: "आपने दिए",
    hinglish: "Aapne Diye",
    gu: "તમે આપ્યા",
    mr: "तुम्ही दिले",
  },
  you_got: {
    en: "You Got",
    hi: "आपको मिले",
    hinglish: "Aapko Mile",
    gu: "તમને મળ્યા",
    mr: "तुम्हाला मिळाले",
  },
  you_paid: {
    en: "You Paid",
    hi: "आपने चुकाए",
    hinglish: "Aapne Pay Kiye",
    gu: "તમે ચૂકવ્યા",
    mr: "तुम्ही दिले",
  },

  // Entry Sheet
  add_entry: {
    en: "Add Entry",
    hi: "लेनदेन जोड़ें",
    hinglish: "Entry Add Karein",
    gu: "નોંધ ઉમેરો",
    mr: "नोंद जोडा",
  },
  amount: {
    en: "Amount",
    hi: "रकम",
    hinglish: "Amount",
    gu: "રકમ",
    mr: "रक्कम",
  },
  enter_amount: {
    en: "Enter amount",
    hi: "रकम दर्ज करें",
    hinglish: "Amount likhein",
    gu: "રકમ દાખલ કરો",
    mr: "रक्कम टाका",
  },
  note_optional: {
    en: "Note / Bill No. (optional)",
    hi: "नोट / बिल नंबर (वैकल्पिक)",
    hinglish: "Note / Bill No. (optional)",
    gu: "નોંધ / બિલ નંબર (વૈકલ્પિક)",
    mr: "टीप / बिल क्र. (पर्यायी)",
  },
  date: {
    en: "Date",
    hi: "तारीख",
    hinglish: "Date",
    gu: "તારીખ",
    mr: "तारीख",
  },
  save_entry: {
    en: "Save Entry",
    hi: "लेनदेन सुरक्षित करें",
    hinglish: "Entry Save Karein",
    gu: "નોંધ સાચવો",
    mr: "नोंद जतन करा",
  },

  // Settings
  settings: {
    en: "Settings",
    hi: "सेटिंग्स",
    hinglish: "Settings",
    gu: "સેટિંગ્સ",
    mr: "सेटिंग्ज",
  },
  app_language: {
    en: "App Language",
    hi: "ऐप की भाषा",
    hinglish: "App Ki Bhasha",
    gu: "એપની ભાષા",
    mr: "ॲपची भाषा",
  },
  app_language_desc: {
    en: "Select your preferred language",
    hi: "अपनी पसंदीदा भाषा चुनें",
    hinglish: "Apni pasand ki bhasha chunein",
    gu: "તમારી પસંદગીની ભાષા પસંદ કરો",
    mr: "तुमची पसंतीची भाषा निवडा",
  },
  business_profile: {
    en: "Business profile",
    hi: "व्यापार प्रोफ़ाइल",
    hinglish: "Business Profile",
    gu: "વ્યાપાર પ્રોફાઇલ",
    mr: "व्यवसाय प्रोफाईल",
  },
  business_name: {
    en: "Business name",
    hi: "व्यापार / दुकान का नाम",
    hinglish: "Business / Dukaan ka naam",
    gu: "દુકાન / વ્યાપારનું નામ",
    mr: "दुकान / व्यवसायाचे नाव",
  },
  owner_name: {
    en: "Owner name",
    hi: "मालिक का नाम",
    hinglish: "Owner ka naam",
    gu: "માલિકનું નામ",
    mr: "मालकाचे नाव",
  },
  phone_number: {
    en: "Phone",
    hi: "फ़ोन नंबर",
    hinglish: "Phone number",
    gu: "ફોન નંબર",
    mr: "फोन नंबर",
  },
  save_profile: {
    en: "Save profile",
    hi: "प्रोफ़ाइल सुरक्षित करें",
    hinglish: "Profile Save Karein",
    gu: "પ્રોફાઇલ સાચવો",
    mr: "प्रोफाईल जतन करा",
  },
  pin_lock: {
    en: "4-digit PIN lock",
    hi: "4-अंकों का पिन लॉक",
    hinglish: "4-digit PIN lock",
    gu: "4-અંકનો પિન લોક",
    mr: "4-अंकी पिन लॉक",
  },
  pin_lock_hint: {
    en: "Asked each time the app opens",
    hi: "ऐप खोलने पर हर बार पूछा जाएगा",
    hinglish: "App kholne par har baar pucha jayega",
    gu: "એપ ખોલવા પર દર વખતે પૂછવામાં આવશે",
    mr: "ॲप उघडताना प्रत्येक वेळी विचारले जाईल",
  },
  change_pin: {
    en: "Change PIN",
    hi: "पिन बदलें",
    hinglish: "PIN badlein",
    gu: "પિન બદલો",
    mr: "पिन बदला",
  },
  share_app: {
    en: "Share LenaDena App",
    hi: "LenaDena ऐप शेयर करें",
    hinglish: "LenaDena App Share Karein",
    gu: "LenaDena એપ શેર કરો",
    mr: "LenaDena ॲप शेअर करा",
  },
  share_app_hint: {
    en: "Share the APK download link with customers and suppliers",
    hi: "ग्राहकों और सप्लायरों को APK लिंक भेजें",
    hinglish: "Customers aur suppliers ko APK link share karein",
    gu: "ગ્રાહકો અને સપ્લાયર્સ સાથે APK લિંક શેર કરો",
    mr: "ग्राहक आणि सप्लायर्सना APK लिंक शेअर करा",
  },
  share_app_btn: {
    en: "Share App Link",
    hi: "ऐप लिंक शेयर करें",
    hinglish: "App Link Share Karein",
    gu: "એપ લિંક શેર કરો",
    mr: "ॲप लिंक शेअर करा",
  },
  about_this_app: {
    en: "About this app",
    hi: "इस ऐप के बारे में",
    hinglish: "About this app",
    gu: "આ એપ વિશે",
    mr: "या ॲपबद्दल",
  },
  delete_account: {
    en: "Delete account",
    hi: "खाता हटाएं",
    hinglish: "Account Delete Karein",
    gu: "ખાતું કાઢી નાખો",
    mr: "खाते हटवा",
  },
  sign_out: {
    en: "Sign out",
    hi: "लॉग आउट",
    hinglish: "Sign out",
    gu: "સાઇન આઉટ",
    mr: "लॉग आउट",
  },

  back: {
    en: "Back",
    hi: "वापस",
    hinglish: "Wapas",
    gu: "પાછા",
    mr: "मागे",
  },
  confirm_pin: {
    en: "Confirm PIN",
    hi: "पिन की पुष्टि करें",
    hinglish: "PIN Confirm Karein",
    gu: "પિન કન્ફર્મ કરો",
    mr: "पिन निश्चित करा",
  },
  create_pin: {
    en: "Create a 4-digit PIN",
    hi: "4-अंकों का पिन बनाएं",
    hinglish: "4-digit PIN Banayein",
    gu: "4-અંકનો પિન બનાવો",
    mr: "4-अंकी पिन तयार करा",
  },
  pin_set_success: {
    en: "PIN set successfully",
    hi: "पिन सेट हो गया",
    hinglish: "PIN set ho gaya",
    gu: "પિન સેટ થઈ ગયો",
    mr: "पिन सेट झाला",
  },
  pin_mismatch: {
    en: "PINs did not match, try again",
    hi: "पिन मेल नहीं खाया, पुनः प्रयास करें",
    hinglish: "PIN match nahi hua, dobara try karein",
    gu: "પિન મેળ ખાતો નથી, ફરી પ્રયાસ કરો",
    mr: "पिन जुळला नाही, पुन्हा प्रयत्न करा",
  },

  // Common Dialogs & Actions
  cancel: {
    en: "Cancel",
    hi: "रद्द करें",
    hinglish: "Cancel",
    gu: "રદ કરો",
    mr: "रद्द करा",
  },
  save: {
    en: "Save",
    hi: "सुरक्षित करें",
    hinglish: "Save",
    gu: "સાચવો",
    mr: "जतन करा",
  },
  close: {
    en: "Close",
    hi: "बंद करें",
    hinglish: "Band karein",
    gu: "બંધ કરો",
    mr: "बंद करा",
  },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  languages: Language[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "lenadena_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (saved && languages.some((l) => l.code === saved)) {
        setLangState(saved);
      }
    } catch {
      // localStorage may fail in some iframe/incognito modes
    }
  }, []);

  const setLang = (next: LangCode) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next === "hinglish" ? "en" : next;
    } catch {
      // ignore
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const entry = translations[key];
    if (!entry) return fallback ?? (key as string);
    return entry[lang] ?? entry.en ?? fallback ?? (key as string);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, languages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
