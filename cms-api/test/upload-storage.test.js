"use strict";

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const multer = require("multer");
const request = require("supertest");
const { getFileUrl, getStoredFileKey, requireDurableUploadStorage, sendStoredUpload, s3Enabled } = require("../src/middlewares/upload-s3");

describe("durable upload storage guard", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  test("rejects production uploads when object storage is absent", () => {
    process.env.NODE_ENV = "production";
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireDurableUploadStorage({}, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "UPLOAD_STORAGE_UNAVAILABLE" }));
    expect(next).not.toHaveBeenCalled();
  });

  test("checks durable storage before parsing a production multipart upload", async () => {
    process.env.NODE_ENV = "production";
    const app = express();
    const uploadParser = multer({ storage: multer.memoryStorage() }).single("file");
    app.post("/archives", requireDurableUploadStorage, uploadParser, (req, res) => res.status(201).json({ received: Boolean(req.file) }));

    const response = await request(app)
      .post("/archives")
      .attach("file", Buffer.from("%PDF-1.4\nQA upload guard"), {
        filename: "guarded-upload.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(s3Enabled ? 201 : 503);
    if (s3Enabled) expect(response.body.received).toBe(true);
    else expect(response.body.code).toBe("UPLOAD_STORAGE_UNAVAILABLE");
  });

  test("preserves local disk fallback for development and QA", () => {
    process.env.NODE_ENV = "test";
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireDurableUploadStorage({}, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("maps legacy and current storage URLs to a safe application key", () => {
    expect(getStoredFileKey("https://bucket.example.invalid/bucket/archives/old.pdf", "archives")).toBe("archives/old.pdf");
    expect(getStoredFileKey("/uploads/receipts/current.pdf", "receipts")).toBe("receipts/current.pdf");
    expect(getStoredFileKey("../../etc/passwd", "archives")).toBeNull();
    expect(getFileUrl("profiles/photo.webp")).toBe("/uploads/profiles/photo.webp");
  });

  test("serves a local disk upload through the storage adapter", async () => {
    process.env.NODE_ENV = "test";
    const filename = `upload-storage-test-${Date.now()}.pdf`;
    const filePath = path.resolve(__dirname, "../uploads/receipts", filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "qa file");
    const res = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendFile: jest.fn(),
    };

    try {
      await sendStoredUpload(`receipts/${filename}`, res);
      expect(res.set).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(res.sendFile).toHaveBeenCalledWith(filePath);
    } finally {
      fs.rmSync(filePath, { force: true });
    }
  });
});
