// Loads the whole finite population from data/ (unchanged) as raw text and parses it.
import csvText from "../data/clinic_visits.csv?raw";
import { parseClinicCsv } from "./sampling.js";

export const population = parseClinicCsv(csvText);
