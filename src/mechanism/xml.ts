/** XML 1.0 Char production, including rejection of lone UTF-16 surrogates. */
export function isXmlText(value: string) {
  return !/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test(value);
}
