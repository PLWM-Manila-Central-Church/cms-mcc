"use strict";

const servicesService = require("../services/services.service");

exports.getAllServices = async (req, res, next) => {
  try {
    const result = await servicesService.getAllServices(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getServiceById = async (req, res, next) => {
  try {
    const result = await servicesService.getServiceById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const result = await servicesService.createService(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const result = await servicesService.updateService(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const result = await servicesService.deleteService(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await servicesService.updateStatus(req.params.id, status, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
