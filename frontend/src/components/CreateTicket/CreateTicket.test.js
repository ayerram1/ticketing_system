import React, { act } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Cookies from "js-cookie";
import CreateTicket from "./CreateTicket";
import { loadTicketDraft, saveTicketDraft } from "../../services/ticketDraftStorage";

jest.mock("js-cookie", () => ({ get: jest.fn() }));

const student = { user_id: 1, name: "Test Student", section: "10001", sponsor: "Test Sponsor" };
const ta = { user_id: 2, name: "Test TA", is_enabled: true };
const grader = { user_id: 3, name: "Test Grader", is_enabled: true };
const team = { team_id: 10, team_name: "Test Team" };
const jsonResponse = (body, ok = true) => ({ ok, json: async () => body });
const renderForm = (onClose = jest.fn()) => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <CreateTicket onClose={onClose} />
  </MemoryRouter>
);

const select = (label, option) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: option, exact: true }));
};

const readyForm = async () => {
  await waitFor(() => expect(screen.getByRole("button", { name: "Submit Ticket" })).toBeEnabled());
};

let currentUser;
let postResponse;
let teamStudents;
const originalFetch = global.fetch;

beforeEach(() => {
  window.localStorage.clear();
  currentUser = student;
  postResponse = jsonResponse({ ticket_id: 42 });
  teamStudents = [student];
  Cookies.get.mockImplementation((key) => ({ token: "test-token", user_id: String(currentUser.user_id), name: currentUser.name }[key]));
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === "POST") return postResponse;
    if (url.endsWith("/api/users/role/student")) return jsonResponse([student]);
    if (url.endsWith("/api/users/role/TA")) return jsonResponse([ta]);
    if (url.endsWith("/api/users/role/grader")) return jsonResponse([grader]);
    if (url.endsWith("/api/teams")) return jsonResponse([team]);
    if (url.endsWith("/api/studentdata/user/1/team")) return jsonResponse(team);
    if (url.endsWith("/api/studentdata/team/10")) return jsonResponse(teamStudents);
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("autosaves a student's text and selections and restores them after closing", async () => {
  const onClose = jest.fn();
  const { unmount } = renderForm(onClose);
  await readyForm();
  select("Issue Type", "General questions about the course");
  select("Assigned TA", "Test TA");
  fireEvent.change(screen.getByRole("textbox", { name: /Description/ }), { target: { value: "Please keep this unfinished ticket." } });
  expect(await screen.findByText("Draft saved")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Close ticket form" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  unmount();

  renderForm();
  expect(await screen.findByRole("dialog", { name: "Resume ticket draft?" })).toBeVisible();
  expect(loadTicketDraft("1", "student").draft.values.description).toBe("Please keep this unfinished ticket.");
  fireEvent.click(screen.getByRole("button", { name: "Resume Draft" }));
  await readyForm();
  expect(screen.getByRole("textbox", { name: /Description/ })).toHaveValue("Please keep this unfinished ticket.");
  expect(screen.getByRole("combobox", { name: "Assigned TA" })).toHaveTextContent("Test TA");
  expect(global.fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
});

test("discarding a saved draft starts a blank form", async () => {
  saveTicketDraft("1", "student", { description: "Discard this text" });
  renderForm();
  fireEvent.click(await screen.findByRole("button", { name: "Discard Draft" }));
  await readyForm();
  expect(screen.getByRole("textbox", { name: /Description/ })).toHaveValue("");
  expect(loadTicketDraft("1", "student").draft).toBeNull();
});

test("does not show another account's draft", async () => {
  saveTicketDraft("99", "student", { description: "Private text from another account" });
  renderForm();
  await readyForm();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /Description/ })).toHaveValue("");
  expect(loadTicketDraft("99", "student").draft.values.description).toBe("Private text from another account");
});

test("restores a TA's team and student after loading the team's members", async () => {
  currentUser = ta;
  saveTicketDraft("2", "staff", {
    issueType: "other", description: "A staff draft", selectedTeamId: 10, selectedStudentId: 1,
  });
  renderForm();
  fireEvent.click(await screen.findByRole("button", { name: "Resume Draft" }));
  await readyForm();
  expect(screen.getByRole("combobox", { name: "Team Name" })).toHaveTextContent("Test Team");
  expect(screen.getByRole("combobox", { name: "On Behalf Of (Student)" })).toHaveTextContent("Test Student");
  expect(screen.getByRole("textbox", { name: /Description/ })).toHaveValue("A staff draft");
});

test("preserves text but resets a TA's saved student if they no longer belong to the team", async () => {
  currentUser = ta;
  teamStudents = [];
  saveTicketDraft("2", "staff", {
    issueType: "other", description: "Keep the explanation", selectedTeamId: 10, selectedStudentId: 1,
  });
  renderForm();
  fireEvent.click(await screen.findByRole("button", { name: "Resume Draft" }));
  await readyForm();
  expect(screen.getByRole("textbox", { name: /Description/ })).toHaveValue("Keep the explanation");
  expect(screen.getByRole("combobox", { name: "On Behalf Of (Student)" })).not.toHaveTextContent("Test Student");
  expect(screen.getByText(/Some saved selections are no longer available/)).toBeVisible();
});

test("keeps the draft when ticket submission fails", async () => {
  postResponse = jsonResponse({ error: "Server unavailable" }, false);
  renderForm();
  await readyForm();
  fireEvent.change(screen.getByRole("textbox", { name: /Description/ }), { target: { value: "Retry this ticket later" } });
  fireEvent.submit(screen.getByRole("form", { name: "Create ticket" }));
  expect(await screen.findByText("Server unavailable")).toBeVisible();
  expect(loadTicketDraft("1", "student").draft.values.description).toBe("Retry this ticket later");
});

test("a failed form load does not erase an existing draft and can be retried", async () => {
  saveTicketDraft("1", "student", { description: "Keep this through a server outage" });
  const stored = loadTicketDraft("1", "student").draft;
  jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch.mockResolvedValueOnce(jsonResponse({ error: "Unavailable" }, false));
  renderForm();
  expect(await screen.findByText(/ticket form could not be loaded/)).toBeVisible();
  expect(loadTicketDraft("1", "student").draft).toEqual(stored);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("dialog", { name: "Resume ticket draft?" })).toBeVisible();
  expect(loadTicketDraft("1", "student").draft).toEqual(stored);
});

test("a failed TA restore request retains the original draft for another attempt", async () => {
  currentUser = ta;
  saveTicketDraft("2", "staff", {
    issueType: "other", description: "Keep every saved selection", selectedTeamId: 10, selectedStudentId: 1,
  });
  const stored = loadTicketDraft("2", "staff").draft;
  jest.spyOn(console, "error").mockImplementation(() => {});
  renderForm();
  const resume = await screen.findByRole("button", { name: "Resume Draft" });
  global.fetch.mockResolvedValueOnce(jsonResponse({ error: "Unavailable" }, false));
  fireEvent.click(resume);
  expect(await screen.findByText(/Could not load students for this team/)).toBeVisible();
  expect(loadTicketDraft("2", "staff").draft).toEqual(stored);
  expect(screen.getByRole("dialog", { name: "Resume ticket draft?" })).toBeVisible();
  await waitFor(() => expect(resume).toBeEnabled());
  fireEvent.click(resume);
  await readyForm();
  expect(screen.getByRole("combobox", { name: "On Behalf Of (Student)" })).toHaveTextContent("Test Student");
});

test("clears the draft after successful submission and does not autosave it again", async () => {
  renderForm();
  await readyForm();
  fireEvent.change(screen.getByRole("textbox", { name: /Description/ }), { target: { value: "This ticket will be submitted" } });
  expect(loadTicketDraft("1", "student").draft).not.toBeNull();
  jest.useFakeTimers();
  fireEvent.submit(screen.getByRole("form", { name: "Create ticket" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Ticket Submitted" })).toBeDisabled());
  expect(loadTicketDraft("1", "student").draft).toBeNull();
  act(() => jest.advanceTimersByTime(100));
  expect(loadTicketDraft("1", "student").draft).toBeNull();
});
