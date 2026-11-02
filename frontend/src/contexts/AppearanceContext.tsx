"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "rw" | "fr";
export type ThemePreference = "system" | "light" | "dark";
type Preferences = { language?: Language; theme?: ThemePreference; [key: string]: unknown };
type AppearanceValue = {
  language: Language;
  theme: ThemePreference;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
  t: (english: string) => string;
};

const STORAGE_KEY = "hdos-ui-preferences";

const translations: Record<Language, Record<string, string>> = {
  en: {},
  rw: {
    "YOUR JOURNEY": "URUGENDO RWAWE", "DISCOVER & DECIDE": "SHAKA UNAFATE ICYEMEZO", "TAKE ACTION": "FATA INGAMBA",
    "ADMINISTRATION": "UBUYOBOZI", "Command centre": "Ahakorerwa ibikorwa", "Goals & roadmap": "Intego n'inzira", "Life DNA": "Umwirondoro wanjye",
    "Opportunities": "Amahirwe", "Workforce insights": "Isesengura ry'isoko ry'umurimo", "Decision assistant": "Umujyanama mu byemezo",
    "Applications": "Ubusabe", "Document vault": "Ububiko bw'inyandiko", "Analytics": "Isesengura", "Sign out": "Sohoka",
    "Need a hand?": "Ukeneye ubufasha?", "Our support team is here to help.": "Itsinda ry'ubufasha rirahari ngo rigufashe.", "Email support": "Ohereza ubutumwa", "Skip to content": "Jya ku by'ingenzi",
    "Settings": "Amagenamiterere", "Theme": "Imigaragarire", "System": "Uko igikoresho cyagenwe", "Light": "Umucyo", "Dark": "Umwijima", "Language": "Ururimi",
    "English": "Icyongereza", "Kinyarwanda": "Ikinyarwanda", "French": "Igifaransa", "Close navigation": "Funga imbonerahamwe", "Open navigation": "Fungura imbonerahamwe",
    "Rwanda opportunity intelligence": "Amakuru y'amahirwe mu Rwanda", "PREFERENCES & SECURITY": "AMAHITAMO N'UMUTEKANO",
    "Make HDOS work better for you. Your preferences stay in this browser.": "Hitamo uko HDOS igufasha neza. Ibyo wahisemo bibikwa muri iyi mushakisha.",
    "Account": "Konti", "Name": "Izina", "Email": "Imeyili", "Account type": "Ubwoko bwa konti",
    "Language & accessibility": "Ururimi n'uburyo bworoshye gukoresha", "Interface language": "Ururimi rwa porogaramu", "Larger text": "Inyuguti nini",
    "Increase text size across the app": "Kongera ingano y'inyuguti muri porogaramu", "Reduce motion": "Kugabanya ibyinyeganyeza",
    "Minimize interface animations": "Kugabanya ibyinyeganyeza kuri porogaramu", "Deadline reminders": "Kwibutswa igihe ntarengwa",
    "Show reminders in your application centre": "Kwerekana ukwibutsa mu busabe bwawe", "Preferences saved on this device.": "Ibyo wahisemo byabitswe kuri iki gikoresho.",
    "Privacy & data": "Ibanga n'amakuru", "Review your profile details or request account deletion and associated data removal.": "Reba amakuru yawe cyangwa usabe gusiba konti n'amakuru ajyanye na yo.",
    "Application centre": "Ikigo cy'ubusabe", "Track every opportunity, prepare documents, and confirm each submission yourself.": "Kurikirana amahirwe, utegure inyandiko, kandi wemeze buri busabe.",
    "Explore": "Shakisha", "Explore opportunities": "Shakisha amahirwe", "Opportunity sources": "Aho amahirwe aturuka", "Occupations": "Imyuga", "Programmes": "Porogaramu",
    "Learning paths & career roadmaps": "Inzira zo kwiga n'imyuga", "My applications": "Ubusabe bwanjye", "Preparing": "Birategurwa", "Ready for review": "Biteguye gusuzumwa", "Submitted": "Byatanzwe",
    "No opportunities match these filters": "Nta mahirwe ahuye n'ibyo wahisemo", "No opportunity sources are available": "Nta soko y'amahirwe ibonetse",
    "Open provider site": "Fungura urubuga rw'utanga amahirwe", "Filter by category": "Shungura ukurikije icyiciro", "All sources": "Amasoko yose",
    "Jobs & humanitarian": "Imirimo n'ubutabazi", "Scholarships": "Buruse", "Learning & skills": "Kwiga n'ubumenyi", "Business support": "Ubufasha mu bucuruzi",
    "Confirm eligibility, deadlines and application instructions on the provider's page.": "Emeza ibisabwa, igihe ntarengwa n'amabwiriza ku rubuga rw'utanga amahirwe.",
    "YOUR HDOS COMMAND CENTRE": "AHO UGENZURIRA HDOS", "Active goals": "Intego zikora", "Profile readiness": "Uko umwirondoro wuzuye",
    "Across jobs, study and training": "Mu kazi, amasomo n'amahugurwa", "Goals in motion": "Intego zikomeje", "Make progress today": "Tera imbere uyu munsi",
    "My profile (Life DNA)": "Umwirondoro wanjye", "About you": "Ibyakwerekeyeho", "Save profile": "Bika umwirondoro",
    "Career": "Umwuga", "Education": "Uburezi", "Skills": "Ubumenyi", "Training": "Amahugurwa", "Grants": "Inkunga",
    "No data yet": "Nta makuru arahari", "Loading": "Biratunganywa", "Try again": "Ongera ugerageze", "Cancel": "Hagarika", "Save": "Bika", "Search": "Shakisha",
    "Good day": "Mwaramutse", "Turn your next ambition into a clear, achievable plan. Your opportunities and progress, all in one place.": "Hindura intego yawe gahunda isobanutse kandi ishoboka. Amahirwe yawe n'iterambere biri hamwe.", "Build your next step": "Tegura intambwe ikurikira", "Goals": "Intego", "Each goal gets its own recommendations and roadmap.": "Buri ntego igira ibyifuzo n'inzira yayo.", "New goal": "Intego nshya", "No goals yet": "Nta ntego zirahari", "Everything here is editable and is the only personal data used to personalise your results.": "Ibyo byose ushobora kubihindura; ni byo byonyine by'amakuru yawe akoreshwa mu kugena ibisubizo.", "National insights": "Isesengura ry'igihugu", "Official statistics, cited. This is the evidence base behind HDOS's national-priority signals.": "Imibare yemewe ifite aho yavuye. Ni yo shingiro ry'ibyihutirwa HDOS igaragaza.", "Main navigation": "Imbonerahamwe nyamukuru", "Mobile navigation": "Imbonerahamwe ya telefoni", "HDOS support": "Ubufasha bwa HDOS", "Your account": "Konti yawe",
  },
  fr: {
    "YOUR JOURNEY": "VOTRE PARCOURS", "DISCOVER & DECIDE": "DÉCOUVRIR ET DÉCIDER", "TAKE ACTION": "PASSER À L'ACTION",
    "ADMINISTRATION": "ADMINISTRATION", "Command centre": "Centre de pilotage", "Goals & roadmap": "Objectifs et parcours", "Life DNA": "Mon profil",
    "Opportunities": "Opportunités", "Workforce insights": "Analyse du marché du travail", "Decision assistant": "Assistant décisionnel",
    "Applications": "Candidatures", "Document vault": "Coffre de documents", "Analytics": "Analyses", "Sign out": "Déconnexion",
    "Need a hand?": "Besoin d'aide ?", "Our support team is here to help.": "Notre équipe d'assistance est là pour vous aider.", "Email support": "Contacter l'assistance", "Skip to content": "Aller au contenu",
    "Settings": "Paramètres", "Theme": "Thème", "System": "Système", "Light": "Clair", "Dark": "Sombre", "Language": "Langue",
    "English": "Anglais", "Kinyarwanda": "Kinyarwanda", "French": "Français", "Close navigation": "Fermer la navigation", "Open navigation": "Ouvrir la navigation",
    "Rwanda opportunity intelligence": "Informations sur les opportunités au Rwanda", "PREFERENCES & SECURITY": "PRÉFÉRENCES ET SÉCURITÉ",
    "Make HDOS work better for you. Your preferences stay in this browser.": "Personnalisez HDOS selon vos besoins. Vos préférences restent dans ce navigateur.",
    "Account": "Compte", "Name": "Nom", "Email": "E-mail", "Account type": "Type de compte",
    "Language & accessibility": "Langue et accessibilité", "Interface language": "Langue de l'interface", "Larger text": "Texte plus grand",
    "Increase text size across the app": "Agrandir le texte dans toute l'application", "Reduce motion": "Réduire les animations",
    "Minimize interface animations": "Limiter les animations de l'interface", "Deadline reminders": "Rappels d'échéance",
    "Show reminders in your application centre": "Afficher des rappels dans votre espace de candidatures", "Preferences saved on this device.": "Préférences enregistrées sur cet appareil.",
    "Privacy & data": "Confidentialité et données", "Review your profile details or request account deletion and associated data removal.": "Consultez votre profil ou demandez la suppression du compte et des données associées.",
    "Application centre": "Espace candidatures", "Track every opportunity, prepare documents, and confirm each submission yourself.": "Suivez les opportunités, préparez vos documents et confirmez vous-même chaque envoi.",
    "Explore": "Explorer", "Explore opportunities": "Explorer les opportunités", "Opportunity sources": "Sources d'opportunités", "Occupations": "Métiers", "Programmes": "Programmes",
    "Learning paths & career roadmaps": "Parcours d'apprentissage et de carrière", "My applications": "Mes candidatures", "Preparing": "En préparation", "Ready for review": "À vérifier", "Submitted": "Envoyée",
    "No opportunities match these filters": "Aucune opportunité ne correspond à ces filtres", "No opportunity sources are available": "Aucune source d'opportunités disponible",
    "Open provider site": "Ouvrir le site du fournisseur", "Filter by category": "Filtrer par catégorie", "All sources": "Toutes les sources",
    "Jobs & humanitarian": "Emplois et aide humanitaire", "Scholarships": "Bourses", "Learning & skills": "Formation et compétences", "Business support": "Soutien aux entreprises",
    "Confirm eligibility, deadlines and application instructions on the provider's page.": "Vérifiez l'éligibilité, les dates limites et les instructions sur le site du fournisseur.",
    "YOUR HDOS COMMAND CENTRE": "VOTRE CENTRE DE PILOTAGE HDOS", "Active goals": "Objectifs actifs", "Profile readiness": "Profil complété",
    "Across jobs, study and training": "Emploi, études et formation", "Goals in motion": "Objectifs en cours", "Make progress today": "Avancez aujourd'hui",
    "My profile (Life DNA)": "Mon profil", "About you": "À propos de vous", "Save profile": "Enregistrer le profil",
    "Career": "Carrière", "Education": "Éducation", "Skills": "Compétences", "Training": "Formation", "Grants": "Subventions",
    "No data yet": "Aucune donnée", "Loading": "Chargement", "Try again": "Réessayer", "Cancel": "Annuler", "Save": "Enregistrer", "Search": "Rechercher",
    "Good day": "Bonjour", "Turn your next ambition into a clear, achievable plan. Your opportunities and progress, all in one place.": "Transformez votre ambition en un plan clair et réalisable. Vos opportunités et vos progrès réunis au même endroit.", "Build your next step": "Préparer la prochaine étape", "Goals": "Objectifs", "Each goal gets its own recommendations and roadmap.": "Chaque objectif dispose de recommandations et d'un parcours dédiés.", "New goal": "Nouvel objectif", "No goals yet": "Aucun objectif pour le moment", "Everything here is editable and is the only personal data used to personalise your results.": "Tout est modifiable. Ces informations sont les seules données personnelles utilisées pour personnaliser vos résultats.", "National insights": "Analyse nationale", "Official statistics, cited. This is the evidence base behind HDOS's national-priority signals.": "Statistiques officielles avec leurs sources. Elles étayent les priorités nationales signalées par HDOS.", "Main navigation": "Navigation principale", "Mobile navigation": "Navigation mobile", "HDOS support": "Assistance HDOS", "Your account": "Votre compte",
  },
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

function readPreferences(): Preferences {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

function savePreferences(values: Partial<Preferences>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readPreferences(), ...values })); } catch { /* storage may be unavailable */ }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = readPreferences();
    if (prefs.language === "rw" || prefs.language === "fr" || prefs.language === "en") setLanguageState(prefs.language);
    if (prefs.theme === "system" || prefs.theme === "light" || prefs.theme === "dark") setThemeState(prefs.theme);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
  }, [language, ready]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    savePreferences({ language: next });
  }, []);
  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    savePreferences({ theme: next });
  }, []);
  const value = useMemo<AppearanceValue>(() => ({
    language,
    theme,
    setLanguage,
    setTheme,
    t: (english) => translations[language][english] ?? english,
  }), [language, theme, setLanguage, setTheme]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used within AppearanceProvider");
  return value;
}
