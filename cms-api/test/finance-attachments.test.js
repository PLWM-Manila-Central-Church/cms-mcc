const sequelize = require("../src/config/db");
const auditLog = require("../src/helpers/auditLog.helper");
const { Attachment, FinancialRecord } = require("../src/models");
const financeService = require("../src/services/finance.service");

describe("financial attachment ownership and downloads", () => {
  afterEach(() => jest.restoreAllMocks());

  const attachmentValues = {
    file_name: "receipt.pdf",
    file_path: "/uploads/receipts/receipt.pdf",
    uploaded_by: 5,
  };

  test("model requires exactly one income or expense owner", async () => {
    await expect(Attachment.build({ ...attachmentValues, income_id: 3, expense_id: null }).validate()).resolves.toBeDefined();
    await expect(Attachment.build({ ...attachmentValues, income_id: null, expense_id: 4 }).validate()).resolves.toBeDefined();
    await expect(Attachment.build({ ...attachmentValues, income_id: null, expense_id: null }).validate())
      .rejects.toThrow(/exactly one income or expense/);
    await expect(Attachment.build({ ...attachmentValues, income_id: 3, expense_id: 4 }).validate())
      .rejects.toThrow(/exactly one income or expense/);
  });

  test.each([
    [{ income_id: null, expense_id: null }, "exactly one"],
    [{ income_id: 3, expense_id: 4 }, "exactly one"],
    [{ income_id: "3junk", expense_id: null }, "invalid"],
  ])("service rejects invalid attachment ownership %#", async (owner, message) => {
    await expect(financeService.createAttachment({ ...attachmentValues, ...owner }, 5))
      .rejects.toThrow(new RegExp(message, "i"));
  });

  test("service stores one validated attachment and its audit entry", async () => {
    jest.spyOn(FinancialRecord, "findOne").mockResolvedValue({ id: 3 });
    jest.spyOn(Attachment, "create").mockResolvedValue({ id: 9, ...attachmentValues, income_id: 3, expense_id: null });
    jest.spyOn(sequelize, "transaction").mockImplementation(async (callback) => callback({}));
    jest.spyOn(auditLog, "log").mockResolvedValue(undefined);

    const result = await financeService.createAttachment({ ...attachmentValues, income_id: 3, expense_id: null }, 5);

    expect(Attachment.create).toHaveBeenCalledWith(expect.objectContaining({
      income_id: 3,
      expense_id: null,
      file_path: "/uploads/receipts/receipt.pdf",
    }), { transaction: {} });
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATE_ATTACHMENT", targetId: 9 }),
      { transaction: {} },
    );
    expect(result.id).toBe(9);
  });

  test("member receipt download is restricted to that member's own income record", async () => {
    jest.spyOn(Attachment, "findByPk").mockResolvedValue({
      id: 9,
      income_id: 3,
      expense_id: null,
      file_path: "/uploads/receipts/receipt.pdf",
    });
    const recordLookup = jest.spyOn(FinancialRecord, "findOne").mockResolvedValue({ id: 3 });

    await expect(financeService.getMemberAttachmentDownloadKey(9, 12)).resolves.toBe("receipts/receipt.pdf");
    expect(recordLookup).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 3, member_id: 12, is_deleted: 0 },
    }));

    recordLookup.mockResolvedValueOnce(null);
    await expect(financeService.getMemberAttachmentDownloadKey(9, 13))
      .rejects.toThrow(/Receipt attachment not found/);
  });

  test("member cannot download expense attachments", async () => {
    jest.spyOn(Attachment, "findByPk").mockResolvedValue({
      id: 9,
      income_id: null,
      expense_id: 4,
      file_path: "/uploads/receipts/receipt.pdf",
    });
    const recordLookup = jest.spyOn(FinancialRecord, "findOne");

    await expect(financeService.getMemberAttachmentDownloadKey(9, 12))
      .rejects.toThrow(/Receipt attachment not found/);
    expect(recordLookup).not.toHaveBeenCalled();
  });
});
