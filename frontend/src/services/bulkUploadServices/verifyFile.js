import Papa from "papaparse";

const REQUIRED_HEADERS_STUDENT = [
  "name", 
  "canvas_user_id", 
  "user_id", 
  "login_id", 
  "sections", 
  "group_name", 
  "canvas_group_id", 
  "sponsor"
];

const SCHEMA_STUDENT = {
    name: "string",
    canvas_user_id: "number",
    user_id: "number",
    login_id: "string",
    sections: "number",
    group_name: "string",
    canvas_group_id: "number",
    sponsor: "string",
};

const REQUIRED_HEADERS_PROJECT = [
  "project", 
  "sponsor", 
  "sponsor_email", 
  "instructor", 
  "instructor_email",
  "grader",
  "grader_email"
];

const SCHEMA_PROJECT = {
    project: "string",
    sponsor: "string",
    sponsor_email: "string",
    instructor: "string",
    instructor_email: "string",
    grader: "string",
    grader_email: "string",
};

const validateCell = (key, value, SCHEMA) => {
    //console.log('validateCell called', { key, raw: JSON.stringify(value), typeof: typeof value });

    if (value == null) return `${key} is missing`;
    const v = String(value).trim();
    const normalizeDigits = (s) => String(s).replace(/[, \u00A0\r\n\t]+/g, '').trim();
    const normalized = normalizeDigits(v);

    //console.log('normalized for', key, ':', JSON.stringify(normalized)); // shows empty string clearly

    if (SCHEMA[key] === "number") {
    if (!/^\d+$/.test(normalized)) return `${key} must be an integer made only of digits`;
    return null;
    }
    if (v === "") return `${key} must be a non-empty string`;
    return null;
};


export const verifyFileService = (file, f_type) => {
  return new Promise((resolve) => {
    if (!file) return resolve({ valid: false, errors: ["No file provided"], rows: [] });

    var REQUIRED_HEADERS, SCHEMA;
    if (f_type === 'student') {
        REQUIRED_HEADERS = REQUIRED_HEADERS_STUDENT;
        SCHEMA = SCHEMA_STUDENT;
    } else if (f_type === 'project') {
        REQUIRED_HEADERS = REQUIRED_HEADERS_PROJECT;
        SCHEMA = SCHEMA_PROJECT;
    } else {
        return resolve({ valid: false, errors: ["Invalid file type specified"], rows: [] });
    }

    const name = file.name?.toLowerCase?.() || "";
    if (!name.endsWith(".csv")) {
      return resolve({ valid: false, errors: ["Only CSV files are supported"], rows: [] });
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      quoteChar: '"',
      escapeChar: '"',
      quotes: true,
      delimiter: ',',
      encoding: "UTF-8",
      dynamicTyping: false,
      beforeFirstChunk: (chunk) => chunk.replace(/\r\n?/g, '\n'),
      transformHeader: (h) => (h || "")
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w_]/g, ""),
      transform: (value) => (typeof value === "string" ? value.trim() : value),
      complete: (results) => {
        //console.log("Parsed data:", results.data);
        const errors = [];
        const headers = results.meta.fields || [];
        //console.log("Parsed headers:", headers);

        const missingHeaders = REQUIRED_HEADERS.filter(
          (h) => !headers.map(x => x.toLowerCase()).includes(h.toLowerCase())
        );
        if (missingHeaders.length) {
          errors.push(`Missing required header(s): ${missingHeaders.join(", ")}`);
        }

        const rows = results.data || [];
        rows.forEach((row, idx) => {
          
          REQUIRED_HEADERS.forEach((key) => {
            //console.log('DEBUG:', key, JSON.stringify(row[key]));
            const err = validateCell(key, row[key] ?? '', SCHEMA);
            if (err) errors.push(`Row ${idx + 2}: ${err}`);
          });
        });

        resolve({ valid: errors.length === 0, errors, rows });
      },
      error: (err) => {
        resolve({ valid: false, errors: [String(err)], rows: [] });
      },
    });
  });
};

