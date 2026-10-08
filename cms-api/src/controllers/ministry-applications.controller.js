"use strict";

const service = require("../services/ministry-applications.service");

exports.getOpportunities = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getOpportunities(req.user.memberId) }); }
  catch (error) { next(error); }
};

exports.getMine = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getMyApplications(req.user.memberId) }); }
  catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await service.createApplication({
      memberId: req.user.memberId,
      ministryRoleId: req.body.ministry_role_id,
      message: req.body.message,
      userId: req.user.userId,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.withdraw = async (req, res, next) => {
  try { res.json({ success: true, data: await service.withdrawApplication(req.params.id, req.user.memberId, req.user.userId) }); }
  catch (error) { next(error); }
};

exports.list = async (req, res, next) => {
  try { res.json({ success: true, data: await service.listApplications({ user: req.user, ...req.query }) }); }
  catch (error) { next(error); }
};

exports.review = async (req, res, next) => {
  try { res.json({ success: true, data: await service.reviewApplication(req.params.id, req.body, req.user) }); }
  catch (error) { next(error); }
};
