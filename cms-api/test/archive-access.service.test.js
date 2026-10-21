"use strict";

const mockState = {};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(mockState.transaction)),
}));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/middlewares/upload-s3", () => ({
  getStoredFileKey: jest.fn((value, expectedFolder) => {
    const normalized = String(value || "").replace(/^https?:\/\/[^/]+/i, "");
    const key = normalized.replace(/^\/?(?:api\/)?uploads\//, "");
    return key.startsWith(`${expectedFolder}/`) ? key : null;
  }),
  getFileUrl: jest.fn((key) => `/uploads/${key}`),
  deleteStoredFile: jest.fn(),
  sendStoredUpload: jest.fn(),
}));
jest.mock("../src/models", () => ({
  ArchiveRecord: {
    findOne: jest.fn(async () => mockState.archiveRecord),
    findAll: jest.fn(async () => []),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
  },
  ArchiveCategory: {
    findByPk: jest.fn(async () => ({ id: 3 })),
    findOne: jest.fn(async () => ({ id: 3 })),
    findAll: jest.fn(async () => []),
    create: jest.fn(),
  },
  ArchiveVersion: {
    findOne: jest.fn(async () => mockState.archiveVersion),
    findAll: jest.fn(async () => []),
    create: jest.fn(),
  },
  ArchiveAccessLog: { create: jest.fn(), findAll: jest.fn() },
  User: {},
}));

const {
  ArchiveRecord,
  ArchiveVersion,
  ArchiveCategory,
  ArchiveAccessLog,
} = require("../src/models");
const uploadStorage = require("../src/middlewares/upload-s3");
const auditLog = require("../src/helpers/auditLog.helper");
const archivesService = require("../src/services/archives.service");

const makeRecord = (values) => {
  const record = { ...values };
  record.toJSON = () => Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "toJSON" && key !== "update"),
  );
  record.update = jest.fn(async (updates) => Object.assign(record, updates));
  return record;
};

describe("archive access and version integrity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
    mockState.metadataRecord = null;
    mockState.archiveRecord = makeRecord({
      id: 9,
      visibility: "public",
      status: "approved",
      file_url: "/uploads/archives/current.pdf",
      file_type: "pdf",
      current_version_id: 101,
      ArchiveVersions: [],
    });
    mockState.archiveVersion = { id: 101, record_id: 9, version_number: 1, file_url: "/uploads/archives/current.pdf", file_type: "pdf" };
    ArchiveRecord.findOne.mockImplementation(async (options = {}) => (
      options.attributes ? mockState.metadataRecord || mockState.archiveRecord : mockState.archiveRecord
    ));
    ArchiveRecord.unscoped = jest.fn(() => ArchiveRecord);
    ArchiveRecord.findAll.mockResolvedValue([]);
    ArchiveVersion.findOne.mockResolvedValue(mockState.archiveVersion);
    ArchiveVersion.findAll.mockResolvedValue([]);
    ArchiveAccessLog.create.mockResolvedValue({ record_id: 9 });
  });

  test("returns archive details only after applying the existing visibility policy", async () => {
    mockState.archiveRecord.visibility = "confidential";

    await expect(archivesService.getRecordByIdForRole(9, "Member"))
      .rejects.toMatchObject({ status: 403 });

    const visible = await archivesService.getRecordByIdForRole(9, "Pastor");
    expect(visible.id).toBe(9);
    expect(visible.ArchiveVersions).toEqual([]);
  });

  test("does not expose version metadata to a role that cannot view its parent record", async () => {
    mockState.metadataRecord = { id: 9, visibility: "restricted" };

    await expect(archivesService.getVersions(9, "Member"))
      .rejects.toMatchObject({ status: 403 });
    expect(ArchiveVersion.findAll).not.toHaveBeenCalled();
  });

  test("denies a restricted stored file even when the caller has archives read permission", async () => {
    ArchiveRecord.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9, visibility: "confidential" }]);
    ArchiveVersion.findAll.mockResolvedValueOnce([{
      record_id: 9,
      file_url: "/uploads/archives/confidential.pdf",
    }]);

    await expect(archivesService.assertStoredFileVisible("archives/confidential.pdf", "Finance Team"))
      .rejects.toMatchObject({ status: 403 });
  });

  test("serves a public stored file after resolving its archive owner", async () => {
    ArchiveRecord.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9, visibility: "public" }]);
    ArchiveVersion.findAll.mockResolvedValueOnce([{
      record_id: 9,
      file_url: "/uploads/archives/public.pdf",
    }]);

    await expect(archivesService.assertStoredFileVisible("archives/public.pdf", "Member"))
      .resolves.toBe("archives/public.pdf");
  });

  test("resolves a version download only within its parent archive", async () => {
    const file = await archivesService.getDownloadFile(9, 101, "Member");

    expect(file).toEqual({ storageKey: "archives/current.pdf", fileType: "pdf" });
    expect(ArchiveVersion.findOne).toHaveBeenCalledWith({ where: { id: 101, record_id: 9 } });
    expect(uploadStorage.getStoredFileKey).toHaveBeenCalledWith("/uploads/archives/current.pdf", "archives");
  });

  test("limits Finance Team lists, categories, and direct records to Financial Records", async () => {
    ArchiveCategory.findOne.mockResolvedValueOnce({ id: 44, name: "Financial Records" });
    ArchiveRecord.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });

    await archivesService.getAllRecords({ roleName: "Finance Team" });

    expect(ArchiveRecord.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ category_id: 44 }),
    }));

    ArchiveCategory.findOne.mockResolvedValueOnce({ id: 44, name: "Financial Records" });
    ArchiveRecord.findAndCountAll.mockClear();
    const hiddenCategoryResult = await archivesService.getAllRecords({ roleName: "Finance Team", category_id: 3 });
    expect(hiddenCategoryResult).toEqual({ records: [], total: 0, total_pages: 0 });
    expect(ArchiveRecord.findAndCountAll).not.toHaveBeenCalled();

    mockState.metadataRecord = {
      id: 9,
      visibility: "public",
      file_url: "/uploads/archives/other.pdf",
      file_type: "pdf",
      category: { name: "Member Documents" },
    };
    await expect(archivesService.getDownloadFile(9, null, "Finance Team"))
      .rejects.toMatchObject({ status: 403 });

    ArchiveCategory.findAll.mockResolvedValueOnce([{ id: 44, name: "Financial Records" }]);
    await archivesService.getAllCategories("Finance Team");
    expect(ArchiveCategory.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: "Financial Records", is_deleted: 0 },
    }));

    ArchiveCategory.findOne.mockResolvedValueOnce({ id: 3, name: "Member Documents" });
    await expect(archivesService.getCategoryById(3, "Finance Team"))
      .rejects.toMatchObject({ status: 404 });
  });

  test("archives an approved record without overwriting its approval state or file metadata", async () => {
    mockState.archiveRecord.is_deleted = 0;
    mockState.archiveRecord.status = "approved";
    mockState.archiveRecord.file_url = "/uploads/archives/current.pdf";
    mockState.archiveRecord.current_version_id = 101;

    await expect(archivesService.archiveRecord(9, 77)).resolves.toEqual({
      message: "Archive record archived successfully.",
    });

    expect(mockState.archiveRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      is_deleted: 1,
      deleted_by: 77,
      deleted_at: expect.any(Date),
    }));
    expect(mockState.archiveRecord.status).toBe("approved");
    expect(mockState.archiveRecord.file_url).toBe("/uploads/archives/current.pdf");
    expect(mockState.archiveRecord.current_version_id).toBe(101);
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "ARCHIVE_RECORD",
      targetId: 9,
    }));
  });

  test("restores a legacy archived row and recovers its approved status", async () => {
    mockState.archiveRecord.is_deleted = 1;
    mockState.archiveRecord.status = "deleted";
    mockState.archiveRecord.approved_by = 23;

    await expect(archivesService.restoreRecord(9, 77)).resolves.toEqual({
      message: "Archive record restored successfully.",
    });

    expect(ArchiveRecord.unscoped).toHaveBeenCalled();
    expect(mockState.archiveRecord.update).toHaveBeenCalledWith({
      is_deleted: 0,
      deleted_at: null,
      deleted_by: null,
      status: "approved",
    });
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "RESTORE_ARCHIVE",
      targetId: 9,
      newValues: { status: "approved" },
    }));
  });

  test("lists archived records only for System Admin and applies the archived predicate", async () => {
    ArchiveRecord.findAndCountAll.mockResolvedValueOnce({ count: 1, rows: [] });
    const result = await archivesService.getAllRecords({ roleName: "System Admin", archived: true });
    expect(result.total).toBe(1);
    expect(ArchiveRecord.unscoped).toHaveBeenCalled();
    expect(ArchiveRecord.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ is_deleted: 1 }),
    }));

    ArchiveRecord.findAndCountAll.mockClear();
    await expect(archivesService.getAllRecords({ roleName: "Pastor", archived: true })).resolves.toEqual({
      records: [], total: 0, total_pages: 0,
    });
    expect(ArchiveRecord.findAndCountAll).not.toHaveBeenCalled();
  });

  test("denies Finance Team a nonfinancial file path even when that document is public", async () => {
    ArchiveRecord.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9, visibility: "public", category: { name: "Member Documents" } }]);
    ArchiveVersion.findAll.mockResolvedValueOnce([{
      record_id: 9,
      file_url: "/uploads/archives/member-document.pdf",
    }]);

    await expect(archivesService.assertStoredFileVisible("archives/member-document.pdf", "Finance Team"))
      .rejects.toMatchObject({ status: 403 });
  });

  test("updates record and new version pointer in the same transaction", async () => {
    const lockedRecord = makeRecord({
      id: 9,
      status: "approved",
      file_url: "/uploads/archives/current.pdf",
      file_type: "pdf",
      current_version_id: 101,
    });
    const latestVersion = { version_number: 1 };
    ArchiveRecord.findOne
      .mockResolvedValueOnce(mockState.archiveRecord)
      .mockResolvedValueOnce(lockedRecord)
      .mockResolvedValueOnce(mockState.archiveRecord);
    ArchiveVersion.findOne.mockResolvedValueOnce(latestVersion);
    ArchiveVersion.create.mockResolvedValueOnce({ id: 102 });

    await archivesService.updateRecord(9, {
      file_url: "/uploads/archives/revised.pdf",
      file_type: "pdf",
      file_size: 245,
    }, 4);

    expect(ArchiveRecord.findOne).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 9 },
      transaction: mockState.transaction,
      lock: "UPDATE",
    }));
    expect(ArchiveVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      record_id: 9,
      file_url: "/uploads/archives/revised.pdf",
      file_size: 245,
      version_number: 2,
    }), { transaction: mockState.transaction });
    expect(lockedRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      file_url: "/uploads/archives/revised.pdf",
      current_version_id: 102,
    }), { transaction: mockState.transaction });
  });

  test("creates the archive record and initial current version in one transaction", async () => {
    const createdRecord = makeRecord({
      id: 44,
      visibility: "public",
      status: "pending",
      file_url: "/uploads/archives/initial.pdf",
      file_type: "pdf",
      ArchiveVersions: [],
    });
    mockState.archiveRecord = createdRecord;
    ArchiveRecord.create.mockResolvedValueOnce(createdRecord);
    ArchiveVersion.create.mockResolvedValueOnce({ id: 201 });

    await archivesService.createRecord({
      category_id: 3,
      title: "QA archive",
      file_url: "/uploads/archives/initial.pdf",
      file_type: "pdf",
      file_size: 75,
    }, 4);

    expect(ArchiveRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      category_id: 3,
      file_url: "/uploads/archives/initial.pdf",
    }), { transaction: mockState.transaction });
    expect(ArchiveVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      record_id: 44,
      file_url: "/uploads/archives/initial.pdf",
      file_size: 75,
      version_number: 1,
    }), { transaction: mockState.transaction });
    expect(createdRecord.update).toHaveBeenCalledWith(
      { current_version_id: 201 },
      { transaction: mockState.transaction },
    );
  });

  test("archives an archive record without changing its approval state or deleting versioned storage objects", async () => {
    await archivesService.deleteRecord(9, 4);

    expect(mockState.archiveRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      is_deleted: 1,
      deleted_by: 4,
    }));
    expect(mockState.archiveRecord.status).toBe("approved");
    expect(uploadStorage.deleteStoredFile).not.toHaveBeenCalled();
  });

  test("creates categories through the archive category service", async () => {
    ArchiveCategory.findOne.mockResolvedValueOnce(null);
    ArchiveCategory.create.mockResolvedValueOnce({ id: 31, name: "QA Receipts", description: "Supporting files" });

    const category = await archivesService.createCategory({ name: "QA Receipts", description: "Supporting files" });

    expect(ArchiveCategory.create).toHaveBeenCalledWith({ name: "QA Receipts", description: "Supporting files" });
    expect(category.id).toBe(31);
  });

  test("protects the Finance Team's required Financial Records category from rename and archive", async () => {
    const category = { id: 31, name: "Financial Records", update: jest.fn() };
    ArchiveCategory.findOne.mockResolvedValue(category);

    await expect(archivesService.updateCategory(31, { name: "Receipts" }))
      .rejects.toThrow(/required for Finance Team uploads/);
    await expect(archivesService.archiveCategory(31, 4))
      .rejects.toThrow(/required for Finance Team uploads/);

    expect(category.update).not.toHaveBeenCalled();
    expect(ArchiveRecord.count).not.toHaveBeenCalled();
  });

  test("keeps in-use categories from being archived", async () => {
    const category = { id: 31, name: "Meeting Minutes", update: jest.fn() };
    ArchiveCategory.findOne.mockResolvedValue(category);
    ArchiveRecord.count.mockResolvedValueOnce(2);

    await expect(archivesService.archiveCategory(31, 4)).rejects.toMatchObject({ status: 400 });

    expect(ArchiveRecord.count).toHaveBeenCalledWith({ where: { category_id: 31 } });
    expect(category.update).not.toHaveBeenCalled();
  });
});
