"use strict";

const { normalizeArchiveFileType } = require("../src/helpers/archiveFileMetadata.helper");

describe("archive upload file type normalization", () => {
  test("maps JPEG extension spelling to the archive record canonical enum", () => {
    expect(normalizeArchiveFileType({ originalname: "Church-photo.JPEG", mimetype: "image/jpeg" }))
      .toBe("jpg");
  });

  test("maps JPEG MIME fallback to the canonical enum when no extension exists", () => {
    expect(normalizeArchiveFileType({ originalname: "", mimetype: "image/jpeg" }))
      .toBe("jpg");
  });

  test("preserves other allowlisted file extensions", () => {
    expect(normalizeArchiveFileType({ originalname: "policy.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))
      .toBe("docx");
  });
});
