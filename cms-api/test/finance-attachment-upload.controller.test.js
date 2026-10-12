jest.mock("../src/services/finance.service", () => ({
  createAttachment: jest.fn(),
  getAttachmentDownloadKey: jest.fn(),
  getMemberAttachmentDownloadKey: jest.fn(),
}));
jest.mock("../src/middlewares/upload-s3", () => ({
  getFileUrl: jest.fn(),
  deleteStoredFile: jest.fn(),
  sendStoredUpload: jest.fn(),
}));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn() }));

const financeService = require("../src/services/finance.service");
const uploadStorage = require("../src/middlewares/upload-s3");
const financeController = require("../src/controllers/finance.controller");

describe("finance attachment upload cleanup", () => {
  beforeEach(() => jest.clearAllMocks());

  test("removes a stored receipt when its database link fails", async () => {
    const failure = new Error("Unable to link the receipt");
    uploadStorage.getFileUrl.mockReturnValue("/uploads/receipts/receipt.pdf");
    uploadStorage.deleteStoredFile.mockResolvedValue(undefined);
    financeService.createAttachment.mockRejectedValue(failure);
    const req = {
      file: { key: "receipts/receipt.pdf", originalname: "receipt.pdf" },
      body: { income_id: "3", expense_id: "" },
      user: { userId: 8 },
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    await financeController.uploadAttachment(req, res, next);

    expect(uploadStorage.deleteStoredFile).toHaveBeenCalledWith("receipts/receipt.pdf");
    expect(next).toHaveBeenCalledWith(failure);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects malformed owner IDs and cleans the uploaded object", async () => {
    uploadStorage.getFileUrl.mockReturnValue("/uploads/receipts/receipt.pdf");
    uploadStorage.deleteStoredFile.mockResolvedValue(undefined);
    const req = {
      file: { key: "receipts/receipt.pdf", originalname: "receipt.pdf" },
      body: { income_id: "3junk", expense_id: "" },
      user: { userId: 8 },
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    await financeController.uploadAttachment(req, res, next);

    expect(financeService.createAttachment).not.toHaveBeenCalled();
    expect(uploadStorage.deleteStoredFile).toHaveBeenCalledWith("receipts/receipt.pdf");
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "VALIDATION" }));
  });

  test("streams a member download only through the member-scoped service lookup", async () => {
    financeService.getMemberAttachmentDownloadKey.mockResolvedValue("receipts/receipt.pdf");
    uploadStorage.sendStoredUpload.mockResolvedValue(undefined);
    const req = { params: { id: "9" }, user: { roleName: "Member", memberId: 12 } };
    const res = {};
    const next = jest.fn();

    await financeController.downloadAttachment(req, res, next);

    expect(financeService.getMemberAttachmentDownloadKey).toHaveBeenCalledWith("9", 12);
    expect(financeService.getAttachmentDownloadKey).not.toHaveBeenCalled();
    expect(uploadStorage.sendStoredUpload).toHaveBeenCalledWith("receipts/receipt.pdf", res);
    expect(next).not.toHaveBeenCalled();
  });

  test("requires the standard finance lookup for staff receipt downloads", async () => {
    financeService.getAttachmentDownloadKey.mockResolvedValue("receipts/receipt.pdf");
    uploadStorage.sendStoredUpload.mockResolvedValue(undefined);
    const req = { params: { id: "9" }, user: { roleName: "Finance Team", memberId: null } };
    const res = {};
    const next = jest.fn();

    await financeController.downloadAttachment(req, res, next);

    expect(financeService.getAttachmentDownloadKey).toHaveBeenCalledWith("9");
    expect(financeService.getMemberAttachmentDownloadKey).not.toHaveBeenCalled();
    expect(uploadStorage.sendStoredUpload).toHaveBeenCalledWith("receipts/receipt.pdf", res);
    expect(next).not.toHaveBeenCalled();
  });
});
