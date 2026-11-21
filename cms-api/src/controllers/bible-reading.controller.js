"use strict";

const bibleReadingService = require("../services/bibleReading.service");

const currentMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(0, 7);

exports.getSummary = async (req, res, next) => {
  try {
    const data = await bibleReadingService.getSummary(req.query.month || currentMonth());
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.listVerses = async (req, res, next) => {
  try {
    const data = await bibleReadingService.listVerses(req.query.month || currentMonth());
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createVerse = async (req, res, next) => {
  try {
    const data = await bibleReadingService.saveVerse({
      groupId: req.body.group_id,
      sundayDate: req.body.sunday_date,
      reference: req.body.reference,
      verseText: req.body.verse_text,
    }, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteVerse = async (req, res, next) => {
  try {
    const data = await bibleReadingService.deleteVerse(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
