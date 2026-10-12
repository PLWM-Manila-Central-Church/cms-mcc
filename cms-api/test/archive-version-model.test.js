"use strict";

const ArchiveVersion = require("../src/models/ArchiveVersion.model");

describe("ArchiveVersion model storage contract", () => {
  test("matches the live TiDB VARCHAR(50) file_type column", () => {
    const fileType = ArchiveVersion.rawAttributes.file_type;

    expect(fileType.type.key).toBe("STRING");
    expect(fileType.type.options.length).toBe(50);
    expect(fileType.allowNull).toBe(false);
  });
});
