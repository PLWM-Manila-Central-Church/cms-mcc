"use strict";
const bcrypt = require("bcrypt");

bcrypt.hash("Admin@12345", 10).then((h) => console.log(h));
