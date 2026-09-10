import { WebSearchSource } from '../types';

export interface AcademicAnswer {
  answer: string;
  detectedWeakness: string | null;
  encouragement: string;
  suggestedFollowUps: string[];
  searchedWeb?: boolean;
  sources?: WebSearchSource[];
}

/**
 * Searches Wikipedia and open academic web endpoints in real-time
 * when local encyclopedic data is insufficient.
 */
export async function searchLiveWebKnowledge(message: string): Promise<AcademicAnswer | null> {
  try {
    const cleanMsg = message.trim().replace(/[?.!]+$/, '');
    const topicTerm = cleanMsg
      .replace(/^(what is the|what is a|what is an|what is|what are the|what are|define|explain|tell me about|how does|why is|why are|who is|who was|who discovered|who invented)\s+/i, '')
      .trim();

    if (!topicTerm || topicTerm.length < 2) return null;

    // 1. Search Wikipedia Open API
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topicTerm)}&utf8=&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Paideutic-AI-StudyApp/1.0' } });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const searchResults = searchData?.query?.search;
    if (!searchResults || searchResults.length === 0) return null;

    // Find best match (avoid disambiguation pages if possible)
    let bestResult = searchResults[0];
    for (const res of searchResults.slice(0, 3)) {
      if (!res.title.toLowerCase().includes('disambiguation')) {
        bestResult = res;
        break;
      }
    }

    const pageTitle = bestResult.title;

    // 2. Fetch page summary extract
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const summaryRes = await fetch(summaryUrl, { headers: { 'User-Agent': 'Paideutic-AI-StudyApp/1.0' } });
    if (!summaryRes.ok) return null;

    const summaryData = await summaryRes.json();
    const extract = summaryData.extract;
    if (!extract || extract.length < 30) return null;

    const articleUrl = summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
    const description = summaryData.description || bestResult.snippet?.replace(/<[^>]+>/g, '') || '';

    return {
      answer: `### ${pageTitle}\n\n${extract}${description ? `\n\n*${description}*` : ''}`,
      detectedWeakness: null,
      encouragement: "Verified academic knowledge retrieved from online educational databases.",
      suggestedFollowUps: [
        `Could you provide key study notes and takeaways for ${pageTitle}?`,
        `What are the most common exam questions asked about ${pageTitle}?`
      ],
      searchedWeb: true,
      sources: [
        {
          title: pageTitle,
          url: articleUrl,
          snippet: description || extract.slice(0, 160) + "..."
        }
      ]
    };
  } catch (err) {
    console.warn("Live web knowledge search error:", err);
    return null;
  }
}

export async function resolveAcademicQueryWithWebSearch(message: string, currentWeakTopics: string[] = []): Promise<AcademicAnswer> {
  // Check if we have an immediate local match
  const localResult = resolveAcademicQuery(message, currentWeakTopics);
  
  // If the query was matched by a specific subject handler (not the generic fallback)
  if (!localResult.answer.includes('Overview & Core Concept:')) {
    return localResult;
  }

  // Otherwise, attempt real-time web search
  const webResult = await searchLiveWebKnowledge(message);
  if (webResult) {
    return webResult;
  }

  return localResult;
}

export function resolveAcademicQuery(message: string, currentWeakTopics: string[] = []): AcademicAnswer {
  const queryLower = message.toLowerCase().trim();

  // Guardrail for off-topic, harmful, or non-academic queries
  const offTopicKeywords = [
    'joke', 'game', 'play', 'movie', 'song', 'weather', 'gossip',
    'recipe', 'pizza', 'crypto', 'bitcoin', 'password', 'hack', 'sport', 'casino', 'bet'
  ];
  if (
    offTopicKeywords.some((kw) => queryLower.includes(kw)) &&
    !queryLower.includes('math') &&
    !queryLower.includes('science') &&
    !queryLower.includes('cell') &&
    !queryLower.includes('physics') &&
    !queryLower.includes('chemistry') &&
    !queryLower.includes('biology')
  ) {
    return {
      answer: "I am your Academic AI Tutor. I can only assist with educational subjects, concepts, and study materials.",
      detectedWeakness: null,
      encouragement: "Let's keep our focus on your learning goals!",
      suggestedFollowUps: [
        "Ask me a question about biology, chemistry, physics, or math",
        "Help me understand a topic from my course notes"
      ]
    };
  }

  // Arithmetic calculation pattern
  const mathMatch = message.match(/(?:what\s+is\s+|calculate\s+|compute\s+)?(\d+(?:\.\d+)?)\s*([\+\-\*\/x×÷\^])\s*(\d+(?:\.\d+)?)/i);
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2].toLowerCase();
    const num2 = parseFloat(mathMatch[3]);
    let result: number | null = null;
    let opSymbol = op;
    if (op === '+') { result = num1 + num2; opSymbol = '+'; }
    else if (op === '-') { result = num1 - num2; opSymbol = '-'; }
    else if (op === '*' || op === 'x' || op === '×') { result = num1 * num2; opSymbol = '×'; }
    else if (op === '/' || op === '÷') { result = num2 !== 0 ? num1 / num2 : null; opSymbol = '÷'; }
    else if (op === '^') { result = Math.pow(num1, num2); opSymbol = '^'; }

    if (result !== null) {
      const cleanRes = Number.isInteger(result) ? result.toString() : result.toFixed(2);
      return {
        answer: `${num1} ${opSymbol} ${num2} = **${cleanRes}**`,
        detectedWeakness: null,
        encouragement: "Quick arithmetic down pat! Keep up the momentum.",
        suggestedFollowUps: [
          `Can you show how this applies in algebraic equations?`,
          `Give me a practice problem using this operation.`
        ]
      };
    }
  }

  // Struggle topic detection
  const struggleMatch = message.match(/(?:struggling with|confused about|help (?:me )?with|trouble with|understand)\s+([A-Za-z0-9\s-]{3,35})/i);
  let extractedTopic: string | null = null;
  if (struggleMatch && struggleMatch[1]) {
    const rawMatch = struggleMatch[1].trim().replace(/[?.!,]+$/, '');
    const isQuestionWord = /^(what|how|why|can|could|tell|explain|is|does|where|when|which|show)\b/i.test(rawMatch);
    if (!isQuestionWord && rawMatch.split(/\s+/).length <= 4) {
      extractedTopic = rawMatch.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  // -------------------------------------------------------------
  // CELL BIOLOGY & ORGANELLES
  // -------------------------------------------------------------
  
  // Brain / Control Center of the cell -> Nucleus
  if (
    queryLower.includes('brain of the cell') ||
    queryLower.includes('control center of the cell') ||
    (queryLower.includes('brain') && queryLower.includes('cell')) ||
    (queryLower.includes('nucleus') && (queryLower.includes('what is') || queryLower.includes('function')))
  ) {
    return {
      answer: `The **nucleus** is known as the **"brain" (or control center) of the cell**.

**Key Reasons & Functions:**
- **Stores Genetic Material**: It contains the cell's DNA organized into chromatin/chromosomes.
- **Directs Cellular Activities**: It regulates gene expression, protein synthesis (via mRNA transcription), cellular metabolism, and cell division (mitosis and meiosis).
- **Nucleolus**: Inside the nucleus, the nucleolus produces and assembles ribosomes.`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Cell Organelles' : null),
      encouragement: "Mastering organelle analogies makes cellular biology intuitive and memorable!",
      suggestedFollowUps: [
        "What is the difference between chromatin and chromosomes?",
        "What is the function of the nuclear membrane (nuclear envelope)?",
        "Why do prokaryotic cells lack a true nucleus?"
      ]
    };
  }

  // Suicidal bag of the cell -> Lysosome
  if (
    queryLower.includes('suicid') ||
    queryLower.includes('digestive bag') ||
    (queryLower.includes('lysosome') && !queryLower.includes('ribosome'))
  ) {
    return {
      answer: `**Lysosomes** are known as the **"suicidal bags"** (or digestive bags) of the cell.

**Key Reasons & Functions:**
- **Hydrolytic Digestive Enzymes**: Lysosomes contain over 50 acid hydrolases (proteases, lipases, nucleases) that function optimally at an acidic pH ($\\approx 4.5 - 5.0$).
- **Autolysis (Self-Digestion)**: When a cell is severely damaged, aged, or infected, the lysosomes rupture and release their enzymes into the cytoplasm, completely digesting the cell from within.
- **Autophagy & Defense**: They break down worn-out organelles and destroy engulfed bacteria and viruses.`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Cell Organelles' : null),
      encouragement: "Understanding lysosomal enzymes connects cell biology to immunology and pathology!",
      suggestedFollowUps: [
        "What is the difference between autophagy and heterophagy?",
        "Why don't lysosomal enzymes destroy the cell under normal conditions?",
        "How do proton pumps ($H^+$-ATPases) keep the lysosome acidic?"
      ]
    };
  }

  // Powerhouse of the cell -> Mitochondria
  if (
    queryLower.includes('powerhouse') ||
    queryLower.includes('mitochondri')
  ) {
    return {
      answer: `The **mitochondrion** (plural: *mitochondria*) is known as the **"powerhouse of the cell"**.

**Key Reasons & Functions:**
- **ATP Generation**: It generates the majority of the cell's chemical energy, **ATP (Adenosine Triphosphate)**, through aerobic cellular respiration.
- **Inner Membrane Cristae**: The inner membrane is heavily folded into cristae to maximize the surface area for the Electron Transport Chain (ETC) and ATP Synthase.
- **Own DNA**: Mitochondria possess their own circular DNA (mtDNA) and 70S ribosomes, supporting the endosymbiotic theory.`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Cellular Respiration' : null),
      encouragement: "Bioenergetics and ATP generation are high-yield topics on biology exams!",
      suggestedFollowUps: [
        "What happens in the Krebs cycle inside the mitochondrial matrix?",
        "How does the Electron Transport Chain create a proton gradient?"
      ]
    };
  }

  // Kitchen of the cell -> Chloroplast
  if (
    queryLower.includes('kitchen of the cell') ||
    (queryLower.includes('chloroplast') && !queryLower.includes('mitochondria'))
  ) {
    return {
      answer: `The **chloroplast** is known as the **"kitchen of the plant cell"**.

**Key Reasons & Functions:**
- **Site of Photosynthesis**: Contains green **chlorophyll** pigments that absorb solar energy to synthesize food (glucose) from carbon dioxide and water.
- **Thylakoids & Stroma**: Light-dependent reactions occur in thylakoid membranes (grana), while light-independent reactions (Calvin Cycle) occur in the fluid stroma.
- **Equation**: $6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{Light, Chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Photosynthesis' : null),
      encouragement: "Connecting chloroplast structure to the Calvin cycle simplifies plant physiology!",
      suggestedFollowUps: [
        "What is the difference between photosystem I and photosystem II?",
        "How does RuBisCO fix carbon in the Calvin cycle?"
      ]
    };
  }

  // Protein factory -> Ribosome
  if (
    queryLower.includes('protein factor') ||
    queryLower.includes('ribosome')
  ) {
    return {
      answer: `**Ribosomes** are known as the **"protein factories of the cell"**.

**Key Reasons & Functions:**
- **Translation (Protein Synthesis)**: They read messenger RNA (mRNA) codons and assemble amino acids into polypeptide chains.
- **Types**: 70S in prokaryotes (50S + 30S) and 80S in eukaryotes (60S + 40S).
- **Location**: Free-floating in the cytoplasm (for internal proteins) or attached to the Rough Endoplasmic Reticulum (for membrane and exported proteins).`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Protein Synthesis' : null),
      encouragement: "Translation and transcription are the central dogma of molecular biology!",
      suggestedFollowUps: [
        "How do tRNA molecules deliver amino acids to the ribosome?",
        "What are the A, P, and E binding sites in the ribosome?"
      ]
    };
  }

  // Post office / Packaging center -> Golgi Apparatus
  if (
    queryLower.includes('post office') ||
    queryLower.includes('packaging center') ||
    queryLower.includes('golgi')
  ) {
    return {
      answer: `The **Golgi apparatus** (or Golgi body) is known as the **"post office" (or shipping center) of the cell**.

**Key Reasons & Functions:**
- **Modifies & Packages**: Receives newly made proteins and lipids from the Endoplasmic Reticulum, adds carbohydrate tags (glycosylation), and packages them into transport vesicles.
- **Sorting & Delivery**: Tags vesicles for secretion outside the cell, incorporation into the plasma membrane, or delivery to lysosomes.`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Cell Organelles' : null),
      encouragement: "Understanding membrane trafficking links the ER, Golgi, and cell membrane seamlessly!",
      suggestedFollowUps: [
        "What is the difference between the *cis* face and *trans* face of the Golgi?",
        "How does the Golgi body synthesize lysosomes?"
      ]
    };
  }

  // Highway / Transport network -> Endoplasmic Reticulum
  if (
    queryLower.includes('endoplasmic reticulum') ||
    queryLower.includes('rough er') ||
    queryLower.includes('smooth er')
  ) {
    return {
      answer: `The **Endoplasmic Reticulum (ER)** is the **transport network and synthesis factory of the cell**.

**Two Main Types:**
1. **Rough ER (RER)**: Studded with ribosomes; synthesizes, folds, and modifies secretory and membrane proteins.
2. **Smooth ER (SER)**: Lacks ribosomes; synthesizes lipids and phospholipids, metabolizes carbohydrates, detoxifies drugs/poisons, and stores calcium ions ($Ca^{2+}$).`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Cell Organelles' : null),
      encouragement: "Contrasting Rough vs Smooth ER is a classic exam question!",
      suggestedFollowUps: [
        "Why is smooth ER abundant in liver cells?",
        "How do chaperone proteins assist in protein folding in the RER?"
      ]
    };
  }

  // Gatekeeper / Boundary -> Cell Membrane
  if (
    queryLower.includes('cell membrane') ||
    queryLower.includes('plasma membrane') ||
    queryLower.includes('gatekeeper of the cell')
  ) {
    return {
      answer: `The **cell membrane** (plasma membrane) is the **selectively permeable barrier (gatekeeper) of the cell**.

**Key Characteristics:**
- **Fluid Mosaic Model**: Composed of a phospholipid bilayer with embedded transport proteins, cholesterol, and glycoproteins.
- **Selective Transport**: Controls the passage of ions and organic molecules via passive diffusion, facilitated diffusion, and active transport (using ATP).
- **Protection & Communication**: Maintains homeostasis and contains receptor proteins for cell signaling.`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Cell Membrane' : null),
      encouragement: "The fluid mosaic model is foundational to cellular physiology!",
      suggestedFollowUps: [
        "What is the role of cholesterol in membrane fluidity?",
        "How does the Sodium-Potassium pump ($Na^+/K^+$-ATPase) maintain resting potential?"
      ]
    };
  }

  // Plant Outer Layer -> Cell Wall
  if (queryLower.includes('cell wall')) {
    return {
      answer: `The **cell wall** is a rigid, protective outer layer found outside the plasma membrane in **plant cells, fungi, bacteria, and some protists** (absent in animal cells).

**Composition:**
- **Plants**: Made of cellulose microfibrils, hemicellulose, and pectin.
- **Fungi**: Made of chitin.
- **Bacteria**: Made of peptidoglycan.

**Function**: Provides mechanical strength, maintains cell shape, and prevents cells from bursting under high osmotic turgor pressure.`,
      detectedWeakness: extractedTopic || null,
      encouragement: "Always remember: plant cells have both a cell membrane AND a cell wall!",
      suggestedFollowUps: [
        "What is the primary vs secondary cell wall?",
        "What are plasmodesmata and how do they allow cell-to-cell transport?"
      ]
    };
  }

  // DNA & RNA
  if (queryLower.includes('what is dna') || queryLower.includes('structure of dna') || (queryLower.includes('dna') && queryLower.includes('stand for'))) {
    return {
      answer: `**DNA (Deoxyribonucleic Acid)** is the double-helix hereditary molecule that stores all genetic blueprints in living organisms.

**Key Components:**
- **Deoxyribose Sugar & Phosphate Backbone**.
- **4 Nitrogenous Bases**:
  - **Adenine (A)** pairs with **Thymine (T)** via 2 hydrogen bonds.
  - **Guanine (G)** pairs with **Cytosine (C)** via 3 hydrogen bonds.
- **Double Helix**: Discovered by James Watson, Francis Crick, and Rosalind Franklin in 1953.`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Genetics' : null),
      encouragement: "Complementary base pairing ($A=T, G\\equiv C$) is the key to DNA replication!",
      suggestedFollowUps: [
        "What is the difference between DNA and RNA?",
        "How does DNA replication work in the $5' \\to 3'$ direction?"
      ]
    };
  }

  if (queryLower.includes('mitosis') || queryLower.includes('meiosis') || queryLower.includes('cell division')) {
    return {
      answer: `### Mitosis vs. Meiosis

| Feature | Mitosis | Meiosis |
| :--- | :--- | :--- |
| **Purpose** | Growth, tissue repair, asexual reproduction | Sexual reproduction (gamete formation) |
| **Where it occurs** | Somatic (body) cells | Germ cells (testes/ovaries) |
| **Daughter Cells** | **2 identical diploid ($2n$)** cells | **4 diverse haploid ($n$)** cells |
| **Divisions** | 1 division (PMAT) | 2 divisions (Meiosis I & II) |
| **Crossing Over** | Does not occur | Occurs in Prophase I (genetic variation) |`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Cell Division' : null),
      encouragement: "Remember: **M**itosis makes **M**y toes (body cells), **Me**iosis makes **Me** (gametes)!",
      suggestedFollowUps: [
        "What are the 4 phases of mitosis (Prophase, Metaphase, Anaphase, Telophase)?",
        "How does crossing over during Prophase I create genetic diversity?"
      ]
    };
  }

  // -------------------------------------------------------------
  // CHEMISTRY CONCEPTS
  // -------------------------------------------------------------
  if (queryLower.includes('sodium') || queryLower.includes('symbol of sodium')) {
    return {
      answer: "The chemical symbol for **Sodium** is **Na** (atomic number 11), derived from the Latin word *natrium*. It is an alkali metal in Group 1 with the electron configuration $[\\text{Ne}]\\,3s^1$.",
      detectedWeakness: queryLower.includes('struggle') ? 'Chemical Symbols' : null,
      encouragement: "Quick recall of element symbols and groups speeds up chemistry calculations!",
      suggestedFollowUps: [
        "Why does Sodium react vigorously with water?",
        "What is the flame test color of Sodium?"
      ]
    };
  }

  if (queryLower.includes('potassium') || queryLower.includes('symbol of potassium')) {
    return {
      answer: "The chemical symbol for **Potassium** is **K** (atomic number 19), from the Neo-Latin word *kalium*. It is an essential alkali metal in Group 1.",
      detectedWeakness: null,
      encouragement: "Good factual recall!",
      suggestedFollowUps: ["Why is Potassium more reactive than Sodium?", "What is the biological role of $K^+$ ions?"]
    };
  }

  if (queryLower.includes('iron') && (queryLower.includes('symbol') || queryLower.includes('what is'))) {
    return {
      answer: "The chemical symbol for **Iron** is **Fe** (atomic number 26), from the Latin *ferrum*. It is a transition metal essential for oxygen transport in hemoglobin.",
      detectedWeakness: null,
      encouragement: "Solid chemistry fundamentals!",
      suggestedFollowUps: ["What is the difference between $Fe^{2+}$ (ferrous) and $Fe^{3+}$ (ferric)?"]
    };
  }

  if (queryLower.includes('ph') && (queryLower.includes('scale') || queryLower.includes('acid') || queryLower.includes('what is'))) {
    return {
      answer: `The **pH scale** measures the acidity or basicity (alkalinity) of an aqueous solution on a scale from **0 to 14**:

- **$\\text{pH} < 7$**: Acidic (high $[H^+]$ concentration, e.g., gastric acid $\\approx 1.5$, lemon juice $\\approx 2$)
- **$\\text{pH} = 7$**: Neutral (pure water at $25^\\circ\\text{C}$, $[H^+] = [OH^-] = 10^{-7}\\,\\text{M}$)
- **$\\text{pH} > 7$**: Basic / Alkaline (high $[OH^-]$ concentration, e.g., bleach $\\approx 12$)

**Mathematical Definition**:
$$\\text{pH} = -\\log_{10}[H^+]$$`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Acids and Bases' : null),
      encouragement: "Each 1-unit change in pH represents a 10-fold change in hydrogen ion concentration!",
      suggestedFollowUps: [
        "How do chemical buffer solutions resist changes in pH?",
        "What is the relationship between pH and pOH ($pH + pOH = 14$)?"
      ]
    };
  }

  // -------------------------------------------------------------
  // PHYSICS CONCEPTS
  // -------------------------------------------------------------
  if (queryLower.includes("newton's second law") || queryLower.includes("second law of motion") || queryLower.includes("f=ma") || queryLower.includes("f = ma")) {
    return {
      answer: `### Newton's Second Law of Motion

The acceleration of an object is directly proportional to the net force acting upon it and inversely proportional to its mass:

$$\\vec{F}_{\\text{net}} = m \\vec{a}$$

- **$\\vec{F}$**: Net Force in Newtons ($\\text{N} = \\text{kg}\\cdot\\text{m}/\\text{s}^2$)
- **$m$**: Mass in kilograms ($\\text{kg}$)
- **$\\vec{a}$**: Acceleration in meters per second squared ($\\text{m}/\\text{s}^2$)

**In terms of Momentum**: $\\vec{F} = \\frac{d\\vec{p}}{dt}$ (rate of change of linear momentum).`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? "Newton's Laws" : null),
      encouragement: "Newton's Second Law is the core foundation for all classical mechanics problems!",
      suggestedFollowUps: [
        "How does Newton's second law apply on an inclined plane with friction?",
        "What is Newton's third law of motion?"
      ]
    };
  }

  if (queryLower.includes("newton's first law") || queryLower.includes("law of inertia")) {
    return {
      answer: `### Newton's First Law of Motion (Law of Inertia)

An object at rest stays at rest, and an object in uniform motion stays in motion with constant velocity, unless acted upon by a non-zero **net external force**.

**Key Concept**: **Inertia** is the natural tendency of an object to resist changes in its state of motion. Mass is the direct quantitative measure of inertia.`,
      detectedWeakness: null,
      encouragement: "Remember: if net force is zero, acceleration is zero!",
      suggestedFollowUps: ["What is an inertial reference frame?", "How does friction act as an external force?"]
    };
  }

  if (queryLower.includes("newton's third law") || queryLower.includes("action and reaction")) {
    return {
      answer: `### Newton's Third Law of Motion

**"For every action, there is an equal and opposite reaction."**

Whenever Object A exerts a force on Object B ($\vec{F}_{AB}$), Object B simultaneously exerts a force of equal magnitude and opposite direction on Object A ($\vec{F}_{BA} = -\vec{F}_{AB}$).

*Note: Action and reaction forces never cancel each other out because they act on **two different bodies**.*`,
      detectedWeakness: null,
      encouragement: "Crucial rule: action-reaction pairs act on different objects!",
      suggestedFollowUps: ["Why does a rocket accelerate in the vacuum of space?"]
    };
  }

  if (queryLower.includes("ohm's law") || queryLower.includes("ohms law") || queryLower.includes("v=ir") || queryLower.includes("v = ir")) {
    return {
      answer: `### Ohm's Law

The electric current flowing through a conductor between two points is directly proportional to the voltage across the two points, provided the temperature remains constant:

$$V = I \\cdot R$$

- **$V$**: Potential difference / Voltage in Volts ($\\text{V}$)
- **$I$**: Current in Amperes ($\\text{A}$)
- **$R$**: Resistance in Ohms ($\\Omega$)`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Circuit Analysis' : null),
      encouragement: "Ohm's law combined with Kirchhoff's laws solves any resistive circuit!",
      suggestedFollowUps: [
        "How do resistors add in series vs parallel circuits?",
        "What is electrical power in terms of Ohm's law ($P = VI = I^2R$)?"
      ]
    };
  }

  // -------------------------------------------------------------
  // MATHEMATICS CONCEPTS
  // -------------------------------------------------------------
  if (queryLower.includes('trigonometry') || queryLower.includes('trig identities') || queryLower.includes('sin^2') || queryLower.includes('cos^2')) {
    return {
      answer: `### Fundamental Trigonometric Identities

#### 1. Pythagorean Identities:
- $\\sin^2\\theta + \\cos^2\\theta = 1$
- $1 + \\tan^2\\theta = \\sec^2\\theta$
- $1 + \\cot^2\\theta = \\csc^2\\theta$

#### 2. Ratio & Reciprocal Identities:
- $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}, \\quad \\cot\\theta = \\frac{\\cos\\theta}{\\sin\\theta}$
- $\\csc\\theta = \\frac{1}{\\sin\\theta}, \\quad \\sec\\theta = \\frac{1}{\\cos\\theta}$

#### 3. Double-Angle Formulas:
- $\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta$
- $\\cos(2\\theta) = \\cos^2\\theta - \\sin^2\\theta = 2\\cos^2\\theta - 1 = 1 - 2\\sin^2\\theta$`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Trigonometric Identities' : null),
      encouragement: "Memorizing Pythagorean and double-angle identities makes calculus substitutions effortless!",
      suggestedFollowUps: [
        "How do I prove the double-angle formula from angle addition?",
        "Can you show an example of trigonometric substitution in calculus?"
      ]
    };
  }

  if (queryLower.includes('quadratic formula') || queryLower.includes('quadratic equation')) {
    return {
      answer: `### The Quadratic Formula

For any quadratic equation in standard form:
$$ax^2 + bx + c = 0 \\quad (a \\neq 0)$$

The solutions are given by:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

**The Discriminant ($D = b^2 - 4ac$):**
- **$D > 0$**: Two distinct real roots
- **$D = 0$**: One repeated real root ($x = -\\frac{b}{2a}$)
- **$D < 0$**: Two complex conjugate roots`,
      detectedWeakness: extractedTopic || (queryLower.includes('struggle') ? 'Quadratic Equations' : null),
      encouragement: "Check the discriminant first to instantly determine root types before solving!",
      suggestedFollowUps: [
        "How is the quadratic formula derived using completing the square?",
        "What are Vieta's formulas for sum and product of roots?"
      ]
    };
  }

  if (queryLower.includes('pythagorean theorem') || queryLower.includes('pythagoras')) {
    return {
      answer: `### The Pythagorean Theorem

In any right-angled triangle, the square of the hypotenuse ($c$) is equal to the sum of the squares of the other two sides ($a$ and $b$):

$$a^2 + b^2 = c^2$$

**Common Pythagorean Triples**:
- $(3, 4, 5)$
- $(5, 12, 13)$
- $(8, 15, 17)$
- $(7, 24, 25)$`,
      detectedWeakness: null,
      encouragement: "Recognizing common Pythagorean triples saves valuable exam time!",
      suggestedFollowUps: [
        "How does the Law of Cosines generalize the Pythagorean theorem for any triangle?",
        "What is the distance formula in 2D Cartesian coordinates derived from Pythagoras?"
      ]
    };
  }

  // -------------------------------------------------------------
  // DYNAMIC NATURAL QUESTION SYNTHESIZER
  // -------------------------------------------------------------
  const cleanMsg = message.trim().replace(/[?.!]+$/, '');
  const topicTerm = cleanMsg
    .replace(/^(what is the|what is a|what is an|what is|what are the|what are|define|explain|tell me about|how does|why is|why are)\s+/i, '')
    .trim();

  const formattedTopic = topicTerm ? topicTerm.replace(/\b\w/g, (c) => c.toUpperCase()) : cleanMsg;

  return {
    answer: `### ${formattedTopic}

**Overview & Core Concept:**
**${formattedTopic}** is a fundamental academic concept. In scientific and mathematical analysis, it is characterized by its governing properties, operational principles, and systemic interactions.

**Key Study Points:**
- **Definition**: Identify the formal criteria, primary variables, and boundary conditions that define ${topicTerm || 'this subject'}.
- **Mechanism**: Trace how inputs and energy transfer drive the observed outcomes.
- **Application**: Test your understanding by calculating standard examples and analyzing limiting cases.`,
    detectedWeakness: extractedTopic,
    encouragement: 'Active inquiry accelerates deep retention and academic mastery!',
    suggestedFollowUps: [
      `Can you provide a step-by-step example on ${topicTerm || 'this'}?`,
      `What are the most common exam traps students make regarding ${topicTerm || 'this topic'}?`
    ],
  };
}
