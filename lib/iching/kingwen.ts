/**
 * King Wen lookup table: 6-bit hexagram value (index 0–63) → King Wen number (1–64).
 *
 * Source: ICHING_REFERENCE.md §6.
 * ⚠️  DRAFT — pending authoritative verification (§8).
 * Do not trust this table in production until lib/iching/casting.test.ts
 * "authoritative source verification" test passes with a populated fixture.
 */
export const VALUE_TO_KW: Readonly<number[]> = [
  //  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15
      2,  24,   7,  19,  15,  36,  46,  11,  16,  51,  40,  54,  62,  55,  32,  34,
  // 16   17   18   19   20   21   22   23   24   25   26   27   28   29   30   31
      8,   3,  29,  60,  39,  63,  48,   5,  45,  17,  47,  58,  31,  49,  28,  43,
  // 32   33   34   35   36   37   38   39   40   41   42   43   44   45   46   47
     23,  27,   4,  41,  52,  22,  18,  26,  35,  21,  64,  38,  56,  30,  50,  14,
  // 48   49   50   51   52   53   54   55   56   57   58   59   60   61   62   63
     20,  42,  59,  61,  53,  37,  57,   9,  12,  25,   6,  10,  33,  13,  44,   1,
];

/**
 * Look up the King Wen number (1–64) for a given 6-bit hexagram value (0–63).
 * Throws if value is out of range — callers should never produce an invalid value.
 */
export function lookupKingWen(value: number): number {
  if (value < 0 || value > 63 || !Number.isInteger(value)) {
    throw new RangeError(`Hexagram value must be an integer 0–63; got ${value}`);
  }
  return VALUE_TO_KW[value] as number;
}
