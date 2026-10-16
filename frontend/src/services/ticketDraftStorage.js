const DRAFT_VERSION = 1;

const getDraftKey = (userId) => `ticket-draft:v${DRAFT_VERSION}:${userId}`;

const getDraftValues = (values) => ({
  issueType: String(values.issueType || ""),
  description: String(values.description || ""),
  instructorId: String(values.instructorId || ""),
  selectedTeamId: String(values.selectedTeamId || ""),
  selectedStudentId: String(values.selectedStudentId || ""),
});

export const hasTicketDraftContent = (kind, values) => Boolean(
  values.issueType || values.description.trim() || values.instructorId ||
  (kind === "staff" && (values.selectedTeamId || values.selectedStudentId))
);

export const loadTicketDraft = (userId, kind) => {
  if (!userId) return { draft: null, error: "" };

  let raw;
  try {
    raw = window.localStorage.getItem(getDraftKey(userId));
  } catch {
    return { draft: null, error: "Draft saving is unavailable in this browser." };
  }

  try {
    const draft = JSON.parse(raw);
    if (
      !draft || draft.version !== DRAFT_VERSION || draft.kind !== kind ||
      !draft.values || typeof draft.values.description !== "string" ||
      draft.values.description.length > 3000 ||
      !Number.isFinite(Date.parse(draft.savedAt)) ||
      Object.values(draft.values).some((value) => !["string", "number"].includes(typeof value))
    ) {
      return { draft: null, error: "" };
    }

    const values = getDraftValues(draft.values);
    return {
      draft: hasTicketDraftContent(kind, values) ? { ...draft, values } : null,
      error: "",
    };
  } catch {
    return { draft: null, error: "" };
  }
};

export const removeTicketDraft = (userId) => {
  if (!userId) return "";
  try {
    window.localStorage.removeItem(getDraftKey(userId));
    return "";
  } catch {
    return "The saved draft could not be cleared from this browser.";
  }
};

export const saveTicketDraft = (userId, kind, formValues) => {
  if (!userId) return { savedAt: null, error: "" };

  const values = getDraftValues(formValues);
  if (!hasTicketDraftContent(kind, values)) {
    return { savedAt: null, error: removeTicketDraft(userId) };
  }

  const savedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(getDraftKey(userId), JSON.stringify({
      version: DRAFT_VERSION,
      kind,
      savedAt,
      values,
    }));
    return { savedAt, error: "" };
  } catch {
    return { savedAt: null, error: "Your latest changes could not be saved as a draft. Keep this form open to avoid losing them." };
  }
};
