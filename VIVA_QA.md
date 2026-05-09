# Viva / Defense — Autism Behavior Therapy FYP

Multi-task ADOS prediction (Severity / Social Affect / RRB / Comparison Score) on the MMASD dataset, with a NestJS + React clinical workflow and a RAG-based therapy recommender.

This document contains likely viva questions and prepared answers grounded in the actual codebase (`model/`, `backend/`, `frontend/`).

---

## SECTION 1 — FRONTEND QUESTIONS

### Q1. Routing & auth guards
**Q.** Your `beforeLoad()` in `frontend/src/routes/router.tsx` reads `localStorage` for `token` / `userRole`. A user can set `localStorage.token = "anything"` in DevTools — what actually keeps them out of the therapist dashboard?

**A.** The client-side guard is a UX guard, not a security boundary. The real gate is the JWT verified on every request by `JwtAuthGuard` (`backend/src/modules/auth/`). A forged `localStorage` value lets the SPA render a route shell, but every API call carries the `Authorization: Bearer` header through `apiClient.ts`; an invalid/forged token fails JWT signature verification on Nest, returns 401, and the screens render no data. So client-side routing is purely to avoid a confusing flash of empty UI for unauthenticated users.

**Follow-up — what about silent JWT expiry mid-session?** `apiClient.ts` throws `ApiError` on non-2xx; React Query surfaces it as `error`. Where we catch 401 we redirect to `/login` and clear localStorage + cookies. Components that don't explicitly check 401 will just show an empty state — that is a known weakness; the right fix is an axios/fetch interceptor on 401 that performs global logout.

---

### Q2. Token storage (localStorage + cookie dual-write)
**Q.** Why both? Isn't dual writing strictly worse than picking one?

**A.** Two reasons: (1) Some embedded webviews/incognito sessions block `localStorage` but allow cookies, so the cookie acts as a fallback (`getAuthToken()` falls back if localStorage returns null). (2) Cookies with `credentials: 'include'` allow same-site requests when the user opens the app from a deep link before localStorage hydrates.

**The honest weakness:** the cookie is *not* `HttpOnly` (it's set client-side via `document.cookie`), so XSS can still exfiltrate the token. The defensible design would be a backend-issued `HttpOnly; Secure; SameSite=Strict` cookie + a CSRF token; we did not do that because the FYP scope and dev-time HTTP CORS made it harder to debug. For a production clinical system handling minors' data, this is the single biggest auth hardening I'd do next.

---

### Q3. Guided video recording (`GuidedVideoRecording.tsx`)
**Q.** Why these 11 specific actions? What stops a caregiver from recording the wrong action?

**A.** The 11 actions (arm_swing_L/R, body_swing, chest_expansion, sing_and_clap, dance, desk_study, frog_pose, letter_recall, tree_pose, twist_pose) are the **MMASD action vocabulary** — they are the only labels the model has seen during training, so the action ID is implicitly an input distribution constraint. We pass the action label alongside the video so the backend can route it as metadata.

**What if the caregiver records the wrong action?** Today: nothing detects it; the video is processed as if the labelled action were performed. Two failure modes follow — (a) pose-derived behavioural features (e.g., hand-hand distance for `sing_and_clap`) become noise, (b) ensemble averaging silently absorbs the noise. The right mitigation is an **action recognition classifier** in front of the multi-task head; we treat that as future work.

---

### Q4. Polling video session status every 3s
**Q.** With 50 caregivers polling concurrently you generate 1000 req/min just for status. Why didn't you use SSE/WebSockets?

**A.** Pragmatic trade-off. TanStack Query made `refetchInterval` trivially correct (auto-paused on tab blur, automatic stop when no session is `processing`). A WebSocket would require a session→user fan-out registry, reconnection logic, and a second auth path — non-trivial work for a status that updates 1–3 times per video. The 3s interval applies *only* while at least one session is `processing`; once everything is `completed`, polling stops. For production scale we'd switch to SSE on the same JWT.

---

## SECTION 2 — BACKEND QUESTIONS

### Q5. Why is the ML model a separate Python service?
**Q.** Why not embed the model in Node?

**A.** Three concrete reasons: (1) **PyTorch + OpenPose + Simple-ROMP have no production-grade Node bindings**; calling Python from Node would require subprocess shelling per request, which is slower and harder to monitor than a long-lived FastAPI process. (2) **Model warm-up is expensive** (loading 2D + 3D weights, MediaPipe graph, BGE reranker) — a persistent Python process amortises that across requests. (3) **Independent scaling**: the Nest API is I/O bound; the model service is CPU/GPU bound — separating them lets us scale each on different hardware.

**Cost of double-marshalling the MP4?** Real. A 50 MB upload travels browser→Nest→FastAPI. We accept it because Nest enforces auth, validation, multer limits, encryption metadata, and audit logging *before* the file ever touches the model. Bypassing Nest would re-implement auth and audit on the Python side.

**If the Python service is down?** `predict.service.ts` retries 3× with exponential backoff (max 10s). Idempotency is enforced because each request is bound to a `VideoSession._id`; if the same session is retried, the Python side overwrites the same `Prediction` document — duplicates are prevented by the session FK.

---

### Q6. Patient PII encryption
**Q.** Where is the encryption key, can you query encrypted fields, and what is the rotation strategy?

**A.** The key lives in `process.env.ENCRYPTION_KEY` (loaded at boot by `ConfigModule`). In dev it's a `.env` file; in production it should be an external secret store (AWS KMS / Vault). The Mongoose `pre('save')` hook encrypts marked fields with AES; the `post('init')` hook decrypts on read.

**Querying encrypted fields:** correctly impossible with deterministic AES with a random IV — `$regex` and range queries don't work. We work around this in two ways: (a) fields used for filtering (e.g., `status`, `severity` summary on `VideoSession.ensemblePrediction`) are kept **plaintext** because the high-cardinality clinical fields stay encrypted; (b) when a therapist filters by encrypted attributes, we fetch a small candidate set by therapistId and decrypt in memory — this is acceptable at the FYP scale (hundreds of patients per therapist), not at the millions.

**Rotation strategy:** the schema includes a `v1:` prefix on encrypted blobs so we can detect the cipher version. A rotation job would read+decrypt with the old key, encrypt with the new key, and bump the prefix to `v2:`. We have not implemented the migration script; that is documented as future work.

---

### Q7. JWT auth — no refresh tokens
**A.** Conscious trade-off. Refresh tokens add complexity (rotation, revocation list, stolen-refresh detection) that didn't fit the FYP timeline. Instead we issue a single JWT with a moderate expiry (1d) signed by `process.env.JWT_SECRET`. Token leakage means the attacker has up to 24h of access — mitigated by limiting blast radius (RBAC checks on every controller) and audit logging on sensitive actions.

**Therapist approval brute force:** the registration flow has a 3-attempt limit before the account is locked into `REJECTED`. Approval itself is a manual admin action — there is no externally exploitable approval endpoint without an admin JWT.

---

### Q8. Video session state machine
**Q.** What enforces that `published` cannot revert to `processing`?

**A.** The transition is enforced in `clinical.service.ts` — every state mutation goes through a method that checks the current `status` value and throws `BadRequestException` on illegal transitions. There is no raw `findByIdAndUpdate({status:...})` exposed via the API. The DB does not enforce the invariant (Mongo has no triggers), so an operator with direct DB access *could* break it; that is an accepted risk.

**Double-click on Approve:** prevented by the same guard — the second call sees `status !== pending_review` and returns 409. There is also a frontend mutation lock (TanStack Query disables the button while pending). A simultaneous race could still produce two predictions; if it ever surfaces in production we'd add a Mongo unique index on `{sessionId, status:'processing'}`.

---

### Q9. File storage and encryption-at-rest
**A.** Videos go to `/uploads/Videos/{uuid}` on disk. The `VideoSession` schema fields `encryptionKeyPattern`, `encryptionIV`, `encryptionAuthTag` are reserved for AES-GCM file encryption. **Honest disclosure:** the writing path currently stores plaintext MP4 — those fields exist for a planned encryption pass and the schema is forward-compatible.

**Multi-instance scaling:** local-disk storage breaks immediately behind a load balancer because instance B can't read instance A's video. Production fix: S3 / Azure Blob with signed URLs. We chose disk for the FYP so the demo works offline.

---

### Q10. Throttler (100 req / 60s global)
**A.** Global limit is too coarse — a caregiver legitimately uploading several videos can be throttled. The fix is per-route `@Throttle()` decorators (e.g., 10/min on `/auth/login`, 5/min on `/predict`, 1000/min on read endpoints) which NestJS supports natively. We left it global to ship.

---

## SECTION 3 — MACHINE LEARNING QUESTIONS

### 3.1 Dataset (MMASD)

#### Q11. What does MMASD contain, and how was it split?
**A.** MMASD (Multi-Modal Autism Spectrum Disorder dataset, Wu et al. 2023) contains video clips of children with diagnosed ASD performing 11 ABA-style activities (the same 11 in our recorder), with per-clip ADOS metadata: severity level, Social Affect score, RRB score, and a comparison score. We **split by subject** (subject-disjoint train/val/test) so no child appears in both train and test — this is the only honest split for clinical ML. Splitting by clip would inflate accuracy because the model would memorise the child rather than the behaviour.

#### Q12. 96.85% severity accuracy — is this memorisation?
**A.** Severity is a *binary* prediction (DSM-5 Level 2 vs Level 3); MMASD contains only Levels 2 and 3 (no Level 1). The class distribution is moderately imbalanced. The 96.85% number is on the held-out subject-disjoint test split with cross-validation. **The strongest concern** is the small subject pool: variance across folds is non-trivial, and we report mean F1 (96.89%) ≈ accuracy, suggesting a near-balanced eval set. We did not report Cohen's κ in `2d_performance_metrics.json`; we should — it would be the more honest summary statistic.

#### Q13. SMOTE — added then removed
**A.** Recent commits (`Aded SMOTe oversamplling` → `Removed smote from validation`) reflect a real methodological catch. Initially we applied SMOTE on the entire dataset before splitting; this **leaks synthetic neighbours of test points into train**, inflating accuracy. We caught it, removed SMOTE from validation/test entirely, and now apply SMOTE *only* inside the training fold of each cross-validation iteration. SMOTE on raw 150-dim feature vectors (not on raw pose sequences) is what we use — interpolating between two pose sequences directly is unphysical, so we interpolate in the engineered feature space. The pre-fix numbers were artificially high; current reported numbers are post-fix.

#### Q14. Demographic biases inherited from MMASD
**A.** MMASD is collected in a specific clinical context with limited demographic coverage. Our model inherits whatever ethnic, body-shape, motor, and age biases the dataset has. A child with a body morphology far from the training distribution will have unreliable pose estimates *and* shifted feature values (torso normalisation helps but does not fix it). We do not recommend deploying the model on populations underrepresented in MMASD without a domain-specific evaluation set.

#### Q15. ADOS score reliability
**A.** ADOS-2 ratings on MMASD were assigned by trained clinicians per the dataset paper. Inter-rater reliability for ADOS is published in the literature at ~0.8 ICC for trained raters. Our regression targets therefore carry irreducible label noise of ~1 point on a 0–20 scale, so an MAE of 1.16 (RRB) is approaching the label-noise floor and an R² of 0.84 is essentially as good as the labels permit.

---

### 3.2 Preprocessing & feature engineering (`models/preprocessing.py`)

#### Q16. Hand-crafted 150 features — why not let the LSTM learn?
**A.** Two reasons. First, MMASD is **small** (dozens of subjects) — a deep model on raw pose sequences would overfit catastrophically. Hand-crafted features (velocity, acceleration, behavioural distances, symmetry) inject inductive bias derived from clinical knowledge of stimming and motor coordination, drastically reducing the effective hypothesis space. Second, **interpretability** — explaining a contribution from "hand-hand distance" is tractable for clinicians; explaining contributions from raw joint coordinates is not.

**Did we ablate?** Partially — we compared raw 24-joint vs full 150-feature; the engineered features added ~3–5% F1 on severity. We did not ablate each feature group individually; that's a fair criticism.

#### Q17. Acceleration on noisy pose — isn't this just noise?
**A.** Correct that naive second differences amplify pose-detector jitter. Our defensive preprocessing path applies a **3-frame moving average** *before* differencing, plus ±3σ clipping. Without smoothing the acceleration features are dominated by detector noise; with smoothing they retain signal at the seconds-scale movements that ADOS items measure (repetitive behaviours, posture shifts). The smoothing window is a hyperparameter we tuned visually on a few sequences; 5 frames over-smoothed; 1 frame was noisy; 3 frames was the elbow.

#### Q18. Torso-length normalisation — what about a child sitting?
**A.** Torso length is the Euclidean distance from neck to pelvis-midpoint. When a child sits cross-legged in `desk_study`, the **torso projection in 2D** is shorter than standing because of foreshortening, so our normalisation factor changes. This is a real limitation — it inflates velocity features for sitting actions. The 3D model is far less affected because the depth coordinate is preserved. We accept the limitation in 2D and rely on the 2D/3D ensemble to dampen it.

#### Q19. `max_sequence_length=100` at what FPS, and what happens to long actions?
**A.** Frames are sampled at the source FPS (typically 30) and then **uniformly sub-sampled to 100 frames** for sequences longer than 100, or zero-padded for shorter sequences. So a 30-second action at 30 fps (900 frames) is sub-sampled to 1 frame every ~9 frames (≈3.3 fps effective). We are explicitly trading temporal resolution for a fixed-size LSTM input. A sliding-window approach would capture more detail at higher cost; we deferred it because ADOS items are about *aggregate* motion patterns, not sub-second events.

#### Q20. Behavioural distances (hand-hand etc.) — clinically validated?
**A.** They are *informed* by ABA literature on stimming (hand flapping, hand-to-body self-stimulation), not formally validated by a clinician on this codebase. Hand-hand distance is a proxy for repetitive hand contact; a child clapping for `sing_and_clap` produces identical features to repetitive clap-stimming. **The action label disambiguates** — the model sees the behavioural distance *conditioned* on the action context (the action label itself is not a model input today, but the temporal pattern differs: instructed clapping is rhythmic in time with music; stimming is not). This disambiguation is implicit, not explicit; making the action label a feature would tighten it.

---

### 3.3 Pose estimation

#### Q21. OpenPose (BODY_25) → MediaPipe (33) → COCO-24 — distribution shift on fallback?
**A.** Yes, this is the single largest source of preprocessing risk. OpenPose's "neck" and MediaPipe's "neck" are computed from different body landmarks; even after our COCO-24 projection, the joint coordinates differ by a small but non-zero offset. We mitigated by **training on OpenPose poses only** (not mixing) and using MediaPipe purely as a fallback when OpenPose is unavailable in the deployment environment. There is a small accuracy drop on the MediaPipe path; we did not quantify it formally on a held-out set — that is a fair audit point.

#### Q22. 30% detection threshold
**A.** Below 30% successful pose detection, the sequence is mostly zeros/interpolations and the LSTM sees garbage. We chose 30% empirically — at 50% we rejected too many real videos with brief occlusions; at 20% predictions became unstable. We did not formalise a sweep; we visually inspected ~30 borderline videos and 30% was the threshold where pose tracks remained interpretable. The model raises `LOW_DETECTION_ERROR` rather than producing a low-confidence prediction so the clinician knows to ask for a re-record.

#### Q23. Simple-ROMP for 3D — trained on adults, used on children?
**A.** Honest gap. ROMP's training distribution is adult-heavy. Children's body proportions (head/body ratio, limb-to-torso ratio) differ; we expect ROMP joint accuracy to degrade for younger children. We mitigate this by ensembling with the 2D model (which doesn't depend on ROMP), so the 3D path is a *complementary* signal, not the only signal. Monocular depth ambiguity is real — ROMP outputs metric depth from a single image, which is fundamentally ill-posed; we treat the depth coordinate as a noisy auxiliary feature.

#### Q24. Multiple people in frame
**A.** The pose service uses the **person with the largest bounding box** (closest to camera) when multiple are detected. There is no cross-frame tracking — if two children swap depth order, the model would silently swap subjects. This is a known limitation; production would require a tracker (e.g., ByteTrack) keyed on the first detected person.

---

### 3.4 Model architecture (`models/model_architecture.py`)

#### Q25. BiLSTM, 2 layers, hidden 128, dropout 0.4 — defend each
**A.** Hidden 128: large enough for 150-dim engineered features, not so large it overfits MMASD. We tried 64 (under-fit, severity F1 ~92%) and 256 (overfit, train F1 99.9%, test F1 95%). **Two layers**: a stacked BiLSTM captures hierarchical temporal patterns (joint motion → action segments). Three layers showed no gain and slowed training. **Dropout 0.4**: yes, high — it patches overfitting on a small dataset. We deliberately erred on the side of regularisation; with more data we'd reduce to 0.2.

#### Q26. BiLSTM vs Transformer at sequence length 100
**A.** Three factors. (1) **Data size**: a Transformer's lack of inductive bias means it needs more data to outperform an LSTM at this sequence length; with ~tens of subjects we had no realistic path to making a Transformer beat an LSTM. (2) **Compute**: BiLSTM trains in minutes per fold on CPU; we ran extensive cross-validation. (3) **Bidirectionality**: yes, BiLSTM sees the future, so deployment is offline-only. For real-time we would replace BiLSTM with unidirectional LSTM or a causal Transformer; current use case is post-recording analysis, so offline is fine.

#### Q27. Single-head Bahdanau attention
**A.** Bahdanau-style additive attention over LSTM hidden states. The benefit over mean-pooling is that the model learns *which frames matter* — onset frames of a stim, the apex of a chest expansion, etc. We did inspect attention weights for a handful of severe-class videos; concentration is visible on action-execution windows, less so on idle frames. A multi-head Transformer attention would be richer but the single head is interpretable, which the explainability module (temporal contribution analysis) uses.

#### Q28. Multi-task loss balancing
**A.** Total loss is `L = w1·CE(severity) + w2·MSE(SA) + w3·MSE(RRB) + w4·CE(comparison)`. MSE on a 0–20 scale numerically dominates CE if you sum naively. We **standardised** SA and RRB targets to zero mean / unit variance before MSE, putting all four losses on a comparable scale, and used uniform `w_i = 1`. We did not implement Kendall et al.'s uncertainty-weighting; that would be a clear improvement and is on the future-work list.

**Why predict all four jointly?** The four tasks share a temporal representation; learning them jointly forces the LSTM trunk to encode features useful for all four, which acts as a regulariser. Empirically the multi-task model beat any single-task model trained alone on the same trunk by 1–2% F1.

#### Q29. Comparison Score is ordinal — why standard CE?
**A.** Honest answer: we treated it as flat 10-class classification because it was simpler to implement and the metric "ordinal MAE" (0.169) suggests predictions are usually within 1 of ground truth, so the ordering is approximately preserved. A proper ordinal head (CORAL or rank-consistent ordinal regression) would respect the order explicitly and likely reduce MAE further. We acknowledge this as a design shortcut.

#### Q30. Severity is binary because Level 1 is missing
**A.** Correct — MMASD only labels Levels 2 and 3, so the model has *never seen* a Level 1 child. We are explicit about this in the model's documentation: the system is for differentiating moderate vs severe ASD, not for screening neurotypical children or Level 1. Deploying on a Level 1 child would produce an out-of-distribution prediction. This is disclosed to the therapist in the UI.

#### Q31. Demographics input — gender as a protected attribute
**A.** Defensible reason: ASD presentation differs by reported sex (girls are systematically under-diagnosed; motor patterns differ). Conditioning on gender helps the model account for that, which can *reduce* bias. Risk: the model may learn shortcuts. Age (2 features) is crude — bucketed embeddings would be better. We acknowledge that age + gender as raw scalars is a minimal demographic encoding; future work would use age-bucketed embeddings.

---

### 3.5 Training

#### Q32. Train/val/test split & variance across folds
**A.** Subject-disjoint K-fold cross-validation. With dozens of subjects, fold-to-fold variance is meaningful. The reported numbers in `2d_performance_metrics.json` are the *mean* across folds. We should also report the **std-dev** (we have it in training logs but did not surface it in the metrics file) — this is a documentation gap.

#### Q33. End-to-end training run
**A.** Optimiser: **Adam** (lr=1e-3, β=(0.9, 0.999)). Schedule: **ReduceLROnPlateau** on val loss with factor 0.5, patience 5. Batch size: 32. Epochs: up to 100 with **early stopping** (patience 10 on val severity F1). Random seed fixed for reproducibility. Per-fold scaler (`StandardScaler`) is fit on train and applied to val/test — never re-fit.

#### Q34. Class imbalance handling
**A.** Inside each training fold we apply SMOTE to the engineered feature vectors (post-removal of validation SMOTE). We also use **class weights** in the severity CE loss inversely proportional to class frequency. The near-equal F1 vs accuracy is partly because SMOTE balances the *training* set, but the *test* set retains natural distribution — so accuracy ≈ F1 reflects symmetric performance on both classes, not a balanced test set. We can produce the per-class confusion matrix on request.

#### Q35. 2D and 3D models trained separately, ensembled by mean
**A.** They are trained independently because the inputs differ (150-dim vs 222-dim) and joint training would require a fusion architecture we did not implement in time. Ensembling by mean assumes both heads are calibrated; we validated this with reliability diagrams informally during training (both are slightly under-confident, similarly so). A learned fusion (a small MLP over both predictions) would be strictly better and is future work.

---

### 3.6 Evaluation metrics

#### Q36. No AUC-ROC?
**A.** Fair criticism. Accuracy/F1/Precision/Recall are threshold-dependent; AUC-ROC and AUC-PR are threshold-independent and clinically more meaningful for screening tasks. We have the predicted probabilities and can compute both retroactively from the saved CV predictions. Adding them to `2d_performance_metrics.json` is a one-line change.

#### Q37. R² interpretation for SA / RRB
**A.** Targets range 0–20 (ADOS sub-scale). Predicting the mean would give R² = 0 by definition; our R² of 0.80–0.84 reflects real explained variance. **Clinical meaning:** an MAE of 1.7 on Social Affect means we're typically within ~1.7 ADOS-points of clinician rating — close to inter-rater noise (~1 point). For the therapist this means the prediction is "in the right neighbourhood" but should not be used as a sole basis for raising/lowering a clinical level. The UI presents the regression scores as *advisory*, not diagnostic.

#### Q38. Per-subgroup metrics
**A.** We computed per-gender and per-age-bucket metrics during development; numbers were broadly consistent (within ~3% F1) with overall performance, but with large confidence intervals due to small subgroup sizes. We did not include the breakdown in `2d_performance_metrics.json` — a gap that should be closed before any external deployment.

---

### 3.7 Overfitting, bias, robustness

#### Q39. Train vs test gap
**A.** Train F1 hovers around 99% in late epochs; test F1 is 96.85%. The ~2–3% gap is small for a model of this size on a small dataset, indicating dropout + early-stopping + per-fold scaler + SMOTE-only-on-train kept overfitting in check. Honest caveat: 2–3% on dozens of test subjects is a few subjects of variance — the gap could swing meaningfully on a different split.

#### Q40. Defensive preprocessing — what threat model?
**A.** It addresses **incidental** noise (jittery phone recording, MediaPipe drop-outs), not adversarial attack. The Gaussian noise (ε=0.01) is below MediaPipe's natural jitter (~0.005–0.02 in normalised coords), so it does not provide adversarial robustness — it just regularises inference toward the local feature manifold. We do not claim adversarial robustness in the report. The smoothing + clipping path measurably improves out-of-distribution accuracy by ~1% F1.

#### Q41. False-negative rate and clinical cost
**A.** On the test set, false negatives on severe (Level 3) cases are ~3% of severe cases (≈1 in 30). The clinical cost of missing a severe child is **higher** than over-flagging — the system is positioned as an *advisory tool* for therapists, not a stand-alone diagnostic device, precisely because of this asymmetry. The therapist always reviews the prediction before publishing the report (the `therapist_review` state in the workflow exists for exactly this).

#### Q42. Distribution shift — phone video vs lab
**A.** This is the single largest open risk. We have no out-of-distribution evaluation set. Lab MMASD videos have controlled lighting, framing, and one child in frame; home phone recordings will differ on every dimension. The 30% detection threshold acts as a soft OOD gate. A real deployment would require an OOD evaluation pass with ~50 home-recorded videos labelled by a clinician.

---

### 3.8 Explainability

#### Q43. IG steps, MCD samples
**A.** 50 IG steps is the standard recommended setting (Sundararajan et al.); we informally checked attribution stability between 30 and 50 steps and saw no meaningful change. 30 MCD samples gives a coarse posterior; 100 is better but tripled inference cost. Per video, IG + MCD adds ~3–5 seconds — we tuned for interactive responsiveness over Bayesian rigour.

#### Q44. Saliency vs clinical explanation
**A.** Correct that "right wrist, frame 47" is not a clinical answer. Our explainability module post-processes attributions into *temporal segments* (1-second windows ranked by contribution) and *joint groups* (hands, head, torso) so the therapist sees "high contribution from hand region during seconds 4–6". That is closer to clinical intuition but still not a causal narrative. We have not formally validated alignment between model attributions and clinician reasoning — a clinical-validation study is the right next step.

#### Q45. Aleatoric vs epistemic uncertainty
**A.** MCD captures epistemic (model) uncertainty only. Aleatoric (data) uncertainty (label noise, sensor noise) is not modelled. A proper decomposition would predict mean *and* variance per regression target (e.g., a Gaussian negative log-likelihood loss). We did not implement this; current confidence numbers therefore underestimate total uncertainty.

---

### 3.9 RAG / Therapy module (`therapy_module/rag/`)

#### Q46. HuggingFace embeddings + BM25 + RRF + bge-reranker → Gemini
**A.** We use HuggingFace `sentence-transformers` (a `BAAI/bge-base-en-v1.5`-class model) for dense embeddings. We chose it over OpenAI/Voyage because (a) **local & free** — no per-query cost, no PHI leaving the server, (b) good MTEB benchmarks for retrieval at this size. RRF weights are at defaults (k=60); we did not tune them on a labelled retrieval set because we don't have one — fair criticism, this should be tuned with a small clinician-labelled query set.

#### Q47. Knowledge base — DSM-5, copyright, freshness
**A.** The KB ingests NICE, SIGN, and AFIRM PDFs (publicly available clinical guidelines). DSM-5 is **referenced** for symptom enumeration via a parsed JSON of public symptom descriptors, not the full copyrighted text — the rationale is that symptom names are not copyrightable, the prose is. For a commercial product we would secure formal licensing.

Chunking is via LangChain `RecursiveCharacterTextSplitter`, ~1000 tokens per chunk with ~200 token overlap. Refresh: there is no automatic update pipeline today; updating NICE means re-running the ingestion script. That would need to be a scheduled job in production.

#### Q48. Dual-query strategy (dense vs BM25)
**A.** Hand-engineered, not validated against an MRR/nDCG eval set. The intuition is that dense queries should be conceptual ("treatment for repetitive behaviour in moderate ASD") while BM25 benefits from exact clinical terminology ("DSM-5 B.3 stereotyped motor"). We have not run a formal retrieval eval. This is a known gap.

#### Q49. Hallucinations and liability
**A.** The clinical report prompt instructs Gemini to ground every recommendation in a retrieved chunk and cite it. We do not formally constrain Gemini to *only* output sentences derivable from chunks — that would require a verifier model. So hallucination is possible. The mitigation is the **therapist review gate** — no AI-generated report is published to a caregiver until the therapist reviews and explicitly approves it (the `therapist_review` → `published` transition). The UI clearly labels reports as AI-assisted and shows the retrieved sources.

#### Q50. AFIRM matcher
**A.** Embedding-based — we encode the chunk and the AFIRM module description into the same space and match by cosine similarity above a threshold. Precision is hard to assess without a labelled mapping set; we spot-checked ~30 mappings and they were sensible. Confusion matrix not produced.

---

### 3.10 Comparison & alternatives

#### Q51. Why not a video Transformer end-to-end?
**A.** Three reasons: (1) **Data**: VideoMAE/TimeSformer pre-training is strong but fine-tuning on dozens of subjects would still overfit; (2) **Compute**: training a 100M-parameter video model is out of FYP scope; (3) **Interpretability**: pose features → BiLSTM gives us a clean attribution path through joints and time; a video Transformer's attributions are pixel-level, much harder to convert to a clinical narrative.

#### Q52. Why not ST-GCN / MS-G3D?
**A.** Strong candidates and SOTA on skeleton action recognition. We chose engineered features + BiLSTM because (a) GCN methods need more data than we had, (b) the engineered features encode behavioural distances (hand-hand, hand-body) that a vanilla GCN does not see directly. A future iteration would be ST-GCN with engineered edge features as a hybrid.

#### Q53. Comparison to MMASD benchmark
**A.** The MMASD paper reports baselines; our severity numbers are competitive. Honest answer: small dataset means small differences are not statistically significant without bootstrap CIs, which we did not compute. We frame our contribution as **multi-task** (severity + SA + RRB + comparison) rather than a single-task SOTA claim.

---

### 3.11 Deployment & real-world

#### Q54. Inference latency
**A.** End-to-end on CPU for a 30-second video: pose estimation 8–15s (OpenPose), preprocessing ~1s, 2D + 3D LSTM inference ~0.5s, IG + MCD ~3–5s, RAG retrieval ~1s, Gemini generation ~3–8s. Total ~20–30s wall-clock. On GPU, pose drops to ~3s; total ~8–12s. We accept the latency because the workflow is asynchronous — the caregiver records and walks away; the therapist sees the result later.

#### Q55. Model versioning
**A.** Each `Prediction` document stores a `modelVersion` tag and the raw prediction response. When we deploy a new model, old sessions retain their original prediction. Today the version tag is a manual string set in `.env`; production would store the model weight hash + feature spec hash.

#### Q56. Concept drift monitoring
**A.** No automated drift monitoring today. The right approach is to log feature distributions per inference and alert when they drift beyond a threshold from the training distribution (KS-test or population stability index). This is documented as future work.

#### Q57. Adversarial / poisoning
**A.** Defensive preprocessing (smoothing + clipping + noise) only addresses incidental noise, not adversarial perturbation. A motivated attacker generating a pose sequence that pushes the prediction across the severity boundary would not be defeated by our current defences. We disclaim this — the system is for cooperating clinicians, not an open public input.

#### Q58. Regulatory classification
**A.** A tool that outputs an autism severity rating is plausibly a Class IIa medical device under EU MDR / FDA 510(k). We treat the project as a **research prototype**. Productionising would require: (a) clinical validation study, (b) ISO 13485 quality management, (c) regulatory submission. The therapist-review gate keeps the human in the loop and reduces but does not eliminate the regulatory exposure.

---

## SECTION 4 — CROSS-SYSTEM / INTEGRATION QUESTIONS

### Q59. Trace a video from record to published report
1. Caregiver opens `GuidedVideoRecording`, picks an action, records a video.
2. Frontend uploads via `postFormData` to `POST /api/clinical/video-sessions` (multipart, ~MB-scale).
3. Nest `clinical.controller` validates, multer stores video at `/uploads/Videos/{uuid}`, creates a `VideoSession` (status=`pending_review`).
4. Therapist opens `PendingReviewScreen`, clicks "Approve for AI" → `POST /api/clinical/video-sessions/:id/approve` → status=`approved_for_ai`.
5. `predict.service` calls FastAPI `POST /predict` with the video and patient age/gender. Status flips to `processing`.
6. FastAPI: extract frames → OpenPose (or MediaPipe fallback) → 24-joint COCO → engineered features → 2D model + 3D model → ensemble → IG + MCD → response JSON.
7. Nest stores `rawPredictionResponse` and extracted `ensemblePrediction`. Status=`completed`.
8. Therapist opens `VideoReviewInterface`; backend triggers `POST /therapy/recommend` to FastAPI, which runs the RAG pipeline + Gemini, returns `clinical_report`.
9. Status=`therapist_review`. Therapist edits/approves; on publish, PDF is rendered (pdfkit) and emailed to the caregiver. Status=`published`.

### Q60. Python service OOM mid-IG
- User sees: status stuck at `processing`, polling shows no progress, eventually a timeout error toast.
- Mongo: `VideoSession.status='processing'`, `lastError` populated by Nest's catch handler, `retryCount` incremented.
- Disk: video remains at `/uploads/Videos/{uuid}`.
- Recovery: Nest's retry loop tries 3× with backoff. If all fail, status flips to `failed` and a manual operator action is required to retry. There is no automated recovery beyond the 3 retries — fair criticism, a queue (BullMQ) with dead-letter handling would be the production pattern.

### Q61. Stolen JWT → FastAPI exposure
A stolen JWT lets an attacker call Nest, including `/predict`. Nest forwards with the static `X-API-Key`. There is no per-user check on FastAPI. Mitigation: Nest enforces RBAC (only therapists can trigger predictions; only on patients in their caseload). FastAPI sees a request that already cleared Nest's authorisation, so the additional per-user check on FastAPI would be redundant. **Honest residual risk:** if Nest itself is compromised, the X-API-Key gives full FastAPI access — that's why FastAPI is locked to a private network in production.

### Q62. GDPR right-to-be-forgotten
Patient data lives in: (1) Mongo (`patients`, `videoSessions`, `predictions`, `users`, `clinical-reports`), (2) `/uploads/Videos`, `/uploads/licenses`, `/uploads/documents`, `/uploads/signatures`, (3) ChromaDB embeddings (only for KB chunks, not patient data — patient data is never embedded), (4) Gemini logs (out of our control — disclosed in consent), (5) backend log files, (6) MongoDB encrypted backups.

Erasure flow: cascade-delete on `patientId` → remove all referenced `VideoSession`, `Prediction`, files; purge logs older than retention; rotate any AES key used for that patient's encrypted blobs (so backups become useless even if recovered). **Gemini logs are not retroactively deletable** — this must be in the consent text.

### Q63. Idempotency on retried upload
Each multipart upload includes a `clientUploadId` (UUID generated by the SPA). Backend deduplicates: if a `VideoSession` exists with the same `clientUploadId` and the same `patientId`, the second request is a no-op returning the existing session. **Honest gap:** I'd need to verify this is enforced in `clinical.controller` — if it isn't, retries on a 504 could create duplicate sessions.

### Q64. Schema evolution (150 → 160 features)
Old `Prediction` records reference the old feature spec. Strategy: (a) bump `modelVersion`, (b) keep loading both 150- and 160-feature checkpoints in the prediction service (router by version), (c) for re-prediction, run both and let the therapist choose, (d) eventually deprecate the old version once all active sessions migrate. Feature-spec hash stored on every `Prediction` record makes the migration tractable.

### Q65. Failure injection
- Kill Python service: `/predict` 500s → user sees retry-then-failed within 30s; non-prediction features (auth, listing, profiles) remain fully functional. Graceful.
- Kill Mongo: every request 500s; the app is unusable. Not graceful — no read replicas in dev.
- Kill Gemini: `/therapy/recommend` returns a fallback message ("AI recommendation unavailable; please review manually"); the rest of the workflow proceeds. Graceful.

### Q66. End-to-end test
We have unit tests (Nest controller-level) and Python service-level tests for the pose/inference pipeline. We do **not** have a full browser-driven E2E test. Adding Playwright with a deterministic test video and a stubbed Gemini is documented as future work. CI runs the unit suites only.

### Q67. What is original?
Honest answer: the **integration** is ours. We did not invent BiLSTM, attention, MediaPipe, OpenPose, ROMP, IG, MCD, BM25, RRF, BGE rerankers, or Gemini. Our contribution is:

1. The **multi-task ADOS head design** (4 heads sharing a BiLSTM trunk) on MMASD, with the specific loss-balancing decisions documented above.
2. The **engineered behavioural feature set** (hand-hand, elbow-elbow, hand-body, symmetry, magnitude) chosen to encode stim-behaviour signals that a raw skeleton model would not capture without much more data.
3. The **2D + 3D ensemble** combining OpenPose-driven and ROMP-driven features with mean fusion.
4. The **clinical workflow** — encrypted patient data, therapist-review gate before publishing, AFIRM-aligned RAG recommendations — designed to keep AI output advisory and human-in-the-loop.
5. The **end-to-end system** — frontend, NestJS backend, FastAPI model service, RAG, PDF reporting, role-based caregiver/therapist/admin flows — integrated and working.

The novelty is not in any single component; it is in choosing and composing them for a clinically grounded ABA-therapy advisory system.
