import { Router } from "express";
import { check } from "./health.controller.js";

export const healthRoutes = Router();
healthRoutes.get("/", check);
