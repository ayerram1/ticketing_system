import {
  loadTicketDraft,
  removeTicketDraft,
  saveTicketDraft,
} from "./ticketDraftStorage";

const values = {
  issueType: "generalQuestion",
  description: "An unfinished question about the course.",
  instructorId: 7,
  selectedTeamId: 10,
  selectedStudentId: "",
};

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test("restores a draft only for its account and form type", () => {
  saveTicketDraft("1", "student", values);
  expect(loadTicketDraft("1", "student").draft.values).toEqual({
    ...values, instructorId: "7", selectedTeamId: "10",
  });
  expect(loadTicketDraft("2", "student").draft).toBeNull();
  expect(loadTicketDraft("1", "staff").draft).toBeNull();
});

test("does not create an empty student draft from the automatically assigned team", () => {
  saveTicketDraft("1", "student", { selectedTeamId: 10 });
  expect(loadTicketDraft("1", "student").draft).toBeNull();
  expect(window.localStorage.length).toBe(0);
});

test("keeps a staff draft with a selected team even before a description is written", () => {
  saveTicketDraft("2", "staff", { selectedTeamId: 10, selectedStudentId: 1 });
  expect(loadTicketDraft("2", "staff").draft.values).toMatchObject({
    selectedTeamId: "10", selectedStudentId: "1",
  });
});

test("discarding or clearing a form removes only the current account's draft", () => {
  saveTicketDraft("1", "student", values);
  saveTicketDraft("2", "student", { ...values, description: "Another account" });
  removeTicketDraft("1");
  expect(loadTicketDraft("1", "student").draft).toBeNull();
  expect(loadTicketDraft("2", "student").draft.values.description).toBe("Another account");
  saveTicketDraft("2", "student", {});
  expect(loadTicketDraft("2", "student").draft).toBeNull();
});

test("ignores malformed or incompatible stored data", () => {
  saveTicketDraft("1", "student", values);
  const key = window.localStorage.key(0);
  const valid = JSON.parse(window.localStorage.getItem(key));
  for (const raw of ["{broken", "null", JSON.stringify({ ...valid, version: 99 }), JSON.stringify({ ...valid, savedAt: "bad date" })]) {
    window.localStorage.setItem(key, raw);
    expect(loadTicketDraft("1", "student")).toEqual({ draft: null, error: "" });
  }
});

test("stores only editable ticket fields and never credentials", () => {
  saveTicketDraft("1", "student", { ...values, token: "secret", password: "secret", name: "Not a draft field" });
  const stored = window.localStorage.getItem(window.localStorage.key(0));
  expect(stored).not.toMatch(/secret|password|token|Not a draft field/);
});

test("reports blocked storage without throwing or claiming the draft was saved", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(loadTicketDraft("1", "student").error).toMatch(/unavailable/);
  expect(saveTicketDraft("1", "student", values)).toMatchObject({ savedAt: null, error: expect.any(String) });
  expect(removeTicketDraft("1")).toMatch(/could not be cleared/);
});
