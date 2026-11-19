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
- Row order, and what it means in this file: It is chronological. it runs week by week, Mon to Fri. Also slots 1-20 within each day. 
- Target column and units: wait_time, whole minutes
- My finite population is (and what it is not): The finite population is the 10,000 appointments in the file. It is not every clinic, every week, or every patient.
- True mean I calculated (and how): The true mean is 22.6842 minutes. The sum of wait_time over all 10,000 rows (which is 226,842) divided by 10,000. 226,842 / 10,000 = 22.6842.

## 2. Design choices

For each stage: the option I chose, why, and what it is meant to help a user learn.

- Stage 2, visualization (include one visual feature meant to reveal a sampling problem): **I chose to have a grid of all 10k appointments in file order as the main view. Having a histogram of waits and weekday sample dots as the secondary view.  I want whoever sees it to understand where in the clinic's week the sampled appointments are at. Having the weekday be colored is a feature I thought of to reveal a sampling problem, since it shows whether the sample comes from all five days or only some. It's meant to help someone see where the sample sits and how its mean compares with the true mean of 22.6842 minutes.**
- Stage 3, sampling interactions and stratification column: **I chose a method selector that shows one sampling method at a time, that way the grid is large enough to read and a user can see where one methods sampled appointments sit before switching to the next. The user can change the sample size, the seed, and the stratification column. There is also an explanation box shows how the current sample was chosen. Also, I stratify on weekday because I wanted a simple allocation..**
- Stage 4, presentation of the method comparison and sample-size experiments:
- Stage 5, challenge controls and my alternative method or correction:

## 3. Results table

One row per result I read from my app. Add rows as needed. Rerun and update a row whenever I
like: my app does not need to keep a history of runs. Seed is "exact" for exact enumeration;
type is Monte Carlo or exact. In Settings I record the settings that matter for the result, such
as the stratification column and allocation, or my challenge-control values. True mean is the
true mean of the population that result was drawn from (the modified copy's own recalculated
value for modified rows). Keep each result in its own row: never pool estimates.

| Experiment | Population or condition | Method | Settings | Seed (or exact) | n | Repetitions or starts | Type | True mean | Bias | SD | RMSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Methods at n = 100 | baseline | Simple random | | | 100 | | | | | | |
| Methods at n = 100 | baseline | Systematic | | | 100 | | | | | | |
| Methods at n = 100 | baseline | Stratified | | | 100 | | | | | | |
| Sample size | baseline | Simple random | | | 1 | | | | | | |
| Sample size | baseline | Simple random | | | 10 | | | | | | |
| Challenge | baseline | (method I challenged) | | | | | | | | | |
| Challenge | modified | (method I challenged) | | | | | | | | | |
| Challenge | baseline | (alternative or correction) | | | | | | | | | |
| Challenge | modified | (alternative or correction) | | | | | | | | | |

The simple random n = 100 row is also the n = 100 sample-size result when the population and
settings match. If I reran it with different settings, I add a separate row. All four challenge
rows use the same n; a challenge baseline row may repeat a matching stage 4 result.

## 4. Findings (in my own words, using my own numbers)

- (a) Method comparison: the three sampling methods compared at n = 100 (bias versus variability, and for which population):
- (b) Sample-size finding: how sample size affects the spread of estimates and the estimation error, and what a larger sample cannot fix:

## 5. Challenge (hypothesis written independently, before consulting my agent)

Hypothesis, written before I consult my agent:

- Date written:
- Method I chose to challenge:
- The change to the population or its ordering:
- Why the selection rule would interact with that change:
- Evidence I expect across repeated samples:
- Alternative method or correction I will compare, and why:
- Evidence that would contradict my hypothesis:

After I test it:

- Test settings (conditions, methods, alternative method or correction, n, seeds); results are in the table above:
- (c) Challenge interpretation: did the evidence support my hypothesis? Bias versus variability, other explanations, what the alternative or correction showed, and any dated revision (keep the original above):

## 6. AI use

- Tools used: Claude
- What I asked my agent to do, and what I checked myself: I asked the agent to brainstorm visualization desgins and build the app. I checked the app against the list and calculated the true-mean entry myself. 
- Automated checks my agent reported (I did not let it interpret my results): It reported 14 automated checks. 
