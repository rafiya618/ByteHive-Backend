export default function limitWords(text, maxWords) {
  const words = text.trim().split(/\s+/);
  return words.length > maxWords
    ? words.slice(0, maxWords).join(' ') + '...'
    : text;
}