declare module '*.sql' {
  /** Represents imported SQL source text. */
  const file: string;
  /** Exports the SQL source text. */
  export default file;
}
