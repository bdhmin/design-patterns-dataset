// Per-document study history: flashcards, quiz questions, chats, Feynman
// sessions, extra KG nodes. Keyed by BANK_DOCS id.
export const STUDY = {
  neuro: {
    extraNodes: [
      ["resting-potential", "Resting membrane potential", "About -70 mV, set by the Na+/K+ pump and K+ leak channels.", [1]],
      ["refractory-period", "Refractory periods", "Absolute (Na+ channels inactivated) and relative refractoriness make propagation one-way.", [1]],
      ["neurotransmitter-clearance", "Signal termination", "AChE hydrolysis and reuptake transporters (SSRI target) end synaptic signalling.", [2]],
    ],
    cards: [
      { q: "What sets the resting membrane potential near -70 mV?", a: "The Na+/K+-ATPase gradients plus a membrane much more permeable to K+ (leak channels), so Vm sits close to E_K." },
      { q: "Which channel drives the rising phase of the action potential?", a: "Voltage-gated Na+ channels opening in a positive feedback loop once threshold (~-55 mV) is crossed." },
      { q: "Why is the action potential all-or-none?", a: "Above threshold the Na+ positive feedback runs to completion regardless of stimulus size; intensity is coded by firing frequency." },
      { q: "What causes the after-hyperpolarisation?", a: "Slow voltage-gated K+ channels stay open after repolarisation, driving Vm toward E_K (~-80 mV)." },
      { q: "What is saltatory conduction?", a: "In myelinated axons the spike regenerates only at nodes of Ranvier, jumping node to node — up to 120 m/s." },
      { q: "What triggers vesicle release at the presynaptic terminal?", a: "Ca2+ influx through voltage-gated calcium channels drives SNARE-mediated vesicle fusion." },
      { q: "EPSP vs IPSP?", a: "EPSP depolarises (e.g. glutamate on AMPA); IPSP hyperpolarises, typically Cl- through GABA/glycine receptors." },
      { q: "How do SSRIs act?", a: "They block serotonin reuptake transporters so serotonin stays longer in the cleft." },
    ],
    quiz: [
      { stem: "During the absolute refractory period a second action potential cannot fire because:", options: ["K+ channels are closed", "Na+ channels are inactivated", "The Na+/K+ pump has stopped", "Ca2+ is depleted from the terminal"], correctIndex: 1, explanation: "The inactivation gate of voltage-gated Na+ channels must reset before they can open again." },
      { stem: "Which change would INCREASE conduction velocity?", options: ["Demyelination", "Smaller axon diameter", "Larger axon diameter", "Lower temperature"], correctIndex: 2, explanation: "A wider axon has lower internal resistance and a longer length constant." },
      { stem: "The Nernst potential for K+ at 37 C is closest to:", options: ["+60 mV", "-55 mV", "-90 mV", "0 mV"], correctIndex: 2, explanation: "With [K+]out ~4 mM and [K+]in ~140 mM, E_K is around -90 to -95 mV." },
      { stem: "Most of the ~0.5 ms synaptic delay is due to:", options: ["Diffusion across the cleft", "Ca2+-triggered vesicle fusion", "Receptor desensitisation", "AChE hydrolysis"], correctIndex: 1, explanation: "Diffusion across 20 nm is fast; the exocytosis machinery takes most of the time." },
      { stem: "A nerve agent that blocks acetylcholinesterase causes:", options: ["Flaccid paralysis from no ACh release", "Continuous stimulation then paralysis", "Hyperpolarisation of muscle", "Faster saltatory conduction"], correctIndex: 1, explanation: "ACh accumulates in the cleft, over-stimulating receptors until they desensitise." },
    ],
    chats: [
      { title: "Why does K+ leave but the cell stays negative?", msgs: [
        ["user", "if potassium leaves the cell, positive charge goes out, so why doesn't the inside eventually become neutral again?"],
        ["assistant", "Good instinct — but only a *tiny* number of K+ ions need to leave to build the potential.\n\n- As K+ diffuses out, the inside becomes negative.\n- That negative inside **pulls K+ back in**.\n- At about -90 mV (E_K, from the Nernst equation) the electrical pull exactly balances the chemical push.\n\nThe bulk concentrations barely change — we're talking about roughly 1 ion in 100 000 crossing. So the cell never \"runs out\": the potential is a balance point, not a leak that drains.\n\nThe resting potential (-70 mV) sits a bit above E_K because the membrane is slightly permeable to Na+ too."],
        ["user", "ok so the pump isn't what makes it negative directly?"],
        ["assistant", "Exactly. The Na+/K+-ATPase is *electrogenic* (3 out, 2 in) but contributes only a few mV directly. Its real job is to **maintain the gradients** that the leak channels then convert into a voltage. Block the pump with ouabain and the potential decays slowly over minutes as the gradients run down — not instantly."],
      ] },
      { title: "Myelin and MS", msgs: [
        ["user", "explain why multiple sclerosis slows conduction, using the notes"],
        ["assistant", "From page 1: spikes in myelinated fibres **jump between nodes of Ranvier** (saltatory conduction) because the myelin insulates the internodes and the Na+ channels are clustered at the nodes.\n\nIn MS the myelin in the CNS (made by oligodendrocytes) is damaged:\n\n1. Current leaks out through the demyelinated segment.\n2. Less depolarisation reaches the next node.\n3. If it falls below threshold, conduction **blocks**; if barely above, it **slows**.\n\nThe internodes have few Na+ channels, so they can't simply switch to continuous conduction — that's why symptoms can be so abrupt."],
      ] },
    ],
    feynman: [
      { topic: "Action potential", turns: [
        ["Hi! I'm eight. Can you tell me what an action potential is, like you'd explain it to me?", "It's like a wave of electricity that goes down a nerve. The nerve is negative inside and when something pokes it enough, little doors open and positive stuff rushes in, and then it goes back to normal."],
        ["Ohh. But WHY does it go back to normal? Why doesn't it stay positive?", "Because the sodium doors close by themselves after a moment and other doors for potassium open, and potassium goes out, so it gets negative again. It even goes a bit too negative for a sec."],
        ["Can you give me an example from real life, like something at my house?", "Like a row of dominoes — once you push the first one hard enough they all fall, and you can't push it halfway. But dominoes don't stand back up, nerves do."],
      ], summary: "Solid causal chain for depolarisation and repolarisation, and the domino analogy captures all-or-none well. Missing: why propagation is one-directional (refractory period) and that the dominoes 'standing back up' is the pump restoring gradients, not the K+ channels." },
    ],
  },
  fourier: {
    extraNodes: [
      ["convolution-theorem", "Convolution theorem", "Convolution in time is multiplication in frequency: Y(f) = H(f) X(f).", [1]],
      ["fft", "FFT and DFT", "DFT of N samples computed in O(N log N); resolution fs/N; windowing reduces leakage.", [2]],
    ],
    cards: [
      { q: "What does |X(f)| tell you?", a: "The amplitude spectrum: how much of each frequency is present in x(t)." },
      { q: "Rect pulse of width T transforms to?", a: "T sinc(fT). Narrower pulse -> wider spectrum." },
      { q: "State the Nyquist criterion.", a: "For a signal band-limited to B Hz, sample at fs > 2B to avoid aliasing." },
      { q: "Effect of a time shift t0 on X(f)?", a: "Multiplies X(f) by e^(-j2 pi f t0): only phase changes, magnitude is unchanged." },
      { q: "Why do we analyse LTI systems in frequency?", a: "Convolution becomes multiplication: Y(f) = H(f) X(f)." },
      { q: "ECG filtering in the lab?", a: "Band-pass 0.5–40 Hz to remove baseline wander and HF noise, plus a 50 Hz notch for mains." },
    ],
    quiz: [
      { stem: "An audio signal band-limited to 20 kHz must be sampled at least at:", options: ["10 kHz", "20 kHz", "40 kHz", "80 kHz"], correctIndex: 2, explanation: "Nyquist: fs > 2B = 40 kHz; CDs use 44.1 kHz for margin." },
      { stem: "Compressing a signal in time by a factor 2 does what to its spectrum?", options: ["Compresses it by 2", "Stretches it by 2", "Shifts it by 2 Hz", "Nothing"], correctIndex: 1, explanation: "Time-bandwidth trade-off: x(2t) <-> (1/2)X(f/2)." },
      { stem: "Which signal has a flat spectrum?", options: ["A Gaussian", "A cosine", "The Dirac delta", "A rect pulse"], correctIndex: 2, explanation: "The delta contains all frequencies equally." },
      { stem: "Frequency resolution of an N-point DFT at sampling rate fs:", options: ["fs * N", "N / fs", "fs / N", "2 fs / N"], correctIndex: 2, explanation: "Bins are spaced fs/N apart." },
    ],
    chats: [
      { title: "Intuition for the Fourier integral", msgs: [
        ["user", "i can compute the transform of a rect but i don't *get* what the integral is doing"],
        ["assistant", "Think of e^(-j2πft) as a **probe spinning at frequency f**.\n\n1. Multiply your signal by the probe.\n2. If x(t) contains a component at exactly f, that component and the probe spin together → their product stops rotating and **adds up** over time.\n3. Every other frequency keeps rotating relative to the probe and **averages to zero**.\n\nSo X(f) is \"how much of x(t) survives when you look at it through a lens spinning at f\". The rect pulse is short, so many probe speeds partially survive → wide sinc."],
        ["user", "ok that actually clicks. so a longer pulse = narrower sinc because only probes really close to 0 survive?"],
        ["assistant", "Yes — that's the scaling property in one sentence. Over a long pulse, even a slightly-off probe has time to drift a full cycle and cancel, so only f ≈ 0 survives. Short pulse → not enough time to cancel → broad spectrum. Same reason a short click sounds \"broadband\"."],
      ] },
      { title: "Lab 4 — why notch at 50 not 60?", msgs: [
        ["user", "why do we notch at 50 Hz and not 60 like in the matlab example online?"],
        ["assistant", "Mains frequency depends on the grid: **50 Hz in Europe** (Italy included), 60 Hz in North America. The tutorial you found was US-based. On page 2 your notes show the sharp peak at 50 Hz in the recorded ECG spectrum — that's what you filter."],
      ] },
    ],
  },
  linalg: {
    extraNodes: [
      ["multiplicity", "Algebraic vs geometric multiplicity", "1 <= geometric <= algebraic; strict inequality means defective.", [1]],
      ["spectral-theorem", "Spectral theorem", "Real symmetric matrices: real eigenvalues, orthogonal eigenvectors, A = Q D Q^T.", [2]],
      ["markov-steady-state", "Markov steady state", "Eigenvector with eigenvalue 1 of the transition matrix.", [2]],
    ],
    cards: [
      { q: "Definition of eigenvector?", a: "Non-zero v with A v = lambda v: A only scales v." },
      { q: "How do you find eigenvalues?", a: "Solve det(A - lambda I) = 0, the characteristic equation." },
      { q: "Sum and product of eigenvalues?", a: "Sum = trace(A), product = det(A)." },
      { q: "When is A diagonalizable?", a: "Iff it has n linearly independent eigenvectors (sufficient: n distinct eigenvalues)." },
      { q: "Example of a defective matrix", a: "[[1,1],[0,1]]: lambda = 1 twice but only one eigenvector." },
      { q: "What does the spectral theorem guarantee?", a: "Real symmetric A = Q D Q^T with Q orthogonal, all eigenvalues real." },
      { q: "Why does PCA use eigenvectors?", a: "Covariance is symmetric; eigenvectors are principal directions, eigenvalues the variances." },
    ],
    quiz: [
      { stem: "A 3x3 matrix has eigenvalues 2, 2, 5 and the eigenspace of 2 has dimension 1. Then A is:", options: ["Diagonalizable", "Defective", "Symmetric", "Singular"], correctIndex: 1, explanation: "Geometric multiplicity 1 < algebraic 2 for lambda = 2." },
      { stem: "trace(A) = 7, det(A) = 10 for a 2x2 matrix. The eigenvalues are:", options: ["2 and 5", "1 and 10", "3 and 4", "-2 and -5"], correctIndex: 0, explanation: "Sum 7, product 10." },
      { stem: "x' = A x is asymptotically stable when all eigenvalues:", options: ["Are positive", "Have negative real part", "Are real", "Equal 1"], correctIndex: 1, explanation: "Solutions behave like e^(lambda t)." },
      { stem: "PageRank is computed as:", options: ["The smallest eigenvector", "The dominant eigenvector via power method", "The determinant of the link matrix", "A singular value"], correctIndex: 1, explanation: "Repeated multiplication converges to the eigenvector with largest |lambda|." },
    ],
    chats: [
      { title: "Exercise 8 — defective matrix", msgs: [
        ["user", "in es. 8 i get lambda = 4 with algebraic multiplicity 2 but when i solve (A-4I)v=0 i get only one free variable. did i mess up?"],
        ["assistant", "Probably not — that's exactly what makes it the **defective** one (your notes flag it).\n\n- Algebraic multiplicity = 2 (double root).\n- One free variable → eigenspace dimension = **1** = geometric multiplicity.\n\nSince 1 < 2, A doesn't have enough independent eigenvectors and **is not diagonalizable**. Double-check by computing rank(A - 4I): if it's n - 1, you're right."],
        ["user", "rank is 2 and n=3 so yes. so what do you do with it then?"],
        ["assistant", "For this course: you just state it's not diagonalizable. (In general you'd use the **Jordan form**, with a 2x2 Jordan block for lambda = 4 — but that's beyond the program per the syllabus.)"],
      ] },
    ],
    feynman: [
      { topic: "Diagonalization", turns: [
        ["Hi! I'm eight. Can you tell me what diagonalization is, like you'd explain it to me?", "Some machines squish and turn arrows. But there are special directions where the machine only stretches. If you look at everything using those directions, the machine becomes super simple — just stretching each one."],
        ["Ohh. But WHY is that useful?", "Because if you have to use the machine 100 times, you just stretch 100 times in each direction, you don't have to do all the hard turning math."],
      ], summary: "Good core intuition (change of basis to eigen-directions; powers become easy). You didn't mention when it fails — not enough special directions (defective matrices) — which is exactly what the exercises test." },
    ],
  },
  bayes: {
    extraNodes: [
      ["probabilita-condizionata", "Probabilità condizionata", "P(A|B) = P(A e B)/P(B): restringere lo spazio campionario a B.", [1]],
      ["probabilita-totale", "Probabilità totale", "P(A) = somma P(A|Bi)P(Bi) su una partizione.", [1]],
      ["distribuzioni", "Distribuzioni notevoli", "Bernoulli, binomiale, Poisson, normale: medie e varianze.", [2]],
    ],
    cards: [
      { q: "Definizione di probabilità condizionata", a: "P(A|B) = P(A e B) / P(B), con P(B) > 0." },
      { q: "Cosa sono prior e posterior?", a: "Prior P(Bi) prima dell'osservazione; posterior P(Bi|A) aggiornata dopo." },
      { q: "Sensibilità vs specificità", a: "Sens = P(+|malato); spec = P(-|sano)." },
      { q: "Perché il VPP è basso con malattie rare?", a: "I falsi positivi tra i tanti sani superano i veri positivi tra i pochi malati." },
      { q: "Media e varianza della Poisson", a: "Entrambe uguali a lambda." },
      { q: "Fallacia del procuratore", a: "Confondere P(A|B) con P(B|A)." },
    ],
    quiz: [
      { stem: "Prevalenza 1%, sensibilità 95%, specificità 90%. P(malato | positivo) è circa:", options: ["95%", "50%", "9%", "1%"], correctIndex: 2, explanation: "0.0095 / 0.1085 ≈ 0.088." },
      { stem: "Se A e B sono indipendenti allora:", options: ["P(A|B) = P(B)", "P(A|B) = P(A)", "P(A e B) = 0", "P(A) + P(B) = 1"], correctIndex: 1, explanation: "Sapere B non cambia la probabilità di A." },
      { stem: "Estrazioni senza reimmissione: quale distribuzione?", options: ["Binomiale", "Poisson", "Ipergeometrica", "Normale"], correctIndex: 2, explanation: "Le prove non sono indipendenti." },
      { stem: "Per N(mu, sigma^2), la frazione entro 2 sigma è circa:", options: ["68%", "90%", "95%", "99.7%"], correctIndex: 2, explanation: "Regola 68-95-99.7." },
    ],
    chats: [
      { title: "Esercizio 4.17 — tre urne", msgs: [
        ["user", "esercizio con tre urne: U1 ha 2 bianche 1 nera, U2 1 bianca 2 nere, U3 3 bianche. scelgo un'urna a caso ed estraggo bianca. prob che sia U3?"],
        ["assistant", "Applica Bayes con la partizione {U1, U2, U3}, ciascuna con prior 1/3.\n\n**Verosimiglianze:** P(B|U1) = 2/3, P(B|U2) = 1/3, P(B|U3) = 1.\n\n**Probabilità totale:** P(B) = (1/3)(2/3 + 1/3 + 1) = (1/3)(2) = 2/3.\n\n**Posterior:** P(U3|B) = (1 · 1/3) / (2/3) = **1/2**.\n\nIntuizione: U3 dà bianca sempre, quindi \"pesa\" il doppio di U1 e il triplo di U2 nell'evidenza."],
        ["user", "ahh io avevo messo 1/3 al numeratore senza moltiplicare per la verosimiglianza. grazie"],
      ] },
    ],
  },
  membrane: {
    extraNodes: [
      ["primary-active", "Na+/K+-ATPase", "Primary active transport: 3 Na+ out, 2 K+ in per ATP.", [1]],
      ["endocytosis", "Receptor-mediated endocytosis", "Clathrin-coated pits; LDL uptake; defective in familial hypercholesterolaemia.", [2]],
      ["cftr", "CFTR and cystic fibrosis", "Defective Cl- channel -> thick mucus.", [2]],
    ],
    cards: [
      { q: "What crosses the bilayer by simple diffusion?", a: "Small non-polar molecules: O2, CO2, steroid hormones." },
      { q: "Channel vs carrier protein?", a: "Channels: water-filled pores, very fast. Carriers: bind and change shape, saturate (Vmax, Km)." },
      { q: "RBC in hypotonic solution?", a: "Water enters, the cell swells and may lyse." },
      { q: "Stoichiometry of the Na+/K+ pump?", a: "3 Na+ out, 2 K+ in per ATP." },
      { q: "How does SGLT1 move glucose uphill?", a: "Secondary active symport: couples 2 Na+ moving down their gradient." },
      { q: "Cause of cystic fibrosis?", a: "Mutations in CFTR, a chloride channel." },
    ],
    quiz: [
      { stem: "Which transport mode saturates at high substrate concentration?", options: ["Simple diffusion", "Carrier-mediated transport", "Osmosis", "Diffusion of O2"], correctIndex: 1, explanation: "Finite number of carriers -> Vmax." },
      { stem: "Omeprazole targets:", options: ["Na+/K+-ATPase", "H+/K+-ATPase", "Ca2+-ATPase", "GLUT2"], correctIndex: 1, explanation: "The gastric proton pump." },
      { stem: "Glucose exits intestinal cells to the blood via:", options: ["SGLT1", "GLUT2", "Na+/K+ pump", "Endocytosis"], correctIndex: 1, explanation: "Facilitated diffusion on the basolateral side." },
      { stem: "LDL is taken up by:", options: ["Phagocytosis", "Pinocytosis", "Receptor-mediated endocytosis", "Exocytosis"], correctIndex: 2, explanation: "Clathrin-coated pits with LDL receptors." },
    ],
    chats: [
      { title: "SGLT1: why 2 Na+?", msgs: [
        ["user", "why does SGLT1 need two sodium ions per glucose and not one?"],
        ["assistant", "Energy budget. Glucose in the enterocyte can be much more concentrated than in the lumen, so moving it in is uphill. Each Na+ moving in releases free energy (concentration gradient **plus** the negative membrane potential).\n\nOne Na+ only provides enough to concentrate glucose ~100-fold; **two** Na+ square that, allowing ~10 000-fold accumulation. That lets the gut absorb glucose almost completely even when lumen levels are low.\n\nThe notes don't derive this, so it's a good one to confirm in office hours as you planned."],
      ] },
    ],
  },
  calculus: {
    extraNodes: [
      ["chain-rule", "Chain rule", "d/dx f(g(x)) = f'(g(x)) g'(x).", [1]],
      ["riemann-sums", "Riemann sums", "Definite integral as limit of sums of f(x_k) Delta x.", [1]],
      ["lagrange-remainder", "Lagrange remainder", "Error bound for a truncated Taylor polynomial.", [2]],
    ],
    cards: [
      { q: "Definition of derivative", a: "f'(x) = lim h->0 [f(x+h) - f(x)] / h." },
      { q: "Chain rule", a: "d/dx f(g(x)) = f'(g(x)) g'(x)." },
      { q: "FTC part II", a: "Integral from a to b of f = F(b) - F(a) for any antiderivative F." },
      { q: "Maclaurin series of sin x", a: "sum (-1)^n x^(2n+1)/(2n+1)!" },
      { q: "Why must Phi(x) be computed numerically?", a: "exp(-x^2/2) has no elementary antiderivative." },
    ],
    quiz: [
      { stem: "Tangent to y = x^2 at x = 3:", options: ["y = 6x - 9", "y = 3x", "y = 6x + 9", "y = 2x - 3"], correctIndex: 0, explanation: "y = 2ax - a^2 with a = 3." },
      { stem: "d/dx sin(x^2) =", options: ["cos(x^2)", "2x cos(x^2)", "2 sin x cos x", "-2x cos(x^2)"], correctIndex: 1, explanation: "Chain rule." },
      { stem: "The inflection points of the standard normal density are at:", options: ["x = 0", "x = +/-1", "x = +/-2", "none"], correctIndex: 1, explanation: "Second derivative changes sign at +/- sigma." },
      { stem: "Increasing the degree of a Taylor polynomial:", options: ["Improves accuracy everywhere", "Improves accuracy inside the radius of convergence", "Never changes accuracy", "Always diverges"], correctIndex: 1, explanation: "Outside the radius it still diverges." },
    ],
    chats: [
      { title: "Integral of the bell curve", msgs: [
        ["user", "how do we know the integral of the normal density is 1 if there's no antiderivative"],
        ["assistant", "Neat trick (Gauss/Poisson): square it.\n\nI² = ∫∫ e^(-(x²+y²)/2) dx dy over the plane. Switch to polar coordinates: x²+y² = r², dx dy = r dr dθ. Now the r factor gives you an antiderivative!\n\nI² = ∫₀^{2π} ∫₀^∞ e^(-r²/2) r dr dθ = 2π · 1, so I = √(2π). Dividing by √(2π) in φ(x) normalises it to 1.\n\nNot in your notes — it's the classic argument from Analisi 2."],
      ] },
    ],
  },
  physics: {
    extraNodes: [
      ["energy-conservation", "Energy on the incline", "v = sqrt(2gh) on a frictionless slope, independent of angle.", [1]],
      ["damping-resonance", "Damping and resonance", "Exponential amplitude decay; resonance at omega = omega_0.", [1]],
      ["drag", "Air drag", "Linear at low Reynolds, quadratic at high speed; asymmetric trajectories.", [2]],
    ],
    cards: [
      { q: "Acceleration down a frictionless incline?", a: "a = g sin(theta)." },
      { q: "Critical angle for a block to start sliding?", a: "theta_c = arctan(mu)." },
      { q: "Period of a simple pendulum (small angles)?", a: "T = 2 pi sqrt(L/g)." },
      { q: "Range of a projectile on level ground?", a: "R = v0^2 sin(2 alpha)/g, max at 45 degrees." },
      { q: "Why is the final speed on a frictionless slope angle-independent?", a: "Energy conservation: mgh = (1/2)mv^2 depends only on height." },
    ],
    quiz: [
      { stem: "Doubling the length of a pendulum multiplies its period by:", options: ["2", "sqrt(2)", "1/2", "4"], correctIndex: 1, explanation: "T ∝ sqrt(L)." },
      { stem: "Launch angles giving the same range as 30 degrees:", options: ["45", "60", "15", "75"], correctIndex: 1, explanation: "sin(2·30) = sin(2·60)." },
      { stem: "With mu = 0.3, the critical angle is about:", options: ["17 deg", "30 deg", "45 deg", "73 deg"], correctIndex: 0, explanation: "arctan(0.3) ≈ 16.7°." },
      { stem: "Quadratic air drag makes the trajectory:", options: ["Symmetric", "Asymmetric with shorter range", "Longer", "Circular"], correctIndex: 1, explanation: "Descent is steeper than ascent." },
    ],
    chats: [
      { title: "Why 45 degrees?", msgs: [
        ["user", "why is max range at 45 degrees intuitively"],
        ["assistant", "Range = (horizontal speed) × (time in the air).\n\n- Steeper angle → longer flight but slower horizontally.\n- Flatter angle → fast horizontally but lands quickly.\n\nThe product v0 cos α · 2v0 sin α / g = v0² sin 2α / g is maximised when sin 2α = 1, i.e. **α = 45°** — the best compromise. Your graph tag on page 2 shows the curve peaking there."],
      ] },
    ],
  },
  thermo: {
    extraNodes: [
      ["second-law-statements", "Kelvin-Planck & Clausius", "Two equivalent statements of the second law.", [1]],
      ["entropy-generation", "Entropy generation", "Friction, finite-Delta-T heat transfer, free expansion, mixing.", [1]],
      ["third-law", "Third law", "S -> 0 for a perfect crystal as T -> 0.", [2]],
    ],
    cards: [
      { q: "Carnot efficiency?", a: "1 - Tc/Th, temperatures in kelvin." },
      { q: "Definition of entropy change?", a: "dS = dQ_rev / T." },
      { q: "Second law for isolated systems?", a: "Delta S >= 0, equality only for reversible processes." },
      { q: "Boltzmann formula?", a: "S = k_B ln W." },
      { q: "Spontaneity at constant T, p?", a: "Delta G < 0 with G = H - TS." },
    ],
    quiz: [
      { stem: "Max efficiency between 600 K and 300 K:", options: ["25%", "50%", "67%", "100%"], correctIndex: 1, explanation: "1 - 300/600." },
      { stem: "Which is NOT a source of entropy generation?", options: ["Friction", "Free expansion", "Reversible isothermal compression", "Mixing"], correctIndex: 2, explanation: "Reversible processes generate none." },
      { stem: "COP of a fridge is defined as:", options: ["W/Qc", "Qc/W", "Qh/Qc", "1 - Tc/Th"], correctIndex: 1, explanation: "Heat removed per work input." },
      { stem: "ATP hydrolysis can drive unfavourable reactions because:", options: ["It raises temperature", "Coupled Delta G is negative", "It lowers entropy", "It is reversible"], correctIndex: 1, explanation: "Coupling makes total Delta G < 0." },
    ],
    chats: [],
  },
  anatomy: {
    extraNodes: [
      ["cardiac-valves", "Cardiac valves", "Tricuspid, mitral, pulmonary and aortic valves enforce one-way flow.", [1]],
      ["cardiac-cycle", "Cardiac cycle", "Systole and diastole; lub-dub from valve closure.", [1]],
      ["diabetes", "Diabetes mellitus", "Glucose in urine when renal threshold exceeded; microvascular damage.", [1]],
    ],
    cards: [
      { q: "Valve between right atrium and right ventricle?", a: "Tricuspid valve." },
      { q: "Natural pacemaker of the heart?", a: "The sinoatrial (SA) node in the right atrium wall." },
      { q: "Hormone from beta cells?", a: "Insulin — lowers blood glucose." },
      { q: "Hormones stored in the posterior pituitary?", a: "Oxytocin and ADH, made by hypothalamic neurons." },
      { q: "Conduction path after the AV node?", a: "Bundle of His, then Purkinje fibres." },
    ],
    quiz: [
      { stem: "Glucagon stimulates:", options: ["Glycogen synthesis", "Glycogenolysis and gluconeogenesis", "Insulin release", "Glucose excretion"], correctIndex: 1, explanation: "It raises blood glucose during fasting." },
      { stem: "The pituitary sits in the:", options: ["Foramen magnum", "Sella turcica", "Mediastinum", "Medulla"], correctIndex: 1, explanation: "Of the sphenoid bone." },
      { stem: "Lesion of the nucleus tractus solitarius abolishes:", options: ["Baroreceptor reflexes", "Insulin release", "Vision", "Hearing"], correctIndex: 0, explanation: "NTS integrates baroreceptor input." },
      { stem: "Which valve guards the exit to the aorta?", options: ["Mitral", "Tricuspid", "Aortic semilunar", "Pulmonary"], correctIndex: 2, explanation: "Semilunar valves guard the great arteries." },
    ],
    chats: [
      { title: "Why is the left ventricle thicker?", msgs: [
        ["user", "why is the left ventricle wall thicker than the right"],
        ["assistant", "Because it pumps into the **systemic** circulation — the whole body — against a much higher pressure (≈120 mmHg systolic) than the right ventricle faces in the pulmonary circuit (≈25 mmHg). By Laplace's law more pressure needs more wall tension, so the muscle hypertrophies to cope. Same stroke volume, ~5× the pressure."],
      ] },
    ],
  },
  enzyme: {
    extraNodes: [
      ["competitive-inhibition", "Competitive inhibition", "Raises apparent Km, Vmax unchanged; lines cross on y-axis.", [1]],
      ["kcat-km", "Specificity constant", "kcat/Km, diffusion-limited near 10^8–10^9 M^-1 s^-1.", [1]],
      ["irreversible-inhibition", "Irreversible inhibitors", "Covalent: aspirin on COX, penicillin on transpeptidase.", [2]],
    ],
    cards: [
      { q: "What is Km?", a: "The [S] at which v0 = Vmax/2." },
      { q: "Competitive inhibitor effect on Km and Vmax?", a: "Km up (apparent), Vmax unchanged." },
      { q: "Uncompetitive inhibitor effect?", a: "Both Km and Vmax decrease." },
      { q: "Lineweaver-Burk intercepts?", a: "y = 1/Vmax, x = -1/Km, slope Km/Vmax." },
      { q: "Why are allosteric curves sigmoidal?", a: "Cooperativity between subunits." },
    ],
    quiz: [
      { stem: "Methanol poisoning is treated with ethanol because ethanol:", options: ["Is a non-competitive inhibitor", "Competes for alcohol dehydrogenase", "Denatures the enzyme", "Activates catalase"], correctIndex: 1, explanation: "Classic competitive inhibition." },
      { stem: "On a Lineweaver-Burk plot a competitive inhibitor:", options: ["Changes the y-intercept", "Changes the slope only", "Shifts lines parallel", "Has no effect"], correctIndex: 1, explanation: "Lines intersect on the y-axis." },
    ],
    chats: [],
  },
  chemistry: {
    extraNodes: [["vsepr", "VSEPR theory", "Electron-pair repulsion predicts molecular geometry.", [1]]],
    cards: [
      { q: "H–C–H angle in methane?", a: "About 109.5 degrees (tetrahedral)." },
      { q: "Why is water bent?", a: "Two lone pairs on oxygen compress the angle to 104.5 degrees." },
      { q: "Hückel's rule?", a: "Planar, cyclic, conjugated with 4n+2 pi electrons -> aromatic." },
    ],
    quiz: [],
    chats: [],
  },
  costituzione: { extraNodes: [], cards: [], quiz: [], chats: [] },
  micro: { extraNodes: [], cards: [], quiz: [], chats: [] },
};
