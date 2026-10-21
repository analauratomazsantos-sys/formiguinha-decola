"use strict";
const db = require("../config/database");
module.exports = require("./pesquisaCadastrosRouter").criarRotasPesquisaCadastros(db);
