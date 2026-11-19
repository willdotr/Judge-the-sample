# My decisions and evidence notes

Written by me, not by my AI agent. Write my challenge hypothesis (section 5) **before** consulting
my agent about it, and do not edit it afterwards; add a dated revision below instead.

| Stage | What I record here |
|---|---|
| 1 | Section 1 |
| 2–5 | Section 2: my design choice, written before I switch my agent to build |
| 4 | Section 3: method and sample-size rows; section 4: findings (a) and (b) |
| 5 | Section 5: hypothesis first; then section 3: challenge rows; section 5: finding (c) |
| All | Section 6: AI use |

## 1. Population and target

- Scenario and file: Clinic waiting times, clinic_visits.csv
- One row means: One appointment
- Number of rows (N): 10,000
- Row order, and what it means in this file: It is chronological. It runs week by week, Mon to Fri, and slots 1-20 within each day.
- Target column and units: wait_time, whole minutes
- My finite population is (and what it is not): The finite population is the 10,000 appointments in the file. It is not every clinic, every week, or every patient.
- True mean I calculated (and how): The true mean is 22.6842 minutes. The sum of wait_time over all 10,000 rows (which is 226,842) divided by 10,000. 226,842 / 10,000 = 22.6842.

## 2. Design choices

For each stage: the option I chose, why, and what it is meant to help a user learn.

- Stage 2, visualization (include one visual feature meant to reveal a sampling problem): **I chose to have a grid of all 10k appointments in file order as the main view. Having a histogram of waits and weekday sample dots as the secondary view.  I want whoever sees it to understand where in the clinic's week the sampled appointments are at. Having the weekday be colored is a feature I thought of to reveal a sampling problem, since it shows whether the sample comes from all five days or only some. It's meant to help someone see where the sample sits and how its mean compares with the true mean of 22.6842 minutes.**
- Stage 3, sampling interactions and stratification column: **I chose a method selector that shows one sampling method at a time, that way the grid is large enough to read and a user can see where one methods sampled appointments sit before switching to the next. The user can change the sample size, the seed, and the stratification column. There is also an explanation box shows how the current sample was chosen. Also, I stratify on weekday because I wanted a simple allocation.**
- Stage 4, presentation of the method comparison and sample-size experiments: **I chose a strip of every estimate for each condition, with bias, SD and RMSE bars beside it and the true mean always marked. I chose it because  every individual estimate stays visible without histogram bin choices, and the bars let me tell consistent error from random variation (SD) while the true mean of 22.6842 minutes stays marked. It is supposed to help a user see how much estimates vary from sample to sample.**
- Stage 5, challenge controls and my alternative method or correction: **I chose a Challenge tab that shows four results in one list, simple random and systematic sampling each on the baseline, and on a copy of the appointments sorted by weekday. Its grouped by method so each baseline and modified pair sits side by side. My hypothesis is about whether reordering the same rows changes how a method behaves, so putting each method's baseline and modified results next to each other at the same n and repetition count and each judged against its own population's true mean, lets a user see that directly.**

## 3. Results table

One row per result I read from my app. Add rows as needed. Rerun and update a row whenever I
like: my app does not need to keep a history of runs. Seed is "exact" for exact enumeration;
type is Monte Carlo or exact. In Settings I record the settings that matter for the result, such
as the stratification column and allocation, or my challenge-control values. True mean is the
true mean of the population that result was drawn from (the modified copy's own recalculated
value for modified rows). Keep each result in its own row: never pool estimates.

| Experiment | Population or condition | Method | Settings | Seed (or exact) | n | Repetitions or starts | Type | True mean | Bias | SD | RMSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Methods at n = 100 | baseline | Simple random | none | 2026 | 100 | 100 | Monte Carlo | 22.68 | -0.13 | 1.49 | 1.49 |
| Methods at n = 100 | baseline | Systematic | row order | exact | 100 | 100 | exact | 22.68 | 0.00 | 6.96 | 6.96 |
| Methods at n = 100 | baseline | Stratified | weekday | 2026 | 100 | 100 | Monte Carlo | 22.68 | 0.18 | 1.56 | 1.57 |
| Sample size | baseline | Simple random | none | 2026 | 1 | 100 | Monte Carlo | 22.68 | 0.84 | 14.63 | 14.65 |
| Sample size | baseline | Simple random | none | 2026 | 10 | 100 | Monte Carlo | 22.68 | 0.18 | 4.77 | 4.77 |
| Challenge | baseline | Simple random | none | 2026 | 100 | 100 | Monte Carlo | 22.68 | -0.13 | 1.49 | 1.49 |
| Challenge | modified (sorted by weekday) | Simple random | none | 2026 | 100 | 100 | Monte Carlo | 22.68 | -0.15 | 1.46 | 1.47 |
| Challenge | baseline | Systematic | row order | exact | 100 | 100 starts | exact | 22.68 | 0.00 | 6.96 | 6.96 |
| Challenge | modified (sorted by weekday) | Systematic | weekday-sorted row order | exact | 100 | 100 starts | exact | 22.68 | 0.00 | 6.94 | 6.94 |

The simple random n = 100 row is also the n = 100 sample-size result when the population and
settings match. If I reran it with different settings, I add a separate row. All four challenge
rows use the same n; a challenge baseline row may repeat a matching stage 4 result.

## 4. Findings (in my own words, using my own numbers)

- (a) Method comparison: the three sampling methods compared at n = 100 (bias versus variability, and for which population): **On the baseline population at n = 100, simple random and stratified on weekday had small biases and similar spread. On the other hand, systematic had bias 0.00 but a much larger SD and RMSE of 6.96. The methods differed mainly in variability and the biases of the two Monte Carlo methods are small next to their SDs so they could be noise.**
- (b) Sample-size finding: how sample size affects the spread of estimates and the estimation error, and what a larger sample cannot fix: **For simple random sampling, the SD of the estimates fell from 14.63 at n = 1 to 4.77 at n = 10 and 1.49 at n = 100, with RMSE falling in step. Yet, the bias stayed small and changed sign (+0.84, +0.18, −0.13). A larger sample reduced random variation, but it did not make every method equally good. My simple random results show no clear consistent error.**

## 5. Challenge (hypothesis written independently, before consulting my agent)

Hypothesis, written before I consult my agent:

- Date written: 11/18/2026
- Method I chose to challenge: simple random
- The change to the population or its ordering: **I will test the row ordering by reordering the same 10,000 appointments by weekday on a modified copy. Every row and value stays the same, that way the true mean does not change.**
- Why the selection rule would interact with that change: **I don't really expect any interaction for random sampling.**
- Evidence I expect across repeated samples: **The bias and SD of simple random estimates on the weekday-sorted copy should match the baseline up to simulation noise. For systematic sampling I expect the sorted copy to give different results from baseline.**
- Alternative method or correction I will compare, and why: **Systematic sampling, because its selection rule uses row order.**
- Evidence that would contradict my hypothesis: **If simple random's bias or SD on the sorted copy differs from baseline by more than simulation noise and the difference is still there across several seeds after 1,000 repetitions.**

After I test it:

- Test settings (conditions, methods, alternative method or correction, n, seeds); results are in the table above: **Baseline (original file order) and modified (sorted by weekday). Simple random as the challenged method and systematic as the alternative (exact, all 100 starts, no seed); n = 100 for all four results.**
- (c) Challenge interpretation: did the evidence support my hypothesis? Bias versus variability, other explanations, what the alternative or correction showed, and any dated revision (keep the original above): **The first part was supported: simple random's bias was −0.13 on the baseline and −0.15 on the sorted copy, its SD was 1.49 and 1.46, and its RMSE was 1.49 and 1.47. These differences of a few hundredths are small next to the SD, so they look like simulation noise, and the error is mostly variability. The second part was not supported at n = 100. For systematic sampling, bias was 0.00 in both cases and the SD was 6.96 on the baseline and 6.94 on the sorted copy, so sorting by weekday barely changed it. The evidence supported my expectation for simple random and did not support it for systematic.**

## 6. AI use

- Tools used: Claude
- What I asked my agent to do, and what I checked myself: I asked the agent to brainstorm visualization designs and build the entire app. I checked the app against the list and calculated the true-mean entry myself. I also ran the experiments myself. 
- Automated checks my agent reported (I did not let it interpret my results): It reported that 128 automated checks passed. This covers the three samplers, allocation, exact enumeration of starts, reproducibility, hand-calculated bias, and SD and RMSE.
