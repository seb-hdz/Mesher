/** Dot-separated paths to every string leaf (e.g. `ERRORS.SERVER.GENERIC`). */
type DotPrefix<P extends string, K extends string> = P extends ""
  ? K
  : `${P}.${K}`;

export type DeepPaths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : T extends object
  ? {
      [K in keyof T & string]: DeepPaths<T[K], DotPrefix<Prefix, K>>;
    }[keyof T & string]
  : never;
