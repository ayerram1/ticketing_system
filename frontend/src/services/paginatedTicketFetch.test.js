import { fetchAllTicketPages } from "./paginatedTicketFetch";

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

describe("fetchAllTicketPages", () => {
  test("combines the API's paginated { tickets, pagination } responses", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        tickets: [{ ticket_id: 1 }],
        pagination: { currentPage: 1, totalPages: 2, totalItems: 2 },
      }))
      .mockResolvedValueOnce(jsonResponse({
        tickets: [{ ticket_id: 2 }],
        pagination: { currentPage: 2, totalPages: 2, totalItems: 2 },
      }));

    const result = await fetchAllTicketPages({
      baseURL: "http://localhost:3301",
      endpoint: "/api/tickets",
      params: new URLSearchParams({ page: "1", limit: "1000", hideResolved: "true" }),
      token: "test-token",
      fetchImpl,
    });

    expect(result.tickets).toEqual([{ ticket_id: 1 }, { ticket_id: 2 }]);
    expect(result.pagination.totalItems).toBe(2);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3301/api/tickets?page=1&limit=1000&hideResolved=true",
      "http://localhost:3301/api/tickets?page=2&limit=1000&hideResolved=true",
    ]);
  });

  test("keeps an empty successful result distinct from an invalid response", async () => {
    const emptyResult = await fetchAllTicketPages({
      baseURL: "http://localhost:3301",
      endpoint: "/api/tickets",
      params: new URLSearchParams({ page: "1", limit: "1000" }),
      token: "test-token",
      fetchImpl: jest.fn().mockResolvedValue(jsonResponse({
        tickets: [],
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0 },
      })),
    });

    expect(emptyResult.tickets).toEqual([]);

    await expect(fetchAllTicketPages({
      baseURL: "http://localhost:3301",
      endpoint: "/api/tickets",
      params: new URLSearchParams(),
      token: "test-token",
      fetchImpl: jest.fn().mockResolvedValue(jsonResponse({ tickets: [] })),
    })).rejects.toThrow(/unexpected ticket pagination response/);
  });
});
