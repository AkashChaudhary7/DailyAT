/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question } from "../types";
import { overrideLegacyFontsInHtml } from "./langUtils";

// 1. STRICT LEGACY DICTIONARY - Bheji gayi list ke saare unique aur exception words bina kisi duplicates ke
const STRICT_LEGACY_CORRECTIONS: Record<string, string> = {
  // Complex Brackets and Special Conjunct Characters
  "नौकरश(ह)": "नौकरशाही",
  "कार्यव(ह)": "कार्यवाही",
  "क(र)गरोअ": "कारीगरों",
  "सरला देवी चौधुर(न)": "सरla देवी चौधुरानी",
  "लोकहितव(द)": "लोकहितवादी",
  "ज्ञ(न) जैल सिंह": "ज्ञानी जैल सिंह",
  "म.िराम दत्ता": "मणिराम दत्ता",
  "म.िराम": "मणिराम",
  "दिया कुम(र)": "दिया कुमारी",
  "दिया कुम(र": "दिया कुमारी",
  "दिया कुम": "दिया कुमारी",
  "मध्यक(ल)न": "मध्यकालीन",
  "राष्टरुकूट": "राष्ट्रकूट",
  "तक्कोटाम": "तक्कोलम",
  "ह(थ)गुम्फा": "हाथीगुम्फा",
  "ह(थ)गुम्फ": "हाथीगुम्फा",
  "सातकर्.ी-I": "शातकर्णी-I",
  "सातकर्.ी": "सातकर्णी",
  "वा.िज्यिक": "वाणिज्यिक",
  "प.िक्कर": "पणिक्कर",
  "ज्ञ(न)": "ज्ञानी",
  "श्रंखला निर्मा.": "श्रृंखला निर्माण",
  "श्रंखला": "श्रृंखला",
  "खनिज अन्वेष.": "खनिज अन्वेषण",
  "संस्कर.": "संस्करण",
  "दो-पांचवा": "दो-पांचवां",
  "हाB-i, ोथैलेमस": "हाइपोथैलेमस",
  "क्यारियोटाB-i, िंग": "कैरियोटाइपिंग",
  "सरक(र)ी": "सरकारी",
  "सरक(र)": "सरकार",
  "कर्मच(र)ी": "कर्मचारी",
  "कर्मच(र)": "कर्मचारी",
  "खरीदd(र)": "खरीददारी",
  "खरीदद(र)": "खरीददारी",
  "धार.ाएँ": "धारणाएँ",
  "सावध(न)": "सावधानी",
  "आने-जूने": "आने-जाने",
  "स्थ(न)य": "स्थानीय",
  "जीवनस(थ)ी": "जीवनसाथी",
  "क(ल)वेली": "कलवेली",
  "बल्ल(र)": "बल्लारी",
  "बेरोजग(र)": "बेरोजगार",
  "हिस्सेd(र)": "हिस्सेदारी",
  "हिस्seद(र)": "हिस्सेदारी",
  "वैश(ल)": "वैशाली",
  "ज्ञिदसदनात्मकतावाद": "द्विसदनात्मकतावाद",
  "तेरहत(ल)": "तेरहताली",
  "शेखाव(ट)": "शेखावाटी",
  "सीताब(ड़)": "सीताबाड़ी",
  "पटव(र)": "पटवारी",
  "संभ(ग)य": "संभागीय",
  "स्व(म)": "स्वामी",
  "आव(स)य": "आवासीय",
  "अधिक(र)": "अधिकारी",
  "श(र)रिक": "शारीरिक",
  "भ(ग)द(र)": "भागीदारी",
  "जिल(ध)श": "जिलाधीश",
  "अधिश(ष)": "अधिशासी",
  "अधिश(स)": "अधिशासी",
  "मेध(व)": "मेधावी",
  "क(ल)बाई": "कालीबाई",
  "आब(द)": "आबादी",
  "बुनiy(द)": "बुनियादी",
  "प्रभ(व)": "प्रभावी",
  "आदv(स)": "आदिवासी",
  "ब(ड)": "बाड़ी",
  "र(ठ)": "राठौड़",
  "र(ज)व": "राजीव",

  // Specific Word Fixes
  "परुकृति": "प्रकृति",
  "परुकोप": "प्रकोप",
  "परुकार": "प्रकार",
  "परuक्रिया": "प्रक्रिया",
  "परुक्रिया": "प्रक्रिया",
  "परुकाश": "प्रकाश",
  "परुबल": "प्रबल",
  "प्र(च)न": "प्राचीन",
  "ज(र)": "जारी",
  "ज(त)": "जाती",
  "बन(त)": "बनाती",
  "प(न)पत": "पानीपत",
  "जानागढ़": "जूनागढ़",
  "कर(च)": "कराची",
  "सम→ौते": "समझौते",
  "पूर्.तः": "पूर्णतः",
  "पूर्.": "पूर्ण",
  "न्यूयपालिका": "न्यायपालिका",
  "न्यूय(ध)श": "न्यायाधीश",
  "न्यूय": "न्याय",
  "न्यूयिक": "न्यायिक",
  "विध(य)": "विधायी",
  "कार्यक(र)": "कार्यकारी",
  "बाध्यक(र)": "बाध्यकारी",
  "स्थ(य)": "स्थायी",
  "प्राधिकr.": "प्राधिकरण",
  "प्राधिकर.": "प्राधिकरण",
  "ग्र(म).": "ग्रामीण",
  "भ(र)ी": "भारी",
  "भ(र)": "भारी",
  "त(i)": "ताप्ती",
  "ख(ड़)": "खाड़ी",
  "प(न)": "पानी",
  "बिवादों": "विवादों",
  "बिवाद": "विवाद",
  "म.िपुर": "मणिपुर",
  "अरu.ाचल": "अरुणाचल",
  "अरु.ाचल": "अरुणाचल",
  "परि.(म)": "परिणाम",
  "→ील": "झील",
  "श%uजीत": "शत्रुजीत",
  "श%ु": "शत्रु",
  "ब्यापारियों": "व्यापारियों",
  "ब्यापार": "व्यापार",
  "प्रma.पत्र": "प्रमाणपत्र",
  "प्रma.": "प्रमाण",
  "प्रma.पत्र": "प्रमाणपत्र",
  "प्रमा.पत्र": "प्रमाणपत्र",
  "प्रमा.": "प्रमाण",
  "निरीक्ष.": "निर्णय",
  "व(ल)": "वाली",
  "ग(ड़)": "गाड़ी",
  "बहिःस्%B": "बहिःस्रावी",
  "अंतःस्रB": "अंतःस्रावी",
  "क(ज)रंगा": "काजीरंगा",
  "तंजूनिया": "तंजानिया",
  "क्षुद्रां%": "क्षुद्रांत्र",
  "सुर्B": "सुर्खियाँ",
  "स्%ी": "स्त्री",
  "रास्ट गोफ्तार": "रास्त गोफ़्तार",
  "अग्न्यूशय": "अग्न्याशय",
  "शंकाओअ": "शंकाओं",
  "एकma%": "एकमात्र",
  "एकma.": "एकमात्र",
  "एकमा%": "एकमात्र",
  "संरक्ष.": "संरक्षण",
  "प्राप्तियोअ": "प्राप्तियों",
  "ब्ययों": "व्ययों",
  "प्रधानमं%ी": "自由",
  "प्रधानमं%ी": "自由",
  "प्रधानमं%ी": "प्रधानमंत्री",
  "ग.पूर्ति": "गणपूर्ति",
  "वर्ष.": "वर्षण",
  "अपहर.": "अपहरण",
  "घ(ट)": "घाटी",
  "विनामार.": "विनीर्माण",
  "एकीकर.": "एकीकरण",
  "स्थानांतर.": "स्थानांतरण",
  "वर्ष जल": "वर्षा जल",
  "साधार.": "साधारण",
  "बचूने": "बचने",
  "पोकर.": "पोखरण",
  "फरuक्टोज": "फ्रुक्टोज",
  "फरुक्टोज": "फ्रुक्टोज",
  "केन्दरुक": "केन्द्रक",
  "ने%ोद": "नेत्रोद",
  "ने%": "नेत्र",
  "परिसंचर.": "परिसंचरण",
  "उष्.कटिबंधीय": "उष्णकटिबंधीय",
  "उत्तरद(य)": "उत्तरायी",
  "उत्तरद(य)ी": "उत्तरदायी",
  "परuक्षेपित": "प्रक्षेपित",
  "परुक्षेपित": "प्रक्षेपित",
  "उत्तराख.्ड": "उत्तराखंड",
  "चुबकीय": "चुंबकीय",
  "परिma.": "परिमाण",
  "परिमा.": "परिमाण",
  "निगर(न)": "निगरानी",
  "निगर(न)ी": "निगरानी",
  "अभिक्रिय(श)ल": "अभक्रियाशील",
  "अभिक्रिय(श)लता": "अभक्रियाशीलता",
  "सार.ी": "सारणी",
  "क्ष(र)यता": "क्षारीयता",
  "याँ%िक": "यांत्रिक",
  "आत्मघ(त)ी": "आत्मघाती",
  "अभयार.्य": "अभयारण्य",
  "अभयारण्य": "अभयारण्य",
  "संधार.ीयता": "संधारणीयता",
  "मै%ी": "मैत्री",
  "समानुप(त)": "समानuपात",
  "गृहि.ी": "गृहिणी",
  "धनr(श)": "धनराशि",
  "धनर(श)": "धनराशि",

  // Specific Conflicts Solved
  "चि%": "चिह्न", // Yeh humesha 'चिह्न' rahega, 'चित्र' nahi taaki exact map ho ske
  "कृष्.देवराय": "कृष्णदेवराय",
  "कृष्.": "कृष्ण",
  "कार.": "कारण",
  "नियं%.": "नियंत्रण",
  "नाराय.": "नारायण",
  "ग.ेश": "गणेश",
  "ग.राज्य": "गणराज्य",
  "ग.": "गण",
  "निर्.ायक": "निर्णायक",
  "उiोग": "उद्योग",
  "झपल": "झील",
  "ांी": "A",
  "ावी": "B"
};

// 2. DYNAMIC CHARACTER CORES - Unknown text strings ke symbol replacements (Aapki dynamic core approach)
const DYNAMIC_CHARACTER_MAPPINGS: Record<string, string> = {
  "%": "त्र",
  "¾": "ो",
  "→": "झ",
  "iे": "रुपये",
  "रूiे": "रुपये"
};

export function normalizeHindiText(text: string): string {
  if (!text) return "";
  let out = text;
  
  // Step A: Run Strict Word mappings taaki complex words/conflicts pehle thik ho jayein
  for (const [key, value] of Object.entries(STRICT_LEGACY_CORRECTIONS)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escapedKey, 'g'), value);
  }

  // Step B: Smart Dynamic Dot Pattern Engine (Hindi character ke just baad aane wale dot ko 'ण' banana)
  out = out.replace(/([\u0900-\u097F])\.(?=\s|$)/g, "$1ण");

  // Step C: Fallback character tokens check (% -> त्र)
  for (const [key, value] of Object.entries(DYNAMIC_CHARACTER_MAPPINGS)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escapedKey, 'g'), value);
  }

  // Clean corrupted sequence tokens
  out = out.replace(/।-?\s?\(?पपप\)?[ए]?\s?/g, "A-iii, ");
  out = out.replace(/।-?\(?पप\)?[ए]?\s?/g, "A-ii, ");
  out = out.replace(/।-?\(?प\)?[ए]?\s?/g, "A-i, ");
  out = out.replace(/इ-?\s?\(?पपप\)?[ए]?\s?/g, "B-iii, ");
  out = out.replace(/इ-?\(?पप\)?[ए]?\s?/g, "B-ii, ");
  out = out.replace(/इ-?\(?प\)?[ए]?\s?/g, "B-i, ");
  out = out.replace(/ब-?\s?\(?पपप\)?[ए]?\s?/g, "C-iii, ");
  out = out.replace(/ब-?\(?पप\)?[ए]?\s?/g, "C-ii, ");
  out = out.replace(/ब-?\(?प\)?[ए]?\s?/g, "C-i, ");

  out = out.replace(/।-([१२३४५६७८९०0-9]+)ए?\s?/g, "A-$1, ");
  out = out.replace(/इ-([१२३४५६७८९०0-9]+)ए?\s?/g, "B-$1, ");
  out = out.replace(/ब-([१२३४५६७८९०0-9]+)ए?\s?/g, "C-$1, ");
  out = out.replace(/अ-([१२३४५६७८९०0-9]+)ए?\s?/g, "D-$1, ");
  out = out.replace(/य-([१२३४५६७८९०0-9]+)ए?\s?/g, "E-$1, ");
  
  out = out.replace(/(^|\s)।\.\s/g, "$1A. ");
  out = out.replace(/(^|\s)इ\.\s/g, "$1B. ");
  out = out.replace(/(^|\s)ब\.\s/g, "$1C. ");
  out = out.replace(/(^|\s)अ\.\s/g, "$1D. ");

  out = out.replace(/ा(\d+)ी/g, "($1)");
  out = out.replace(/ा([A-Za-z]+)ी/g, "($1)");
  out = out.replace(/ा([अ-ह]़?)ी/g, "($1)");
  out = out.replace(/ा([अ-ह]़?[A-Za-z0-9\s]+)ी/g, "($1)"); 
  
  out = out.replace(/(\d+)\.\s?।\s/g, "$1. I ");
  out = out.replace(/(\d+)\.\s?॥\s/g, "$1. II ");
  out = out.replace(/\s?।\s?-\s?\((प+य?)\)/g, " - ($1)");
  out = out.replace(/\((प+य?)\)ए\s/g, "($1), ");
  out = out.replace(/ध्\([१२३४५६७८९०0-9]\)/g, "");

  const digitMap: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  for (const [hindi, english] of Object.entries(digitMap)) {
    out = out.replace(new RegExp(hindi, 'g'), english);
  }

  out = out.replace(/(\d)\.(\d)/g, "$1.$2");
  out = out.replace(/(\d)%/g, "$1%");
  out = out.replace(/([0-9])\.([0-9])\./g, "$1.$2");
  out = out.replace(/\.त्र/g, "%");
  out = out.replace(/ण(\d)/g, ".$1"); 
  out = out.replace(/(\d)त्र/g, "$1%");
  
  out = out.replace(/झ/g, "→");
  out = out.replace(/\(प\)/g, "(i)");
  out = out.replace(/\(पप\)/g, "(ii)");
  out = out.replace(/\(पपप\)/g, "(iii)");
  out = out.replace(/\(पअ\)/g, "(iv)");

  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/,\s*,/g, ", ");
  out = out.replace(/,\s*$/g, "");
  
  return out.trim();
}

function convertHtmlWithDevLys(text: string): string {
  if (!text) return "";
  
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length; 
  if (devanagariCount > text.length * 0.05) return normalizeHindiText(text);

  const protectedStrings: string[] = [];
  let workingText = text.replace(/\[IMAGE: [^\]]+\]/g, (match) => {
    protectedStrings.push(match);
    return ` __PROT_STR_${protectedStrings.length - 1}__ `;
  });

  const optionCodesRegex = /[A-Ea-e]\s*[-=:]\s*[0-9](?:[\s,]*[A-Ea-e]\s*[-=:]\s*[0-9])*/g;
  workingText = workingText.replace(optionCodesRegex, (match) => {
    protectedStrings.push(match.toUpperCase());
    return ` __PROT_STR_${protectedStrings.length - 1}__ `;
  });

  const listRegex = /(^|\s)([\(\[]?)([A-Ea-e])([\.\):\]])(?=\s|$)/g;
  workingText = workingText.replace(listRegex, (match, p1, p2, p3, p4) => {
    protectedStrings.push(`${p1}${p2}${p3.toUpperCase()}${p4}`);
    return ` __PROT_STR_${protectedStrings.length - 1}__ `;
  });

  const char_mapping: { [key: string]: string } = {
    "a": "ं", "b": "व", "c": "ब", "d": "क", "e": "म", "f": "ि", "g": "ह", "h": "ी", "i": "प", "j": "र", "k": "ा", "l": "स", "m": "श", "n": "द", "o": "व", "p": "च", "q": "ु", "r": "त", "s": "े", "t": "ज", "u": "न", "v": "अ", "w": "ा", "x": "ग", "y": "ल", "z": "व",
    "A": "।", "B": "इ", "C": "ब", "D": "अ", "E": "म्", "F": "थ", "G": "ह", "H": "प", "I": "प", "J": "च", "K": "ा", "L": "स्", "M": "श", "N": "द", "O": "व", "P": "च", "Q": "फ", "R": "त्", "S": "ै", "T": "ज्", "U": "न्", "V": "ल्", "W": "ड", "X": "क्ष", "Y": "थ्", "Z": "र्",
    "0": "०", "1": "१", "2": "२", "3": "३", "4": "४", "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
    "[": "ख्", "]": "comma", "{": "क्ष", "}": "ज्ञ", "(": "(", ")": ")", "=": "¾", "+": "़", " ": " ",
    "&": "द", "*": "ड्ड", "/": "ध्", ";": "य", ":": "रू", "'": "श", "\"": "ष्", ",": "ए", ".": "ण", "<": "ढ़", ">": "झ", "?": "घ",
    "@": "ा", "#": "्र", "$": "रु", "%": "त्र", "^": "त्र", "_": "ो", "`": "़", "~": "़",
    "¼": "ा", "½": "ी", "¾": "ो", "Ù": "त्त", "ù": "ु", "ú": "ू", "û": "ृ", "ü": "े", "ý": "ै", "þ": "ो", "ÿ": "ौ",
    "ª": "ि", "«": "ी", "¬": "ा", "®": "ि", "¯": "ी", "à": "ा", "|": "।", "¡": "ि", "¢": "ी"
  };

  let str = workingText;
  str = str.replace(/f([A-Z\/\*\[\{]*)([a-z\]\}\<\>\?\/&;:=])/g, "$1$2f");
  str = str.replace(/([a-z\]\}\<\>\?\/&;:=])Z/g, "Z$1"); 
  str = str.replace(/([A-Z\/\*\[\{]+)([a-z\]\}\<\>\?\/&;:=])Z/g, "Z$1$2"); 
  
  let output = "";
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (char_mapping[c]) {
      output += char_mapping[c];
    } else if (c === "Z") {
      output += "र्";
    } else {
      output += c;
    }
  }

  output = output.replace(/ाे/g, "ो");
  output = output.replace(/ाै/g, "ौ");
  output = output.replace(/ेे/g, "े");
  output = output.replace(/ैै/g, "ै");
  output = output.replace(/्ा/g, "");
  output = output.replace(/comma/g, ",");

  protectedStrings.forEach((str, i) => {
    output = output.replace(`__PROT_STR_${i}__`, str);
  });

  const normalizations: {[key: string]: string} = {
    "कथान": "कथन", "असतय": "असत्य", "पवशन": "प्रश्न", "अनुत्तारति": "अनुत्तरित",
    "िपर": "पर", "नदप": "नदी", "कनारे": "किनारे", "वश़ा": "बड़ा", "पाागश़ा": "पायra",
    "दोलप": "दोली", "पयारप": "प्यारी", "हैद": "है।", "गमतप": "गोमती", "अवस्थाति": "अवस्थित",
    "नकालपिगयप": "निकाली गई", " नम्र": " निम्न", "असत्य कथन": "असत्य कथन", "संचावर्ि": "सिंचाई"
  };

  for (const [key, value] of Object.entries(normalizations)) {
    output = output.replace(new RegExp(key, 'g'), value);
  }

  output = output.replace(/ि /g, "ि");
  output = output.replace(/ ् /g, "्");
  output = output.replace(/् /g, "्");
  output = output.replace(/ा े/g, "ो");
  output = output.replace(/ा ै/g, "ौ");
  
  return normalizeHindiText(output);
}

function classifyTextSubject(text: string): string {
  const content = text.toLowerCase();
  const rules = [
    { sub: "Rajasthan GK", keywords: ["राजस्थान", "जयपुर", "जोधपुर", "उदयपुर", "अरावली", "मेवाड़", "मारवाड़", "लूनी", "बनास", "झील", "बावड़ी", "गढ़", "सांगा", "कुम्भा", "प्रताप", "बीकानेर", "कोटा", "भरतपुर", "अलवर"] },
    { sub: "Geography", keywords: ["नदी", "पर्वत", "पहाड़", "जलवायु", "मानसून", "मिट्टी", "वनस्पति", "वन्यजीव", "अभयारण्य", "पठार", "मरuस्थल", "महासागर", "द्वीप", "भूकंप", "ज्वालामुखी"] },
    { sub: "History", keywords: ["शासक", "युद्ध", "अभिलेख", "सभ्यता", "शिलालेख", "आंदोलन", "क्रांति", "स्वतंत्रता", "रियासत", "मुगल", "अंग्रेज", "सल्तनत", "मौर्य", "गुप्त"] },
    { sub: "Polity", keywords: ["विधानसभा", "राज्यपाल", "मुख्यमंत्री", "पंचायत", "नगरपालिका", "अनुच्छेद", "संविधान", "लोकसभा", "राज्यसभा", "राष्ट्रपति", "प्रधानमंत्री", "न्यायालय", "अधिकार"] },
    { sub: "Culture", keywords: ["मेला", "त्यौहार", "नृत्य", "वाद्य", "मंदिर", "वेशभूषा", "कला", "साहित्य", "अकादमी", "गीत", "लोकनृत्य", "दुर्ग", "छतरी", "हवेली"] },
    { sub: "General Science", keywords: ["विटामिन", "कोशिका", "तत्व", "ऊर्जा", "प्रकाश", "ध्वनि", "मानव", "रोग", "पौधे", "धातु", "अधातु"] }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(k => content.includes(k))) return rule.sub;
  }
  return "General Studies";
}

export function stripHtmlToText(html: string): string {
  if (!html) return "";
  let text = String(html);
  
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/td>/gi, " \t ");
  text = text.replace(/<\/th>/gi, " \t ");
  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, " [IMAGE: $1] ");
  text = text.replace(/<\/?(?:div|p|ul|ol|li|br|h1|h2|h3|h4|h5|h6|section|article|header|footer)[^>]*>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  
  text = text.replace(/&nbsp;/ig, " ");
  text = text.replace(/&lt;/ig, "<");
  text = text.replace(/&gt;/ig, ">");
  text = text.replace(/&amp;/ig, "&");
  text = text.replace(/&quot;/ig, '"');
  text = text.replace(/&#39;/ig, "'");
  text = text.replace(/&mdash;/ig, "-");
  text = text.replace(/&ndash;/ig, "-");
  text = text.replace(/comma/g, ",");
  text = text.replace(/&lsquo;/ig, "'");
  text = text.replace(/&rsquo;/ig, "'");
  text = text.replace(/&ldquo;/ig, '"');
  text = text.replace(/&rdquo;/ig, '"');
  
  text = text.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n');
  return text.trim();
}

export async function parseUniversalHTML(htmlString: string, targetExam: string): Promise<Question[]> {
  const questions: Question[] = [];
  if (!htmlString) return questions;

  try {
    // CRITICAL LOGICAL FIX: Pre-clean raw input at string layer before token extraction begins
    const cleanedHtmlInput = normalizeHindiText(htmlString);

    // 0. CHECK FOR EMBEDDED JSON SCRIPT DATA OR REMOTE JSON_URL
    const jsonUrlMatch = cleanedHtmlInput.match(/const\s+JSON_URL\s*=\s*["']([^"']+)["']/i);
    if (jsonUrlMatch && jsonUrlMatch[1]) {
      try {
        const response = await fetch(jsonUrlMatch[1]);
        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data) ? data : (data.data || []);
          const itemsArray = Array.isArray(items) ? items : [];
          return itemsArray.map((q: any, i: number) => {
            const options: string[] = [];
            for (let j = 1; j <= 10; j++) {
              const opt = q[`option_${j}`] || q[`option${j}`] || q[`opt${j}`];
              if (opt && String(opt).trim() !== "") {
                options.push(stripHtmlToText(String(opt)));
              }
            }
            while (options.length < 4) options.push(`Option ${options.length + 1}`);
            let correctIdx = 0;
            if (q.answer) {
              const ansVal = Number(q.answer);
              if (!isNaN(ansVal) && ansVal >= 1 && ansVal <= options.length) correctIdx = ansVal - 1;
            }
            const qText = stripHtmlToText(q.question || q.text || "");
            const expText = stripHtmlToText(q.solution || q.explanation || q.solution_text || "No explanation provided.");
            
            return {
              id: `remote-json-${Date.now()}-${i}-${Math.random().toString(36).substring(4)}`,
              questionText: overrideLegacyFontsInHtml(convertHtmlWithDevLys(qText)),
              options: options.map(opt => overrideLegacyFontsInHtml(convertHtmlWithDevLys(opt))),
              correctAnswerIndex: correctIdx,
              explanation: overrideLegacyFontsInHtml(convertHtmlWithDevLys(expText)),
              subject: q.subject || targetExam || "General",
              topic: q.topic || "",
              subtopic: q.concept || "",
              difficulty: "Medium",
              sourceType: "embedded-json",
              timesAnswered: 0,
              timesCorrect: 0,
              targetExam: targetExam
            };
          });
        }
      } catch (err) {
        console.warn("Failed to fetch remote JSON:", err);
      }
    }

    let jsonMatchStartIndex = cleanedHtmlInput.indexOf("const QUESTIONS =");
    if (jsonMatchStartIndex !== -1) {
      jsonMatchStartIndex += "const QUESTIONS =".length;
      let openBrackets = 0, arrayText = "", started = false, inString = false, escapeNext = false;
      for (let i = jsonMatchStartIndex; i < cleanedHtmlInput.length; i++) {
         const char = cleanedHtmlInput[i];
         if (!escapeNext && char === '"') inString = !inString;
         if (!inString && char === '[') { openBrackets++; started = true; }
         if (!inString && char === ']') openBrackets--;
         escapeNext = char === '\\' && !escapeNext;
         arrayText += char;
         if (started && openBrackets === 0) break;
      }
      
      try {
        const parsedJson = JSON.parse(arrayText.trim());
        if (Array.isArray(parsedJson) && parsedJson.length > 0) {
          return parsedJson.map((q: any, i: number) => {
            const options: string[] = [];
            for (let j = 1; j <= 10; j++) {
              const val = q[`option_${j}`] || q[`option${j}`];
              if (val && String(val).trim() !== "") options.push(stripHtmlToText(String(val)));
            }
            while (options.length < 4) options.push(`Option ${options.length + 1}`);
            let correctIdx = 0;
            if (q.answer) {
              const ansVal = Number(q.answer);
              if (!isNaN(ansVal) && ansVal >= 1 && ansVal <= options.length) correctIdx = ansVal - 1;
            }
            return {
              id: `json-${Date.now()}-${i}-${Math.random().toString(36).substring(4)}`,
              questionText: overrideLegacyFontsInHtml(convertHtmlWithDevLys(stripHtmlToText(q.question || ""))),
              options: options.map(opt => overrideLegacyFontsInHtml(convertHtmlWithDevLys(opt))),
              correctAnswerIndex: correctIdx,
              explanation: overrideLegacyFontsInHtml(convertHtmlWithDevLys(stripHtmlToText(q.solution_text || q.explanation || "No explanation provided."))),
              subject: q.subject || targetExam || "General",
              topic: q.topic || "",
              subtopic: q.concept || "",
              difficulty: "Medium",
              sourceType: "embedded-json",
              timesAnswered: 0,
              timesCorrect: 0,
              targetExam: targetExam
            };
          });
        }
      } catch (err) {
        console.error("Failed to parse embedded JSON:", err);
      }
    }

    const stylesFound: string[] = [];
    const styleMatches = cleanedHtmlInput.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
    if (styleMatches) {
      styleMatches.forEach((s) => { if (!stylesFound.includes(s)) stylesFound.push(s); });
    }

    const cleanTextOnly = (html: string): string => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const cleanQuestionPreamble = (qText: string): string => {
      if (!qText) return "";
      const lines = qText.split(/\r?\n/);
      const cleanedLines: string[] = [];
      let foundActualQuestionStart = false;

      for (let line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          if (cleanedLines.length > 0) cleanedLines.push(line);
          continue;
        }
        if (!foundActualQuestionStart) {
          const lower = trimmedLine.toLowerCase();
          if (
            lower.includes("still there are error") || lower.includes("parsed successfully") ||
            lower.includes("here is") || lower.includes("create this type of") ||
            lower.includes("pasted below") || lower.includes("mcq to parse") ||
            lower.includes("following question") || lower.includes("please parse") ||
            lower.includes("fix the parser") || lower.includes("the current mcq") ||
            (trimmedLine.length < 120 && /^(still|error|parsing|parse|here|create|type|test|hi|hello|hey|assist|solve|this|correct|wrong|bad|good)\b/i.test(trimmedLine) && !trimmedLine.includes("?"))
          ) continue;
          foundActualQuestionStart = true;
        }
        cleanedLines.push(line);
      }
      return cleanedLines.join("\n").trim();
    };

    const findOptionEndIndex = (html: string, startIndex: number, limit: number): number => {
      const remnant = html.substring(startIndex, limit);
      const closeMatch = remnant.match(/<\/(?:p|div|span|b|font)>\s*/i);
      if (closeMatch && closeMatch.index !== undefined) return startIndex + closeMatch.index + closeMatch[0].length;
      
      const firstNonWhitespaceMatch = remnant.match(/[^\s\r\n]/);
      if (firstNonWhitespaceMatch && firstNonWhitespaceMatch.index !== undefined) {
        const contentRemnant = remnant.substring(firstNonWhitespaceMatch.index);
        const nlIdx = contentRemnant.indexOf("\n");
        if (nlIdx !== -1) return startIndex + firstNonWhitespaceMatch.index + nlIdx + 1;
      } else {
        const nlIdx = remnant.indexOf("\n");
        if (nlIdx !== -1) return startIndex + nlIdx + 1;
      }
      return limit;
    };

    // TEXT-NODE-BASED EXTRACTION LAYER
    const textNodeQuestions: Question[] = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanedHtmlInput, "text/html");
      const textNodes: { node: Text; text: string; parent: HTMLElement }[] = [];
      const walk = doc.createTreeWalker(doc.body || doc, NodeFilter.SHOW_TEXT, null);
      let node;
      while (node = walk.nextNode()) {
        if ((node.nodeValue || "").trim()) {
          textNodes.push({ node: node as Text, text: node.nodeValue || "", parent: node.parentElement as HTMLElement });
        }
      }

      const optARegex = /^\s*(?:[\(\[\\{]?A[\)\]\\}][\s\.\-\:]*|A[\.\-\:]+\s*|A\s*$)/i;
      const optBRegex = /^\s*(?:[\(\[\\{]?B[\)\]\\}][\s\.\-\:]*|B[\.\-\:]+\s*|B\s*$)/i;
      const optCRegex = /^\s*(?:[\(\[\\{]?C[\)\]\\}][\s\.\-\:]*|C[\.\-\:]+\s*|C\s*$)/i;
      const optDRegex = /^\s*(?:[\(\[\\{]?D[\)\]\\}][\s\.\-\:]*|D[\.\-\:]+\s*|D\s*$)/i;
      const optERegex = /^\s*(?:[\(\[\\{]?E[\)\]\\}][\s\.\-\:]*|E[\.\-\:]+\s*|E\s*$)/i;

      const isOptionEMarker = (text: string): boolean => {
        const clean = text.trim().toLowerCase();
        if (optERegex.test(text)) return true;
        return clean.includes("अनुत्तरित") || clean.includes("unanswered") || clean.includes("vuqùkfjr") || clean.includes("vuqÙkfjr");
      };

      interface ScannedMarker { type: "A" | "B" | "C" | "D" | "E"; nodeIndex: number; matchLength: number; text: string; parent: HTMLElement; }
      const markers: ScannedMarker[] = [];
      for (let i = 0; i < textNodes.length; i++) {
        const text = textNodes[i].text;
        if (optARegex.test(text)) markers.push({ type: "A", nodeIndex: i, matchLength: text.match(optARegex)?.[0].length || 0, text, parent: textNodes[i].parent });
        else if (optBRegex.test(text)) markers.push({ type: "B", nodeIndex: i, matchLength: text.match(optBRegex)?.[0].length || 0, text, parent: textNodes[i].parent });
        else if (optCRegex.test(text)) markers.push({ type: "C", nodeIndex: i, matchLength: text.match(optCRegex)?.[0].length || 0, text, parent: textNodes[i].parent });
        else if (optDRegex.test(text)) markers.push({ type: "D", nodeIndex: i, matchLength: text.match(optDRegex)?.[0].length || 0, text, parent: textNodes[i].parent });
        else if (isOptionEMarker(text)) {
          let mLen = text.match(optERegex)?.[0].length || text.match(/^\s*(?:vuqÙkfjr\s*iz'u|vuqùkfjr\s*iz'u|अनुत्तरित\s*प्रश्न)/i)?.[0].length || 0;
          markers.push({ type: "E", nodeIndex: i, matchLength: mLen, text, parent: textNodes[i].parent });
        }
      }

      const aMarkers = markers.filter(m => m.type === "A");
      let lastQuestionEndNodeIdx = 0;

      for (let i = 0; i < aMarkers.length; i++) {
        const currentA = aMarkers[i], nextA = aMarkers[i + 1];
        const limitNodeIdx = nextA ? nextA.nodeIndex : textNodes.length;
        const group = markers.filter(m => m.nodeIndex > currentA.nodeIndex && m.nodeIndex < limitNodeIdx);
        const currentB = group.find(m => m.type === "B");
        const currentC = group.find(m => m.type === "C" && (!currentB || m.nodeIndex > currentB.nodeIndex));
        const currentD = group.find(m => m.type === "D" && (!currentC || m.nodeIndex > currentC.nodeIndex));
        const currentE = group.find(m => m.type === "E" && (!currentD || m.nodeIndex > currentD.nodeIndex));

        if (currentB && currentC && currentD) {
          const extractRangeHtml = (startM: ScannedMarker, endM: ScannedMarker | undefined, limIdx: number): string => {
            const startIdx = startM.nodeIndex, endIdx = endM ? endM.nodeIndex : limIdx;
            if (startM.parent === (endM ? endM.parent : null)) {
              const p = startM.parent.innerHTML, sOff = p.indexOf(startM.text), eOff = endM ? p.indexOf(endM.text) : p.length;
              if (sOff !== -1 && eOff !== -1 && eOff > sOff) return p.substring(sOff + startM.matchLength, eOff).trim();
            }
            let htmlParts: string[] = [], processed = new Set<HTMLElement>();
            for (let idx = startIdx; idx < endIdx; idx++) {
              const parent = textNodes[idx].parent;
              if (!processed.has(parent)) {
                processed.add(parent);
                let part = parent.innerHTML;
                if (idx === startIdx) {
                  const off = part.indexOf(startM.text);
                  part = off !== -1 ? part.substring(off + startM.matchLength) : part.replace(/^\s*[\(\[\\{]?[A-E][\)\]\\}]?[\s\.\-\:]*/i, "");
                }
                if (endM && idx === endIdx - 1) { const off = part.indexOf(endM.text); if (off !== -1) part = part.substring(0, off); }
                htmlParts.push(part.trim());
              }
            }
            return htmlParts.join(" ");
          };

          const extractQuestionHtml = (startIdx: number, aM: ScannedMarker): string => {
            let parts: string[] = [], processed = new Set<HTMLElement>();
            for (let idx = startIdx; idx < aM.nodeIndex; idx++) {
              const p = textNodes[idx].parent;
              if (!processed.has(p)) { processed.add(p); let prt = p.innerHTML; if (idx === aM.nodeIndex - 1) { const off = prt.indexOf(aM.text); if (off !== -1) prt = prt.substring(0, off); } parts.push(prt.trim()); }
            }
            return parts.join(" ");
          };

          let lastOptEndNodeIdx = currentE ? currentE.nodeIndex + 1 : currentD.nodeIndex + 1;
          const rawQ = extractQuestionHtml(lastQuestionEndNodeIdx, currentA);
          const rawA = extractRangeHtml(currentA, currentB, limitNodeIdx);
          const rawB = extractRangeHtml(currentB, currentC, limitNodeIdx);
          const rawC = extractRangeHtml(currentC, currentD, limitNodeIdx);
          let rawD = currentE ? extractRangeHtml(currentD, currentE, limitNodeIdx) : extractRangeHtml(currentD, undefined, limitNodeIdx);
          let rawE = currentE ? extractRangeHtml(currentE, undefined, limitNodeIdx) : "";

          const qParsed = stripHtmlToText(cleanQuestionPreamble(rawQ));
          const options = [stripHtmlToText(rawA), stripHtmlToText(rawB), stripHtmlToText(rawC), stripHtmlToText(rawD)].filter(Boolean);
          if (rawE) options.push(stripHtmlToText(rawE));
          while (options.length < 4) options.push(`Option ${options.length + 1}`);

          let correctIdx = 0;
          let blockText = "";
          for (let idx = currentA.nodeIndex; idx < limitNodeIdx; idx++) blockText += " " + textNodes[idx].text;
          const ansMatch = cleanTextOnly(blockText).match(/(?:Ans|Answer|Correct|Key|उत्तर|सही उत्तर|सही विकल्प)[\s\.\-\:]*([A-Ea-e1-5अबसदयकखगघङ])/i);
          if (ansMatch) {
            const val = ansMatch[1].toUpperCase();
            if (["A", "1", "अ", "क"].includes(val)) correctIdx = 0;
            else if (["B", "2", "ब", "ख"].includes(val)) correctIdx = 1;
            else if (["C", "3", "स", "ग"].includes(val)) correctIdx = 2;
            else if (["D", "4", "द", "घ"].includes(val)) correctIdx = 3;
            else if (["E", "5", "य", "ङ"].includes(val)) correctIdx = 4;
          }

          textNodeQuestions.push({
            id: `text-node-${Date.now()}-${i}-${Math.random().toString(36).substring(4)}`,
            questionText: qParsed, options, correctAnswerIndex: correctIdx,
            explanation: "Evaluated configuration sheet settings dynamically.",
            subject: classifyTextSubject(cleanTextOnly(qParsed)), topic: "Rajasthan GK", subtopic: "",
            difficulty: "Medium", sourceType: "notes", timesAnswered: 0, timesCorrect: 0, targetExam
          });
          lastQuestionEndNodeIdx = limitNodeIdx;
        }
      }
    } catch (err) { console.error("Text node execution setup layer error:", err); }

    if (textNodeQuestions.length > 0) {
      return textNodeQuestions.map(q => ({
        ...q,
        questionText: overrideLegacyFontsInHtml(convertHtmlWithDevLys(q.questionText)),
        options: q.options.map(opt => overrideLegacyFontsInHtml(convertHtmlWithDevLys(opt))),
        explanation: overrideLegacyFontsInHtml(convertHtmlWithDevLys(q.explanation))
      }));
    }

    // FALLBACK STRUCTURED LAYOUT SEGMENTER
    const hasStructuredMarkers = /A<style/i.test(cleanedHtmlInput) || /E<style/i.test(cleanedHtmlInput) || /(?:^|[\s\r\n>])A(?:\s*<(?:style|p|span|div|b|i|font)\b)/i.test(cleanedHtmlInput);
    if (hasStructuredMarkers) {
      const markerRegex = /(?:^|[\s\r\n>])([A-E])(?=\s*<style\b|\s*<(?:p|span|div|b|i|font)\b)/gi;
      let match;
      const markers: { index: number; label: string; length: number }[] = [];
      while ((match = markerRegex.exec(cleanedHtmlInput)) !== null) {
        const lbl = match[1].toUpperCase(), raw = match[0], lblIdx = raw.toUpperCase().lastIndexOf(lbl);
        markers.push({ index: match.index + lblIdx, label: lbl, length: raw.length - lblIdx });
      }
      const outsideTagMarkers = markers.filter(m => {
        const b = cleanedHtmlInput.substring(0, m.index);
        return (b.match(/</g) || []).length === (b.match(/>/g) || []).length;
      });
      const aMarkers = outsideTagMarkers.filter(m => m.label === "A");

      if (aMarkers.length > 0) {
        const parsedList: Question[] = [];
        let currentQuestionStart = 0;
        for (let i = 0; i < aMarkers.length; i++) {
          const curA = aMarkers[i], nextA = aMarkers[i + 1], limit = nextA ? nextA.index : cleanedHtmlInput.length;
          const curGroup = outsideTagMarkers.filter(m => m.index > curA.index && m.index < limit);
          const curB = curGroup.find(m => m.label === "B"), curC = curGroup.find(m => m.label === "C"), curD = curGroup.find(m => m.label === "D"), curE = curGroup.find(m => m.label === "E");

          if (curB && curC && curD) {
            let optA = cleanedHtmlInput.substring(curA.index + curA.length, curB.index).trim();
            let optB = cleanedHtmlInput.substring(curB.index + curB.length, curC.index).trim();
            let optC = cleanedHtmlInput.substring(curC.index + curC.length, curD.index).trim();
            let optD = "", optE = "", lastOptEndIdx = limit;
            if (curE) {
              optD = cleanedHtmlInput.substring(curD.index + curD.length, curE.index).trim();
              lastOptEndIdx = findOptionEndIndex(cleanedHtmlInput, curE.index + curE.length, limit);
              optE = cleanedHtmlInput.substring(curE.index + curE.length, lastOptEndIdx).trim();
            } else {
              lastOptEndIdx = findOptionEndIndex(cleanedHtmlInput, curD.index + curD.length, limit);
              optD = cleanedHtmlInput.substring(curD.index + curD.length, lastOptEndIdx).trim();
            }

            let qText = cleanedHtmlInput.substring(currentQuestionStart, curA.index).trim();
            const qParsed = stripHtmlToText(cleanQuestionPreamble(qText));
            const options = [stripHtmlToText(optA), stripHtmlToText(optB), stripHtmlToText(optC), stripHtmlToText(optD)].filter(Boolean);
            if (optE) options.push(stripHtmlToText(optE));
            while (options.length < 4) options.push(`Option ${options.length + 1}`);

            let correctIdx = 0;
            const ansMatch = cleanTextOnly(cleanedHtmlInput.substring(currentQuestionStart, limit)).match(/(?:Ans|Answer|Correct|Key|उत्तर|सही उत्तर)[\s\.\-\:]*([A-Ea-e1-5अबसदयकखगघङ])/i);
            if (ansMatch) {
              const val = ansMatch[1].toUpperCase();
              if (["A", "1", "अ", "क"].includes(val)) correctIdx = 0;
              else if (["B", "2", "ब", "ख"].includes(val)) correctIdx = 1;
              else if (["C", "3", "स", "ग"].includes(val)) correctIdx = 2;
              else if (["D", "4", "द", "घ"].includes(val)) correctIdx = 3;
              else if (["E", "5", "य", "ङ"].includes(val)) correctIdx = 4;
            }

            parsedList.push({
              id: `pro-${Date.now()}-${i}-${Math.random().toString(36).substring(4)}`,
              questionText: qParsed, options, correctAnswerIndex: correctIdx,
              explanation: "Preserved original formatting patterns dynamically.",
              subject: classifyTextSubject(cleanTextOnly(qParsed)), topic: "Rajasthan GK", subtopic: "",
              difficulty: "Medium", sourceType: "notes", timesAnswered: 0, timesCorrect: 0, targetExam
            });
            currentQuestionStart = limit;
          }
        }
        if (parsedList.length > 0) return parsedList;
      }
    }

    // ELEMENT BLOCK DOM LAYOUT FALLBACK
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedHtmlInput, "text/html");
    const blocks = doc.querySelectorAll(".question-block, .mcq, .quiz-question, .question-card");
    if (blocks.length > 0) {
      blocks.forEach((block, idx) => {
        const qEl = block.querySelector(".question, .question-text, .q-text, h3, h4");
        const optEls = block.querySelectorAll(".option, .opt, li");
        if (qEl) {
          const qText = stripHtmlToText(cleanQuestionPreamble(qEl.innerHTML.trim()));
          const options: string[] = [];
          optEls.forEach((opt) => { if (opt.innerHTML.trim()) options.push(stripHtmlToText(opt.innerHTML.trim())); });
          while (options.length < 4) options.push(`Option ${options.length + 1}`);
          
          let correctIdx = 0;
          optEls.forEach((opt, oIdx) => {
            if (block.classList.contains("correct") || opt.getAttribute("data-correct") === "true") correctIdx = oIdx;
          });

          questions.push({
            id: `dom-${Date.now()}-${idx}-${Math.random().toString(36).substring(4)}`,
            questionText: qText, options, correctAnswerIndex: correctIdx, explanation: "Parsed from template card blocks.",
            subject: classifyTextSubject(cleanTextOnly(qText)), topic: "General", subtopic: "", difficulty: "Medium",
            sourceType: "notes", timesAnswered: 0, timesCorrect: 0, targetExam
          });
        }
      });
    }

    if (questions.length > 0) return questions;

    // RAW PARAGRAPH BLOCK LINE STREAM ENGINE FALLBACK
    const paragraphs = Array.from(doc.querySelectorAll("p, div, li, span, h1, h2, h3, h4"));
    let currentQText = "", currentOptions: string[] = [], currentCorrect = 0;
    const optRegex = /^\s*[\(\[\\{]?(?:[A-Ea-e]|[1-5]|अ|ब|स|द|य)[\)\]\\}]?[\s\.\-\:]*(.*)$/i;
    const ansRegex = /^\s*(?:Ans|Answer|Correct|Key|उत्तर|सही)[\s\.\-\:]*(.*)$/i;

    paragraphs.forEach((p, idx) => {
      const text = (p.textContent || "").trim();
      if (!text) return;

      const ansMatch = text.match(ansRegex);
      if (ansMatch) {
        const val = ansMatch[1].trim().toUpperCase();
        if (["A", "1", "अ"].includes(val)) currentCorrect = 0;
        else if (["B", "2", "ब"].includes(val)) currentCorrect = 1;
        else if (["C", "3", "स"].includes(val)) currentCorrect = 2;
        else if (["D", "4", "द"].includes(val)) currentCorrect = 3;
        else if (["E", "5", "य"].includes(val)) currentCorrect = 4;
        return;
      }

      const optMatch = text.match(optRegex);
      if (optMatch && currentOptions.length < 5) {
        if (p.innerHTML.trim()) currentOptions.push(p.innerHTML.trim());
        return;
      }

      if (currentQText && currentOptions.length > 0) {
        while (currentOptions.length < 4) currentOptions.push(`Option ${currentOptions.length + 1}`);
        questions.push({
          id: `dom-b-${Date.now()}-${idx}`,
          questionText: stripHtmlToText(cleanQuestionPreamble(currentQText)),
          options: currentOptions.map(o => stripHtmlToText(o)),
          correctAnswerIndex: currentCorrect, explanation: "Fallback document structure plain paragraph line scanner context stream.",
          subject: classifyTextSubject(cleanTextOnly(currentQText)), topic: "General Studies", subtopic: "",
          difficulty: "Medium", sourceType: "notes", timesAnswered: 0, timesCorrect: 0, targetExam
        });
        currentQText = ""; currentOptions = []; currentCorrect = 0;
      }

      if (!optMatch && !ansMatch) currentQText += " " + p.innerHTML;
    });

  } catch (err) {
    console.error("Critical Layout Segment Mapping Exception:", err);
  }

  return questions.map(q => ({
    ...q,
    questionText: overrideLegacyFontsInHtml(convertHtmlWithDevLys(q.questionText)),
    options: q.options.map(opt => overrideLegacyFontsInHtml(convertHtmlWithDevLys(opt))),
    explanation: overrideLegacyFontsInHtml(convertHtmlWithDevLys(q.explanation))
  }));
}
