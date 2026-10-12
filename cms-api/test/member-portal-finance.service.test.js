const { FinancialRecord, Member } = require("../src/models");
const memberPortalService = require("../src/services/member-portal.service");

describe("Member Portal giving history", () => {
  afterEach(() => jest.restoreAllMocks());

  test("scopes rows and year-to-date total to the member's active records and includes private attachment metadata", async () => {
    const rowsQuery = jest.spyOn(FinancialRecord, "findAndCountAll").mockResolvedValue({ count: 0, rows: [] });
    const totalQuery = jest.spyOn(FinancialRecord, "sum").mockResolvedValue(0);

    await memberPortalService.getMyFinance(17, { page: 2, limit: 10, date_from: "2026-01-01", date_to: "2026-01-31" });

    const rowOptions = rowsQuery.mock.calls[0][0];
    expect(rowOptions.where).toMatchObject({ member_id: 17, is_deleted: 0 });
    expect(rowOptions.where.transaction_date).toBeDefined();
    const attachmentInclude = rowOptions.include.find((include) => include.as === "attachments");
    expect(attachmentInclude).toMatchObject({
      separate: true,
      attributes: ["id", "file_name", "uploaded_at"],
    });
    expect(attachmentInclude.attributes).not.toContain("file_path");

    expect(totalQuery.mock.calls[0][1].where).toMatchObject({ member_id: 17, is_deleted: 0 });
  });

  test("saves the contact email exposed in the Member profile form without changing protected fields", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Member, "findOne")
      .mockResolvedValueOnce({ email: "member.old@example.com", update })
      .mockResolvedValueOnce(null);
    const getMyProfile = jest.spyOn(memberPortalService, "getMyProfile")
      .mockResolvedValue({ id: 17, email: "member.updated@example.com" });

    const result = await memberPortalService.updateMyProfile(17, {
      email: "member.updated@example.com",
      birthdate: "",
      spiritual_birthday: "",
      status: "Inactive",
      cell_group_id: 999,
      barcode: "forged-value",
    });

    expect(update).toHaveBeenCalledWith({
      email: "member.updated@example.com",
      birthdate: null,
      spiritual_birthday: null,
    });
    expect(getMyProfile).toHaveBeenCalledWith(17);
    expect(result).toEqual({ id: 17, email: "member.updated@example.com" });
  });
});
