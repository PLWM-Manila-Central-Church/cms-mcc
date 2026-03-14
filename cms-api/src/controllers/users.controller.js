"use strict";

const usersService = require("../services/users.service");

exports.getAllUsers = async (req, res, next) => {
  try {
    const result = await usersService.getAllUsers();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const result = await usersService.getUserById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const result = await usersService.createUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const result = await usersService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const result = await usersService.deactivateUser(
      req.params.id,
      req.user.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const result = await usersService.activateUser(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.hardDeleteUser = async (req, res, next) => {
  try {
    const result = await usersService.hardDeleteUser(
      req.params.id,
      req.user.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
