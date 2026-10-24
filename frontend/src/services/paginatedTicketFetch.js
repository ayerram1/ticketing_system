export const fetchAllTicketPages = async ({ baseURL, endpoint, params, token, fetchImpl = fetch }) => {
  const fetchPage = async (page) => {
    const pageParams = new URLSearchParams(params);
    pageParams.set("page", String(page));
    const response = await fetchImpl(`${baseURL}${endpoint}?${pageParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      let detail = responseText;
      try {
        detail = JSON.parse(responseText).error || responseText;
      } catch (_) {
        // Non-JSON responses still identify the endpoint and status.
      }
      throw new Error(`${endpoint} page ${page} failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error(`${endpoint} page ${page} returned an invalid JSON response`);
    }

    if (!Array.isArray(data?.tickets) || !Number.isInteger(data?.pagination?.totalPages)) {
      throw new Error(`${endpoint} page ${page} returned an unexpected ticket pagination response`);
    }

    return data;
  };

  const firstPage = await fetchPage(1);
  const totalPages = firstPage.pagination.totalPages;
  if (totalPages < 0) {
    throw new Error(`${endpoint} returned an invalid page count`);
  }

  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => fetchPage(index + 2))
  );
  const pages = [firstPage, ...remainingPages];

  return {
    ...firstPage,
    tickets: pages.flatMap((page) => page.tickets),
    pagination: {
      ...firstPage.pagination,
      totalItems: firstPage.pagination.totalItems,
    },
  };
};
