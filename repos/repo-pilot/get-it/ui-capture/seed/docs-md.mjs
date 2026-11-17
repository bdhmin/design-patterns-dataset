// Study notes the seeded student uploaded as Markdown (rendered to PDF by the
// app's own /api/upload Markdown importer). Plain WinAnsi text only — the
// importer uses Helvetica, so no Greek letters / arrows.
export const MD_DOCS = [
  {
    file: "Neurophysiology - Action Potential & Synaptic Transmission.md",
    md: `# Neurophysiology — Action Potential and Synaptic Transmission

*Lecture notes, Fisiologia (Prof. Bianchi), week 6. Rewritten from slides + Guyton ch. 5.*

## 1. Resting membrane potential

At rest the inside of a neuron sits at roughly -70 mV relative to the extracellular fluid. Two things set this value. First, the **sodium-potassium pump** (Na+/K+-ATPase) moves 3 Na+ out and 2 K+ in for every ATP it hydrolyses, building steep concentration gradients. Second, the resting membrane is far more permeable to K+ than to Na+, because many potassium leak channels are open. Potassium therefore diffuses out until the electrical pull back inward balances the chemical push outward.

The equilibrium potential of a single ion is given by the **Nernst equation**: E = (RT / zF) ln([ion]out / [ion]in). For K+ at body temperature this gives about -90 mV; for Na+ about +60 mV. The real resting potential lies between them, much closer to E_K, and is described by the Goldman-Hodgkin-Katz equation, which weights each ion by its permeability.

## 2. The action potential

When a stimulus depolarises the axon hillock past the **threshold of about -55 mV**, voltage-gated sodium channels open in a positive feedback loop. Na+ rushes in and the membrane potential overshoots to about +30 to +40 mV within half a millisecond. This is the rising phase.

Two things then end the spike. The sodium channels inactivate (the inactivation gate swings shut), and the slower voltage-gated potassium channels open. K+ leaves the cell and the membrane repolarises, briefly undershooting to around -80 mV: the **after-hyperpolarisation**.

The action potential is **all-or-none**: once threshold is crossed, the amplitude does not depend on how strong the stimulus was. Intensity is encoded instead in the *frequency* of firing.

### Refractory periods

During the absolute refractory period no second spike can be generated, because the sodium channels are still inactivated. During the relative refractory period a spike is possible but needs a stronger stimulus. Refractoriness is what makes propagation one-directional along the axon.

## 3. Propagation and myelin

In unmyelinated fibres the depolarisation spreads to the neighbouring patch of membrane and regenerates the spike continuously, which is slow (0.5-2 m/s). In myelinated fibres the Schwann cells (PNS) or oligodendrocytes (CNS) wrap the axon in an insulating sheath, and voltage-gated channels cluster at the **nodes of Ranvier**. The spike jumps from node to node — **saltatory conduction** — reaching up to 120 m/s. Demyelinating diseases such as multiple sclerosis slow or block this conduction.

Conduction velocity also increases with axon diameter, because a wider axon has lower internal resistance (length constant grows with the square root of diameter).

## 4. The chemical synapse

When the spike reaches the presynaptic terminal, voltage-gated Ca2+ channels open. The calcium influx triggers SNARE-mediated fusion of synaptic vesicles with the membrane and the release of neurotransmitter into the cleft (about 20 nm wide). This step accounts for most of the **synaptic delay of roughly 0.5 ms**.

The transmitter binds receptors on the postsynaptic membrane:

- Ionotropic receptors are ligand-gated channels: fast (ms). Example: nicotinic ACh receptor at the neuromuscular junction, AMPA receptors for glutamate.
- Metabotropic receptors act through G-proteins and second messengers: slower but longer lasting. Example: muscarinic ACh receptors in the heart.

An **EPSP** (excitatory postsynaptic potential) depolarises the cell, an **IPSP** hyperpolarises it, typically via Cl- channels opened by GABA or glycine. A single EPSP is small (about 0.5 mV); the neuron fires only when **temporal and spatial summation** of many inputs at the axon hillock pushes it past threshold.

## 5. Termination of the signal

The signal must be switched off quickly. Acetylcholine is hydrolysed by acetylcholinesterase in the cleft; monoamines like serotonin and dopamine are taken back up by transporters (the target of SSRIs). Nerve agents and some insecticides block acetylcholinesterase, which causes continuous stimulation and paralysis.

*Exam tip from Bianchi: be able to draw the AP and label which channel is responsible for each phase. He asked this two years in a row.*
`,
  },
  {
    file: "Cell Biology L07 - Membrane Transport.md",
    md: `# Cell Biology — Lecture 7: Membrane Transport

## The plasma membrane as a barrier

The plasma membrane is a **phospholipid bilayer** about 5 nm thick with embedded proteins, cholesterol and glycolipids — the fluid mosaic model of Singer and Nicolson (1972). Its hydrophobic core lets small non-polar molecules such as O2, CO2 and steroid hormones cross freely, but blocks ions and large polar molecules like glucose. Everything else needs a protein.

## Passive transport

Passive transport always moves solutes *down* their electrochemical gradient and costs no ATP.

- **Simple diffusion**: directly through the lipid bilayer. Rate is proportional to the concentration difference (Fick's law: J = -D dC/dx).
- **Facilitated diffusion through channel proteins**: water-filled pores, very fast (up to 10^8 ions per second), often gated by voltage, ligands or mechanical stretch. Aquaporins are channels for water.
- **Facilitated diffusion through carrier proteins**: the carrier binds the solute and changes shape. Because the number of carriers is finite, the rate **saturates** — it follows Michaelis-Menten-like kinetics with a Vmax and a Km. GLUT transporters for glucose are the classic example.

### Osmosis

Water moves across a semipermeable membrane from low solute concentration to high solute concentration. A red blood cell placed in a **hypotonic** solution swells and can lyse; in a **hypertonic** solution it shrinks (crenation); in an **isotonic** solution (0.9% NaCl) it keeps its shape. Osmotic pressure is given by the van 't Hoff relation, pi = iCRT.

## Active transport

**Primary active transport** uses ATP directly. The **Na+/K+-ATPase** pumps 3 Na+ out and 2 K+ in per ATP and consumes up to a third of a resting cell's energy. Other P-type pumps include the Ca2+-ATPase of the sarcoplasmic reticulum and the H+/K+-ATPase in the stomach (the target of omeprazole).

**Secondary active transport** uses the gradient created by a primary pump. In the small intestine the **SGLT1 symporter** carries two Na+ ions down their gradient and one glucose molecule up its gradient into the epithelial cell. Glucose then leaves the cell on the blood side through GLUT2 by facilitated diffusion. Antiporters work the same way but move the two species in opposite directions, like the Na+/Ca2+ exchanger in cardiac muscle.

## Bulk transport

Large particles are moved by vesicles.

1. **Endocytosis**: phagocytosis (cell eating — e.g. macrophages engulfing bacteria), pinocytosis (cell drinking) and **receptor-mediated endocytosis** through clathrin-coated pits, which is how cells take up LDL cholesterol.
2. **Exocytosis**: secretory vesicles fuse with the plasma membrane, releasing hormones, enzymes or neurotransmitters.

## Clinical links

Cystic fibrosis is caused by mutations in CFTR, a chloride channel. Without functional CFTR, chloride secretion fails and water does not follow, leaving thick mucus in the lungs and pancreas. Familial hypercholesterolaemia is caused by defective LDL receptors, which block receptor-mediated endocytosis and raise plasma cholesterol.

*Question I still have: why does SGLT1 need two sodium ions per glucose and not one? Ask in office hours.*
`,
  },
  {
    file: "Biochem_Enzyme_Kinetics_notes.md",
    md: `# Biochemistry — Enzyme Kinetics

## Why enzymes matter

Enzymes are biological catalysts, almost always proteins, that speed up reactions by factors of 10^6 to 10^17 without being consumed. They do not change the equilibrium constant of a reaction: they lower the **activation energy** so that equilibrium is reached faster. The substrate binds at the **active site**, a small pocket whose shape and chemistry complement the transition state (induced-fit model, Koshland 1958).

## The Michaelis-Menten model

Consider the scheme E + S <-> ES -> E + P. Assuming the concentration of the ES complex stays roughly constant during the measurement (the **steady-state assumption**, Briggs and Haldane), the initial velocity is

v0 = Vmax [S] / (Km + [S])

- **Vmax** is the maximum rate, reached when every enzyme molecule is saturated with substrate. Vmax = kcat [E]total.
- **Km**, the Michaelis constant, is the substrate concentration at which v0 = Vmax / 2. A low Km means the enzyme reaches half-saturation at low substrate concentration, which is often read (loosely) as high affinity.
- **kcat**, the turnover number, is how many substrate molecules one active site converts per second. Carbonic anhydrase reaches about 10^6 per second.
- **kcat / Km** is the specificity constant. Its upper limit, around 10^8 to 10^9 per molar per second, is set by diffusion; enzymes near it are called catalytically perfect (e.g. triose phosphate isomerase).

The curve of v0 against [S] is a rectangular hyperbola: linear at low [S] (first-order kinetics) and flat at high [S] (zero-order kinetics).

## The Lineweaver-Burk plot

Taking the reciprocal of both sides gives a straight line:

1/v0 = (Km / Vmax)(1/[S]) + 1/Vmax

The y-intercept is 1/Vmax, the x-intercept is -1/Km, and the slope is Km/Vmax. The double-reciprocal plot is convenient for reading inhibition patterns but distorts the error at low substrate concentrations, so modern labs fit the hyperbola directly with non-linear regression.

## Enzyme inhibition

| Type | Binds | Effect on Km | Effect on Vmax |
|---|---|---|---|
| Competitive | free enzyme, at the active site | increases (apparent) | unchanged |
| Uncompetitive | ES complex only | decreases | decreases |
| Non-competitive (mixed) | E and ES equally | unchanged | decreases |

A **competitive inhibitor** resembles the substrate and can be outcompeted by adding more substrate; on a Lineweaver-Burk plot the lines cross on the y-axis. Methanol poisoning is treated by giving ethanol, which competes for alcohol dehydrogenase. Statins are competitive inhibitors of HMG-CoA reductase.

**Irreversible inhibitors** form covalent bonds with the enzyme. Aspirin acetylates a serine in cyclooxygenase; penicillin acylates the transpeptidase that builds bacterial cell walls.

## Allosteric regulation

Allosteric enzymes have multiple subunits and give a **sigmoidal** v0 vs [S] curve instead of a hyperbola, because binding at one site changes the affinity of the others (cooperativity). Phosphofructokinase-1, the main control point of glycolysis, is inhibited by ATP and citrate and activated by AMP and fructose-2,6-bisphosphate. Feedback inhibition — where the end product of a pathway inhibits the first committed step — keeps metabolic pathways from overproducing.

## Effect of temperature and pH

Rate increases with temperature until the protein begins to denature (most human enzymes peak near 37 C). Each enzyme has an optimal pH: pepsin works best around pH 2, trypsin around pH 8.
`,
  },
  {
    file: "Signals & Systems - Fourier Transform (lecture 12).md",
    md: `# Signals and Systems — Lecture 12: The Fourier Transform

## From series to transform

A periodic signal with period T can be written as a **Fourier series**: a sum of complex exponentials at integer multiples of the fundamental frequency f0 = 1/T. As T grows to infinity the spacing between harmonics shrinks to zero and the sum becomes an integral. That integral is the **continuous-time Fourier transform**:

X(f) = integral of x(t) e^(-j 2 pi f t) dt, over all t

and the inverse transform rebuilds the signal: x(t) = integral of X(f) e^(j 2 pi f t) df.

X(f) is in general complex. Its magnitude |X(f)| tells us how much of each frequency is present (the amplitude spectrum) and its angle tells us the phase.

## Key transform pairs

- A rectangular pulse of width T in time transforms to a **sinc function**, T sinc(fT), in frequency. Narrow pulse, wide spectrum.
- A Gaussian transforms to a Gaussian — the only shape that keeps its form.
- A pure cosine at f0 transforms to two impulses at +f0 and -f0.
- The Dirac delta in time has a flat spectrum: it contains every frequency equally.

## Properties we use constantly

1. **Linearity**: the transform of a sum is the sum of the transforms.
2. **Time shift**: delaying x(t) by t0 multiplies X(f) by e^(-j 2 pi f t0). Only the phase changes, never the magnitude.
3. **Scaling**: compressing a signal in time stretches its spectrum in frequency (time-bandwidth trade-off). This is the signal-processing version of the uncertainty principle.
4. **Convolution theorem**: convolution in time becomes multiplication in frequency. This is why we analyse LTI systems in the frequency domain: Y(f) = H(f) X(f), where H(f) is the frequency response of the system.
5. **Parseval's theorem**: the energy is the same in both domains.

## Sampling and aliasing

To store a signal digitally we sample it every Ts seconds. Sampling in time makes the spectrum periodic in frequency, with copies spaced by the sampling frequency fs = 1/Ts. If the signal is band-limited to B Hz and fs > 2B — the **Nyquist-Shannon sampling theorem** — the copies do not overlap and the original can be recovered with an ideal low-pass filter.

If fs is too low the copies overlap and high frequencies fold back as false low frequencies: **aliasing**. This is why wagon wheels seem to spin backwards in films and why audio is sampled at 44.1 kHz (just above twice the 20 kHz limit of human hearing). In practice an anti-aliasing filter is placed before the ADC.

## Application: ECG filtering

In the biomedical signals lab we record a single-lead ECG at fs = 500 Hz. Its spectrum shows the QRS energy between roughly 5 and 40 Hz, baseline wander below 0.5 Hz from breathing, and a sharp peak at 50 Hz from the mains. A band-pass filter (0.5-40 Hz) plus a notch at 50 Hz cleans the trace without distorting the QRS complex.

## Discrete Fourier Transform

On a computer we use the DFT of N samples, computed with the **FFT** in O(N log N) operations instead of O(N^2) (Cooley and Tukey, 1965). Frequency resolution is fs / N: longer recordings give finer resolution. Windowing (Hann, Hamming) reduces spectral leakage caused by cutting the signal abruptly.

*Lab 4 due Friday: compute and plot |X(f)| of the ECG before and after filtering.*
`,
  },
  {
    file: "Linear Algebra - Eigenvalues and Diagonalization.md",
    md: `# Linear Algebra — Eigenvalues, Eigenvectors and Diagonalization

## Definition

Let A be an n x n matrix. A non-zero vector v is an **eigenvector** of A with **eigenvalue** lambda if

A v = lambda v.

Geometrically, A does not change the direction of v: it only stretches it by a factor lambda (or flips it if lambda is negative). Every other vector gets rotated off its line.

## Finding eigenvalues

A v = lambda v means (A - lambda I) v = 0 has a non-zero solution, which happens exactly when A - lambda I is singular:

det(A - lambda I) = 0.

This is the **characteristic equation**. Its left side is a polynomial of degree n in lambda, the characteristic polynomial, so A has at most n eigenvalues (counting complex ones and multiplicity).

**Worked example.** A = [[2, 1], [1, 2]]. Then det(A - lambda I) = (2 - lambda)^2 - 1 = lambda^2 - 4 lambda + 3 = (lambda - 1)(lambda - 3). So lambda = 1 and lambda = 3. For lambda = 3: (A - 3I)v = 0 gives v = (1, 1). For lambda = 1: v = (1, -1).

Useful checks: the sum of the eigenvalues equals the **trace** of A (2 + 2 = 4 = 1 + 3) and their product equals the **determinant** (4 - 1 = 3 = 1 x 3).

## Algebraic and geometric multiplicity

The algebraic multiplicity of lambda is how many times it appears as a root of the characteristic polynomial. The geometric multiplicity is the dimension of its eigenspace, the null space of A - lambda I. Always: 1 <= geometric <= algebraic. When the geometric multiplicity is strictly smaller the matrix is called **defective**. Example: [[1, 1], [0, 1]] has lambda = 1 twice but only one independent eigenvector.

## Diagonalization

A is **diagonalizable** if there is an invertible matrix P such that

A = P D P^(-1)

with D diagonal. The columns of P are eigenvectors and the diagonal entries of D are the matching eigenvalues. A is diagonalizable if and only if it has n linearly independent eigenvectors. A sufficient condition: n distinct eigenvalues.

Why we care: powers become trivial. A^k = P D^k P^(-1), and D^k just raises each diagonal entry to the k. This makes long-run behaviour of systems like x(k+1) = A x(k) easy to read: the component along the eigenvector with the largest |lambda| dominates.

## Symmetric matrices — the spectral theorem

If A is real and symmetric (A = A^T) then all eigenvalues are real, eigenvectors of distinct eigenvalues are orthogonal, and A can always be diagonalized by an **orthogonal** matrix Q: A = Q D Q^T. Covariance matrices are symmetric, which is why principal component analysis (PCA) works: the eigenvectors are the principal directions and the eigenvalues are the variances along them.

## Applications seen in class

- **Markov chains**: the steady state of a transition matrix is the eigenvector with eigenvalue 1.
- **Google PageRank**: the ranking is the dominant eigenvector of the link matrix, found by the power method.
- **Systems of ODEs**: x' = A x has solutions of the form e^(lambda t) v; negative real parts mean the system is stable.
- **Vibrations**: the natural frequencies of a mass-spring system are the square roots of the eigenvalues of the stiffness matrix.

*Esercitazione 9: exercises 3, 5, 8, 11 — 8 is the defective one, check multiplicities carefully.*
`,
  },
  {
    file: "Probabilita e Statistica - Teorema di Bayes.md",
    md: `# Probabilità e Statistica — Probabilità condizionata e Teorema di Bayes

*Appunti dalla lezione del 14 ottobre + esercitazione. Corso di Statistica per l'Ingegneria Biomedica.*

## Probabilità condizionata

Dati due eventi A e B con P(B) > 0, la **probabilità condizionata** di A dato B è

P(A | B) = P(A e B) / P(B).

Intuitivamente: restringiamo lo spazio campionario ai soli esiti in cui B si è verificato e chiediamo quale frazione di essi appartiene anche ad A. Due eventi sono **indipendenti** se P(A | B) = P(A), cioè se sapere che B è accaduto non cambia nulla su A.

## Legge della probabilità totale

Se B1, B2, ..., Bn formano una partizione dello spazio campionario (eventi disgiunti la cui unione è tutto), allora

P(A) = somma su i di P(A | Bi) P(Bi).

È lo strumento per calcolare una probabilità "spezzandola" nei vari scenari possibili.

## Teorema di Bayes

Combinando le due formule otteniamo il **teorema di Bayes**:

P(Bi | A) = P(A | Bi) P(Bi) / somma su j di P(A | Bj) P(Bj).

- P(Bi) è la probabilità **a priori** (prior): quello che sappiamo prima di osservare A.
- P(A | Bi) è la **verosimiglianza** (likelihood).
- P(Bi | A) è la probabilità **a posteriori**: la nostra convinzione aggiornata dopo l'osservazione.

## Esempio classico: il test diagnostico

Una malattia ha prevalenza dell'1% nella popolazione. Un test ha **sensibilità** del 95% (P(positivo | malato) = 0.95) e **specificità** del 90% (P(negativo | sano) = 0.90). Un paziente risulta positivo: qual è la probabilità che sia davvero malato?

P(positivo) = 0.95 x 0.01 + 0.10 x 0.99 = 0.0095 + 0.099 = 0.1085

P(malato | positivo) = 0.0095 / 0.1085, circa 0.088, cioè **meno del 9%**.

Il risultato sorprende quasi tutti: anche con un test "buono", quando la malattia è rara la maggior parte dei positivi sono **falsi positivi**. Questa quantità si chiama **valore predittivo positivo** (VPP) e dipende fortemente dalla prevalenza. Per questo i test di screening vengono seguiti da un secondo test più specifico.

## Variabili aleatorie: richiamo veloce

- **Bernoulli**: un solo esperimento con successo (p) o insuccesso (1 - p).
- **Binomiale** B(n, p): numero di successi in n prove indipendenti. Media np, varianza np(1 - p).
- **Poisson** con parametro lambda: conteggi di eventi rari in un intervallo (es. numero di battiti ectopici in un'ora). Media e varianza entrambe uguali a lambda.
- **Normale** N(mu, sigma^2): la campana. Circa il 68% dei valori cade entro una deviazione standard dalla media, il 95% entro due, il 99.7% entro tre.

## Errori tipici all'esame

1. Confondere P(A | B) con P(B | A) — la "fallacia del procuratore".
2. Dimenticare il termine dei falsi positivi nel denominatore.
3. Usare la binomiale quando le prove non sono indipendenti (estrazioni senza reimmissione: serve l'ipergeometrica).

*Da rifare: esercizi 4.12 e 4.17 del Ross, quello con le tre urne non mi torna.*
`,
  },
  {
    file: "Thermodynamics ch4 - Entropy and the Second Law.md",
    md: `# Thermodynamics — Chapter 4: Entropy and the Second Law

## Why a second law?

The first law says energy is conserved: dU = dQ - dW. It allows a cold cup of coffee to spontaneously heat up by cooling the room, as long as the energy balances. It never happens. The **second law** tells us which direction processes go.

Two classical statements, which can be shown to be equivalent:

- **Kelvin-Planck**: no cyclic device can convert heat from a single reservoir entirely into work.
- **Clausius**: heat does not flow spontaneously from a colder body to a hotter body.

## Heat engines and the Carnot limit

A heat engine takes heat Qh from a hot reservoir at Th, produces work W, and rejects Qc to a cold reservoir at Tc. Its efficiency is eta = W / Qh = 1 - Qc / Qh.

The most efficient possible engine operating between two temperatures is the reversible **Carnot cycle**: two isothermal and two adiabatic steps. Its efficiency depends only on the temperatures (in kelvin):

eta_Carnot = 1 - Tc / Th.

A power plant with steam at 600 K rejecting to a river at 300 K can never exceed 50% efficiency, no matter how good the engineering. Real plants reach 35-45%.

Refrigerators and heat pumps run the cycle backwards. Their performance is measured by the coefficient of performance, COP = Qc / W for a fridge.

## Entropy

Clausius defined a new state function, **entropy**, through its change along a reversible path:

dS = dQ_rev / T.

Because S is a state function, the change between two states is the same for any path, even irreversible ones — we just have to compute it along an imagined reversible path. For an ideal gas: Delta S = n Cv ln(T2/T1) + n R ln(V2/V1).

The second law in its most compact form: for an isolated system, **Delta S >= 0**. The equality holds only for reversible processes; every real (irreversible) process generates entropy. Friction, heat transfer across a finite temperature difference, free expansion and mixing are all sources of entropy generation.

## Statistical interpretation

Boltzmann connected entropy to the number of microscopic arrangements W compatible with a macroscopic state:

S = k_B ln W

where k_B = 1.38 x 10^-23 J/K. A gas spreading through a container is not "forced" to spread: there are overwhelmingly more microstates with the gas spread out than with the gas bunched in one corner. The arrow of time is a statement about probability.

## Free energy and spontaneity

At constant temperature and pressure — the conditions of most chemistry and biology — the useful criterion is the **Gibbs free energy**, G = H - TS. A process is spontaneous when Delta G < 0. This is why ATP hydrolysis (Delta G about -30.5 kJ/mol under standard conditions) can drive unfavourable reactions in the cell when the two are coupled.

## Third law

The entropy of a perfect crystal approaches zero as the temperature approaches absolute zero. A consequence is that 0 K can never actually be reached in a finite number of steps.

*Problem set 4 due Nov 3 — problems 4.7 (Carnot fridge) and 4.15 (mixing entropy) are the long ones.*
`,
  },
  {
    file: "Microeconomia - Domanda e Offerta.md",
    md: `# Microeconomia — Domanda, offerta ed equilibrio di mercato

*Corso a scelta, Economia e Organizzazione Aziendale. Appunti dal libro (Mankiw cap. 4-6).*

## La curva di domanda

La **legge della domanda** afferma che, a parità di altre condizioni, quando il prezzo di un bene aumenta la quantità domandata diminuisce. La curva di domanda è quindi inclinata negativamente nel piano prezzo-quantità.

Bisogna distinguere tra un **movimento lungo la curva** (causato da una variazione del prezzo del bene stesso) e uno **spostamento della curva**, causato da:

- reddito dei consumatori (per i beni normali la domanda aumenta con il reddito, per i beni inferiori diminuisce);
- prezzi dei beni correlati (sostituti come caffè e tè, complementi come stampanti e cartucce);
- gusti e preferenze, aspettative, numero di acquirenti.

## La curva di offerta

La **legge dell'offerta**: a prezzi più alti le imprese sono disposte a produrre e vendere quantità maggiori, quindi la curva di offerta è inclinata positivamente. Si sposta quando cambiano i costi degli input, la tecnologia, le aspettative o il numero di venditori.

## Equilibrio di mercato

L'**equilibrio** si trova dove la curva di domanda incontra quella di offerta: al prezzo di equilibrio P* la quantità domandata è uguale alla quantità offerta Q*. Se il prezzo è sopra P* c'è un **eccesso di offerta** (surplus) e i venditori abbassano i prezzi; se è sotto c'è un **eccesso di domanda** (scarsità) e il prezzo sale.

Esempio numerico dal libro: domanda Qd = 100 - 2P, offerta Qs = 20 + 2P. Uguagliando: 100 - 2P = 20 + 2P, quindi P* = 20 e Q* = 60.

## Elasticità

L'**elasticità della domanda rispetto al prezzo** misura quanto la quantità domandata reagisce al prezzo:

E = (variazione % della quantità) / (variazione % del prezzo).

- |E| > 1: domanda **elastica** (beni di lusso, beni con molti sostituti).
- |E| < 1: domanda **anelastica** (benzina nel breve periodo, farmaci salvavita, sigarette).

L'elasticità determina l'effetto di un aumento di prezzo sulla **spesa totale**: se la domanda è anelastica il ricavo totale aumenta, se è elastica diminuisce.

## Interventi pubblici

- **Prezzo massimo** (price ceiling) sotto l'equilibrio, ad esempio un tetto agli affitti: crea scarsità persistente e code.
- **Prezzo minimo** (price floor) sopra l'equilibrio, ad esempio il salario minimo: può creare eccesso di offerta di lavoro.
- **Imposta**: crea un cuneo tra il prezzo pagato dai consumatori e quello ricevuto dai produttori. Chi sopporta l'onere dell'imposta (incidenza) non dipende da chi la versa formalmente, ma dalle elasticità relative: l'onere ricade di più sul lato del mercato meno elastico.

## Surplus e efficienza

Il **surplus del consumatore** è l'area sotto la curva di domanda e sopra il prezzo; il **surplus del produttore** è l'area sopra la curva di offerta e sotto il prezzo. In un mercato concorrenziale l'equilibrio massimizza il surplus totale. Un'imposta riduce il surplus totale più di quanto incassi lo Stato: la differenza è la **perdita secca** (deadweight loss).
`,
  },
];
