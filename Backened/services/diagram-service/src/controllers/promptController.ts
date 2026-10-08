import { Request, Response } from "express";
import { prompts, type Prompt } from "../data/prompts.js";

function toPublic(p: Prompt) {
  return {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    topics: p.topics,
    summary: p.summary,
    functionalRequirements: p.functionalRequirements,
    nonFunctionalRequirements: p.nonFunctionalRequirements,
    scaleHints: p.scaleHints,
  };
}

export function listPrompts(_req: Request, res: Response) {
  const list = prompts.map((p) => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    topics: p.topics,
    summary: p.summary,
  }));

  return res.status(200).json({ prompts: list });
}

export function getPrompt(req: Request, res: Response) {
  const id = req.params.id as string;
  const prompt = prompts.find((p) => p.id === id);

  if (!prompt) {
    return res.status(404).json({ error: "Prompt not found" });
  }

  return res.status(200).json(toPublic(prompt));
}