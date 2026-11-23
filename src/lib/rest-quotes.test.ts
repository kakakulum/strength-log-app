import { expect, it, vi } from "vitest";
import { shuffleRestQuotes } from "./rest-quotes";

it("휴식 문구 100개를 중복 없이 섞는다", () => {
  const quotes = shuffleRestQuotes(null);
  expect(quotes).toHaveLength(100);
  expect(new Set(quotes).size).toBe(100);
});

it("다시 섞었을 때 바로 앞 휴식과 같은 문구가 나오지 않는다", () => {
  const random = vi.spyOn(Math, "random").mockReturnValue(0.999);
  try {
    const previousQuote = shuffleRestQuotes(null).pop()!;
    const next = shuffleRestQuotes(previousQuote);
    expect(next.at(-1)).not.toBe(previousQuote);
    expect(next).toContain(previousQuote);
  } finally {
    random.mockRestore();
  }
});
