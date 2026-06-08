"use strict";

const PDFDocument = require("pdfkit");
const { FinancialRecord, FinancialCategory, Member } = require("../models");
const { Op } = require("sequelize");

exports.generateTithingStatement = async (memberId, year) => {
  const member = await Member.findByPk(memberId, { attributes: ["id", "first_name", "last_name"] });
  if (!member) throw { status: 404, message: "Member not found" };

  const yearDate = String(year || new Date().getFullYear());
  const from = `${yearDate}-01-01`;
  const to   = `${yearDate}-12-31`;

  const records = await FinancialRecord.findAll({
    where: {
      member_id: memberId,
      is_deleted: 0,
      transaction_date: { [Op.between]: [from, to] },
    },
    include: [{ model: FinancialCategory, as: "category", attributes: ["name"] }],
    order: [["transaction_date", "ASC"]],
  });

  const totalAmount = records.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  doc.fontSize(16).text("PLWM — Manila Central Church", { align: "center" });
  doc.fontSize(12).text("Tithing & Offering Statement", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Member: ${member.first_name} ${member.last_name}`);
  doc.text(`Year: ${yearDate}`);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown(1);

  const tableTop = doc.y;
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Date", 50, tableTop, { width: 80 });
  doc.text("Category", 130, tableTop, { width: 150 });
  doc.text("Amount", 330, tableTop, { width: 80, align: "right" });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.font("Helvetica").fontSize(9);

  for (const r of records) {
    const y = doc.y + 5;
    doc.text(r.transaction_date, 50, y, { width: 80 });
    doc.text(r.category?.name || "—", 130, y, { width: 150 });
    doc.text(`₱${parseFloat(r.amount).toFixed(2)}`, 330, y, { width: 80, align: "right" });
    if (doc.y > 700) doc.addPage();
  }

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`Total: ₱${totalAmount.toFixed(2)}`, { align: "right" });
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(8);
  doc.text("This statement is for informational purposes. For official receipts, please contact the Finance Team.", { align: "center" });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
};